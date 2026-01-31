import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

interface CrawlUrl {
  id: string;
  customer_id: string;
  assistant_id: string;
  url: string;
  crawl_frequency: 'daily' | 'weekly' | 'monthly';
  description?: string;
  status: string;
  last_crawled_at?: string;
  crawl_count: number;
}

/**
 * Determines if a URL needs to be crawled based on its frequency and last crawl time
 */
function needsCrawl(crawlUrl: CrawlUrl): boolean {
  if (!crawlUrl.last_crawled_at) {
    return true; // Never crawled before
  }

  const lastCrawled = new Date(crawlUrl.last_crawled_at);
  const now = new Date();
  const hoursSinceLastCrawl = (now.getTime() - lastCrawled.getTime()) / (1000 * 60 * 60);

  switch (crawlUrl.crawl_frequency) {
    case 'daily':
      return hoursSinceLastCrawl >= 24;
    case 'weekly':
      return hoursSinceLastCrawl >= 24 * 7;
    case 'monthly':
      return hoursSinceLastCrawl >= 24 * 30;
    default:
      return false;
  }
}

/**
 * Crawls a single URL using Firecrawl API
 */
async function crawlUrl(url: string): Promise<{ content: string; title: string; error?: string }> {
  if (!firecrawlApiKey) {
    return { content: '', title: '', error: 'Firecrawl API key not configured' };
  }

  try {
    // Use scrape endpoint for single page
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl API error for ${url}:`, errorText);
      return { content: '', title: '', error: `Firecrawl error: ${response.status}` };
    }

    const data = await response.json();

    if (!data.success) {
      return { content: '', title: '', error: data.error || 'Scrape failed' };
    }

    return {
      content: data.data?.markdown || '',
      title: data.data?.metadata?.title || url,
    };
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return { content: '', title: '', error: error.message };
  }
}

/**
 * Computes a simple hash for content change detection
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Updates a voice assistant's knowledge base with new crawled content
 */
async function updateAssistantKnowledge(
  supabase: any,
  assistantId: string,
  crawlResults: Array<{ url: string; content: string; title: string }>
): Promise<void> {
  // Get the assistant and its owner's API key
  const { data: assistant, error: assistantError } = await supabase
    .from('voice_assistants')
    .select('user_id, name')
    .eq('id', assistantId)
    .single();

  if (assistantError || !assistant) {
    console.error('Assistant not found:', assistantId);
    return;
  }

  const { data: connection, error: connError } = await supabase
    .from('voice_connections')
    .select('api_key')
    .eq('user_id', assistant.user_id)
    .eq('is_active', true)
    .maybeSingle();

  if (connError || !connection) {
    console.error('No voice connection found for user:', assistant.user_id);
    return;
  }

  // Get current assistant config from VAPI
  const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${connection.api_key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!vapiResponse.ok) {
    console.error('Failed to get assistant from VAPI:', await vapiResponse.text());
    return;
  }

  const vapiAssistant = await vapiResponse.json();
  const currentSystemPrompt = vapiAssistant.model?.messages?.[0]?.content || '';

  // Build knowledge section from crawled content
  const knowledgeSection = crawlResults
    .filter(r => r.content)
    .map(r => `--- Knowledge from: ${r.title} (${r.url}) ---\n${r.content.substring(0, 5000)}`) // Limit each source
    .join('\n\n');

  if (!knowledgeSection) {
    console.log('No content to add for assistant:', assistantId);
    return;
  }

  // Check if we already have a crawled knowledge section
  const crawledKnowledgeMarker = '<!-- CUSTOMER_CRAWLED_KNOWLEDGE_START -->';
  const crawledKnowledgeEndMarker = '<!-- CUSTOMER_CRAWLED_KNOWLEDGE_END -->';

  let newSystemPrompt: string;
  if (currentSystemPrompt.includes(crawledKnowledgeMarker)) {
    // Replace existing crawled knowledge section
    const startIdx = currentSystemPrompt.indexOf(crawledKnowledgeMarker);
    const endIdx = currentSystemPrompt.indexOf(crawledKnowledgeEndMarker);
    if (endIdx > startIdx) {
      newSystemPrompt =
        currentSystemPrompt.substring(0, startIdx) +
        `${crawledKnowledgeMarker}\n\n## Customer-Provided Knowledge Sources\n\n${knowledgeSection}\n\n${crawledKnowledgeEndMarker}` +
        currentSystemPrompt.substring(endIdx + crawledKnowledgeEndMarker.length);
    } else {
      // Malformed, append
      newSystemPrompt = currentSystemPrompt + `\n\n${crawledKnowledgeMarker}\n\n## Customer-Provided Knowledge Sources\n\n${knowledgeSection}\n\n${crawledKnowledgeEndMarker}`;
    }
  } else {
    // Append new section
    newSystemPrompt = currentSystemPrompt + `\n\n${crawledKnowledgeMarker}\n\n## Customer-Provided Knowledge Sources\n\n${knowledgeSection}\n\n${crawledKnowledgeEndMarker}`;
  }

  // Update the assistant via VAPI
  const updateMessages = vapiAssistant.model?.messages ? [...vapiAssistant.model.messages] : [];
  if (updateMessages.length > 0) {
    updateMessages[0] = { ...updateMessages[0], content: newSystemPrompt };
  } else {
    updateMessages.push({ role: 'system', content: newSystemPrompt });
  }

  const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${connection.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: {
        ...vapiAssistant.model,
        messages: updateMessages,
      },
    }),
  });

  if (!updateResponse.ok) {
    console.error('Failed to update assistant knowledge:', await updateResponse.text());
  } else {
    console.log('Successfully updated assistant knowledge for:', assistantId);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily crawl job...');

    // Get all active crawl URLs
    const { data: crawlUrls, error: fetchError } = await supabase
      .from('customer_crawl_urls')
      .select('*')
      .eq('status', 'active');

    if (fetchError) {
      console.error('Error fetching crawl URLs:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!crawlUrls || crawlUrls.length === 0) {
      console.log('No active crawl URLs found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No active crawl URLs to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${crawlUrls.length} active crawl URLs`);

    // Filter URLs that need crawling based on frequency
    const urlsToCrawl = crawlUrls.filter(needsCrawl);
    console.log(`${urlsToCrawl.length} URLs need crawling`);

    // Group by assistant for batch knowledge updates
    const urlsByAssistant: Record<string, CrawlUrl[]> = {};
    for (const url of urlsToCrawl) {
      if (!urlsByAssistant[url.assistant_id]) {
        urlsByAssistant[url.assistant_id] = [];
      }
      urlsByAssistant[url.assistant_id].push(url);
    }

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    // Process each assistant's URLs
    for (const [assistantId, urls] of Object.entries(urlsByAssistant)) {
      console.log(`Processing ${urls.length} URLs for assistant ${assistantId}`);

      const crawlResults: Array<{ url: string; content: string; title: string }> = [];

      for (const crawlUrlRecord of urls) {
        totalProcessed++;

        // Update status to pending crawl
        await supabase
          .from('customer_crawl_urls')
          .update({ last_crawl_status: 'pending' })
          .eq('id', crawlUrlRecord.id);

        // Crawl the URL
        const result = await crawlUrl(crawlUrlRecord.url);

        if (result.error) {
          totalFailed++;
          console.error(`Failed to crawl ${crawlUrlRecord.url}:`, result.error);

          // Update with failure
          await supabase
            .from('customer_crawl_urls')
            .update({
              last_crawled_at: new Date().toISOString(),
              last_crawl_status: 'failed',
              last_crawl_error: result.error,
            })
            .eq('id', crawlUrlRecord.id);
        } else {
          totalSuccess++;
          const contentHash = hashContent(result.content);

          // Update crawl URL record
          await supabase
            .from('customer_crawl_urls')
            .update({
              last_crawled_at: new Date().toISOString(),
              last_crawl_status: 'success',
              last_crawl_error: null,
              crawl_count: (crawlUrlRecord.crawl_count || 0) + 1,
            })
            .eq('id', crawlUrlRecord.id);

          // Store the crawl result
          await supabase
            .from('customer_crawl_results')
            .insert({
              crawl_url_id: crawlUrlRecord.id,
              crawled_content: result.content,
              content_hash: contentHash,
              page_title: result.title,
              content_length: result.content.length,
            });

          crawlResults.push({
            url: crawlUrlRecord.url,
            content: result.content,
            title: result.title,
          });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update assistant knowledge with all successful crawls
      if (crawlResults.length > 0) {
        await updateAssistantKnowledge(supabase, assistantId, crawlResults);

        // Mark results as sent to assistant
        for (const result of crawlResults) {
          await supabase
            .from('customer_crawl_results')
            .update({
              sent_to_assistant: true,
              sent_at: new Date().toISOString(),
            })
            .eq('crawl_url_id', urls.find(u => u.url === result.url)?.id);
        }
      }
    }

    console.log(`Crawl job completed: ${totalProcessed} processed, ${totalSuccess} success, ${totalFailed} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Daily crawl completed',
      stats: {
        totalActive: crawlUrls.length,
        processed: totalProcessed,
        success: totalSuccess,
        failed: totalFailed,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in daily-crawl-urls function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

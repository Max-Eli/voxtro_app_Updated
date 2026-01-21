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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { chatbotId, websiteUrl, discoverOnly, selectedPages } = await req.json();

    if (!chatbotId || !websiteUrl) {
      return new Response(JSON.stringify({ error: 'Missing chatbotId or websiteUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!firecrawlApiKey) {
      return new Response(JSON.stringify({ error: 'Firecrawl API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the chatbot belongs to the user
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbots')
      .select('id')
      .eq('id', chatbotId)
      .eq('user_id', user.id)
      .single();

    if (chatbotError || !chatbot) {
      return new Response(JSON.stringify({ error: 'Chatbot not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update chatbot status to crawling
    await supabase
      .from('chatbots')
      .update({ 
        crawl_status: 'crawling',
        website_url: websiteUrl
      })
      .eq('id', chatbotId);

    console.log('Starting crawl for URL:', websiteUrl);

    // If discover only mode, return available pages
    if (discoverOnly) {
      try {
        // First try to get sitemap
        const sitemapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: websiteUrl,
            search: websiteUrl,
            limit: 50,
          }),
        });

        let pages: string[] = [];
        
        if (sitemapResponse.ok) {
          const sitemapData = await sitemapResponse.json();
          if (sitemapData.success && sitemapData.links) {
            pages = sitemapData.links.map((link: any) => link.url);
          }
        }
        
        // If no sitemap or few pages, do a light crawl to discover pages
        if (pages.length === 0) {
          const discoverResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: websiteUrl,
              maxDepth: 2,
              limit: 20,
              scrapeOptions: { onlyMainContent: false },
            }),
          });

          if (discoverResponse.ok) {
            const discoverData = await discoverResponse.json();
            if (discoverData.data) {
              pages = discoverData.data.map((page: any) => page.metadata?.url || page.url);
            }
          }
        }
        
        // Convert full URLs to paths for better display
        const pagePaths = pages.map(url => {
          try {
            const urlObj = new URL(url);
            return urlObj.pathname === '/' ? url : urlObj.pathname;
          } catch {
            return url;
          }
        });
        
        // Remove duplicates and sort
        const uniquePaths = [...new Set(pagePaths)].sort();
        
        return new Response(JSON.stringify({ 
          pages: uniquePaths.slice(0, 50) // Limit to first 50 pages
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error discovering pages:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to discover pages'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Use Firecrawl API to crawl the website
    const crawlOptions = {
      url: websiteUrl,
      limit: selectedPages ? selectedPages.length : 10,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    };

    // Note: Firecrawl v1 API doesn't support crawling specific URLs in one request
    // We'll crawl from the main URL with appropriate limits instead

    const crawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(crawlOptions),
    });

    if (!crawlResponse.ok) {
      console.error('Firecrawl API error:', await crawlResponse.text());
      
      // Update status to failed
      await supabase
        .from('chatbots')
        .update({ crawl_status: 'failed' })
        .eq('id', chatbotId);

      return new Response(JSON.stringify({ error: 'Failed to crawl website' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const crawlData = await crawlResponse.json();
    console.log('Crawl response:', crawlData);

    if (!crawlData.success) {
      await supabase
        .from('chatbots')
        .update({ crawl_status: 'failed' })
        .eq('id', chatbotId);

      return new Response(JSON.stringify({ error: crawlData.error || 'Crawl failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If it's a job ID, we need to check the status
    if (crawlData.id) {
      // For now, we'll poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max
      
      while (attempts < maxAttempts) {
        const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlData.id}`, {
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
          },
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('Crawl status:', statusData.status);

          if (statusData.status === 'completed') {
            // Process the crawled data
            const pages = statusData.data || [];
            let combinedContent = '';

            for (const page of pages) {
              if (page.markdown) {
                combinedContent += `\n\n--- Page: ${page.metadata?.title || page.metadata?.url || 'Unknown'} ---\n\n`;
                combinedContent += page.markdown;
              }
            }

            // Update chatbot with crawled content
            const { error: updateError } = await supabase
              .from('chatbots')
              .update({
                website_content: combinedContent,
                crawl_status: 'completed',
                last_crawled_at: new Date().toISOString(),
              })
              .eq('id', chatbotId);

            if (updateError) {
              console.error('Failed to update chatbot:', updateError);
              return new Response(JSON.stringify({ error: 'Failed to save crawled content' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            return new Response(JSON.stringify({ 
              success: true, 
              message: 'Website crawled successfully',
              pagesCount: pages.length,
              contentLength: combinedContent.length
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else if (statusData.status === 'failed') {
            await supabase
              .from('chatbots')
              .update({ crawl_status: 'failed' })
              .eq('id', chatbotId);

            return new Response(JSON.stringify({ error: 'Crawl failed' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Wait 10 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }

      // Timeout
      await supabase
        .from('chatbots')
        .update({ crawl_status: 'failed' })
        .eq('id', chatbotId);

      return new Response(JSON.stringify({ error: 'Crawl timeout' }), {
        status: 408,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Direct response with data
    const pages = crawlData.data || [];
    let combinedContent = '';

    for (const page of pages) {
      if (page.markdown) {
        combinedContent += `\n\n--- Page: ${page.metadata?.title || page.metadata?.url || 'Unknown'} ---\n\n`;
        combinedContent += page.markdown;
      }
    }

    // Update chatbot with crawled content
    const { error: updateError } = await supabase
      .from('chatbots')
      .update({
        website_content: combinedContent,
        crawl_status: 'completed',
        last_crawled_at: new Date().toISOString(),
      })
      .eq('id', chatbotId);

    if (updateError) {
      console.error('Failed to update chatbot:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to save crawled content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Website crawled successfully',
      pagesCount: pages.length,
      contentLength: combinedContent.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in crawl-website function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
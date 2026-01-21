import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractionRule {
  patterns?: string[];
  regex?: string[];
  context_keywords?: string[];
  validation_regex?: string;
}

const extractParameterValue = (text: string, rules: ExtractionRule, paramName: string): string | null => {
  const lowerText = text.toLowerCase();
  
  // Special handling for condition parameter
  if (paramName === 'condition') {
    console.log(`Looking for condition in text: "${text}"`);
    
    // Check for negative context first - if user is saying they DON'T have something, don't extract it
    const negativePatterns = [
      /(?:no|don'?t|not|never)\s+(?:have|had|diagnosed|suffering)/i,
      /(?:i\s+)?(?:no|don'?t|not|never)\s+(?:have|had)\s+/i
    ];
    
    for (const negPattern of negativePatterns) {
      if (negPattern.test(text)) {
        console.log('Found negative context, not extracting condition');
        return null;
      }
    }
    
    // Only extract conditions from user messages that explicitly state "I have" or similar
    const conditionPatterns = [
      /(?:yes\s+)?(?:i\s+have|have)\s+([a-z][a-z\s]{1,30})/i,
      /(?:diagnosed\s+with|suffering\s+from)\s+([a-z][a-z\s]{1,30})/i,
      /(?:condition\s+is)\s+([a-z][a-z\s]{1,30})/i
    ];
    
    for (const pattern of conditionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let condition = match[1].trim().toLowerCase();
        console.log(`Found potential condition: "${condition}"`);
        
        // Clean up common words and names
        condition = condition.replace(/\b(an?|the|my|some|bad|severe|chronic|thank|you)\b/gi, '').trim();
        
        // Remove names (capitalize words that look like names)
        const words = condition.split(/\s+/);
        const medicalTerms = ['diabetes', 'arthritis', 'urticaria', 'psoriasis', 'asthma', 'copd', 'eczema', 'dermatitis', 'hypertension', 'allergies', 'atopic'];
        const cleanWords = words.filter(word => {
          const lowerWord = word.toLowerCase();
          // Keep medical terms and common condition words
          return medicalTerms.some(term => lowerWord.includes(term)) || 
                 ['obstructive', 'pulmonary', 'disease', 'chronic'].includes(lowerWord);
        });
        
        const cleanCondition = cleanWords.join(' ').trim();
        
        // Only return if it's a substantial medical term
        if (cleanCondition.length >= 3 && cleanCondition.length <= 50) {
          console.log(`Extracted condition: "${cleanCondition}"`);
          return cleanCondition;
        }
      }
    }
    
    console.log('No condition found in patterns, trying exact matches');
    
    // List of specific qualifying conditions to look for
    const qualifyingConditions = ['urticaria', 'atopic dermatitis', 'psoriasis', 'copd', 'asthma', 'chronic obstructive pulmonary disease', 'eczema', 'dermatitis'];
    const nonQualifyingConditions = ['arthritis', 'diabetes', 'hypertension', 'allergies'];
    const allConditions = [...qualifyingConditions, ...nonQualifyingConditions];
    
    // Only match if the condition appears in a proper context (after "I have", etc.)
    for (const condition of allConditions) {
      const contextPattern = new RegExp(`(?:i\\s+have|have|diagnosed\\s+with|suffering\\s+from)\\s+[^.]*?\\b${condition}\\b`, 'i');
      if (contextPattern.test(lowerText)) {
        console.log(`Found condition in context: "${condition}"`);
        return condition;
      }
    }
  }
  
  // First try regex patterns if they exist
  if (rules.regex && rules.regex.length > 0) {
    for (const regexPattern of rules.regex) {
      try {
        const regex = new RegExp(regexPattern, 'i');
        const match = text.match(regex);
        
        if (match) {
          let extracted = null;
          
          // Handle name+phone pattern specially
          if (regexPattern.includes('\\d{10,15}')) {
            if (paramName === 'name' && match[1]) {
              extracted = match[1].trim();
            } else if (paramName === 'phone_number' && match[2]) {
              extracted = match[2].trim();
            } else if (paramName === 'phone_number' && match[1] && /^\d+$/.test(match[1])) {
              extracted = match[1].trim();
            }
          } else if (match[1]) {
            extracted = match[1].trim();
          }
          
          if (extracted) {
            // Clean up the extracted value - be more permissive for names
            if (paramName === 'name') {
              // For name patterns, keep Unicode letters, spaces, and common name characters
              extracted = extracted.replace(/[^\p{L}\s\-'\.]/gu, '').trim();
            } else if (paramName === 'phone_number') {
              // For phone numbers, keep only digits
              extracted = extracted.replace(/[^\d]/g, '').trim();
            } else if (paramName === 'condition') {
              // For conditions, keep letters and spaces
              extracted = extracted.replace(/[^\w\s]/g, '').trim();
            } else {
              // For other patterns 
              extracted = extracted.replace(/[^\w\s@.-]/g, '').trim();
            }
            
            // Additional validation for names - exclude common words/phrases and clean up
            if (paramName === 'name' && extracted && extracted.length >= 2) {
              const lowerExtracted = extracted.toLowerCase();
              const excludeWords = ['espanol', 'spanish', 'español', 'name', 'nombre', 'llamar', 'call', 'hello', 'hola', 'hi', 'my', 'me', 'is', 'soy', 'this'];
              
              // Clean up the name - remove numbers and non-name words
              let cleanName = extracted.replace(/\d+/g, '').trim(); // Remove all numbers
              const nameWords = cleanName.split(/\s+/).filter(word => {
                const lowerWord = word.toLowerCase();
                return word.length >= 2 && 
                       !excludeWords.includes(lowerWord) &&
                       !/^\d+$/.test(word) && // No pure numbers
                       /^[a-zA-ZÀ-ÿ\u00f1\u00d1]+$/.test(word); // Only letters (including accented)
              });
              
              if (nameWords.length > 0 && nameWords.length <= 4) { // Reasonable name length
                const finalName = nameWords.join(' ');
                if (!excludeWords.includes(finalName.toLowerCase())) {
                  return finalName;
                }
              }
            } else if (paramName === 'phone_number' && extracted && extracted.length >= 10) {
              return extracted;
            } else if (paramName === 'condition' && extracted && extracted.length >= 2) {
              return extracted;
            } else if (paramName !== 'name' && paramName !== 'phone_number' && paramName !== 'condition' && extracted) {
              return extracted;
            }
          }
        }
      } catch (regexError) {
        console.error('Invalid regex pattern:', regexPattern, regexError);
      }
    }
  }
  
  // Then try wildcard patterns
  for (const pattern of rules.patterns || []) {
    const lowerPattern = pattern.toLowerCase();
    
    if (lowerPattern.includes('*')) {
      // Handle wildcard patterns like "my name is *"
      const regexPattern = lowerPattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\\?\*/g, '([\\p{L}\\s\\-\'\\.]*)'); // Replace * with Unicode-aware capture group
      
      try {
        const regex = new RegExp(regexPattern, 'igu');
        const match = text.match(regex);
        
        if (match && match[1]) {
          let extracted = match[1].trim();
          
          // Clean up the extracted value - support Unicode characters for names
          extracted = extracted.replace(/[^\p{L}\s\-'\.]/gu, '').trim();
          
          // Stop at phone numbers or common separators
          extracted = extracted.split(/\s*[0-9]{10}|\s*y\s*|\s*and\s*/i)[0].trim();
          
          // Validate with regex if provided
          if (rules.validation_regex) {
            const validationRegex = new RegExp(rules.validation_regex);
            if (!validationRegex.test(extracted)) {
              continue;
            }
          }
          
          // Additional validation for names - exclude common words/phrases and clean up
          if (extracted && extracted.length >= 2) {
            const lowerExtracted = extracted.toLowerCase();
            const excludeWords = ['espanol', 'spanish', 'español', 'name', 'nombre', 'llamar', 'call', 'hello', 'hola', 'hi', 'my', 'me', 'is', 'soy', 'this'];
            
            // Clean up the name - remove numbers and non-name words
            let cleanName = extracted.replace(/\d+/g, '').trim(); // Remove all numbers
            const nameWords = cleanName.split(/\s+/).filter(word => {
              const lowerWord = word.toLowerCase();
              return word.length >= 2 && 
                     !excludeWords.includes(lowerWord) &&
                     !/^\d+$/.test(word) && // No pure numbers
                     /^[a-zA-ZÀ-ÿ\u00f1\u00d1]+$/.test(word); // Only letters (including accented)
            });
            
            if (nameWords.length > 0 && nameWords.length <= 4) { // Reasonable name length
              const finalName = nameWords.join(' ');
              if (!excludeWords.includes(finalName.toLowerCase())) {
                return finalName;
              }
            }
          }
        }
      } catch (regexError) {
        console.error('Invalid regex pattern for wildcard:', regexPattern, regexError);
      }
    } else {
      // Direct pattern matching for boolean values
      if (lowerText.includes(lowerPattern)) {
        return pattern;
      }
    }
  }
  
  return null;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { conversationId, messages } = await req.json();

    if (!conversationId || !messages) {
      throw new Error('Missing conversationId or messages');
    }

    console.log(`Extracting parameters for conversation ${conversationId}`);

    // Get the conversation to find the chatbot
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('chatbot_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // Get custom parameters for this chatbot
    const { data: parameters, error: paramError } = await supabase
      .from('chatbot_custom_parameters')
      .select('*')
      .eq('chatbot_id', conversation.chatbot_id);

    if (paramError) {
      throw paramError;
    }

    if (!parameters || parameters.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No custom parameters defined', extracted: {} }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${parameters.length} custom parameters to extract`);

    const extractedParams: Record<string, string> = {};
    
    // Combine all message text for extraction
    const allText = messages
      .map((msg: any) => msg.content)
      .join(' ');

    // Extract each parameter
    for (const param of parameters) {
      console.log(`Extracting parameter: ${param.parameter_name}`);
      
      const rules = param.extraction_rules as ExtractionRule;
      let extracted = null;
      
      // For name and phone_number, prioritize the most recent user message that contains both
      if (param.parameter_name === 'name' || param.parameter_name === 'phone_number') {
        // Look at user messages in reverse order to find the most recent one with both name and phone
        const userMessages = messages.filter((msg: any) => msg.role === 'user').reverse();
        
        for (const msg of userMessages) {
          const msgText = msg.content;
          // Check if this message contains both letters and numbers (likely name + phone)
          if (/[a-zA-Z]/.test(msgText) && /[0-9]{10}/.test(msgText)) {
            extracted = extractParameterValue(msgText, rules, param.parameter_name);
            if (extracted) {
              console.log(`Found ${param.parameter_name} in message: "${msgText}"`);
              break;
            }
          }
        }
        
        // Fallback to all text if not found in individual messages
        if (!extracted) {
          extracted = extractParameterValue(allText, rules, param.parameter_name);
        }
      } else if (param.parameter_name === 'condition') {
        // For condition, only look at user messages to avoid picking up bot's condition list
        const userMessages = messages.filter((msg: any) => msg.role === 'user');
        const userText = userMessages.map((msg: any) => msg.content).join(' ');
        extracted = extractParameterValue(userText, rules, param.parameter_name);
      } else if (param.parameter_name === 'qualified') {
        // For qualified parameter, check for negative responses first
        const userMessages = messages.filter((msg: any) => msg.role === 'user');
        const userText = userMessages.map((msg: any) => msg.content).join(' ');
        
        // Check for negative context - if user says no/don't have, they're not qualified
        const negativePatterns = [
          /(?:no|don'?t|not|never)\s+(?:have|had|diagnosed|suffering)/i,
          /(?:i\s+)?(?:no|don'?t|not|never)\s+(?:have|had)\s+/i,
          /^no$/i, // Simple "no" answer
          /english\s+no/i // "english no" pattern
        ];
        
        for (const negPattern of negativePatterns) {
          if (negPattern.test(userText)) {
            console.log('Found negative response, user is not qualified');
            extracted = 'not qualified';
            break;
          }
        }
        
        // Only check conditions if no negative response found
        if (!extracted) {
          const qualifyingConditions = ['urticaria', 'atopic dermatitis', 'psoriasis', 'copd', 'asthma', 'chronic obstructive pulmonary disease', 'eczema', 'dermatitis'];
          
          // Get the condition that was extracted
          const conditionParam = parameters.find(p => p.parameter_name === 'condition');
          if (conditionParam) {
            const extractedCondition = extractParameterValue(userText, conditionParam.extraction_rules as ExtractionRule, 'condition');
            
            if (extractedCondition) {
              const isQualified = qualifyingConditions.some(qc => 
                extractedCondition.toLowerCase().includes(qc.toLowerCase()) || 
                qc.toLowerCase().includes(extractedCondition.toLowerCase())
              );
              extracted = isQualified ? 'qualified' : 'not qualified';
              console.log(`Condition "${extractedCondition}" is ${extracted}`);
            } else {
              // No condition extracted means not qualified
              extracted = 'not qualified';
              console.log('No condition extracted, user is not qualified');
            }
          }
        }
      } else {
        // For other parameters, use the combined text
        extracted = extractParameterValue(allText, rules, param.parameter_name);
      }
      
      if (extracted) {
        extractedParams[param.parameter_name] = extracted;
        console.log(`Extracted ${param.parameter_name}: ${extracted}`);
        
        // Store in database
        const { error: insertError } = await supabase
          .from('conversation_parameters')
          .upsert({
            conversation_id: conversationId,
            parameter_name: param.parameter_name,
            parameter_value: extracted
          }, {
            onConflict: 'conversation_id, parameter_name'
          });

        if (insertError) {
          console.error(`Error storing parameter ${param.parameter_name}:`, insertError);
        }
      }
    }

    console.log(`Extraction complete. Found ${Object.keys(extractedParams).length} parameters`);

    return new Response(
      JSON.stringify({ 
        message: 'Parameter extraction complete',
        extracted: extractedParams,
        totalParameters: parameters.length
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in extract-parameters function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

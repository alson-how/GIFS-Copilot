import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// JSON schema for intent classification
const intentClassificationSchema = {
  name: "IntentClassification",
  schema: {
    type: "object",
    properties: {
      intent: { 
        type: "string", 
        enum: ["export_order", "check_status", "request_quote"]
      }
    },
    required: ["intent"],
    additionalProperties: false
  },
  strict: true
};

/**
 * Classify user intent using OpenAI
 * @param {string} userQuery - The user's input query/intent
 * @returns {Promise<Object>} Classification result with intent
 */
export async function classifyIntent(userQuery) {
  try {
    console.log(`🎯 Classifying user intent: "${userQuery}"`);
    
    const prompt = `You are a classification system. Classify the user query into a single, valid intent from the list: export_order, check_status, request_quote. The intent for exporting an order should be export_order. Respond only with a JSON object containing the intent key. 

Examples:
- {"query": "I need to ship my package to Germany", "intent": "export_order"}
- {"query": "I want to export this order to China", "intent": "export_order"}
- {"query": "What's the status of my shipment?", "intent": "check_status"}
- {"query": "Can you give me a quote for shipping?", "intent": "request_quote"}

Query: "${userQuery}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an intent classification system. Classify user queries into export_order, check_status, or request_quote intents only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: intentClassificationSchema
      },
      temperature: 0.1,
      max_tokens: 50
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    console.log(`✅ Intent classified: "${result.intent}" for query: "${userQuery}"`);
    
    return {
      success: true,
      intent: result.intent,
      confidence: 1.0, // OpenAI structured output is highly confident
      original_query: userQuery
    };

  } catch (error) {
    console.error('❌ Intent classification failed:', error);
    
    // Fallback: simple keyword-based classification
    const query = userQuery.toLowerCase();
    let fallbackIntent = 'export_order'; // Default fallback
    
    if (query.includes('status') || query.includes('track') || query.includes('check')) {
      fallbackIntent = 'check_status';
    } else if (query.includes('quote') || query.includes('price') || query.includes('cost')) {
      fallbackIntent = 'request_quote';
    } else if (query.includes('export') || query.includes('ship') || query.includes('send') || 
               query.includes('deliver') || query.includes('order')) {
      fallbackIntent = 'export_order';
    }
    
    console.log(`⚠️ Using fallback classification: "${fallbackIntent}"`);
    
    return {
      success: false,
      intent: fallbackIntent,
      confidence: 0.5, // Lower confidence for fallback
      original_query: userQuery,
      error: error.message,
      used_fallback: true
    };
  }
}

/**
 * Validate if intent is suitable for export processing
 * @param {string} intent - The classified intent
 * @returns {boolean} Whether the intent is valid for export processing
 */
export function isExportIntent(intent) {
  return intent === 'export_order';
}

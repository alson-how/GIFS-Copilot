import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// JSON schema for commercial invoice detection
const commercialInvoiceSchema = {
  name: "CommercialInvoiceDetection",
  schema: {
    type: "object",
    properties: {
      is_commercial_invoice: { type: "boolean" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      reason: { type: "string" },
      labels_found: { type: "array", items: { type: "string" } },
                extracted_fields: {
            type: "object",
            properties: {
              invoice_no: { type: "string" },
              date: { type: "string" },
              buyer: { type: "string" },
              seller: { type: "string" },
              incoterms: { type: "string" },
              currency: { type: "string" },
              subtotal: { type: "string" },
              freight: { type: "string" },
              insurance: { type: "string" },
              total_cif: { type: "string" }
            },
            additionalProperties: false
          }
    },
    required: ["is_commercial_invoice", "confidence", "reason"],
    additionalProperties: false
  },
  strict: true
};

/**
 * Heuristic scoring for Commercial Invoice detection
 * @param {string} text - Extracted text from document
 * @returns {Object} - { score, passedMust, matched }
 */
export function heuristicCommercialInvoiceScore(text) {
  const upperText = text.toUpperCase();
  
  // Must-have patterns (required to pass) - ALL must be present
  const mustHits = [
    /COMMERCIAL[\s-]*INVOICE/,
    /(INVOICE\s*NO|INV[.\s]*NO|INVOICE\s*NUMBER)/,
    /(BILL TO|SOLD TO|CONSIGNEE)(?!\s*BANK)/,  // Exclude "CONSIGNEE BANK" 
    /(SHIP TO|DELIVER TO)/
  ];
  
  // Strong clues (positive indicators)
  const strongClues = [
    /\bHS\s*CODE\b/,
    /\bINCOTERMS?\b|\bFOB\b|\bCIF\b|\bEXW\b/,
    /\bSUBTOTAL\b/,
    /\bFREIGHT\b/,
    /\bINSURANCE\b/,
    /\bTOTAL\s*CIF\b/,
    /\bCOUNTRY OF ORIGIN\b/,
    /\bCURRENCY\b/
  ];
  
  // Negative indicators (document is likely something else)
  const negatives = [
    /\bBILL OF LADING\b|\bB\/L\b/,
    /\bPACKING LIST\b/,
    /\bCERTIFICATE OF ORIGIN\b/,
    /\bINSURANCE CERTIFICATE\b|\bINSTITUTE CARGO CLAUSES\b/,
    /\bDELIVERY ORDER\b/,
    /\bLETTER OF CREDIT\b|\bDOCUMENTARY CREDIT\b|\bUCP\s*600\b/,
    /\bSTRATEGIC TRADE PERMIT\b|\bMITI\b|\bIMPORT PERMIT\b|\bEXPORT PERMIT\b/,
    /\bPERMIT NO\b|\bPERMIT NUMBER\b/,
    /\bAPPLICANT\b.*\bBENEFICIARY\b/,
    /\bDBS BANK\b|\bBANK.*SINGAPORE\b/
  ];
  
  const matched = {
    mustHits: [],
    strongClues: [],
    negatives: []
  };
  
  let score = 0;
  
  // Check must-hits (+2 each)
  for (const pattern of mustHits) {
    if (pattern.test(upperText)) {
      matched.mustHits.push(pattern.source);
      score += 2;
    }
  }
  
  // Check strong clues (+1 each)
  for (const pattern of strongClues) {
    if (pattern.test(upperText)) {
      matched.strongClues.push(pattern.source);
      score += 1;
    }
  }
  
  // Check negatives (-5 each, more severe penalty)
  for (const pattern of negatives) {
    if (pattern.test(upperText)) {
      matched.negatives.push(pattern.source);
      score -= 5;
    }
  }
  
  const passedMust = matched.mustHits.length === mustHits.length;
  
  return {
    score,
    passedMust,
    matched
  };
}

/**
 * Classify document using OpenAI with structured output
 * @param {string} extractedText - Text extracted from document
 * @param {Object} heuristics - Result from heuristicCommercialInvoiceScore
 * @returns {Promise<Object>} - Classification result
 */
export async function classifyWithLLM(extractedText, heuristics) {
  try {
    // Truncate text to ~12k chars to fit within token limits
    const truncatedText = extractedText.length > 12000 
      ? extractedText.substring(0, 12000) + "...[TRUNCATED]"
      : extractedText;
    
    const systemPrompt = `You are an expert document classifier specializing in international trade documents.

A Commercial Invoice is a legal document that:
- Shows details of goods sold between buyer and seller
- Contains pricing, quantities, and terms of sale
- Is used for customs clearance and payment
- Has specific required fields like invoice number, buyer/seller info, incoterms

Commercial Invoices typically contain:
- "COMMERCIAL INVOICE" header
- Invoice number and date
- Buyer (Bill To/Sold To/Consignee) information
- Seller information
- Ship To/Deliver To address
- Product descriptions with quantities and prices
- HS codes for customs classification
- Incoterms (FOB, CIF, EXW, etc.)
- Subtotal, freight, insurance costs
- Total amount (often CIF total)
- Country of origin
- Currency specification

Documents that are NOT Commercial Invoices:
- Bill of Lading (B/L) - shipping document
- Packing List - itemizes packages
- Certificate of Origin - proves country of origin
- Insurance Certificate - cargo insurance policy
- Delivery Order - warehouse release document
- Letter of Credit - payment instrument
- Strategic Trade Permit - export license

Analyze the document text and classify whether it's a Commercial Invoice.`;

    const userPrompt = `Please analyze this document and determine if it's a Commercial Invoice.

Heuristic Analysis Results:
${JSON.stringify(heuristics, null, 2)}

Document Text:
${truncatedText}

Based on the content, structure, and key indicators, classify this document and provide your reasoning.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: commercialInvoiceSchema
      },
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    console.log('🤖 OpenAI Classification Result:', {
      is_commercial_invoice: result.is_commercial_invoice,
      confidence: result.confidence,
      reason: result.reason.substring(0, 200) + '...'
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in LLM classification:', error);
    
    // Fallback to heuristic-only classification
    return {
      is_commercial_invoice: heuristics.passedMust && heuristics.score > 0,
      confidence: heuristics.passedMust ? Math.min(heuristics.score / 10, 0.8) : 0.2,
      reason: `Fallback heuristic classification. Score: ${heuristics.score}, Must-hits passed: ${heuristics.passedMust}`,
      labels_found: [...heuristics.matched.mustHits, ...heuristics.matched.strongClues],
      extracted_fields: {}
    };
  }
}

/**
 * Complete Commercial Invoice detection pipeline
 * @param {string} extractedText - Text from uploaded document
 * @returns {Promise<Object>} - Detection result with classification and details
 */
export async function detectCommercialInvoice(extractedText) {
  console.log('🔍 Starting Commercial Invoice detection...');
  
  // Step 1: Heuristic analysis
  const heuristics = heuristicCommercialInvoiceScore(extractedText);
  console.log('📊 Heuristic analysis:', {
    score: heuristics.score,
    passedMust: heuristics.passedMust,
    mustHits: heuristics.matched.mustHits.length,
    strongClues: heuristics.matched.strongClues.length,
    negatives: heuristics.matched.negatives.length
  });
  
  // Step 2: Determine if LLM verification is needed
  // Always use LLM if negatives found, or if score is low, or if not all must-hits passed
  const needsLLMVerification = !heuristics.passedMust || heuristics.score < 8 || heuristics.matched.negatives.length > 0;
  
  let finalResult;
  
  if (needsLLMVerification) {
    console.log('🤖 Heuristics uncertain, using OpenAI for verification...');
    finalResult = await classifyWithLLM(extractedText, heuristics);
  } else {
    console.log('✅ Heuristics confident, skipping LLM verification');
    finalResult = {
      is_commercial_invoice: true,
      confidence: Math.min(heuristics.score / 10, 0.95),
      reason: `Strong heuristic match. Score: ${heuristics.score}, all must-hits passed.`,
      labels_found: [...heuristics.matched.mustHits, ...heuristics.matched.strongClues],
      extracted_fields: {}
    };
  }
  
  return {
    ...finalResult,
    heuristics,
    used_llm: needsLLMVerification
  };
}

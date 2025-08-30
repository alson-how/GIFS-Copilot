// Simple test of the China order Commercial Invoice detection
import fs from 'fs';
import pdfParse from 'pdf-parse';

// Mock the heuristic detection function for testing
function heuristicCommercialInvoiceScore(text) {
  const upperText = text.toUpperCase();
  
  const mustHits = [
    /COMMERCIAL[\s-]*INVOICE/,
    /(INVOICE\s*NO|INV[.\s]*NO)/,
    /(BILL TO|SOLD TO|CONSIGNEE)/,
    /(SHIP TO|DELIVER TO)/
  ];
  
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
  
  const negatives = [
    /\bBILL OF LADING\b|\bB\/L\b/,
    /\bPACKING LIST\b/,
    /\bCERTIFICATE OF ORIGIN\b/,
    /\bINSURANCE CERTIFICATE\b|\bINSTITUTE CARGO CLAUSES\b/,
    /\bDELIVERY ORDER\b/,
    /\bLETTER OF CREDIT\b|\bUCP\s*600\b/,
    /\bSTRATEGIC TRADE PERMIT\b|\bMITI\b/
  ];
  
  const matched = { mustHits: [], strongClues: [], negatives: [] };
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
  
  // Check negatives (-3 each)
  for (const pattern of negatives) {
    if (pattern.test(upperText)) {
      matched.negatives.push(pattern.source);
      score -= 3;
    }
  }
  
  const passedMust = matched.mustHits.length === mustHits.length;
  
  return { score, passedMust, matched };
}

async function testCommercialInvoiceDetection() {
  try {
    console.log('🧪 Testing Commercial Invoice Detection for China Orders\n');
    
    // Test with the sample Commercial Invoice
    const pdfPath = '/Users/alson.ngsayhow/Downloads/sample_supporting_docs/Commercial_Invoice_TF-2025-0892.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ Sample PDF not found');
      return;
    }
    
    console.log('📄 Extracting text from Commercial Invoice PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const extractedText = pdfData.text;
    
    console.log(`📊 Extracted ${extractedText.length} characters`);
    console.log('📝 First 500 characters:');
    console.log(extractedText.substring(0, 500) + '...\n');
    
    // Test heuristic detection
    console.log('🔍 Running heuristic detection...');
    const heuristics = heuristicCommercialInvoiceScore(extractedText);
    
    console.log('📊 Heuristic Results:');
    console.log('  Score:', heuristics.score);
    console.log('  Passed Must-Hits:', heuristics.passedMust);
    console.log('  Must-Hits Found:', heuristics.matched.mustHits.length, '/', 4);
    console.log('  Strong Clues Found:', heuristics.matched.strongClues.length);
    console.log('  Negatives Found:', heuristics.matched.negatives.length);
    
    console.log('\n🎯 Detection Details:');
    console.log('  Must-Hits:', heuristics.matched.mustHits);
    console.log('  Strong Clues:', heuristics.matched.strongClues);
    console.log('  Negatives:', heuristics.matched.negatives);
    
    // Determine result
    const isCommercialInvoice = heuristics.passedMust && heuristics.score > 0;
    const confidence = heuristics.passedMust ? Math.min(heuristics.score / 10, 0.95) : 0.2;
    
    console.log('\n✅ Final Result:');
    console.log('  Is Commercial Invoice:', isCommercialInvoice);
    console.log('  Confidence:', confidence.toFixed(2));
    console.log('  Recommendation:', isCommercialInvoice ? 'ACCEPT for China order' : 'REJECT - not a commercial invoice');
    
  } catch (error) {
    console.error('❌ Error in testing:', error);
  }
}

testCommercialInvoiceDetection();

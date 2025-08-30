import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pkg from 'pg';
import pdfParse from 'pdf-parse';
import { detectCommercialInvoice } from '../services/llm-classify.js';
import { classifyIntent, isExportIntent } from '../services/intentClassification.js';
import { askRagChatbotWithSources } from '../utils/ragChatbot.js';
import DocumentParser from '../services/documentParser.js';
import StrategicDetectionEngine from '../services/strategicDetectionEngine.js';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize document parser
const documentParser = new DocumentParser();

// Configure multer for invoice uploads with dynamic shipment folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create temporary upload directory first
    const tempUploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `temp-${timestamp}-${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
    }
  }
});

/**
 * Extract text from uploaded file
 */
async function extractTextFromFile(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }
    
    // For other file types, you might want to add more extraction logic
    // For now, return empty string for non-PDF files
    return '';
  } catch (error) {
    console.error('❌ Error extracting text from file:', error);
    console.log('⚠️ PDF extraction failed, document might be corrupted or unsupported format');
    // Return empty string instead of throwing - let the system handle this gracefully
    return '';
  }
}

/**
 * Create shipment record in database
 */
async function createShipment(shipmentData) {
  const shipmentId = uuidv4();
  
  try {
    await pool.query(`
      INSERT INTO shipments (
        shipment_id, destination_country
      ) VALUES ($1, $2)
    `, [shipmentId, shipmentData.destination || 'Unknown']);
    
    console.log(`✅ Created shipment record: ${shipmentId}`);
    return shipmentId;
  } catch (error) {
    console.error('❌ Error creating shipment:', error);
    throw new Error('Failed to create shipment record');
  }
}

/**
 * Move file to shipment-specific folder and update path
 */
async function moveFileToShipmentFolder(tempFilePath, shipmentId, originalFilename) {
  try {
    // Create shipment-specific directory
    const shipmentDir = path.join(__dirname, `../../uploads/shipments/${shipmentId}`);
    if (!fs.existsSync(shipmentDir)) {
      fs.mkdirSync(shipmentDir, { recursive: true });
    }
    
    // Generate final filename
    const timestamp = Date.now();
    const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFilename = `invoice-${timestamp}-${sanitizedName}`;
    const finalFilePath = path.join(shipmentDir, finalFilename);
    
    // Move file from temp to shipment folder
    fs.renameSync(tempFilePath, finalFilePath);
    
    console.log(`✅ Moved file to shipment folder: ${finalFilePath}`);
    
    // Return relative path for database storage
    return `uploads/shipments/${shipmentId}/${finalFilename}`;
  } catch (error) {
    console.error('❌ Error moving file to shipment folder:', error);
    throw new Error('Failed to move file to shipment folder');
  }
}

/**
 * Save document processing results
 */
async function saveDocumentResults(shipmentId, documentData, ocrData, classificationResult) {
  try {
    // Save document record to uploaded_documents table
    const documentResult = await pool.query(`
      INSERT INTO uploaded_documents (
        shipment_id, original_filename, file_path, document_type, 
        confidence_score, ocr_results, file_size, mime_type,
        ocr_status, extracted_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING document_id
    `, [
      shipmentId,
      documentData.filename,
      documentData.filePath,
      classificationResult.is_commercial_invoice ? 'Commercial Invoice' : 'Unknown',
      classificationResult.confidence,
      JSON.stringify(ocrData),
      documentData.fileSize,
      documentData.mimeType,
      'completed',
      ocrData.raw_text || ''
    ]);
    
    console.log(`✅ Saved document record for shipment: ${shipmentId}`);
    return documentResult.rows[0].document_id;
  } catch (error) {
    console.error('❌ Error saving document results:', error);
    throw new Error('Failed to save document processing results');
  }
}

/**
 * Extract destination from user intent or document
 */
function extractDestination(intent, ocrData) {
  if (!intent) return 'Unknown';
  
  // Extract destination from intent
  const intentLower = intent.toLowerCase();
  const destinations = [
    'china', 'usa', 'united states', 'singapore', 'malaysia', 'thailand', 
    'vietnam', 'indonesia', 'philippines', 'japan', 'korea', 'india',
    'australia', 'new zealand', 'uk', 'united kingdom', 'germany', 
    'france', 'italy', 'spain', 'netherlands', 'belgium'
  ];
  
  for (const dest of destinations) {
    if (intentLower.includes(dest)) {
      return dest.charAt(0).toUpperCase() + dest.slice(1);
    }
  }
  
  // Try to extract from OCR data if available
  if (ocrData && ocrData.consignee_name) {
    const consignee = ocrData.consignee_name.toLowerCase();
    for (const dest of destinations) {
      if (consignee.includes(dest)) {
        return dest.charAt(0).toUpperCase() + dest.slice(1);
      }
    }
  }
  
  return 'Unknown';
}

// POST /api/invoice-detection/upload - Handle invoice document upload
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    const { intent } = req.body; // User's intent/description
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    if (!intent || intent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Intent/description is required'
      });
    }
    
    console.log(`📄 Processing invoice upload: ${file.originalname}`);
    console.log(`📝 User intent: ${intent}`);
    
    // Step 1: Extract text from uploaded document
    const extractedText = await extractTextFromFile(file.path, file.mimetype);
    
    if (!extractedText || extractedText.trim().length < 50) {
      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      console.log(`🤖 Document text extraction failed, fallback to RAG chatbot for intent: "${intent}"`);
      
      try {
        // Use RAG chatbot utility to answer the user's question
        const ragResponse = await askRagChatbotWithSources(intent, 'MY');
        
        if (ragResponse.success) {
          return res.json({
            success: true,
            type: 'chatbot_response',
            document_classification: {
              is_commercial_invoice: false,
              reason: 'Could not extract text from uploaded document',
              confidence: 0
            },
            message: 'I couldn\'t read the uploaded document, but let me help you with your question instead.',
            chatbot_response: ragResponse.answer,
            sources: ragResponse.sources || [],
            confidence: ragResponse.confidence
          });
        } else {
          throw new Error(ragResponse.error || 'RAG processing failed');
        }
      } catch (ragError) {
        console.error('❌ RAG fallback error after text extraction failure:', ragError);
        
        return res.status(400).json({
          success: false,
          error: 'Could not extract text from document and unable to process query',
          details: {
            reason: 'Document text extraction failed and RAG fallback failed',
            extraction_error: 'Insufficient or no text extracted from document',
            fallback_error: ragError.message
          }
        });
      }
    }
    
    console.log(`📄 Extracted ${extractedText.length} characters from document`);
    
    // Step 2: Detect if document is a Commercial Invoice
    const classificationResult = await detectCommercialInvoice(extractedText);
    
    console.log(`🔍 Classification result:`, {
      is_commercial_invoice: classificationResult.is_commercial_invoice,
      confidence: classificationResult.confidence,
      used_llm: classificationResult.used_llm
    });
    
    if (!classificationResult.is_commercial_invoice) {
      // Clean up temp file since we're not processing it for export
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      console.log(`🤖 Document is not Commercial Invoice, fallback to RAG chatbot`);
      
      try {
        // Use RAG chatbot utility to answer the user's question about the uploaded document
        const ragResponse = await askRagChatbotWithSources(intent, 'MY');
        
        if (ragResponse.success) {
          return res.json({
            success: true,
            type: 'chatbot_response',
            document_classification: {
              is_commercial_invoice: false,
              reason: classificationResult.reason,
              confidence: classificationResult.confidence
            },
            message: 'I see you uploaded a document, but it doesn\'t appear to be a Commercial Invoice. Let me help you with your question instead.',
            chatbot_response: ragResponse.answer,
            sources: ragResponse.sources || [],
            confidence: ragResponse.confidence
          });
        } else {
          throw new Error(ragResponse.error || 'RAG processing failed');
        }
      } catch (ragError) {
        console.error('❌ RAG fallback error:', ragError);
        
        return res.status(400).json({
          success: false,
          error: 'Document does not appear to be a Commercial Invoice and unable to process query',
          details: {
            reason: classificationResult.reason,
            confidence: classificationResult.confidence,
            labels_found: classificationResult.labels_found || [],
            fallback_error: ragError.message
          }
        });
      }
    }
    
    // Step 3: Classify user intent using OpenAI
    console.log('🎯 Starting intent classification...');
    const intentResult = await classifyIntent(intent);
    
    console.log(`🎯 Intent classification result:`, {
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      used_fallback: intentResult.used_fallback || false
    });
    
    if (!isExportIntent(intentResult.intent)) {
      // Clean up temp file since we're not processing it for export
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      console.log(`🤖 Fallback to RAG chatbot for intent: ${intentResult.intent}`);
      
      try {
        // Use RAG chatbot utility to answer the user's query
        const ragResponse = await askRagChatbotWithSources(intent, 'MY');
        
        if (ragResponse.success) {
          return res.json({
            success: true,
            type: 'chatbot_response',
            intent_classification: intentResult,
            message: 'Your query has been processed by our AI assistant.',
            answer: ragResponse.answer,
            sources: ragResponse.sources || [],
            confidence: ragResponse.confidence,
            note: 'For export order processing, please upload a Commercial Invoice with an export-related intent.'
          });
        } else {
          throw new Error(ragResponse.error || 'RAG processing failed');
        }
        
      } catch (ragError) {
        console.error('❌ RAG fallback error:', ragError);
        
        // Final fallback with helpful message
        return res.json({
          success: true,
          type: 'general_response',
          intent_classification: intentResult,
          message: `I understand you're asking about "${intent}". While I can help with export orders when you upload a Commercial Invoice, for general logistics and compliance questions, I recommend:`,
          suggestions: [
            'For export order processing: Upload a Commercial Invoice with an export-related intent',
            'For compliance questions: Try asking specific questions about export regulations',
            'For shipment status: Use "What is the status of shipment [ID]?"',
            'For quotes: Ask "Can you provide a quote for shipping to [destination]?"'
          ],
          fallback_reason: 'RAG system temporarily unavailable'
        });
      }
    }
    
    console.log(`✅ Both validations passed - Document: Commercial Invoice, Intent: ${intentResult.intent}`);
    
    // Step 4: Extract OCR data using document parser
    let ocrData;
    try {
      ocrData = documentParser.extractFields(extractedText, 'Commercial Invoice');
      console.log(`📊 Extracted ${Object.keys(ocrData).length} fields from Commercial Invoice`);
    } catch (error) {
      console.error('❌ Error in OCR extraction:', error);
      ocrData = {
        raw_text: extractedText,
        extraction_error: error.message
      };
    }
    
    // Step 5: Extract destination from intent or OCR data
    const destination = extractDestination(intent, ocrData);
    
    // Step 6: Generate shipment ID and create shipment record
    const shipmentId = await createShipment({
      destination: destination,
      intent: intent
    });
    
    // Step 7: Move file to shipment-specific folder
    const finalFilePath = await moveFileToShipmentFolder(
      file.path, 
      shipmentId, 
      file.originalname
    );
    
    // Step 8: Save all results to database
    const documentId = await saveDocumentResults(
      shipmentId,
      {
        filename: file.originalname,
        filePath: finalFilePath,
        fileSize: file.size,
        mimeType: file.mimetype
      },
      ocrData,
      classificationResult
    );
    
    // Step 9: Run strategic items detection on extracted products
    try {
      console.log(`🎯 Running strategic detection for shipment: ${shipmentId}`);
      const strategicEngine = new StrategicDetectionEngine(pool);
      
      // Check if we have product items to analyze
      if (ocrData.product_items && Array.isArray(ocrData.product_items) && ocrData.product_items.length > 0) {
        console.log(`📦 Analyzing ${ocrData.product_items.length} product items for strategic classification`);
        
        // Prepare product items for strategic detection
        const productItems = ocrData.product_items.map(product => ({
          description: product.description || product.item_description || 'Unknown product',
          hs_code: product.hs_code || product.hsCode || '',
          quantity: product.quantity || product.qty || '',
          unit_price: product.unit_price || product.unitPrice || '',
          line_total: product.line_total || product.lineTotal || '',
          raw_text: `${product.description || ''} HS:${product.hs_code || product.hsCode || ''}`
        }));
        
        console.log(`🔍 Running strategic detection on products:`, productItems.map(p => `${p.description} (${p.hs_code})`));
        
        // Run strategic detection using the correct method
        await strategicEngine.processShipment(shipmentId, productItems);
        
        console.log(`✅ Strategic detection completed for shipment: ${shipmentId}`);
      } else {
        console.log(`⚠️ No product items found for strategic analysis in shipment: ${shipmentId}`);
      }
    } catch (strategicError) {
      console.error('❌ Error in strategic detection:', strategicError);
      // Don't fail the entire request if strategic detection fails
    }
    
    // Step 10: Return success response
    res.json({
      success: true,
      message: 'Commercial Invoice successfully processed',
      data: {
        shipment_id: shipmentId,
        document_id: documentId,
        destination: destination,
        file_path: finalFilePath,
        classification: {
          document_type: 'Commercial Invoice',
          confidence: classificationResult.confidence,
          verification_method: classificationResult.used_llm ? 'AI + Heuristics' : 'Heuristics',
          reason: classificationResult.reason
        },
        extracted_fields: ocrData,
        next_steps: [
          'Review extracted information for accuracy',
          'Upload any additional required documents',
          'Submit order for processing'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing invoice upload:', error);
    
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process invoice upload',
      details: error.message
    });
  }
});

// GET /api/invoice-detection/:shipmentId - Get shipment details
// POST endpoint for chatbot queries without document upload
router.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    console.log(`🤖 Processing chatbot query: "${query}"`);
    
    // Classify the intent
    const intentResult = await classifyIntent(query);
    console.log(`🎯 Intent classified as: ${intentResult.intent}`);
    
    if (isExportIntent(intentResult.intent)) {
      return res.json({
        success: true,
        type: 'export_intent_detected',
        intent_classification: intentResult,
        message: 'I detected that you want to process an export order. Please upload a Commercial Invoice document to proceed.',
        instructions: [
          'Upload a Commercial Invoice (PDF format)',
          'Include your export intent in the form',
          'I will validate the document and process your order'
        ]
      });
    }
    
    try {
      // Use RAG chatbot for non-export queries
      const { answer, sources } = await answerFromRAG(query, pool);
      
      return res.json({
        success: true,
        type: 'chatbot_response',
        intent_classification: intentResult,
        query: query,
        answer: answer,
        sources: sources || []
      });
      
    } catch (ragError) {
      console.error('❌ RAG chatbot error:', ragError);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to process your query',
        details: ragError.message,
        fallback_message: 'Please try rephrasing your question or contact support for assistance.'
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing chatbot query:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET endpoint to retrieve shipment details
router.get('/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;
    
    // Get shipment and document details
    const result = await pool.query(`
      SELECT 
        s.shipment_id,
        s.destination_country,
        s.step1_status as status,
        s.created_at,
        d.original_filename as filename,
        d.file_path,
        d.document_type,
        d.confidence_score as confidence,
        d.ocr_results as extracted_fields,
        d.processed_at as processing_date
      FROM shipments s
      LEFT JOIN uploaded_documents d ON s.shipment_id = d.shipment_id
      WHERE s.shipment_id = $1
    `, [shipmentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }
    
    const orderData = result.rows[0];
    
    res.json({
      success: true,
      data: {
        shipment_id: orderData.shipment_id,
        destination: orderData.destination_country,
        status: orderData.status,
        created_at: orderData.created_at,
        document: {
          filename: orderData.filename,
          file_path: orderData.file_path,
          type: orderData.document_type,
          confidence: orderData.confidence,
          processing_date: orderData.processing_date
        },
        extracted_fields: orderData.extracted_fields
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment details'
    });
  }
});

export default router;

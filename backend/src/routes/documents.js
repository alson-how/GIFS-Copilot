import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import DocumentParser from '../services/documentParser.js';

const router = express.Router();
const documentParser = new DocumentParser();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files at once
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF and image files
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/bmp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

/**
 * POST /api/documents/upload
 * Upload and process documents with OCR extraction
 */
router.post('/upload', upload.array('documents', 5), async (req, res) => {
  try {
    console.log(`📤 Processing ${req.files?.length || 0} uploaded documents`);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please upload at least one document file'
      });
    }
    
    const { shipment_id } = req.body;
    const results = [];
    const errors = [];
    
    // Process each uploaded file
    for (const file of req.files) {
      try {
        console.log(`🔍 Processing file: ${file.originalname}`);
        
        // Parse document using OCR service
        const parseResult = await documentParser.parseDocument(
          file.buffer,
          file.mimetype,
          file.originalname
        );
        
        // Generate unique document ID
        const documentId = uuidv4();
        
        // Store document processing result in database
        const documentRecord = await storeDocumentRecord({
          documentId,
          shipmentId: shipment_id || null,
          filename: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          parseResult
        });
        
        results.push({
          documentId,
          filename: file.originalname,
          documentType: parseResult.documentType,
          confidence: parseResult.confidence,
          extractionMethod: parseResult.extractionMethod,
          extractedFields: parseResult.extractedFields,
          validationFlags: parseResult.extractedFields._validationFlags || [],
          processingDate: parseResult.processingDate
        });
        
        console.log(`✅ Successfully processed: ${file.originalname} as ${parseResult.documentType}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${file.originalname}:`, error.message);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }
    
    // Perform cross-validation if multiple documents
    let crossValidation = null;
    if (results.length > 1) {
      try {
        crossValidation = documentParser.crossValidateDocuments(results);
        console.log(`🔍 Cross-validation completed: ${crossValidation.consistent ? 'PASS' : 'CONFLICTS FOUND'}`);
      } catch (error) {
        console.error('❌ Cross-validation error:', error.message);
      }
    }
    
    // Generate field suggestions for auto-fill
    const fieldSuggestions = generateFieldSuggestions(results);
    
    const response = {
      success: true,
      processedFiles: results.length,
      totalFiles: req.files.length,
      documents: results,
      errors: errors.length > 0 ? errors : undefined,
      crossValidation,
      fieldSuggestions,
      processingTime: new Date().toISOString()
    };
    
    console.log(`🎉 Document processing complete: ${results.length}/${req.files.length} successful`);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Document upload error:', error.message);
    res.status(500).json({
      error: 'Document processing failed',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/extract/:id
 * Get document extraction results by ID
 */
router.get('/extract/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        document_id,
        shipment_id,
        filename,
        file_size,
        mime_type,
        document_type,
        confidence,
        extraction_method,
        extracted_fields,
        raw_text,
        processing_date,
        created_at
      FROM document_extractions 
      WHERE document_id = $1
    `;
    
    const result = await req.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Document not found',
        message: `No document found with ID: ${id}`
      });
    }
    
    const document = result.rows[0];
    
    res.json({
      success: true,
      document: {
        documentId: document.document_id,
        shipmentId: document.shipment_id,
        filename: document.filename,
        fileSize: document.file_size,
        mimeType: document.mime_type,
        documentType: document.document_type,
        confidence: document.confidence,
        extractionMethod: document.extraction_method,
        extractedFields: document.extracted_fields,
        processingDate: document.processing_date,
        createdAt: document.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Document retrieval error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve document',
      message: error.message
    });
  }
});

/**
 * GET /api/documents/shipment/:shipmentId
 * Get all documents for a specific shipment
 */
router.get('/shipment/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;
    
    const query = `
      SELECT 
        document_id,
        filename,
        document_type,
        confidence,
        extraction_method,
        extracted_fields,
        processing_date,
        created_at
      FROM document_extractions 
      WHERE shipment_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await req.db.query(query, [shipmentId]);
    
    const documents = result.rows.map(doc => ({
      documentId: doc.document_id,
      filename: doc.filename,
      documentType: doc.document_type,
      confidence: doc.confidence,
      extractionMethod: doc.extraction_method,
      extractedFields: doc.extracted_fields,
      processingDate: doc.processing_date,
      createdAt: doc.created_at
    }));
    
    // Generate cross-validation if multiple documents
    let crossValidation = null;
    if (documents.length > 1) {
      crossValidation = documentParser.crossValidateDocuments(documents);
    }
    
    res.json({
      success: true,
      shipmentId,
      documentCount: documents.length,
      documents,
      crossValidation
    });
    
  } catch (error) {
    console.error('❌ Shipment documents retrieval error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve shipment documents',
      message: error.message
    });
  }
});

/**
 * POST /api/documents/auto-fill/:shipmentId
 * Generate auto-fill suggestions based on processed documents
 */
router.post('/auto-fill/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;
    
    // Get all documents for the shipment
    const query = `
      SELECT extracted_fields, document_type, confidence
      FROM document_extractions 
      WHERE shipment_id = $1
      ORDER BY confidence DESC
    `;
    
    const result = await req.db.query(query, [shipmentId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No documents found',
        message: `No processed documents found for shipment: ${shipmentId}`
      });
    }
    
    const documents = result.rows;
    const fieldSuggestions = generateFieldSuggestions(documents);
    
    res.json({
      success: true,
      shipmentId,
      documentCount: documents.length,
      fieldSuggestions,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Auto-fill generation error:', error.message);
    res.status(500).json({
      error: 'Failed to generate auto-fill suggestions',
      message: error.message
    });
  }
});

/**
 * Store document processing result in database
 * @param {Object} data - Document data to store
 * @returns {Promise<Object>} Stored document record
 */
async function storeDocumentRecord(data) {
  const {
    documentId,
    shipmentId,
    filename,
    fileSize,
    mimeType,
    parseResult
  } = data;
  
  const query = `
    INSERT INTO document_extractions (
      document_id,
      shipment_id,
      filename,
      file_size,
      mime_type,
      document_type,
      confidence,
      extraction_method,
      extracted_fields,
      raw_text,
      processing_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  
  const values = [
    documentId,
    shipmentId,
    filename,
    fileSize,
    mimeType,
    parseResult.documentType,
    parseResult.confidence,
    parseResult.extractionMethod,
    JSON.stringify(parseResult.extractedFields),
    parseResult.rawText,
    parseResult.processingDate
  ];
  
  const result = await req.db.query(query, values);
  return result.rows[0];
}

/**
 * Generate field suggestions for auto-fill based on processed documents
 * @param {Array} documents - Array of processed documents
 * @returns {Object} Field suggestions with confidence scores
 */
function generateFieldSuggestions(documents) {
  const fieldSuggestions = {};
  const fieldSources = {};
  
  // Define field priority by document type
  const documentPriority = {
    'Commercial Invoice': 1,
    'Bill of Lading': 2,
    'Certificate of Origin': 3,
    'Packing List': 4,
    'Insurance Certificate': 5,
    'Import Permit': 6,
    'Letter of Credit': 7,
    'Delivery Order': 8,
    'Technical Documentation': 9
  };
  
  // Collect all field values with their sources
  for (const doc of documents) {
    const fields = doc.extractedFields || {};
    const docType = doc.documentType;
    const docConfidence = doc.confidence || 0;
    const priority = documentPriority[docType] || 10;
    
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      if (fieldName.startsWith('_') || !fieldValue) continue; // Skip metadata fields
      
      if (!fieldSources[fieldName]) {
        fieldSources[fieldName] = [];
      }
      
      fieldSources[fieldName].push({
        value: fieldValue,
        source: docType,
        confidence: docConfidence,
        priority
      });
    }
  }
  
  // Select best value for each field
  for (const [fieldName, sources] of Object.entries(fieldSources)) {
    // Sort by priority (lower is better) and confidence (higher is better)
    sources.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    });
    
    const bestSource = sources[0];
    const allValues = [...new Set(sources.map(s => s.value))];
    
    fieldSuggestions[fieldName] = {
      value: bestSource.value,
      confidence: bestSource.confidence,
      source: bestSource.source,
      alternatives: allValues.length > 1 ? allValues.slice(1) : [],
      consistent: allValues.length === 1
    };
  }
  
  return fieldSuggestions;
}

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 5 files allowed per upload'
      });
    }
  }
  
  if (error.message.includes('Unsupported file type')) {
    return res.status(400).json({
      error: 'Unsupported file type',
      message: 'Only PDF and image files (JPEG, PNG, TIFF, BMP) are supported'
    });
  }
  
  console.error('❌ Document route error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred during document processing'
  });
});

export default router;

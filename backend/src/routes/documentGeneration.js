import express from 'express';
import path from 'path';
import fs from 'fs';
import DocumentGenerationService from '../services/documentGenerationService.js';

const router = express.Router();
const documentService = new DocumentGenerationService();

/**
 * POST /api/document-generation/generate
 * Generate all shipping documents from commercial invoice data
 */
router.post('/generate', async (req, res) => {
  try {
    const { shipmentId, invoiceData } = req.body;

    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        error: 'Shipment ID is required'
      });
    }

    if (!invoiceData) {
      return res.status(400).json({
        success: false,
        error: 'Invoice data is required'
      });
    }

    console.log(`📋 Starting document generation for shipment: ${shipmentId}`);

    // Generate all documents
    const results = await documentService.generateAllDocuments(shipmentId, invoiceData);

    // Update database with generated document paths
    await updateShipmentDocuments(req.db, shipmentId, results.documents);

    return res.json({
      success: true,
      message: 'Documents generated successfully',
      data: {
        shipmentId,
        generatedDocuments: Object.keys(results.documents).length,
        documents: results.documents,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('❌ Error in document generation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate documents',
      details: error.message
    });
  }
});

/**
 * GET /api/document-generation/:shipmentId
 * Get generated documents for a shipment
 */
router.get('/:shipmentId', async (req, res) => {
  try {
    const { shipmentId } = req.params;

    const query = `
      SELECT 
        shipment_id,
        packing_list_path,
        booking_confirmation_path,
        customs_declaration_path,
        bill_of_lading_path,
        documents_generated_at
      FROM shipments 
      WHERE shipment_id = $1
    `;

    const result = await req.db.query(query, [shipmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    const shipment = result.rows[0];
    const documents = {
      packingList: shipment.packing_list_path,
      bookingConfirmation: shipment.booking_confirmation_path,
      customsDeclaration: shipment.customs_declaration_path,
      billOfLading: shipment.bill_of_lading_path,
      generatedAt: shipment.documents_generated_at
    };

    return res.json({
      success: true,
      data: {
        shipmentId,
        documents,
        hasDocuments: Object.values(documents).some(path => path !== null)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching generated documents:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch documents',
      details: error.message
    });
  }
});

/**
 * POST /api/document-generation/regenerate
 * Regenerate specific documents
 */
router.post('/regenerate', async (req, res) => {
  try {
    const { shipmentId, documentTypes, invoiceData } = req.body;

    if (!shipmentId || !documentTypes || !Array.isArray(documentTypes)) {
      return res.status(400).json({
        success: false,
        error: 'Shipment ID and document types array are required'
      });
    }

    console.log(`🔄 Regenerating documents for shipment: ${shipmentId}`, documentTypes);

    const results = {
      shipmentId,
      documents: {},
      errors: []
    };

    // Generate only requested document types
    for (const docType of documentTypes) {
      try {
        let generatedDoc;
        switch (docType) {
          case 'packingList':
            generatedDoc = await documentService.generatePackingList(invoiceData);
            break;
          case 'bookingConfirmation':
            generatedDoc = await documentService.generateBookingConfirmation(invoiceData);
            break;
          case 'customsDeclaration':
            generatedDoc = await documentService.generateCustomsDeclaration(invoiceData);
            break;
          case 'billOfLading':
            generatedDoc = await documentService.generateBillOfLading(invoiceData);
            break;
          default:
            results.errors.push({ document: docType, error: 'Unknown document type' });
            continue;
        }

        // Save PDF
        const shipmentDir = path.join(documentService.documentsDir, shipmentId);
        const filePath = await documentService.savePDF(shipmentDir, docType, generatedDoc);
        
        results.documents[docType] = {
          status: 'success',
          filePath,
          data: generatedDoc
        };

      } catch (error) {
        results.errors.push({ document: docType, error: error.message });
      }
    }

    // Update database
    await updateShipmentDocuments(req.db, shipmentId, results.documents);

    return res.json({
      success: true,
      message: 'Documents regenerated successfully',
      data: results
    });

  } catch (error) {
    console.error('❌ Error regenerating documents:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to regenerate documents',
      details: error.message
    });
  }
});

/**
 * Helper function to update shipment with document paths
 */
async function updateShipmentDocuments(db, shipmentId, documents) {
  try {
    const updateFields = [];
    const values = [shipmentId];
    let paramIndex = 2;

    if (documents.packingList?.filePath) {
      updateFields.push(`packing_list_path = $${paramIndex++}`);
      values.push(documents.packingList.filePath);
    }

    if (documents.bookingConfirmation?.filePath) {
      updateFields.push(`booking_confirmation_path = $${paramIndex++}`);
      values.push(documents.bookingConfirmation.filePath);
    }

    if (documents.customsDeclaration?.filePath) {
      updateFields.push(`customs_declaration_path = $${paramIndex++}`);
      values.push(documents.customsDeclaration.filePath);
    }

    if (documents.billOfLading?.filePath) {
      updateFields.push(`bill_of_lading_path = $${paramIndex++}`);
      values.push(documents.billOfLading.filePath);
    }

    if (updateFields.length > 0) {
      updateFields.push(`documents_generated_at = CURRENT_TIMESTAMP`);
      
      const query = `
        UPDATE shipments 
        SET ${updateFields.join(', ')}
        WHERE shipment_id = $1
      `;

      await db.query(query, values);
      console.log(`✅ Updated shipment ${shipmentId} with document paths`);
    }

  } catch (error) {
    console.error('❌ Error updating shipment documents:', error);
    throw error;
  }
}

/**
 * GET /api/document-generation/download/:shipmentId/:documentType
 * Download a specific generated document
 */
router.get('/download/:shipmentId/:documentType', async (req, res) => {
  try {
    const { shipmentId, documentType } = req.params;
    
    // Map document types to file name patterns
    const documentMap = {
      'packing_list': 'packing-list',
      'booking_confirmation': 'booking-confirmation', 
      'customs_declaration': 'customs-declaration',
      'bill_of_lading': 'bill-of-lading'
    };
    
    const filePrefix = documentMap[documentType];
    if (!filePrefix) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document type'
      });
    }
    
    // Find the actual file with timestamp suffix
    const shipmentDir = path.join(process.cwd(), 'generated-documents', shipmentId);
    
    if (!fs.existsSync(shipmentDir)) {
      return res.status(404).json({
        success: false,
        error: 'Shipment directory not found'
      });
    }
    
    // Find file that starts with the prefix
    const files = fs.readdirSync(shipmentDir);
    const matchingFile = files.find(file => file.startsWith(filePrefix) && file.endsWith('.pdf'));
    
    if (!matchingFile) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const filePath = path.join(shipmentDir, matchingFile);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${matchingFile}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error downloading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document'
    });
  }
});

export default router;

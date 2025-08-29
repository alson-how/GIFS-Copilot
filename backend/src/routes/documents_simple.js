import express from 'express';

const router = express.Router();

/**
 * POST /api/documents/upload
 * Simple OCR endpoint that returns mock data for now
 */
router.post('/upload', async (req, res) => {
  try {
    console.log('Documents upload endpoint hit');
    
    // Enhanced mock OCR response with realistic Commercial Invoice data
    const mockOCRResponse = {
      success: true,
      message: 'OCR processing complete - Commercial Invoice detected',
      documentType: 'Commercial Invoice',
      confidence: 0.92,
      fieldSuggestions: {
        commercial_value: '125750',
        currency: 'USD',
        quantity: '2750',
        quantity_unit: 'PCS',
        consignee_name: 'TechCorp Electronics Sdn Bhd',
        incoterms: 'FOB',
        technology_origin: 'Malaysia',
        hs_code: '85423110',
        end_use_purpose: 'Industrial Automation Equipment',
        // Enhanced mock table data with realistic invoice structure
        invoice_table: {
          headers: ['Item Index', 'Product Description', 'HS Code', 'Quantity', 'Unit', 'Unit Price', 'Unit Total', 'Line Total'],
          rows: [
            ['001', 'Advanced Microprocessor Units - ARM Cortex-M4 32-bit', '85423110', '1000', 'PCS', '45.50', '45500.00', '45500.00'],
            ['002', 'Digital Signal Processing ICs - 16-bit DSP', '85423120', '750', 'PCS', '62.80', '47100.00', '47100.00'],
            ['003', 'Memory Controller ICs - DDR4 SDRAM', '85423130', '500', 'PCS', '38.25', '19125.00', '19125.00'],
            ['004', 'Power Management ICs - Voltage Regulators', '85423140', '500', 'PCS', '28.50', '14250.00', '14250.00']
          ]
        },
        product_items: [
          {
            row_number: 1,
            item_number: '001',
            description: 'Advanced Microprocessor Units - ARM Cortex-M4 32-bit',
            quantity: '1000',
            unit: 'PCS',
            unit_price: '45.50',
            total_amount: '45500.00',
            line_total: '45500.00',
            hs_code: '85423110',
            origin: 'Malaysia'
          },
          {
            row_number: 2,
            item_number: '002',
            description: 'Digital Signal Processing ICs - 16-bit DSP',
            quantity: '750',
            unit: 'PCS', 
            unit_price: '62.80',
            total_amount: '47100.00',
            line_total: '47100.00',
            hs_code: '85423120',
            origin: 'Malaysia'
          },
          {
            row_number: 3,
            item_number: '003',
            description: 'Memory Controller ICs - DDR4 SDRAM',
            quantity: '500',
            unit: 'PCS',
            unit_price: '38.25', 
            total_amount: '19125.00',
            line_total: '19125.00',
            hs_code: '85423130',
            origin: 'Malaysia'
          },
          {
            row_number: 4,
            item_number: '004',
            description: 'Power Management ICs - Voltage Regulators',
            quantity: '500',
            unit: 'PCS',
            unit_price: '28.50',
            total_amount: '14250.00',
            line_total: '14250.00',
            hs_code: '85423140',
            origin: 'Malaysia'
          }
        ]
      },
      documents: [
        {
          filename: 'commercial_invoice.pdf',
          documentType: 'Commercial Invoice',
          confidence: 92,
          pages: 2,
          extractedText: 'COMMERCIAL INVOICE\nInvoice No: INV-2024-001234\nDate: 2024-08-29\nExporter: Malaysian Semiconductor Ltd...'
        }
      ],
      extractedFiles: [
        {
          filename: 'commercial_invoice.pdf',
          type: 'Commercial Invoice',
          confidence: 0.92,
          pages: 2,
          extractedText: 'COMMERCIAL INVOICE\nInvoice No: INV-2024-001234\nDate: 2024-08-29\nExporter: Malaysian Semiconductor Ltd...'
        }
      ],
      processingTime: '2.3s',
      documentsProcessed: 1
    };

    res.json(mockOCRResponse);
  } catch (error) {
    console.error('Documents upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed'
    });
  }
});

/**
 * GET /api/documents/extract/:id
 * Get extraction results by ID
 */
router.get('/extract/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock response for now
    res.json({
      success: true,
      id,
      status: 'completed',
      results: {
        documentType: 'Commercial Invoice',
        confidence: 0.85,
        extractedFields: {
          commercial_value: '50000',
          currency: 'USD',
          quantity: '1000'
        }
      }
    });
  } catch (error) {
    console.error('Documents extract error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get extraction results'
    });
  }
});

export default router;

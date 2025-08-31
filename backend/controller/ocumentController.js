import { Request, Response } from 'express';
import { OCRService } from '../services/ocrService';
import { OpenAIDocumentService } from '../services/openaiService';
import { PDFService } from '../services/pdfService';
import { DocumentValidator } from '../utils/validator';

export class DocumentController {
  private ocrService: OCRService;
  private aiService: OpenAIDocumentService;
  private pdfService: PDFService;
  private validator: DocumentValidator;

  constructor() {
    this.ocrService = new OCRService();
    this.aiService = new OpenAIDocumentService();
    this.pdfService = new PDFService();
    this.validator = new DocumentValidator();
  }

  async uploadAndExtract(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Extract data from uploaded file
      const extractedData = await this.ocrService.extractFromPDF(req.file.buffer);
      
      // Validate extracted data
      const validation = this.validator.validateInvoiceData(extractedData);
      
      res.json({
        success: true,
        data: extractedData,
        validation: validation
      });
    } catch (error) {
      console.error('Extraction error:', error);
      res.status(500).json({ 
        error: 'Failed to extract data from document',
        details: error.message 
      });
    }
  }

  async generateDocuments(req: Request, res: Response) {
    try {
      const { invoiceData, documentTypes } = req.body;
      
      if (!invoiceData) {
        return res.status(400).json({ error: 'Invoice data is required' });
      }

      const documents = {};
      const errors = [];

      // Initialize PDF service
      await this.pdfService.initialize();

      // Generate requested documents
      for (const docType of documentTypes) {
        try {
          let generatedData;
          
          switch (docType) {
            case 'packingList':
              generatedData = await this.aiService.generatePackingList(invoiceData);
              break;
            case 'bookingConfirmation':
              generatedData = await this.aiService.generateBookingConfirmation(invoiceData);
              break;
            case 'customsDeclaration':
              generatedData = await this.aiService.generateCustomsDeclaration(invoiceData);
              break;
            case 'billOfLading':
              generatedData = await this.aiService.generateBillOfLading(invoiceData);
              break;
            default:
              throw new Error(`Unknown document type: ${docType}`);
          }
          
          // Generate PDF
          const pdf = await this.pdfService.generatePDF(docType, generatedData);
          
          documents[docType] = {
            data: generatedData,
            pdf: pdf.toString('base64')
          };
        } catch (error) {
          errors.push({
            documentType: docType,
            error: error.message
          });
        }
      }

      // Validate consistency across documents
      if (Object.keys(documents).length > 1) {
        const consistency = await this.aiService.validateConsistency(
          Object.fromEntries(
            Object.entries(documents).map(([key, value]) => [key, value.data])
          )
        );
        
        if (!consistency.isConsistent) {
          return res.json({
            success: true,
            documents: documents,
            warnings: consistency.discrepancies,
            errors: errors
          });
        }
      }

      // Cleanup
      await this.pdfService.cleanup();

      res.json({
        success: true,
        documents: documents,
        errors: errors.length > 0 ? errors : null
      });
    } catch (error) {
      console.error('Document generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate documents',
        details: error.message 
      });
    }
  }

  async regenerateDocument(req: Request, res: Response) {
    try {
      const { documentType, documentData, modifications } = req.body;
      
      // Apply modifications to document data
      const modifiedData = { ...documentData, ...modifications };
      
      // Regenerate PDF
      await this.pdfService.initialize();
      const pdf = await this.pdfService.generatePDF(documentType, modifiedData);
      await this.pdfService.cleanup();
      
      res.json({
        success: true,
        data: modifiedData,
        pdf: pdf.toString('base64')
      });
    } catch (error) {
      console.error('Regeneration error:', error);
      res.status(500).json({ 
        error: 'Failed to regenerate document',
        details: error.message 
      });
    }
  }

  async validateDocument(req: Request, res: Response) {
    try {
      const { documentType, documentData } = req.body;
      
      let validation;
      switch (documentType) {
        case 'packingList':
          validation = this.validator.validatePackingList(documentData);
          break;
        case 'bookingConfirmation':
          validation = this.validator.validateBookingConfirmation(documentData);
          break;
        case 'customsDeclaration':
          validation = this.validator.validateCustomsDeclaration(documentData);
          break;
        case 'billOfLading':
          validation = this.validator.validateBillOfLading(documentData);
          break;
        default:
          throw new Error(`Unknown document type: ${documentType}`);
      }
      
      res.json({
        success: true,
        validation: validation
      });
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({ 
        error: 'Failed to validate document',
        details: error.message 
      });
    }
  }
}
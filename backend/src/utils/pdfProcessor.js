import pdf from 'pdf-parse';
import fs from 'fs';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

/**
 * PDF Processing Utility
 * Handles PDF text extraction and OCR for scanned documents
 */

class PDFProcessor {
  constructor() {
    this.tesseractOptions = {
      logger: m => console.log(m), // Optional logging
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:/()- $%',
    };
  }

  /**
   * Extract text from PDF using pdf-parse
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<{text: string, pages: number, metadata: object}>}
   */
  async extractTextFromPDF(pdfBuffer) {
    try {
      console.log('🔍 Extracting text from PDF...');
      const data = await pdf(pdfBuffer);
      
      return {
        text: data.text,
        pages: data.numpages,
        metadata: data.metadata || {},
        info: data.info || {}
      };
    } catch (error) {
      console.error('❌ PDF text extraction failed:', error.message);
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Convert PDF pages to images for OCR processing
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Buffer[]>} Array of image buffers
   */
  async convertPDFToImages(pdfBuffer) {
    try {
      // This is a simplified version - in production you'd use pdf-poppler or similar
      // For now, we'll handle image files directly
      console.log('📸 PDF to image conversion - using direct image processing');
      return [pdfBuffer]; // Fallback for image files
    } catch (error) {
      console.error('❌ PDF to image conversion failed:', error.message);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Perform OCR on image buffer using Tesseract.js
   * @param {Buffer} imageBuffer - Image file buffer
   * @returns {Promise<{text: string, confidence: number}>}
   */
  async performOCR(imageBuffer) {
    try {
      console.log('🔤 Performing OCR on image...');
      
      // Preprocess image for better OCR accuracy
      const processedImage = await this.preprocessImage(imageBuffer);
      
      const { data: { text, confidence } } = await Tesseract.recognize(
        processedImage,
        'eng',
        this.tesseractOptions
      );

      console.log(`✅ OCR completed with ${confidence}% confidence`);
      
      return {
        text: text.trim(),
        confidence: Math.round(confidence)
      };
    } catch (error) {
      console.error('❌ OCR processing failed:', error.message);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   * @param {Buffer} imageBuffer - Raw image buffer
   * @returns {Promise<Buffer>} Processed image buffer
   */
  async preprocessImage(imageBuffer) {
    try {
      // Enhance image quality for better OCR
      const processedBuffer = await sharp(imageBuffer)
        .resize(null, 2000, { // Scale up for better text recognition
          withoutEnlargement: false,
          kernel: sharp.kernel.cubic
        })
        .greyscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen text
        .png({ quality: 100 })
        .toBuffer();

      console.log('🖼️ Image preprocessing completed');
      return processedBuffer;
    } catch (error) {
      console.error('❌ Image preprocessing failed:', error.message);
      // Return original buffer if preprocessing fails
      return imageBuffer;
    }
  }

  /**
   * Process document file (PDF or image) and extract text
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} mimeType - File MIME type
   * @returns {Promise<{text: string, confidence: number, method: string}>}
   */
  async processDocument(fileBuffer, mimeType) {
    try {
      console.log(`📄 Processing document of type: ${mimeType}`);
      
      if (mimeType === 'application/pdf') {
        // Try PDF text extraction first
        const pdfResult = await this.extractTextFromPDF(fileBuffer);
        
        // If PDF has extractable text (not scanned), use it
        if (pdfResult.text && pdfResult.text.trim().length > 50) {
          console.log('✅ Using PDF text extraction');
          return {
            text: pdfResult.text,
            confidence: 95, // High confidence for native PDF text
            method: 'pdf-parse',
            pages: pdfResult.pages,
            metadata: pdfResult.metadata
          };
        }
        
        // If PDF is scanned/image-based, convert to images and OCR
        console.log('📸 PDF appears to be scanned, using OCR...');
        const images = await this.convertPDFToImages(fileBuffer);
        const ocrResults = [];
        
        for (const imageBuffer of images) {
          const ocrResult = await this.performOCR(imageBuffer);
          ocrResults.push(ocrResult);
        }
        
        // Combine OCR results from all pages
        const combinedText = ocrResults.map(r => r.text).join('\n\n');
        const avgConfidence = ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length;
        
        return {
          text: combinedText,
          confidence: Math.round(avgConfidence),
          method: 'ocr',
          pages: ocrResults.length
        };
      }
      
      // Handle image files directly
      if (mimeType.startsWith('image/')) {
        console.log('🖼️ Processing image file with OCR');
        const ocrResult = await this.performOCR(fileBuffer);
        
        return {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          method: 'ocr',
          pages: 1
        };
      }
      
      throw new Error(`Unsupported file type: ${mimeType}`);
      
    } catch (error) {
      console.error('❌ Document processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Clean and normalize extracted text
   * @param {string} rawText - Raw extracted text
   * @returns {string} Cleaned text
   */
  cleanText(rawText) {
    return rawText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }
}

export default PDFProcessor;

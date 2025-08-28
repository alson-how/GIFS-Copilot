import PDFProcessor from '../utils/pdfProcessor.js';

/**
 * Malaysian Customs Document Parser Service
 * Detects 9 document types and extracts relevant shipment data
 */

class DocumentParser {
  constructor() {
    this.pdfProcessor = new PDFProcessor();
    
    // Document type detection patterns
    this.documentPatterns = {
      'Commercial Invoice': {
        keywords: ['INVOICE', 'COMMERCIAL', 'PROFORMA', 'TAX INVOICE'],
        confidence: 0.8,
        priority: 1 // Primary data source
      },
      'Bill of Lading': {
        keywords: ['BILL OF LADING', 'B/L', 'OCEAN BILL', 'MASTER B/L', 'HOUSE B/L'],
        confidence: 0.9,
        priority: 2
      },
      'Packing List': {
        keywords: ['PACKING LIST', 'PACKING SLIP', 'CARTON LIST', 'SHIPPING LIST'],
        confidence: 0.8,
        priority: 3
      },
      'Certificate of Origin': {
        keywords: ['CERTIFICATE OF ORIGIN', 'ORIGIN CERTIFICATE', 'COO', 'FORM A'],
        confidence: 0.9,
        priority: 4
      },
      'Insurance Certificate': {
        keywords: ['INSURANCE', 'MARINE CARGO', 'CARGO INSURANCE', 'INSURANCE CERTIFICATE'],
        confidence: 0.8,
        priority: 5
      },
      'Import Permit': {
        keywords: ['STA', 'MITI', 'STRATEGIC', 'IMPORT PERMIT', 'STRATEGIC TRADE ACT'],
        confidence: 0.9,
        priority: 6
      },
      'Letter of Credit': {
        keywords: ['L/C', 'DOCUMENTARY CREDIT', 'LETTER OF CREDIT', 'IRREVOCABLE CREDIT'],
        confidence: 0.8,
        priority: 7
      },
      'Delivery Order': {
        keywords: ['DELIVERY ORDER', 'D/O', 'RELEASE ORDER', 'CARGO RELEASE'],
        confidence: 0.8,
        priority: 8
      },
      'Technical Documentation': {
        keywords: ['SPECIFICATION', 'DATASHEET', 'TECHNICAL SPEC', 'PRODUCT SPEC', 'MANUAL'],
        confidence: 0.7,
        priority: 9
      }
    };

    // Field extraction patterns
    this.fieldPatterns = {
      commercial_value: {
        patterns: [
          /(?:TOTAL|AMOUNT|VALUE|GRAND TOTAL|NET AMOUNT|INVOICE TOTAL)[\s:]*([A-Z]{3})?[\s$]*?([\d,]+\.?\d*)/gi,
          /(?:CIF|FOB|EXW)[\s:]*([A-Z]{3})?[\s$]*?([\d,]+\.?\d*)/gi,
          /(?:SUM INSURED|CREDIT AMOUNT)[\s:]*([A-Z]{3})?[\s$]*?([\d,]+\.?\d*)/gi
        ]
      },
      currency: {
        patterns: [
          /\b(USD|MYR|SGD|EUR|GBP|JPY|CNY)\b/gi,
          /(?:CURRENCY|CCY)[\s:]*([A-Z]{3})/gi
        ]
      },
      quantity: {
        patterns: [
          /(?:QTY|QUANTITY|PCS|PIECES|UNITS?)[\s:]*?([\d,]+\.?\d*)/gi,
          /(?:NET WEIGHT|GROSS WEIGHT)[\s:]*?([\d,]+\.?\d*)\s*(KG|LB|TON)/gi,
          /(?:CBM|M3|CUBIC)[\s:]*?([\d,]+\.?\d*)/gi,
          /(?:CARTONS?|CTNS?)[\s:]*?([\d,]+)/gi
        ]
      },
      quantity_unit: {
        patterns: [
          /\b(PCS|PIECES|KG|TONS?|CBM|M3|LB|UNITS?|CARTONS?|CTNS?)\b/gi
        ]
      },
      hs_code: {
        patterns: [
          /(?:HS CODE|HS|TARIFF|COMMODITY CODE)[\s:]*?(\d{4,10})/gi,
          /\b(\d{4}\.\d{2}\.\d{2})\b/g, // Standard HS format
          /\b(\d{6,10})\b(?=\s*[A-Z][a-z])/g // 6-10 digit codes before descriptions
        ]
      },
      consignee_name: {
        patterns: [
          /(?:CONSIGNEE|SOLD TO|SHIP TO|NOTIFY PARTY)[\s:]*\n?([^\n]+)/gi,
          /(?:END USER|BUYER)[\s:]*\n?([^\n]+)/gi
        ]
      },
      incoterms: {
        patterns: [
          /\b(FOB|CIF|EXW|DDP|DAP|FCA|CPT|CIP)\b/gi,
          /(?:TERMS?|INCOTERMS?)[\s:]*([A-Z]{3})/gi
        ]
      },
      technology_origin: {
        patterns: [
          /(?:COUNTRY OF ORIGIN|MADE IN|ORIGIN)[\s:]*([A-Z][A-Za-z\s]+)/gi,
          /(?:COO)[\s:]*([A-Z][A-Za-z\s]+)/gi
        ]
      },
      destination_country: {
        patterns: [
          /(?:PORT OF DISCHARGE|DESTINATION|COUNTRY OF DESTINATION)[\s:]*([A-Z][A-Za-z\s]+)/gi,
          /(?:CONSIGNED TO|DELIVERED TO)[\s:]*([A-Z][A-Za-z\s]+)/gi
        ]
      },
      transport_mode: {
        patterns: [
          /(?:VESSEL|SHIP|OCEAN|SEA)/gi, // → Sea
          /(?:FLIGHT|AIRLINE|AIR|AIRCRAFT)/gi, // → Air
          /(?:TRUCK|ROAD|LAND)/gi // → Land
        ]
      },
      target_export_date: {
        patterns: [
          /(?:LADEN ON BOARD|ETD|DEPARTURE|SHIPMENT DATE|LATEST SHIPMENT)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
          /(?:ARRIVAL DATE|ETA)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi
        ]
      },
      end_use_purpose: {
        patterns: [
          /(?:END USE|PURPOSE|APPLICATION|INTENDED USE)[\s:]*([^\n]+)/gi,
          /(?:FOR USE IN|USED FOR)[\s:]*([^\n]+)/gi
        ]
      },
      semiconductor_category: {
        patterns: [
          /(?:SEMICONDUCTOR|MICROCHIP|PROCESSOR|IC|INTEGRATED CIRCUIT)/gi,
          /(?:STRATEGIC|CONTROLLED|DUAL USE)/gi
        ]
      }
    };
  }

  /**
   * Process uploaded document and extract data
   * @param {Buffer} fileBuffer - Document file buffer
   * @param {string} mimeType - File MIME type
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Parsed document data
   */
  async parseDocument(fileBuffer, mimeType, filename) {
    try {
      console.log(`🔍 Parsing document: ${filename} (${mimeType})`);
      
      // Step 1: Extract text from document
      const extractionResult = await this.pdfProcessor.processDocument(fileBuffer, mimeType);
      const rawText = extractionResult.text;
      const cleanText = this.pdfProcessor.cleanText(rawText);
      
      console.log(`📄 Extracted ${cleanText.length} characters from document`);
      
      // Step 2: Detect document type
      const documentType = this.detectDocumentType(cleanText);
      
      // Step 3: Extract fields based on document type
      const extractedFields = this.extractFields(cleanText, documentType.type);
      
      // Step 4: Apply cross-validation rules
      const validatedFields = this.validateFields(extractedFields, documentType.type);
      
      const result = {
        filename,
        documentType: documentType.type,
        confidence: Math.min(documentType.confidence, extractionResult.confidence),
        extractionMethod: extractionResult.method,
        pages: extractionResult.pages || 1,
        extractedFields: validatedFields,
        rawText: cleanText,
        processingDate: new Date().toISOString()
      };
      
      console.log(`✅ Document parsed successfully: ${documentType.type} (${result.confidence}% confidence)`);
      return result;
      
    } catch (error) {
      console.error('❌ Document parsing failed:', error.message);
      throw new Error(`Document parsing failed: ${error.message}`);
    }
  }

  /**
   * Detect document type based on text content
   * @param {string} text - Document text content
   * @returns {Object} Document type and confidence
   */
  detectDocumentType(text) {
    const upperText = text.toUpperCase();
    let bestMatch = { type: 'Unknown', confidence: 0, priority: 999 };
    
    for (const [docType, config] of Object.entries(this.documentPatterns)) {
      let matchCount = 0;
      let totalKeywords = config.keywords.length;
      
      for (const keyword of config.keywords) {
        if (upperText.includes(keyword.toUpperCase())) {
          matchCount++;
        }
      }
      
      const matchRatio = matchCount / totalKeywords;
      const confidence = Math.round(matchRatio * config.confidence * 100);
      
      // Prioritize by confidence and document priority
      if (confidence > bestMatch.confidence || 
          (confidence === bestMatch.confidence && config.priority < bestMatch.priority)) {
        bestMatch = {
          type: docType,
          confidence,
          priority: config.priority,
          matchedKeywords: matchCount
        };
      }
    }
    
    console.log(`📋 Detected document type: ${bestMatch.type} (${bestMatch.confidence}% confidence)`);
    return bestMatch;
  }

  /**
   * Extract fields from text based on document type
   * @param {string} text - Document text
   * @param {string} documentType - Detected document type
   * @returns {Object} Extracted field values
   */
  extractFields(text, documentType) {
    const fields = {};
    
    // Apply field extraction patterns
    for (const [fieldName, config] of Object.entries(this.fieldPatterns)) {
      const values = this.extractFieldValue(text, config.patterns);
      if (values && values.length > 0) {
        fields[fieldName] = this.selectBestValue(values, fieldName);
      }
    }
    
    // Apply document-specific field mapping
    const mappedFields = this.mapFieldsByDocumentType(fields, documentType, text);
    
    console.log(`🔍 Extracted ${Object.keys(mappedFields).length} fields from ${documentType}`);
    return mappedFields;
  }

  /**
   * Extract field value using regex patterns
   * @param {string} text - Text to search
   * @param {Array} patterns - Regex patterns to try
   * @returns {Array} Found values
   */
  extractFieldValue(text, patterns) {
    const values = [];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] || match[2]) {
          values.push({
            value: match[2] || match[1],
            context: match[0],
            index: match.index
          });
        }
      }
    }
    
    return values;
  }

  /**
   * Select best value from multiple matches
   * @param {Array} values - Array of matched values
   * @param {string} fieldName - Field name for context
   * @returns {string} Best value
   */
  selectBestValue(values, fieldName) {
    if (!values || values.length === 0) return null;
    
    // For numeric fields, prefer larger values (likely totals)
    if (['commercial_value', 'quantity'].includes(fieldName)) {
      return values
        .map(v => ({ ...v, numeric: parseFloat(v.value.replace(/,/g, '')) }))
        .filter(v => !isNaN(v.numeric))
        .sort((a, b) => b.numeric - a.numeric)[0]?.value;
    }
    
    // For other fields, prefer first occurrence
    return values[0].value;
  }

  /**
   * Map fields based on document type specifics
   * @param {Object} fields - Extracted fields
   * @param {string} documentType - Document type
   * @param {string} text - Full text for context
   * @returns {Object} Mapped fields
   */
  mapFieldsByDocumentType(fields, documentType, text) {
    const mapped = { ...fields };
    
    switch (documentType) {
      case 'Commercial Invoice':
        // Primary source for commercial data
        if (!mapped.currency && mapped.commercial_value) {
          mapped.currency = 'USD'; // Default assumption
        }
        break;
        
      case 'Bill of Lading':
        // Map transport mode
        if (mapped.transport_mode) {
          if (mapped.transport_mode.match(/VESSEL|SHIP|OCEAN|SEA/i)) {
            mapped.transport_mode = 'Sea';
          } else if (mapped.transport_mode.match(/FLIGHT|AIRLINE|AIR/i)) {
            mapped.transport_mode = 'Air';
          } else if (mapped.transport_mode.match(/TRUCK|ROAD/i)) {
            mapped.transport_mode = 'Land';
          }
        }
        break;
        
      case 'Insurance Certificate':
        mapped.insurance_required = true;
        break;
        
      case 'Import Permit':
        // Extract strategic classifications
        if (text.match(/SEMICONDUCTOR|MICROCHIP|STRATEGIC/i)) {
          mapped.semiconductor_category = 'Strategic Technology';
        }
        break;
        
      case 'Technical Documentation':
        // Extract product specifications
        if (text.match(/SEMICONDUCTOR|IC|PROCESSOR/i)) {
          mapped.semiconductor_category = 'Semiconductor';
        }
        break;
    }
    
    return this.cleanFieldValues(mapped);
  }

  /**
   * Clean and normalize field values
   * @param {Object} fields - Raw field values
   * @returns {Object} Cleaned field values
   */
  cleanFieldValues(fields) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined) continue;
      
      let cleanValue = String(value).trim();
      
      // Clean numeric values
      if (['commercial_value', 'quantity'].includes(key)) {
        cleanValue = cleanValue.replace(/[,$]/g, '');
        const numeric = parseFloat(cleanValue);
        if (!isNaN(numeric) && numeric > 0) {
          cleaned[key] = numeric;
        }
      }
      // Clean currency codes
      else if (key === 'currency') {
        const currencyMatch = cleanValue.match(/\b(USD|MYR|SGD|EUR|GBP|JPY|CNY)\b/i);
        if (currencyMatch) {
          cleaned[key] = currencyMatch[1].toUpperCase();
        }
      }
      // Clean country names
      else if (key.includes('country') || key.includes('origin')) {
        cleaned[key] = cleanValue
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      // Clean other text fields
      else if (cleanValue.length > 0 && cleanValue.length < 200) {
        cleaned[key] = cleanValue;
      }
    }
    
    return cleaned;
  }

  /**
   * Validate extracted fields using cross-validation rules
   * @param {Object} fields - Extracted fields
   * @param {string} documentType - Document type
   * @returns {Object} Validated fields with flags
   */
  validateFields(fields, documentType) {
    const validated = { ...fields };
    const validationFlags = [];
    
    // Commercial value validation
    if (validated.commercial_value) {
      if (validated.commercial_value < 0) {
        validationFlags.push('NEGATIVE_VALUE');
        delete validated.commercial_value;
      } else if (validated.commercial_value > 10000000) {
        validationFlags.push('UNUSUALLY_HIGH_VALUE');
      }
    }
    
    // Quantity validation
    if (validated.quantity) {
      if (validated.quantity <= 0) {
        validationFlags.push('INVALID_QUANTITY');
        delete validated.quantity;
      }
    }
    
    // Date validation
    if (validated.target_export_date) {
      const exportDate = new Date(validated.target_export_date);
      const now = new Date();
      if (exportDate < new Date(now.getFullYear() - 1, 0, 1)) {
        validationFlags.push('OLD_EXPORT_DATE');
      }
    }
    
    // Currency consistency
    if (validated.commercial_value && !validated.currency) {
      validated.currency = 'USD'; // Default assumption
      validationFlags.push('ASSUMED_CURRENCY_USD');
    }
    
    validated._validationFlags = validationFlags;
    validated._documentType = documentType;
    
    return validated;
  }

  /**
   * Cross-validate fields across multiple documents
   * @param {Array} documents - Array of parsed documents
   * @returns {Object} Cross-validation results
   */
  crossValidateDocuments(documents) {
    const crossValidation = {
      consistent: true,
      conflicts: [],
      recommendations: []
    };
    
    // Group documents by type
    const docsByType = documents.reduce((acc, doc) => {
      acc[doc.documentType] = acc[doc.documentType] || [];
      acc[doc.documentType].push(doc);
      return acc;
    }, {});
    
    // Check commercial value consistency
    const commercialValues = documents
      .map(doc => doc.extractedFields.commercial_value)
      .filter(val => val !== undefined);
    
    if (commercialValues.length > 1) {
      const uniqueValues = [...new Set(commercialValues)];
      if (uniqueValues.length > 1) {
        crossValidation.consistent = false;
        crossValidation.conflicts.push({
          field: 'commercial_value',
          values: uniqueValues,
          message: 'Commercial values differ across documents'
        });
      }
    }
    
    // Check consignee name consistency
    const consigneeNames = documents
      .map(doc => doc.extractedFields.consignee_name)
      .filter(name => name !== undefined);
    
    if (consigneeNames.length > 1) {
      const uniqueNames = [...new Set(consigneeNames)];
      if (uniqueNames.length > 1) {
        crossValidation.consistent = false;
        crossValidation.conflicts.push({
          field: 'consignee_name',
          values: uniqueNames,
          message: 'Consignee names differ across documents'
        });
      }
    }
    
    return crossValidation;
  }
}

export default DocumentParser;

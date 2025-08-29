// Comprehensive End-User Security Screening API
// Enhanced Step 2 with multiple watchlist checks and risk assessment

import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/screening-documents/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG allowed.'));
    }
  }
});

/**
 * POST /api/comprehensive-screening/initialize
 * Initialize comprehensive screening from Step 1 shipment data
 */
router.post('/initialize', async (req, res) => {
  const { shipment_id } = req.body;
  
  if (!shipment_id) {
    return res.status(400).json({ error: 'Shipment ID required' });
  }

  try {
    // Get shipment data from Step 1
    const shipmentResult = await req.db.query(
      'SELECT * FROM shipments WHERE shipment_id = $1',
      [shipment_id]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const shipment = shipmentResult.rows[0];

    // Check if screening already exists
    const existingResult = await req.db.query(
      'SELECT * FROM screenings WHERE shipment_id = $1',
      [shipment_id]
    );

    if (existingResult.rows.length > 0) {
      return res.json({ 
        success: true, 
        screening: existingResult.rows[0],
        message: 'Screening already exists for this shipment'
      });
    }

    // Auto-populate initial screening data from shipment
    const initialScreening = {
      shipment_id,
      company_name: shipment.end_user_name || '',
      country: shipment.destination_country || '',
      shipment_value: shipment.commercial_value || 0,
      product_categories: [shipment.product_type] || ['unknown'],
      end_use_declaration: '',
      end_use_location: shipment.destination_country || '',
      customer_relationship: 'new',
      // Initialize risk scores to neutral (5)
      geographic_risk_score: calculateGeographicRisk(shipment.destination_country),
      product_risk_score: calculateProductRisk(shipment.product_type),
      end_user_risk_score: 5, // Default, will be updated based on screening
      transaction_risk_score: calculateTransactionRisk(shipment.commercial_value)
    };

    res.json({ 
      success: true, 
      initialData: initialScreening,
      shipmentData: shipment
    });

  } catch (error) {
    console.error('Error initializing comprehensive screening:', error);
    res.status(500).json({ error: 'Failed to initialize screening' });
  }
});

/**
 * POST /api/comprehensive-screening/save
 * Save comprehensive screening data
 */
router.post('/save', async (req, res) => {
  const screeningData = req.body;
  
  // Validate required fields
  const requiredFields = [
    'shipment_id', 'end_user_registration_number', 'business_type', 'company_name',
    'street_address_1', 'city', 'postal_code', 'country',
    'primary_contact_name', 'primary_contact_email', 'primary_contact_phone',
    'shipment_value', 'product_categories', 'end_use_declaration', 'end_use_location'
  ];

  const missingFields = requiredFields.filter(field => !screeningData[field]);
  if (missingFields.length > 0) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      missingFields 
    });
  }

  // Validate end-use declaration length
  if (screeningData.end_use_declaration.length < 20) {
    return res.status(400).json({ 
      error: 'End-use declaration must be at least 20 characters' 
    });
  }

  try {
    // Determine if enhanced due diligence is required
    const overallRisk = (
      screeningData.geographic_risk_score + 
      screeningData.product_risk_score + 
      screeningData.end_user_risk_score + 
      screeningData.transaction_risk_score
    ) / 4;

    const enhancedDDRequired = overallRisk >= 7 || 
                              screeningData.shipment_value > 50000 ||
                              isStrategicProduct(screeningData.product_categories);

    const manualReviewRequired = overallRisk >= 8 || 
                                screeningData.shipment_value > 100000 ||
                                isHighRiskCountry(screeningData.country);

    // Insert or update screening
    const upsertQuery = `
      INSERT INTO screenings (
        shipment_id, end_user_registration_number, business_type, company_name, company_name_local,
        street_address_1, street_address_2, city, state_province, postal_code, country,
        primary_contact_name, primary_contact_title, primary_contact_email, primary_contact_phone,
        secondary_contact_name, secondary_contact_email, website_url,
        shipment_value, product_categories, end_use_declaration, end_use_location,
        intended_recipients, transaction_frequency, customer_relationship, previous_transaction_count,
        geographic_risk_score, geographic_risk_notes, product_risk_score, product_risk_notes,
        end_user_risk_score, end_user_risk_notes, transaction_risk_score, transaction_risk_notes,
        enhanced_dd_required, manual_review_required,
        screening_status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
        $35, $36, $37, $38
      )
      ON CONFLICT (screening_id) DO UPDATE SET
        end_user_registration_number = EXCLUDED.end_user_registration_number,
        business_type = EXCLUDED.business_type,
        company_name = EXCLUDED.company_name,
        company_name_local = EXCLUDED.company_name_local,
        street_address_1 = EXCLUDED.street_address_1,
        street_address_2 = EXCLUDED.street_address_2,
        city = EXCLUDED.city,
        state_province = EXCLUDED.state_province,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        primary_contact_name = EXCLUDED.primary_contact_name,
        primary_contact_title = EXCLUDED.primary_contact_title,
        primary_contact_email = EXCLUDED.primary_contact_email,
        primary_contact_phone = EXCLUDED.primary_contact_phone,
        secondary_contact_name = EXCLUDED.secondary_contact_name,
        secondary_contact_email = EXCLUDED.secondary_contact_email,
        website_url = EXCLUDED.website_url,
        shipment_value = EXCLUDED.shipment_value,
        product_categories = EXCLUDED.product_categories,
        end_use_declaration = EXCLUDED.end_use_declaration,
        end_use_location = EXCLUDED.end_use_location,
        intended_recipients = EXCLUDED.intended_recipients,
        transaction_frequency = EXCLUDED.transaction_frequency,
        customer_relationship = EXCLUDED.customer_relationship,
        previous_transaction_count = EXCLUDED.previous_transaction_count,
        geographic_risk_score = EXCLUDED.geographic_risk_score,
        geographic_risk_notes = EXCLUDED.geographic_risk_notes,
        product_risk_score = EXCLUDED.product_risk_score,
        product_risk_notes = EXCLUDED.product_risk_notes,
        end_user_risk_score = EXCLUDED.end_user_risk_score,
        end_user_risk_notes = EXCLUDED.end_user_risk_notes,
        transaction_risk_score = EXCLUDED.transaction_risk_score,
        transaction_risk_notes = EXCLUDED.transaction_risk_notes,
        enhanced_dd_required = EXCLUDED.enhanced_dd_required,
        manual_review_required = EXCLUDED.manual_review_required,
        updated_at = NOW()
      RETURNING screening_id, overall_risk_score`;

    const params = [
      screeningData.shipment_id,
      screeningData.end_user_registration_number,
      screeningData.business_type,
      screeningData.company_name,
      screeningData.company_name_local || null,
      screeningData.street_address_1,
      screeningData.street_address_2 || null,
      screeningData.city,
      screeningData.state_province || null,
      screeningData.postal_code,
      screeningData.country,
      screeningData.primary_contact_name,
      screeningData.primary_contact_title || null,
      screeningData.primary_contact_email,
      screeningData.primary_contact_phone,
      screeningData.secondary_contact_name || null,
      screeningData.secondary_contact_email || null,
      screeningData.website_url || null,
      screeningData.shipment_value,
      screeningData.product_categories,
      screeningData.end_use_declaration,
      screeningData.end_use_location,
      screeningData.intended_recipients || null,
      screeningData.transaction_frequency || 'one-time',
      screeningData.customer_relationship || 'new',
      screeningData.previous_transaction_count || 0,
      screeningData.geographic_risk_score,
      screeningData.geographic_risk_notes || null,
      screeningData.product_risk_score,
      screeningData.product_risk_notes || null,
      screeningData.end_user_risk_score,
      screeningData.end_user_risk_notes || null,
      screeningData.transaction_risk_score,
      screeningData.transaction_risk_notes || null,
      enhancedDDRequired,
      manualReviewRequired,
      manualReviewRequired ? 'in_review' : 'pending',
      'user'
    ];

    const result = await req.db.query(upsertQuery, params);
    
    res.json({ 
      success: true, 
      screening_id: result.rows[0].screening_id,
      overall_risk_score: result.rows[0].overall_risk_score,
      enhanced_dd_required: enhancedDDRequired,
      manual_review_required: manualReviewRequired
    });

  } catch (error) {
    console.error('Error saving comprehensive screening:', error);
    res.status(500).json({ error: 'Failed to save screening data' });
  }
});

/**
 * POST /api/comprehensive-screening/screen-lists
 * Perform comprehensive screening against multiple watchlists
 */
router.post('/screen-lists', async (req, res) => {
  const { screening_id, company_name, country } = req.body;

  if (!screening_id || !company_name) {
    return res.status(400).json({ error: 'Screening ID and company name required' });
  }

  try {
    const screeningLists = [
      'entity_list',
      'sdn_list', 
      'unverified_list',
      'military_end_user',
      'eu_consolidated',
      'un_sanctions',
      'bis_denied_persons'
    ];

    const screeningResults = [];

    for (const listName of screeningLists) {
      const startTime = Date.now();
      
      // Simulate screening API calls (replace with actual API integrations)
      const screeningResult = await performListScreening(listName, company_name, country);
      
      const processingTime = Date.now() - startTime;

      // Save screening result
      const insertResult = await req.db.query(`
        INSERT INTO screening_list_results (
          screening_id, list_name, match_found, match_confidence, 
          match_details, matched_entity_name, matched_entity_country,
          matched_entity_type, match_reason, list_version,
          api_response, processing_time_ms, screening_service
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING result_id`,
        [
          screening_id,
          listName,
          screeningResult.match_found,
          screeningResult.match_confidence,
          JSON.stringify(screeningResult.match_details),
          screeningResult.matched_entity_name,
          screeningResult.matched_entity_country,
          screeningResult.matched_entity_type,
          screeningResult.match_reason,
          screeningResult.list_version,
          JSON.stringify(screeningResult.api_response),
          processingTime,
          'internal'
        ]
      );

      screeningResults.push({
        list_name: listName,
        result_id: insertResult.rows[0].result_id,
        ...screeningResult
      });
    }

    // Update screening status based on results
    const hasMatches = screeningResults.some(result => result.match_found);
    const newStatus = hasMatches ? 'requires_enhanced_dd' : 'pending';

    await req.db.query(
      'UPDATE screenings SET screening_status = $1 WHERE screening_id = $2',
      [newStatus, screening_id]
    );

    res.json({ 
      success: true, 
      results: screeningResults,
      has_matches: hasMatches,
      status: newStatus
    });

  } catch (error) {
    console.error('Error performing list screening:', error);
    res.status(500).json({ error: 'Failed to perform screening checks' });
  }
});

/**
 * POST /api/comprehensive-screening/upload-document
 * Upload screening documents
 */
router.post('/upload-document', upload.single('document'), async (req, res) => {
  const { screening_id, document_type, document_date, expiry_date, issuing_authority, document_number } = req.body;

  if (!screening_id || !document_type || !req.file) {
    return res.status(400).json({ error: 'Screening ID, document type, and file required' });
  }

  try {
    const result = await req.db.query(`
      INSERT INTO screening_documents (
        screening_id, document_type, document_name, file_path, 
        file_size, mime_type, document_date, expiry_date,
        issuing_authority, document_number, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING document_id`,
      [
        screening_id,
        document_type,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        document_date || null,
        expiry_date || null,
        issuing_authority || null,
        document_number || null,
        'user'
      ]
    );

    res.json({ 
      success: true, 
      document_id: result.rows[0].document_id,
      filename: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * GET /api/comprehensive-screening/:screening_id
 * Get comprehensive screening data
 */
router.get('/:screening_id', async (req, res) => {
  const { screening_id } = req.params;

  try {
    // Get screening data
    const screeningResult = await req.db.query(
      'SELECT * FROM screenings WHERE screening_id = $1',
      [screening_id]
    );

    if (screeningResult.rows.length === 0) {
      return res.status(404).json({ error: 'Screening not found' });
    }

    // Get screening list results
    const listResults = await req.db.query(
      'SELECT * FROM screening_list_results WHERE screening_id = $1 ORDER BY screening_date DESC',
      [screening_id]
    );

    // Get documents
    const documents = await req.db.query(
      'SELECT * FROM screening_documents WHERE screening_id = $1 ORDER BY uploaded_at DESC',
      [screening_id]
    );

    res.json({
      success: true,
      screening: screeningResult.rows[0],
      list_results: listResults.rows,
      documents: documents.rows
    });

  } catch (error) {
    console.error('Error fetching screening data:', error);
    res.status(500).json({ error: 'Failed to fetch screening data' });
  }
});

// Helper Functions

function calculateGeographicRisk(country) {
  // Simplified risk scoring based on country
  const highRiskCountries = ['Iran', 'North Korea', 'Syria', 'Cuba', 'Russia', 'Belarus'];
  const mediumRiskCountries = ['China', 'Venezuela', 'Myanmar', 'Sudan'];
  
  if (highRiskCountries.includes(country)) return 9;
  if (mediumRiskCountries.includes(country)) return 6;
  return 3; // Low risk
}

function calculateProductRisk(productType) {
  // Simplified risk scoring based on product type
  const strategicProducts = ['semiconductors', 'encryption', 'military', 'dual_use'];
  const controlledProducts = ['electronics', 'software', 'chemicals'];
  
  if (strategicProducts.some(type => productType?.toLowerCase().includes(type))) return 8;
  if (controlledProducts.some(type => productType?.toLowerCase().includes(type))) return 5;
  return 2; // Low risk
}

function calculateTransactionRisk(value) {
  // Risk scoring based on transaction value
  if (value > 1000000) return 8; // High value
  if (value > 100000) return 6;   // Medium-high value
  if (value > 10000) return 4;    // Medium value
  return 2; // Low value
}

function isStrategicProduct(categories) {
  const strategic = ['semiconductors', 'encryption', 'military', 'dual_use', 'ai_chips'];
  return categories.some(cat => strategic.includes(cat.toLowerCase()));
}

function isHighRiskCountry(country) {
  const highRisk = ['Iran', 'North Korea', 'Syria', 'Cuba', 'Russia', 'Belarus', 'China'];
  return highRisk.includes(country);
}

async function performListScreening(listName, companyName, country) {
  // Simulate screening API calls
  // In production, replace with actual API integrations to screening services
  
  const simulatedDelay = Math.random() * 1000 + 500; // 500-1500ms
  await new Promise(resolve => setTimeout(resolve, simulatedDelay));

  // Simulate some matches for testing
  const shouldMatch = Math.random() < 0.1; // 10% chance of match for testing
  
  if (shouldMatch) {
    return {
      match_found: true,
      match_confidence: 0.85,
      match_details: {
        similarity_score: 0.85,
        matching_fields: ['company_name', 'country']
      },
      matched_entity_name: companyName + ' (Similar)',
      matched_entity_country: country,
      matched_entity_type: 'Company',
      match_reason: 'Name similarity and location match',
      list_version: '2024.01',
      api_response: {
        status: 'success',
        query: companyName,
        results_count: 1
      }
    };
  }

  return {
    match_found: false,
    match_confidence: 0.0,
    match_details: null,
    matched_entity_name: null,
    matched_entity_country: null,
    matched_entity_type: null,
    match_reason: null,
    list_version: '2024.01',
    api_response: {
      status: 'success',
      query: companyName,
      results_count: 0
    }
  };
}

export default router;

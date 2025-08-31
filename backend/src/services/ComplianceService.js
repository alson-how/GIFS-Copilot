/**
 * Compliance Service
 * Business logic for compliance and screening operations
 */

import { BaseService } from './BaseService.js';
import { 
  ComplianceRepository, 
  AiChipControlRepository, 
  EndUserScreeningRepository, 
  DocumentsRepository 
} from '../repositories/ComplianceRepository.js';
import { validator } from '../utils/validation.js';
import { NotFoundError, BusinessError, ExternalServiceError } from '../utils/errors.js';
import { extractFromLLM } from './extractor.js';
import { normalizeExtraction, loadTaxonomy } from './normalizer.js';
import { runScreening } from '../providers/screening.js';
import { config } from '../config/app.js';

export class ComplianceService extends BaseService {
  constructor(
    complianceRepository = null,
    aiChipRepository = null,
    screeningRepository = null,
    documentsRepository = null
  ) {
    super(complianceRepository || new ComplianceRepository(), 'ComplianceService');
    this.aiChipRepository = aiChipRepository || new AiChipControlRepository();
    this.screeningRepository = screeningRepository || new EndUserScreeningRepository();
    this.documentsRepository = documentsRepository || new DocumentsRepository();
    
    // Load taxonomy for normalization
    this.taxonomy = this.loadTaxonomyData();
  }

  /**
   * Load taxonomy data
   * @returns {Object} Taxonomy data
   */
  loadTaxonomyData() {
    try {
      return loadTaxonomy(new URL('../services/taxonomy.json', import.meta.url).pathname);
    } catch (error) {
      this.logError('loadTaxonomyData', error);
      return {}; // Fallback to empty taxonomy
    }
  }

  /**
   * Perform STA (Strategic Trade Authorization) screening
   * @param {Object} screeningData - STA screening data
   * @returns {Object} Screening result
   */
  async performStaScreening(screeningData) {
    return this.executeOperation('performStaScreening', async () => {
      // Validate input
      const validatedData = validator.validate('compliance.staScreening', screeningData);
      
      const { shipment_id, hs_code, product_type, tech_origin, notes } = validatedData;
      
      // Perform LLM extraction for better classification
      const extractionQuery = `HS:${hs_code} product:${product_type} origin:${tech_origin}`;
      const extraction = await this.performLLMExtraction(extractionQuery);
      
      // Normalize extraction results
      const normalized = normalizeExtraction(extraction, this.taxonomy, extractionQuery);
      
      // Determine if item is strategic
      const isStrategic = this.determineStrategicStatus(normalized, tech_origin);
      
      // Store compliance record
      const complianceData = {
        shipment_id,
        hs_code,
        product_type,
        tech_origin,
        is_strategic: isStrategic,
        extraction_json: normalized,
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await this.repository.upsert(complianceData, 'shipment_id');
      
      this.logSuccess('performStaScreening', { 
        shipmentId: shipment_id, 
        isStrategic, 
        hsCode: hs_code 
      });
      
      return result;
    }, { shipmentId: screeningData.shipment_id });
  }

  /**
   * Process AI chip control requirements
   * @param {Object} aiChipData - AI chip control data
   * @returns {Object} Processing result
   */
  async processAiChipControl(aiChipData) {
    return this.executeOperation('processAiChipControl', async () => {
      // Validate input
      const validatedData = validator.validate('compliance.aiChip', aiChipData);
      
      // Add timestamps
      const now = new Date().toISOString();
      validatedData.created_at = now;
      validatedData.updated_at = now;
      
      // Store AI chip control data
      const result = await this.aiChipRepository.upsert(validatedData, 'shipment_id');
      
      // Check compliance status
      const complianceStatus = this.assessAiChipCompliance(validatedData);
      
      this.logSuccess('processAiChipControl', { 
        shipmentId: validatedData.shipment_id,
        complianceStatus: complianceStatus.status
      });
      
      return {
        ...result,
        complianceStatus
      };
    }, { shipmentId: aiChipData.shipment_id });
  }

  /**
   * Perform end user screening
   * @param {Object} screeningData - End user screening data
   * @returns {Object} Screening result
   */
  async performEndUserScreening(screeningData) {
    return this.executeOperation('performEndUserScreening', async () => {
      // Validate input
      const validatedData = validator.validate('compliance.screening', screeningData);
      
      const { shipment_id, destination_country, end_user_name } = validatedData;
      
      // Perform screening via external provider
      const screeningResult = await this.callScreeningProvider({
        destination_country,
        end_user_name
      });
      
      // Store screening result
      const screeningRecord = {
        shipment_id,
        destination_country,
        end_user_name,
        screen_result: screeningResult.screen_result,
        evidence: screeningResult.evidence,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await this.screeningRepository.upsert(screeningRecord, 'shipment_id');
      
      this.logSuccess('performEndUserScreening', { 
        shipmentId: shipment_id,
        result: screeningResult.screen_result,
        country: destination_country
      });
      
      return result;
    }, { shipmentId: screeningData.shipment_id });
  }

  /**
   * Process documents and classification
   * @param {Object} documentsData - Documents data
   * @returns {Object} Processing result
   */
  async processDocuments(documentsData) {
    return this.executeOperation('processDocuments', async () => {
      // Validate input
      const validatedData = validator.validate('compliance.documents', documentsData);
      
      // Add timestamps
      const now = new Date().toISOString();
      validatedData.created_at = now;
      validatedData.updated_at = now;
      
      // Ensure permit_refs is an array
      if (!validatedData.permit_refs) {
        validatedData.permit_refs = [];
      }
      
      // Store documents data
      const result = await this.documentsRepository.upsert(validatedData, 'shipment_id');
      
      // Assess document readiness
      const readinessStatus = this.assessDocumentReadiness(validatedData);
      
      this.logSuccess('processDocuments', { 
        shipmentId: validatedData.shipment_id,
        hsValidated: validatedData.hs_validated,
        k2Ready: validatedData.k2_ready
      });
      
      return {
        ...result,
        readinessStatus
      };
    }, { shipmentId: documentsData.shipment_id });
  }

  /**
   * Get complete compliance data for shipment
   * @param {string} shipmentId - Shipment ID
   * @returns {Object} Complete compliance data
   */
  async getComplianceData(shipmentId) {
    return this.executeOperation('getComplianceData', async () => {
      const compliance = await this.repository.findCompleteByShipmentId(shipmentId);
      
      if (!compliance) {
        throw new NotFoundError('Compliance data', shipmentId);
      }
      
      // Add computed fields
      compliance.overall_status = this.computeOverallComplianceStatus(compliance);
      compliance.risk_level = this.computeRiskLevel(compliance);
      compliance.required_actions = this.getRequiredActions(compliance);
      
      this.logSuccess('getComplianceData', { shipmentId });
      return compliance;
    }, { shipmentId });
  }

  /**
   * Get compliance statistics
   * @returns {Object} Compliance statistics
   */
  async getStatistics() {
    return this.executeOperation('getStatistics', async () => {
      const [complianceStats, screeningStats] = await Promise.all([
        this.repository.getStatistics(),
        this.getScreeningStatistics()
      ]);
      
      const result = {
        compliance: complianceStats,
        screening: screeningStats,
        summary: {
          totalRecords: complianceStats.total_records,
          strategicItems: complianceStats.strategic_count,
          riskPercentage: complianceStats.total_records > 0 
            ? Math.round((complianceStats.strategic_count / complianceStats.total_records) * 100)
            : 0
        }
      };
      
      this.logSuccess('getStatistics', result.summary);
      return result;
    });
  }

  /**
   * Perform LLM extraction with error handling
   * @param {string} query - Extraction query
   * @returns {Object} Extraction result
   * @private
   */
  async performLLMExtraction(query) {
    try {
      return await extractFromLLM(query);
    } catch (error) {
      this.logError('performLLMExtraction', error, { query });
      
      // Return fallback extraction
      return {
        intent: "POLICY_HELP",
        cargo_category: null,
        specialization: [],
        constraints: { mode: null, origin: null, destination: null, regulatory_help: false },
        language: "en"
      };
    }
  }

  /**
   * Call screening provider with error handling
   * @param {Object} screeningData - Screening data
   * @returns {Object} Screening result
   * @private
   */
  async callScreeningProvider(screeningData) {
    try {
      return await runScreening(screeningData);
    } catch (error) {
      this.logError('callScreeningProvider', error, screeningData);
      
      // Return fallback result
      return {
        screen_result: 'error',
        evidence: `Screening service error: ${error.message}`
      };
    }
  }

  /**
   * Determine if item is strategic based on extraction and origin
   * @param {Object} normalized - Normalized extraction
   * @param {string} techOrigin - Technology origin
   * @returns {boolean} True if strategic
   * @private
   */
  determineStrategicStatus(normalized, techOrigin) {
    // Check for AI accelerator specialization
    const hasAiSpecialization = normalized.specialization?.includes('ai_accelerator') || false;
    
    // Check for strategic origins
    const strategicOrigins = ['us_origin', 'eu_origin'];
    const hasStrategicOrigin = strategicOrigins.includes(techOrigin);
    
    // Check for strategic keywords in the cargo category
    const strategicCategories = ['semiconductor', 'defense', 'military'];
    const hasStrategicCategory = strategicCategories.includes(normalized.cargo_category);
    
    return hasAiSpecialization || hasStrategicOrigin || hasStrategicCategory;
  }

  /**
   * Assess AI chip compliance status
   * @param {Object} aiChipData - AI chip data
   * @returns {Object} Compliance status
   * @private
   */
  assessAiChipCompliance(aiChipData) {
    const issues = [];
    
    if (!aiChipData.aica_done) {
      issues.push('AICA not completed');
    }
    
    if (!aiChipData.export_notice_30d) {
      issues.push('30-day export notice not filed');
    }
    
    if (aiChipData.reexport_license_needed === 'yes' && !aiChipData.reexport_license_number) {
      issues.push('Re-export license required but not provided');
    }
    
    if (aiChipData.sta_permit_ai && !aiChipData.sta_permit_ai_number) {
      issues.push('STA permit required but number not provided');
    }
    
    return {
      status: issues.length === 0 ? 'compliant' : 'non_compliant',
      issues,
      score: Math.max(0, 100 - (issues.length * 25))
    };
  }

  /**
   * Assess document readiness
   * @param {Object} documentsData - Documents data
   * @returns {Object} Readiness status
   * @private
   */
  assessDocumentReadiness(documentsData) {
    const issues = [];
    
    if (!documentsData.hs_validated) {
      issues.push('HS code not validated');
    }
    
    if (!documentsData.k2_ready) {
      issues.push('K2 form not ready');
    }
    
    if (!documentsData.pco_number) {
      issues.push('PCO number not provided');
    }
    
    return {
      status: issues.length === 0 ? 'ready' : 'pending',
      issues,
      completeness: Math.max(0, 100 - (issues.length * 33))
    };
  }

  /**
   * Compute overall compliance status
   * @param {Object} compliance - Complete compliance data
   * @returns {string} Overall status
   * @private
   */
  computeOverallComplianceStatus(compliance) {
    if (compliance.screen_result === 'potential_hit') {
      return 'blocked';
    }
    
    if (compliance.is_strategic && !compliance.aica_done) {
      return 'pending_review';
    }
    
    if (!compliance.hs_validated || !compliance.k2_ready) {
      return 'incomplete';
    }
    
    return 'compliant';
  }

  /**
   * Compute risk level
   * @param {Object} compliance - Complete compliance data
   * @returns {string} Risk level
   * @private
   */
  computeRiskLevel(compliance) {
    let riskScore = 0;
    
    if (compliance.is_strategic) riskScore += 3;
    if (compliance.screen_result === 'potential_hit') riskScore += 5;
    if (!compliance.hs_validated) riskScore += 1;
    if (compliance.reexport_license_needed === 'yes') riskScore += 2;
    
    if (riskScore >= 6) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Get required actions for compliance
   * @param {Object} compliance - Complete compliance data
   * @returns {Array} Required actions
   * @private
   */
  getRequiredActions(compliance) {
    const actions = [];
    
    if (compliance.screen_result === 'potential_hit') {
      actions.push({
        type: 'screening_review',
        priority: 'high',
        description: 'Review screening hit and determine action'
      });
    }
    
    if (compliance.is_strategic && !compliance.aica_done) {
      actions.push({
        type: 'aica_completion',
        priority: 'high',
        description: 'Complete AICA assessment'
      });
    }
    
    if (!compliance.hs_validated) {
      actions.push({
        type: 'hs_validation',
        priority: 'medium',
        description: 'Validate HS code classification'
      });
    }
    
    if (!compliance.k2_ready) {
      actions.push({
        type: 'k2_preparation',
        priority: 'medium',
        description: 'Prepare K2 documentation'
      });
    }
    
    return actions;
  }

  /**
   * Get screening statistics
   * @returns {Object} Screening statistics
   * @private
   */
  async getScreeningStatistics() {
    const result = await this.screeningRepository.rawQuery(`
      SELECT 
        COUNT(*) as total_screenings,
        COUNT(CASE WHEN screen_result = 'potential_hit' THEN 1 END) as hits_count,
        COUNT(CASE WHEN screen_result = 'yes_clear' THEN 1 END) as clear_count,
        COUNT(CASE WHEN screen_result = 'error' THEN 1 END) as error_count,
        COUNT(DISTINCT destination_country) as unique_countries
      FROM end_user_screening
    `);
    
    const stats = result.rows[0];
    
    // Convert to numbers
    Object.keys(stats).forEach(key => {
      stats[key] = parseInt(stats[key]) || 0;
    });
    
    return stats;
  }
}

// Export service instance
export const complianceService = new ComplianceService();

export default ComplianceService;
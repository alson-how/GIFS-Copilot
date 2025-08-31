/**
 * Strategic Items Service
 * Business logic for strategic items detection and compliance
 */

import { BaseService } from './BaseService.js';

export class StrategicItemsService extends BaseService {
  constructor(repository, database, logger) {
    super(repository, logger);
    this.database = database;
    
    // Strategic item patterns and keywords
    this.strategicPatterns = {
      semiconductors: {
        keywords: [
          'semiconductor', 'microprocessor', 'integrated circuit', 'IC', 'chip',
          'silicon wafer', 'processor', 'microcontroller', 'FPGA', 'ASIC',
          'memory chip', 'flash memory', 'DRAM', 'SRAM'
        ],
        codes: ['3A001', '3A002', '3A003'],
        riskLevel: 'high'
      },
      aiTechnology: {
        keywords: [
          'artificial intelligence', 'AI chip', 'machine learning', 'neural network',
          'AI processor', 'tensor processor', 'GPU', 'graphics processor',
          'deep learning', 'neural processing unit', 'NPU'
        ],
        codes: ['3A001.a.12', '4A003.c', '4A003.b'],
        riskLevel: 'critical'
      },
      quantumTechnology: {
        keywords: [
          'quantum', 'quantum computing', 'quantum processor', 'quantum chip',
          'quantum cryptography', 'quantum sensor', 'superconducting'
        ],
        codes: ['3A002.g', '5A002.a'],
        riskLevel: 'critical'
      },
      cybersecurity: {
        keywords: [
          'encryption', 'cryptographic', 'security processor', 'HSM',
          'hardware security module', 'crypto accelerator'
        ],
        codes: ['5A002', '5A004', '5D002'],
        riskLevel: 'high'
      },
      telecommunications: {
        keywords: [
          'telecommunications', 'telecom', 'radio frequency', 'RF',
          '5G equipment', 'base station', 'antenna', 'wireless'
        ],
        codes: ['5A001.b', '5A001.f'],
        riskLevel: 'medium'
      },
      sensors: {
        keywords: [
          'sensor', 'accelerometer', 'gyroscope', 'magnetometer',
          'pressure sensor', 'temperature sensor', 'optical sensor'
        ],
        codes: ['6A002', '6A003', '6A004'],
        riskLevel: 'medium'
      }
    };
    
    // High-risk HS codes
    this.strategicHsCodes = {
      '85423110': { category: 'semiconductors', riskLevel: 'high', description: 'Electronic integrated circuits' },
      '85423200': { category: 'semiconductors', riskLevel: 'high', description: 'Processors and controllers' },
      '85423300': { category: 'semiconductors', riskLevel: 'medium', description: 'Amplifiers' },
      '84717000': { category: 'processors', riskLevel: 'high', description: 'Computer processing units' },
      '85176200': { category: 'telecommunications', riskLevel: 'medium', description: 'Telecom equipment' },
      '90318000': { category: 'sensors', riskLevel: 'medium', description: 'Measuring instruments' }
    };
    
    // AI-specific keywords that trigger higher scrutiny
    this.aiKeywords = [
      'artificial intelligence', 'AI chip', 'machine learning chip', 'neural network processor',
      'tensor processing unit', 'TPU', 'AI accelerator', 'deep learning processor',
      'neural processing unit', 'NPU', 'AI inference', 'AI training'
    ];
    
    // Minimum confidence thresholds
    this.confidenceThresholds = {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
      critical: 0.9
    };
  }

  /**
   * Detect strategic items in product list
   * @param {string} shipmentId - Shipment ID
   * @param {Array} productItems - Array of product items
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Detection results
   */
  async detectStrategicItems(shipmentId, productItems, options = {}) {
    const { forceRedetection = false, includeMetadata = true } = options;
    
    this.logger.info('Starting strategic items detection', {
      shipmentId,
      productCount: productItems.length,
      forceRedetection
    });
    
    try {
      // Clear existing results if force redetection
      if (forceRedetection) {
        await this.repository.deleteByShipmentId(shipmentId);
      }
      
      const detectionResults = [];
      
      for (const [index, item] of productItems.entries()) {
        const result = await this.detectSingleItem(item, index, includeMetadata);
        result.shipment_id = shipmentId;
        detectionResults.push(result);
      }
      
      // Save results to database
      const savedResults = await this.repository.saveDetectionResults(shipmentId, detectionResults);
      
      // Get shipment summary
      const summary = await this.repository.getShipmentSummary(shipmentId);
      
      // Create audit trail
      await this.repository.createAuditTrail(shipmentId, 'STRATEGIC_DETECTION', {
        total_items: detectionResults.length,
        strategic_items: summary.strategic_items,
        blocked_items: summary.blocked_items,
        detection_engine_version: '2.0'
      });
      
      this.logger.info('Strategic items detection completed', {
        shipmentId,
        totalItems: detectionResults.length,
        strategicItems: summary.strategic_items,
        blockedItems: summary.blocked_items
      });
      
      return {
        shipment_id: shipmentId,
        detection_results: savedResults,
        summary: summary,
        processing_time: Date.now() - Date.now(), // Will be calculated properly in actual implementation
        detection_engine_version: '2.0'
      };
      
    } catch (error) {
      this.logger.error('Strategic items detection failed', {
        shipmentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Detect strategic classification for a single item
   * @param {Object} item - Product item
   * @param {number} index - Item index
   * @param {boolean} includeMetadata - Whether to include detection metadata
   * @returns {Promise<Object>} Detection result
   */
  async detectSingleItem(item, index, includeMetadata = true) {
    const description = (item.product_description || item.description || '').toLowerCase();
    const hsCode = item.hs_code || item.hsCode;
    
    const result = {
      item_id: item.item_id || item.id || `item_${index}`,
      item_description: item.product_description || item.description,
      hs_code: hsCode,
      strategic_codes: [],
      confidence_score: 0,
      final_confidence_score: 0,
      is_strategic: false,
      risk_level: 'low',
      export_blocked: false,
      required_permits: [],
      manual_review_required: false,
      detection_metadata: includeMetadata ? {} : null
    };
    
    const metadata = includeMetadata ? {
      detection_methods: [],
      matched_keywords: [],
      matched_patterns: [],
      confidence_breakdown: {}
    } : null;
    
    // 1. HS Code based detection
    if (hsCode && this.strategicHsCodes[hsCode]) {
      const hsMatch = this.strategicHsCodes[hsCode];
      result.strategic_codes.push(hsMatch.category);
      result.confidence_score = Math.max(result.confidence_score, 0.8);
      result.risk_level = hsMatch.riskLevel;
      
      if (includeMetadata) {
        metadata.detection_methods.push('hs_code_match');
        metadata.matched_patterns.push(`HS_${hsCode}`);
        metadata.confidence_breakdown.hs_code = 0.8;
      }
    }
    
    // 2. Keyword and pattern matching
    let keywordConfidence = 0;
    const matchedCategories = new Set();
    
    for (const [category, config] of Object.entries(this.strategicPatterns)) {
      const matches = config.keywords.filter(keyword => 
        description.includes(keyword.toLowerCase())
      );
      
      if (matches.length > 0) {
        matchedCategories.add(category);
        result.strategic_codes.push(...config.codes);
        
        // Calculate keyword confidence based on matches
        const categoryConfidence = Math.min(0.9, 0.3 + (matches.length * 0.2));
        keywordConfidence = Math.max(keywordConfidence, categoryConfidence);
        
        // Update risk level based on pattern risk
        if (this.getRiskLevelPriority(config.riskLevel) > this.getRiskLevelPriority(result.risk_level)) {
          result.risk_level = config.riskLevel;
        }
        
        if (includeMetadata) {
          metadata.detection_methods.push(`keyword_match_${category}`);
          metadata.matched_keywords.push(...matches);
          metadata.confidence_breakdown[`keyword_${category}`] = categoryConfidence;
        }
      }
    }
    
    result.confidence_score = Math.max(result.confidence_score, keywordConfidence);
    
    // 3. AI-specific detection
    const aiMatches = this.aiKeywords.filter(keyword => 
      description.includes(keyword.toLowerCase())
    );
    
    if (aiMatches.length > 0) {
      result.strategic_codes.push('AI_TECHNOLOGY');
      result.risk_level = 'critical';
      result.confidence_score = Math.max(result.confidence_score, 0.85);
      
      if (includeMetadata) {
        metadata.detection_methods.push('ai_keyword_match');
        metadata.matched_keywords.push(...aiMatches);
        metadata.confidence_breakdown.ai_keywords = 0.85;
      }
    }
    
    // 4. Calculate final confidence and determine strategic status
    result.final_confidence_score = this.calculateFinalConfidence(result.confidence_score, matchedCategories.size);
    result.is_strategic = result.final_confidence_score >= this.confidenceThresholds.medium;
    
    // 5. Determine export blocking and permits
    if (result.is_strategic) {
      result.export_blocked = this.shouldBlockExport(result);
      result.required_permits = this.getRequiredPermits(result);
      result.manual_review_required = this.requiresManualReview(result);
    }
    
    // 6. Deduplicate strategic codes
    result.strategic_codes = [...new Set(result.strategic_codes)];
    
    if (includeMetadata) {
      result.detection_metadata = metadata;
    }
    
    return result;
  }

  /**
   * Calculate final confidence score with bonuses for multiple matches
   * @param {number} baseConfidence - Base confidence score
   * @param {number} categoryCount - Number of matched categories
   * @returns {number} Final confidence score
   */
  calculateFinalConfidence(baseConfidence, categoryCount) {
    // Bonus for multiple category matches
    const categoryBonus = Math.min(0.2, categoryCount * 0.05);
    
    // Cap at 0.95 to allow room for manual adjustment
    return Math.min(0.95, baseConfidence + categoryBonus);
  }

  /**
   * Determine if export should be blocked
   * @param {Object} result - Detection result
   * @returns {boolean} Whether export should be blocked
   */
  shouldBlockExport(result) {
    // Block if critical risk or very high confidence
    if (result.risk_level === 'critical') return true;
    if (result.final_confidence_score >= this.confidenceThresholds.critical) return true;
    if (result.strategic_codes.includes('AI_TECHNOLOGY')) return true;
    
    return false;
  }

  /**
   * Get required permits for strategic item
   * @param {Object} result - Detection result
   * @returns {Array} Required permit types
   */
  getRequiredPermits(result) {
    const permits = [];
    
    if (result.strategic_codes.includes('AI_TECHNOLOGY')) {
      permits.push('AI_EXPORT_LICENSE', 'STRATEGIC_EXPORT_PERMIT');
    }
    
    if (result.risk_level === 'critical' || result.risk_level === 'high') {
      permits.push('STRATEGIC_EXPORT_PERMIT');
    }
    
    if (result.strategic_codes.some(code => code.startsWith('3A'))) {
      permits.push('ELECTRONICS_EXPORT_LICENSE');
    }
    
    if (result.strategic_codes.some(code => code.startsWith('5A'))) {
      permits.push('TELECOMMUNICATIONS_LICENSE');
    }
    
    return [...new Set(permits)];
  }

  /**
   * Determine if manual review is required
   * @param {Object} result - Detection result
   * @returns {boolean} Whether manual review is required
   */
  requiresManualReview(result) {
    // Require manual review for critical items
    if (result.risk_level === 'critical') return true;
    
    // Require manual review for AI technology
    if (result.strategic_codes.includes('AI_TECHNOLOGY')) return true;
    
    // Require manual review if confidence is in uncertain range
    if (result.final_confidence_score >= 0.4 && result.final_confidence_score < 0.8) return true;
    
    return false;
  }

  /**
   * Get risk level priority for comparison
   * @param {string} riskLevel - Risk level
   * @returns {number} Priority number (higher = more risk)
   */
  getRiskLevelPriority(riskLevel) {
    const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
    return priorities[riskLevel] || 0;
  }

  /**
   * Get shipment strategic status
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object>} Strategic status
   */
  async getShipmentStatus(shipmentId) {
    const results = await this.repository.getByShipmentId(shipmentId);
    const summary = await this.repository.getShipmentSummary(shipmentId);
    
    return {
      shipment_id: shipmentId,
      summary: summary,
      detection_results: results,
      compliance_status: this.determineComplianceStatus(summary),
      next_actions: this.getNextActions(summary)
    };
  }

  /**
   * Determine compliance status
   * @param {Object} summary - Shipment summary
   * @returns {string} Compliance status
   */
  determineComplianceStatus(summary) {
    if (summary.any_export_blocked) return 'BLOCKED';
    if (summary.items_requiring_review > 0) return 'PENDING_REVIEW';
    if (summary.strategic_items > 0) return 'REQUIRES_PERMITS';
    return 'COMPLIANT';
  }

  /**
   * Get next actions based on summary
   * @param {Object} summary - Shipment summary
   * @returns {Array} Next actions
   */
  getNextActions(summary) {
    const actions = [];
    
    if (summary.any_export_blocked) {
      actions.push({
        action: 'RESOLVE_EXPORT_BLOCKS',
        description: 'Resolve items blocking export',
        priority: 'critical'
      });
    }
    
    if (summary.items_requiring_review > 0) {
      actions.push({
        action: 'MANUAL_REVIEW',
        description: `${summary.items_requiring_review} items require manual review`,
        priority: 'high'
      });
    }
    
    if (summary.strategic_items > 0 && !summary.any_export_blocked) {
      actions.push({
        action: 'OBTAIN_PERMITS',
        description: 'Obtain required export permits',
        priority: 'medium'
      });
    }
    
    return actions;
  }

  /**
   * Update manual review status for an item
   * @param {string} resultId - Detection result ID
   * @param {boolean} requiresReview - Whether manual review is required
   * @param {string} reason - Reason for the change
   * @returns {Promise<Object>} Updated result
   */
  async updateManualReviewStatus(resultId, requiresReview, reason = null) {
    const result = await this.repository.updateManualReviewStatus(resultId, requiresReview, reason);
    
    this.logger.info('Manual review status updated', {
      resultId,
      requiresReview,
      reason
    });
    
    return result;
  }

  /**
   * Get items requiring manual review
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated review items
   */
  async getItemsRequiringReview(options = {}) {
    return await this.repository.getItemsRequiringReview(options);
  }

  /**
   * Get compliance statistics
   * @param {Object} filters - Date and other filters
   * @returns {Promise<Object>} Compliance statistics
   */
  async getComplianceStatistics(filters = {}) {
    const stats = await this.repository.getComplianceStatistics(filters);
    
    // Calculate additional metrics
    if (stats.total_items > 0) {
      stats.strategic_percentage = ((stats.strategic_items / stats.total_items) * 100).toFixed(2);
      stats.blocked_percentage = ((stats.blocked_items / stats.total_items) * 100).toFixed(2);
      stats.review_percentage = ((stats.items_requiring_review / stats.total_items) * 100).toFixed(2);
    } else {
      stats.strategic_percentage = '0.00';
      stats.blocked_percentage = '0.00';
      stats.review_percentage = '0.00';
    }
    
    return stats;
  }

  /**
   * Search detection results with complex criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Search results
   */
  async searchDetectionResults(criteria = {}, options = {}) {
    return await this.repository.searchDetectionResults(criteria, options);
  }

  /**
   * Reprocess strategic detection for a shipment
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object>} Reprocessing result
   */
  async reprocessShipment(shipmentId) {
    this.logger.info('Reprocessing strategic detection for shipment', { shipmentId });
    
    // Get original product items from shipment
    // This would need to be implemented based on your shipment data structure
    // For now, we'll return a placeholder
    
    throw new Error('Reprocessing requires access to original product items - not implemented');
  }

  /**
   * Validate export permissions for a shipment
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object>} Export validation result
   */
  async validateExportPermissions(shipmentId) {
    const summary = await this.repository.getShipmentSummary(shipmentId);
    const results = await this.repository.getByShipmentId(shipmentId);
    
    const validation = {
      shipment_id: shipmentId,
      is_export_approved: !summary.any_export_blocked,
      blocked_items_count: summary.blocked_items,
      required_permits: [],
      validation_warnings: [],
      validation_errors: []
    };
    
    // Collect all required permits
    const allPermits = new Set();
    results.forEach(result => {
      if (result.required_permits && Array.isArray(result.required_permits)) {
        result.required_permits.forEach(permit => allPermits.add(permit));
      }
    });
    
    validation.required_permits = Array.from(allPermits);
    
    // Add warnings and errors
    if (summary.items_requiring_review > 0) {
      validation.validation_warnings.push(`${summary.items_requiring_review} items require manual review`);
    }
    
    if (summary.blocked_items > 0) {
      validation.validation_errors.push(`${summary.blocked_items} items are blocked for export`);
    }
    
    return validation;
  }
}

export default StrategicItemsService;
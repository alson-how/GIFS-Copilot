/**
 * Quote Service
 * Business logic for quote management and generation
 */

import { QuoteRepository } from '../repositories/QuoteRepository.js';
import { ShipmentRepository } from '../repositories/ShipmentRepository.js';
import StatusTransitionService from './StatusTransitionService.js';
import { serviceLogger } from '../utils/logger.js';
import pkg from 'pg';
import AIQuoteGenerationService from './AIQuoteGenerationService.js';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export class QuoteService {
  constructor() {
    this.quoteRepo = new QuoteRepository();
    this.shipmentRepo = new ShipmentRepository();
    this.statusTransitionService = new StatusTransitionService();
  }

  /**
   * Generate AI-powered quote for a shipment
   * @param {number} shipmentId - Shipment ID
   * @param {number} adminId - Admin user ID
   * @param {Object} options - Quote generation options
   * @returns {Object} Generated AI quote with 3 options
   */
  async generateAIQuote(shipmentId, adminId, options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'generateAIQuote', { shipmentId, adminId });

      // Get shipment details
      const shipment = await this.shipmentRepo.findById(shipmentId);
      if (!shipment) {
        throw new Error(`Shipment ${shipmentId} not found`);
      }

      if (shipment.status !== 'PENDING_QUOTE') {
        throw new Error(`Shipment must be in PENDING_QUOTE status to generate quote. Current status: ${shipment.status}`);
      }

      // Prepare comprehensive shipment details for AI service
      const shipmentDetails = {
        origin: shipment.tech_origin || shipment.origin || 'Malaysia',
        destination: shipment.destination_country || shipment.destination || 'Singapore',
        weight: parseFloat(shipment.package_weight_kg) || parseFloat(shipment.quantity) || 1,
        dimensions: {
          length: parseFloat(shipment.package_length_cm) || 0,
          width: parseFloat(shipment.package_width_cm) || 0,
          height: parseFloat(shipment.package_height_cm) || 0
        },
        commodity: shipment.description || 'General Cargo',
        declaredValue: shipment.estimated_value || shipment.commercial_value || 1000,
        currency: shipment.currency || 'USD',
        transportationMode: shipment.mode || 'AIR',
        priority: shipment.shipment_priority || 'Standard',
        specialHandling: shipment.special_handling || [],
        isInternational: this.isInternationalShipment(shipment),
        incoterms: shipment.incoterms || 'EXW',
        insuranceRequired: shipment.insurance_required !== false,
        hasStrategicItems: shipment.has_strategic_items || false,
        hasAIChips: shipment.has_ai_chips || false,
        riskLevel: shipment.risk_level || 'low'
      };

      // Generate AI quote
      const aiQuoteResult = await AIQuoteGenerationService.generateQuote(shipmentDetails);
      
      if (!aiQuoteResult.success) {
        throw new Error(`AI quote generation failed: ${aiQuoteResult.error}`);
      }

      // Create quotation records for each AI-generated option
      const quotations = [];
      for (const aiQuote of aiQuoteResult.quotes) {
        const quotationData = {
          shipment_id: shipmentId,
          total_cost: aiQuote.total,
          currency: options.currency || 'USD',
          base_shipping_cost: aiQuote.details.baseRate,
          additional_fees: aiQuote.details.additionalFees,
          tax_amount: 0, // Set based on requirements
          valid_until: new Date(Date.now() + (options.validityHours || 72) * 60 * 60 * 1000),
          is_confirmed: false,
          quotation_method: 'AI_GENERATED',
          ai_model: 'gpt-4',
          ai_prompt_version: '1.0',
          ai_generation_metadata: aiQuoteResult.metadata,
          carrier: aiQuote.carrier,
          service_type: aiQuote.service,
          estimated_delivery_days: aiQuote.transitTime,
          quote_breakdown: {
            type: aiQuote.type,
            baseRate: aiQuote.details.baseRate,
            fuelSurcharge: aiQuote.details.fuelSurcharge,
            zoneAdjustment: aiQuote.details.zoneAdjustment,
            additionalFees: aiQuote.details.additionalFees,
            margin: aiQuote.details.margin,
            details: aiQuote.details
          },
          notes: `AI-generated ${aiQuote.type} option`,
          created_by: adminId
        };

        const quotation = await this.quoteRepo.createQuote(quotationData);
        quotations.push(quotation);
      }

      // Status will transition to QUOTED when a quotation is confirmed via the trigger

      serviceLogger.success(this.constructor.name, 'generateAIQuote', { 
        shipmentId, 
        quotationsGenerated: quotations.length 
      });

      return {
        success: true,
        quotations: quotations,
        aiAnalysis: aiQuoteResult.aiAnalysis,
        metadata: aiQuoteResult.metadata
      };

    } catch (error) {
      serviceLogger.error(this.constructor.name, 'generateAIQuote', error);
      throw error;
    }
  }

  /**
   * Confirm a quotation (mark it as the selected quote for the shipment)
   * @param {string} quotationId - Quotation UUID
   * @param {string} adminId - Admin user ID
   * @returns {Object} Confirmed quotation
   */
  async confirmQuotation(quotationId, adminId) {
    try {
      serviceLogger.start(this.constructor.name, 'confirmQuotation', { quotationId, adminId });

      const quotation = await this.quoteRepo.findById(quotationId);
      if (!quotation) {
        throw new Error(`Quotation ${quotationId} not found`);
      }

      if (new Date() > new Date(quotation.valid_until)) {
        throw new Error('Quotation has expired');
      }

      // Confirm the quotation (trigger will handle setting confirmed_quotation_id in shipments)
      const confirmedQuotation = await this.quoteRepo.confirmQuotation(quotationId);

      serviceLogger.success(this.constructor.name, 'confirmQuotation', { quotationId });
      return confirmedQuotation;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'confirmQuotation', error);
      throw error;
    }
  }

  /**
   * Get all quotations for a shipment
   * @param {string} shipmentId - Shipment ID
   * @returns {Array} Quotations for the shipment
   */
  async getQuotationsByShipmentId(shipmentId) {
    try {
      serviceLogger.start(this.constructor.name, 'getQuotationsByShipmentId', { shipmentId });

      const quotations = await this.quoteRepo.findByShipmentId(shipmentId);

      serviceLogger.success(this.constructor.name, 'getQuotationsByShipmentId', { 
        shipmentId, 
        count: quotations.length 
      });
      
      return quotations;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getQuotationsByShipmentId', error);
      throw error;
    }
  }

  /**
   * Check if shipment is international
   * @param {Object} shipment - Shipment data
   * @returns {boolean} Is international shipment
   */
  isInternationalShipment(shipment) {
    const origin = (shipment.tech_origin || shipment.origin || 'Malaysia').toLowerCase();
    const destination = (shipment.destination_country || shipment.destination || 'Singapore').toLowerCase();
    return origin !== destination;
  }

  /**
   * Generate quote for a shipment (legacy method)
   * @param {number} shipmentId - Shipment ID
   * @param {number} adminId - Admin user ID
   * @param {Object} options - Quote generation options
   * @returns {Object} Generated quote
   */
  async generateQuote(shipmentId, adminId, options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'generateQuote', { shipmentId, adminId });

      // Get shipment details
      const shipment = await this.shipmentRepo.findById(shipmentId);
      if (!shipment) {
        throw new Error(`Shipment ${shipmentId} not found`);
      }

      if (shipment.status !== 'PENDING_QUOTE') {
        throw new Error(`Shipment must be in PENDING_QUOTE status to generate quote. Current status: ${shipment.status}`);
      }

      // Calculate carrier rates
      const carrierRates = await this.calculateCarrierRates(shipment, options.selectedCarriers);

      // Calculate additional fees
      const additionalFees = this.calculateAdditionalFees(shipment, options);

      // Calculate base rate (lowest carrier rate)
      const baseRate = Math.min(...carrierRates.map(rate => rate.total_cost));

      // Apply margin
      const marginPercentage = options.marginPercentage || 15.0;
      const totalCost = (baseRate + (additionalFees.total || 0)) * (1 + marginPercentage / 100);

      // Create quotation
      const quotationData = {
        shipment_id: shipmentId,
        total_cost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
        currency: options.currency || 'USD',
        base_shipping_cost: baseRate,
        additional_fees: additionalFees.total || 0,
        tax_amount: 0, // Set based on requirements
        valid_until: new Date(Date.now() + (options.validityHours || 72) * 60 * 60 * 1000),
        is_confirmed: false,
        quotation_method: 'MANUAL',
        carrier: carrierRates.length > 0 ? carrierRates[0].carrier_name : 'Best Available',
        service_type: carrierRates.length > 0 ? carrierRates[0].service_type : 'Standard Service',
        estimated_delivery_days: carrierRates.length > 0 ? carrierRates[0].transit_days : 3,
        quote_breakdown: {
          carrierRates,
          baseRate,
          additionalFees,
          marginPercentage,
          calculationMethod: 'manual'
        },
        notes: options.notes,
        created_by: adminId
      };

      const quotation = await this.quoteRepo.createQuote(quotationData);

      // Status will transition to QUOTED when quotation is confirmed via trigger

      serviceLogger.success(this.constructor.name, 'generateQuote', { 
        quotationId: quotation.id, 
        quoteNumber: quotation.quote_number 
      });

      return quotation;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'generateQuote', error);
      throw error;
    }
  }

  /**
   * Calculate carrier rates for a shipment using database pricing
   * @param {Object} shipment - Shipment data
   * @param {Array} selectedCarriers - Optional array of selected carrier codes
   * @returns {Array} Carrier rate calculations
   */
  async calculateCarrierRates(shipment, selectedCarriers = null) {
    try {
      const weight = parseFloat(shipment.package_weight_kg) || parseFloat(shipment.quantity) || 1;
      const origin = shipment.tech_origin || shipment.origin || 'Malaysia';
      const destination = shipment.destination_country || shipment.destination || 'Singapore';
      
      serviceLogger.info('Calculating carrier rates', { 
        weight, 
        origin, 
        destination, 
        selectedCarriers 
      });

      let carrierFilter = '';
      const params = [origin, destination, weight, weight];

      if (selectedCarriers && selectedCarriers.length > 0) {
        const placeholders = selectedCarriers.map((_, index) => `$${5 + index}`).join(',');
        carrierFilter = `AND c.code IN (${placeholders})`;
        params.push(...selectedCarriers);
      }

      const ratesQuery = `
        SELECT 
          c.name as carrier_name,
          c.code as carrier_code,
          c.default_margin_percentage,
          cs.service_name,
          cs.service_code,
          cs.service_type,
          cs.transit_days_min,
          cs.transit_days_max,
          cp.rate_per_kg,
          cp.minimum_charge,
          cp.fuel_surcharge_percentage,
          cp.handling_fee,
          cp.currency,
          ($3 * cp.rate_per_kg) as weight_cost,
          GREATEST($4 * cp.rate_per_kg, cp.minimum_charge) as base_cost,
          (GREATEST($4 * cp.rate_per_kg, cp.minimum_charge) * cp.fuel_surcharge_percentage / 100) as fuel_surcharge,
          cp.handling_fee as handling_cost,
          (
            GREATEST($4 * cp.rate_per_kg, cp.minimum_charge) +
            (GREATEST($4 * cp.rate_per_kg, cp.minimum_charge) * cp.fuel_surcharge_percentage / 100) +
            cp.handling_fee
          ) as total_cost_before_margin
        FROM carriers c
        JOIN carrier_services cs ON c.carrier_id = cs.carrier_id
        JOIN carrier_pricing cp ON cs.service_id = cp.service_id
        WHERE cp.origin_country = $1 
          AND cp.destination_country = $2
          AND cp.weight_from_kg <= $3 
          AND cp.weight_to_kg >= $4
          AND cp.is_active = true
          AND cs.is_active = true
          AND c.is_active = true
          ${carrierFilter}
        ORDER BY total_cost_before_margin ASC
      `;

      const result = await pool.query(ratesQuery, params);

      const rates = result.rows.map(row => {
        const totalCostBeforeMargin = parseFloat(row.total_cost_before_margin);
        const marginPercentage = parseFloat(row.default_margin_percentage);

        return {
          carrier_name: row.carrier_name,
          carrier_code: row.carrier_code,
          service_type: row.service_name,
          service_code: row.service_code,
          rate_per_kg: parseFloat(row.rate_per_kg),
          minimum_charge: parseFloat(row.minimum_charge),
          weight_cost: parseFloat(row.weight_cost),
          base_cost: parseFloat(row.base_cost),
          fuel_surcharge_percentage: parseFloat(row.fuel_surcharge_percentage),
          fuel_surcharge: parseFloat(row.fuel_surcharge),
          handling_fee: parseFloat(row.handling_fee),
          total_cost: Math.round(totalCostBeforeMargin * 100) / 100,
          total_cost_with_margin: Math.round(totalCostBeforeMargin * (1 + marginPercentage / 100) * 100) / 100,
          margin_percentage: marginPercentage,
          transit_days: row.transit_days_min,
          transit_days_min: row.transit_days_min,
          transit_days_max: row.transit_days_max,
          currency: row.currency,
          origin,
          destination
        };
      });

      serviceLogger.success('calculateCarrierRates', `Found ${rates.length} carrier rates`);
      return rates;

    } catch (error) {
      serviceLogger.error('calculateCarrierRates', error);
      
      // Fallback to empty array if database query fails
      serviceLogger.info('Using fallback: returning empty rates array');
      return [];
    }
  }

  /**
   * Calculate additional fees
   * @param {Object} shipment - Shipment data
   * @param {Object} options - Fee calculation options
   * @returns {Object} Additional fees breakdown
   */
  calculateAdditionalFees(shipment, options = {}) {
    const fees = {};
    let total = 0;

    // Handling fee
    if (options.handlingFee || shipment.special_handling) {
      const handlingFee = options.handlingFeeAmount || 25.00;
      fees.handling = handlingFee;
      total += handlingFee;
    }

    // Documentation fee
    const documentationFee = options.documentationFeeAmount || 15.00;
    fees.documentation = documentationFee;
    total += documentationFee;

    // Insurance fee (percentage of estimated value)
    if (shipment.estimated_value) {
      const insuranceRate = options.insuranceRate || 0.5; // 0.5% of value
      const insuranceFee = (shipment.estimated_value * insuranceRate) / 100;
      fees.insurance = Math.round(insuranceFee * 100) / 100;
      total += fees.insurance;
    }

    // Special handling fees
    if (shipment.special_handling && Array.isArray(shipment.special_handling)) {
      const specialFees = {
        'FRAGILE': 10.00,
        'TEMPERATURE_CONTROLLED': 50.00,
        'HAZARDOUS': 75.00,
        'HIGH_VALUE': 30.00,
        'PERISHABLE': 40.00
      };

      shipment.special_handling.forEach(handling => {
        if (specialFees[handling]) {
          fees[`special_${handling.toLowerCase()}`] = specialFees[handling];
          total += specialFees[handling];
        }
      });
    }

    // Fuel surcharge (percentage of base rate)
    if (options.fuelSurchargeRate) {
      const fuelSurcharge = (options.baseRate || 0) * (options.fuelSurchargeRate / 100);
      fees.fuel_surcharge = Math.round(fuelSurcharge * 100) / 100;
      total += fees.fuel_surcharge;
    }

    fees.total = Math.round(total * 100) / 100;
    return fees;
  }

  /**
   * Send quote to customer (placeholder for future implementation)
   * @param {number} quoteId - Quote ID
   * @returns {Object} Send result
   */
  async sendQuoteToCustomer(quoteId) {
    try {
      serviceLogger.start(this.constructor.name, 'sendQuoteToCustomer', { quoteId });

      const quote = await this.quoteRepo.findQuoteWithDetails(quoteId);
      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      // In a real implementation, this would:
      // 1. Generate a PDF quote document
      // 2. Send email to customer
      // 3. Create notification in system
      // 4. Log the communication

      // For now, just log the action
      serviceLogger.success(this.constructor.name, 'sendQuoteToCustomer', { 
        quoteId, 
        customerEmail: quote.customer_email 
      });

      return { 
        success: true, 
        message: 'Quote sent successfully',
        sentTo: quote.customer_email
      };
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'sendQuoteToCustomer', error);
      throw error;
    }
  }

  /**
   * Customer accepts a quotation
   * @param {string} quotationId - Quotation UUID
   * @param {string} customerId - Customer user ID
   * @returns {Object} Acceptance result
   */
  async acceptQuote(quotationId, customerId) {
    try {
      serviceLogger.start(this.constructor.name, 'acceptQuote', { quotationId, customerId });

      const quotation = await this.quoteRepo.findById(quotationId);
      if (!quotation) {
        throw new Error(`Quotation ${quotationId} not found`);
      }

      if (!quotation.is_confirmed) {
        throw new Error('Quotation must be confirmed before it can be accepted');
      }

      if (new Date() > new Date(quotation.valid_until)) {
        throw new Error('Quotation has expired');
      }

      // Accept the quotation
      const acceptedQuotation = await this.quoteRepo.acceptQuote(quotationId);

      // Transition shipment status to CONFIRMED
      await this.statusTransitionService.transitionStatus(
        quotation.shipment_id,
        'CONFIRMED',
        customerId,
        'CUSTOMER',
        `Quotation ${quotation.quote_number} accepted by customer`
      );

      serviceLogger.success(this.constructor.name, 'acceptQuote', { quotationId });
      return acceptedQuotation;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'acceptQuote', error);
      throw error;
    }
  }

  /**
   * Get quotes for admin dashboard
   * @param {Object} filters - Filter options
   * @returns {Array} Quotes with shipment details
   */
  async getQuotesForDashboard(filters = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'getQuotesForDashboard', { filters });

      let query = `
        SELECT q.*, 
               s.reference, s.origin, s.destination, s.package_weight_kg, s.estimated_value,
               s.package_length_cm, s.package_width_cm, s.package_height_cm,
               u.first_name || ' ' || u.last_name as customer_name,
               u.email as customer_email,
               COUNT(sf.id) as document_count
        FROM quotes q
        JOIN shipments s ON q.shipment_id = s.shipment_id
        LEFT JOIN users u ON s.customer_id = u.id
        LEFT JOIN shipment_files sf ON s.shipment_id = sf.shipment_id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      // Apply filters
      if (filters.status) {
        query += ` AND q.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.validOnly) {
        query += ` AND q.valid_until > CURRENT_TIMESTAMP`;
      }

      if (filters.fromDate) {
        query += ` AND q.created_at >= $${paramIndex}`;
        params.push(filters.fromDate);
        paramIndex++;
      }

      if (filters.toDate) {
        query += ` AND q.created_at <= $${paramIndex}`;
        params.push(filters.toDate);
        paramIndex++;
      }

      query += ` 
        GROUP BY q.id, s.shipment_id, u.id
        ORDER BY q.created_at DESC
      `;

      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      const result = await this.quoteRepo.rawQuery(query, params);

      serviceLogger.success(this.constructor.name, 'getQuotesForDashboard', { 
        count: result.rows.length 
      });
      
      return result.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getQuotesForDashboard', error);
      throw error;
    }
  }

  /**
   * Get quote statistics
   * @returns {Object} Quote statistics
   */
  async getQuoteStatistics() {
    try {
      serviceLogger.start(this.constructor.name, 'getQuoteStatistics');

      const query = `
        SELECT 
          COUNT(CASE WHEN status = 'ACTIVE' AND valid_until > CURRENT_TIMESTAMP THEN 1 END) as active_quotes,
          COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END) as accepted_quotes,
          COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expired_quotes,
          AVG(CASE WHEN status = 'ACCEPTED' THEN total_cost END) as avg_accepted_value,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as quotes_today
        FROM quotes
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      `;

      const result = await this.quoteRepo.rawQuery(query);
      const stats = result.rows[0];

      serviceLogger.success(this.constructor.name, 'getQuoteStatistics', { stats });
      return {
        active_quotes: parseInt(stats.active_quotes) || 0,
        accepted_quotes: parseInt(stats.accepted_quotes) || 0,
        expired_quotes: parseInt(stats.expired_quotes) || 0,
        avg_accepted_value: parseFloat(stats.avg_accepted_value) || 0,
        quotes_today: parseInt(stats.quotes_today) || 0
      };
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getQuoteStatistics', error);
      throw error;
    }
  }

  /**
   * Update quote with revised rates
   * @param {number} quoteId - Quote ID
   * @param {Object} updatedData - Updated quote data
   * @param {number} adminId - Admin user ID
   * @returns {Object} Updated quote
   */
  async updateQuote(quoteId, updatedData, adminId) {
    try {
      serviceLogger.start(this.constructor.name, 'updateQuote', { quoteId, adminId });

      const quote = await this.quoteRepo.findById(quoteId);
      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      if (quote.status !== 'ACTIVE') {
        throw new Error(`Cannot update quote with status: ${quote.status}`);
      }

      // Recalculate total if components changed
      if (updatedData.carrier_rates || updatedData.additional_fees || updatedData.margin_percentage) {
        const baseRate = updatedData.carrier_rates ? 
          Math.min(...updatedData.carrier_rates.map(rate => rate.total_cost)) : 
          quote.base_rate;
        
        const additionalFeesTotal = updatedData.additional_fees?.total || quote.additional_fees?.total || 0;
        const marginPercentage = updatedData.margin_percentage || quote.margin_percentage;
        
        updatedData.total_cost = Math.round((baseRate + additionalFeesTotal) * (1 + marginPercentage / 100) * 100) / 100;
        updatedData.base_rate = baseRate;
      }

      updatedData.updated_at = new Date().toISOString();

      const updatedQuote = await this.quoteRepo.updateById(quoteId, updatedData);

      serviceLogger.success(this.constructor.name, 'updateQuote', { quoteId });
      return updatedQuote;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'updateQuote', error);
      throw error;
    }
  }
}

export default QuoteService;
/**
 * Quote Service
 * Business logic for quote management and generation
 */

import { QuoteRepository } from '../repositories/QuoteRepository.js';
import { ShipmentRepository } from '../repositories/ShipmentRepository.js';
import StatusTransitionService from './StatusTransitionService.js';
import { serviceLogger } from '../utils/logger.js';

// Default carrier rates (in production, this would be from database or API)
const CARRIER_RATES = {
  'DHL': {
    'Express Worldwide': { rate_per_kg: 25.50, minimum_charge: 50.00, transit_days: 2 },
    'Economy Select': { rate_per_kg: 18.00, minimum_charge: 35.00, transit_days: 5 }
  },
  'FedEx': {
    'International Priority': { rate_per_kg: 28.00, minimum_charge: 55.00, transit_days: 2 },
    'International Economy': { rate_per_kg: 20.00, minimum_charge: 40.00, transit_days: 4 }
  },
  'Maersk': {
    'Sea Freight LCL': { rate_per_kg: 5.50, minimum_charge: 200.00, transit_days: 25 },
    'Sea Freight FCL': { rate_per_kg: 3.20, minimum_charge: 800.00, transit_days: 20 }
  },
  'Local Carrier': {
    'Standard Service': { rate_per_kg: 8.00, minimum_charge: 20.00, transit_days: 1 },
    'Express Service': { rate_per_kg: 12.00, minimum_charge: 30.00, transit_days: 1 }
  }
};

export class QuoteService {
  constructor() {
    this.quoteRepo = new QuoteRepository();
    this.shipmentRepo = new ShipmentRepository();
    this.statusTransitionService = new StatusTransitionService();
  }

  /**
   * Generate quote for a shipment
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

      if (shipment.status !== 'UNDER_REVIEW') {
        throw new Error(`Shipment must be in UNDER_REVIEW status to generate quote. Current status: ${shipment.status}`);
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

      // Create quote
      const quoteData = {
        shipment_id: shipmentId,
        carrier_rates: carrierRates,
        base_rate: baseRate,
        additional_fees: additionalFees,
        margin_percentage: marginPercentage,
        total_cost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
        currency: options.currency || 'USD',
        valid_until: new Date(Date.now() + (options.validityHours || 72) * 60 * 60 * 1000),
        created_by: adminId,
        notes: options.notes
      };

      const quote = await this.quoteRepo.createQuote(quoteData);

      // Transition shipment status to QUOTED
      await this.statusTransitionService.transitionStatus(
        shipmentId,
        'QUOTED',
        adminId,
        'ADMIN',
        `Quote ${quote.quote_number} generated`
      );

      serviceLogger.success(this.constructor.name, 'generateQuote', { 
        quoteId: quote.id, 
        quoteNumber: quote.quote_number 
      });

      return quote;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'generateQuote', error);
      throw error;
    }
  }

  /**
   * Calculate carrier rates for a shipment
   * @param {Object} shipment - Shipment data
   * @param {Array} selectedCarriers - Optional array of selected carriers
   * @returns {Array} Carrier rate calculations
   */
  async calculateCarrierRates(shipment, selectedCarriers = null) {
    const weight = shipment.package_weight_kg || 1;
    const origin = shipment.origin || 'Malaysia';
    const destination = shipment.destination || 'Singapore';
    
    const rates = [];
    const carriersToCalculate = selectedCarriers || Object.keys(CARRIER_RATES);

    for (const carrierName of carriersToCalculate) {
      const carrier = CARRIER_RATES[carrierName];
      if (!carrier) continue;

      for (const [serviceName, rateInfo] of Object.entries(carrier)) {
        const weightCost = weight * rateInfo.rate_per_kg;
        const totalCost = Math.max(weightCost, rateInfo.minimum_charge);

        rates.push({
          carrier_name: carrierName,
          service_type: serviceName,
          rate_per_kg: rateInfo.rate_per_kg,
          minimum_charge: rateInfo.minimum_charge,
          weight_cost: Math.round(weightCost * 100) / 100,
          total_cost: Math.round(totalCost * 100) / 100,
          transit_days: rateInfo.transit_days,
          origin,
          destination
        });
      }
    }

    return rates.sort((a, b) => a.total_cost - b.total_cost);
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
   * Customer accepts a quote
   * @param {number} quoteId - Quote ID
   * @param {number} customerId - Customer user ID
   * @returns {Object} Acceptance result
   */
  async acceptQuote(quoteId, customerId) {
    try {
      serviceLogger.start(this.constructor.name, 'acceptQuote', { quoteId, customerId });

      const quote = await this.quoteRepo.findById(quoteId);
      if (!quote) {
        throw new Error(`Quote ${quoteId} not found`);
      }

      if (quote.status !== 'ACTIVE') {
        throw new Error(`Quote is not active. Current status: ${quote.status}`);
      }

      if (new Date() > new Date(quote.valid_until)) {
        throw new Error('Quote has expired');
      }

      // Accept the quote
      const acceptedQuote = await this.quoteRepo.acceptQuote(quoteId);

      // Transition shipment status to CONFIRMED
      await this.statusTransitionService.transitionStatus(
        quote.shipment_id,
        'CONFIRMED',
        customerId,
        'CUSTOMER',
        `Quote ${quote.quote_number} accepted by customer`
      );

      serviceLogger.success(this.constructor.name, 'acceptQuote', { quoteId });
      return acceptedQuote;
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
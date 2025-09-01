/**
 * Quote Repository
 * Data access layer for quote-related operations
 */

import { BaseRepository } from './BaseRepository.js';
import { serviceLogger } from '../utils/logger.js';

export class QuoteRepository extends BaseRepository {
  constructor() {
    super('quotes', 'id');
  }

  /**
   * Create a new quote
   * @param {Object} quoteData - Quote data
   * @returns {Object} Created quote
   */
  async createQuote(quoteData) {
    try {
      serviceLogger.start(this.constructor.name, 'createQuote');
      
      // Generate quote number
      const quoteNumber = await this.generateQuoteNumber();
      
      const quote = await this.create({
        ...quoteData,
        quote_number: quoteNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      serviceLogger.success(this.constructor.name, 'createQuote', { quote_id: quote.id });
      return quote;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'createQuote', error);
      throw error;
    }
  }

  /**
   * Generate unique quote number
   * @returns {string} Quote number
   */
  async generateQuoteNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get daily sequence number
    const query = `
      SELECT COUNT(*) + 1 as sequence 
      FROM quotes 
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    
    const result = await this.rawQuery(query);
    const sequence = String(result.rows[0].sequence).padStart(4, '0');
    
    return `QT${year}${month}${day}${sequence}`;
  }

  /**
   * Find quotes by shipment ID
   * @param {number} shipmentId - Shipment ID
   * @returns {Array} Quotes for the shipment
   */
  async findByShipmentId(shipmentId) {
    try {
      serviceLogger.start(this.constructor.name, 'findByShipmentId', { shipmentId });
      
      const quotes = await this.findAll({ shipment_id: shipmentId }, {
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      serviceLogger.success(this.constructor.name, 'findByShipmentId', { count: quotes.length });
      return quotes;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findByShipmentId', error);
      throw error;
    }
  }

  /**
   * Find active quotes (not expired or cancelled)
   * @returns {Array} Active quotes
   */
  async findActiveQuotes() {
    try {
      serviceLogger.start(this.constructor.name, 'findActiveQuotes');
      
      const query = `
        SELECT q.*, s.reference as shipment_reference, 
               u.first_name || ' ' || u.last_name as customer_name
        FROM quotes q
        JOIN shipments s ON q.shipment_id = s.shipment_id
        LEFT JOIN users u ON s.customer_id = u.id
        WHERE q.status = 'ACTIVE' AND q.valid_until > CURRENT_TIMESTAMP
        ORDER BY q.created_at DESC
      `;

      const result = await this.rawQuery(query);
      
      serviceLogger.success(this.constructor.name, 'findActiveQuotes', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findActiveQuotes', error);
      throw error;
    }
  }

  /**
   * Accept a quote
   * @param {number} quoteId - Quote ID
   * @returns {Object} Updated quote
   */
  async acceptQuote(quoteId) {
    try {
      serviceLogger.start(this.constructor.name, 'acceptQuote', { quoteId });
      
      const quote = await this.updateById(quoteId, {
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      serviceLogger.success(this.constructor.name, 'acceptQuote', { quote_id: quoteId });
      return quote;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'acceptQuote', error);
      throw error;
    }
  }

  /**
   * Expire old quotes
   * @returns {number} Number of expired quotes
   */
  async expireOldQuotes() {
    try {
      serviceLogger.start(this.constructor.name, 'expireOldQuotes');
      
      const query = `
        UPDATE quotes 
        SET status = 'EXPIRED', 
            expired_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE status = 'ACTIVE' 
        AND valid_until < CURRENT_TIMESTAMP
        RETURNING id
      `;

      const result = await this.rawQuery(query);
      
      serviceLogger.success(this.constructor.name, 'expireOldQuotes', { expired_count: result.rows.length });
      return result.rows.length;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'expireOldQuotes', error);
      throw error;
    }
  }

  /**
   * Get quote with shipment details
   * @param {number} quoteId - Quote ID
   * @returns {Object} Quote with shipment details
   */
  async findQuoteWithDetails(quoteId) {
    try {
      serviceLogger.start(this.constructor.name, 'findQuoteWithDetails', { quoteId });
      
      const query = `
        SELECT q.*, 
               s.reference, s.origin, s.destination, s.package_weight_kg, s.estimated_value,
               u.first_name || ' ' || u.last_name as customer_name, u.email as customer_email
        FROM quotes q
        JOIN shipments s ON q.shipment_id = s.shipment_id
        LEFT JOIN users u ON s.customer_id = u.id
        WHERE q.id = $1
      `;

      const result = await this.rawQuery(query, [quoteId]);
      const quote = result.rows.length > 0 ? result.rows[0] : null;
      
      serviceLogger.success(this.constructor.name, 'findQuoteWithDetails', { found: !!quote });
      return quote;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findQuoteWithDetails', error);
      throw error;
    }
  }
}

export default QuoteRepository;
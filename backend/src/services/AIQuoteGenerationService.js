/**
 * AI Quote Generation Service
 * Integrates with OpenAI to generate intelligent quotations using carrier rates, zones, and fees
 */

import OpenAI from 'openai';
import pkg from 'pg';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class AIQuoteGenerationService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate AI-powered quotation with 3 options (Fast/Balanced/Economy)
   */
  async generateQuote(shipmentDetails) {
    try {
      // Get carrier rates, zones, and fees from database
      const carrierData = await this.getCarrierData();
      const zoneData = await this.getZoneData(shipmentDetails.origin, shipmentDetails.destination);
      const feesData = await this.getFeesData();
      
      // Calculate volumetric weight
      const volumetricWeight = this.calculateVolumetricWeight(shipmentDetails);
      const chargeableWeight = Math.max(shipmentDetails.weight, volumetricWeight);
      
      // Build comprehensive prompt with all data
      const prompt = this.buildPrompt(shipmentDetails, carrierData, zoneData, feesData, chargeableWeight);
      
      // Generate AI quotation
      const aiResponse = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a professional logistics pricing expert with deep knowledge of international shipping, carrier rates, and customs regulations. Generate accurate, competitive quotations based on the provided data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      
      const quotationText = aiResponse.choices[0].message.content;
      
      // Parse the AI response to extract structured quote data
      const structuredQuotes = await this.parseAIResponse(quotationText, shipmentDetails, chargeableWeight);
      
      return {
        success: true,
        quotes: structuredQuotes,
        aiAnalysis: quotationText,
        metadata: {
          volumetricWeight,
          chargeableWeight,
          zoneMultiplier: zoneData?.multiplier || 1.0
        }
      };
      
    } catch (error) {
      console.error('AI Quote Generation Error:', error);
      return {
        success: false,
        error: 'Failed to generate AI quotation',
        details: error.message
      };
    }
  }

  /**
   * Calculate volumetric weight using formula: (L × W × H) / 5000
   */
  calculateVolumetricWeight(shipmentDetails) {
    const { dimensions } = shipmentDetails;
    if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
      return 0;
    }
    
    return (dimensions.length * dimensions.width * dimensions.height) / 5000;
  }

  /**
   * Get all active carriers with their services and pricing
   */
  async getCarrierData() {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.code,
        cs.service_name,
        cs.service_code,
        cs.transit_time,
        cs.base_rate,
        cs.per_kg_rate,
        cs.fuel_surcharge_rate,
        cs.min_charge
      FROM carriers c
      JOIN carrier_services cs ON c.id = cs.carrier_id
      WHERE c.active = true AND cs.active = true
      ORDER BY c.name, cs.service_name
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get zone multiplier for origin-destination pair
   */
  async getZoneData(origin, destination) {
    const query = `
      SELECT 
        zone_name,
        origin_country,
        destination_country,
        multiplier,
        base_transit_days
      FROM shipping_zones 
      WHERE 
        LOWER(origin_country) = LOWER($1) AND 
        LOWER(destination_country) = LOWER($2)
      LIMIT 1
    `;
    
    const result = await pool.query(query, [origin, destination]);
    return result.rows[0] || { multiplier: 1.0, base_transit_days: 3 };
  }

  /**
   * Get all applicable additional fees
   */
  async getFeesData() {
    const query = `
      SELECT 
        fee_name,
        fee_type,
        amount,
        calculation_method,
        description,
        category,
        required
      FROM additional_fees
      WHERE active = true
      ORDER BY category, fee_name
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Build comprehensive prompt for OpenAI
   */
  buildPrompt(shipmentDetails, carrierData, zoneData, feesData, chargeableWeight) {
    return `
Generate a comprehensive logistics quotation for the following shipment:

**SHIPMENT DETAILS:**
- Origin: ${shipmentDetails.origin}
- Destination: ${shipmentDetails.destination}
- Transportation Mode: ${shipmentDetails.transportationMode || 'AIR'} FREIGHT
- Priority: ${shipmentDetails.priority || 'Standard'} PRIORITY
- Weight: ${shipmentDetails.weight} kg
- Dimensions: ${shipmentDetails.dimensions?.length || 0} × ${shipmentDetails.dimensions?.width || 0} × ${shipmentDetails.dimensions?.height || 0} cm
- Volumetric Weight: ${this.calculateVolumetricWeight(shipmentDetails).toFixed(2)} kg
- Chargeable Weight: ${chargeableWeight} kg
- Commodity: ${shipmentDetails.commodity || 'General Cargo'}
- Declared Value: ${shipmentDetails.currency || 'USD'} ${shipmentDetails.declaredValue || 1000}
- Currency: ${shipmentDetails.currency || 'USD'}
- Incoterms: ${shipmentDetails.incoterms || 'EXW'}
- Insurance Required: ${shipmentDetails.insuranceRequired ? 'YES' : 'NO'}
- Strategic Items: ${shipmentDetails.hasStrategicItems ? 'YES' : 'NO'}
- AI Chips Detected: ${shipmentDetails.hasAIChips ? 'YES' : 'NO'}
- Risk Level: ${shipmentDetails.riskLevel?.toUpperCase() || 'LOW'}

**ZONE INFORMATION:**
- Zone: ${zoneData.zone_name || 'Standard'}
- Multiplier: ${zoneData.multiplier}
- Base Transit: ${zoneData.base_transit_days} days

**AVAILABLE CARRIERS & SERVICES:**
${carrierData.map(carrier => 
  `${carrier.name} - ${carrier.service_name}: $${carrier.base_rate} + $${carrier.per_kg_rate}/kg, Fuel: ${carrier.fuel_surcharge_rate}%, Min: $${carrier.min_charge}, Transit: ${carrier.transit_time}`
).join('\n')}

**ADDITIONAL FEES AVAILABLE:**
${feesData.map(fee => 
  `${fee.fee_name} (${fee.category}): ${fee.calculation_method === 'percentage' ? fee.amount + '%' : '$' + fee.amount} ${fee.required ? '[REQUIRED]' : ''} - ${fee.description}`
).join('\n')}

**QUOTATION FORMULA TO FOLLOW:**
1. Base Rate = Carrier base rate + (chargeable weight × per kg rate)
2. Apply fuel surcharge: Base Rate × fuel surcharge percentage
3. Apply zone multiplier: Result × zone multiplier
4. Apply transportation mode factor:
   - AIR FREIGHT: Use air freight rates (fastest, higher cost)
   - SEA FREIGHT: Use ocean freight rates (slower, lower cost)
   - ROAD FREIGHT: Use land transport rates (regional only)
5. Apply priority factor:
   - EXPRESS/URGENT: +20-30% premium, fastest service selection
   - Standard: Normal pricing, balanced service selection
   - ECONOMY: -10-15% discount, slower but cheaper services
6. Add applicable additional fees based on:
   - Customs/Documentation fees for international shipments
   - Insurance based on declared value (mandatory if required)
   - Strategic items handling fees (if strategic items detected)
   - AI chips compliance fees (if AI chips detected)
   - High-risk surcharge (if risk level is HIGH)
   - Handling fees for special requirements
   - Remote area fees if applicable
7. Apply currency conversion if shipment currency differs from USD
8. Add 3PL margin (15-25% depending on service level and priority)

**REQUIRED OUTPUT:**
Generate exactly 3 quotation options in this format:

**ECONOMY OPTION:**
- Carrier: [Slowest but cheapest option]
- Service: [Service name]
- Transit Time: [X days]
- Base Rate: $[amount]
- Fuel Surcharge: $[amount]
- Zone Adjustment: $[amount]
- Additional Fees: $[amount] (list specific fees)
- 3PL Margin: $[amount]
- **Total: $[final amount]**

**BALANCED OPTION:**
- Carrier: [Mid-range option balancing cost and speed]
- Service: [Service name]
- Transit Time: [X days]
- Base Rate: $[amount]
- Fuel Surcharge: $[amount]
- Zone Adjustment: $[amount]
- Additional Fees: $[amount] (list specific fees)
- 3PL Margin: $[amount]
- **Total: $[final amount]**

**FAST OPTION:**
- Carrier: [Fastest premium option]
- Service: [Service name]
- Transit Time: [X days]
- Base Rate: $[amount]
- Fuel Surcharge: $[amount]
- Zone Adjustment: $[amount]
- Additional Fees: $[amount] (list specific fees)
- 3PL Margin: $[amount]
- **Total: $[final amount]**

Consider ALL shipment characteristics and apply appropriate fees:
- Transportation mode (AIR/SEA/ROAD freight pricing differences)
- Priority level (EXPRESS/Standard/ECONOMY service selection and pricing)
- International shipments (customs documentation fees mandatory)
- High-value items (insurance mandatory if required)
- Strategic items or AI chips (compliance and handling fees)
- Risk level (additional surcharges for HIGH risk)
- Currency (convert to shipment currency if not USD)
- Special handling requirements

Be realistic with pricing and ensure each option provides genuine value differences in speed, service level, and cost.
`;
  }

  /**
   * Parse AI response to extract structured quote data
   */
  async parseAIResponse(aiResponse, shipmentDetails, chargeableWeight) {
    // Extract the three quotation options from AI response
    const quotes = [];
    const options = ['ECONOMY', 'BALANCED', 'FAST'];
    
    for (const option of options) {
      try {
        const optionRegex = new RegExp(`\\*\\*${option} OPTION:\\*\\*([\\s\\S]*?)(?=\\*\\*(?:BALANCED|FAST|$))`, 'i');
        const match = aiResponse.match(optionRegex);
        
        if (match) {
          const optionText = match[1];
          
          // Extract key information using regex
          const carrier = this.extractValue(optionText, 'Carrier:');
          const service = this.extractValue(optionText, 'Service:');
          const transitTime = this.extractValue(optionText, 'Transit Time:');
          const totalMatch = optionText.match(/\*\*Total:\s*\$?([\d,]+\.?\d*)\*\*/i);
          const total = totalMatch ? parseFloat(totalMatch[1].replace(',', '')) : 0;
          
          quotes.push({
            type: option.toLowerCase(),
            carrier: carrier,
            service: service,
            transitTime: transitTime,
            total: total,
            details: {
              baseRate: this.extractCurrency(optionText, 'Base Rate:'),
              fuelSurcharge: this.extractCurrency(optionText, 'Fuel Surcharge:'),
              zoneAdjustment: this.extractCurrency(optionText, 'Zone Adjustment:'),
              additionalFees: this.extractCurrency(optionText, 'Additional Fees:'),
              margin: this.extractCurrency(optionText, '3PL Margin:'),
              chargeableWeight: chargeableWeight
            }
          });
        }
      } catch (error) {
        console.error(`Error parsing ${option} option:`, error);
      }
    }
    
    return quotes;
  }

  /**
   * Extract value after a label
   */
  extractValue(text, label) {
    const regex = new RegExp(`${label.replace(':', '\\:')}\\s*([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract currency value after a label
   */
  extractCurrency(text, label) {
    const regex = new RegExp(`${label.replace(':', '\\:')}\\s*\\$?([\\d,]+\\.?\\d*)`, 'i');
    const match = text.match(regex);
    return match ? parseFloat(match[1].replace(',', '')) : 0;
  }
}

export default new AIQuoteGenerationService();
/**
 * Test AI Quote Generation System
 * Simple test to validate AI quotation functionality with sample data
 */

const AIQuoteGenerationService = require('./src/services/AIQuoteGenerationService.js');

async function testAIQuoteGeneration() {
  console.log(' Testing AI Quote Generation System...\n');

  // Sample shipment data for testing with comprehensive details
  const testShipmentDetails = {
    origin: 'Malaysia',
    destination: 'Singapore',
    weight: 25.5, // kg
    dimensions: {
      length: 60,  // cm
      width: 40,   // cm  
      height: 30   // cm
    },
    commodity: 'Electronics Components',
    declaredValue: 5000,
    currency: 'USD',
    transportationMode: 'AIR',
    priority: 'Express',
    specialHandling: ['FRAGILE'],
    isInternational: true,
    incoterms: 'CIF',
    insuranceRequired: true,
    hasStrategicItems: false,
    hasAIChips: true,
    riskLevel: 'medium'
  };

  console.log('📦 Test Shipment Details:');
  console.log('   Origin:', testShipmentDetails.origin);
  console.log('   Destination:', testShipmentDetails.destination);
  console.log('   Transportation Mode:', testShipmentDetails.transportationMode);
  console.log('   Priority:', testShipmentDetails.priority);
  console.log('   Weight:', testShipmentDetails.weight + ' kg');
  console.log('   Dimensions:', `${testShipmentDetails.dimensions.length}×${testShipmentDetails.dimensions.width}×${testShipmentDetails.dimensions.height} cm`);
  console.log('   Commodity:', testShipmentDetails.commodity);
  console.log('   Declared Value:', testShipmentDetails.currency + ' ' + testShipmentDetails.declaredValue);
  console.log('   Currency:', testShipmentDetails.currency);
  console.log('   Incoterms:', testShipmentDetails.incoterms);
  console.log('   Insurance Required:', testShipmentDetails.insuranceRequired ? 'YES' : 'NO');
  console.log('   Strategic Items:', testShipmentDetails.hasStrategicItems ? 'YES' : 'NO');
  console.log('   AI Chips:', testShipmentDetails.hasAIChips ? 'YES' : 'NO');
  console.log('   Risk Level:', testShipmentDetails.riskLevel.toUpperCase());
  console.log('   Special Handling:', testShipmentDetails.specialHandling.join(', '));
  console.log('');

  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OpenAI API key not found in environment variables');
      console.log('   Please set OPENAI_API_KEY in your .env file to test AI quotation');
      return;
    }

    console.log('🔑 OpenAI API key found - proceeding with AI quote generation...\n');

    // Calculate volumetric weight
    const volumetricWeight = AIQuoteGenerationService.calculateVolumetricWeight(testShipmentDetails);
    const chargeableWeight = Math.max(testShipmentDetails.weight, volumetricWeight);
    
    console.log('📊 Weight Calculations:');
    console.log('   Actual Weight:', testShipmentDetails.weight + ' kg');
    console.log('   Volumetric Weight:', volumetricWeight.toFixed(2) + ' kg');
    console.log('   Chargeable Weight:', chargeableWeight + ' kg');
    console.log('');

    // Generate AI quotes
    console.log('🧠 Generating AI-powered quotes...');
    const startTime = Date.now();
    
    const aiQuoteResult = await AIQuoteGenerationService.generateQuote(testShipmentDetails);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    if (aiQuoteResult.success) {
      console.log(`✅ AI quotation completed in ${duration} seconds\n`);
      
      // Display results
      console.log('📋 QUOTATION RESULTS:');
      console.log('='.repeat(50));
      
      aiQuoteResult.quotes.forEach((quote, index) => {
        console.log(`\n${index + 1}. ${quote.type.toUpperCase()} OPTION:`);
        console.log('   Carrier:', quote.carrier);
        console.log('   Service:', quote.service);
        console.log('   Transit Time:', quote.transitTime);
        console.log('   Base Rate: $' + (quote.details.baseRate || 0).toFixed(2));
        console.log('   Fuel Surcharge: $' + (quote.details.fuelSurcharge || 0).toFixed(2));
        console.log('   Zone Adjustment: $' + (quote.details.zoneAdjustment || 0).toFixed(2));
        console.log('   Additional Fees: $' + (quote.details.additionalFees || 0).toFixed(2));
        console.log('   3PL Margin: $' + (quote.details.margin || 0).toFixed(2));
        console.log('   🏷️  TOTAL: $' + quote.total.toFixed(2));
      });
      
      console.log('\n' + '='.repeat(50));
      console.log('📊 METADATA:');
      console.log('   Volumetric Weight:', aiQuoteResult.metadata.volumetricWeight?.toFixed(2) + ' kg');
      console.log('   Chargeable Weight:', aiQuoteResult.metadata.chargeableWeight + ' kg');
      console.log('   Zone Multiplier:', aiQuoteResult.metadata.zoneMultiplier);
      
      console.log('\n AI ANALYSIS PREVIEW:');
      console.log('-'.repeat(50));
      // Show first 300 characters of AI analysis
      const preview = aiQuoteResult.aiAnalysis.substring(0, 300) + '...';
      console.log(preview);
      
      console.log('\n✅ AI Quote Generation Test PASSED');
      console.log(`📈 Generated ${aiQuoteResult.quotes.length} quote options successfully`);
      
    } else {
      console.log('❌ AI quotation failed:');
      console.log('   Error:', aiQuoteResult.error);
      console.log('   Details:', aiQuoteResult.details || 'No additional details');
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:');
    console.log('   Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('   💡 Hint: Check your OpenAI API key configuration');
    } else if (error.message.includes('quota')) {
      console.log('   💡 Hint: OpenAI quota may be exceeded');
    } else if (error.message.includes('rate limit')) {
      console.log('   💡 Hint: OpenAI rate limit reached, try again later');
    }
  }
}

// Run the test
testAIQuoteGeneration();
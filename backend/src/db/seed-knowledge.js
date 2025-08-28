/**
 * Knowledge base seeding script for logistics compliance
 * Populates the database with sample compliance information
 */
import 'dotenv/config';
import pkg from 'pg';
import { storeKnowledgeChunk } from '../services/rag.js';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Sample knowledge chunks for Malaysian export compliance
const sampleKnowledgeChunks = [
  {
    title: "Strategic Trade Act 2010 - AI Chip Controls",
    section: "Part III",
    country: "MY",
    tags: ["strategic-trade", "ai-chips", "export-control"],
    text: `Under the Strategic Trade Act 2010, artificial intelligence accelerator chips including GPUs, TPUs, and specialized AI processors are subject to export controls. Exporters must obtain Strategic Trade Authorization (STA) permits for AI chips with compute performance exceeding specified thresholds. The Advanced Integrated Circuit Authorization (AICA) process applies to high-performance computing chips destined for strategic end-users. Export notices must be filed 30 days in advance for controlled AI chip shipments.`
  },
  {
    title: "End User Screening Requirements",
    section: "Section 15",
    country: "MY",
    tags: ["screening", "end-user", "compliance"],
    text: `All exporters must conduct comprehensive end-user screening against sanctioned entity lists including the Entity List, Denied Persons List, and Specially Designated Nationals. Screening must be performed for consignees, end-users, and intermediate parties. Evidence of screening results must be documented and retained for audit purposes. Positive matches require immediate escalation and may prohibit the export transaction.`
  },
  {
    title: "Documentation Requirements - PCO and K2 Forms",
    section: "Appendix A",
    country: "MY",
    tags: ["documentation", "pco", "k2-form"],
    text: `Export shipments require proper documentation including Pre-shipment Control Order (PCO) numbers for applicable commodities. K2 customs forms must be completed accurately with correct Harmonized System (HS) codes. Permit references must be included for controlled items. All documentation must be validated before shipment departure and copies retained for regulatory compliance.`
  },
  {
    title: "Semiconductor Export Classifications",
    section: "Schedule 1",
    country: "MY",
    tags: ["semiconductor", "classification", "hs-codes"],
    text: `Semiconductor products are classified under various HS codes including 8542 (Electronic integrated circuits), 8541 (Diodes, transistors), and 8543 (Electronic machines). AI accelerators typically fall under HS 8542.39 (Other monolithic integrated circuits). Memory chips use HS 8542.32 (Memories) or HS 8542.33 (Amplifiers). Proper classification is essential for determining applicable export controls and permit requirements.`
  },
  {
    title: "Re-export License Requirements",
    section: "Part IV",
    country: "MY",
    tags: ["re-export", "license", "third-country"],
    text: `Items subject to Malaysian export controls require re-export licenses when transferred from the destination country to third countries. Re-export license applications must include end-user statements, technical specifications, and justification for the transfer. Processing time is typically 30-45 business days. Violations of re-export requirements may result in penalties and license revocation.`
  },
  {
    title: "Technology Transfer Controls",
    section: "Section 8",
    country: "MY",
    tags: ["technology", "transfer", "deemed-export"],
    text: `Transfer of controlled technology, including technical data, software, and know-how, is subject to export licensing requirements. Deemed exports occur when controlled technology is shared with foreign nationals within Malaysia. Training programs, technical support, and maintenance services may constitute controlled technology transfers requiring appropriate authorizations.`
  },
  {
    title: "Penalty Framework and Enforcement",
    section: "Part VI",
    country: "MY",
    tags: ["penalties", "enforcement", "violations"],
    text: `Violations of strategic trade controls may result in criminal penalties up to RM 1 million and/or imprisonment up to 7 years. Administrative penalties include license suspension, revocation, and civil fines. Voluntary self-disclosure of violations may result in reduced penalties. Companies must maintain compliance programs and conduct regular internal audits to prevent violations.`
  },
  {
    title: "Special Administrative Region Considerations",
    section: "Schedule 3",
    country: "MY",
    tags: ["hong-kong", "macau", "special-regions"],
    text: `Exports to Hong Kong and Macau Special Administrative Regions may be subject to additional scrutiny due to their proximity to mainland China. Enhanced due diligence is required for end-user verification. Transshipment through these regions requires careful documentation of ultimate destinations and end-uses to ensure compliance with strategic trade controls.`
  }
];

/**
 * Seed the knowledge base with sample data
 */
async function seedKnowledge() {
  console.log('🌱 Starting knowledge base seeding...');
  
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.warn('⚠️  OpenAI API key not configured. Seeding will use fake embeddings.');
    }

    let successCount = 0;
    let errorCount = 0;

    for (const chunk of sampleKnowledgeChunks) {
      try {
        console.log(`📄 Processing: ${chunk.title}`);
        const chunkId = await storeKnowledgeChunk(chunk, pool);
        console.log(`✅ Stored chunk: ${chunkId}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error storing chunk "${chunk.title}":`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Seeding completed!`);
    console.log(`✅ Successfully stored: ${successCount} chunks`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} chunks`);
    }

    // Create index for better performance
    try {
      console.log('🔧 Creating vector index...');
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_kn_emb 
        ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_kn_country ON knowledge_chunks (country);
      `);
      
      await pool.query('ANALYZE knowledge_chunks;');
      console.log('✅ Vector index created successfully');
    } catch (indexError) {
      console.warn('⚠️  Could not create vector index:', indexError.message);
    }

  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Clear existing knowledge base
 */
async function clearKnowledge() {
  console.log('🗑️  Clearing existing knowledge base...');
  try {
    const result = await pool.query('DELETE FROM knowledge_chunks');
    console.log(`✅ Cleared ${result.rowCount} existing chunks`);
  } catch (error) {
    console.error('❌ Error clearing knowledge base:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clear')) {
    await clearKnowledge();
  }
  
  await seedKnowledge();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { seedKnowledge, clearKnowledge };

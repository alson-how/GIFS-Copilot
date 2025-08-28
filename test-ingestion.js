/**
 * Test script for knowledge ingestion
 * Run this to test the ingestion process with a few sample files
 */
import 'dotenv/config';
import pkg from 'pg';
import { answerFromRAG } from './backend/src/services/rag.js';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testIngestion() {
  console.log('🧪 Testing Knowledge Ingestion and RAG...\n');

  try {
    // Test queries related to the ingested knowledge
    const testQueries = [
      "What is the Strategic Trade Act 2010?",
      "What are the export procedures in Malaysia?", 
      "What customs forms are required for export?",
      "What is SIRIM and what do they do?",
      "How do I get an export permit?",
      "What documentation is needed for customs clearance?"
    ];

    for (const query of testQueries) {
      console.log(`❓ Query: ${query}`);
      console.log('⏳ Processing...\n');

      try {
        const result = await answerFromRAG(query, pool);
        
        console.log('📝 Answer:');
        console.log(result.answer);
        console.log('\n📚 Sources:');
        
        if (result.sources && result.sources.length > 0) {
          result.sources.forEach((source, index) => {
            console.log(`${index + 1}. ${source.title}`);
            console.log(`   Section: ${source.section}`);
            console.log(`   Similarity: ${source.similarity_score}`);
            console.log(`   Tags: ${source.tags?.join(', ') || 'none'}`);
            if (source.preview) {
              console.log(`   Preview: ${source.preview.substring(0, 100)}...`);
            }
          });
        } else {
          console.log('No sources found');
        }

        if (result.metadata) {
          console.log('\n🔧 Metadata:');
          console.log(`- Chunks retrieved: ${result.metadata.chunks_retrieved}`);
          console.log(`- Country: ${result.metadata.country}`);
          console.log(`- Model: ${result.metadata.model_used}`);
        }

        if (result.error) {
          console.log(`\n⚠️  Error: ${result.error}`);
        }

      } catch (error) {
        console.error('❌ Error:', error.message);
      }

      console.log('\n' + '='.repeat(80) + '\n');
    }

    // Get knowledge base statistics
    console.log('📊 Knowledge Base Statistics:');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT country) as countries,
        array_agg(DISTINCT unnest(tags)) as all_tags,
        AVG(length(text)) as avg_chunk_size
      FROM knowledge_chunks
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log(`   Total chunks: ${stats.total_chunks}`);
    console.log(`   Countries: ${stats.countries}`);
    console.log(`   Average chunk size: ${Math.round(stats.avg_chunk_size)} characters`);
    console.log(`   Unique tags: ${stats.all_tags?.filter(tag => tag).length || 0}`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }

  console.log('✅ Ingestion testing completed!');
}

testIngestion().catch(console.error);

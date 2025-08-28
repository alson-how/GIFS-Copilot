/**
 * Simple test script for RAG functionality
 * Run this to test the OpenAI integration
 */
import 'dotenv/config';
import pkg from 'pg';
import { answerFromRAG } from './backend/src/services/rag.js';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testRAG() {
  console.log('🧪 Testing RAG functionality...\n');

  const testQueries = [
    "What are the requirements for exporting AI chips?",
    "How do I conduct end user screening?",
    "What documentation is needed for semiconductor exports?",
    "What are the penalties for export violations?"
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
          console.log(`${index + 1}. ${source.title} (Section ${source.section}) - Score: ${source.similarity_score}`);
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

  await pool.end();
  console.log('✅ RAG testing completed!');
}

testRAG().catch(console.error);

/**
 * RAG Chatbot Utility
 * Reusable RAG chatbot functionality for answering user queries
 * using knowledge retrieval and OpenAI chat completion
 */

import { answerFromRAG } from '../services/rag.js';
import pkg from 'pg';

const { Pool } = pkg;

/**
 * Initialize database pool for RAG operations
 * @returns {Pool} PostgreSQL connection pool
 */
function createRagPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL
  });
}

/**
 * Process user query using RAG chatbot
 * @param {string} query - User's question or query
 * @param {Object} options - Configuration options
 * @param {string} options.country - Country code for localized responses (default: 'MY')
 * @param {boolean} options.includeContext - Include source context in response (default: true)
 * @param {number} options.maxResults - Maximum number of knowledge chunks to retrieve (default: 3)
 * @param {Pool} options.pool - Optional database pool (will create new if not provided)
 * @returns {Promise<Object>} RAG response with answer and sources
 */
export async function processRagQuery(query, options = {}) {
  const {
    country = 'MY',
    includeContext = true,
    maxResults = 3,
    pool = null
  } = options;

  // Use provided pool or create a new one
  const dbPool = pool || createRagPool();
  
  try {
    console.log(`🤖 Processing RAG query: "${query}"`);
    
    // Use the existing RAG service
    const ragResponse = await answerFromRAG(query, dbPool, country);
    
    // Format the response
    const response = {
      success: true,
      query: query,
      answer: ragResponse.answer,
      confidence: ragResponse.confidence || 1,
      sources: ragResponse.sources || [],
      country: country,
      timestamp: new Date().toISOString()
    };
    
    if (includeContext && ragResponse.context) {
      response.context = ragResponse.context;
    }
    
    console.log(`✅ RAG query processed successfully`);
    return response;
    
  } catch (error) {
    console.error('❌ RAG query processing error:', error);
    
    return {
      success: false,
      query: query,
      error: error.message,
      answer: "I'm sorry, I couldn't process your query at the moment. Please try again or contact support.",
      sources: [],
      timestamp: new Date().toISOString()
    };
  } finally {
    // Close pool only if we created it (not provided)
    if (!pool && dbPool) {
      try {
        await dbPool.end();
      } catch (closeError) {
        console.warn('Warning: Error closing RAG database pool:', closeError);
      }
    }
  }
}

/**
 * Process multiple RAG queries in batch
 * @param {string[]} queries - Array of user queries
 * @param {Object} options - Configuration options (same as processRagQuery)
 * @returns {Promise<Object[]>} Array of RAG responses
 */
export async function processBatchRagQueries(queries, options = {}) {
  const dbPool = createRagPool();
  
  try {
    console.log(`🤖 Processing ${queries.length} RAG queries in batch`);
    
    const responses = await Promise.all(
      queries.map(query => processRagQuery(query, { ...options, pool: dbPool }))
    );
    
    console.log(`✅ Batch RAG queries processed successfully`);
    return responses;
    
  } finally {
    try {
      await dbPool.end();
    } catch (closeError) {
      console.warn('Warning: Error closing batch RAG database pool:', closeError);
    }
  }
}

/**
 * Simple RAG chatbot function - most commonly used
 * @param {string} query - User's question
 * @param {string} country - Country code (default: 'MY')
 * @returns {Promise<string>} Simple text response
 */
export async function askRagChatbot(query, country = 'MY') {
  try {
    const response = await processRagQuery(query, { 
      country, 
      includeContext: false, 
      maxResults: 3 
    });
    
    return response.success ? response.answer : response.error;
  } catch (error) {
    console.error('❌ Simple RAG chatbot error:', error);
    return "I'm sorry, I couldn't process your question. Please try again.";
  }
}

/**
 * RAG chatbot with sources - useful for transparency
 * @param {string} query - User's question
 * @param {string} country - Country code (default: 'MY')
 * @returns {Promise<Object>} Response with answer and sources
 */
export async function askRagChatbotWithSources(query, country = 'MY') {
  return await processRagQuery(query, { 
    country, 
    includeContext: true, 
    maxResults: 5 
  });
}

/**
 * Check if RAG system is available
 * @returns {boolean} True if RAG system is properly configured
 */
export function isRagAvailable() {
  return !!(process.env.OPENAI_API_KEY && process.env.DATABASE_URL);
}

// Export commonly used patterns
export const RAG_PATTERNS = {
  EXPORT_QUERIES: [
    'export requirements',
    'shipping to',
    'export permit',
    'customs documentation',
    'trade compliance'
  ],
  STATUS_QUERIES: [
    'status of',
    'track shipment',
    'where is my',
    'delivery status'
  ],
  QUOTE_QUERIES: [
    'quote for',
    'cost of',
    'pricing for',
    'how much',
    'estimate'
  ]
};

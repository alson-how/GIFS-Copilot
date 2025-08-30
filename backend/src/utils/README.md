# Backend Utils

This directory contains reusable utility functions for the GIFS Logistics Copilot backend.

## RAG Chatbot Utility (`ragChatbot.js`)

A reusable RAG (Retrieval-Augmented Generation) chatbot utility that provides intelligent responses to user queries using knowledge retrieval and OpenAI chat completion.

### Features

- **Knowledge Retrieval**: Uses pgvector for semantic search across stored knowledge chunks
- **OpenAI Integration**: Leverages GPT models for generating contextual responses
- **Connection Management**: Handles database connections efficiently
- **Error Handling**: Graceful fallbacks when services are unavailable
- **Multiple Usage Patterns**: Simple text responses or detailed responses with sources

### Usage Examples

#### Simple Text Response

```javascript
import { askRagChatbot } from '../utils/ragChatbot.js';

// Get a simple text response
const answer = await askRagChatbot("What are the export requirements for Malaysia?");
console.log(answer);
```

#### Detailed Response with Sources

```javascript
import { askRagChatbotWithSources } from '../utils/ragChatbot.js';

// Get detailed response with source citations
const response = await askRagChatbotWithSources("What documents are needed for export?", "MY");

if (response.success) {
  console.log("Answer:", response.answer);
  console.log("Sources:", response.sources);
  console.log("Confidence:", response.confidence);
} else {
  console.error("Error:", response.error);
}
```

#### Advanced Usage with Custom Options

```javascript
import { processRagQuery } from '../utils/ragChatbot.js';

const response = await processRagQuery("Export permit requirements", {
  country: 'SG',           // Country code for localized responses
  includeContext: true,    // Include source context in response
  maxResults: 5,          // Maximum knowledge chunks to retrieve
  pool: existingPool      // Use existing database pool
});
```

#### Batch Processing

```javascript
import { processBatchRagQueries } from '../utils/ragChatbot.js';

const queries = [
  "What is HS code classification?",
  "How to apply for export permit?",
  "Strategic trade requirements"
];

const responses = await processBatchRagQueries(queries, { country: 'MY' });
responses.forEach((response, index) => {
  console.log(`Query ${index + 1}:`, response.answer);
});
```

### API Reference

#### `askRagChatbot(query, country)`
Simple RAG chatbot function - most commonly used.
- **Parameters:**
  - `query` (string): User's question
  - `country` (string, optional): Country code (default: 'MY')
- **Returns:** Promise<string> - Simple text response

#### `askRagChatbotWithSources(query, country)`
RAG chatbot with sources - useful for transparency.
- **Parameters:**
  - `query` (string): User's question  
  - `country` (string, optional): Country code (default: 'MY')
- **Returns:** Promise<Object> - Response with answer and sources

#### `processRagQuery(query, options)`
Process user query using RAG chatbot with full control.
- **Parameters:**
  - `query` (string): User's question or query
  - `options` (Object, optional): Configuration options
    - `country` (string): Country code (default: 'MY')
    - `includeContext` (boolean): Include source context (default: true)
    - `maxResults` (number): Max knowledge chunks to retrieve (default: 3)
    - `pool` (Pool): Optional database pool
- **Returns:** Promise<Object> - RAG response with answer and sources

#### `processBatchRagQueries(queries, options)`
Process multiple RAG queries in batch.
- **Parameters:**
  - `queries` (string[]): Array of user queries
  - `options` (Object, optional): Same as processRagQuery options
- **Returns:** Promise<Object[]> - Array of RAG responses

#### `isRagAvailable()`
Check if RAG system is available.
- **Returns:** boolean - True if RAG system is properly configured

### Response Format

The detailed response object includes:

```javascript
{
  success: true,
  query: "What are export requirements?",
  answer: "The export requirements include...",
  confidence: 0.95,
  sources: [
    {
      id: "uuid",
      title: "Export Procedure Guide",
      section: "knowledge://export_procedure.md#chunk1",
      similarity_score: "0.89",
      tags: ["export", "customs", "documentation"],
      preview: "Export requirements include..."
    }
  ],
  country: "MY",
  timestamp: "2025-01-15T10:30:00.000Z"
}
```

### Environment Variables

The RAG utility requires these environment variables:

```bash
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/database
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Optional
OPENAI_MODEL=gpt-4o-mini                        # Optional
RAG_MAX_CHUNKS=5                                # Optional
RAG_SIMILARITY_THRESHOLD=0.7                    # Optional
```

### Error Handling

The utility provides graceful error handling:

- Returns structured error responses when processing fails
- Automatically closes database connections
- Provides fallback messages when OpenAI is unavailable
- Logs errors for debugging while maintaining user-friendly responses

### Integration Examples

#### Express Route Integration

```javascript
import express from 'express';
import { askRagChatbotWithSources } from '../utils/ragChatbot.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { query } = req.body;
  
  try {
    const response = await askRagChatbotWithSources(query, 'MY');
    
    if (response.success) {
      res.json({
        success: true,
        answer: response.answer,
        sources: response.sources
      });
    } else {
      res.status(500).json({
        success: false,
        error: response.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
```

#### Document Processing Fallback

```javascript
import { askRagChatbotWithSources } from '../utils/ragChatbot.js';

// When document is not a Commercial Invoice, fallback to RAG
if (!isCommercialInvoice) {
  const ragResponse = await askRagChatbotWithSources(userQuery, 'MY');
  
  return {
    type: 'chatbot_response',
    message: 'Let me help you with your question instead.',
    answer: ragResponse.answer,
    sources: ragResponse.sources
  };
}
```

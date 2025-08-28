# OpenAI Integration Guide

This document explains the OpenAI integration in the GIFS Logistics Copilot system, including RAG (Retrieval-Augmented Generation) functionality.

## Overview

The system integrates OpenAI's API to provide intelligent, context-aware responses to logistics compliance questions. It uses:

- **Embeddings**: `text-embedding-3-small` for semantic search
- **Chat Completion**: `gpt-4o-mini` for generating responses
- **Vector Database**: PostgreSQL with pgvector for similarity search

## Features

### 🧠 RAG (Retrieval-Augmented Generation)
- Semantic search through logistics compliance knowledge base
- Context-aware answer generation
- Source citation and confidence scoring
- Support for multiple countries and languages

### 📚 Knowledge Management
- Automated embedding generation for new content
- Vector similarity search with configurable thresholds
- Knowledge chunk storage with metadata and tags

### 🔧 Fallback Mechanisms
- Graceful degradation when OpenAI API is unavailable
- Fake embeddings for development/testing
- Error handling and retry logic

## Configuration

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-your-actual-openai-api-key

# Optional (with defaults)
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
RAG_MAX_CHUNKS=5
RAG_SIMILARITY_THRESHOLD=0.7
```

### Database Schema

The system uses PostgreSQL with pgvector extension:

```sql
CREATE TABLE knowledge_chunks (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  section text DEFAULT '',
  country text DEFAULT 'MY',
  tags text[] DEFAULT '{}',
  text text NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## API Usage

### Policy Query Endpoint

```http
GET /api/policy/answer?q=your-question-here
```

**Example Request:**
```bash
curl "http://localhost:8080/api/policy/answer?q=What%20are%20the%20requirements%20for%20exporting%20AI%20chips?"
```

**Example Response:**
```json
{
  "answer": "Based on Malaysian export policy, AI chips are subject to Strategic Trade Act 2010 controls...",
  "sources": [
    {
      "id": "uuid-here",
      "title": "Strategic Trade Act 2010 - AI Chip Controls",
      "section": "Part III",
      "similarity_score": "0.892",
      "tags": ["strategic-trade", "ai-chips"],
      "preview": "Under the Strategic Trade Act 2010, artificial intelligence accelerator chips..."
    }
  ],
  "metadata": {
    "chunks_retrieved": 3,
    "country": "MY",
    "model_used": "gpt-4o-mini",
    "embedding_model": "text-embedding-3-small"
  }
}
```

## Implementation Details

### RAG Service (`backend/src/services/rag.js`)

The main RAG service provides:

#### Core Functions

1. **`answerFromRAG(query, pool, country)`**
   - Main entry point for RAG queries
   - Retrieves relevant knowledge chunks
   - Generates contextual responses

2. **`generateEmbedding(text)`**
   - Creates embeddings using OpenAI API
   - Falls back to fake embeddings if API unavailable

3. **`storeKnowledgeChunk(chunk, pool)`**
   - Stores new knowledge with embeddings
   - Handles metadata and tags

4. **`retrieveKnowledgeChunks(query, pool, country)`**
   - Vector similarity search
   - Configurable similarity thresholds
   - Country-based filtering

#### Error Handling

- API rate limiting and retry logic
- Graceful degradation when OpenAI is unavailable
- Comprehensive error messages and logging

### Knowledge Seeding

The system includes sample logistics compliance data:

```bash
# Seed sample knowledge
npm run seed-knowledge

# Clear existing knowledge
npm run clear-knowledge
```

Sample knowledge includes:
- Strategic Trade Act 2010 requirements
- AI chip export controls
- End-user screening procedures
- Documentation requirements
- Penalty frameworks

## Testing

### RAG Test Script

Run the included test script to verify functionality:

```bash
node test-rag.js
```

This tests various query types and displays:
- Generated answers
- Source citations
- Similarity scores
- Performance metadata

### Manual Testing

Test individual components:

```javascript
import { answerFromRAG } from './backend/src/services/rag.js';

const result = await answerFromRAG(
  "What documentation is needed for semiconductor exports?",
  pool,
  "MY"
);
```

## Performance Optimization

### Vector Indexing

The system creates IVFFLAT indexes for better performance:

```sql
CREATE INDEX idx_kn_emb 
ON knowledge_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### Caching Strategies

Consider implementing:
- Embedding caching for repeated queries
- Response caching for common questions
- Connection pooling for database access

### Monitoring

Track key metrics:
- Query response times
- Embedding generation latency
- Vector similarity search performance
- OpenAI API usage and costs

## Cost Management

### OpenAI Usage

- **Embeddings**: ~$0.00002 per 1K tokens
- **Chat Completion**: ~$0.00015 per 1K tokens (gpt-4o-mini)
- **Typical query cost**: $0.001-0.005 per question

### Optimization Tips

1. **Batch embeddings** when possible
2. **Cache common queries** to reduce API calls
3. **Use cheaper models** for development (gpt-3.5-turbo)
4. **Implement query preprocessing** to reduce token usage
5. **Set usage limits** in OpenAI dashboard

## Security Considerations

### API Key Management

- Store API keys in environment variables only
- Use secrets management in production
- Rotate keys regularly
- Monitor usage for anomalies

### Data Privacy

- Knowledge base may contain sensitive compliance data
- Implement access controls and audit logging
- Consider data residency requirements
- Review OpenAI's data usage policies

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Set `OPENAI_API_KEY` in environment variables
   - Verify key is valid and has sufficient credits

2. **"Vector dimension mismatch"**
   - Ensure database schema matches embedding model
   - Run schema migration if needed

3. **"No relevant chunks found"**
   - Check similarity threshold settings
   - Verify knowledge base is populated
   - Try different query phrasing

4. **Poor answer quality**
   - Adjust similarity threshold
   - Improve knowledge base content
   - Experiment with different prompts

### Debug Mode

Enable verbose logging:

```env
NODE_ENV=development
DEBUG=rag:*
```

## Future Enhancements

### Planned Features

- Multi-language support
- Advanced query preprocessing
- Custom fine-tuned models
- Real-time knowledge updates
- Analytics dashboard

### Integration Opportunities

- Document processing pipeline
- Compliance workflow automation
- Multi-modal capabilities (images, PDFs)
- Integration with external data sources

## Support

For issues related to OpenAI integration:

1. Check the logs: `docker-compose logs backend`
2. Verify API key and credits
3. Test with simple queries first
4. Review OpenAI API documentation
5. Check system resource usage

## K2 Customs Form Integration

### Overview
The system includes a comprehensive Malaysian Customs K2 Export Declaration Form generator that integrates with the compliance workflow.

### Features
- **Interactive Form**: Full bilingual (BM/EN) K2 form with all 54 fields
- **Dynamic Items Table**: Add/remove items with auto-calculated totals
- **PDF Generation**: Backend service generates filled PDF using pdf-lib
- **Print Support**: Browser-friendly printing with clean layout
- **Live Preview**: Real-time JSON preview of form data

### Usage

1. **Access the Form**:
   - Navigate to Step 4 (Documentation & Classification)
   - Click "📝 Generate K2" button
   - Form appears in expandable section

2. **Fill the Form**:
   - Complete all required sections (1-54)
   - Add items to the goods table
   - Totals calculate automatically

3. **Generate PDF**:
   - Click "📄 Generate K2 PDF"
   - System sends data to backend
   - PDF downloads automatically

### API Endpoints

```
POST /api/k2/render
- Generates filled K2 PDF from form data
- Returns: PDF file download

POST /api/k2/calibrate  
- Generates calibration grid for coordinate tuning
- Returns: PDF with overlay grid
```

### Backend Integration
- Route: `backend/src/routes/form_k2.js`
- Uses pdf-lib for PDF manipulation
- Coordinate-based field positioning
- Supports checkbox marking and text fields

### File Structure
```
frontend/src/components/FormK2.jsx    # React form component
backend/src/routes/form_k2.js         # PDF generation service
```

## References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL Vector Operations](https://www.postgresql.org/docs/current/functions-array.html)
- [pdf-lib Documentation](https://pdf-lib.js.org/)

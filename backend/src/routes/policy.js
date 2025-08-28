import express from 'express';
import multer from 'multer';
import { answerFromRAG } from '../services/rag.js';
import OpenAI from 'openai';
const router = express.Router();

// Configure multer for temporary file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

router.get('/answer', async (req,res)=>{
  const q = (req.query.q || '').toString();
  if(!q) return res.status(400).json({ error: 'q required' });
  const { answer, sources } = await answerFromRAG(q, req.db);
  res.json({ answer, sources });
});

// Step 2 data structure for OpenAI processing
const STEP2_DATA_STRUCTURE = {
  shipment_id: "uuid",
  hs_code: "string (8-digit HS classification code)",
  product_type: "enum: standard_ic_asics | memory_nand_dram | discrete_semiconductors | pcbas_modules | ai_accelerator_gpu_tpu_npu | unsure",
  tech_origin: "enum: malaysia | us_origin | eu_origin | mixed | unknown",
  is_strategic: "boolean (whether item is strategic under STA 2010)",
  extraction_json: {
    specialization: "array of strings (product specializations)",
    capabilities: "array of strings (technical capabilities)",
    restrictions: "array of strings (export restrictions)",
    notes: "string (additional notes)"
  }
};

// File processing endpoint
router.post('/process-files', upload.array('files', 10), async (req, res) => {
  try {
    const { query } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!openai) {
      return res.status(400).json({ 
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable.' 
      });
    }

    // Process text files only for now
    const textFiles = files.filter(file => 
      file.mimetype === 'text/plain' || 
      file.mimetype === 'application/json' ||
      file.mimetype === 'text/csv' ||
      file.originalname.endsWith('.txt') ||
      file.originalname.endsWith('.json') ||
      file.originalname.endsWith('.csv')
    );

    if (textFiles.length === 0) {
      return res.status(400).json({ 
        error: 'No supported text files found. Please upload TXT, JSON, or CSV files.' 
      });
    }

    // Extract text content from files
    const fileContents = textFiles.map(file => ({
      filename: file.originalname,
      content: file.buffer.toString('utf-8')
    }));

    // Prepare OpenAI prompt
    const systemPrompt = `You are an expert in Malaysian export compliance and semiconductor trade regulations. 

You will analyze uploaded order/shipment documents and extract information according to the following data structure:

${JSON.stringify(STEP2_DATA_STRUCTURE, null, 2)}

Key Guidelines:
1. Extract HS codes if mentioned in the documents
2. Identify product types based on descriptions
3. Determine technology origin from manufacturer/supplier information
4. Assess if items are strategic under Malaysia's Strategic Trade Act 2010
5. Extract technical specifications and capabilities
6. Identify any export restrictions or compliance requirements

Return a JSON response with the extracted data and a summary explanation.`;

    const userPrompt = `${query}

Please analyze the following files and extract compliance information:

${fileContents.map(file => `
--- ${file.filename} ---
${file.content}
`).join('\n')}

Please return:
1. A structured JSON object following the data structure provided
2. A detailed explanation of your analysis
3. Any compliance recommendations`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content || 'No response generated';
    
    // Try to extract JSON from response
    let processedData = null;
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        processedData = JSON.parse(jsonMatch[1]);
      }
    } catch (e) {
      console.log('Could not parse JSON from OpenAI response:', e.message);
    }

    res.json({
      answer: response,
      processedData: processedData,
      filesProcessed: fileContents.map(f => f.filename),
      sources: [{
        title: 'OpenAI File Analysis',
        section: 'Document Processing',
        similarity_score: 1.0,
        preview: `Analyzed ${fileContents.length} file(s): ${fileContents.map(f => f.filename).join(', ')}`
      }]
    });

  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ 
      error: 'Failed to process files: ' + error.message 
    });
  }
});

export default router;

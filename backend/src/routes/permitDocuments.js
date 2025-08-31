import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Initialize OpenAI client conditionally (following project pattern)
let openai = null;
if (process.env.OPENAI_API_KEY && 
    process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' && 
    process.env.OPENAI_API_KEY !== 'placeholder') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// ---------- Upload (unchanged except comments) ----------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'permits');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `permit-${uniqueSuffix}-${baseName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, image, and text files are allowed'), false);
  }
});

// ---------- Helpers: PDF→PNG (Poppler), OCR (Tesseract), Extract Text ----------
async function runPdftoppmToPng(pdfPath, outPrefix, dpi = 300) {
  await new Promise((resolve, reject) => {
    const p = spawn('pdftoppm', ['-png', '-r', String(dpi), pdfPath, outPrefix], { stdio: 'ignore' });
    p.on('close', code => (code === 0 ? resolve() : reject(new Error('pdftoppm failed or not installed'))));
  });

  // Collect generated pages
  const dir = path.dirname(outPrefix);
  const base = path.basename(outPrefix);
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(path.basename(base)) && f.endsWith('.png'))
    .map(f => path.join(dir, f))
    .sort((a, b) => {
      // sort by trailing page number
      const pa = Number((a.match(/-(\d+)\.png$/) || [])[1] || 0);
      const pb = Number((b.match(/-(\d+)\.png$/) || [])[1] || 0);
      return pa - pb;
    });
  return files;
}

async function ocrImage(imgPath) {
  const { data } = await Tesseract.recognize(imgPath, 'eng', {
    tessedit_char_whitelist: undefined, // full set; tweak if needed
  });
  return (data?.text || '').trim();
}

async function extractTextFromPdfOrImage(filePath, mimeType) {
  // 1) Fast path for text PDFs
  if (mimeType === 'application/pdf') {
    try {
      const buf = fs.readFileSync(filePath);
      const parsed = await pdfParse(buf);
      const raw = (parsed.text || '').trim();
      if (raw.length >= 120) {
        return { raw_text: raw, page_count: parsed.numpages, extraction_method: 'pdf-parse' };
      }
    } catch (e) {
      // continue to OCR fallback
    }

    // 2) OCR fallback for scanned PDFs
    const tmpPrefix = path.join('/tmp', `ocr-${path.basename(filePath, path.extname(filePath))}`);
    const pngPages = await runPdftoppmToPng(filePath, tmpPrefix, 300);
    if (pngPages.length === 0) throw new Error('No pages produced for OCR');
    let text = '';
    for (const img of pngPages) {
      const pageText = await ocrImage(img);
      text += '\n' + pageText;
      try { fs.unlinkSync(img); } catch {}
    }
    return { raw_text: text.trim(), page_count: pngPages.length, extraction_method: 'ocr-tesseract' };
  }

  // 3) Direct OCR for images
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/png') {
    const t = await ocrImage(filePath);
    return { raw_text: t, page_count: 1, extraction_method: 'ocr-tesseract' };
  }

  // 4) Direct text for text files (for testing)
  if (mimeType === 'text/plain') {
    const text = fs.readFileSync(filePath, 'utf-8');
    return { raw_text: text, page_count: 1, extraction_method: 'direct-text' };
  }

  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

// ---------- LLM: Enhanced Structured Extraction Schema ----------
const schema = {
  name: "DocumentExtraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
      document_type: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      permit_info: {
        type: "object",
        properties: {
          permit_no: { type: ["string", "null"] },
          permit_type: { type: ["string", "null"] },
          issue_date: { type: ["string", "null"] },
          expiry_date: { type: ["string", "null"] },
          issuing_authority: { type: ["string", "null"] }
        },
        required: ["permit_no", "permit_type", "issue_date", "expiry_date", "issuing_authority"],
        additionalProperties: false
      },
      exporter_info: {
        type: "object",
        properties: {
          company_name: { type: ["string", "null"] },
          registration_no: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          contact_person: { type: ["string", "null"] }
        },
        required: ["company_name", "registration_no", "address", "contact_person"],
        additionalProperties: false
      },
      end_user_info: {
        type: "object",
        properties: {
          company_name: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          end_use: { type: ["string", "null"] }
        },
        required: ["company_name", "country", "address", "end_use"],
        additionalProperties: false
      },
      strategic_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: ["string", "null"] },
            control_code: { type: ["string", "null"] },
            hs_code: { type: ["string", "null"] },
            quantity: { type: ["number", "null"] },
            unit_value_usd: { type: ["number", "null"] },
            total_value_usd: { type: ["number", "null"] }
          },
          required: ["description", "control_code", "hs_code", "quantity", "unit_value_usd", "total_value_usd"],
          additionalProperties: false
        }
      },
      total_export_value_usd: { type: ["number", "null"] },
      customs_info: {
        type: "object",
        properties: {
          port_of_export: { type: ["string", "null"] },
          expected_export_date: { type: ["string", "null"] },
          mode_of_transport: { type: ["string", "null"] }
        },
        required: ["port_of_export", "expected_export_date", "mode_of_transport"],
        additionalProperties: false
      },
      permit_conditions: {
        type: "array",
        items: { type: "string" }
      },
      notes: { type: ["string", "null"] }
    },
    required: ["document_type", "confidence", "permit_info", "exporter_info", "end_user_info", "strategic_items", "total_export_value_usd", "customs_info", "permit_conditions", "notes"],
    additionalProperties: false
  }
};

async function extractWithLLM(rawText) {
  // Check if OpenAI is configured
  if (!openai) {
    console.warn('⚠️ OpenAI API not configured, using fallback extraction');
    return {
      document_type: 'Unknown Document',
      confidence: 0.3,
      permit_info: {
        permit_no: null,
        permit_type: null,
        issue_date: null,
        expiry_date: null,
        issuing_authority: null
      },
      exporter_info: {
        company_name: null,
        registration_no: null,
        address: null,
        contact_person: null
      },
      end_user_info: {
        company_name: null,
        country: null,
        address: null,
        end_use: null
      },
      strategic_items: [],
      total_export_value_usd: null,
      customs_info: {
        port_of_export: null,
        expected_export_date: null,
        mode_of_transport: null
      },
      permit_conditions: [],
      notes: 'OpenAI API not configured - using basic text extraction'
    };
  }

  // Truncate to keep tokens reasonable; keep the most relevant head/tail if huge
  const maxChars = process.env.MAX_TEXT_CHARS || 12000;
  let text = rawText || '';
  if (text.length > maxChars) {
    const head = text.slice(0, Math.floor(maxChars * 0.7));
    const tail = text.slice(-Math.floor(maxChars * 0.3));
    text = head + '\n...\n' + tail;
  }

  const sys = `You are a precise document analyst specializing in strategic trade permits and export documentation. 

Extract comprehensive information from the document and return JSON ONLY that matches the given schema. Focus on:

1. PERMIT INFORMATION: permit number, type (single-use/multiple-use), issue/expiry dates, issuing authority
2. EXPORTER DETAILS: company name, registration number, address, contact person
3. END-USER DETAILS: company name, country, address, intended end-use
4. STRATEGIC ITEMS: detailed list with descriptions, control codes, HS codes, quantities, values
5. CUSTOMS INFORMATION: port of export, expected export date, transport mode
6. PERMIT CONDITIONS: list of conditions and restrictions
7. TOTAL VALUES: calculate total export value from individual items

Document types to classify: Strategic Trade Act Permit, Export Permit, Import Permit, Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin, Insurance Certificate, or Other.

Extract ALL available information - be comprehensive and detailed. Convert dates to standard format. Calculate totals where possible.`;

  const user = `Document text:
"""${text}"""`;

  const res = await openai.chat.completions.create({
    model: process.env.LLM_EXTRACTION_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    response_format: { type: 'json_schema', json_schema: schema }
  });

  const json = JSON.parse(res.choices[0].message.content);
  return json;
}

// ---------- Optional: basic sanity checks for totals ----------
function validateTotals(entitiesNum = {}) {
  const { subtotal, freight, insurance, total_cif } = entitiesNum;
  if ([subtotal, freight, insurance, total_cif].some(v => typeof v !== 'number')) return { ok: false, reason: 'missing numbers' };
  const sum = (subtotal || 0) + (freight || 0) + (insurance || 0);
  const ok = Math.abs(sum - total_cif) < 0.01;
  return { ok, expected: sum, got: total_cif };
}

// ---------- POST /api/permit-documents/upload ----------
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    console.log('📤 Processing upload:', req.file.originalname, req.file.mimetype);

    // 1) Text Extraction (pdf-parse → OCR fallback)
    const textData = await extractTextFromPdfOrImage(req.file.path, req.file.mimetype);
    if (!textData.raw_text || textData.raw_text.trim().length === 0) {
      throw new Error('No text extracted from file');
    }

    // 2) LLM Structured Extraction
    const llm = await extractWithLLM(textData.raw_text);

    // 3) Map to legacy permit fields (for DB columns) where possible
    const permitFields = {
      permit_number: llm?.permit_info?.permit_no || null,
      issue_date: llm?.permit_info?.issue_date || null,
      expiry_date: llm?.permit_info?.expiry_date || null,
      issuing_authority: llm?.permit_info?.issuing_authority || null,
      permit_type: llm?.permit_info?.permit_type || llm?.document_type || null,
      confidence: typeof llm?.confidence === 'number' ? llm.confidence : 0.6
    };

    // Optional: validation metadata
    const validation = { extraction_method: textData.extraction_method };

    // 4) Save to DB
    const insertQuery = `
      INSERT INTO permit_documents (
        document_name, original_filename, file_path, file_size, mime_type,
        permit_number, issue_date, expiry_date, issuing_authority, permit_type,
        ocr_confidence, ocr_raw_text, ocr_extracted_fields
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING document_id, document_name, permit_number, issue_date, expiry_date, uploaded_at
    `;

    const values = [
      path.basename(req.file.originalname, path.extname(req.file.originalname)),
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      permitFields.permit_number,
      permitFields.issue_date,
      permitFields.expiry_date,
      permitFields.issuing_authority,
      permitFields.permit_type,
      permitFields.confidence,
      textData.raw_text,
      JSON.stringify({ llm_output: llm, text_extraction: textData, validation })
    ];

    const result = await req.db.query(insertQuery, values);
    const saved = result.rows[0];

    return res.json({
      success: true,
      message: 'Document uploaded and extracted successfully',
      data: {
        document_id: saved.document_id,
        document_name: saved.document_name,
        uploaded_at: saved.uploaded_at,
        doc_type: llm.document_type,
        confidence: llm.confidence,
        extraction_method: validation.extraction_method,
        permit_fields: permitFields,
        permit_info: llm.permit_info,
        exporter_info: llm.exporter_info,
        end_user_info: llm.end_user_info,
        strategic_items: llm.strategic_items,
        total_export_value_usd: llm.total_export_value_usd,
        customs_info: llm.customs_info,
        permit_conditions: llm.permit_conditions,
        extracted_data: llm
      }
    });

  } catch (error) {
    console.error('❌ Error processing document:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process document',
      details: error.message
    });
  }
});

// ---------- GET endpoints (unchanged) ----------
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        document_id,
        document_name,
        original_filename,
        permit_number,
        issue_date,
        expiry_date,
        issuing_authority,
        permit_type,
        ocr_confidence,
        uploaded_at
      FROM permit_documents 
      ORDER BY uploaded_at DESC
    `;
    const result = await req.db.query(query);
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error fetching permit documents:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch permit documents', details: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await req.db.query(`SELECT * FROM permit_documents WHERE document_id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Permit document not found' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error fetching permit document:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch permit document', details: error.message });
  }
});

export default router;

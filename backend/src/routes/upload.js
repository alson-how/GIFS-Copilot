import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';

const router = express.Router();

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const shipmentId = (req.body.shipment_id || 'unknown').replace(/[^a-zA-Z0-9-_]/g,'');
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, `${shipmentId}_${ts}_${safe}`);
  }
});
const upload = multer({ storage });

// POST /api/uploads  (multipart/form-data)
// fields: shipment_id (text), tag (text), files[] (file)
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { shipment_id, tag } = req.body;
    if (!shipment_id) return res.status(400).json({ error: 'shipment_id is required' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'no files' });

    const inserts = [];
    for (const f of req.files) {
      const q = `
        INSERT INTO shipment_files (shipment_id, tag, original_name, mime_type, file_path, size_bytes)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id, original_name, mime_type, file_path, size_bytes, uploaded_at`;
      const r = await req.db.query(q, [shipment_id, tag || 'other', f.originalname, f.mimetype, f.path, f.size]);
      inserts.push(r.rows[0]);
    }
    res.json({ ok: true, files: inserts });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/uploads?shipment_id=...
router.get('/', async (req, res) => {
  const { shipment_id } = req.query;
  if (!shipment_id) return res.status(400).json({ error: 'shipment_id is required' });
  const q = `SELECT id, tag, original_name, mime_type, file_path, size_bytes, uploaded_at
             FROM shipment_files WHERE shipment_id=$1 ORDER BY uploaded_at DESC`;
  const r = await req.db.query(q, [shipment_id]);
  res.json({ ok: true, files: r.rows });
});

export default router;

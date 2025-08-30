import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

import complianceRouter from './routes/compliance.js';
import policyRouter from './routes/policy.js';
import shipmentsRouter from './routes/shipments.js';
import uploadsRouter from './routes/upload.js';
import opsRouter from './routes/ops.js';
import k2Router from "./routes/form_k2.js";
import documentsRouter from './routes/documents.js';
import { batchProcessingRouter } from './routes/batchProcessing.js';
import { stepRoutingRouter } from './routes/stepRouting.js';
import comprehensiveScreeningRouter from './routes/comprehensiveScreening.js';
import strategicItemsRouter from './routes/strategicItems.js';
import permitUploadsRouter from './routes/permitUploads.js';
import processInvoiceDetectionRouter from './routes/processInvoiceDetection.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Attach pool to request
app.use((req,res,next)=>{ req.db = pool; next(); });

app.get('/health', async (req,res)=>{
  try{
    const r = await req.db.query('select 1 as ok');
    res.json({ ok: true, db: r.rows[0].ok === 1 });
  }catch(e){
    res.status(500).json({ ok:false, error: e.message });
  }
});

app.use('/api/compliance', complianceRouter);
app.use('/api/policy', policyRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/ops', opsRouter);
app.use("/api/k2", k2Router);
app.use('/api/documents', documentsRouter);
app.use('/api/batch-processing', batchProcessingRouter);
app.use('/api/step-routing', stepRoutingRouter);
app.use('/api/comprehensive-screening', comprehensiveScreeningRouter);
app.use('/api/strategic', strategicItemsRouter);
app.use('/api/uploads', permitUploadsRouter);
app.use('/api/invoice-detection', processInvoiceDetectionRouter);

// Static file serving for uploaded files
app.use('/files', express.static(path.join(process.cwd(), 'uploads')));

const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log(`GIFS backend running on http://localhost:${port}`));

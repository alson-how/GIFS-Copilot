import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });

import { normalizeExtraction, loadTaxonomy } from '../services/normalizer.js';
import { extractFromLLM } from '../services/extractor.js';
import { runScreening } from '../providers/screening.js';

const taxonomy = loadTaxonomy(new URL('../services/taxonomy.json', import.meta.url).pathname);

import express from 'express';
const router = express.Router();

// STEP 2: Export controls screening (STA 2010)
const staSchema = {
  type: 'object',
  required: ['shipment_id','hs_code','product_type','tech_origin'],
  properties: {
    shipment_id: { type: 'string' },
    hs_code: { type: 'string' },
    product_type: { type: 'string' },
    tech_origin: { type: 'string' },
    notes: { type: 'string', nullable: true }
  }
};
const staValidate = ajv.compile(staSchema);

router.post('/sta-screening', async (req,res)=>{
  if(!staValidate(req.body)) return res.status(400).json({ errors: staValidate.errors });
  const { shipment_id, hs_code, product_type, tech_origin, notes } = req.body;

  try {
    // Heuristic + LLM extraction (optional)
    const extraction = await extractFromLLM(`HS:${hs_code} product:${product_type} origin:${tech_origin}`);
    const normalized = normalizeExtraction(extraction, taxonomy, `${hs_code} ${product_type} ${tech_origin}`);

    const isStrategic = normalized.specialization.includes('ai_accelerator') || ['us_origin','eu_origin'].includes(tech_origin);

    const q = `insert into compliance_records
      (shipment_id, hs_code, product_type, tech_origin, is_strategic, extraction_json)
      values ($1,$2,$3,$4,$5,$6)
      on conflict (shipment_id) do update set hs_code=excluded.hs_code, product_type=excluded.product_type,
        tech_origin=excluded.tech_origin, is_strategic=excluded.is_strategic, extraction_json=excluded.extraction_json
      returning *`;
    const r = await req.db.query(q, [shipment_id, hs_code, product_type, tech_origin, isStrategic, normalized]);
    res.json({ ok:true, record: r.rows[0] });
  } catch (e) {
    console.error('Error in /sta-screening endpoint:', e.message);
    if (e.message.includes('invalid input syntax for type uuid')) {
      return res.status(400).json({ ok: false, error: 'Invalid shipment ID format' });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

// STEP 3: AI chip directive branch
const aiSchema = {
  type: 'object',
  required: ['shipment_id','aica_done','export_notice_30d','reexport_license_needed','sta_permit_ai'],
  properties: {
    shipment_id: { type: 'string' },
    aica_done: { type: 'boolean' },
    export_notice_30d: { type: 'boolean' },
    reexport_license_needed: { type: 'string', enum: ['yes','no','unknown'] },
    reexport_license_number: { type: ['string','null'] },
    sta_permit_ai: { type: 'boolean' },
    sta_permit_ai_number: { type: ['string','null'] }
  }
};
const aiValidate = ajv.compile(aiSchema);

router.post('/ai-chip', async (req,res)=>{
  if(!aiValidate(req.body)) return res.status(400).json({ errors: aiValidate.errors });
  
  try {
    const q = `insert into ai_chip_control
      (shipment_id, aica_done, export_notice_30d, reexport_license_needed, reexport_license_number, sta_permit_ai, sta_permit_ai_number)
      values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (shipment_id) do update set aica_done=excluded.aica_done, export_notice_30d=excluded.export_notice_30d,
        reexport_license_needed=excluded.reexport_license_needed, reexport_license_number=excluded.reexport_license_number,
        sta_permit_ai=excluded.sta_permit_ai, sta_permit_ai_number=excluded.sta_permit_ai_number
      returning *`;
    const p = req.body;
    const r = await req.db.query(q, [p.shipment_id, p.aica_done, p.export_notice_30d, p.reexport_license_needed, p.reexport_license_number, p.sta_permit_ai, p.sta_permit_ai_number]);
    res.json({ ok:true, record: r.rows[0] });
  } catch (e) {
    console.error('Error in /ai-chip endpoint:', e.message);
    if (e.message.includes('invalid input syntax for type uuid')) {
      return res.status(400).json({ ok: false, error: 'Invalid shipment ID format' });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

// STEP 4: Destination & end-user screening
const screenSchema = {
  type: 'object',
  required: ['shipment_id','destination_country','end_user_name'],
  properties: {
    shipment_id: { type: 'string' },
    destination_country: { type: 'string' },
    end_user_name: { type: 'string' }
  }
};
const screenValidate = ajv.compile(screenSchema);

router.post('/screening', async (req,res)=>{
  if(!screenValidate(req.body)) return res.status(400).json({ errors: screenValidate.errors });
  const { shipment_id, destination_country, end_user_name } = req.body;
  
  try {
    const result = await runScreening({ destination_country, end_user_name });

    const q = `insert into end_user_screening
      (shipment_id, destination_country, end_user_name, screen_result, evidence)
      values ($1,$2,$3,$4,$5)
      on conflict (shipment_id) do update set destination_country=excluded.destination_country, end_user_name=excluded.end_user_name,
        screen_result=excluded.screen_result, evidence=excluded.evidence
      returning *`;
    const r = await req.db.query(q, [shipment_id, destination_country, end_user_name, result.screen_result, result.evidence]);
    res.json({ ok:true, record: r.rows[0] });
  } catch (e) {
    console.error('Error in /screening endpoint:', e.message);
    if (e.message.includes('invalid input syntax for type uuid')) {
      return res.status(400).json({ ok: false, error: 'Invalid shipment ID format' });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

// STEP 5: Docs & classification
const docsSchema = {
  type: 'object',
  required: ['shipment_id','hs_validated','k2_ready'],
  properties: {
    shipment_id: { type: 'string' },
    hs_code: { type: ['string','null'] },
    hs_validated: { type: 'boolean' },
    pco_number: { type: ['string','null'] },
    k2_ready: { type: 'boolean' },
    permit_refs: { type: 'array', items: { type: 'string' }, default: [] }
  }
};
const docsValidate = ajv.compile(docsSchema);

router.post('/docs', async (req,res)=>{
  if(!docsValidate(req.body)) return res.status(400).json({ errors: docsValidate.errors });
  const { shipment_id, hs_code, hs_validated, pco_number, k2_ready, permit_refs=[] } = req.body;

  try {
    const q = `insert into documents
      (shipment_id, hs_code, hs_validated, pco_number, k2_ready, permit_refs)
      values ($1,$2,$3,$4,$5,$6)
      on conflict (shipment_id) do update set hs_code=excluded.hs_code, hs_validated=excluded.hs_validated,
        pco_number=excluded.pco_number, k2_ready=excluded.k2_ready, permit_refs=excluded.permit_refs
      returning *`;
    const r = await req.db.query(q, [shipment_id, hs_code, hs_validated, pco_number, k2_ready, permit_refs]);
    res.json({ ok:true, record: r.rows[0] });
  } catch (e) {
    console.error('Error in /docs endpoint:', e.message);
    if (e.message.includes('invalid input syntax for type uuid')) {
      return res.status(400).json({ ok: false, error: 'Invalid shipment ID format' });
    }
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;

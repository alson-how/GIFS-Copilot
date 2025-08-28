// normalizeAndMap.js (ESM)
import fs from 'node:fs';
import path from 'node:path';

export function normalizeText(s) {
  if (s == null) return null;
  const nfkd = s.normalize('NFKD');
  const without = nfkd.replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g,"'").replace(/[“”]/g,'"');
  return without.toLowerCase().trim();
}

export function buildSpecSynMap(taxonomy) {
  const synMap = new Map();
  for (const [catKey, catVal] of Object.entries(taxonomy.categories || {})) {
    const specs = catVal.specializations || {};
    for (const [specKey, specVal] of Object.entries(specs)) {
      const syns = specVal.synonyms || [];
      for (const syn of syns) {
        synMap.set(normalizeText(syn), { categoryKey: catKey, specKey });
      }
    }
  }
  return synMap;
}

export function buildCategorySynMap(taxonomy) {
  const synMap = new Map();
  for (const [catKey, catVal] of Object.entries(taxonomy.categories || {})) {
    const syns = catVal.synonyms || [];
    for (const syn of syns) {
      synMap.set(normalizeText(syn), catKey);
    }
  }
  return synMap;
}

export function mapSpecializations(rawSpecs, taxonomy, { includeCategory = false } = {}) {
  const specSynMap = buildSpecSynMap(taxonomy);
  const out = new Set();
  const catHits = new Set();
  for (const raw of rawSpecs || []) {
    const key = normalizeText(raw);
    const hit = specSynMap.get(key);
    if (hit) { out.add(hit.specKey); if (includeCategory) catHits.add(hit.categoryKey); }
  }
  return { specializations: [...out], inferredCategories: [...catHits] };
}

export function inferCategoryIfMissing({ existingCategory, userQuery }, taxonomy, inferredFromSpecs = []) {
  if (existingCategory) return existingCategory;
  if (inferredFromSpecs.length > 0) return inferredFromSpecs[0];
  if (userQuery) {
    const catSynMap = buildCategorySynMap(taxonomy);
    const tokens = normalizeText(userQuery).split(/\s+/g);
    for (const t of tokens) {
      const hit = catSynMap.get(t);
      if (hit) return hit;
    }
  }
  return null;
}

export function normalizeExtraction(extraction, taxonomy, userQuery = '') {
  const intent = extraction?.intent ?? null;
  const language = extraction?.language ?? null;
  const { specializations, inferredCategories } = mapSpecializations(extraction?.specialization ?? [], taxonomy, { includeCategory: true });
  const cargo_category = inferCategoryIfMissing({ existingCategory: extraction?.cargo_category ?? null, userQuery }, taxonomy, inferredCategories);
  const constraints = {
    mode: extraction?.constraints?.mode ?? null,
    origin: extraction?.constraints?.origin ?? null,
    destination: extraction?.constraints?.destination ?? null,
    regulatory_help: extraction?.constraints?.regulatory_help ?? null,
  };
  return { intent, cargo_category, specialization: specializations, constraints, language };
}

export function loadTaxonomy(taxonomyPath = path.join(process.cwd(), 'taxonomy.json')) {
  const raw = fs.readFileSync(taxonomyPath, 'utf-8');
  return JSON.parse(raw);
}

const BASE = import.meta.env.VITE_API || 'http://localhost:8080';

export async function postJSON(path, body){
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!r.ok){
    const t = await r.text();
    throw new Error(t);
  }
  return r.json();
}

export async function getJSON(path){
  const r = await fetch(`${BASE}${path}`);
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function postBasics(data) {
  return postJSON('/api/shipments/basics', data);
}

export async function uploadFiles({ shipment_id, tag, files }) {
  const BASE = import.meta.env.VITE_API || 'http://localhost:8080';
  const form = new FormData();
  form.append('shipment_id', shipment_id);
  form.append('tag', tag || 'other');
  for (const f of files) form.append('files', f);
  const r = await fetch(`${BASE}/api/uploads`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function listFiles(shipment_id) {
  const BASE = import.meta.env.VITE_API || 'http://localhost:8080';
  const r = await fetch(`${BASE}/api/uploads?shipment_id=${encodeURIComponent(shipment_id)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

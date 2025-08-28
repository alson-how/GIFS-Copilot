# GIFS — Semiconductor Export (Steps 2–5) Code Skeleton

Stack: **React** (frontend) + **Node/Express** (backend) + **Postgres** (+ **pgvector** for RAG).

## 1) Backend
```bash
cd backend
cp .env.example .env   # set DATABASE_URL, PORT
npm i
# Create DB schema:
psql "$DATABASE_URL" -f src/db/schema.sql
npm run dev
```
Endpoints:
- `POST /api/compliance/sta-screening`
- `POST /api/compliance/ai-chip`
- `POST /api/compliance/screening`
- `POST /api/compliance/docs`
- `GET  /api/policy/answer?q=...` (RAG sample)

## 2) Frontend
```bash
cd frontend
npm i
npm run dev
# open http://localhost:5173
```
Set `VITE_API=http://localhost:8080` in a `.env` for the frontend if needed.

## 3) Notes
- RAG service uses a **fake embedding** helper; swap with your real embedding API and adjust vector dims in `schema.sql`.
- Screening provider is a **mock**; integrate OpenSanctions/WorldCheck and store evidence files.
- Normalizer + taxonomy map AI phrases (e.g., "GPU/H100") to `ai_accelerator` specialization.
- Add auth, RBAC, and proper error handling before production.

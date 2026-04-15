# Aestus LP Newsletter Tool

Internal web tool for generating quarterly LP newsletter bullets using AI.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your keys
cp .env.local.example .env.local
# → edit .env.local with real API keys (see account setup below)

# 3. Run locally
npm run dev
# → open http://localhost:3000
```

---

## Account Setup (One-Time)

### 1. Clerk (Google SSO)
1. Go to [clerk.com](https://clerk.com) → Create application
2. Enable **Google** as a social provider
3. In Clerk Dashboard → API Keys: copy `Publishable Key` and `Secret Key`
4. In **Restrictions**: add allowed email domains (e.g. `@aestuscapital.com`)
5. Paste into `.env.local`

### 2. Anthropic API
1. Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key
2. Paste into `.env.local` as `ANTHROPIC_API_KEY`

### 3. AWS S3 (24-hour auto-delete bucket)
1. Create a private S3 bucket (`aestus-newsletter-uploads`, region `us-east-1`)
2. **Block all public access** ✓
3. **Encryption**: SSE-S3 enabled ✓
4. Add a **Lifecycle rule**: expire objects after **1 day** (this is the auto-delete mechanism)
5. Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on this bucket only
6. Generate access keys → paste into `.env.local`

### 4. Supabase (audit log + drafts)
1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. Open **SQL Editor** → paste contents of `supabase/schema.sql` → Run
3. In Project Settings → API: copy URL, anon key, and service role key
4. Paste into `.env.local`

### 5. Vercel (hosting)
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add all environment variables from `.env.local` in Vercel dashboard
4. Deploy — Vercel free tier is sufficient for quarterly usage

---

## Architecture

```
Browser (Next.js)
   │
   ├─ /dashboard        Upload screen (fund selector + PDF dropzones)
   ├─ /review/[id]      Review panel (edit, approve, export)
   │
   └─ API Routes
        ├─ POST /api/upload      → S3 (encrypt + store PDFs)
        ├─ POST /api/generate    → S3 (read) → Anthropic API → Supabase (save bullets)
        ├─ GET  /api/bullets/[id] → Supabase (read bullets)
        ├─ PATCH /api/bullets/[id] → Supabase (edit/approve bullet)
        └─ POST /api/export      → Supabase (read approved) → .docx download

External services:
  Clerk     → Google SSO authentication
  AWS S3    → Temporary encrypted PDF storage (auto-delete 24h)
  Anthropic → claude-sonnet-4-6 for bullet generation
  Supabase  → Audit log + bullet draft storage
  Vercel    → Hosting (free tier)
```

---

## Security Notes

- All API routes are protected by Clerk middleware
- PDFs never leave S3 in plaintext; they are read server-side only
- S3 lifecycle rule auto-deletes after 24 hours (belt-and-suspenders: `/api/export` also triggers delete)
- Anthropic does not train on API data (confirmed by Anthropic's policy)
- All edits and exports are logged to Supabase `audit_log` with timestamps and user emails
- Service role key is only used server-side; never exposed to browser
- IP restriction can be added in Vercel dashboard under **Deployment Protection**

---

## Cost Estimates

| Item | Cost |
|------|------|
| Vercel hosting | $0/mo (free tier) |
| Clerk auth | $0/mo (free tier, <10k MAU) |
| Supabase | $0/mo (free tier) |
| AWS S3 | ~$0/mo (files auto-deleted, <1 GB storage) |
| Anthropic API per run | ~$3–8 depending on PDF size |
| **Annual total** | **~$16–40/yr** |

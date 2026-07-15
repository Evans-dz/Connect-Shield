# Connect Shield — Marketing Site (Stage 1)

The public, SEO-first marketing site for connect-shield.com. Next.js 14 (App Router).
Homepage, eight indexable solution pages, pricing, and a book-a-demo flow with a live
(gated) SSVI lookup. Navy/gold enterprise design. Zero PHI.

This is **Stage 1**. Stage 2 (Supabase Auth login) and Stage 3 (wildcard tenant routing +
dashboard fold-in) come next and layer on top of this same repo pattern.

---

## What's in here

```
app/
  layout.js            Root layout: fonts, global SEO metadata, Nav + Footer, Org JSON-LD
  page.js              Homepage: hero + live CCN teaser, stats, platform, solutions,
                       competitor comparison, security, FAQ (+FAQ schema), CTA
  [solution]/page.js   ONE template that generates all 8 SEO pages as static routes,
                       each with its own <title>, meta description, keywords, canonical,
                       and JSON-LD. Slugs: ssvi, pepper, cahps, qapi, psr-summary,
                       beneficiary-count, survey-results, policy-manuals
  pricing/page.js      Three tiers, all demo-gated
  demo/page.js         Lead form
  api/ssvi-lookup/     Public teaser: returns ONLY score + risk (gating enforced server-side)
  api/demo-request/    Writes leads to Supabase `demo_leads`
  sitemap.js           Auto sitemap.xml (all 11 URLs)
  robots.js            Auto robots.txt
components/            Nav, Footer, Gauge (the /16 SSVI signature), CCNTeaser, DemoForm, Reveal
lib/                   site.js (config/nav/compare/FAQ), solutions.js (the 8 pages' content),
                       supabase.js (server clients + risk banding)
```

To edit the 8 landing pages' copy or add a 9th term, edit **`lib/solutions.js`** — nothing
else needs to change; the route, metadata, sitemap, and nav update automatically.

---

## Deploy — do these in order

### 1. Create the repo & push these files
- Make a **new** GitHub repo (e.g. `connect-shield-site`).
- Use GitHub's **Add file → Upload files**, drag the entire unzipped folder's contents in
  (it preserves the `app/`, `components/`, `lib/` structure), and commit to `main`.

### 2. Create the demo-leads table in Supabase
Open your existing Supabase project (`ojqdfodqffipwtpnvdkz`) → SQL Editor → run:

```sql
create table if not exists public.demo_leads (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  name         text not null,
  email        text not null,
  hospice_name text not null,
  ccn          text,
  phone        text,
  message      text,
  source       text default 'marketing_site'
);

-- Lock it down: no public reads/writes. The server route uses the service key,
-- which bypasses RLS, so leads still insert fine.
alter table public.demo_leads enable row level security;
```

You'll read leads in the Supabase Table Editor. (Later we can pipe them to email.)

### 3. Import the project into Vercel
- Vercel → **Add New → Project** → import the new repo.
- Framework preset: **Next.js** (auto-detected). No build settings to change.

### 4. Set environment variables in Vercel
Project → Settings → Environment Variables (add to Production + Preview):

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ojqdfodqffipwtpnvdkz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
| `SUPABASE_SERVICE_KEY` | your Supabase service-role key |
| `NEXT_PUBLIC_APP_URL` | `https://staging.connect-shield.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://connect-shield.com` |

Redeploy after adding them.

### 5. Point the domain
- Vercel project → Settings → **Domains** → add `connect-shield.com` and `www.connect-shield.com`.
- Follow Vercel's DNS instructions at your registrar (A record for apex, CNAME for www).
- Keep your **existing** dashboard (the Vite app) on `staging.connect-shield.com` for now —
  add that as a domain on the *dashboard's* Vercel project. The two sites coexist cleanly.

### 6. Verify
- `connect-shield.com` → homepage, CCN lookup returns a real score (try `B51562`).
- `connect-shield.com/ssvi`, `/pepper`, `/cahps`, `/qapi`, `/psr-summary`,
  `/beneficiary-count`, `/survey-results`, `/policy-manuals` → each loads.
- `connect-shield.com/sitemap.xml` and `/robots.txt` → present.
- Submit the demo form → a row appears in `demo_leads`.
- Google Search Console → add the property → submit the sitemap.

---

## Local dev (optional)
```
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

## Notes
- The public lookup **never** returns measure-level flags — the gate is enforced in
  `app/api/ssvi-lookup/route.js`, not just hidden in the UI. The full breakdown lives
  behind login (Stage 2).
- Fonts load via `next/font` at build time (needs network on the build machine — Vercel
  handles this automatically).

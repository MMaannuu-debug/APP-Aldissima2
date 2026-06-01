# APP Aldissima2

## Overview

A simple web app for managing calcetto (soccer) matches, players and teams. Built with vanilla HTML, CSS and JavaScript. Includes:
- Fast, asynchronous data loading
- Dark‑mode toggle (persisted in `localStorage`)
- Supabase backend for data persistence

## Supabase GRANT setup

> **Why** – From May 30 2026 Supabase will stop exposing tables in the `public` schema to the Data API by default. All tables must have explicit `GRANT` permissions.

1. **Open the Supabase dashboard** → *Your Project* → **SQL → SQL editor**.
2. **Paste the following statements** and click **Run**:
   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.players           TO anon, authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches           TO anon, authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_convocations TO anon, authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_teams       TO anon, authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_events      TO anon, authenticated;
   ```
3. Verify the **Security Advisor** tab shows no tables exposed without a grant.
4. Future migrations should also include the above `GRANT` statements for any new tables.

## Development

```bash
# Install dependencies (if any)
npm install

# Run locally
npm run dev   # or open index.html in a browser
```

## Deployment (Vercel)

```bash
# Install Vercel CLI (once)
npm i -g vercel

# Deploy production
vercel --prod --confirm
```

---
*Last updated: 2026‑06‑01*

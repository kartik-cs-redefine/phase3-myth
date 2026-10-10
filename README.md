# Team MYTH — Phase 3 Tracker

A responsive 30-day vocabulary and speaking tracker built with Next.js, Tailwind CSS, and Lucide icons.

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Without environment variables the tracker works in local-storage demo mode. Each browser keeps its own data.

## Enable shared live data with Supabase

1. Create a Supabase project and open the SQL Editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PIN=your-secret-pin
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only: do not prefix it with `NEXT_PUBLIC_`.

## Deploy to Vercel

1. Push this folder to GitHub and import the repository in Vercel (framework: Next.js).
2. Add the three environment variables above in **Project Settings → Environment Variables**.
3. Deploy. The supplied API routes automatically use Supabase when configured.

The default admin PIN (`1080`) is for local testing only—set `ADMIN_PIN` before a public deployment.

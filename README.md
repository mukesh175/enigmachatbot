# LeadBot — Multi-tenant Lead-Gen Chatbot SaaS

## Stack
Next.js (App Router) · Neon Postgres (Drizzle ORM) · NextAuth · Vercel (Edge Functions + Cron)

## Setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL from your Neon dashboard, and NEXTAUTH_SECRET (openssl rand -base64 32)

npm run db:push      # pushes schema to Neon (use db:generate + a migration runner in prod)
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub, import into Vercel.
2. Add environment variables in Vercel project settings: `DATABASE_URL`, `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL` (your prod URL), `CRON_SECRET` (any random string), optionally `IPINFO_TOKEN`.
3. Vercel will auto-detect `vercel.json` and schedule the analytics rollup cron.
4. Once deployed, your embed script lives at `https://yourdomain.com/widget.js`.

## How a client uses it

1. Sign up → `/api/auth/signup` (or build a `/signup` page from the `/login` template).
2. Log in → `/dashboard`.
3. Create a campaign → `/dashboard/campaigns/new` → copy the generated `<script>` snippet.
4. Paste that snippet into any landing page (any stack — plain HTML, WordPress, Webflow, etc.)
5. Leads and analytics show up in `/dashboard/leads` and `/dashboard/analytics`.

## Performance notes (the "less load time" requirements)

- **Widget**: no dependencies, Shadow DOM instead of iframe, chat UI lazy-built on first click.
  The script tag itself is the only cost paid by the host page on load.
- **Chat API routes**: run on the Edge runtime — near-zero cold start, and Vercel's
  geolocation headers (`x-vercel-ip-city` etc.) give city/region/country for free,
  no extra network call.
- **DB driver**: `@neondatabase/serverless` HTTP driver — no TCP connection pool to manage,
  which is what usually kills serverless Postgres performance.
- **Analytics**: dashboard never queries raw `conversations`/`messages` tables. An hourly
  cron rolls stats into `analytics_daily`, so dashboard reads are tiny, indexed lookups.
- **ISP/network lookup**: done fire-and-forget after the chat has already responded to the
  visitor — never blocks the user-facing flow.

## What's still a good next step
- Swap the rule-based bot reply logic (`api/chat/message`) for a real LLM call if you want
  free-form conversation instead of scripted qualifying questions.
- Add pagination to the leads table once volume grows past a few hundred rows.
- Add a `/signup` UI page (currently only the API route exists) and per-plan usage limits.
- Add campaign-level theme customization UI (color picker, logo upload) feeding `botConfig`.

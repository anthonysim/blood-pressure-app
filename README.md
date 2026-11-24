# BP Tracker

Track blood pressure morning, noon and night. Each user signs up with email + password and sees only their own readings.

- **Log readings**: systolic, diastolic, pulse, time of day (suggested from the clock, can be changed), notes
- **Search**: date presets (7 / 30 / 90 days, this month, all, custom from–to), time of day, AHA category, systolic/diastolic ranges. Filters live in the URL
- **Saved searches**: name any filter combination and reapply it in one click on Readings or Trends
- **Charts**: BP over time (daily or 7‑day average, with AHA threshold lines), morning vs noon vs night averages, pulse
- **Dashboard**: latest reading with category, 7‑ and 30‑day averages by time of day, 30‑day trend

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · Neon Postgres · Drizzle ORM · Better Auth · Recharts · Tailwind + shadcn/ui

## Setup

1. **Create a Neon database** at [neon.tech](https://neon.tech) (free tier is fine) and copy the **pooled** connection string.
2. **Configure env**:
   ```bash
   cp .env.example .env.local
   # paste DATABASE_URL, then:
   echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
   ```
3. **Install and migrate**:
   ```bash
   npm install
   npm run db:migrate
   ```
4. **Run**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and create an account.
5. **Optional sample data** (after signing up):
   ```bash
   npm run db:seed -- you@example.com
   ```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests (BP classifier, filter parsing) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:studio` | Browse data in Drizzle Studio |
| `npm run db:seed -- <email>` | Insert ~60 days of sample readings for a user |

## Project layout

```
src/
  app/
    (auth)/sign-in, sign-up     public auth pages
    (app)/dashboard             signed-in pages (header, nav, user menu)
    (app)/readings              list + filters + saved searches, new, [id]/edit
    (app)/trends                charts
    actions/                    server actions (each re-checks the session)
    api/auth/[...all]           Better Auth handler
  components/                   UI pieces; charts/ is lazy-loaded Recharts
  db/schema.ts                  tables: user, session, account, verification, reading, saved_search
  lib/
    auth.ts                     Better Auth config + requireUser()
    data.ts                     all reads, always scoped to the signed-in user
    filters.ts                  URL ⇄ filter parsing (zod)
    bp.ts                       AHA category + time-of-day helpers
    dates.ts                    time-zone aware date ranges
  proxy.ts                      redirects signed-out visitors to /sign-in
```

## Notes

- Times are stored in UTC. The browser's time zone is saved in a `tz` cookie so "last 7 days" and chart days match your local calendar.
- Categories follow the AHA 2017 guideline: Normal < 120/80, Elevated 120–129/<80, Stage 1 130–139 or 80–89, Stage 2 ≥ 140 or ≥ 90, Crisis > 180 or > 120. This app is a log, not medical advice.

## Deploy

Works on Vercel. Set `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (your production URL) in the project's environment variables, and run `npm run db:migrate` against the production database.

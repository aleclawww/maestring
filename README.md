# Maestring

> AI-powered adaptive AWS certification prep with spaced repetition (FSRS v5).

## Architecture

```
Next.js 14 App Router (Vercel)
  ├── Marketing (public)
  ├── Auth (Supabase magic link + Google OAuth)
  ├── Dashboard + Study UI (authenticated)
  └── API Routes (study, webhooks, cron, documents)
        │
  ┌─────┼──────────┬──────────┐
  │     │          │          │
Supabase  Claude   OpenAI   Stripe
Postgres  Haiku   Embed-3  Checkout
pgvector  (gen)   small    Webhooks
  │
Upstash Redis (rate limit)
Resend (email)
Sentry + PostHog (monitoring)
```

## Local Setup (8 steps)

```bash
# 1. Clone
git clone https://github.com/your-org/maestring && cd maestring

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in SUPABASE_*, STRIPE_*, ANTHROPIC_API_KEY, OPENAI_API_KEY

# 4. Start Supabase
npx supabase start

# 5. Run migrations
npx supabase db push

# 6. Generate types
npx supabase gen types typescript --local > types/supabase-generated.ts

# 7. Seed knowledge graph
npm run seed

# 8. Start dev server
npm run dev
```

## Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm run seed` | Seed AWS SAA knowledge graph |
| `npm run reset-dev` | Reset dev data (keeps schema) |

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Database**: Supabase (PostgreSQL + pgvector + Auth + Storage)
- **Spaced Repetition**: ts-fsrs (FSRS-4.5 algorithm)
- **AI**: Claude Haiku (question gen/eval) + OpenAI (embeddings)
- **Payments**: Stripe
- **Email**: Resend + React Email
- **Rate Limiting**: Upstash Redis (fail-open)
- **Styling**: Tailwind CSS
- **Monitoring**: Sentry + PostHog

## License

MIT

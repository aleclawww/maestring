# Deployment Guide

## Prerequisites

- Vercel account with the project connected to this repository
- Supabase project (production)
- Stripe account with products/prices configured
- Upstash Redis database
- Resend account
- Anthropic and OpenAI API keys

## Vercel Environment Variables

Set these in Vercel Dashboard -> Project -> Settings -> Environment Variables:

**Supabase**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

**Stripe**
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRO_PRICE_ID

**AI**
- ANTHROPIC_API_KEY
- OPENAI_API_KEY

**Upstash**
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

**Email**
- RESEND_API_KEY
- EMAIL_FROM=Maestring <noreply@maestring.app>

**App**
- NEXT_PUBLIC_APP_URL=https://maestring.app
- CRON_SECRET=<generate-a-secure-random-string>
- MAGIC_LINK_SECRET=<generate-a-secure-random-string>

**Analytics**
- NEXT_PUBLIC_POSTHOG_KEY
- NEXT_PUBLIC_POSTHOG_HOST
- NEXT_PUBLIC_SENTRY_DSN

## Cron Jobs

Configured in `vercel.json`:
- /api/cron/nudges - every hour
- /api/cron/reminders - daily at 8 AM UTC
- /api/cron/cleanup - weekly Sunday at 2 AM UTC

All cron routes verify `Authorization: Bearer $CRON_SECRET`.

## Stripe Webhooks

Point to: `https://maestring.app/api/webhooks/stripe`

Events:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed
- invoice.payment_succeeded

## Database Migration

```bash
# Link to production
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Seed knowledge graph (once)
npx tsx scripts/seed-aws-saa.ts
```

## Supabase Storage

Create `user-documents` bucket:
- Public: No
- Max file size: 50 MB
- Allowed MIME types: application/pdf

## Health Checks After Deploy

- [ ] Landing page loads
- [ ] Sign up + magic link works
- [ ] Stripe checkout completes
- [ ] Study session generates a question
- [ ] PDF upload processes
- [ ] Emails send (test nudge)

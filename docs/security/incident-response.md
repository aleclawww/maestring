# Incident Response Runbook

Owner: Security lead (currently: founder). On-call rotation TBD once team grows.

## Severity levels

| Level | Definition | Examples | Response time |
|---|---|---|---|
| SEV-1 | User data exposed or at imminent risk; prod down for all users | DB breach, auth bypass in the wild, Stripe keys leaked | < 30 min |
| SEV-2 | Partial outage or degraded trust | Study loop failing for >25% of users, webhook signature bypass | < 2 hr |
| SEV-3 | Limited impact, no data risk | Cron failure, single-user bug with PII in logs | < 1 business day |
| SEV-4 | Informational / tracked | Dependency CVE without active exploit | next sprint |

## Roles during an incident

- **Incident Commander (IC)** — runs the response, makes calls, owns comms.
  Same person as security lead until the team grows.
- **Scribe** — timestamps every action in the incident doc. Can be IC on solo response.
- **Comms** — drafts user-facing status/email. Skip if SEV-3/4.

## Response flow

1. **Detect** — Sentry alert, cron_runs failure, Stripe webhook failure, user report.
2. **Declare** — open an incident doc (template below). Post in `#incidents`.
   For SEV-1, page the founder directly.
3. **Contain** — stop the bleed before fixing root cause. Examples:
   - Rotate leaked secrets (Supabase, Stripe, Anthropic, OpenAI, Upstash, Resend)
   - Revoke compromised Supabase service-role keys via dashboard
   - Disable a broken cron by removing it from `vercel.json` and redeploying
   - Flip a feature flag / roll back deploy (`vercel rollback`)
4. **Eradicate & recover** — fix root cause, redeploy, verify via admin dashboards
   (`/admin/cron`, `/admin/actions`, Sentry, Supabase logs).
5. **Communicate** — for SEV-1/2 affecting users, send status update within 4 hr.
   Template in §User comms below.
6. **Postmortem** — within 5 business days for SEV-1/2. Blameless, per template.

## Incident doc template

```
# Incident YYYY-MM-DD — <one-line title>
Severity: SEV-?
IC: <name>
Status: Investigating | Mitigated | Resolved
Started: <UTC timestamp>
Detected: <UTC timestamp>
Resolved: <UTC timestamp>

## Summary
<2-3 sentences, user-impact first>

## Timeline (UTC)
- HH:MM  <event>
- HH:MM  <event>

## Impact
- Users affected: <count or %>
- Data exposed: <yes/no, scope>
- Revenue impact: <$ or n/a>

## Root cause
<what actually broke>

## Resolution
<what we did to fix it>

## Action items
- [ ] owner — item — due
```

## User comms template (SEV-1/2, data-affecting)

```
Subject: Security notice — <short>

We're writing to let you know about an incident that <may have / did> affect
your Maestring account.

What happened: <plain-English, no jargon>
What data was involved: <specific>
What we've done: <specific actions>
What you should do: <specific actions, e.g. rotate password>

We're sorry this happened. If you have questions, reply to this email or
write to security@maestring.com.
```

GDPR breach-notification threshold: if personal data is at risk, notify the
relevant DPA within **72 hours** of becoming aware. Err on the side of
notifying.

## Key contacts & resources

- Supabase dashboard — project keys, logs, backups
- Stripe dashboard — webhook event log, customer export
- Vercel dashboard — deploy logs, env vars, rollback
- Sentry — errors
- `/admin/cron`, `/admin/actions` — internal observability
- Upstash — Redis keys, rate-limit state

## Secret rotation checklist

On suspected leak, rotate in this order (fastest-bleed first):

1. `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — Stripe dashboard
2. `SUPABASE_SERVICE_ROLE_KEY` — Supabase project settings → API
3. `CRON_SECRET`, `MAGIC_LINK_SECRET` — Vercel env, redeploy
4. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
5. `UPSTASH_REDIS_REST_TOKEN`
6. `RESEND_API_KEY`

After rotation: redeploy, verify `/admin/cron` shows a successful run, invalidate
all existing sessions if auth was compromised (`supabase auth admin sign-out` for
affected users).

## Summary

<!-- 1-3 sentences: what changed and why. Not a commit log. -->

## Risk & blast radius

- [ ] Touches a migration (`supabase/migrations/**`)
- [ ] Touches the money path (Stripe, subscription state)
- [ ] Touches auth or middleware (can lock users out)
- [ ] Touches scoring / FSRS / exam (wrong math ships silently)
- [ ] Touches cron or a webhook (failure is silent)
- [ ] None of the above — low-risk UI / docs / test change

## How tested

<!--
Be specific. "Tests pass" is not a test plan.
Examples:
  - ran `npm run test -- stripe-webhooks` — all green
  - drove /study locally with a fixture user, answered 5 questions, saw feedback
  - applied migration locally via `supabase db reset`, ran `supabase test db`
-->

## Migration checklist (skip if no migration)

- [ ] Migration is **additive** (no DROP, no type narrow, no NOT NULL on populated column without default)
- [ ] Ran `supabase db reset` locally and the migration applied clean
- [ ] `npm run db:types` regenerated and committed
- [ ] RLS policies reviewed for new/changed tables
- [ ] `supabase/tests/*.sql` updated if touching a tested table

## Rollout

<!--
- For risky changes: what's the revert path? Feature flag? Env gate?
- For schema changes: is this safe under concurrent writes? Backfill needed?
- For scoring / pricing changes: blast radius if wrong?
-->

## Links

<!-- issue #, linear URL, sentry, supporting doc — whatever anchors this -->

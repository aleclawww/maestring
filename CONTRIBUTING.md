# Contributing

## Before you start

- Read [CLAUDE.md](CLAUDE.md) — architecture overview, stack, commands.
- Check the target path in [.github/CODEOWNERS](.github/CODEOWNERS). If it's
  a load-bearing path (schema, money, auth, scoring, cron, CI), expect a
  closer review.

## Development loop

```bash
npm install
cp .env.example .env.local   # fill in secrets — see CLAUDE.md §Local setup
npm run db:start             # supabase local
npm run db:push              # apply migrations
npm run db:types             # regen types/supabase-generated.ts
npm run seed                 # AWS SAA knowledge graph
npm run dev
```

Before opening a PR:

```bash
npm run typecheck
npm run lint
npm run test                 # unit (vitest)
# optional but recommended for anything touching study/auth/webhooks:
ALLOW_TEST_AUTH=1 npm run build && ALLOW_TEST_AUTH=1 npm run test:e2e
```

## Pull requests

- Fill in [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)
  honestly — "how tested" is where you prove you actually drove the change,
  not just that it compiles.
- One logical change per PR. Split refactors from feature work.
- Migrations: additive only. See the migration checklist in the PR template.
- All CI checks must be green before merge (enforced on `main`).

## Security

See [SECURITY.md](SECURITY.md) for responsible-disclosure and
[docs/security/](docs/security/) for the incident / retention / backup
runbooks. Never commit secrets; `.env.local` is gitignored for a reason.

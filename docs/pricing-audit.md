# /pricing surface audit — 2026-05-24

Scope: `app/pricing/page.tsx`, `components/v2/marketing/sections/Pricing.tsx`, `components/billing/UpgradeButton.tsx`, `components/billing/TrialBanner.tsx`, `app/api/lemonsqueezy/checkout/route.ts`. Research-only — no code touched.

## Findings table

| File:line | Claim (verbatim) | Severity | Recommendation |
|---|---|---|---|
| `app/pricing/page.tsx:20` (metadata) | `"Pay $119 once for lifetime access to one cert, or $29/month for every cert."` | 🔴 fiction | REWRITE — Lifetime tier is unwired (LS variant + webhook + entitlement missing), and was already cut from the landing `Pricing.tsx` component for that reason. SEO/OG metadata still ships the dead promise. |
| `app/pricing/page.tsx:76-83` (h1 + subhead) | `"Pay once for life, or unlock every cert."` / `"$119 once for lifetime SAA-C03, or $29/month..."` | 🔴 fiction | REWRITE — same root cause. The headline frames the page around a tier that does not exist as a product today. |
| `app/pricing/page.tsx:28-36, 95-145` (entire Lifetime card) | `"Lifetime SAA-C03 … $119 … Buy lifetime access"` linking to `/signup?plan=lifetime` | 🔴 fiction | CUT — dead path. `app/api/lemonsqueezy/checkout/route.ts` ignores the `plan` arg and only ever issues a Pro Monthly checkout (line 11–13 docstring confirms). `getEntitlement` in `lib/subscription/check.ts` has no `lifetime` branch. Grep for `lifetime` in `lib/lemonsqueezy/` returns zero hits. |
| `components/v2/marketing/sections/Pricing.tsx:24-73` (entire TIERS const including Lifetime + Teams) | Component still ships three-tier array with `Lifetime` and `Teams` | 🔴 fiction | The file header note in CLAUDE.md says Lifetime was cut in commit c075016 — verified false. The full Lifetime tier (lines 25-40) is still in the source. CUT the Lifetime entry (and reconsider Teams — see below). |
| `app/pricing/page.tsx:49-55, 224-271` (Teams card) | `"For 5+ engineers"`, `"SAML SSO + SCIM provisioning"`, `"Dedicated success manager"`, `"Org analytics dashboard"` | 🔴 fiction | REWRITE — solo founder per context. No team product exists. No SAML/SCIM in repo. Either collapse to a one-line "Need 5+ seats? hello@maestring.com" CTA, or CUT the card entirely. Bullets `SAML SSO + SCIM provisioning` and `Dedicated success manager` are pure invention. |
| `components/v2/marketing/sections/Pricing.tsx:63` | `"For engineering teams of 5+"` and `"Dedicated success manager"` | 🔴 fiction | Same as above. CUT or collapse. |
| `app/pricing/page.tsx:32, 50` and `Pricing.tsx:33, 49` | `"FSRS-4.5 spaced repetition scheduler"` as sellable bullet | 🟡 aspirational | REWRITE — FSRS is real (ts-fsrs in stack) but invisible to users today. Per audit guidance: feature only where user can feel it. Reframe as a user-facing outcome ("Reviews resurface what you forgot, on the day you'd forget it") or drop from the bullet list. |
| `app/pricing/page.tsx:34, 122` | `"Lifetime updates"` / `"One-time payment · lifetime updates"` | 🔴 fiction | CUT with the Lifetime card. No update-cadence policy backs this. |
| `components/v2/marketing/sections/FinalCTA.tsx:84` (rendered on /pricing via FAQ section? — actually FinalCTA, not on pricing route, but recurs in marketing) | `"Built by AWS-certified engineers · Updated weekly"` | 🔴 fiction | Not on `/pricing` route directly but worth flagging — `engineers` plural (solo founder) and `Updated weekly` (cadence not verified, listed as suspect). Out of scope for `/pricing` audit but caller should know. |
| `app/pricing/page.tsx:309-321` (Free preview band) | `"Try without paying first … the first module of SAA-C03, and 50 sample exam-style questions. No card required."` | 🟡 aspirational | VERIFY — "first module" and "50 sample questions" gating not confirmed in this audit. The "No card required" half is true for `/signup` (the Pro free trial requires card; this is the separate freemium signup). Recommend verifying the 50-question / first-module gating actually exists before keeping. |
| `app/pricing/page.tsx:39` | `"Every future certification at no extra cost"` (Pro bullet) | 🟡 aspirational | KEEP but soften. True in pricing intent, but the other 5 certs don't exist today (CertGrid was just made honest about this). Consider "Every future cert included as we ship them" — already used in the description (line 178). The bullet as-is over-promises immediacy. |
| `app/api/lemonsqueezy/checkout/route.ts:13` (code comment) | `"first $19 charge fires on day 8"` | 🟢/internal | Code comment only, not user-facing — but it's a stale price (now $29). FIX in passing when next touched. Not a marketing surface bug. |
| `components/billing/UpgradeButton.tsx` overall | Real LS checkout call, origin-validates redirect URL, handles 401 by routing to signup | 🟢 verified true | KEEP. This is the only honest piece of the chain — when the user clicks "Start 7-day free trial" on Pro it does hit `/api/lemonsqueezy/checkout` and redirect to a real LS-hosted checkout. |
| `components/billing/TrialBanner.tsx:73-75` | `"Your card will be charged $29 at the end of today."` | 🟢 verified true | KEEP. Matches card-on-file reality from CLAUDE.md. |
| `app/pricing/page.tsx:274-277` | `"Pro: card on file required · $0 today · Reminder email 3 days before the first charge · Cancel any time from Settings → Billing."` | 🟡 aspirational | VERIFY — card-on-file + cancel anytime are true. The "reminder email 3 days before the first charge" needs verification (no obvious cron/email job found in this audit). If unverified, soften or cut that clause. |

## Worst 3 issues + proposed replacement copy

### 1. Lifetime tier is still live on /pricing and in the reusable Pricing.tsx — buys a dead product

Two surfaces ship a $119 Lifetime card with a `Buy lifetime access` CTA that POSTs into `/api/lemonsqueezy/checkout`, which then silently returns a Pro Monthly checkout regardless of the `plan` query param. The user pays $29/mo expecting a one-time $119 purchase. CLAUDE.md claims this was already cut from `Pricing.tsx` (commit c075016) — that's false; the Lifetime entry is still in the `TIERS` array.

Proposed replacement (h1, both files): `Pay $29/month. Cancel anytime.` Sub: `Full SAA-C03 today. Every future AWS cert included as we ship them. 7-day free trial — card required.` Drop the Lifetime card entirely from both `Pricing.tsx` and `app/pricing/page.tsx` until LS variant + `order_created` handler + `getEntitlement` lifetime branch ship.

### 2. Teams card invents an enterprise product (SAML SSO, SCIM, dedicated success manager)

`app/pricing/page.tsx:49-55` lists `SAML SSO + SCIM provisioning` and `Dedicated success manager` as Teams bullets. Solo founder, no enterprise infra, no DSM — pure invention. Risk: a real procurement-stage prospect will ask for a SOC 2 / SSO doc and there's nothing behind it.

Proposed replacement (whole right card): keep the visual slot but reduce to one line — `Need 5+ seats? hello@maestring.com` with a Contact button. Drop the four bullets. Headline: `Teams of 5+` / sub: `Volume pricing and invoiced billing. Talk to me directly.`

### 3. Metadata description still sells Lifetime to search engines and social-share previews

`app/pricing/page.tsx:20` ships `"Pay $119 once for lifetime access to one cert, or $29/month for every cert. Free 7-day trial of Pro."` to Google, X, LinkedIn, Slack unfurls. Even if the page UI is fixed, this string keeps the dead promise alive in every SERP and link preview.

Proposed replacement: `"$29/month for full SAA-C03 access and every future AWS cert. 7-day free trial — card required. Cancel anytime."`

## Verified clean — DO NOT cut

- `app/pricing/page.tsx:39` `"Full SAA-C03 access today"` — true.
- `app/pricing/page.tsx:43` `"2,000+ exam-pattern questions per cert"` for SAA-C03 specifically — 2,146 approved+active questions in prod (verified). Caveat: the `per cert` framing is misleading because only one cert exists; consider `2,000+ exam-pattern questions` without the per-cert qualifier.
- `app/pricing/page.tsx:44, Pricing.tsx:51` `"9-phase Coach (Calibration → Mastery)"` — present in repo (journey-phase migration 014 referenced in CLAUDE.md). Keep.
- `app/pricing/page.tsx:45` `"Cognitive fingerprint calibration"` — backed by migration 013 (`profiles.cognitive_fingerprint`). Keep.
- `app/pricing/page.tsx:51, Pricing.tsx:52` `"65-question mock exam simulator"` — matches the FAQ's verified description of 65 questions / 130 minutes. Keep.
- `app/pricing/page.tsx:188-193` `"$29 / month — After the 7-day free trial · cancel any time"` — matches reality (card on file, trial ends, charge fires).
- `app/pricing/page.tsx:252-256` Teams `Contact sales` → `mailto:hello@maestring.com` — the CTA itself is honest (it's a mailto, not a dead form). The Teams *content* is the problem, not the CTA mechanism.
- `app/pricing/page.tsx:279-296` Lemon Squeezy attribution + Terms/Privacy links — true and required.
- `components/billing/UpgradeButton.tsx` end-to-end — real LS checkout, origin-validated redirect, 401→signup fallback. Don't touch.
- `components/billing/TrialBanner.tsx` — correctly states the $29 charge date and post-cancel "keep access until X" behavior. Matches CLAUDE.md sync-trigger semantics.

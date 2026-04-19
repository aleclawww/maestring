# Maestring — Deploy runbook

Stack: **Vercel** (host) · **Supabase Cloud** (DB) · **Spaceship** (DNS + email forwarding) · **Resend** (transactional email) · **Stripe** (live)

Total time si vas seguido: ~60-90 min. Cada paso es independiente — puedes hacer una pausa entre cualquier dos.

> **Antes de empezar:** ten abierta una pestaña con `.env.production.template`. Vamos a ir rellenando los `TODO_*` a medida que generes cada credencial.

---

## 1. GitHub (5 min)

El repo no está en GitHub todavía. Vercel necesita un repo conectado para auto-deploy.

```bash
cd C:\Users\aleop\Desktop\maestring
git init
git add .
git commit -m "Initial commit"
gh repo create maestring --private --source=. --remote=origin --push
```

Si no tienes `gh` instalado, crea el repo a mano en github.com/new (privado, sin README) y luego:

```bash
git remote add origin https://github.com/TU_USUARIO/maestring.git
git branch -M main
git push -u origin main
```

> ⚠️ Hay un `.env.local` con secretos. Antes del primer commit crea `.gitignore`:
> ```
> .env.local
> .env.production
> node_modules/
> .next/
> ```

---

## 2. Supabase Cloud (10 min)

1. supabase.com → New project
   - Name: `maestring-prod`
   - Region: **eu-west-1 (Ireland)** — más cerca de España
   - DB password: genera uno fuerte y **guárdalo** (lo usas para `db push`)
2. Espera 2 min hasta que esté lista la base
3. Settings → API → copia y pega en `.env.production.template`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca al cliente)
4. Aplica las migraciones desde tu máquina:
   ```bash
   npx supabase link --project-ref TU_PROJECT_REF
   # te pedirá la DB password del paso 1
   npx supabase db push
   npm run seed
   ```
5. Authentication → URL Configuration:
   - Site URL: `https://maestring.com`
   - Redirect URLs (añade los 3): `https://maestring.com/auth/callback`, `https://www.maestring.com/auth/callback`, `https://*.vercel.app/auth/callback` (para previews)
6. Authentication → Providers → **Google** → Enable. Esto requiere crear OAuth credentials en console.cloud.google.com (Authorized redirect URI: `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`). Si te da pereza ahora, déjalo deshabilitado — magic link funciona sin Google.

---

## 3. Vercel (10 min)

1. vercel.com → Add New → Project → Import desde GitHub el repo `maestring`
2. Framework Preset: **Next.js** (auto)
3. Root Directory: `./`
4. **Environment Variables** → click "Import .env" → pega entero el contenido de [.env.production.template](.env.production.template)
   - Vercel detecta los `TODO_*` y los marca — rellénalos antes de Deploy
   - Mínimo viable para que arranque: Supabase (3) + ANTHROPIC + OPENAI + CRON_SECRET + MAGIC_LINK_SECRET. El resto puede quedar en TODO y se rellena después (Resend, Stripe, PostHog).
5. Deploy. Tarda ~2 min.
6. Cuando termine, abre `https://maestring-xxx.vercel.app` — debería cargar la landing.

---

## 4. Dominio en Vercel + DNS en Spaceship (10 min)

1. Vercel → Project → Settings → Domains → Add → `maestring.com`
   - Vercel te dirá: "Set the following record on your DNS provider"
   - Añade también `www.maestring.com` (te pedirá un CNAME diferente)
2. Spaceship → maestring.com → **Advanced DNS** → añade estos 2 registros (son fijos para Vercel):

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `@` | `76.76.21.21` | Auto |
| CNAME | `www` | `cname.vercel-dns.com` | Auto |

3. Vuelve a Vercel → Domains → "Refresh" — en 1-5 min se pone verde
4. Vercel emite SSL automáticamente (Let's Encrypt)

---

## 5. Email forwarding gratis (Spaceship) (3 min)

Para tener `hola@maestring.com` que reenvía a tu Gmail personal:

1. Spaceship → maestring.com → **Email Forwarding** (gratis, incluido)
2. Add forward: `hola` → `aleopenclaw@gmail.com`
3. Spaceship añade los MX automáticamente — no toques nada más

> Esto es solo **recibir**. Para enviar transaccional usamos Resend (paso siguiente).

---

## 6. Resend — transaccional (10 min)

1. resend.com → Sign up (free tier: 3000 emails/mes, 100/día)
2. Domains → Add Domain → `maestring.com`
3. Resend te muestra ~5 registros DNS — pásalos a **Spaceship → Advanced DNS**:

| Type | Host (lo que pone Resend) | Value (lo que pone Resend) |
|------|---------------------------|-----------------------------|
| TXT | `send` (o `@`, depende) | `v=spf1 include:amazonses.com ~all` |
| TXT (DKIM) | `resend._domainkey` | `p=MIG...` (largo) |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` priority 10 |
| TXT (DMARC, opcional pero recomendado) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hola@maestring.com` |

> Los valores **exactos** los da Resend en su panel — copia los suyos, no los míos. Los nombres de host también pueden variar (a veces es `resend._domainkey.send` en vez de `resend._domainkey`).

4. En Resend → click "Verify DNS Records". Tarda 1-30 min. Cuando esté verde:
5. Resend → API Keys → Create → permission "Sending access" → copia → `RESEND_API_KEY` en Vercel
6. Vercel → Project → Settings → Environment Variables → actualiza `RESEND_API_KEY` y `RESEND_FROM_EMAIL=no-reply@maestring.com` → Redeploy

---

## 7. Stripe live (15 min)

> Hazlo solo cuando vayas a aceptar pagos reales. Para test, salta este paso y usa las claves test que ya tienes localmente.

1. dashboard.stripe.com → activa modo "live" (toggle arriba izquierda)
2. Products → Add Product:
   - Name: "Maestring Pro"
   - Pricing → Recurring → 9,99€/mes → Save
   - Add another price → 95,90€/año → Save
3. Copia los 2 `price_...` IDs → `STRIPE_PRICE_PRO_MONTHLY` y `_ANNUAL` en Vercel
4. Developers → API keys → revela y copia:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
5. Developers → Webhooks → Add endpoint:
   - URL: `https://maestring.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copia el "Signing secret" (`whsec_...`) → `STRIPE_WEBHOOK_SECRET` en Vercel
6. Vercel → Redeploy

---

## 8. PostHog + Sentry (5 min cada uno, opcional pero recomendado)

**PostHog** (analytics):
1. app.posthog.com → New project → región **EU**
2. Project Settings → Project API Key → copia → `NEXT_PUBLIC_POSTHOG_KEY` en Vercel
3. `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`

**Sentry** (errores):
1. sentry.io → New project → Next.js → región EU
2. Copia el DSN → `NEXT_PUBLIC_SENTRY_DSN` en Vercel

---

## 9. Verificación final (5 min)

Visita `https://maestring.com` y prueba este flujo cold:

- [ ] Landing carga, links de navegación funcionan
- [ ] `/pricing` muestra los 2 planes
- [ ] `/legal/terms` y `/legal/privacy` cargan
- [ ] Cookie banner aparece al primer visit; "Aceptar" lo oculta
- [ ] Signup con Google → onboarding → dashboard
- [ ] `/study` → genera 1 pregunta (pool vacío al inicio → llamada a Anthropic) → responde → ves explicación
- [ ] Settings → Eliminar cuenta → confirma → cuenta borrada y redirige a landing
- [ ] (Opcional) Pago de prueba con tarjeta `4242 4242 4242 4242` (modo test) → vuelve con plan=pro

Si algo falla, mira:
- Vercel → Deployments → último → Function Logs
- Sentry → Issues
- Supabase → Logs → API / Postgres

---

## Lista de claves que tienes que generar manualmente

| Servicio | Dónde | Va a env var |
|----------|-------|--------------|
| Supabase | supabase.com → New project | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Anthropic | console.anthropic.com → API keys | `ANTHROPIC_API_KEY` |
| OpenAI | platform.openai.com → API keys | `OPENAI_API_KEY` |
| Upstash | console.upstash.com → New Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Resend | resend.com → API Keys | `RESEND_API_KEY` |
| Stripe | dashboard.stripe.com → Developers | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, los 2 `STRIPE_PRICE_PRO_*` |
| PostHog | app.posthog.com → Project settings | `NEXT_PUBLIC_POSTHOG_KEY` |
| Sentry | sentry.io → Project | `NEXT_PUBLIC_SENTRY_DSN` |

`CRON_SECRET` y `MAGIC_LINK_SECRET` ya están generados en el template.

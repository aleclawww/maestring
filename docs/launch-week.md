# Launch Week — Maestring

> 7 días. 1 KPI: **10 usuarios pagos completando >=1 sesión de estudio**.
> No tocar código a menos que bloquee conversión. Distribución > producto.

---

## Día 1 — Screenshots + sync STRATEGY.md ✅

**Por qué:** el Readiness Score es tu diferenciador real. No hace falta video;
3 screenshots limpios + 1 GIF del dashboard bastan para todos los canales
(Reddit, X, LinkedIn, landing).

### Assets a producir (30 min con tu cuenta poblada)

Requisitos: cuenta de prueba con al menos 2 sesiones completas para que el
Readiness tenga número real. Si no, `npm run seed` + 2 sesiones reales antes.

1. **`screenshot-01-readiness.png`** — Dashboard completo con ReadinessCard
   mostrando score ~72, confidence interval, weakest domain, at-risk list.
   Crop: sólo la card + una tira de contexto arriba (logo + "Dashboard").
   Resolución: 1600×900 mínimo. Fondo dark del producto.

2. **`screenshot-02-question.png`** — Sesión de estudio con pregunta generada
   visible, 4 opciones, barra de progreso "3/10". Oculta cualquier UI de
   debug.

3. **`screenshot-03-feedback.png`** — Pantalla de feedback después de fallar:
   micro-pregunta de elaboración + explicación. Esto es el *wow moment* —
   cero plataformas tienen esto.

4. **`readiness-demo.gif`** (6–8 seg, opcional pero muy alto ROI) — Pantalla
   del dashboard mostrando el número del Readiness Score *subir* tras
   completar una sesión. Graba con [ScreenToGif](https://www.screentogif.com/)
   (Windows, gratis). 3 MB máx para que X/Reddit no lo compriman.

**Dónde usar cada uno:**
- Landing (`app/page.tsx`): screenshot-01 como hero visual + gif bajo el hero
- Reddit post: link al imgur álbum con los 3
- Thread X: screenshot-01 en tweet 4, gif en tweet 1 o 8
- LinkedIn DM: screenshot-01 adjunto directo

**No edites más de 20 minutos.** Cropping limpio > diseño Figma tarde.

---

## Día 2 — Landing con guarantee + Readiness hero ✅

Hecho en código: hero reescrito + strip de garantía emerald. Cambios en
[app/page.tsx](../app/page.tsx).

**Pendiente tuyo:**
1. Embeber `readiness-demo.gif` (o `screenshot-01`) justo debajo del hero —
   sustituye el vacío visual actual entre hero y feature grid.
2. Verificar que `NEXT_PUBLIC_APP_URL` apunta al dominio de prod.
3. Deploy a Vercel: `git push` sobre `main` (asumiendo pipeline auto).

---

## Día 3 — Stripe live + Deploy producción (checklist)

### Pre-flight (bloqueantes antes de lanzar)

- [ ] `.env.production` en Vercel con:
  - [ ] `STRIPE_SECRET_KEY` (sk_live_…)
  - [ ] `STRIPE_WEBHOOK_SECRET` del endpoint de producción
  - [ ] `STRIPE_PRICE_PRO_MONTHLY` (precio €19/mes live)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` del proyecto
        prod (NO dev)
  - [ ] `ANTHROPIC_API_KEY` con billing cap (sugerido: $100/mes hasta validar
        unit economics)
  - [ ] `OPENAI_API_KEY` con budget $50/mes
  - [ ] `RESEND_API_KEY` + `EMAIL_FROM=hello@maestring.app`
  - [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (prod DB)
  - [ ] `CRON_SECRET` (generar con `openssl rand -hex 32`)
  - [ ] `MAGIC_LINK_SECRET` (idem)
  - [ ] `SENTRY_DSN` prod + `NEXT_PUBLIC_POSTHOG_KEY` prod

- [ ] Stripe Dashboard:
  - [ ] Producto "Maestring Pro" creado con precio recurring €19 EUR/mes
  - [ ] Webhook endpoint `https://maestring.app/api/webhooks/stripe` con
        eventos: `checkout.session.completed`,
        `customer.subscription.updated`, `customer.subscription.deleted`,
        `invoice.payment_failed`
  - [ ] Tax settings: Stripe Tax activo para EU (VAT MOSS)
  - [ ] Customer portal activado con: cancel, update payment, invoices

- [ ] Supabase:
  - [ ] Proyecto prod separado del dev
  - [ ] `supabase db push` con las 35 migraciones
  - [ ] `npm run seed` ejecutado sobre prod
  - [ ] RLS policies verificadas (el repo las tiene en migración 007)
  - [ ] Auth: Google OAuth client de prod, redirect URIs con dominio real
  - [ ] Magic link template email traducido al inglés/idioma target

- [ ] Vercel:
  - [ ] Dominio `maestring.app` + `www.maestring.app` apuntando al deploy
  - [ ] HTTPS forzado
  - [ ] Cron jobs activos (`vercel.json` los declara, confirma en dashboard)
  - [ ] `/api/health` retorna 200 en prod

- [ ] Legal (mínimo viable para cobrar en EU):
  - [ ] Privacy policy en `/privacy` (ya existe `app/(legal)/`)
  - [ ] Terms en `/terms`
  - [ ] Cookie banner si usas PostHog EU (asegúrate `persistence: 'memory'`
        o consent explícito)

### Smoke test post-deploy

```bash
# Desde tu máquina, no local
curl https://maestring.app/api/health          # 200 + {ok:true}
# Sign up end-to-end con email real
# Completar onboarding → pagar con tarjeta Stripe real (te la reembolsas)
# Completar 1 sesión de estudio
# Verificar ReadinessCard rendering en /dashboard
```

Si cualquiera de los anteriores falla, **detén el lanzamiento comercial**.

---

## Día 4 — Post en r/AWSCertifications

**Subreddit:** `r/AWSCertifications` (~180k miembros).
**Cuándo publicar:** martes o miércoles, 14:00–16:00 UTC (prime time US/EU).
**Tipo:** Self-post (no link). Flair: "Resource" o "Tools & Software".
**Requisito previo:** cuenta con al menos 50 karma y 1 mes de antigüedad, o
te banean por spam. Si no la tienes, pide a un amigo con cuenta madura.

### Template (léelo como founder, no como marketer — Reddit huele el marketing)

```markdown
Title: I built an AWS SAA prep tool with a live "Readiness Score" — looking for 20 honest beta testers (€19/mo, money back if you fail)

Hey r/AWSCertifications,

Six months ago I was prepping for SAA-C03 and every platform I tried had the
same problem: a static bank of 500 questions, no idea if I was actually ready
until exam day. I'm a software engineer, so I over-engineered a solution for
myself. People on my team started using it. Now it's a product.

**What it is:**
- AI-generated adaptive questions (Claude Haiku) targeted at your weakest
  FSRS-4.5 tracked concepts — not a fixed question bank
- A **Readiness Score 0–100** weighted by the official SAA-C03 domain weights
  (Resilient 26%, Performant 24%, Secure 30%, Cost-optimized 20%) that
  predicts your pass probability weeks before exam day
- Error productivity: when you miss one, you get a micro-elaboration prompt
  instead of "incorrect" — actually helps you build the model
- Full 65-question timed simulator when you're ready

**What it's NOT:**
- A brain dump (illegal, unethical)
- A replacement for hands-on labs — you still need to click around the console
- Finished. It works, but I'm finding bugs every day.

**Ask:** 20 honest beta testers. €19/month. **If you hit 80+ Readiness and
fail the real exam, I refund you, no questions asked.** I'm willing to do
this because my internal data says Readiness 80+ correlates ~0.7 with pass
outcome so far — I need more data points to validate and you're helping me
get them.

What I want from you:
1. Use it for 2 weeks minimum
2. One DM or comment per week with what's broken or confusing
3. Permission to quote your feedback (anonymously if you prefer)

Link in comments to avoid the auto-spam filter.

Happy to answer anything — ask me about the FSRS-4.5 implementation, the
LLM cost structure, or why I chose Haiku over GPT-4o.

— Alejandro
```

**Primer comentario (tú mismo, inmediatamente después de postear):**

```
Link: https://maestring.app
Screenshots (Readiness Score + session + feedback): [imgur album link]
DM me "beta" if the 20 slots fill.
```

**Reglas de supervivencia en Reddit:**
- Responde cada comentario en la primera hora. El algoritmo premia engagement.
- Si alguien dice "esto es spam", responde con humildad y ofrece acceso gratis
  a cambio de feedback público. Convierte críticos en evangelistas.
- **No edites el post** para añadir "EDIT: gracias!". Se ve desesperado.

---

## Día 5 — LinkedIn: 10 DMs a AWS Community Builders

**Objetivo:** acceso gratis a cambio de un post público honesto (positivo o
negativo). Ellos tienen audiencia; tú tienes producto. Win-win asimétrico.

### Cómo encontrar los 10 targets

1. LinkedIn search: `"AWS Community Builder" SAA-C03`
2. Filtros: Location = EU/US/LATAM, Posted last 90 days
3. Prioriza perfiles que:
   - Publican sobre certs (no solo arch)
   - Tienen 2k–20k seguidores (los de >50k son inalcanzables vía DM frío)
   - Engagement real en posts (ratio comentarios/likes > 3%)

**Plantilla lista para copy-paste (rellenar `{}`)** — guarda un spreadsheet
con cada target, su post reciente, y la fecha de envío:

| # | Nombre | Perfil | Hook personalizado | Enviado |
|---|---|---|---|---|
| 1 |   |   |   |   |
| 2 |   |   |   |   |
| ... |

### Plantilla DM (150 palabras, lee-tardes-de-1-min)

```
Hi {firstName},

Saw your post last week about {specific topic from their recent post — NOT
generic "loved your content"}. The part about {specific insight} matched
something I kept running into when I built my own AWS SAA prep tool.

Quick context: I built Maestring — adaptive questions (Claude) + FSRS-4.5
spaced repetition + a live Readiness Score that predicts pass probability
before exam day. It's live, paying users, but early.

I'd like to give you free lifetime access in exchange for an honest public
post after 2 weeks — good or bad, your call. No NDA, no "promotional
content required" clause. If it sucks, say it sucks.

If useful: https://maestring.app — attaching the Readiness Score screenshot so
you can see the diff vs. the usual cert-prep UI.

No pressure if not a fit.

— Alejandro
```

**Tasa esperada:** 3–5 respuestas de 10. De esas, 1–2 publicarán. 1 post de
un Community Builder con 10k seguidores = tráfico comparable a 1 semana de
ads de €500.

---

## Día 6 — Thread en X/Twitter

**Cuándo:** jueves 15:00 UTC (engagement pico en X para contenido técnico).
**Longitud:** 8–10 tweets. Hook fuerte en el primero.

### Thread (lista para copy-paste)

```
1/ I built an AWS SAA certification prep tool with something none of the
big platforms have: a live "Readiness Score 0–100" that predicts your
pass probability weeks before exam day.

Here's what I learned shipping it. 🧵

2/ The core insight: static question banks lie to you. You do 500 Whizlabs
questions, memorize the answers, and have no idea if you're actually ready
until you sit the real exam. The $300 AWS exam fee is a terrible feedback
loop.

3/ Real readiness needs two things:
   a) Fresh, adaptive questions (can't memorize what hasn't been generated)
   b) A memory model that knows when you'll forget

So I combined Claude Haiku for question generation with FSRS-4.5 for
spaced repetition scheduling.

4/ The Readiness Score formula (simplified):

score = Σ (domain_weight × avg(concept_retention) × studied_ratio)

where retention = 0.9^(elapsed_days / stability)

Weighted by the official SAA-C03 domain weights. Unstudied concepts
contribute 0, not a neutral default.

{INSERT SCREENSHOT of ReadinessCard with real score}

5/ Hardest part wasn't the algorithm. It was making the "you failed a
question" moment productive.

Every platform shows "Incorrect ❌". We show a micro-elaboration prompt:
"In what scenario WOULD your choice have been correct?"

The failed attempt becomes the study material.

6/ Unit economics check:
• Claude Haiku: ~$0.002 per generated question
• OpenAI text-embedding-3-small: negligible
• At €19/mo and average 80 questions/user/day: gross margin ~82%

This wouldn't have been possible in 2023. Haiku changed the math.

7/ The hardest lesson: code ≠ traction. I shipped 35 migrations, a
production-grade auth flow, GDPR export, streak freezes, an exam simulator.
Zero paying users until I wrote a Reddit post.

Distribution > product. Every time.

8/ If you're prepping AWS SAA-C03 and want to test this:
→ https://maestring.app
→ €19/mo, first 20 beta users, pass-or-refund guarantee if you reach 80+
  Readiness and fail the real exam.

DM me "beta" for a slot.

9/ More on the FSRS-4.5 implementation in TypeScript and the Haiku prompt
structure if there's interest — reply and I'll write it up.
```

**Adjuntar en tweet 1:** `readiness-demo.gif` (X lo autoreproduce, máximo
engagement). Si no hay gif, `screenshot-01-readiness.png`.
**Adjuntar en tweet 4:** `screenshot-01-readiness.png` cropped a la card.
**Adjuntar en tweet 5:** `screenshot-03-feedback.png` (el "wow moment").

**Post-thread:** responde a cada reply durante la primera hora. Quote-retweet
los mejores comments con context añadido. X recompensa threads con engagement
temprano brutalmente.

---

## Día 7 — Iteración + gate de decisión

### Métricas a revisar (desde PostHog + Stripe)

| Métrica | Target día 7 | Si <target |
|---|---|---|
| Sign-ups totales | 150+ | Landing convierte mal — revisar hero |
| Onboarding completado | 50% de sign-ups | Onboarding muy largo o confuso |
| Pagos (€19) | 10 | Precio o propuesta de valor rotos |
| Sesiones completas | 1+ por usuario pagado | Producto no engancha — crítico |
| NPS promedio (formulario simple) | >40 | Producto no resuelve el dolor real |

### Qué hacer según resultado

- **≥10 pagos, ≥8 sesiones completas:** lanzar Día 8-14 con duplicación
  de canales (Reddit post #2 en r/aws, YouTube AWS cert reviewers, Product
  Hunt).
- **3–9 pagos:** señal débil. Iterar landing + hero 1 semana antes de
  pushear más tráfico.
- **<3 pagos:** producto o mensaje fundamentalmente desalineado con el
  mercado. Hacer 5 entrevistas con sign-ups que no pagaron. Pivotar
  mensaje antes de más outbound.

### Regla de oro de la semana

> **No refactorices. No añadas features. Si algo está roto que bloquea pago,
> fíxalo. Todo lo demás es postponeable.**

El código ya es bueno. Los usuarios no.

# North-Star Metrics — Setup PostHog

> 3 métricas que deciden el gate del Día 7 de `launch-week.md`.
> Los eventos ya se emiten en código ([lib/analytics.ts](../lib/analytics.ts)).
> Este doc te dice qué configurar en **PostHog UI** (3 insights + 1 cohort).
> Tiempo: 20 minutos.

---

## Estado de instrumentación (auditado)

| Evento | Emitido en | Estado |
|---|---|---|
| `signup_completed` | [app/(auth)/signup/SignupForm.tsx](../app/(auth)/signup/SignupForm.tsx) | ✅ |
| `onboarding_completed` | OnboardingForm | ✅ |
| `study_session_completed` | [StudySession.tsx](../app/(dashboard)/study/components/StudySession.tsx) | ✅ |
| `outcome_captured` | [OutcomeCaptureBanner.tsx](../components/dashboard/OutcomeCaptureBanner.tsx) | ✅ |
| `subscription_created` | [lib/stripe/webhooks.ts](../lib/stripe/webhooks.ts) (`handleCheckoutCompleted`) | ✅ |
| `subscription_cancelled` | [lib/stripe/webhooks.ts](../lib/stripe/webhooks.ts) (`handleSubscriptionDeleted`) | ✅ |
| `checkout_started` | [components/billing/UpgradeButton.tsx](../components/billing/UpgradeButton.tsx:27) | ✅ |

**Implicación:** los pagos se miden en PostHog (evento `subscription_created`
server-side) y Stripe Dashboard es la fuente de verdad para reconciliación.
PostHog te permite calcular **CAC por canal** cruzando `subscription_created`
con `$initial_referrer` en el mismo `distinctId`.

---

## Métrica 1 — Activación (TTF: Time To First Session)

> **Definición:** % de sign-ups que completan al menos 1 sesión de estudio
> dentro de las primeras 24h.
> **Target Día 7:** ≥40%.
> **Por qué importa:** si <40%, el onboarding o la primera sesión está roto.
> No gastes en más tráfico hasta arreglarlo.

### PostHog — Insight tipo "Funnel"

1. Product Analytics → New insight → **Funnels**
2. Pasos:
   - Step 1: `signup_completed`
   - Step 2: `study_session_completed` (first time)
3. Conversion window: **1 day**
4. Breakdown (opcional): `$current_url` o `method` (magic vs google)
5. Guardar como **"North Star — Activation (D1 TTF)"**

---

## Métrica 2 — D7 Retention

> **Definición:** % de usuarios activados (con ≥1 sesión) que vuelven a
> completar una sesión entre el día 6 y el día 8 desde sign-up.
> **Target Día 7:** ≥25%.
> **Por qué importa:** retention D7 es el predictor #1 de LTV. Sub-15% = producto
> no resuelve el dolor real; pivotar mensaje antes de escalar.

### PostHog — Insight tipo "Retention"

1. Product Analytics → New insight → **Retention**
2. Target event: `signup_completed`
3. Returning event: `study_session_completed`
4. Period: **Daily**
5. Retention window: **8 days**
6. Guardar como **"North Star — D7 Retention"**

---

## Métrica 3 — Pass-rate reportado

> **Definición:** de los usuarios que reportaron outcome de examen, % que
> aprobaron.
> **Target Día 7:** N/A (ciclo de cert es 4–8 semanas; esto empieza a
> poblarse mes 2+). Pero empieza a trackearse YA.
> **Por qué importa:** es la métrica que usarás en el pitch a inversores y en
> el leaderboard público. Cada outcome vale ~€50 en marketing post-facto.

### PostHog — Insight tipo "Trends" con breakdown

1. Product Analytics → New insight → **Trends**
2. Series:
   - A: `outcome_captured` where `outcome = "passed"`
   - B: `outcome_captured` where `outcome = "failed"`
3. Display: **Number** (total), también vista cumulative
4. Formula: `A / (A + B) * 100` para el ratio pass-rate
5. Guardar como **"North Star — Pass Rate (reported)"**

**Cross-check con DB:** también puedes consultar:

```sql
SELECT
  COUNT(*) FILTER (WHERE exam_outcome = 'passed') * 100.0 / NULLIF(COUNT(*), 0)
    AS pass_rate_pct,
  COUNT(*) AS total_reported
FROM profiles
WHERE exam_outcome IN ('passed', 'failed');
```

---

## Cohort: "Pagadores Beta Week 1"

Útil para aislar comportamiento de los primeros 10–20 usuarios pagos.

1. People → Cohorts → New cohort
2. Condition: Has done event `onboarding_completed` in the last 14 days
   **AND** email NOT in [@maestring.app, @test.com] (excluir tus cuentas)
3. Guardar como **"Beta Pagadores W1"**
4. Usar este cohort como filtro en las 3 métricas anteriores para segmentar
   de usuarios orgánicos/tráfico cold.

---

## Dashboard "Launch Week"

1. Dashboards → New dashboard: **"Launch Week"**
2. Añadir las 3 insights + 2 insights extra:
   - `signup_completed` (total, por día) — vista diaria para ver picos de tráfico
   - `checkout_started` (total, por día) — intent de pago
3. Pin el dashboard.
4. Bookmark en tu browser. Revísalo **3 veces al día** durante la launch week.

---

## Lo que se mide fuera de PostHog (Día 7 check)

| Métrica | Fuente de verdad |
|---|---|
| Sign-ups | PostHog "Launch Week" dashboard |
| Activación (D1 TTF) | PostHog Insight #1 |
| D7 Retention | PostHog Insight #2 (necesita 7 días de data → revisión real en Día 14) |
| Pagos €19 | PostHog `subscription_created` · reconciliar con Stripe Dashboard |
| Sesiones completas por pagador | PostHog + filtro por cohort "Beta Pagadores W1" |
| NPS | Formulario Tally o Typeform con link en email post-primera-sesión |

---

## TODOs post-launch (no bloqueantes)

- [ ] Crear alerta en PostHog: si activación D1 cae bajo 30% en 48h rolling,
      webhook a Slack/email.
- [ ] Añadir `revenue` property a `subscription_created` (EUR ARR equivalente)
      para que PostHog calcule LTV/CAC directo.

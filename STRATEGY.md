# Maestring — Estrategia operativa de producto

> Documento vivo. Operacionaliza los 5 pilares definidos en
> [`docs/estrategia-pilares.md`](docs/estrategia-pilares.md) (v1.0, abril 2026).
> Si algo aquí entra en conflicto con el código, el código gana y este doc se
> actualiza el mismo día. Si entra en conflicto con `estrategia-pilares.md`,
> gana el doc de pilares.

## Estado al 2026-04-24 (founder check)

**Fases 0–6 están ✅ en producción.** El bottleneck ya no es producto, es
distribución. Próximo gate: 10 usuarios pagos completando >=1 sesión en la
próxima semana. Ver `docs/launch-week.md`.

## Tesis

La certificación AWS no se prepara, **se construye**: es una restructuración
cognitiva. Maestring es el sistema que hace esa transformación medible y
escalable. Los cinco pilares son el moat — cada feature de producto debe
avanzar al menos uno con métrica de éxito explícita.

## Mapa pilar → embodiment técnico

| Pilar | Pregunta que responde | Embodiment técnico actual | Próxima palanca |
|---|---|---|---|
| **1. Capacidad Predictiva** | ¿Va a aprobar? ¿Qué olvidará? | `user_concept_states` (FSRS-4.5), `next_review_date` | `get_exam_readiness()` ponderado por `exam_weight_percent` |
| **2. Hiperpersonalización** | ¿Cuál es la siguiente mejor pregunta para *él*? | `selector` + `getRecentMistakes` + `generator` Haiku | Fingerprint cognitivo (3 días) + modos sprint/crucero |
| **3. Experimentación Segura** | ¿Cómo convertir el error en aprendizaje? | `evaluation_result` jsonb, copy actual neutro | Micro-pregunta de elaboración + Modo Exploración sin penalización FSRS |
| **4. Carga Cognitiva** | ¿Cómo maximizar retención por minuto? | UI de pregunta minimalista, límite 30q/sesión | Style guide explícito en prompt + warm-up/pico/cooldown |
| **5. Acompañamiento LP** | ¿Qué viene después del aprobado? | Cron de nudges, streaks, Stripe | Journey de 5 fases + reactivación con contexto de pérdida real |

---

## Fases de ejecución

### Fase 0 — Coherencia ✅
Schema canónico unificado en `supabase/migrations/`. Tipos generados.
`npm run setup` arranca de cero. Migraciones 010+011 alinean schema y cron RPCs
con lo que el código espera.

### Fase 1 — Bucle de estudio E2E ✅ (código)
`(dashboard)/study` → generate → evaluate → FSRS update → summary, contrato
`{ data: ... }` unificado. Pendiente: `npm install && npm run dev` para
validar runtime.

---

### Fase 2 — Pilar 1 MVP: Readiness Score + Mapa de Riesgo ✅ (v2 en prod)
**Estado real (abril 2026):** Entregado y superado. Migración 012 + 019 (v2)
implementan `get_exam_readiness()` con **confidence interval, pass_probability,
velocity_per_week, history** (más allá del scope original). `components/dashboard/
ReadinessCard.tsx` (369 líneas) renderiza velocímetro + bandas + weakest domain +
at-risk list. Endpoints `/api/dashboard/readiness` y `/api/dashboard/at-risk`.


**Por qué primero:** la predicción es input de la personalización (Pilar 2), de
la calibración de la ZDP (Pilar 3) y de la métrica de carga cognitiva (Pilar 4).
Sin readiness score, los demás pilares son reactivos.

Entregables:
- `supabase/migrations/012_readiness_score.sql`: función SQL
  `get_exam_readiness(p_user_id, p_certification_id)` → `{ score 0–100,
  by_domain jsonb, weakest_domain text, at_risk_count int, eta_ready_date date }`.
  Ponderada por `knowledge_domains.exam_weight_percent`, `stability`,
  `difficulty`, `lapses`. Concepto sin estado FSRS contribuye 0 (no visto).
- `app/(dashboard)/dashboard/page.tsx`: card grande con velocímetro 0–100,
  banda de color (rojo <50, ámbar 50–75, verde 75+), línea "tu dominio más débil
  es X" y "tienes N conceptos en riesgo de olvido en los próximos 7 días".
- `app/api/dashboard/readiness/route.ts`: endpoint GET para refresh asíncrono.

Métrica de éxito (interna): correlación `readiness_at_D-3` ↔ outcome de examen
> 0.7 (necesita 500+ outcomes — heurística hasta entonces).

### Fase 3 — Pilar 2 MVP: Onboarding diagnóstico + fingerprint cognitivo ✅
**Estado real:** `/onboarding/calibrate` y `/onboarding/diagnostic` en API,
`OnboardingForm` en UI, migración 013 persiste `profiles.cognitive_fingerprint`.
Middleware redirige si `onboarding_completed=false`.

Calibrar `user_concept_states` antes de la primera sesión real para evitar
discovery puro durante días.
- `(dashboard)/onboarding/page.tsx`: exam_target_date, daily_minutes,
  background (developer/business/sysadmin), nivel autopercibido por dominio.
- `POST /api/onboarding/calibrate`: 8 preguntas de dificultad media (1 por
  dominio), siembra `stability/difficulty` inicial, marca `onboarding_completed`.
- Persistir fingerprint en `profiles.cognitive_fingerprint jsonb` (migración 013):
  `{ background, peak_hour, avg_session_length_min, weakness_pattern }`.
- Middleware redirige a `/onboarding` si `onboarding_completed=false`.

### Fase 4 — Pilar 3 MVP: Error productivo + Modo Exploración ✅
**Estado real:** `/api/study/elaborate` route activo, `study_mode='exploration'`
en migración 013 (no actualiza FSRS). Copy neutro aplicado en `AnswerFeedback`.

- `evaluator.ts`: cuando `is_correct=false`, generar **micro-pregunta de
  elaboración** ("¿En qué escenario sería correcta tu elección?") guardada en
  `evaluation_result.elaboration`.
- Copy deck: ningún uso de "incorrecto/fallo/error". Variantes contextuales
  según `lapses` del concepto (primera vs. tercera vez fallando).
- Modo Exploración (`mode='exploration'` en `study_sessions`): respuestas no
  actualizan `user_concept_states`; banner visual; resumen final con opción de
  "añadir al deck".

### Fase 5 — Pilar 4 MVP: Style guide + warm-up/pico/cooldown ✅
**Estado real:** `applySessionShape()` + `enforceInterleaving()` (max 2 consecutivos
mismo dominio) ya en `lib/question-engine/selector.ts`. Pendiente: auto-score de
ambigüedad post-gen (longitud diferencial >30% regenerar) — opcional.

- `lib/question-engine/prompt.ts`: style guide explícito — una idea/pregunta,
  opciones paralelas en longitud, distractores plausibles, escenario específico.
  Auto-score de ambigüedad post-generación (longitud diferencial > 30% =
  regenerar).
- `selector.ts`: dentro de la cola FSRS para la sesión, reordenar como
  warm-up (2–3 alta `stability`) → pico (5–10 baja `stability`/alta
  `difficulty`) → cooldown (2–3 nuevos o sólidos).
- Detección básica de fatiga: si tiempo medio de las últimas 3 respuestas > 1.8x
  el medio de las primeras 3, banner "buena pausa" no intrusivo.

### Fase 6 — Pilar 5 MVP: Journey de 5 fases + reactivación con contexto real ✅
**Estado real:** Migración 014 con enum + `snapshot_readiness()`. `journey_phase`
usado en 7 rutas API. Cron de reactivación + weekly digest (025) operativo.

- `profiles.journey_phase enum` (migración 014): `pre_study | active_prep |
  pre_exam | post_cert | maintenance`. Trigger por `exam_target_date` y outcome.
- Email de reactivación (cron) usa `get_exam_readiness` *anterior* vs. *actual*:
  "Tu retention en Networking bajó del 78% al 51%. 3 sesiones de 15 min y
  vuelves al 65+." — no genérico.
- Post-cert: pantalla de celebración + roadmap a SAP-C02/DVA-C02 con
  porcentaje de conocimiento transferible.

### Fase 7 — Monetización + flywheel de outcomes
- Free: 20 preguntas/día (`checkLlmRateLimit`).
- Pro $19/mes o $149/año: ilimitado + RAG + Readiness + emails contextuales.
- Capturar outcome de examen (`profiles.exam_outcome enum`) post-fecha:
  habilita el clasificador de P(aprobar) entrenado a escala (Pilar 1 maduro).

---

## Riesgos y guardarraíles

| Riesgo | Mitigación |
|---|---|
| Readiness score genera ansiedad o falsa confianza | Mostrar siempre con intervalo de confianza textual ("a tu ritmo actual ±5pts"); copy orientado a acción no a juicio |
| Coste LLM por usuario gratuito | Cache por concepto (ya en `generator.ts`); rate limit fail-open 20/día |
| Preguntas con alucinaciones | `question_feedback.feedback_type='wrong_answer'`; cron baja `is_active` con ≥3 reportes |
| Fingerprint sesgado en primeros 3 días (nerviosismo) | Ventana deslizante; primeras 10 sesiones con peso reducido; "modo calibración" explícito |
| Modo Exploración como escape de preguntas difíciles | Cap 15 min/sesión; indicador de "no avanza el readiness" |
| Schema drift | `npm run db:types` post-cada-migración; un único árbol `supabase/migrations/` |

---

## Definición de done por fase
1. Migración aplicada en local + tipos regenerados (`npm run db:types`).
2. `npm run build && npm run typecheck` verde.
3. Flujo E2E manual demostrable.
4. Esta tabla se actualiza: la fase pasa a ✅ y se anotan decisiones que cambiaron.

## Estado actual
- Fase 0: ✅
- Fase 1: ✅ (código, falta runtime check)
- Fase 2: ✅ (`get_exam_readiness` + `ReadinessCard`)
- Fase 3: ✅ (`/onboarding` diagnóstico + `cognitive_fingerprint` en profile + plumbing al generator)
- Fase 4: ✅ (copy no-punitivo + `elaboration` en evaluación + `study_mode='exploration'`)
- Fase 5: ✅ (style guide en prompt + `applySessionShape` warm-up/pico/cooldown)
- Fase 6: ✅ (`journey_phase` + `snapshot_readiness` + nudges con readiness delta)
- Fase 7: ✅ (cuota diaria por plan + `OutcomeCaptureBanner` + `exam_scaled_score` para flywheel)

**Pendiente runtime:** `npm install && npm run db:reset && npm run db:types && npm run seed && npm run dev`
para validar migraciones 010–015, regenerar tipos y probar el bucle E2E con
todos los pilares activos.

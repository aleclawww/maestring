# Curriculum & Content-Generation Strategy

> **Problema a resolver:** ¿cómo construimos un temario SAA-C03 fiel al examen
> oficial, generamos miles de preguntas de alta calidad **sin gastar API**, y
> creamos un "gemelo digital" que adapte el estudio a cada usuario?
>
> **Constraint dominante:** *coste por pregunta debe tender a cero*. Sólo
> queremos quemar Anthropic API en la experiencia adaptativa "última milla"
> (cuando ya no podemos servir desde el pool pre-generado).

---

## 1. Fuentes de verdad oficiales (todo gratis)

Estas son las únicas fuentes que pueden ser citadas como "alineamos con
el examen real":

| Fuente | Qué saca | Coste | Licencia |
|---|---|---|---|
| **AWS Certified Solutions Architect – Associate (SAA-C03) Exam Guide PDF** | Blueprint canónico: 4 dominios, % oficiales, task statements, knowledge required, skills required | Gratis | Free use, no redistribuir literalmente |
| **AWS Sample Questions PDF (10 preguntas)** | Estilo y dificultad real | Gratis | Mismo |
| **AWS Skill Builder · "Exam Prep Standard – SAA-C03"** | ~50 preguntas de muestra + cobertura por dominio | Gratis (cuenta AWS) | Sólo uso personal |
| **AWS Skill Builder · "Exam Readiness: SAA-C03"** | Resumen condensado dominio por dominio + ~20 sample Qs | Gratis | Igual |
| **AWS Whitepapers (~15 PDFs relevantes)** | Well-Architected (5 pilares), Reliability, Security, Cost Optimization, Performance Efficiency, Operational Excellence, Disaster Recovery, Hybrid Connectivity, Cloud Adoption Framework | Gratis (PDF público) | Atribución, no modificar |
| **AWS Documentation oficial** | Detalle por servicio, FAQs, mejores prácticas — la fuente más exhaustiva | Gratis, scrapeable | Ver robots.txt + atribución |
| **AWS re:Invent talks (YouTube)** | Casos reales, transcripts auto-generados | Gratis | Atribución para citas |
| **AWS Architecture Blog** | Patterns y reference architectures | Gratis | Atribución |
| **AWS Blueprint Mapping Tool (interno, manual)** | Tabla CSV: task-statement-id → concept-slug → topic-slug → service-list | Tu trabajo | Nuestro |

**Acción inmediata (Día 1, 4h):**

1. Descargar el SAA-C03 Exam Guide PDF más reciente.
2. Extraer cada *task statement* en una hoja `data/saa-c03-blueprint.csv` con columnas:
   `domain | task_id | task_statement | knowledge_required | skills_required | suggested_concepts`.
3. Cruzar con nuestros 79 conceptos del KG. Cada task statement debe mapear a ≥1 concept slug.
4. Identificar gaps: task statements sin concepto cubierto → backlog para
   ampliar `lib/knowledge-graph/aws-saa.ts`.

Resultado: **prueba de cobertura objetiva**. Podemos decir "cubrimos N task
statements oficiales de N totales" — argumento de venta y de garantía.

---

## 2. Catálogo de tipos de pregunta SAA-C03

Distribución observada en el examen real (~65 preguntas):

| Tipo | % | Notas |
|---|---|---|
| Single-answer MC (4 opciones) | ~85% | Default actual de Maestring |
| Multiple-response (2-3 correctas de 5-6) | ~15% | Falta soporte en UI/DB |
| Drag-and-drop (mapear servicios a casos) | rare | No hay |
| Ordering (secuenciar pasos) | rare | No hay |

### Patrones de pregunta que más se repiten

Categorizamos cada pregunta del pool con un `pattern_tag`:

| Pattern tag | Ejemplo de stem | Trampa típica |
|---|---|---|
| `most-cost-effective` | "Most cost-effective solution that meets…" | Distractor más barato pero sin cumplir requirement |
| `least-operational-overhead` | "…with the LEAST operational overhead" | Distractor "manual" o self-managed |
| `highest-availability` | "…that ensures high availability" | Single-AZ que parece HA |
| `most-secure` | "…most secure way to grant access" | Hardcoded credentials, IAM users en vez de roles |
| `lowest-latency` | "…minimum latency to global users" | Solo CloudFront cuando hace falta Global Accelerator |
| `dr-rpo-rto` | "…RPO of 5 minutes, RTO 1 hour" | RPO/RTO mismatch con la solución elegida |
| `migrate-minimal-disruption` | "…migrate with minimal application change" | Refactor pesado vs lift-and-shift |
| `compliance-immutable` | "…meet 7-year SEC compliance" | Lifecycle a Glacier sin Object Lock |
| `event-driven-decoupling` | "Decouple producer from consumer" | Tight-coupling con Lambda invocando otro Lambda |
| `cross-account-access` | "Allow account A to access bucket in B" | IAM user en B vs IAM role assumido |

**Cada pregunta del pool debe llevar:** `concept_slug`, `pattern_tag`,
`difficulty`, `domain`, `expected_distractor_type` (para "trap analysis"
del gemelo digital — ver §5).

---

## 3. Plan de generación de contenido — capas en orden de coste creciente

Estrategia: **escurrir cada gota de contenido gratis antes de tocar la API
pagada**. Cuatro capas, ejecutadas en este orden.

### Capa 0 — Contenido manual de alta señal (SEMANA 1)

Lo que hace 1 humano en 8h enfocado:

- **10 preguntas de la sample exam oficial AWS** (transcripción + adaptación
  con cambio de empresa/región para no infringir copyright literal).
- **50 preguntas de Exam Readiness** (Skill Builder gratis) — mismo proceso.
- **~30 preguntas de FAQ sections** de los whitepapers (S3 FAQ, EC2 FAQ,
  VPC FAQ ya vienen en formato Q&A).

**Total:** ~90 preguntas de calidad oro, sin LLM, sin coste.
Source = `manual-curated`. Marcar como `is_canonical=true` (nuevo flag) →
estas son la "spine" sobre la que entrenamos el resto.

### Capa 1 — Generación templated (combinatorial, sin LLM)

Idea: muchas preguntas son **slots variables sobre plantillas fijas**.

```typescript
// lib/question-engine/templates.ts (a crear)
export const TEMPLATES = [
  {
    id: 'cost-effective-storage',
    pattern: 'most-cost-effective',
    stem: 'A company stores {DATA_TYPE} accessed {ACCESS_PATTERN}. Which storage class is MOST cost-effective?',
    slots: {
      DATA_TYPE: ['log files', 'image thumbnails', 'compliance archives', 'database backups'],
      ACCESS_PATTERN: [
        { val: 'less than once a quarter', answer: 'glacier-instant' },
        { val: 'about once a month', answer: 'standard-ia' },
        { val: 'multiple times daily', answer: 'standard' },
        { val: 'unknown but variable', answer: 'intelligent-tiering' },
      ],
    },
    options: ['S3 Standard', 'S3 Standard-IA', 'S3 Glacier Instant', 'S3 Intelligent-Tiering'],
    explanationTemplate: '{ACCESS_PATTERN} corresponds to {ANSWER} because…',
  },
  // ... 30-50 templates más
]
```

Combinatoria: 30 templates × 8 slot-combinations promedio = **240
preguntas determinísticas sin LLM**.

Calidad: media (no hay matiz humano), pero cubren los 4 dominios uniforme
y sirven para **pre-test** y **drill repetitivo** sin agotar pool premium.

Source = `template-generated`. Auto-aprobadas (no van por review queue
porque la lógica garantiza correctness).

### Capa 2 — LLMs gratuitos en batch nocturno (SEMANA 2-4)

Free tiers actualmente disponibles (verificar cuotas en deploy):

| Provider | Modelo | Free tier | Calidad SAA-C03 |
|---|---|---|---|
| **Google Gemini** | Gemini 2.5 Flash | 15 RPM, **1M tokens/día** | Buena, output JSON estable |
| **Groq** | Llama 3.3 70B | 30 RPM, ~14k tokens/min | Buena pero menos consistente |
| **Cerebras** | Llama 3.1 70B | Gratis con waitlist | Latencia muy baja |
| **Together.ai** | Varios | $25 crédito inicial | Para diversidad de outputs |
| **Mistral La Plateforme** | Mistral Large | Free tier limitado | OK para distractor diversification |
| **Cohere** | Command R+ | 1000 calls/mes free | OK para evaluación QA |

**Estrategia:**

1. **Batch generator** (`scripts/seed-questions-batch.ts`):
   - Carga conceptos del KG.
   - Para cada concepto: genera 10 preguntas con Gemini Flash usando el
     mismo prompt actual de `lib/question-engine/prompts.ts`.
   - 79 conceptos × 10 = **790 preguntas/día** dentro del free tier de
     Gemini (1M tokens cubre ~1500 preguntas).
   - Inserta con `source='gemini-free'` y `review_status='pending'`.

2. **QA cross-check** (otro provider gratuito):
   - Llama 3.3 70B vía Groq evalúa cada pregunta:
     ¿la `correctIndex` es realmente correcta? ¿los distractors son válidos?
   - Si modelo discrepa con `correctIndex`, marca `review_status='needs_human'`.
   - Esto es **disagreement-as-signal**: dos LLMs distintos coinciden →
     alta confianza; discrepan → revisión humana de 30 segundos.

3. **Diversity sampling**:
   - Cada pregunta lleva `variation_seed` para que el siguiente batch
     genere variantes (cambiar empresa/región/escala) sin repetir stems.

Resultado en 14 días: **~10.000 preguntas en pool**, revisión humana
sólo de las que dispararon disagreement (~5-10% = 500-1000 ítems, factible
en 4-6h de trabajo distribuido en sprints de 30 min).

### Capa 3 — Anthropic API (Haiku) sólo en hot path (PRODUCCIÓN)

Reservar para:

- **Adaptación última milla:** cuando el selector necesita una pregunta
  perfectamente calibrada al `cognitive_fingerprint` del usuario y el pool
  no tiene match (debería ser <5% de los hits).
- **Evaluación elaborada:** cuando un usuario falla y pide explicación
  más profunda (`elaborateAnswer`). Quota separada por usuario.
- **Generación de mock-exam**: ensamblar 65 preguntas con weights oficiales
  y asegurar que ninguna ya fue vista por el usuario.

**Coste estimado tras pool maduro:** <$0.10/usuario activo/mes.

---

## 4. Métodos de estudio (pedagogía implementada y por implementar)

### Ya en producción

- ✅ **Spaced repetition** (FSRS-4.5 vía `ts-fsrs`)
- ✅ **Interleaving** entre dominios (selector aplica `enforceInterleaving`)
- ✅ **Generation effect / elaboration** en error (micro-pregunta de elaboración tras fallo)
- ✅ **Desirable difficulty** (selector eleva difficulty cuando user va bien)
- ✅ **Session shape** warm-up → peak → cooldown (`applySessionShape`)

### Lo que falta y multiplica eficacia con el pool ya pre-generado

| Modalidad | Cómo se implementa | Coste |
|---|---|---|
| **Active recall sin opciones** | Mostrar stem sin opciones; user escribe respuesta corta; LLM gratuito (o keyword match local) la valida | Gratis con keyword match, mínimo con LLM |
| **Comparison drills** | Tabla "rellena las diferencias entre X y Y"; rows generadas a partir de `confusedWith` del KG | Cero LLM (puro KG) |
| **Decision trees** | Árbol guiado: "¿necesitas multi-AZ? → ¿cross-region? → ..." → recomienda servicio | Cero LLM (lógica estática) |
| **Anti-pattern drills** | Mostramos arquitectura defectuosa; user identifica el error | Manual o template |
| **Case-study chains** | 5 preguntas encadenadas sobre la misma empresa ficticia | Generadas en batch (Capa 2) |
| **Whitepaper QA mode** | Mostrar párrafo de WAF; user responde basándose en él (open-book) | Cero LLM (chunks ya en RAG) |
| **Confidence calibration** | Antes de responder, user predice "estoy 80% seguro"; medir Brier score | Pure UI, cero coste |
| **Mock-exam timed mode** | 65 Q en 130 min, sin review intermedio, score con CI | Selección desde pool (Capa 0+1+2) |

**Action item:** crear migración `036_question_modalities.sql` que extienda
el enum `question_type` con `free_response`, `comparison`, `decision_tree`,
`anti_pattern`, `case_study_chain`. Soporta el resto desde el principio.

---

## 5. Gemelo digital — qué adaptar y cómo

El `cognitive_fingerprint` actual (migration 013) captura learning style
básico. Lo que **falta** para un gemelo de verdad:

### Dimensiones a añadir al fingerprint

```jsonc
{
  // existente:
  "learning_style": "visual" | "verbal" | "kinesthetic",
  "pace": "fast" | "moderate" | "slow",

  // nuevo:
  "trap_susceptibility": {
    "most-cost-effective":   { attempts: 23, traps_taken: 9 },  // 39% trap rate
    "least-operational-overhead": { attempts: 15, traps_taken: 2 },
    // ... un slot por pattern_tag
  },
  "distractor_pattern": {
    // qué TIPO de distractor incorrecto eligió cuando falló
    "underestimates-availability": 7,
    "ignores-cost-in-multi-region": 4,
    "confuses-async-with-sync": 3
  },
  "time_pressure_decay": {
    // accuracy en 1er cuarto vs último cuarto de sesión
    "first_quartile_acc": 0.84,
    "last_quartile_acc": 0.61   // diff > 0.15 = trabajar resistencia mental
  },
  "domain_transfer_strength": {
    // si user domina S3 storage classes, ¿cuán bien predice eso s3-lifecycle?
    "s3-storage-classes -> s3-lifecycle": 0.78,
    // calculado offline desde correlación de aciertos
  },
  "circadian_window": {
    // hora del día con mejor accuracy
    "best_hour_utc": 18,
    "best_day": "tuesday"
  },
  "peak_session_length_min": 22,  // a partir de qué punto colapsa
  "elaboration_response_quality": 0.62  // si las micro-preguntas aterrizan
}
```

### Cómo se actualiza (sin LLM)

- Cada `question_attempt` actualiza ≥1 dimensión del fingerprint mediante
  triggers SQL o función Edge — cero coste.
- `domain_transfer_strength` se recalcula nightly por job batch (cron) con
  un query SQL de correlación.

### Cómo se usa en el selector

- Si `trap_susceptibility.most-cost-effective > 0.30` → selector prioriza
  preguntas con ese pattern_tag hasta bajar a <0.15 (drill targeted).
- Si `time_pressure_decay > 0.15` → ofrecer "modo intervalo" con sesiones
  más cortas y un timed drill al final.
- Si `peak_session_length_min` < 25 → cortar sesión en 22m con cooldown,
  evitar burnout.

Este es el "gemelo digital" real: una representación viva de los **modos
de error**, no sólo del nivel.

---

## 6. Validación y comprobación pre-examen

Pirámide de validación (de menor a mayor cost a usuario):

1. **Concept-level mastery gate**: 8/10 últimos en concepto X → marcar
   `mastered=true`. Sólo entonces el selector lo despasa de revisión activa.
2. **Topic gate**: ≥75% accuracy promedio sobre últimos 30 ítems del topic.
3. **Domain gate**: ≥80% accuracy sobre 50 ítems pesados por blueprint.
4. **Mock exam #1**: 65 ítems desde pool no-visto, weights oficiales,
   timed 130 min. Score reportado con confidence interval.
5. **Mock exam #2 (semana siguiente)**: pool refrescado, comparar con #1.
   Si tendencia es ↑ y score absoluto ≥ 78%, **green light** para examen
   real.
6. **Pre-test calibración**: pedir al user "predice tu score". Brier score
   sobre 5 sesiones nos dice si la confianza está calibrada — un user
   mal calibrado (sobre-estima) recibe warning extra.

Readiness Score (ya implementado) consume estos gates como inputs.

---

## 7. Backlog ejecutivo

Ordenado por palanca de impacto vs esfuerzo:

| # | Tarea | Esfuerzo | Impacto | Capa |
|---|---|---|---|---|
| 1 | Crear `data/saa-c03-blueprint.csv` desde Exam Guide PDF oficial | 4h | 🔥 base de todo | Fuentes |
| 2 | Mapping task-statement → concept-slug (cobertura objetiva) | 4h | 🔥 prueba de garantía | Fuentes |
| 3 | Migración `036`: añadir `pattern_tag`, `is_canonical`, `variation_seed`, `expected_distractor_type` a `questions` | 1h | Alto (habilita todo) | Schema |
| 4 | `scripts/seed-canonical.ts`: cargar las ~90 preguntas manuales | 6h | 🔥 spine | Capa 0 |
| 5 | `lib/question-engine/templates.ts` con 30 templates iniciales | 8h | Alto | Capa 1 |
| 6 | `scripts/seed-from-templates.ts` ejecutable | 2h | Alto | Capa 1 |
| 7 | `scripts/seed-batch-gemini.ts` con free-tier rotation | 6h | 🔥 vol más grande | Capa 2 |
| 8 | `scripts/qa-crosscheck-groq.ts` (disagreement detection) | 4h | Alto (calidad) | Capa 2 |
| 9 | Migración `037`: extender `cognitive_fingerprint` con dimensiones nuevas | 2h | Alto (gemelo) | Schema |
| 10 | Trigger SQL: `update_fingerprint_after_attempt()` | 4h | Alto | Gemelo |
| 11 | Cron nightly: recalcular `domain_transfer_strength` | 2h | Medio | Gemelo |
| 12 | Migración `038`: nuevos `question_type` (free_response, comparison, decision_tree, anti_pattern) | 1h | Medio | Modalidades |
| 13 | UI: mock-exam mode (65 Q timed, no intermediate review) | 8h | 🔥 prueba final | Validación |
| 14 | UI: confidence-prediction toggle por pregunta | 3h | Medio (calibración) | Validación |
| 15 | Admin queue para `review_status='needs_human'` con keyboard shortcuts | 6h | Medio (eficiencia ops) | Ops |

**Total ~61h de trabajo** en orden óptimo. Las tareas 1-8 desbloquean
**~10.000 preguntas en pool** sin tocar Anthropic API. Tareas 9-15 cierran
el círculo del producto.

---

## 8. Métricas de éxito

| Métrica | Target a 4 semanas | Cómo medir |
|---|---|---|
| Cobertura de blueprint | ≥95% de task statements cubiertos por ≥3 conceptos | CSV mapping |
| Tamaño del pool de preguntas | ≥8.000 con `review_status='approved'` | DB count |
| % preguntas servidas desde pool (no LLM hot-path) | ≥95% | Métrica nueva en `recordLlmUsage` |
| Coste API por usuario activo / mes | <$0.15 | Stripe + LLM usage |
| Disagreement rate inter-LLM | <12% (validador del prompt) | QA crosscheck job |
| Accuracy mock-exam vs accuracy examen real (en testers) | gap ≤5pp | Outcome capture |
| Calibración de confidence (Brier score) | <0.20 | Calibration job |

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| AWS cambia el blueprint sin avisar | Job mensual que descarga el PDF y diff'ea task statements; alerta si cambian |
| Free tiers cierran/limitan más | Multi-provider fallback (Gemini → Groq → Cerebras → Mistral); generación batch ya es en oleadas, no un único proveedor |
| Calidad de preguntas LLM-generadas pobre | Disagreement-as-signal + spot-check humano semanal del 1% aleatorio |
| Copyright AWS sample exams | Adaptación (cambiar empresa/escala/región/cifras) — la idea no es copyrightable, la prosa sí |
| User memoriza el pool en vez de aprender | Variation seeds + selector que evita repetir un stem antes de 30 días |
| Anthropic Haiku se encarece | Pool grande ya nos cubre; downgrade automático a free tier si coste/usuario > umbral |

---

## 10. Decisión a tomar antes de empezar

1. **Exam weights** — actualmente (30/28/24/18). Oficial es (Secure 30 / Resilient 26 / Performant 24 / Cost 20). Corregirlo recalcula Readiness Scores existentes. **Recomendación:** corregir antes del primer mock exam para que la métrica sea defendible.
2. **Branding del pool** — ¿dejamos source visible al usuario? *No.* Sólo "Maestring quality-checked". Internamente el `source` field nos sirve para retiros si una camada tiene mala calidad.
3. **Approval queue** — ¿asíncrono nightly o bloqueante para todo nuevo? *Asíncrono.* El selector sólo sirve `review_status='approved'`; el pool crece en background.

---

## Resumen ejecutivo

> Con 60h de trabajo distribuido en 4 semanas, podemos pasar de **79
> conceptos + ~unos cientos de preguntas** a **79 conceptos + 10.000
> preguntas en pool** con cobertura objetiva del blueprint oficial,
> validación inter-LLM, y un fingerprint cognitivo de verdad — todo con
> coste de API tendiente a cero. Anthropic queda como capa de
> personalización última-milla, no como motor de bulk.

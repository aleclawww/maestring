/**
 * Static question generator — zero LLM, zero API keys.
 *
 * Uses the rich structured data already present in each ConceptDefinition
 * (keyFacts, examTips, awsServices, confusedWith) to produce diverse,
 * pedagogically-sound multiple-choice questions algorithmically.
 *
 * 5 question types:
 *   0 SCENARIO       — "A company needs X. Which service/approach is BEST?"
 *   1 TRUE_FACT      — "Which statement about X is CORRECT?"
 *   2 FALSE_FACT     — "Which statement about X is INCORRECT?"
 *   3 WHEN_TO_USE    — "For which use case is X the BEST fit?"
 *   4 VS_COMPARISON  — "What distinguishes X from Y?"
 *
 * `seed` (default 0) selects a different question type AND different
 * source facts on each call, producing up to 25+ unique questions per
 * concept before the cycle repeats.
 */

import { CONCEPTS, type ConceptDefinition } from '@/lib/knowledge-graph/aws-saa'

export interface StaticQuestion {
  questionText: string
  options: string[]      // always 4 options
  correctIndex: number   // 0-3
  explanation: string
  difficulty: number
  questionType: 'multiple_choice'
  // metadata for the selector / FSRS
  conceptSlug: string
  conceptName: string
  patternTag?: string
}

// ─── helpers ────────────────────────────────────────────────────────────────

function pickN<T>(arr: T[], n: number, offset = 0): T[] {
  if (arr.length === 0) return []
  const out: T[] = []
  for (let i = 0; i < n && i < arr.length; i++) {
    out.push(arr[(offset + i) % arr.length]!)
  }
  return out
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = (seed * 1664525 + i * 22695477) % (i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** Place `correct` at position `pos` inside `options`, return [options, newPos]. */
function placeCorrect(correct: string, distractors: string[], pos: number): [string[], number] {
  const opts = [...distractors.slice(0, 3)]
  opts.splice(pos % 4, 0, correct)
  return [opts.slice(0, 4), pos % 4]
}

function getConfusedConcepts(concept: ConceptDefinition): ConceptDefinition[] {
  return concept.confusedWith
    .map(slug => CONCEPTS.find(c => c.slug === slug))
    .filter((c): c is ConceptDefinition => c !== undefined)
}

/**
 * Extract the "condition" part of an examTip in the format:
 *   '"Some condition text" → answer'
 *   'Si dice "X" → Y'
 *   '"X" + "Y" → Z'
 *
 * Returns { condition, answer } or null if format not parseable.
 */
function parseExamTip(tip: string): { condition: string; answer: string } | null {
  const arrowIdx = tip.lastIndexOf('→')
  if (arrowIdx === -1) return null
  const condition = tip.slice(0, arrowIdx).trim()
  const answer = tip.slice(arrowIdx + 1).trim()
  if (!condition || !answer) return null
  // Clean up quotes and "Si dice"
  const cleanCondition = condition
    .replace(/^Si dice\s*/i, '')
    .replace(/^"(.*)"$/, '$1')
    .replace(/"/g, '"')
    .trim()
  return { condition: cleanCondition, answer }
}

/** Build a plausible wrong option from a confusedWith concept. */
function distractorFromConcept(c: ConceptDefinition): string {
  // Use the concept's primary service or its name — both are recognisable to
  // exam candidates and will feel like a plausible choice.
  return c.awsServices[0] ?? c.name
}

/** Generic distractor bank for when confusedWith list is short. */
const GENERIC_DISTRACTORS: Record<string, string[]> = {
  storage:   ['Amazon EFS', 'Amazon FSx', 'AWS Storage Gateway', 'S3 Intelligent-Tiering'],
  compute:   ['AWS Fargate', 'Amazon ECS', 'AWS Batch', 'Elastic Beanstalk'],
  database:  ['Amazon Redshift', 'Amazon Neptune', 'Amazon Keyspaces', 'Amazon QLDB'],
  network:   ['AWS Global Accelerator', 'Amazon Route 53', 'AWS PrivateLink', 'AWS WAF'],
  security:  ['Amazon GuardDuty', 'Amazon Inspector', 'AWS Config', 'Amazon Macie'],
  messaging: ['Amazon Kinesis', 'Amazon MQ', 'AWS Step Functions', 'Amazon AppFlow'],
}

function genericDistractors(concept: ConceptDefinition): string[] {
  const name = concept.name.toLowerCase()
  if (/s3|glacier|storage|ebs|efs/.test(name)) return GENERIC_DISTRACTORS.storage!
  if (/ec2|lambda|container|fargate|serverless/.test(name)) return GENERIC_DISTRACTORS.compute!
  if (/rds|aurora|dynamo|cache|database/.test(name)) return GENERIC_DISTRACTORS.database!
  if (/vpc|route|direct|transit|vpn/.test(name)) return GENERIC_DISTRACTORS.network!
  if (/iam|kms|shield|waf|cognito|secret/.test(name)) return GENERIC_DISTRACTORS.security!
  if (/sqs|sns|event|kinesis|mq/.test(name)) return GENERIC_DISTRACTORS.messaging!
  return GENERIC_DISTRACTORS.compute!
}

// ─── Question type generators ────────────────────────────────────────────────

/**
 * TYPE 0 — SCENARIO
 * "A company/architect [condition from examTip]. Which solution is MOST appropriate?"
 */
function generateScenario(
  concept: ConceptDefinition,
  confused: ConceptDefinition[],
  seed: number
): StaticQuestion | null {
  const parseable = concept.examTips
    .map(parseExamTip)
    .filter((p): p is NonNullable<typeof p> => p !== null)

  if (parseable.length === 0) return null

  const tipIdx = seed % parseable.length
  const tip = parseable[tipIdx]!
  const correctService = concept.awsServices[0] ?? concept.name

  // Distractors: services of confusedWith concepts, padded with generic
  const distOptions = [
    ...confused.map(c => c.awsServices[0] ?? c.name),
    ...genericDistractors(concept),
  ].filter(d => d !== correctService)

  const uniqueDist = [...new Set(distOptions)].slice(0, 3)
  while (uniqueDist.length < 3) uniqueDist.push(genericDistractors(concept)[uniqueDist.length] ?? 'Amazon EC2')

  const [options, correctIndex] = placeCorrect(correctService, uniqueDist, seed + 1)

  // Convert condition to a natural question stem
  const condition = tip.condition
    .replace(/^"/, '')
    .replace(/"$/, '')
    .replace(/"/g, '"')
    .toLowerCase()

  const questionText =
    `An AWS Solutions Architect is designing a solution where ${condition} is required. ` +
    `Which service or approach is MOST appropriate?`

  const explanation =
    `${concept.name}: ${tip.condition} → ${tip.answer}. ` +
    `${concept.keyFacts[0] ?? concept.description}`

  return {
    questionText,
    options,
    correctIndex,
    explanation,
    difficulty: concept.difficulty,
    questionType: 'multiple_choice',
    conceptSlug: concept.slug,
    conceptName: concept.name,
    patternTag: 'least-operational-overhead',
  }
}

/**
 * TYPE 1 — TRUE_FACT
 * "Which of the following statements about X is CORRECT?"
 * Correct: one of the concept's keyFacts.
 * Distractors: mixed/wrong statements (properties swapped from confusedWith or inverted facts).
 */
function generateTrueFact(
  concept: ConceptDefinition,
  confused: ConceptDefinition[],
  seed: number
): StaticQuestion | null {
  if (concept.keyFacts.length === 0) return null

  const factIdx = seed % concept.keyFacts.length
  const correctFact = concept.keyFacts[factIdx]!

  // Distractors: keyFacts from confusedWith concepts that are DIFFERENT from this concept
  const confusedFacts = confused.flatMap(c =>
    c.keyFacts.map(f => f)
  ).filter(f => f !== correctFact).slice(0, 3)

  // Pad with inverted/wrong facts if needed
  const falseStatements = buildFalseStatements(concept, confused)
  const distractors = [...new Set([...confusedFacts, ...falseStatements])]
    .filter(d => d !== correctFact)
    .slice(0, 3)

  while (distractors.length < 3) {
    distractors.push(genericDistractors(concept)[distractors.length] ?? 'Uses synchronous replication')
  }

  const [options, correctIndex] = placeCorrect(correctFact, distractors, seed + 2)

  const questionText = `Which of the following statements about ${concept.name} is CORRECT?`
  const explanation =
    `${correctFact}. ${concept.description}. ` +
    (confused[0] ? `Note: do not confuse with ${confused[0].name} — ${confused[0].keyFacts[0] ?? ''}` : '')

  return {
    questionText,
    options,
    correctIndex,
    explanation,
    difficulty: Math.min(1, concept.difficulty + 0.1),
    questionType: 'multiple_choice',
    conceptSlug: concept.slug,
    conceptName: concept.name,
    patternTag: 'highest-availability',
  }
}

/**
 * TYPE 2 — FALSE_FACT
 * "Which of the following is NOT a characteristic of X?"
 * Three correct facts + one incorrect statement (from confusedWith or inverted).
 */
function generateFalseFact(
  concept: ConceptDefinition,
  confused: ConceptDefinition[],
  seed: number
): StaticQuestion | null {
  if (concept.keyFacts.length < 2) return null

  // Pick 3 correct facts as distractors (they're the "correct" options the user should NOT pick)
  const factOffset = seed % concept.keyFacts.length
  const correctFacts = pickN(concept.keyFacts, 3, factOffset)

  // The WRONG option comes from a confusedWith concept's property
  // (something true about another concept but NOT this one)
  const falseStatements = buildFalseStatements(concept, confused)
  if (falseStatements.length === 0) return null

  const incorrectFact = falseStatements[seed % falseStatements.length]!

  // In this type, the INCORRECT statement is the "correct answer" (the one to pick)
  const [options, correctIndex] = placeCorrect(incorrectFact, correctFacts, seed + 3)

  const questionText =
    `Which of the following is NOT a characteristic of ${concept.name}?`
  const explanation =
    `"${incorrectFact}" is INCORRECT for ${concept.name}. ` +
    `The correct characteristics are: ${correctFacts.join('; ')}.`

  return {
    questionText,
    options,
    correctIndex,
    explanation,
    difficulty: Math.min(1, concept.difficulty + 0.15),
    questionType: 'multiple_choice',
    conceptSlug: concept.slug,
    conceptName: concept.name,
    patternTag: 'most-secure',
  }
}

/**
 * TYPE 3 — WHEN_TO_USE
 * "Which of the following scenarios is the BEST use case for X?"
 * Correct: a paraphrased version of one examTip scenario.
 * Distractors: use-case scenarios that are BETTER suited for confusedWith concepts.
 */
function generateWhenToUse(
  concept: ConceptDefinition,
  confused: ConceptDefinition[],
  seed: number
): StaticQuestion | null {
  if (concept.examTips.length === 0) return null

  const tipIdx = seed % concept.examTips.length
  const correctTip = concept.examTips[tipIdx]!
  const parsed = parseExamTip(correctTip)

  const correctOption = parsed
    ? `${parsed.condition.replace(/"/g, '"')}`
    : correctTip

  // Distractors: examTips from confusedWith that describe scenarios for THEM (not this concept)
  const wrongOptions = confused
    .flatMap(c => c.examTips)
    .map(t => {
      const p = parseExamTip(t)
      return p ? p.condition.replace(/"/g, '"') : t
    })
    .filter(t => t !== correctOption)
    .slice(0, 3)

  // Pad with generic non-matching scenarios
  const padScenarios = [
    'batch processing jobs that can tolerate interruptions',
    'storing frequently accessed static assets globally',
    'running containerized microservices with auto-scaling',
    'processing real-time clickstream data at high throughput',
    'maintaining compliance audit logs for 7 years',
  ]

  while (wrongOptions.length < 3) {
    wrongOptions.push(padScenarios[wrongOptions.length % padScenarios.length]!)
  }

  const [options, correctIndex] = placeCorrect(correctOption, wrongOptions.slice(0, 3), seed + 4)

  const questionText =
    `Which of the following use cases is ${concept.name} BEST suited to address?`
  const explanation =
    `${concept.name} is the ideal solution when ${correctOption}. ` +
    `${concept.keyFacts[0] ?? concept.description}`

  return {
    questionText,
    options,
    correctIndex,
    explanation,
    difficulty: concept.difficulty,
    questionType: 'multiple_choice',
    conceptSlug: concept.slug,
    conceptName: concept.name,
    patternTag: 'most-cost-effective',
  }
}

/**
 * TYPE 4 — VS_COMPARISON
 * "What is a KEY DIFFERENCE between X and Y?"
 * Highlights the core distinguishing characteristic.
 */
function generateVsComparison(
  concept: ConceptDefinition,
  confused: ConceptDefinition[],
  seed: number
): StaticQuestion | null {
  if (confused.length === 0) return null

  const confusedIdx = seed % confused.length
  const other = confused[confusedIdx]!

  // Find a keyFact that specifically distinguishes this concept from the other
  // (prefer facts that mention a property the other concept does NOT have)
  const distinguishingFact = concept.keyFacts.find(f => {
    const fl = f.toLowerCase()
    // Look for facts that define the concept's unique property
    return !other.keyFacts.some(of => {
      const ol = of.toLowerCase()
      // Simple heuristic: they share > 60% of the key terms → not distinguishing
      const terms = fl.split(/\W+/).filter(w => w.length > 4)
      const matches = terms.filter(t => ol.includes(t))
      return matches.length / Math.max(terms.length, 1) > 0.6
    })
  }) ?? concept.keyFacts[seed % concept.keyFacts.length]!

  // Build the correct answer: [concept] has [distinguishingFact], while [other] does not
  const correctAnswer =
    `${concept.name} ${getVerbPhrase(distinguishingFact)}, ` +
    `while ${other.name} ${getOppositeVerbPhrase(other, concept)}`

  // Distractors: reversed or wrong comparative statements
  const otherFact = other.keyFacts[seed % other.keyFacts.length] ?? other.description
  const distractors = [
    `${other.name} ${getVerbPhrase(distinguishingFact)}, while ${concept.name} does not support this`,
    `Both ${concept.name} and ${other.name} provide identical functionality for this use case`,
    `${concept.name} ${getVerbPhrase(otherFact)}, which is also true of ${other.name}`,
  ]

  const [options, correctIndex] = placeCorrect(correctAnswer, distractors, seed + 5)

  const questionText =
    `Which statement CORRECTLY describes a key difference between ` +
    `${concept.name} and ${other.name}?`
  const explanation =
    `${distinguishingFact}. ` +
    `${concept.name}: ${concept.description}. ` +
    `${other.name}: ${other.description}`

  return {
    questionText,
    options,
    correctIndex,
    explanation,
    difficulty: Math.min(1, concept.difficulty + 0.1),
    questionType: 'multiple_choice',
    conceptSlug: concept.slug,
    conceptName: concept.name,
    patternTag: 'dr-rpo-rto',
  }
}

// ─── helpers for vs_comparison ───────────────────────────────────────────────

function getVerbPhrase(fact: string): string {
  // Extract the first verb clause from a keyFact
  const lower = fact.toLowerCase()
  if (lower.includes('síncrono') || lower.includes('synchronous')) return 'uses synchronous replication'
  if (lower.includes('asíncrono') || lower.includes('asynchronous')) return 'uses asynchronous replication'
  if (lower.includes('gratuito') || lower.includes('free')) return 'is available at no extra cost'
  if (lower.includes('persistencia') || lower.includes('persistence')) return 'supports data persistence'
  if (lower.includes('multi-az') || lower.includes('alta disponibilidad')) return 'supports Multi-AZ deployment'
  if (lower.includes('cross-region')) return 'supports cross-region replication'
  if (lower.includes('transitivo') || lower.includes('transitive')) return 'supports transitive routing'
  if (lower.includes('read') || lower.includes('lectura')) return 'can serve read traffic'
  if (lower.includes('failover automático') || lower.includes('automatic failover')) return 'provides automatic failover'
  // Default: take the first meaningful clause
  const colon = fact.indexOf(':')
  if (colon > -1) return fact.slice(colon + 1).trim().toLowerCase().slice(0, 60)
  return fact.slice(0, 60).toLowerCase()
}

function getOppositeVerbPhrase(other: ConceptDefinition, concept: ConceptDefinition): string {
  // Return a short phrase that contrasts with the concept's distinguishing property
  const name = concept.name.toLowerCase()
  if (name.includes('multi-az')) return 'does not provide automatic failover by default'
  if (name.includes('read replica')) return 'cannot serve read traffic from the standby'
  if (name.includes('gateway endpoint')) return 'incurs an hourly charge and uses an ENI'
  if (name.includes('vpc peering')) return 'does not support transitive routing'
  if (name.includes('transit gateway')) return 'only supports point-to-point connections'
  // Generic
  return `takes a different approach — see ${other.keyFacts[0] ?? other.description}`
}

// ─── False statement builder ──────────────────────────────────────────────────

/**
 * Build plausible-but-incorrect statements about `concept` by:
 * 1. Taking a keyFact from a confusedWith concept
 * 2. Inverting specific values in the concept's own facts
 */
function buildFalseStatements(
  concept: ConceptDefinition,
  confused: ConceptDefinition[]
): string[] {
  const false_: string[] = []

  // Strategy 1: pick a keyFact from a confused concept that directly contradicts this one
  for (const c of confused) {
    for (const fact of c.keyFacts) {
      // Filter for facts that are truly different (not shared properties)
      if (!concept.keyFacts.some(f => similarity(f, fact) > 0.5)) {
        false_.push(fact)
      }
      if (false_.length >= 4) break
    }
    if (false_.length >= 4) break
  }

  // Strategy 2: invert numeric/boolean properties in the concept's own facts
  for (const fact of concept.keyFacts) {
    const inverted = invertFact(fact)
    if (inverted && inverted !== fact) false_.push(inverted)
    if (false_.length >= 6) break
  }

  return false_
}

/** Rough word-overlap similarity between two strings (0-1). */
function similarity(a: string, b: string): number {
  const aw = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  const bw = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  const inter = [...aw].filter(w => bw.has(w)).length
  const union = new Set([...aw, ...bw]).size
  return union === 0 ? 0 : inter / union
}

/** Invert specific numeric/boolean terms to create a plausible-but-wrong statement. */
function invertFact(fact: string): string | null {
  const replacements: Array<[RegExp, string]> = [
    [/síncrono/gi,   'asíncrono'],
    [/asíncrono/gi,  'síncrono'],
    [/synchronous/gi,  'asynchronous'],
    [/asynchronous/gi, 'synchronous'],
    [/automático/gi, 'manual'],
    [/automatic/gi,  'manual'],
    [/gratuito/gi,   'de pago'],
    [/stateful/gi,   'stateless'],
    [/stateless/gi,  'stateful'],
    [/72%/g, '45%'],
    [/54%/g, '72%'],
    [/90%/g, '50%'],
    [/15 réplicas/g, '5 réplicas'],
    [/5 réplicas/g,  '15 réplicas'],
    [/99\.99%/g, '99.5%'],
    [/99\.9%/g,  '99.99%'],
    [/NO es transitivo/gi, 'es transitivo (permite routing transitivo)'],
    [/NO sirve tráfico de lectura/gi, 'puede servir tráfico de lectura'],
    [/1-2 minutos/g, '5-10 minutos'],
    [/< 1 segundo/g, '10-30 segundos'],
    [/SOLO S3 y DynamoDB/gi, 'compatible con cualquier servicio AWS'],
    [/SOLO UNA AZ/gi, 'puede abarcar múltiples AZs'],
  ]

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(fact)) {
      return fact.replace(pattern, replacement)
    }
  }
  return null
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a static (no-LLM) question for `concept`.
 *
 * `seed` controls which question type and which source facts are used,
 * producing distinct questions on successive calls.
 * Cycles through all 5 types before repeating.
 */
export function generateQuestionStatic(
  concept: ConceptDefinition,
  seed = 0
): StaticQuestion {
  const confused = getConfusedConcepts(concept)

  // Ordered list of generators. Try them in rotation; skip if one returns null
  // (e.g. concept has no examTips → skip SCENARIO).
  const generators = [
    () => generateScenario(concept, confused, seed),
    () => generateTrueFact(concept, confused, seed),
    () => generateWhenToUse(concept, confused, seed),
    () => generateFalseFact(concept, confused, seed),
    () => generateVsComparison(concept, confused, seed),
  ]

  const typeIdx = seed % generators.length

  // Try the seed-selected type first, then fall back in order
  for (let i = 0; i < generators.length; i++) {
    const idx = (typeIdx + i) % generators.length
    const result = generators[idx]!()
    if (result) return result
  }

  // Absolute fallback — should never reach here with well-populated concepts
  return {
    questionText: `Which of the following is CORRECT about ${concept.name}?`,
    options: [
      concept.keyFacts[0] ?? concept.description,
      `${concept.name} does not support high availability`,
      `${concept.name} requires manual configuration for all operations`,
      `${concept.name} is deprecated and replaced by a newer service`,
    ],
    correctIndex: 0,
    explanation: concept.keyFacts[0] ?? concept.description,
    difficulty: concept.difficulty,
    questionType: 'multiple_choice',
    conceptSlug: concept.slug,
    conceptName: concept.name,
  }
}

/**
 * Generate multiple unique questions for a concept.
 * Useful for pre-populating the question pool.
 */
export function generateQuestionsForConcept(
  concept: ConceptDefinition,
  count = 5
): StaticQuestion[] {
  const questions: StaticQuestion[] = []
  const seen = new Set<string>()

  for (let seed = 0; seed < count * 3 && questions.length < count; seed++) {
    const q = generateQuestionStatic(concept, seed)
    // Dedup by question text
    if (!seen.has(q.questionText)) {
      seen.add(q.questionText)
      questions.push(q)
    }
  }

  return questions
}

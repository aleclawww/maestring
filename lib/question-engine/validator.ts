import Anthropic from '@anthropic-ai/sdk'
import type { ConceptDefinition } from '@/lib/knowledge-graph/aws-saa'
import logger from '@/lib/logger'
import { recordLlmUsage } from '@/lib/llm/usage'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const VALIDATOR_MODEL = process.env.ANTHROPIC_MODEL_VALIDATOR ?? 'claude-sonnet-4-6'

export interface CandidateQuestion {
  questionText: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: number
}

export interface ValidationResult {
  valid: boolean
  reasons: string[]
  score: number
}

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text.trim())
  } catch {}
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (block?.[1]) {
    try {
      return JSON.parse(block[1].trim())
    } catch {}
  }
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last !== -1) {
    try {
      return JSON.parse(text.slice(first, last + 1))
    } catch {}
  }
  throw new Error('Could not extract JSON from validator response')
}

function structuralChecks(q: CandidateQuestion): string[] {
  const reasons: string[] = []
  if (!q.questionText || q.questionText.trim().length < 40) reasons.push('stem_too_short')
  if (!Array.isArray(q.options) || q.options.length !== 4) reasons.push('options_not_four')
  if (q.correctIndex < 0 || q.correctIndex > 3) reasons.push('correct_index_out_of_range')
  if (!q.explanation || q.explanation.trim().length < 40) reasons.push('explanation_too_short')
  if (Array.isArray(q.options)) {
    const lens = q.options.map(o => o.length)
    const min = Math.min(...lens)
    const max = Math.max(...lens)
    if (min > 0 && max / min > 2.2) reasons.push('option_length_skew')
    const normalized = q.options.map(o => o.trim().toLowerCase())
    if (new Set(normalized).size !== 4) reasons.push('duplicate_options')
    if (normalized.some(o => o.includes('todas las anteriores') || o.includes('ninguna de las anteriores'))) {
      reasons.push('meta_option_present')
    }
  }
  return reasons
}

export async function validateQuestion(
  concept: ConceptDefinition,
  q: CandidateQuestion
): Promise<ValidationResult> {
  const structural = structuralChecks(q)
  if (structural.length > 0) {
    return { valid: false, reasons: structural, score: 0 }
  }

  const prompt = `Eres un evaluador experto de exámenes de AWS SAA-C03. Tu trabajo es rechazar preguntas defectuosas aplicando criterios pedagógicos estrictos.

CONCEPTO OBJETIVO:
- Nombre: ${concept.name}
- Descripción: ${concept.description}
- Servicios AWS: ${concept.awsServices.join(', ')}
- Se confunde con: ${concept.confusedWith.join(', ')}

PREGUNTA A EVALUAR:
Stem: ${q.questionText}
Opciones:
  0) ${q.options[0]}
  1) ${q.options[1]}
  2) ${q.options[2]}
  3) ${q.options[3]}
Marcada como correcta: índice ${q.correctIndex} — "${q.options[q.correctIndex]}"
Explicación: ${q.explanation}

CRITERIOS (marca cada uno como pass/fail):
1. single_correct — ¿Hay exactamente UNA opción defendible como la mejor? (fail si dos son igual de válidas o ninguna es claramente correcta)
2. correct_is_best — ¿La opción marcada como correcta es realmente la óptima según AWS best practices? (fail si otra opción es mejor)
3. distractors_plausible — ¿Los distractores son errores técnicos plausibles, no absurdos ni irrelevantes?
4. on_topic — ¿La pregunta evalúa directamente el concepto "${concept.name}", no un tema adyacente?
5. no_lexical_cues — ¿La opción correcta NO repite palabras únicas del stem que los distractores no usan?
6. unambiguous — ¿El stem es lo suficientemente específico para tener una única interpretación razonable?
7. factually_correct — ¿Todos los hechos técnicos sobre AWS son correctos en 2026?

Responde SOLO con JSON (sin markdown):
{
  "single_correct": true,
  "correct_is_best": true,
  "distractors_plausible": true,
  "on_topic": true,
  "no_lexical_cues": true,
  "unambiguous": true,
  "factually_correct": true,
  "reasons": ["si algún criterio falla, explica brevemente cuál y por qué"]
}`

  const t0 = Date.now()
  try {
    const response = await anthropic.messages.create({
      model: VALIDATOR_MODEL,
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })
    recordLlmUsage({
      userId: null,
      route: 'question-engine.validate',
      model: VALIDATOR_MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: Date.now() - t0,
      success: true,
      metadata: { concept_slug: concept.slug },
    })
    const content = response.content[0]
    if (!content || content.type !== 'text') {
      return { valid: false, reasons: ['validator_no_response'], score: 0 }
    }
    const raw = extractJSON(content.text) as Record<string, unknown>
    const criteria = [
      'single_correct',
      'correct_is_best',
      'distractors_plausible',
      'on_topic',
      'no_lexical_cues',
      'unambiguous',
      'factually_correct',
    ] as const
    const failed = criteria.filter(k => raw[k] !== true)
    const modelReasons = Array.isArray(raw['reasons']) ? (raw['reasons'] as unknown[]).map(String) : []
    const passCount = criteria.length - failed.length
    return {
      valid: failed.length === 0,
      reasons: failed.length === 0 ? [] : [...failed, ...modelReasons],
      score: passCount / criteria.length,
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Validator call failed')
    return { valid: false, reasons: ['validator_exception'], score: 0 }
  }
}

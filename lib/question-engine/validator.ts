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
    if (normalized.some(o =>
      o.includes('all of the above') ||
      o.includes('none of the above') ||
      o.includes('all the above') ||
      o.includes('none of these')
    )) {
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

  const prompt = `You are an expert AWS SAA-C03 exam question reviewer. Your job is to reject defective questions by applying strict pedagogical criteria.

TARGET CONCEPT:
- Name: ${concept.name}
- Description: ${concept.description}
- AWS Services: ${concept.awsServices.join(', ')}
- Commonly confused with: ${concept.confusedWith.join(', ')}

QUESTION TO EVALUATE:
Stem: ${q.questionText}
Options:
  0) ${q.options[0]}
  1) ${q.options[1]}
  2) ${q.options[2]}
  3) ${q.options[3]}
Marked correct: index ${q.correctIndex} — "${q.options[q.correctIndex]}"
Explanation: ${q.explanation}

CRITERIA (mark each as pass/fail):
1. single_correct — Is there exactly ONE option that can be defended as best? (fail if two are equally valid or none is clearly correct)
2. correct_is_best — Is the marked-correct option truly optimal per AWS best practices? (fail if another option is better)
3. distractors_plausible — Are the distractors plausible technical mistakes, not absurd or irrelevant?
4. on_topic — Does the question directly test the concept "${concept.name}", not an adjacent topic?
5. no_lexical_cues — Does the correct option NOT repeat unique words from the stem that the distractors do not use?
6. unambiguous — Is the stem specific enough to have a single reasonable interpretation?
7. factually_correct — Are all AWS technical facts in the question correct as of 2026?

Respond with JSON ONLY (no markdown):
{
  "single_correct": true,
  "correct_is_best": true,
  "distractors_plausible": true,
  "on_topic": true,
  "no_lexical_cues": true,
  "unambiguous": true,
  "factually_correct": true,
  "reasons": ["if any criterion fails, briefly explain which one and why"]
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

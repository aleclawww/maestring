import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatQuestionPrompt, formatEvaluationPrompt, type CognitiveFingerprint } from './prompts'
import { getConceptBySlug } from '@/lib/knowledge-graph/aws-saa'
import { EvaluationResultSchema } from '@/types/study'
import { sleep } from '@/lib/utils'
import logger from '@/lib/logger'
import { recordLlmUsage } from '@/lib/llm/usage'
import type { GenerateQuestionRequest, EvaluationResult } from '@/types/study'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_RETRIES = 3

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text.trim())
  } catch {}

  // Extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {}
  }

  // Find first { ... } block
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1))
    } catch {}
  }

  throw new Error('Could not extract valid JSON from response')
}

export async function generateQuestion(
  req: GenerateQuestionRequest & {
    conceptId?: string
    fingerprint?: CognitiveFingerprint
    userId?: string
    /**
     * Review gate for the newly-inserted row. Defaults to 'approved' so
     * hot-path user-facing generation stays unchanged. Cron/batch callers
     * pass 'pending' to queue for admin approval.
     */
    reviewStatus?: 'pending' | 'approved'
  }
) {
  const concept = getConceptBySlug(req.conceptSlug)
  if (!concept) throw new Error(`Unknown concept: ${req.conceptSlug}`)

  const supabase = createAdminClient()
  const difficulty = req.difficulty ?? concept.difficulty
  const mode = req.mode ?? 'review'
  const conceptId = req.conceptId ?? null

  // Check cache for existing questions to avoid duplicates. Silent failure
  // here fell back to `existingQuestions = undefined`, the similarity check at
  // L127 short-circuits (`if (existingQuestions)`) and we generate without
  // dedup. Every cron run of refill-pool with a broken read goes straight to
  // Haiku — a measurable LLM cost blind spot. Log warn so cost spikes get
  // tied to DB/RLS incidents rather than blamed on the model.
  const { data: existingQuestions, error: cacheErr } = await supabase
    .from('questions')
    .select('id, question_text, options, correct_index, explanation, difficulty, question_type')
    .eq('is_active', true)
    .contains('question_text', [concept.name])
    .limit(5)
  if (cacheErr) {
    logger.warn(
      { err: cacheErr, conceptSlug: req.conceptSlug, conceptId },
      'generateQuestion: dedup cache read failed — generating without dedup (expect LLM cost spike)'
    )
  }

  const prompt = formatQuestionPrompt(
    concept,
    req.recentMistakes ?? [],
    difficulty,
    mode,
    req.fingerprint
  )

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(Math.pow(2, attempt) * 1000)
    }

    const t0 = Date.now()
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      })

      recordLlmUsage({
        userId: req.userId ?? null,
        route: 'question-engine.generate',
        model: MODEL,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: Date.now() - t0,
        success: true,
        metadata: { concept_slug: req.conceptSlug, attempt },
      })

      const content = response.content[0]
      if (!content || content.type !== 'text') throw new Error('No text content in response')

      const raw = extractJSON(content.text) as Record<string, unknown>

      // Validate structure
      if (
        typeof raw['questionText'] !== 'string' ||
        !Array.isArray(raw['options']) ||
        (raw['options'] as unknown[]).length !== 4 ||
        typeof raw['correctIndex'] !== 'number' ||
        typeof raw['explanation'] !== 'string'
      ) {
        throw new Error('Invalid question structure from AI')
      }

      // Check for duplicate (simple text similarity)
      const questionText = raw['questionText'] as string
      if (existingQuestions) {
        const isDuplicate = existingQuestions.some(q => {
          const similarity = calculateSimpleSimilarity(q.question_text, questionText)
          return similarity > 0.8
        })
        if (isDuplicate) {
          logger.debug({ conceptSlug: req.conceptSlug }, 'Generated duplicate, retrying')
          continue
        }
      }

      // Save to database
      const insertPayload: Record<string, unknown> = {
        question_text: questionText,
        options: raw['options'] as string[],
        correct_index: raw['correctIndex'] as number,
        explanation: raw['explanation'] as string,
        difficulty: (raw['difficulty'] as number) ?? difficulty,
        question_type: 'multiple_choice',
        source: 'ai-generated',
        review_status: req.reviewStatus ?? 'approved',
      }
      if (conceptId) insertPayload['concept_id'] = conceptId

      const { data: savedQuestion, error: saveError } = await supabase
        .from('questions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertPayload as any)
        .select()
        .single()

      if (saveError) {
        logger.warn({ error: saveError }, 'Could not save generated question')
      }

      return {
        id: savedQuestion?.id ?? crypto.randomUUID(),
        conceptId: conceptId ?? '',
        conceptName: concept.name,
        conceptSlug: concept.slug,
        domainId: '',
        questionText,
        options: raw['options'] as string[],
        correctIndex: raw['correctIndex'] as number,
        explanation: raw['explanation'] as string,
        difficulty: (raw['difficulty'] as number) ?? difficulty,
        questionType: 'multiple_choice' as const,
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      logger.warn({ attempt, error: lastError.message }, 'Question generation attempt failed')
    }
  }

  throw lastError ?? new Error('Failed to generate question after retries')
}

// Deterministic, zero-LLM evaluation. The question already carries the correct
// index and a baseline explanation, so for MCQ the evaluation is a comparison
// + copy assembly. Use `elaborateAnswer` for an optional on-demand richer
// explanation (separate quota bucket).
export function evaluateAnswerLocal(
  options: string[],
  correctIndex: number,
  selectedIndex: number,
  explanation: string
): EvaluationResult {
  const isCorrect = selectedIndex === correctIndex
  return {
    isCorrect,
    score: isCorrect ? 1.0 : 0.0,
    explanation: isCorrect
      ? `Correcto. ${explanation}`
      : `La opción óptima en este escenario es: "${options[correctIndex] ?? ''}". ${explanation}`,
    keyInsight: explanation.split('.')[0] ?? explanation,
    relatedConcepts: [],
    ...(isCorrect
      ? {}
      : {
          elaboration: {
            prompt: '¿En qué escenario sería tu elección la correcta?',
            validReasoningHint: 'Tu razonamiento puede ser válido en otro contexto — pensar por qué te ayuda a discriminar la siguiente vez.',
          },
        }),
  }
}

// Optional richer explanation — only invoked when the user explicitly clicks
// "explain more". Uses a separate quota bucket so the hot path stays free.
export async function elaborateAnswer(
  questionText: string,
  options: string[],
  correctIndex: number,
  selectedIndex: number,
  explanation: string,
  userId?: string
): Promise<EvaluationResult> {
  const local = evaluateAnswerLocal(options, correctIndex, selectedIndex, explanation)
  const t0 = Date.now()
  try {
    const prompt = formatEvaluationPrompt(
      questionText,
      options,
      correctIndex,
      selectedIndex,
      explanation
    )

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })

    recordLlmUsage({
      userId: userId ?? null,
      route: 'question-engine.elaborate',
      model: MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs: Date.now() - t0,
      success: true,
    })

    const content = response.content[0]
    if (!content || content.type !== 'text') return local

    const raw = extractJSON(content.text) as Record<string, unknown>
    const parsed = EvaluationResultSchema.safeParse(raw)
    if (parsed.success) return parsed.data
    return local
  } catch (err) {
    // Graceful degrade to the local (deterministic) evaluation is intentional —
    // the user already has a valid answer from evaluateAnswerLocal and the
    // LLM elaboration is optional. But silent fall-through hides Anthropic
    // outages, rate-limit exhaustion, and JSON schema drift from operators,
    // so we log and record the failed usage row for dashboards/alerts.
    const error = err instanceof Error ? err : new Error(String(err))
    logger.warn(
      { userId: userId ?? null, error: error.message, errorName: error.name },
      'elaborateAnswer failed — falling back to local evaluation',
    )
    recordLlmUsage({
      userId: userId ?? null,
      route: 'question-engine.elaborate',
      model: MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - t0,
      success: false,
      errorCode: error.name || 'unknown_error',
    })
    return local
  }
}

function calculateSimpleSimilarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  const bWords = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  const intersection = new Set([...aWords].filter(w => bWords.has(w)))
  const union = new Set([...aWords, ...bWords])
  return union.size === 0 ? 0 : intersection.size / union.size
}

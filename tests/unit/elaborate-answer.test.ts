import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoisted so vi.mock factories can reference it. All three test cases share
// the same stubbed Anthropic.messages.create() — we reconfigure it per test.
const createMock = vi.hoisted(() => vi.fn())

vi.mock('@anthropic-ai/sdk', () => {
  class AnthropicStub {
    messages = { create: createMock }
  }
  return { default: AnthropicStub }
})

vi.mock('@/lib/llm/usage', () => ({
  recordLlmUsage: vi.fn(),
  estimateCostUsd: vi.fn().mockReturnValue(0),
}))

vi.mock('@/lib/logger', () => {
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
  return { default: logger, logger }
})

// createAdminClient / knowledge-graph are imported at module level by
// generator.ts but elaborateAnswer never calls them — no mock needed.

beforeEach(() => {
  vi.clearAllMocks()
  process.env['ANTHROPIC_API_KEY'] = 'test-key'
})

describe('lib/question-engine/generator — elaborateAnswer', () => {
  it('returns the LLM-parsed elaboration on happy path and records success', async () => {
    createMock.mockResolvedValue({
      usage: { input_tokens: 10, output_tokens: 20 },
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isCorrect: true,
            score: 1,
            explanation: 'richer LLM explanation',
            keyInsight: 'key',
            relatedConcepts: [],
          }),
        },
      ],
    })

    const { elaborateAnswer } = await import('@/lib/question-engine/generator')
    const { recordLlmUsage } = await import('@/lib/llm/usage')

    const result = await elaborateAnswer(
      'What is the best storage class for infrequent access?',
      ['S3 Standard', 'S3 IA', 'S3 Glacier', 'EBS'],
      1,
      1,
      'base explanation',
      'user-1',
    )

    expect(result.explanation).toBe('richer LLM explanation')
    const rec = recordLlmUsage as unknown as { mock: { calls: unknown[][] } }
    const [[payload]] = rec.mock.calls as [[Record<string, unknown>]]
    expect(payload['success']).toBe(true)
    expect(payload['route']).toBe('question-engine.elaborate')
    expect(payload['userId']).toBe('user-1')
  })

  it('falls back to local evaluation, logs, and records success:false on Anthropic API error', async () => {
    const apiErr = Object.assign(new Error('anthropic is overloaded'), { name: 'APIError' })
    createMock.mockRejectedValue(apiErr)

    const { elaborateAnswer } = await import('@/lib/question-engine/generator')
    const { recordLlmUsage } = await import('@/lib/llm/usage')
    const loggerMod = await import('@/lib/logger')
    const logger = loggerMod.default

    const result = await elaborateAnswer(
      'What is the best storage class?',
      ['A', 'B', 'C', 'D'],
      0,
      0,
      'base explanation',
      'user-2',
    )

    // Correct answer → deterministic local path prefixes with "Correct."
    expect(result.isCorrect).toBe(true)
    expect(result.explanation).toContain('Correct')

    const warnMock = logger.warn as unknown as { mock: { calls: unknown[][] } }
    expect(warnMock.mock.calls.length).toBeGreaterThanOrEqual(1)

    const rec = recordLlmUsage as unknown as { mock: { calls: unknown[][] } }
    const [[payload]] = rec.mock.calls as [[Record<string, unknown>]]
    expect(payload['success']).toBe(false)
    expect(payload['errorCode']).toBe('APIError')
    expect(payload['route']).toBe('question-engine.elaborate')
    expect(payload['userId']).toBe('user-2')
    expect(payload['inputTokens']).toBe(0)
    expect(payload['outputTokens']).toBe(0)
  })

  it('falls back to local evaluation when the LLM returns non-JSON content', async () => {
    createMock.mockResolvedValue({
      usage: { input_tokens: 5, output_tokens: 5 },
      content: [{ type: 'text', text: 'definitely not valid json at all' }],
    })

    const { elaborateAnswer } = await import('@/lib/question-engine/generator')
    const { recordLlmUsage } = await import('@/lib/llm/usage')

    const result = await elaborateAnswer(
      'Q?',
      ['A', 'B', 'C', 'D'],
      0,
      1,
      'base',
      'user-3',
    )

    // Wrong answer branch → local result includes the correct option text.
    expect(result.isCorrect).toBe(false)
    expect(result.explanation).toContain('"A"')

    // extractJSON throws inside the try block → caught → success:false recorded.
    const rec = recordLlmUsage as unknown as { mock: { calls: unknown[][] } }
    const calls = rec.mock.calls as Array<[Record<string, unknown>]>
    // Two calls: (1) the success=true from before the parse, then (2) the
    // catch-branch failure record. OR one call depending on ordering — the
    // current implementation records success BEFORE parsing, so here we'll
    // see success=true first, then the catch recordLlmUsage with success=false.
    const failureCall = calls.find(([p]) => p['success'] === false)
    expect(failureCall).toBeDefined()
    expect((failureCall![0] as Record<string, unknown>)['errorCode']).toBeTypeOf('string')
  })
})

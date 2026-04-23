import { z } from 'zod'

// Shape of a question authored as JSON in content/seed-questions/<concept>.json.
// All fields after `explanation` are optional but strongly recommended — they
// power the progressive-explanation UX and make questions feel premium.

export const SeedQuestionSchema = z.object({
  questionText: z.string().min(40, 'stem must be specific (≥40 chars)'),
  options: z.array(z.string().min(3)).length(4, 'must have exactly 4 options'),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(40),
  difficulty: z.number().min(0).max(1),

  hint: z.string().min(10).optional(),
  explanationDeep: z.string().min(80).optional(),
  keyInsight: z.string().min(10).max(200).optional(),
  scenarioContext: z
    .object({
      numbers: z.record(z.union([z.number(), z.string()])).optional(),
      architecture: z.string().optional(),
      costTable: z.array(z.record(z.union([z.number(), z.string()]))).optional(),
      constraints: z.array(z.string()).optional(),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
})

export const SeedFileSchema = z.object({
  conceptSlug: z.string().min(1),
  certificationId: z.string().default('aws-saa-c03'),
  questions: z.array(SeedQuestionSchema).min(1),
})

export type SeedQuestion = z.infer<typeof SeedQuestionSchema>
export type SeedFile = z.infer<typeof SeedFileSchema>

function optionLengthSkew(opts: string[]): number {
  const lens = opts.map(o => o.length)
  const min = Math.min(...lens)
  const max = Math.max(...lens)
  return min === 0 ? Infinity : max / min
}

function hasMetaOption(opts: string[]): boolean {
  return opts.some(o => {
    const l = o.toLowerCase()
    return l.includes('todas las anteriores') || l.includes('ninguna de las anteriores') || l.includes('all of the above')
  })
}

export interface QualityIssue {
  code: string
  message: string
}

// Cheap structural quality checks — run on every question before insert.
// Does NOT call the LLM validator; that's opt-in for a stricter pass.
export function structuralQuality(q: SeedQuestion): QualityIssue[] {
  const issues: QualityIssue[] = []
  const skew = optionLengthSkew(q.options)
  if (skew > 2.2) {
    issues.push({ code: 'option_length_skew', message: `option length ratio ${skew.toFixed(2)} > 2.2` })
  }
  const normalized = q.options.map(o => o.trim().toLowerCase())
  if (new Set(normalized).size !== 4) {
    issues.push({ code: 'duplicate_options', message: 'options are not unique' })
  }
  if (hasMetaOption(q.options)) {
    issues.push({ code: 'meta_option_present', message: 'avoid "all/none of the above"' })
  }
  return issues
}

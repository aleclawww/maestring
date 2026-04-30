import type { ConceptDefinition } from '@/lib/knowledge-graph/aws-saa'

export const FEW_SHOT_EXAMPLES = `
EXAMPLE 1 — S3 Cross-Region Replication scenario:
{
  "questionText": "A company stores compliance files in S3 us-east-1. Regulations require that data be available in us-west-2 with a guaranteed maximum lag of 15 minutes. What is the optimal configuration?",
  "options": [
    "S3 CRR with Replication Time Control (RTC) enabled",
    "S3 SRR with versioning enabled on both buckets",
    "S3 CRR without RTC and SNS notifications for monitoring",
    "A Lambda function that copies objects every 10 minutes via S3 Event Notifications"
  ],
  "correctIndex": 0,
  "explanation": "CRR with RTC guarantees that 99.99% of objects are replicated within 15 minutes under a formal SLA. SRR is Same-Region (not applicable for cross-region). Without RTC there is no time guarantee. Lambda is a manual workaround when CRR+RTC is the purpose-built AWS feature for this case.",
  "difficulty": 0.7
}

EXAMPLE 2 — VPC Endpoint types:
{
  "questionText": "A company has EC2 instances in private subnets that frequently access S3 and KMS. The team wants to eliminate the NAT Gateway dependency to reduce costs and improve security. Which endpoint type should be used for each service?",
  "options": [
    "Gateway Endpoint for S3, Interface Endpoint for KMS",
    "Interface Endpoint for S3, Gateway Endpoint for KMS",
    "Gateway Endpoint for both S3 and KMS",
    "Interface Endpoint for both S3 and KMS"
  ],
  "correctIndex": 0,
  "explanation": "Gateway Endpoints exist only for S3 and DynamoDB (free, modify the route table). KMS uses an Interface Endpoint (PrivateLink) that creates a private ENI in the subnet. Interface Endpoints incur per-hour and per-GB charges; Gateway Endpoints are free.",
  "difficulty": 0.6
}

EXAMPLE 3 — SQS vs SNS decision:
{
  "questionText": "An e-commerce system must process orders guaranteeing each order is processed exactly once, in FIFO order. At the same time, multiple microservices (inventory, billing, shipping) must each receive a copy of every order. What is the correct architecture?",
  "options": [
    "SNS topic → multiple subscribed SQS FIFO queues, one consumer per queue",
    "SQS Standard queue with multiple consumers in parallel",
    "SNS topic → multiple subscribed SQS Standard queues",
    "Single SQS FIFO queue with multiple polling consumers"
  ],
  "correctIndex": 0,
  "explanation": "The fan-out pattern (SNS→SQS) is correct for distributing to multiple services. SQS FIFO is required to guarantee ordering and exactly-once delivery per service. SQS Standard does not guarantee ordering. A single FIFO queue with multiple consumers does not deliver independently to each downstream service.",
  "difficulty": 0.75
}
`

export interface CognitiveFingerprint {
  background?: 'developer' | 'sysadmin' | 'business' | 'student' | 'other'
  explanation_depth?: 'deep' | 'concise'
  weakness_pattern?: string
}

export function formatQuestionPrompt(
  concept: ConceptDefinition,
  recentMistakes: string[],
  difficulty: number,
  mode: 'discovery' | 'review' | 'intensive' | 'maintenance',
  fingerprint?: CognitiveFingerprint
): string {
  const difficultyLabel =
    difficulty < 0.3 ? 'basic' : difficulty < 0.6 ? 'intermediate' : difficulty < 0.8 ? 'advanced' : 'expert'

  const modeInstructions = {
    discovery: 'Generate an introductory question covering the core concept. Options should be clearly distinct.',
    review: 'Generate a review question that reinforces knowledge. Practical scenarios are encouraged.',
    intensive: 'Generate a challenging question with a complex scenario. Include convincing distractors.',
    maintenance: 'Generate a maintenance question to retain knowledge. Balance familiarity with variation.',
  }[mode]

  // Quote each concept name to prevent DB-stored strings from injecting
  // additional instructions into the prompt (defense against prompt injection
  // if concept names ever contain special characters or instruction-like text).
  const safeMistakes = recentMistakes.map(
    m => `"${m.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  )
  const mistakesContext =
    safeMistakes.length > 0
      ? `\n\nConcepts the user frequently misses: ${safeMistakes.join(', ')}. Consider building distractors around these concepts.`
      : ''

  // Hyperpersonalisation: adapt tone and explanation depth based on the user's
  // background and observed weakness pattern.
  const userContext = (() => {
    if (!fingerprint) return ''
    const parts: string[] = []
    if (fingerprint.background === 'developer' || fingerprint.background === 'sysadmin') {
      parts.push('USER PROFILE: technical (developer/sysadmin) — use precise terminology, API/SDK/CLI references; skip basic definitions.')
    } else if (fingerprint.background === 'business') {
      parts.push('USER PROFILE: business background — include cost/SLA/risk analogies in the explanation; avoid low-level jargon.')
    } else if (fingerprint.background === 'student') {
      parts.push('USER PROFILE: student with no professional experience — explain the "why" before the "how"; normalise the difficulty of the concept.')
    }
    if (fingerprint.explanation_depth === 'concise') {
      parts.push('Explanation style: concise, 3 sentences maximum, focus on the nuance that separates similar options.')
    } else if (fingerprint.explanation_depth === 'deep') {
      parts.push('Explanation style: include conceptual context and connect to architectural principles.')
    }
    if (fingerprint.weakness_pattern) {
      parts.push(`Observed weakness pattern: ${fingerprint.weakness_pattern}.`)
    }
    return parts.length ? `\n\n${parts.join(' ')}` : ''
  })()

  return `You are an AWS Solutions Architect Associate (SAA-C03) expert who creates high-quality exam questions.

${FEW_SHOT_EXAMPLES}

CONCEPT TO COVER:
- Name: ${concept.name}
- Description: ${concept.description}
- Key Facts: ${concept.keyFacts.join('; ')}
- Exam Tips: ${concept.examTips.join('; ')}
- AWS Services involved: ${concept.awsServices.join(', ')}
- Commonly confused with: ${concept.confusedWith.join(', ')}

INSTRUCTIONS:
1. Target difficulty: ${difficultyLabel} (${difficulty.toFixed(1)}/1.0)
2. Mode: ${mode} — ${modeInstructions}
3. The question MUST be practical/scenario-based (not purely theoretical)
4. Exactly 4 options, only ONE correct
5. Incorrect options must be plausible, grounded in common misconceptions
6. Clearly explain WHY each option is correct or incorrect
7. Explanation length: 3–5 concise sentences${mistakesContext}${userContext}

STYLE GUIDE (Cognitive Load Optimisation — non-negotiable):
- ONE central idea per question. Never mix "which service AND how would you configure it?"
- The scenario stem must be SPECIFIC with numbers where applicable
  ("workload of 10,000 req/s peak, P99 < 100ms" is better than "high traffic").
- All 4 options MUST be parallel in structure: similar length (±30% in characters
  between shortest and longest), same level of detail.
  Length contrast is a false answer cue — eliminate it.
- Plausible distractors that are clearly wrong for a SPECIFIC TECHNICAL reason
  (not because they are absurd or mention irrelevant services).
- No lexical cues: the correct option must not reuse words from the stem that the
  incorrect options do not.
- No "all of the above" or "none of the above".

RESPOND WITH VALID JSON ONLY, no markdown, no extra text:
{
  "questionText": "...",
  "options": ["option A", "option B", "option C", "option D"],
  "correctIndex": 0,
  "explanation": "...",
  "difficulty": ${difficulty.toFixed(2)}
}`
}

export function formatEvaluationPrompt(
  questionText: string,
  options: string[],
  correctIndex: number,
  selectedIndex: number,
  explanation: string
): string {
  const isCorrect = selectedIndex === correctIndex
  const selectedOption = options[selectedIndex] ?? 'Unknown'
  const correctOption = options[correctIndex] ?? 'Unknown'

  // Safe learning environment: non-punitive language. NEVER use
  // "wrong/incorrect/failed/bad" for errors. Validate the internal logic of
  // the user's reasoning BEFORE explaining why the optimal option is better.
  // On incorrect answers, generate an elaboration micro-prompt that activates
  // the generation effect (Bjork) — don't just hand over the answer.
  const elaborationBlock = isCorrect
    ? ''
    : `,
  "elaboration": {
    "prompt": "a one-line micro-question inviting the user to elaborate (e.g. 'In what scenario would your choice actually be correct?')",
    "validReasoningHint": "a phrase acknowledging the internal logic of the chosen option (e.g. 'Your choice prioritises X, which is valid when Y')"
  }`

  return `You are an AWS SAA-C03 tutor who evaluates answers using productive learning principles.

QUESTION: ${questionText}

SELECTED OPTION: "${selectedOption}" (index ${selectedIndex})
OPTIMAL OPTION: "${correctOption}" (index ${correctIndex})
RESULT: ${isCorrect ? 'CORRECT' : 'NOT_OPTIMAL'}
BASE CONTEXT: ${explanation}

TONE RULES:
- Never use "wrong", "incorrect", "failed", "mistake", "bad". Use phrases like "not the optimal option", "the scenario calls for a different architecture", "that choice fits a different context".
- If NOT_OPTIMAL, first validate the internal logic of the reasoning, then explain why the other option is preferable here.
- Direct and technical tone — no hollow motivational filler.

Respond with valid JSON (no markdown):
{
  "isCorrect": ${isCorrect},
  "score": ${isCorrect ? 1.0 : 0.0},
  "explanation": "${isCorrect ? 'reinforce why the option is optimal in 2-3 concrete sentences' : 'validate the logic of the user reasoning, then explain why the optimal option is preferable in this specific scenario (3-4 sentences)'}",
  "keyInsight": "the most important insight to remember (1 memorable sentence)",
  "relatedConcepts": ["concept1", "concept2"],
  "studyTip": "a specific tip for retaining this knowledge"${elaborationBlock}
}`
}

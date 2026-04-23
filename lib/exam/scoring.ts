export const EXAM_PASSING_SCORE = 720
export const EXAM_MAX_SCORE = 1000
export const EXAM_MIN_SCORE = 100

/**
 * AWS SAA-C03 scaled score mapping — mirror of submit_exam_session() in
 * migration 024. Keep the formula in sync with the SQL side.
 */
export function scaledScore(correct: number, total: number): number {
  if (total <= 0) return EXAM_MIN_SCORE
  const raw = Math.max(0, Math.min(1, correct / total))
  return Math.round(EXAM_MIN_SCORE + raw * (EXAM_MAX_SCORE - EXAM_MIN_SCORE))
}

export function didPass(scaled: number): boolean {
  return scaled >= EXAM_PASSING_SCORE
}

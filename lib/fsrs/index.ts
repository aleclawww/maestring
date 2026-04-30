import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs'
import type { Tables } from '@/types/database'

type UserConceptState = Tables<'user_concept_states'>

const f = fsrs(generatorParameters({ enable_fuzz: true, maximum_interval: 365 }))

function stateToCard(state: UserConceptState) {
  return {
    due: state.next_review_date ? new Date(state.next_review_date) : new Date(),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    // ts-fsrs expects undefined only for brand-new cards (State.New = 0).
    // A null last_review on a card with reps > 0 means a data integrity gap —
    // default to now() so the scheduler doesn't treat a re-learner as new.
    last_review: state.last_review
      ? new Date(state.last_review)
      : state.state > 0
        ? new Date()
        : undefined,
  }
}

function cardToState(card: Card): Partial<UserConceptState> {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as 0 | 1 | 2 | 3,
    last_review: card.last_review?.toISOString() ?? null,
    next_review_date: card.due?.toISOString() ?? null,
  }
}

export function initConceptState(): Partial<UserConceptState> {
  const card = createEmptyCard()
  return cardToState(card)
}

export function scheduleReview(state: UserConceptState, rating: Rating) {
  const card = stateToCard(state)
  const now = new Date()
  const result = f.next(card, now, rating as Grade)
  return {
    nextState: cardToState(result.card),
    nextReviewDate: result.card.due,
    scheduledDays: result.card.scheduled_days,
    rating,
  }
}

export function answerToRating(
  isCorrect: boolean,
  timeTakenMs: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _difficulty: number
): Rating {
  // Any wrong answer → Again (1). FSRS resets the interval regardless of how
  // "easy" the concept is supposed to be. The previous logic returned Hard for
  // low-difficulty wrong answers — that tells FSRS the card is nearly known and
  // *extends* the next review interval, which is exactly backwards.
  if (!isCorrect) return Rating.Again

  // Correct answer: rate by response speed only.
  if (timeTakenMs < 15_000) return Rating.Easy
  if (timeTakenMs < 45_000) return Rating.Good
  return Rating.Hard
}

export function getRetentionEstimate(state: UserConceptState): number {
  if (state.reps === 0) return 0
  const lastReview = state.last_review ? new Date(state.last_review).getTime() : Date.now()
  const elapsed = (Date.now() - lastReview) / 86_400_000
  const stability = Math.max(state.stability, 0.1)
  return Math.pow(0.9, elapsed / stability)
}

export function getDomainScore(states: UserConceptState[]): number {
  if (states.length === 0) return 0
  const avgRetention =
    states.reduce((sum, s) => sum + getRetentionEstimate(s), 0) / states.length
  const avgReps = Math.min(
    states.reduce((sum, s) => sum + s.reps, 0) / states.length / 5,
    1
  )
  const lapsesPenalty =
    (states.reduce((sum, s) => sum + s.lapses, 0) / states.length) * 0.05
  return Math.max(0, Math.min(100, (avgRetention * 60 + avgReps * 30 - lapsesPenalty) * 100))
}

export function getDueConcepts(
  states: Array<UserConceptState & { concept_id: string }>
) {
  const now = new Date()
  return states
    .filter(
      s =>
        s.reps === 0 ||
        !s.next_review_date ||
        new Date(s.next_review_date) <= now
    )
    .sort((a, b) => getRetentionEstimate(a) - getRetentionEstimate(b))
}

export function getStudyPriority(state: UserConceptState): number {
  if (state.reps === 0) return 100 // New concepts always high priority
  const retention = getRetentionEstimate(state)
  const overdueBonus =
    state.next_review_date && new Date(state.next_review_date) < new Date()
      ? 20
      : 0
  const lapsesPenalty = state.lapses * 5
  return Math.max(0, (1 - retention) * 80 + overdueBonus + lapsesPenalty)
}

export function calculateXpForAnswer(
  isCorrect: boolean,
  timeTakenMs: number,
  difficulty: number,
  streak: number
): number {
  if (!isCorrect) return 0
  const base = 10
  const difficultyBonus = Math.round(difficulty * 10)
  const speedBonus = timeTakenMs < 15_000 ? 5 : timeTakenMs < 30_000 ? 2 : 0
  const streakMultiplier = Math.min(1 + streak * 0.1, 2.0)
  return Math.round((base + difficultyBonus + speedBonus) * streakMultiplier)
}

export { Rating, State }

// ─── Tipos FSRS (Free Spaced Repetition Scheduler) ───────────────────────────
// Compatible con ts-fsrs v4.x

export type FSRSState = 0 | 1 | 2 | 3;
// 0 = New, 1 = Learning, 2 = Review, 3 = Relearning

export type FSRSRating = 1 | 2 | 3 | 4;
// 1 = Again, 2 = Hard, 3 = Good, 4 = Easy

export interface FSRSCard {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FSRSState;
  last_review?: Date;
}

export interface FSRSReviewLog {
  rating: FSRSRating;
  state: FSRSState;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  review: Date;
}

export interface FSRSScheduledCard {
  card: FSRSCard;
  log: FSRSReviewLog;
}

// ─── Parámetros del algoritmo FSRS ──────────────────────────────────────────

export interface FSRSParameters {
  request_retention: number;   // Retención objetivo (0.9 = 90%)
  maximum_interval: number;    // Intervalo máximo en días
  w: number[];                 // Pesos del modelo FSRS-4.5
  enable_fuzzing: boolean;     // Añadir variación al intervalo
}

export const DEFAULT_FSRS_PARAMS: FSRSParameters = {
  request_retention: 0.9,
  maximum_interval: 36500,
  w: [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589, 1.5330,
    0.1544, 1.0070, 1.9395, 0.1100, 0.2900, 2.2700, 0.2700, 2.9898, 0.5100,
    0.3400,
  ],
  enable_fuzzing: false,
};

// ─── Estado de carta de pregunta en FSRS ────────────────────────────────────

export interface QuestionFSRSState {
  questionId: string;
  userId: string;
  card: FSRSCard;
  reviewHistory: FSRSReviewLog[];
  lastUpdated: string;
}

// ─── Respuesta de rating del usuario ─────────────────────────────────────────

export const FSRS_RATING_LABELS: Record<FSRSRating, string> = {
  1: "De nuevo",   // No lo recordé
  2: "Difícil",    // Lo recordé con esfuerzo
  3: "Bien",       // Lo recordé
  4: "Fácil",      // Muy fácil
};

export const FSRS_RATING_COLORS: Record<FSRSRating, string> = {
  1: "#ef4444",    // Rojo
  2: "#f59e0b",    // Ámbar
  3: "#10b981",    // Verde
  4: "#6366f1",    // Indigo
};

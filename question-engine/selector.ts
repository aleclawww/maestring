// ─── Motor de Selección de Preguntas ─────────────────────────────────────────
// Sesión: local_041c153b
// Selección adaptativa basada en performance del usuario y estado FSRS

import type { Question, QuestionFilters, Domain, Difficulty } from "@/types/question";
import type { FSRSCard } from "@/types/fsrs";
import { shuffle, pickRandom } from "@/lib/utils";

export interface QuestionWithFSRS extends Question {
  fsrsCard: FSRSCard | null;
  correctRate: number;    // 0-1, tasa de acierto histórica del usuario
  timesAnswered: number;
}

// ─── Selección por modo de estudio ───────────────────────────────────────────

/**
 * Seleccionar preguntas para modo Spaced Repetition (FSRS).
 * Prioriza preguntas cuyo due date ya pasó.
 */
export function selectForSpacedRepetition(
  questions: QuestionWithFSRS[],
  count: number
): QuestionWithFSRS[] {
  const now = new Date();

  // Separar: vencidas (due <= now) vs nuevas (state = 'New')
  const due = questions.filter(
    (q) => q.fsrsCard && new Date(q.fsrsCard.due) <= now
  );
  const newCards = questions.filter(
    (q) => !q.fsrsCard || q.fsrsCard.state === "New"
  );

  // Ordenar vencidas por urgencia (más atrasadas primero)
  const sortedDue = due.sort((a, b) => {
    const aDate = a.fsrsCard ? new Date(a.fsrsCard.due).getTime() : 0;
    const bDate = b.fsrsCard ? new Date(b.fsrsCard.due).getTime() : 0;
    return aDate - bDate;
  });

  // Combinar: primero las vencidas, luego nuevas
  const combined = [...sortedDue, ...shuffle(newCards)];
  return combined.slice(0, count);
}

/**
 * Seleccionar preguntas para modo Puntos Débiles.
 * Prioriza donde el usuario tiene peor tasa de acierto.
 */
export function selectWeakPoints(
  questions: QuestionWithFSRS[],
  count: number,
  minAnswered = 3
): QuestionWithFSRS[] {
  // Solo considerar preguntas con suficiente historial
  const withHistory = questions.filter((q) => q.timesAnswered >= minAnswered);

  // Ordenar por tasa de acierto (peor primero)
  const sorted = withHistory.sort((a, b) => a.correctRate - b.correctRate);

  // Tomar los peores y mezclarlos ligeramente para variedad
  const worst = sorted.slice(0, count * 2);
  return pickRandom(worst, Math.min(count, worst.length));
}

/**
 * Seleccionar preguntas para modo Práctica libre.
 * Aplica filtros opcionales de dominio, dificultad, etc.
 */
export function selectForPractice(
  questions: QuestionWithFSRS[],
  filters: QuestionFilters
): QuestionWithFSRS[] {
  let filtered = [...questions];

  if (filters.domain?.length) {
    filtered = filtered.filter((q) => filters.domain!.includes(q.domain));
  }

  if (filters.difficulty?.length) {
    filtered = filtered.filter((q) =>
      filters.difficulty!.includes(q.difficulty)
    );
  }

  if (filters.services?.length) {
    filtered = filtered.filter((q) =>
      filters.services!.some((s) => q.services.includes(s))
    );
  }

  if (filters.excludeIds?.length) {
    filtered = filtered.filter((q) => !filters.excludeIds!.includes(q.id));
  }

  // Mezclar para variedad
  const shuffled = shuffle(filtered);

  const limit = filters.limit ?? 20;
  return shuffled.slice(0, limit);
}

/**
 * Seleccionar preguntas para Simulacro de Examen (65 preguntas, distribución real).
 * Distribución AWS SAA-C03 oficial:
 * - Diseño de arquitecturas resilientes: 26%
 * - Alta disponibilidad: 23%
 * - Rendimiento: 21%
 * - Seguridad: 18%
 * - Optimización de costos: 12%
 */
export function selectForExamSimulation(
  questions: QuestionWithFSRS[]
): QuestionWithFSRS[] {
  const TOTAL = 65;
  const distribution: Record<Domain, number> = {
    resilient: Math.round(TOTAL * 0.26),   // 17
    design: Math.round(TOTAL * 0.23),      // 15
    performance: Math.round(TOTAL * 0.21), // 14
    security: Math.round(TOTAL * 0.18),    // 12
    cost: Math.round(TOTAL * 0.12),        // 8
  };

  const selected: QuestionWithFSRS[] = [];

  for (const [domain, count] of Object.entries(distribution)) {
    const domainQuestions = questions.filter((q) => q.domain === (domain as Domain));
    const pick = pickRandom(domainQuestions, count);
    selected.push(...pick);
  }

  // Si no hay suficientes por dominio, rellenar con lo que haya
  if (selected.length < TOTAL) {
    const remaining = questions.filter((q) => !selected.find((s) => s.id === q.id));
    const extra = pickRandom(remaining, TOTAL - selected.length);
    selected.push(...extra);
  }

  return shuffle(selected).slice(0, TOTAL);
}

// ─── Análisis adaptativo ─────────────────────────────────────────────────────

/**
 * Calcular el readiness score del usuario (0-100).
 * Basado en tasa de acierto ponderada por dominio.
 */
export function calculateReadinessScore(
  userStats: Record<Domain, { correctRate: number; questionsAnswered: number }>
): number {
  const weights: Record<Domain, number> = {
    resilient: 0.26,
    design: 0.23,
    performance: 0.21,
    security: 0.18,
    cost: 0.12,
  };

  let weightedScore = 0;
  let totalWeight = 0;

  for (const [domain, weight] of Object.entries(weights)) {
    const stats = userStats[domain as Domain];
    if (stats && stats.questionsAnswered >= 10) {
      weightedScore += stats.correctRate * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;

  const rawScore = (weightedScore / totalWeight) * 100;

  // Penalizar si hay dominios sin suficiente práctica
  const coveredDomains = Object.values(userStats).filter(
    (s) => s.questionsAnswered >= 10
  ).length;
  const coveragePenalty = ((5 - coveredDomains) / 5) * 20;

  return Math.max(0, Math.round(rawScore - coveragePenalty));
}

/**
 * Identificar dominios débiles del usuario.
 */
export function identifyWeakDomains(
  userStats: Record<Domain, { correctRate: number; questionsAnswered: number }>,
  threshold = 0.65
): Domain[] {
  return (Object.entries(userStats) as [Domain, { correctRate: number; questionsAnswered: number }][])
    .filter(([, stats]) => stats.questionsAnswered >= 5 && stats.correctRate < threshold)
    .map(([domain]) => domain)
    .sort((a, b) => (userStats[a]?.correctRate ?? 0) - (userStats[b]?.correctRate ?? 0));
}

/**
 * Predecir probabilidad de pasar el examen.
 * AWS SAA requiere 72% para aprobar.
 */
export function predictPassProbability(readinessScore: number): number {
  // Curva logística centrada en readiness = 72
  const k = 0.1;
  const x0 = 72;
  return 1 / (1 + Math.exp(-k * (readinessScore - x0)));
}

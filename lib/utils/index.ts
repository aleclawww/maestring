import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

// ─── Tailwind utils ───────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Formatters de fecha ──────────────────────────────────────────────────────

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: es,
  });
}

export function formatDate(date: string | Date, pattern = "d MMM yyyy"): string {
  return format(new Date(date), pattern, { locale: es });
}

export function daysUntil(date: string | Date): number {
  return differenceInDays(new Date(date), new Date());
}

// ─── Formatters de números ────────────────────────────────────────────────────

export function formatPercentage(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatScore(correct: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((correct / total) * 100)}%`;
}

export function formatMinutes(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export function formatStudyTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ─── Plurales en español ──────────────────────────────────────────────────────

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

// ─── Aleatorización ──────────────────────────────────────────────────────────

export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

export function pickRandom<T>(array: T[], count: number): T[] {
  return shuffle(array).slice(0, count);
}

// ─── Strings ─────────────────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Domain labels ────────────────────────────────────────────────────────────

export const DOMAIN_LABELS: Record<string, string> = {
  design: "Diseño de Arquitecturas",
  resilient: "Alta Disponibilidad",
  performance: "Rendimiento",
  security: "Seguridad",
  cost: "Optimización de Costos",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Intermedio",
  hard: "Difícil",
  expert: "Experto",
};

// ─── XP y niveles ────────────────────────────────────────────────────────────

export function calculateLevel(xp: number): { level: number; xpToNext: number; progress: number } {
  // Curva de XP: cada nivel requiere más XP
  let level = 1;
  let totalXpRequired = 0;

  while (true) {
    const xpForLevel = level * 100 + Math.pow(level, 2) * 10;
    if (totalXpRequired + xpForLevel > xp) {
      const xpInCurrentLevel = xp - totalXpRequired;
      return {
        level,
        xpToNext: xpForLevel - xpInCurrentLevel,
        progress: xpInCurrentLevel / xpForLevel,
      };
    }
    totalXpRequired += xpForLevel;
    level++;
  }
}

export function xpForAnswer(isCorrect: boolean, difficulty: string, isFirstAttempt: boolean): number {
  if (!isCorrect) return 0;
  const baseXp = { easy: 10, medium: 20, hard: 30, expert: 50 };
  const base = baseXp[difficulty as keyof typeof baseXp] ?? 10;
  return isFirstAttempt ? base : Math.floor(base * 0.5);
}

// ─── Error handling ───────────────────────────────────────────────────────────

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Ha ocurrido un error inesperado";
}

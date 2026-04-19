// ─── Tipos del Motor de Preguntas AWS SAA ────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export type Domain =
  | "design"           // Diseño de arquitecturas resilientes
  | "resilient"        // Arquitecturas de alta disponibilidad
  | "performance"      // Rendimiento y escalabilidad
  | "security"         // Seguridad y cumplimiento
  | "cost";            // Optimización de costos

export type QuestionType =
  | "single"           // Una sola respuesta correcta
  | "multiple"         // Múltiples respuestas correctas
  | "scenario"         // Escenario complejo con contexto largo
  | "drag-drop"        // Ordenar o emparejar (futuro)
  | "hotspot";         // Seleccionar área en diagrama (futuro)

export interface AnswerOption {
  id: string;          // 'A', 'B', 'C', 'D', 'E'
  text: string;
  isCorrect: boolean;
  explanation?: string; // Explicación específica de por qué esta opción es/no es correcta
}

export interface Question {
  id: string;
  questionText: string;
  type: QuestionType;
  difficulty: Difficulty;
  domain: Domain;
  subDomain?: string;  // Ej: "S3", "EC2", "VPC"
  services: string[];  // Servicios AWS involucrados
  options: AnswerOption[];
  explanation: string; // Explicación general de la respuesta correcta
  tips?: string[];     // Tips adicionales para recordar
  references?: string[]; // URLs a documentación AWS
  tags: string[];
  source?: string;     // 'official', 'community', 'ai-generated'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionWithProgress extends Question {
  userProgress?: {
    timesAnswered: number;
    timesCorrect: number;
    lastAnsweredAt?: string;
    nextReviewAt?: string;
    fsrsState?: FSRSCard;
  };
}

export interface UserAnswer {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  timeSpentSeconds: number;
  answeredAt: string;
  sessionId?: string;
}

export interface FSRSCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: "New" | "Learning" | "Review" | "Relearning";
  last_review?: string;
}

// ─── Filtros para búsqueda de preguntas ─────────────────────────────────────

export interface QuestionFilters {
  domain?: Domain[];
  difficulty?: Difficulty[];
  services?: string[];
  type?: QuestionType[];
  tags?: string[];
  onlyWeak?: boolean;    // Solo preguntas donde el usuario falla más
  onlyDue?: boolean;     // Solo preguntas que toca repasar (FSRS)
  excludeIds?: string[];
  limit?: number;
  offset?: number;
}

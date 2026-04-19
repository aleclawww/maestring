// ─── Tipos de Supabase ────────────────────────────────────────────────────────
// Este archivo es generado automáticamente por:
//   npm run db:types
//   o: supabase gen types typescript --local > types/supabase.ts
//
// NO editar manualmente. Regenerar cuando cambien las migraciones.
//
// Nota: El archivo completo generado por Supabase CLI contendrá
// todos los tipos de tablas, vistas, funciones y enums.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "user" | "admin" | "moderator";
          onboarding_completed: boolean;
          certification_target: string | null;
          exam_date: string | null;
          daily_goal_minutes: number;
          timezone: string | null;
          locale: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "user" | "admin" | "moderator";
          onboarding_completed?: boolean;
          certification_target?: string | null;
          exam_date?: string | null;
          daily_goal_minutes?: number;
          timezone?: string | null;
          locale?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "user" | "admin" | "moderator";
          onboarding_completed?: boolean;
          certification_target?: string | null;
          exam_date?: string | null;
          daily_goal_minutes?: number;
          timezone?: string | null;
          locale?: string | null;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          question_text: string;
          type: "single" | "multiple" | "scenario" | "drag-drop" | "hotspot";
          difficulty: "easy" | "medium" | "hard" | "expert";
          domain: "design" | "resilient" | "performance" | "security" | "cost";
          sub_domain: string | null;
          services: string[];
          options: Json;
          explanation: string;
          tips: string[] | null;
          references: string[] | null;
          tags: string[];
          source: "official" | "community" | "ai-generated" | null;
          is_active: boolean;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_text: string;
          type?: "single" | "multiple" | "scenario" | "drag-drop" | "hotspot";
          difficulty?: "easy" | "medium" | "hard" | "expert";
          domain: "design" | "resilient" | "performance" | "security" | "cost";
          sub_domain?: string | null;
          services?: string[];
          options: Json;
          explanation: string;
          tips?: string[] | null;
          references?: string[] | null;
          tags?: string[];
          source?: "official" | "community" | "ai-generated" | null;
          is_active?: boolean;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          question_text?: string;
          type?: "single" | "multiple" | "scenario" | "drag-drop" | "hotspot";
          difficulty?: "easy" | "medium" | "hard" | "expert";
          domain?: "design" | "resilient" | "performance" | "security" | "cost";
          sub_domain?: string | null;
          services?: string[];
          options?: Json;
          explanation?: string;
          tips?: string[] | null;
          references?: string[] | null;
          tags?: string[];
          source?: "official" | "community" | "ai-generated" | null;
          is_active?: boolean;
          embedding?: number[] | null;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          plan: "free" | "monthly" | "annual" | "lifetime";
          status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused";
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          plan?: "free" | "monthly" | "annual" | "lifetime";
          status?: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused";
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_customer_id?: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          plan?: "free" | "monthly" | "annual" | "lifetime";
          status?: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused";
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          trial_end?: string | null;
          updated_at?: string;
        };
      };
      question_progress: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          fsrs_due: string;
          fsrs_stability: number;
          fsrs_difficulty: number;
          fsrs_elapsed_days: number;
          fsrs_scheduled_days: number;
          fsrs_reps: number;
          fsrs_lapses: number;
          fsrs_state: "New" | "Learning" | "Review" | "Relearning";
          fsrs_last_review: string | null;
          times_answered: number;
          times_correct: number;
          last_answered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          fsrs_due?: string;
          fsrs_stability?: number;
          fsrs_difficulty?: number;
          fsrs_elapsed_days?: number;
          fsrs_scheduled_days?: number;
          fsrs_reps?: number;
          fsrs_lapses?: number;
          fsrs_state?: "New" | "Learning" | "Review" | "Relearning";
          fsrs_last_review?: string | null;
          times_answered?: number;
          times_correct?: number;
          last_answered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          fsrs_due?: string;
          fsrs_stability?: number;
          fsrs_difficulty?: number;
          fsrs_elapsed_days?: number;
          fsrs_scheduled_days?: number;
          fsrs_reps?: number;
          fsrs_lapses?: number;
          fsrs_state?: "New" | "Learning" | "Review" | "Relearning";
          fsrs_last_review?: string | null;
          times_answered?: number;
          times_correct?: number;
          last_answered_at?: string | null;
          updated_at?: string;
        };
      };
      answer_history: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          session_id: string | null;
          selected_option_ids: string[];
          is_correct: boolean;
          time_spent_seconds: number;
          fsrs_rating: number | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          session_id?: string | null;
          selected_option_ids: string[];
          is_correct: boolean;
          time_spent_seconds?: number;
          fsrs_rating?: number | null;
          answered_at?: string;
        };
        Update: {
          fsrs_rating?: number | null;
        };
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: "spaced-repetition" | "practice" | "exam-simulation" | "weak-points" | "quick-review";
          config: Json;
          status: "in-progress" | "completed" | "abandoned" | "paused";
          question_ids: string[];
          total_questions: number;
          correct_count: number;
          time_spent_seconds: number;
          score: Json | null;
          started_at: string;
          completed_at: string | null;
          paused_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: "spaced-repetition" | "practice" | "exam-simulation" | "weak-points" | "quick-review";
          config?: Json;
          status?: "in-progress" | "completed" | "abandoned" | "paused";
          question_ids?: string[];
          total_questions?: number;
          correct_count?: number;
          time_spent_seconds?: number;
          score?: Json | null;
          started_at?: string;
          completed_at?: string | null;
          paused_at?: string | null;
        };
        Update: {
          status?: "in-progress" | "completed" | "abandoned" | "paused";
          correct_count?: number;
          time_spent_seconds?: number;
          score?: Json | null;
          completed_at?: string | null;
          paused_at?: string | null;
        };
      };
      daily_progress: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          questions_answered: number;
          questions_correct: number;
          study_minutes: number;
          xp_earned: number;
          sessions_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          questions_answered?: number;
          questions_correct?: number;
          study_minutes?: number;
          xp_earned?: number;
          sessions_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          questions_answered?: number;
          questions_correct?: number;
          study_minutes?: number;
          xp_earned?: number;
          sessions_count?: number;
          updated_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          unlocked_at?: string;
        };
        Update: Record<string, never>;
      };
      processed_pdfs: {
        Row: {
          id: string;
          user_id: string | null;
          filename: string;
          s3_key: string | null;
          file_size_bytes: number | null;
          page_count: number | null;
          status: "pending" | "processing" | "completed" | "failed";
          questions_generated: number | null;
          error_message: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          filename: string;
          s3_key?: string | null;
          file_size_bytes?: number | null;
          page_count?: number | null;
          status?: "pending" | "processing" | "completed" | "failed";
          questions_generated?: number | null;
          error_message?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "pending" | "processing" | "completed" | "failed";
          questions_generated?: number | null;
          error_message?: string | null;
          processed_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_questions: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: Array<{
          id: string;
          question_text: string;
          similarity: number;
        }>;
      };
    };
    Enums: Record<string, never>;
  };
}

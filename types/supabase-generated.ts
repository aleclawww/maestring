export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ab_assignments: {
        Row: {
          assigned_at: string
          experiment_id: string
          user_id: string
          variant: string
        }
        Insert: {
          assigned_at?: string
          experiment_id: string
          user_id: string
          variant: string
        }
        Update: {
          assigned_at?: string
          experiment_id?: string
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_experiments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          traffic_pct: number
          variants: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          status?: string
          traffic_pct?: number
          variants?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          traffic_pct?: number
          variants?: Json
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action: string
          admin_email: string | null
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      ambient_cards: {
        Row: {
          analogy: string | null
          aws_services: string[]
          body: string
          concept_id: string
          created_at: string
          id: string
          modality: string
          status: string
          title: string
          visual_desc: string | null
        }
        Insert: {
          analogy?: string | null
          aws_services?: string[]
          body: string
          concept_id: string
          created_at?: string
          id?: string
          modality: string
          status?: string
          title: string
          visual_desc?: string | null
        }
        Update: {
          analogy?: string | null
          aws_services?: string[]
          body?: string
          concept_id?: string
          created_at?: string
          id?: string
          modality?: string
          status?: string
          title?: string
          visual_desc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambient_cards_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      aws_service_name_map: {
        Row: {
          alias: string
          canonical: string
        }
        Insert: {
          alias: string
          canonical: string
        }
        Update: {
          alias?: string
          canonical?: string
        }
        Relationships: []
      }
      chunk_concept_links: {
        Row: {
          chunk_id: string
          concept_id: string
          id: string
          relevance_score: number
        }
        Insert: {
          chunk_id: string
          concept_id: string
          id?: string
          relevance_score?: number
        }
        Update: {
          chunk_id?: string
          concept_id?: string
          id?: string
          relevance_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "chunk_concept_links_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "content_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunk_concept_links_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_briefs: {
        Row: {
          body_md: string
          concept_id: string
          created_at: string
          diagram_url: string | null
          gotchas: Json | null
          related_concept_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          body_md: string
          concept_id: string
          created_at?: string
          diagram_url?: string | null
          gotchas?: Json | null
          related_concept_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          concept_id?: string
          created_at?: string
          diagram_url?: string | null
          gotchas?: Json | null
          related_concept_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_briefs_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: true
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_confusion_pairs: {
        Row: {
          certification_id: string
          concept_a_id: string
          concept_b_id: string
          created_at: string
          id: string
          observation_count: number
          source: string
          updated_at: string
          weight: number
        }
        Insert: {
          certification_id: string
          concept_a_id: string
          concept_b_id: string
          created_at?: string
          id?: string
          observation_count?: number
          source: string
          updated_at?: string
          weight?: number
        }
        Update: {
          certification_id?: string
          concept_a_id?: string
          concept_b_id?: string
          created_at?: string
          id?: string
          observation_count?: number
          source?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "concept_confusion_pairs_concept_a_id_fkey"
            columns: ["concept_a_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_confusion_pairs_concept_b_id_fkey"
            columns: ["concept_b_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_exposures: {
        Row: {
          concept_id: string
          context: Json
          created_at: string
          dwell_ms: number
          exposure_index: number
          id: string
          modality: string
          user_id: string
        }
        Insert: {
          concept_id: string
          context?: Json
          created_at?: string
          dwell_ms?: number
          exposure_index?: number
          id?: string
          modality: string
          user_id: string
        }
        Update: {
          concept_id?: string
          context?: Json
          created_at?: string
          dwell_ms?: number
          exposure_index?: number
          id?: string
          modality?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_exposures_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          aws_services: Json
          certification_id: string
          confused_with: Json
          created_at: string
          description: string
          difficulty: number
          domain_id: string
          exam_tips: Json
          id: string
          is_active: boolean
          key_facts: Json
          name: string
          slug: string
          topic_id: string | null
        }
        Insert: {
          aws_services?: Json
          certification_id: string
          confused_with?: Json
          created_at?: string
          description?: string
          difficulty?: number
          domain_id: string
          exam_tips?: Json
          id?: string
          is_active?: boolean
          key_facts?: Json
          name: string
          slug: string
          topic_id?: string | null
        }
        Update: {
          aws_services?: Json
          certification_id?: string
          confused_with?: Json
          created_at?: string
          description?: string
          difficulty?: number
          domain_id?: string
          exam_tips?: Json
          id?: string
          is_active?: boolean
          key_facts?: Json
          name?: string
          slug?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concepts_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "knowledge_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "domain_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      content_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          token_count: number
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_count?: number
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_matrix: {
        Row: {
          ambient_card_exists: boolean
          approved_at: string | null
          aws_service: string
          category: string
          elaboration_count: number
          notes: string | null
          task_statements: string[]
          tier: number
        }
        Insert: {
          ambient_card_exists?: boolean
          approved_at?: string | null
          aws_service: string
          category: string
          elaboration_count?: number
          notes?: string | null
          task_statements?: string[]
          tier: number
        }
        Update: {
          ambient_card_exists?: boolean
          approved_at?: string | null
          aws_service?: string
          category?: string
          elaboration_count?: number
          notes?: string | null
          task_statements?: string[]
          tier?: number
        }
        Relationships: []
      }
      cron_runs: {
        Row: {
          ended_at: string | null
          error: string | null
          id: string
          metadata: Json | null
          name: string
          rows_affected: number | null
          started_at: string
          status: string
        }
        Insert: {
          ended_at?: string | null
          error?: string | null
          id?: string
          metadata?: Json | null
          name: string
          rows_affected?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          ended_at?: string | null
          error?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          rows_affected?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      daily_llm_usage: {
        Row: {
          count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      domain_topics: {
        Row: {
          domain_id: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          domain_id: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          domain_id?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "domain_topics_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "knowledge_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      elaboration_prompts: {
        Row: {
          concept_id: string
          created_at: string
          distractor_concept: string | null
          id: string
          key_themes: string[]
          prompt_key: string
          prompt_text: string
          reference_answer: string
          status: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          distractor_concept?: string | null
          id?: string
          key_themes?: string[]
          prompt_key: string
          prompt_text: string
          reference_answer: string
          status?: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          distractor_concept?: string | null
          id?: string
          key_themes?: string[]
          prompt_key?: string
          prompt_text?: string
          reference_answer?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "elaboration_prompts_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_session_items: {
        Row: {
          answered_at: string | null
          flagged: boolean
          id: string
          is_correct: boolean | null
          position: number
          question_id: string
          session_id: string
          user_answer_index: number | null
        }
        Insert: {
          answered_at?: string | null
          flagged?: boolean
          id?: string
          is_correct?: boolean | null
          position: number
          question_id: string
          session_id: string
          user_answer_index?: number | null
        }
        Update: {
          answered_at?: string | null
          flagged?: boolean
          id?: string
          is_correct?: boolean | null
          position?: number
          question_id?: string
          session_id?: string
          user_answer_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_session_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          by_domain: Json | null
          certification_id: string
          correct_count: number | null
          created_at: string
          deadline_at: string
          id: string
          passed: boolean | null
          scaled_score: number | null
          started_at: string
          status: Database["public"]["Enums"]["exam_session_status"]
          submitted_at: string | null
          total_questions: number
          user_id: string
        }
        Insert: {
          by_domain?: Json | null
          certification_id?: string
          correct_count?: number | null
          created_at?: string
          deadline_at: string
          id?: string
          passed?: boolean | null
          scaled_score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["exam_session_status"]
          submitted_at?: string | null
          total_questions: number
          user_id: string
        }
        Update: {
          by_domain?: Json | null
          certification_id?: string
          correct_count?: number | null
          created_at?: string
          deadline_at?: string
          id?: string
          passed?: boolean | null
          scaled_score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["exam_session_status"]
          submitted_at?: string | null
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      knowledge_domains: {
        Row: {
          certification_id: string
          color: string
          created_at: string
          description: string | null
          exam_weight_percent: number
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          certification_id: string
          color?: string
          created_at?: string
          description?: string | null
          exam_weight_percent: number
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          certification_id?: string
          color?: string
          created_at?: string
          description?: string | null
          exam_weight_percent?: number
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      learning_phase_transitions: {
        Row: {
          created_at: string
          from_phase: Database["public"]["Enums"]["learning_phase"] | null
          id: string
          reason: string
          signals: Json
          to_phase: Database["public"]["Enums"]["learning_phase"]
          user_id: string
        }
        Insert: {
          created_at?: string
          from_phase?: Database["public"]["Enums"]["learning_phase"] | null
          id?: string
          reason: string
          signals?: Json
          to_phase: Database["public"]["Enums"]["learning_phase"]
          user_id: string
        }
        Update: {
          created_at?: string
          from_phase?: Database["public"]["Enums"]["learning_phase"] | null
          id?: string
          reason?: string
          signals?: Json
          to_phase?: Database["public"]["Enums"]["learning_phase"]
          user_id?: string
        }
        Relationships: []
      }
      llm_usage: {
        Row: {
          cached_input_tokens: number
          cost_usd: number
          created_at: string
          error_code: string | null
          id: string
          input_tokens: number
          latency_ms: number | null
          metadata: Json | null
          model: string
          output_tokens: number
          route: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          cached_input_tokens?: number
          cost_usd?: number
          created_at?: string
          error_code?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata?: Json | null
          model: string
          output_tokens?: number
          route: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          cached_input_tokens?: number
          cost_usd?: number
          created_at?: string
          error_code?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          metadata?: Json | null
          model?: string
          output_tokens?: number
          route?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      magic_link_uses: {
        Row: {
          created_at: string
          id: string
          jti: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jti: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jti?: string
          user_id?: string
        }
        Relationships: []
      }
      metacognitive_calibration: {
        Row: {
          concept_id: string | null
          confidence: number
          id: number
          question_attempt_id: string | null
          recorded_at: string
          user_id: string
          was_correct: boolean
        }
        Insert: {
          concept_id?: string | null
          confidence: number
          id?: number
          question_attempt_id?: string | null
          recorded_at?: string
          user_id: string
          was_correct: boolean
        }
        Update: {
          concept_id?: string | null
          confidence?: number
          id?: number
          question_attempt_id?: string | null
          recorded_at?: string
          user_id?: string
          was_correct?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "metacognitive_calibration_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metacognitive_calibration_question_attempt_id_fkey"
            columns: ["question_attempt_id"]
            isOneToOne: false
            referencedRelation: "question_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_personal: boolean
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_personal?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_personal?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          calibrated_at: string | null
          chronotype: string | null
          cognitive_fingerprint: Json
          cognitive_load_budget: number | null
          created_at: string
          current_streak: number
          email_nudges_enabled: boolean
          exam_date: string | null
          exam_outcome: string | null
          exam_scaled_score: number | null
          exam_target_date: string | null
          full_name: string | null
          id: string
          journey_phase: Database["public"]["Enums"]["journey_phase"]
          last_export_at: string | null
          last_readiness_at: string | null
          last_readiness_score: number | null
          last_study_date: string | null
          learning_phase: Database["public"]["Enums"]["learning_phase"]
          learning_phase_started_at: string
          longest_streak: number
          notification_preferences: Json
          onboarding_completed: boolean
          prior_knowledge_vector: string | null
          processing_speed_ms: number | null
          referral_code: string
          referred_by: string | null
          sleep_window_end: number | null
          sleep_window_start: number | null
          streak_freezes_available: number
          streak_freezes_last_grant: string | null
          study_minutes_per_day: number
          timezone: string
          total_xp: number
          updated_at: string
          welcome_email_sent_at: string | null
          working_memory_span: number | null
        }
        Insert: {
          avatar_url?: string | null
          calibrated_at?: string | null
          chronotype?: string | null
          cognitive_fingerprint?: Json
          cognitive_load_budget?: number | null
          created_at?: string
          current_streak?: number
          email_nudges_enabled?: boolean
          exam_date?: string | null
          exam_outcome?: string | null
          exam_scaled_score?: number | null
          exam_target_date?: string | null
          full_name?: string | null
          id: string
          journey_phase?: Database["public"]["Enums"]["journey_phase"]
          last_export_at?: string | null
          last_readiness_at?: string | null
          last_readiness_score?: number | null
          last_study_date?: string | null
          learning_phase?: Database["public"]["Enums"]["learning_phase"]
          learning_phase_started_at?: string
          longest_streak?: number
          notification_preferences?: Json
          onboarding_completed?: boolean
          prior_knowledge_vector?: string | null
          processing_speed_ms?: number | null
          referral_code?: string
          referred_by?: string | null
          sleep_window_end?: number | null
          sleep_window_start?: number | null
          streak_freezes_available?: number
          streak_freezes_last_grant?: string | null
          study_minutes_per_day?: number
          timezone?: string
          total_xp?: number
          updated_at?: string
          welcome_email_sent_at?: string | null
          working_memory_span?: number | null
        }
        Update: {
          avatar_url?: string | null
          calibrated_at?: string | null
          chronotype?: string | null
          cognitive_fingerprint?: Json
          cognitive_load_budget?: number | null
          created_at?: string
          current_streak?: number
          email_nudges_enabled?: boolean
          exam_date?: string | null
          exam_outcome?: string | null
          exam_scaled_score?: number | null
          exam_target_date?: string | null
          full_name?: string | null
          id?: string
          journey_phase?: Database["public"]["Enums"]["journey_phase"]
          last_export_at?: string | null
          last_readiness_at?: string | null
          last_readiness_score?: number | null
          last_study_date?: string | null
          learning_phase?: Database["public"]["Enums"]["learning_phase"]
          learning_phase_started_at?: string
          longest_streak?: number
          notification_preferences?: Json
          onboarding_completed?: boolean
          prior_knowledge_vector?: string | null
          processing_speed_ms?: number | null
          referral_code?: string
          referred_by?: string | null
          sleep_window_end?: number | null
          sleep_window_start?: number | null
          streak_freezes_available?: number
          streak_freezes_last_grant?: string | null
          study_minutes_per_day?: number
          timezone?: string
          total_xp?: number
          updated_at?: string
          welcome_email_sent_at?: string | null
          working_memory_span?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["referral_code"]
          },
        ]
      }
      question_attempts: {
        Row: {
          concept_id: string
          confidence: number | null
          created_at: string
          evaluation_result: Json | null
          id: string
          is_confusion_target: boolean
          is_correct: boolean
          question_id: string
          session_id: string
          time_taken_ms: number
          user_answer_index: number
          user_id: string
        }
        Insert: {
          concept_id: string
          confidence?: number | null
          created_at?: string
          evaluation_result?: Json | null
          id?: string
          is_confusion_target?: boolean
          is_correct: boolean
          question_id: string
          session_id: string
          time_taken_ms?: number
          user_answer_index: number
          user_id: string
        }
        Update: {
          concept_id?: string
          confidence?: number | null
          created_at?: string
          evaluation_result?: Json | null
          id?: string
          is_confusion_target?: boolean
          is_correct?: boolean
          question_id?: string
          session_id?: string
          time_taken_ms?: number
          user_answer_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          category: string
          comment: string | null
          created_at: string
          id: string
          question_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          user_selected_option: number | null
        }
        Insert: {
          category: string
          comment?: string | null
          created_at?: string
          id?: string
          question_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          user_selected_option?: number | null
        }
        Update: {
          category?: string
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          user_selected_option?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          aws_services: string[]
          blueprint_task_id: string | null
          concept_id: string
          correct_index: number
          created_at: string
          difficulty: number
          expected_distractor_type: Json | null
          explanation: string
          explanation_deep: string | null
          hint: string | null
          id: string
          is_active: boolean
          is_canonical: boolean
          is_fluency_eligible: boolean
          key_insight: string | null
          options: Json
          pattern_tag: string | null
          phase_mask: string[]
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          reject_reason: string | null
          review_status: Database["public"]["Enums"]["question_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          scenario_context: Json | null
          source: string
          tags: string[]
          times_correct: number
          times_shown: number
          validated_at: string | null
          validation_notes: string | null
          validator_model: string | null
          variation_seed: string | null
        }
        Insert: {
          aws_services?: string[]
          blueprint_task_id?: string | null
          concept_id: string
          correct_index: number
          created_at?: string
          difficulty?: number
          expected_distractor_type?: Json | null
          explanation: string
          explanation_deep?: string | null
          hint?: string | null
          id?: string
          is_active?: boolean
          is_canonical?: boolean
          is_fluency_eligible?: boolean
          key_insight?: string | null
          options: Json
          pattern_tag?: string | null
          phase_mask?: string[]
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          reject_reason?: string | null
          review_status?: Database["public"]["Enums"]["question_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          scenario_context?: Json | null
          source?: string
          tags?: string[]
          times_correct?: number
          times_shown?: number
          validated_at?: string | null
          validation_notes?: string | null
          validator_model?: string | null
          variation_seed?: string | null
        }
        Update: {
          aws_services?: string[]
          blueprint_task_id?: string | null
          concept_id?: string
          correct_index?: number
          created_at?: string
          difficulty?: number
          expected_distractor_type?: Json | null
          explanation?: string
          explanation_deep?: string | null
          hint?: string | null
          id?: string
          is_active?: boolean
          is_canonical?: boolean
          is_fluency_eligible?: boolean
          key_insight?: string | null
          options?: Json
          pattern_tag?: string | null
          phase_mask?: string[]
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          reject_reason?: string | null
          review_status?: Database["public"]["Enums"]["question_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          scenario_context?: Json | null
          source?: string
          tags?: string[]
          times_correct?: number
          times_shown?: number
          validated_at?: string | null
          validation_notes?: string | null
          validator_model?: string | null
          variation_seed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_history: {
        Row: {
          by_domain: Json | null
          pass_probability: number | null
          score: number
          snapshot_date: string
          studied_concepts: number
          user_id: string
        }
        Insert: {
          by_domain?: Json | null
          pass_probability?: number | null
          score: number
          snapshot_date?: string
          studied_concepts?: number
          user_id: string
        }
        Update: {
          by_domain?: Json | null
          pass_probability?: number | null
          score?: number
          snapshot_date?: string
          studied_concepts?: number
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          converted_at: string | null
          created_at: string
          credit_applied: boolean
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          code: string
          converted_at?: string | null
          created_at?: string
          credit_applied?: boolean
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          code?: string
          converted_at?: string | null
          created_at?: string
          credit_applied?: boolean
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      streak_freeze_log: {
        Row: {
          id: string
          missed_date: string
          spent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          missed_date: string
          spent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          missed_date?: string
          spent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          error: string | null
          id: string
          processed_at: string | null
          received_at: string
          type: string
        }
        Insert: {
          error?: string | null
          id: string
          processed_at?: string | null
          received_at?: string
          type: string
        }
        Update: {
          error?: string | null
          id?: string
          processed_at?: string | null
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          abandoned_at: string | null
          certification_id: string
          completed_at: string | null
          concepts_studied: number
          correct_answers: number
          correct_count: number
          created_at: string
          domain_id: string | null
          ended_at: string | null
          id: string
          incorrect_count: number
          is_completed: boolean
          mode: Database["public"]["Enums"]["study_mode"]
          questions_answered: number
          started_at: string
          status: string
          target_questions: number
          total_time_seconds: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          abandoned_at?: string | null
          certification_id?: string
          completed_at?: string | null
          concepts_studied?: number
          correct_answers?: number
          correct_count?: number
          created_at?: string
          domain_id?: string | null
          ended_at?: string | null
          id?: string
          incorrect_count?: number
          is_completed?: boolean
          mode?: Database["public"]["Enums"]["study_mode"]
          questions_answered?: number
          started_at?: string
          status?: string
          target_questions?: number
          total_time_seconds?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          abandoned_at?: string | null
          certification_id?: string
          completed_at?: string | null
          concepts_studied?: number
          correct_answers?: number
          correct_count?: number
          created_at?: string
          domain_id?: string | null
          ended_at?: string | null
          id?: string
          incorrect_count?: number
          is_completed?: boolean
          mode?: Database["public"]["Enums"]["study_mode"]
          questions_answered?: number
          started_at?: string
          status?: string
          target_questions?: number
          total_time_seconds?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "knowledge_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          ls_customer_id: string | null
          ls_order_id: string | null
          ls_subscription_id: string | null
          ls_variant_id: string | null
          organization_id: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          ls_customer_id?: string | null
          ls_order_id?: string | null
          ls_subscription_id?: string | null
          ls_variant_id?: string | null
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          ls_customer_id?: string | null
          ls_order_id?: string | null
          ls_subscription_id?: string | null
          ls_variant_id?: string | null
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          content: string
          created_at: string
          display_name: string
          exam_passed: boolean | null
          featured: boolean
          id: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string | null
          scaled_score: number | null
          stars: number
          status: Database["public"]["Enums"]["testimonial_status"]
          submitted_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          display_name: string
          exam_passed?: boolean | null
          featured?: boolean
          id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          scaled_score?: number | null
          stars?: number
          status?: Database["public"]["Enums"]["testimonial_status"]
          submitted_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string
          exam_passed?: boolean | null
          featured?: boolean
          id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          scaled_score?: number | null
          stars?: number
          status?: Database["public"]["Enums"]["testimonial_status"]
          submitted_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_concept_states: {
        Row: {
          concept_id: string
          created_at: string
          difficulty: number
          elapsed_days: number
          id: string
          lapses: number
          last_rating: number | null
          last_review: string | null
          next_review_date: string | null
          reps: number
          scheduled_days: number
          stability: number
          state: number
          updated_at: string
          user_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          difficulty?: number
          elapsed_days?: number
          id?: string
          lapses?: number
          last_rating?: number | null
          last_review?: string | null
          next_review_date?: string | null
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          difficulty?: number
          elapsed_days?: number
          id?: string
          lapses?: number
          last_rating?: number | null
          last_review?: string | null
          next_review_date?: string | null
          reps?: number
          scheduled_days?: number
          stability?: number
          state?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_concept_states_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          chunk_count: number
          created_at: string
          error_message: string | null
          file_size: number
          filename: string
          id: string
          metadata: Json
          mime_type: string
          org_id: string | null
          processing_status: Database["public"]["Enums"]["processing_status"]
          storage_path: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          file_size?: number
          filename: string
          id?: string
          metadata?: Json
          mime_type?: string
          org_id?: string | null
          processing_status?: Database["public"]["Enums"]["processing_status"]
          storage_path: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_count?: number
          created_at?: string
          error_message?: string | null
          file_size?: number
          filename?: string
          id?: string
          metadata?: Json
          mime_type?: string
          org_id?: string | null
          processing_status?: Database["public"]["Enums"]["processing_status"]
          storage_path?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_state: {
        Row: {
          ambient_exposures: number
          anchoring_responses: number
          automation_attempts: number
          automation_under8s: number
          interleave_attempts: number
          interleave_correct: number
          phase: Database["public"]["Enums"]["learning_phase"]
          phase_entered_at: string
          readiness_baseline: number | null
          readiness_baseline_at: string | null
          retrieval_attempts: number
          retrieval_correct: number
          transfer_attempts: number
          transfer_correct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ambient_exposures?: number
          anchoring_responses?: number
          automation_attempts?: number
          automation_under8s?: number
          interleave_attempts?: number
          interleave_correct?: number
          phase?: Database["public"]["Enums"]["learning_phase"]
          phase_entered_at?: string
          readiness_baseline?: number | null
          readiness_baseline_at?: string | null
          retrieval_attempts?: number
          retrieval_correct?: number
          transfer_attempts?: number
          transfer_correct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ambient_exposures?: number
          anchoring_responses?: number
          automation_attempts?: number
          automation_under8s?: number
          interleave_attempts?: number
          interleave_correct?: number
          phase?: Database["public"]["Enums"]["learning_phase"]
          phase_entered_at?: string
          readiness_baseline?: number | null
          readiness_baseline_at?: string | null
          retrieval_attempts?: number
          retrieval_correct?: number
          transfer_attempts?: number
          transfer_correct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      blueprint_coverage: {
        Row: {
          approved_count: number | null
          blueprint_task_id: string | null
          canonical_count: number | null
          concept_diversity: number | null
        }
        Relationships: []
      }
      coverage_status: {
        Row: {
          ambient_card_exists: boolean | null
          aws_service: string | null
          category: string | null
          coverage_status: string | null
          elaboration_count: number | null
          question_count: number | null
          task_statements: string[] | null
          tier: number | null
        }
        Relationships: []
      }
      user_subscription_plan: {
        Row: {
          cancel_at_period_end: boolean | null
          current_period_end: string | null
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          current_period_end?: string | null
          plan?: never
          status?: never
          user_id?: never
        }
        Update: {
          cancel_at_period_end?: boolean | null
          current_period_end?: string | null
          plan?: never
          status?: never
          user_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      _plan_monthly_price_usd: { Args: { p_plan: string }; Returns: number }
      _readiness_pass_probability: {
        Args: { p_score: number; p_studied: number; p_total: number }
        Returns: number
      }
      admin_failed_documents: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          email: string
          error_message: string
          file_size: number
          filename: string
          id: string
          processing_status: string
          user_id: string
        }[]
      }
      admin_grant_pro: {
        Args: { p_days?: number; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_list_testimonials: {
        Args: {
          p_limit?: number
          p_status?: Database["public"]["Enums"]["testimonial_status"]
        }
        Returns: {
          content: string
          display_name: string
          exam_passed: boolean
          featured: boolean
          id: string
          reviewed_at: string
          role: string
          scaled_score: number
          stars: number
          status: Database["public"]["Enums"]["testimonial_status"]
          submitted_at: string
          user_email: string
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_plan?: string
          p_search?: string
        }
        Returns: {
          created_at: string
          current_streak: number
          email: string
          exam_outcome: string
          exam_target_date: string
          full_name: string
          id: string
          journey_phase: string
          last_readiness_score: number
          last_session_at: string
          llm_spend_30d: number
          onboarding_completed: boolean
          plan: string
          total_xp: number
        }[]
      }
      admin_llm_usage: { Args: { p_days?: number }; Returns: Json }
      admin_outcomes_summary: { Args: never; Returns: Json }
      admin_overview: { Args: { p_days?: number }; Returns: Json }
      admin_recent_actions: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          admin_email: string | null
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_actions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_unit_economics: { Args: { p_days?: number }; Returns: Json }
      admin_user_detail: { Args: { p_user_id: string }; Returns: Json }
      bump_question_shown: {
        Args: { p_question_id: string }
        Returns: undefined
      }
      calculate_retention_probability: {
        Args: { elapsed_days: number; stability: number }
        Returns: number
      }
      compute_journey_phase: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["journey_phase"]
      }
      concepts_needing_refill: {
        Args: { p_min?: number }
        Returns: {
          concept_id: string
          pool_size: number
        }[]
      }
      consume_llm_quota: {
        Args: { p_user_id: string }
        Returns: {
          allowed: boolean
          plan: string
          quota: number
          used: number
        }[]
      }
      ensure_user_bootstrapped: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      ensure_user_learning_state: {
        Args: { p_user_id: string }
        Returns: {
          ambient_exposures: number
          anchoring_responses: number
          automation_attempts: number
          automation_under8s: number
          interleave_attempts: number
          interleave_correct: number
          phase: Database["public"]["Enums"]["learning_phase"]
          phase_entered_at: string
          readiness_baseline: number | null
          readiness_baseline_at: string | null
          retrieval_attempts: number
          retrieval_correct: number
          transfer_attempts: number
          transfer_correct: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_learning_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_blueprint_task_accuracy: {
        Args: { p_certification_id?: string; p_user_id: string }
        Returns: {
          accuracy_pct: number
          attempts: number
          correct: number
          domain_name: string
          domain_number: number
          domain_weight_pct: number
          pool_available: number
          task_id: string
          task_label: string
        }[]
      }
      get_broken_streaks_today: {
        Args: never
        Returns: {
          email: string
          first_name: string
          previous_streak: number
          user_id: string
        }[]
      }
      get_concepts_for_review: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          concept_id: string
          difficulty: number
          domain_id: string
          lapses: number
          last_review: string
          name: string
          next_review_date: string
          reps: number
          slug: string
          stability: number
          state: number
          urgency_score: number
        }[]
      }
      get_exam_readiness: {
        Args: { p_certification_id?: string; p_user_id: string }
        Returns: {
          at_risk_count: number
          by_domain: Json
          eta_ready_date: string
          score: number
          studied_concepts: number
          total_concepts: number
          weakest_domain: string
        }[]
      }
      get_exam_readiness_v2: {
        Args: { p_certification_id?: string; p_user_id: string }
        Returns: {
          at_risk_count: number
          by_domain: Json
          confidence_high: number
          confidence_low: number
          eta_ready_date: string
          history: Json
          pass_probability: number
          score: number
          studied_concepts: number
          total_concepts: number
          velocity_per_week: number
          weakest_concepts: Json
          weakest_domain: string
          weakest_domain_id: string
        }[]
      }
      get_study_heatmap: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          questions_answered: number
          session_count: number
          study_date: string
          xp_earned: number
        }[]
      }
      get_top_confusions: {
        Args: { p_concept_id: string; p_limit?: number }
        Returns: {
          concept_id: string
          weight: number
        }[]
      }
      get_user_exposure_counts: {
        Args: { p_min_dwell_ms?: number; p_user_id: string }
        Returns: {
          concept_id: string
          exposure_count: number
          last_modality: string
        }[]
      }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_accuracy: number
          concepts_mastered: number
          correct_answers: number
          current_streak: number
          longest_streak: number
          total_questions_answered: number
          total_sessions: number
          total_xp: number
        }[]
      }
      get_users_for_weekly_digest: {
        Args: never
        Returns: {
          accuracy_week: number
          best_exam_passed: boolean
          best_exam_scaled: number
          correct_week: number
          current_streak: number
          days_until_exam: number
          due_next_7d: number
          email: string
          first_name: string
          minutes_week: number
          pass_probability: number
          questions_week: number
          readiness_7d_ago: number
          readiness_delta: number
          readiness_now: number
          sessions_week: number
          user_id: string
          weakest_domain_accuracy: number
          weakest_domain_name: string
          weakest_domain_slug: string
          weakest_task_id: string
          weakest_task_label: string
        }[]
      }
      get_users_needing_nudge: {
        Args: never
        Returns: {
          days_until_exam: number
          due_count: number
          email: string
          first_name: string
          streak_days: number
          user_id: string
        }[]
      }
      get_variant: {
        Args: { p_experiment_id: string; p_user_id: string }
        Returns: string
      }
      increment_profile_xp: {
        Args: { p_user_id: string; p_xp: number }
        Returns: undefined
      }
      increment_session_counters:
        | {
            Args: { p_is_correct: boolean; p_session_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_is_correct: boolean
              p_session_id: string
              p_session_owner?: string
            }
            Returns: undefined
          }
      increment_uls_counter: {
        Args: { p_column: string; p_user_id: string }
        Returns: undefined
      }
      is_valid_phase_transition: {
        Args: {
          p_from: Database["public"]["Enums"]["learning_phase"]
          p_to: Database["public"]["Enums"]["learning_phase"]
        }
        Returns: boolean
      }
      llm_cost_today: { Args: { p_user_id?: string }; Returns: number }
      llm_top_spenders_24h: {
        Args: { p_limit?: number }
        Returns: {
          call_count: number
          cost_usd: number
          user_id: string
        }[]
      }
      nanoid: { Args: { size?: number }; Returns: string }
      needs_outcome_capture: { Args: { p_user_id: string }; Returns: boolean }
      normalize_aws_service: { Args: { alias: string }; Returns: string }
      pick_pool_question: {
        Args: {
          p_concept_id: string
          p_seen_patterns?: string[]
          p_seen_tasks?: string[]
          p_user_id: string
        }
        Returns: {
          blueprint_task_id: string
          correct_index: number
          difficulty: number
          explanation: string
          explanation_deep: string
          hint: string
          id: string
          is_canonical: boolean
          key_insight: string
          options: Json
          pattern_tag: string
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          scenario_context: Json
        }[]
      }
      record_confusion: {
        Args: {
          p_certification_id: string
          p_concept_x_id: string
          p_concept_y_id: string
        }
        Returns: undefined
      }
      record_exam_answer: {
        Args: {
          p_answer_index: number
          p_flagged?: boolean
          p_position: number
          p_session_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      record_exposure: {
        Args: {
          p_concept_id: string
          p_context?: Json
          p_dwell_ms: number
          p_modality: string
          p_user_id: string
        }
        Returns: number
      }
      search_content_chunks: {
        Args: {
          p_match_count?: number
          p_query_embedding: string
          p_threshold?: number
          p_user_id: string
        }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      seed_concept_states_from_self_rating: {
        Args: {
          p_certification_id: string
          p_concepts_per_domain?: number
          p_self_levels: Json
          p_user_id: string
        }
        Returns: number
      }
      snapshot_readiness: { Args: { p_user_id: string }; Returns: number }
      snapshot_readiness_batch: { Args: never; Returns: number }
      start_exam_session: {
        Args: {
          p_certification_id?: string
          p_duration_minutes?: number
          p_total?: number
          p_user_id: string
        }
        Returns: string
      }
      submit_exam_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: Json
      }
      transition_learning_phase: {
        Args: {
          p_reason: string
          p_signals?: Json
          p_to_phase: Database["public"]["Enums"]["learning_phase"]
          p_user_id: string
        }
        Returns: Database["public"]["Enums"]["learning_phase"]
      }
      update_cognitive_fingerprint: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      exam_session_status: "in_progress" | "submitted" | "abandoned"
      journey_phase:
        | "pre_study"
        | "active_prep"
        | "pre_exam"
        | "post_cert"
        | "maintenance"
      learning_phase:
        | "calibration"
        | "ambient"
        | "anchoring"
        | "retrieval_easy"
        | "interleaving"
        | "consolidation"
        | "automation"
        | "transfer"
        | "mastery"
      processing_status: "pending" | "processing" | "completed" | "failed"
      question_review_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_review"
      question_type: "multiple_choice" | "scenario" | "drag_drop"
      study_mode:
        | "discovery"
        | "review"
        | "intensive"
        | "maintenance"
        | "exploration"
      subscription_plan: "free" | "pro" | "pro_annual" | "enterprise"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
      testimonial_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      exam_session_status: ["in_progress", "submitted", "abandoned"],
      journey_phase: [
        "pre_study",
        "active_prep",
        "pre_exam",
        "post_cert",
        "maintenance",
      ],
      learning_phase: [
        "calibration",
        "ambient",
        "anchoring",
        "retrieval_easy",
        "interleaving",
        "consolidation",
        "automation",
        "transfer",
        "mastery",
      ],
      processing_status: ["pending", "processing", "completed", "failed"],
      question_review_status: [
        "pending",
        "approved",
        "rejected",
        "needs_review",
      ],
      question_type: ["multiple_choice", "scenario", "drag_drop"],
      study_mode: [
        "discovery",
        "review",
        "intensive",
        "maintenance",
        "exploration",
      ],
      subscription_plan: ["free", "pro", "pro_annual", "enterprise"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
      ],
      testimonial_status: ["pending", "approved", "rejected"],
    },
  },
} as const

// Hand-written to match resolv-hq/supabase/schema.sql exactly.
// Regenerate/verify with `supabase gen types typescript` once the
// project is linked, but this file is the source of truth until then.
// Shared 1:1 with resolv-hq-customer/lib/database.types.ts — the two
// apps read/write the same Postgres schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "admin" | "agent";
export type ProfileStatus = "active" | "suspended" | "pending";
export type RequestStatus = "submitted" | "processing" | "review" | "needs_info" | "completed";
export type RequestPriority = "low" | "medium" | "high";
export type RequestSource = "web" | "mobile" | "chat" | "email" | "phone";
export type MessageSenderType = "customer" | "support" | "ai";
export type AiMessageRole = "user" | "assistant";
export type NotificationType = "request_update" | "ai" | "support" | "completed" | "system";
export type KnowledgeFileType = "PDF" | "DOCX" | "MD";
export type KnowledgeStatus = "indexed" | "indexing" | "error";
export type ToolPermission = "read" | "write";
export type ToolStatus = "active" | "disabled";
export type RunStatus = "in_progress" | "awaiting_approval" | "completed" | "recovered" | "failed";
export type StepStatus = "pending" | "active" | "done" | "blocked" | "failed";
export type ApprovalRisk = "low" | "medium" | "high";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type EvalCategory =
  | "normal"
  | "edge"
  | "incorrect_info"
  | "adversarial"
  | "tool_failure"
  | "unauthorized_action";
export type EvalResult = "passed" | "blocked" | "recovered" | "failed";
export type GuardrailOutcome = "blocked" | "allowed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          status: ProfileStatus;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          status?: ProfileStatus;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      customer_profiles: {
        Row: {
          id: string;
          plan: string;
          notification_channel_preference: string;
          push_notifications: boolean;
          email_notifications: boolean;
          ai_personalization: boolean;
          memory_enabled: boolean;
        };
        Insert: {
          id: string;
          plan?: string;
          notification_channel_preference?: string;
          push_notifications?: boolean;
          email_notifications?: boolean;
          ai_personalization?: boolean;
          memory_enabled?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["customer_profiles"]["Insert"]>;
        Relationships: [];
      };
      admin_profiles: {
        Row: {
          id: string;
          department: string | null;
          title: string | null;
          is_available: boolean;
        };
        Insert: {
          id: string;
          department?: string | null;
          title?: string | null;
          is_available?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["admin_profiles"]["Insert"]>;
        Relationships: [];
      };
      request_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["request_categories"]["Insert"]>;
        Relationships: [];
      };
      requests: {
        Row: {
          id: string;
          code: string;
          customer_id: string;
          category_id: string | null;
          assigned_admin_id: string | null;
          title: string;
          description: string;
          status: RequestStatus;
          priority: RequestPriority;
          source: RequestSource;
          ai_summary: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          code?: string;
          customer_id: string;
          category_id?: string | null;
          assigned_admin_id?: string | null;
          title: string;
          description: string;
          status?: RequestStatus;
          priority?: RequestPriority;
          source?: RequestSource;
          ai_summary?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["requests"]["Insert"]>;
        Relationships: [];
      };
      request_status_history: {
        Row: {
          id: string;
          request_id: string;
          from_status: RequestStatus | null;
          to_status: RequestStatus;
          changed_by: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          from_status?: RequestStatus | null;
          to_status: RequestStatus;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["request_status_history"]["Insert"]>;
        Relationships: [];
      };
      request_messages: {
        Row: {
          id: string;
          request_id: string;
          sender_type: MessageSenderType;
          sender_id: string | null;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          sender_type: MessageSenderType;
          sender_id?: string | null;
          text: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["request_messages"]["Insert"]>;
        Relationships: [];
      };
      request_attachments: {
        Row: {
          id: string;
          request_id: string;
          message_id: string | null;
          uploaded_by: string | null;
          file_url: string;
          file_name: string;
          file_type: string | null;
          file_size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          message_id?: string | null;
          uploaded_by?: string | null;
          file_url: string;
          file_name: string;
          file_type?: string | null;
          file_size_bytes?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["request_attachments"]["Insert"]>;
        Relationships: [];
      };
      request_feedback: {
        Row: {
          request_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          request_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["request_feedback"]["Insert"]>;
        Relationships: [];
      };
      knowledge_documents: {
        Row: {
          id: string;
          name: string;
          file_type: KnowledgeFileType;
          source: string;
          status: KnowledgeStatus;
          storage_path: string | null;
          chunk_count: number;
          added_by: string | null;
          added_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          file_type: KnowledgeFileType;
          source: string;
          status?: KnowledgeStatus;
          storage_path?: string | null;
          chunk_count?: number;
          added_by?: string | null;
          added_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["knowledge_documents"]["Insert"]>;
        Relationships: [];
      };
      knowledge_chunks: {
        Row: {
          id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          location: string | null;
          embedding: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          chunk_index: number;
          content: string;
          location?: string | null;
          embedding?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["knowledge_chunks"]["Insert"]>;
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          customer_id: string | null;
          request_id: string | null;
          channel: RequestSource;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          request_id?: string | null;
          channel?: RequestSource;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ai_conversations"]["Insert"]>;
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: AiMessageRole;
          content: string;
          suggestions: Json;
          steps: Json;
          feedback: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: AiMessageRole;
          content: string;
          suggestions?: Json;
          steps?: Json;
          feedback?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_messages"]["Insert"]>;
        Relationships: [];
      };
      ai_message_sources: {
        Row: {
          id: string;
          message_id: string;
          knowledge_document_id: string | null;
          label: string;
          excerpt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          knowledge_document_id?: string | null;
          label: string;
          excerpt?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_message_sources"]["Insert"]>;
        Relationships: [];
      };
      agent_memory_records: {
        Row: {
          id: string;
          request_id: string | null;
          title: string;
          content: string;
          reason: string;
          access_scope: string;
          source: string;
          retention_days: number;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          title: string;
          content: string;
          reason: string;
          access_scope: string;
          source: string;
          retention_days?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_memory_records"]["Insert"]>;
        Relationships: [];
      };
      customer_memory_facts: {
        Row: {
          id: string;
          customer_id: string;
          label: string;
          detail: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          label: string;
          detail: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_memory_facts"]["Insert"]>;
        Relationships: [];
      };
      agent_tools: {
        Row: {
          id: string;
          name: string;
          purpose: string;
          input_schema: Json;
          output_schema: Json;
          permission: ToolPermission;
          approval_required: boolean;
          status: ToolStatus;
          failure_behavior: string;
          used_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          purpose: string;
          input_schema?: Json;
          output_schema?: Json;
          permission: ToolPermission;
          approval_required?: boolean;
          status?: ToolStatus;
          failure_behavior: string;
          used_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_tools"]["Insert"]>;
        Relationships: [];
      };
      agent_runs: {
        Row: {
          id: string;
          title: string;
          request_id: string | null;
          conversation_id: string | null;
          initiated_by: string | null;
          status: RunStatus;
          model: string;
          prompt_version: string;
          started_at: string;
          completed_at: string | null;
          latency_ms: number | null;
        };
        Insert: {
          id?: string;
          title: string;
          request_id?: string | null;
          conversation_id?: string | null;
          initiated_by?: string | null;
          status?: RunStatus;
          model: string;
          prompt_version: string;
          started_at?: string;
          completed_at?: string | null;
          latency_ms?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["agent_runs"]["Insert"]>;
        Relationships: [];
      };
      agent_steps: {
        Row: {
          id: string;
          run_id: string;
          step_key: string;
          sequence: number;
          label: string;
          status: StepStatus;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          step_key: string;
          sequence: number;
          label: string;
          status?: StepStatus;
          detail?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_steps"]["Insert"]>;
        Relationships: [];
      };
      tool_executions: {
        Row: {
          id: string;
          run_id: string;
          step_id: string | null;
          tool_id: string;
          input: Json;
          output: Json | null;
          status: "success" | "error";
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          step_id?: string | null;
          tool_id: string;
          input?: Json;
          output?: Json | null;
          status: "success" | "error";
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tool_executions"]["Insert"]>;
        Relationships: [];
      };
      agent_approvals: {
        Row: {
          id: string;
          run_id: string | null;
          step_id: string | null;
          request_id: string | null;
          action: string;
          description: string;
          risk: ApprovalRisk;
          amount: number | null;
          currency: string | null;
          status: ApprovalStatus;
          decided_by: string | null;
          decided_at: string | null;
          decision_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id?: string | null;
          step_id?: string | null;
          request_id?: string | null;
          action: string;
          description: string;
          risk?: ApprovalRisk;
          amount?: number | null;
          currency?: string | null;
          status?: ApprovalStatus;
          decided_by?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_approvals"]["Insert"]>;
        Relationships: [];
      };
      guardrail_rules: {
        Row: {
          capability: string;
          ai_allowed: boolean;
          human_approval: boolean;
          note: string | null;
        };
        Insert: {
          capability: string;
          ai_allowed: boolean;
          human_approval: boolean;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["guardrail_rules"]["Insert"]>;
        Relationships: [];
      };
      guardrail_events: {
        Row: {
          id: string;
          capability: string | null;
          run_id: string | null;
          outcome: GuardrailOutcome;
          detail: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          capability?: string | null;
          run_id?: string | null;
          outcome: GuardrailOutcome;
          detail?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["guardrail_events"]["Insert"]>;
        Relationships: [];
      };
      prompt_versions: {
        Row: {
          id: string;
          name: string;
          version: string;
          status: "active" | "deprecated";
          diff_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          version: string;
          status?: "active" | "deprecated";
          diff_note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["prompt_versions"]["Insert"]>;
        Relationships: [];
      };
      model_configs: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["model_configs"]["Insert"]>;
        Relationships: [];
      };
      evaluation_scenarios: {
        Row: {
          id: string;
          category: EvalCategory;
          scenario: string;
          expected_behavior: string | null;
        };
        Insert: {
          id: string;
          category: EvalCategory;
          scenario: string;
          expected_behavior?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["evaluation_scenarios"]["Insert"]>;
        Relationships: [];
      };
      evaluation_runs: {
        Row: {
          id: string;
          prompt_version_id: string | null;
          model: string;
          run_at: string;
          overall_score: number | null;
          dimension_scores: Json;
        };
        Insert: {
          id?: string;
          prompt_version_id?: string | null;
          model: string;
          run_at?: string;
          overall_score?: number | null;
          dimension_scores?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["evaluation_runs"]["Insert"]>;
        Relationships: [];
      };
      evaluation_results: {
        Row: {
          id: string;
          evaluation_run_id: string;
          scenario_id: string;
          result: EvalResult;
          latency_ms: number;
          actual_behavior_note: string | null;
        };
        Insert: {
          id?: string;
          evaluation_run_id: string;
          scenario_id: string;
          result: EvalResult;
          latency_ms: number;
          actual_behavior_note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["evaluation_results"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          customer_id: string;
          request_id: string | null;
          type: NotificationType;
          title: string;
          body: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          request_id?: string | null;
          type: NotificationType;
          title: string;
          body: string;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      help_articles: {
        Row: {
          id: string;
          slug: string;
          title: string;
          category: string;
          summary: string;
          body: Json;
          source: string;
          read_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          category: string;
          summary: string;
          body?: Json;
          source: string;
          read_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["help_articles"]["Insert"]>;
        Relationships: [];
      };
      integrations: {
        Row: {
          id: string;
          name: string;
          protocol: string;
          endpoint: string;
          status: string;
          exposed_tool_count: number;
          last_sync_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          protocol: string;
          endpoint: string;
          status?: string;
          exposed_tool_count?: number;
          last_sync_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["integrations"]["Insert"]>;
        Relationships: [];
      };
      admin_activity_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id?: string | null;
          detail?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_activity_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      trace_runs_view: {
        Row: {
          id: string | null;
          title: string | null;
          date: string | null;
          status: RunStatus | null;
          model: string | null;
          prompt_version: string | null;
          latency_ms: number | null;
          events: Json | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      profile_status: ProfileStatus;
      request_status: RequestStatus;
      request_priority: RequestPriority;
      request_source: RequestSource;
      message_sender_type: MessageSenderType;
      ai_message_role: AiMessageRole;
      notification_type: NotificationType;
      knowledge_file_type: KnowledgeFileType;
      knowledge_status: KnowledgeStatus;
      tool_permission: ToolPermission;
      tool_status: ToolStatus;
      run_status: RunStatus;
      step_status: StepStatus;
      approval_risk: ApprovalRisk;
      approval_status: ApprovalStatus;
      eval_category: EvalCategory;
      eval_result: EvalResult;
      guardrail_outcome: GuardrailOutcome;
    };
  };
}

// Convenience row aliases used throughout src/
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CustomerProfile = Database["public"]["Tables"]["customer_profiles"]["Row"];
export type AdminProfile = Database["public"]["Tables"]["admin_profiles"]["Row"];
export type RequestCategory = Database["public"]["Tables"]["request_categories"]["Row"];
export type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
export type RequestStatusHistoryRow = Database["public"]["Tables"]["request_status_history"]["Row"];
export type RequestMessageRow = Database["public"]["Tables"]["request_messages"]["Row"];
export type RequestAttachmentRow = Database["public"]["Tables"]["request_attachments"]["Row"];
export type RequestFeedbackRow = Database["public"]["Tables"]["request_feedback"]["Row"];
export type KnowledgeDocumentRow = Database["public"]["Tables"]["knowledge_documents"]["Row"];
export type KnowledgeChunkRow = Database["public"]["Tables"]["knowledge_chunks"]["Row"];
export type AiConversationRow = Database["public"]["Tables"]["ai_conversations"]["Row"];
export type AiMessageRow = Database["public"]["Tables"]["ai_messages"]["Row"];
export type AiMessageSourceRow = Database["public"]["Tables"]["ai_message_sources"]["Row"];
export type AgentMemoryRecordRow = Database["public"]["Tables"]["agent_memory_records"]["Row"];
export type CustomerMemoryFactRow = Database["public"]["Tables"]["customer_memory_facts"]["Row"];
export type AgentToolRow = Database["public"]["Tables"]["agent_tools"]["Row"];
export type AgentRunRow = Database["public"]["Tables"]["agent_runs"]["Row"];
export type AgentStepRow = Database["public"]["Tables"]["agent_steps"]["Row"];
export type ToolExecutionRow = Database["public"]["Tables"]["tool_executions"]["Row"];
export type AgentApprovalRow = Database["public"]["Tables"]["agent_approvals"]["Row"];
export type GuardrailRuleRow = Database["public"]["Tables"]["guardrail_rules"]["Row"];
export type GuardrailEventRow = Database["public"]["Tables"]["guardrail_events"]["Row"];
export type PromptVersionRow = Database["public"]["Tables"]["prompt_versions"]["Row"];
export type ModelConfigRow = Database["public"]["Tables"]["model_configs"]["Row"];
export type EvaluationScenarioRow = Database["public"]["Tables"]["evaluation_scenarios"]["Row"];
export type EvaluationRunRow = Database["public"]["Tables"]["evaluation_runs"]["Row"];
export type EvaluationResultRow = Database["public"]["Tables"]["evaluation_results"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type HelpArticleRow = Database["public"]["Tables"]["help_articles"]["Row"];
export type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];
export type AdminActivityLogRow = Database["public"]["Tables"]["admin_activity_logs"]["Row"];
export type TraceRunViewRow = Database["public"]["Views"]["trace_runs_view"]["Row"];

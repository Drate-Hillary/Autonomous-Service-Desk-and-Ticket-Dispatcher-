// Domain types for the Agent Operations Console: the pipeline the brief
// requires be traceable — model -> RAG -> tools -> bounded agent loop ->
// memory -> evaluation -> observability -> guardrails.

export type AgentStatus =
  | "ready"
  | "thinking"
  | "retrieving"
  | "using_tool"
  | "awaiting_approval"
  | "completed"
  | "failed"

export const runStepKeys = [
  "request",
  "context",
  "retrieval",
  "plan",
  "tool",
  "observation",
  "decision",
  "approval",
  "result",
] as const
export type RunStepKey = (typeof runStepKeys)[number]
export type RunStepStatus = "pending" | "active" | "done" | "blocked" | "failed"

export interface RetrievedSource {
  doc: string
  location: string
  grounded: boolean
}

export type RunStepDetail =
  | { type: "request"; text: string }
  | { type: "context"; note: string }
  | { type: "retrieval"; query: string; sources: RetrievedSource[]; relevance: number }
  | { type: "plan"; steps: string[] }
  | {
      type: "tool"
      name: string
      input: Record<string, string | number>
      output: Record<string, string | number | boolean>
      status: "success" | "error"
      durationMs: number
    }
  | { type: "observation"; note: string }
  | { type: "decision"; note: string }
  | {
      type: "approval"
      action: string
      risk: "low" | "medium" | "high"
      amount?: number
      currency?: string
      status: "pending" | "approved" | "rejected"
    }
  | { type: "result"; summary: string }

export interface RunStep {
  key: RunStepKey
  label: string
  status: RunStepStatus
  detail?: RunStepDetail
}

export interface AgentRun {
  id: string
  title: string
  startedAt: string
  steps: RunStep[]
}

export interface KnowledgeDocument {
  id: string
  name: string
  fileType: "PDF" | "DOCX" | "MD"
  chunks: number
  addedAt: string
  source: string
  status: "indexed" | "indexing" | "error"
}

export interface ToolField {
  name: string
  type: string
}

export interface ToolDefinition {
  id: string
  name: string
  purpose: string
  input: ToolField[]
  output: ToolField[]
  permission: "read" | "write"
  approvalRequired: boolean
  status: "active" | "disabled"
  failureBehavior: string
  usedBy: string
}

export interface MemoryRecord {
  id: string
  title: string
  content: string
  reason: string
  access: string
  createdAt: string
  retentionDays: number
  source: string
}

export type EvalCategory =
  | "normal"
  | "edge"
  | "incorrect_info"
  | "adversarial"
  | "tool_failure"
  | "unauthorized_action"

export interface EvalScenario {
  id: string
  category: EvalCategory
  scenario: string
  result: "passed" | "blocked" | "recovered" | "failed"
  latencyMs: number
}

export interface EvalDimension {
  label: string
  score: number
}

export interface TraceEvent {
  time: string
  label: string
  detail?: string
  kind: "request" | "retrieval" | "plan" | "tool" | "approval" | "error" | "result"
}

export interface TraceRun {
  id: string
  title: string
  date: string
  status: "completed" | "awaiting_approval" | "failed" | "recovered"
  model: string
  promptVersion: string
  latencyMs: number
  events: TraceEvent[]
}

export interface GuardrailRule {
  capability: string
  aiAllowed: boolean
  humanApproval: boolean
  note?: string
}

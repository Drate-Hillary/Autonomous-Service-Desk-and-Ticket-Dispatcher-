// Shared domain types for the customer chat surface and the admin
// approval dashboard.

export type ChatRole = "user" | "agent"

export interface Citation {
  id: number
  policyLabel: string
  excerpt: string
}

export interface ChatMessage {
  type: "message"
  id: string
  role: ChatRole
  content: string
  timestamp: string
  citations?: Citation[]
}

/** A transient, non-message event: the agent invoking a read-only tool. */
export interface ToolEvent {
  type: "tool"
  id: string
  label: string
  status: "running" | "done"
}

export type ChatStreamItem = ChatMessage | ToolEvent

export type TicketPriority = "high" | "medium" | "low"

export interface Ticket {
  id: string
  customerName: string
  subject: string
  priority: TicketPriority
  waitingSince: string
}

export interface TranscriptEntry {
  id: string
  role: ChatRole
  content: string
  timestamp: string
}

export interface PolicyEvidence {
  id: string
  source: string
  excerpt: string
}

export interface ProposedAction {
  type: string
  description: string
  amount?: number
}

export interface Escalation {
  ticketId: string
  aiSummary: string
  evidence: PolicyEvidence[]
  action: ProposedAction
  transcript: TranscriptEntry[]
}

export type EscalationDecision = "approved" | "rejected" | "editing"

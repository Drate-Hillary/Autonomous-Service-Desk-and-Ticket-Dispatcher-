import { create } from "zustand"
import { apiClient } from "@/backend/api/client"
import type { AgentStatus, RunStep } from "@/types/console"

interface WorkspaceMessage {
  id: string
  role: "user" | "agent"
  content: string
}

interface EscalationPayload {
  approvalId: string
  title: string
  description: string
  category: string
  priority: "low" | "normal" | "high"
  keyFacts: string | null
  suggestedAction: string | null
}

interface ChatMessageResponse {
  assistantMessage: { content: string }
  steps: string[]
  escalation: EscalationPayload | null
}

interface ConsoleState {
  status: AgentStatus
  run: RunStep[]
  messages: WorkspaceMessage[]
  selectedStepKey: string | null
  conversationId: string | null
  approvalId: string | null
  error: string | null
  runAgent: (request: string) => Promise<void>
  selectStep: (key: string | null) => void
  approve: () => Promise<void>
  reject: () => Promise<void>
}

let nextId = 1
let nextStepId = 1

/**
 * Drives the Agent Workspace against the real backend agent pipeline —
 * resolv-hq-backend's generateAssistantReply()/runReActLoop(), the exact
 * same code path the customer app's chat uses, calling whichever
 * agent_providers row is registered and active. There is no scripted
 * content here: `run` is built from the real ReAct trace the backend
 * returns, and an approval gate only appears when the model actually
 * called draft_escalation_ticket for this request.
 */
export const useConsoleStore = create<ConsoleState>((set, get) => ({
  status: "ready",
  run: [],
  messages: [],
  selectedStepKey: null,
  conversationId: null,
  approvalId: null,
  error: null,

  selectStep: (key) => set({ selectedStepKey: key }),

  runAgent: async (request) => {
    if (get().status === "thinking") return

    set({
      run: [],
      status: "thinking",
      selectedStepKey: null,
      approvalId: null,
      error: null,
      messages: [...get().messages, { id: `local-${nextId++}`, role: "user", content: request }],
    })

    try {
      let conversationId = get().conversationId
      if (!conversationId) {
        const { data: conversation } = await apiClient.post<{ id: string }>("/chat/conversations", {})
        conversationId = conversation.id
        set({ conversationId })
      }

      const { data } = await apiClient.post<ChatMessageResponse>(`/chat/conversations/${conversationId}/messages`, {
        content: request,
      })

      const steps: RunStep[] = data.steps.map((text) => ({
        key: `step-${nextStepId++}`,
        label: text,
        status: "done",
      }))

      if (data.escalation) {
        steps.push({
          key: "approval",
          label: "Approval required",
          status: "blocked",
          detail: { type: "approval", status: "pending", ...data.escalation },
        })
        set({ run: steps, status: "awaiting_approval", approvalId: data.escalation.approvalId })
      } else {
        steps.push({
          key: "result",
          label: "Final result",
          status: "done",
          detail: { type: "text", text: data.assistantMessage.content },
        })
        set({ run: steps, status: "completed" })
      }

      set((s) => ({
        messages: [...s.messages, { id: `local-${nextId++}`, role: "agent", content: data.assistantMessage.content }],
      }))
    } catch (err) {
      set((s) => ({
        status: "failed",
        error: err instanceof Error ? err.message : "The agent failed to respond",
        messages: [
          ...s.messages,
          {
            id: `local-${nextId++}`,
            role: "agent",
            content: "Something went wrong reaching the agent — check that a provider is registered and active, and that the backend is reachable.",
          },
        ],
      }))
    }
  },

  approve: async () => {
    const { approvalId, status } = get()
    if (status !== "awaiting_approval" || !approvalId) return
    try {
      await apiClient.patch(`/admin/approvals/${approvalId}/approve`)
      set((s) => ({
        status: "completed",
        run: s.run.map((step) =>
          step.detail?.type === "approval" ? { ...step, status: "done", detail: { ...step.detail, status: "approved" } } : step
        ),
        messages: [
          ...s.messages,
          { id: `local-${nextId++}`, role: "agent", content: "Approved — the escalation ticket has been filed for a human to handle." },
        ],
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to approve" })
    }
  },

  reject: async () => {
    const { approvalId, status } = get()
    if (status !== "awaiting_approval" || !approvalId) return
    try {
      await apiClient.patch(`/admin/approvals/${approvalId}/reject`)
      set((s) => ({
        status: "failed",
        run: s.run.map((step) =>
          step.detail?.type === "approval" ? { ...step, status: "failed", detail: { ...step.detail, status: "rejected" } } : step
        ),
        messages: [
          ...s.messages,
          { id: `local-${nextId++}`, role: "agent", content: "Rejected — no escalation ticket was filed." },
        ],
      }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to reject" })
    }
  },
}))

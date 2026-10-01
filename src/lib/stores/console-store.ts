import { create } from "zustand"
import { apiClient } from "@/backend/api/client"
import { buildRun, type ChatTurnResponse } from "@/backend/build-run"
import type { AgentStatus, RunStep, RunStepKey } from "@/types/console"

interface WorkspaceMessage {
  id: string
  role: "user" | "agent"
  content: string
}

interface ConsoleState {
  status: AgentStatus
  run: RunStep[]
  messages: WorkspaceMessage[]
  selectedStepKey: RunStepKey | null
  runId: string | null
  approvalId: string | null
  conversationId: string | null
  runAgent: (request: string) => Promise<void>
  selectStep: (key: RunStepKey | null) => void
  approve: () => Promise<void>
  reject: () => Promise<void>
}

let nextId = 1

const statusForStep: Partial<Record<RunStepKey, AgentStatus>> = {
  request: "thinking",
  context: "thinking",
  retrieval: "retrieving",
  plan: "thinking",
  tool: "using_tool",
  observation: "thinking",
  decision: "thinking",
  approval: "awaiting_approval",
}

/**
 * Runs one real assistant turn through the backend (POST
 * /chat/conversations/:id/messages — retrieval, the ReAct loop and any
 * escalation draft all happen server-side) and then plays the resulting
 * steps back one at a time. The escalation's agent_runs / agent_approvals
 * rows are created by the backend itself; approve()/reject() decide that
 * same approval row.
 */
export const useConsoleStore = create<ConsoleState>((set, get) => ({
  status: "ready",
  run: [],
  messages: [],
  selectedStepKey: null,
  runId: null,
  approvalId: null,
  conversationId: null,

  selectStep: (key) => set({ selectedStepKey: key }),

  runAgent: async (request) => {
    const busy: AgentStatus[] = ["thinking", "retrieving", "using_tool"]
    if (busy.includes(get().status)) return

    set({
      run: [],
      status: "thinking",
      selectedStepKey: null,
      runId: null,
      approvalId: null,
      messages: [...get().messages, { id: `local-${nextId++}`, role: "user", content: request }],
    })

    let turn: ChatTurnResponse
    try {
      let conversationId = get().conversationId
      if (!conversationId) {
        const { data } = await apiClient.post<{ id: string }>("/chat/conversations", { title: request.slice(0, 80) })
        conversationId = data.id
        set({ conversationId })
      }
      const { data } = await apiClient.post<ChatTurnResponse>(`/chat/conversations/${conversationId}/messages`, { content: request })
      turn = data
    } catch {
      set((s) => ({
        status: "failed",
        messages: [...s.messages, { id: `local-${nextId++}`, role: "agent", content: "The agent run failed — the backend request didn't complete. Please try again." }],
      }))
      return
    }

    const steps = buildRun(request, turn)
    set({ run: steps, runId: turn.escalation?.runId ?? null, approvalId: turn.escalation?.approvalId ?? null })

    for (const step of steps) {
      await wait(450)
      setStepStatus(set, step.key, "active")
      set({ status: statusForStep[step.key] ?? "thinking" })
      await wait(350)

      if (step.key === "approval") {
        setStepStatus(set, step.key, "blocked")
        set({ status: "awaiting_approval" })
        return
      }
      setStepStatus(set, step.key, "done")
    }

    set((s) => ({
      status: "completed",
      messages: [...s.messages, { id: `local-${nextId++}`, role: "agent", content: turn.assistantMessage.content }],
    }))
  },

  approve: async () => {
    const { approvalId } = get()
    if (get().status !== "awaiting_approval" || !approvalId) return
    try {
      await apiClient.patch(`/admin/approvals/${approvalId}/approve`)
    } catch {
      return
    }
    updateApproval(set, "approved")
    setStepStatus(set, "approval", "done")
    setStepStatus(set, "result", "active")
    await wait(400)
    const summary = `${approvalAction(get())} — approved and recorded.`
    updateResultSummary(set, summary)
    setStepStatus(set, "result", "done")
    set((s) => ({
      status: "completed",
      messages: [...s.messages, { id: `local-${nextId++}`, role: "agent", content: `Approved — "${approvalAction(get())}" has been recorded for staff follow-up.` }],
    }))
  },

  reject: async () => {
    const { approvalId } = get()
    if (get().status !== "awaiting_approval" || !approvalId) return
    try {
      await apiClient.patch(`/admin/approvals/${approvalId}/reject`)
    } catch {
      return
    }
    updateApproval(set, "rejected")
    setStepStatus(set, "approval", "failed")
    setStepStatus(set, "result", "active")
    await wait(400)
    updateResultSummary(set, `${approvalAction(get())} — rejected. No action was taken.`)
    setStepStatus(set, "result", "done")
    set((s) => ({
      status: "failed",
      messages: [...s.messages, { id: `local-${nextId++}`, role: "agent", content: "Rejected — the draft was discarded and no ticket was filed." }],
    }))
  },
}))

function setStepStatus(set: (fn: (s: ConsoleState) => Partial<ConsoleState>) => void, key: RunStepKey, status: RunStep["status"]) {
  set((s) => ({ run: s.run.map((step) => (step.key === key ? { ...step, status } : step)) }))
}

function approvalAction(state: ConsoleState): string {
  const step = state.run.find((s) => s.key === "approval")
  return step?.detail?.type === "approval" ? step.detail.action : "The requested action"
}

function updateApproval(set: (fn: (s: ConsoleState) => Partial<ConsoleState>) => void, status: "approved" | "rejected") {
  set((s) => ({
    run: s.run.map((step) =>
      step.key === "approval" && step.detail?.type === "approval"
        ? { ...step, detail: { ...step.detail, status } }
        : step
    ),
  }))
}

function updateResultSummary(set: (fn: (s: ConsoleState) => Partial<ConsoleState>) => void, summary: string) {
  set((s) => ({
    run: s.run.map((step) =>
      step.key === "result" && step.detail?.type === "result" ? { ...step, detail: { type: "result", summary } } : step
    ),
  }))
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

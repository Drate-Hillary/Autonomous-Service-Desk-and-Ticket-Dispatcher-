import { create } from "zustand"
import { buildDemoRun } from "@/lib/mock-console"
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
  runAgent: (request: string) => Promise<void>
  selectStep: (key: RunStepKey | null) => void
  approve: () => Promise<void>
  reject: () => Promise<void>
}

let nextId = 1

/** The workspace opens mid-run, already at the approval gate — so the
 * "wow" state (a traceable, mostly-complete pipeline paused for a
 * human) is visible on first load, not just after clicking Send. */
function seedRun(): RunStep[] {
  return buildDemoRun("Prepare a procurement request for 12 laptops for the CS lab").map((step) => {
    if (step.key === "approval") return { ...step, status: "blocked" }
    if (step.key === "result") return step
    return { ...step, status: "done" }
  })
}

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

export const useConsoleStore = create<ConsoleState>((set, get) => ({
  status: "awaiting_approval",
  run: seedRun(),
  messages: [
    { id: "seed-1", role: "user", content: "Prepare a procurement request for 12 laptops for the CS lab." },
  ],
  selectedStepKey: null,

  selectStep: (key) => set({ selectedStepKey: key }),

  // TODO: replace this scripted progression with a real streaming run —
  // e.g. subscribe to `POST /api/runs` over SSE and map each server
  // event onto the matching RunStep, using the same shape as
  // `buildDemoRun` produces. Everything downstream (the timeline, the
  // detail sheet, the approval gate) already reads from `run` alone.
  runAgent: async (request) => {
    const busy: AgentStatus[] = ["thinking", "retrieving", "using_tool"]
    if (busy.includes(get().status)) return

    const steps = buildDemoRun(request)
    set({
      run: steps,
      status: "thinking",
      selectedStepKey: null,
      messages: [...get().messages, { id: `local-${nextId++}`, role: "user", content: request }],
    })

    for (const step of steps) {
      await wait(650)
      setStepStatus(set, step.key, "active")
      set({ status: statusForStep[step.key] ?? "thinking" })
      await wait(550)

      if (step.key === "approval") {
        setStepStatus(set, step.key, "blocked")
        set({ status: "awaiting_approval" })
        return
      }
      setStepStatus(set, step.key, "done")
    }
  },

  approve: async () => {
    if (get().status !== "awaiting_approval") return
    updateApproval(set, "approved")
    set({ status: "using_tool" })
    await wait(700)
    setStepStatus(set, "approval", "done")
    setStepStatus(set, "result", "active")
    await wait(500)
    updateResultSummary(set, "Requisition approved and sent to the supplier. Manager sign-off recorded.")
    setStepStatus(set, "result", "done")
    set((s) => ({
      status: "completed",
      messages: [
        ...s.messages,
        { id: `local-${nextId++}`, role: "agent", content: "Approved — the requisition has been sent to Kampala Tech Supplies. I'll update the case memory." },
      ],
    }))
  },

  reject: async () => {
    if (get().status !== "awaiting_approval") return
    updateApproval(set, "rejected")
    setStepStatus(set, "approval", "failed")
    setStepStatus(set, "result", "active")
    await wait(500)
    updateResultSummary(set, "Requisition rejected by manager. Draft discarded, no purchase was made.")
    setStepStatus(set, "result", "done")
    set((s) => ({
      status: "failed",
      messages: [
        ...s.messages,
        { id: `local-${nextId++}`, role: "agent", content: "Understood — I've discarded the draft requisition and logged the rejection for next time." },
      ],
    }))
  },
}))

function setStepStatus(set: (fn: (s: ConsoleState) => Partial<ConsoleState>) => void, key: RunStepKey, status: RunStep["status"]) {
  set((s) => ({ run: s.run.map((step) => (step.key === key ? { ...step, status } : step)) }))
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

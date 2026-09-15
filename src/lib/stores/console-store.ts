import { create } from "zustand"
import { createClient } from "@/lib/client"
import { buildDemoRun } from "@/lib/mock-console"
import type { AgentStatus, RunStep, RunStepKey } from "@/types/console"
import type { Json } from "@/types/database.types"

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
  stepIdByKey: Record<string, string>
  approvalId: string | null
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

const MODEL = "resolv-agent-v3"
const PROMPT_VERSION = "procurement-planner@1.4.0"

/**
 * Drives the same scripted step-by-step reveal the demo always had (there's
 * no real LLM behind this yet), but every step of it now writes a real row:
 * agent_runs, agent_steps, tool_executions and — at the approval gate —
 * agent_approvals. approve()/reject() decide that same row instead of only
 * flipping local state, and are logged to admin_activity_logs.
 */
export const useConsoleStore = create<ConsoleState>((set, get) => ({
  status: "ready",
  run: [],
  messages: [],
  selectedStepKey: null,
  runId: null,
  stepIdByKey: {},
  approvalId: null,

  selectStep: (key) => set({ selectedStepKey: key }),

  runAgent: async (request) => {
    const busy: AgentStatus[] = ["thinking", "retrieving", "using_tool"]
    if (busy.includes(get().status)) return

    const supabase = createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const initiatedBy = userRes?.user?.id ?? null

    const steps = buildDemoRun(request)
    set({
      run: steps,
      status: "thinking",
      selectedStepKey: null,
      runId: null,
      stepIdByKey: {},
      approvalId: null,
      messages: [...get().messages, { id: `local-${nextId++}`, role: "user", content: request }],
    })

    const { data: runRow } = await supabase
      .from("agent_runs")
      .insert({
        title: request,
        initiated_by: initiatedBy,
        status: "in_progress",
        model: MODEL,
        prompt_version: PROMPT_VERSION,
      })
      .select("id")
      .single()
    const runId = runRow?.id ?? null
    set({ runId })

    const stepIdByKey: Record<string, string> = {}
    if (runId) {
      const { data: stepRows } = await supabase
        .from("agent_steps")
        .insert(
          steps.map((step, i) => ({
            run_id: runId,
            step_key: step.key,
            sequence: i,
            label: step.label,
            status: "pending" as const,
            detail: (step.detail ?? null) as unknown as Json,
          }))
        )
        .select("id, step_key")
      for (const row of stepRows ?? []) stepIdByKey[row.step_key] = row.id
      set({ stepIdByKey })
    }

    const toolIdByName: Record<string, string> = {}
    if (runId) {
      const { data: toolRows } = await supabase.from("agent_tools").select("id, name")
      for (const t of toolRows ?? []) toolIdByName[t.name] = t.id
    }

    for (const step of steps) {
      await wait(650)
      setStepStatus(set, step.key, "active")
      set({ status: statusForStep[step.key] ?? "thinking" })
      await wait(550)

      const stepId = get().stepIdByKey[step.key]

      if (step.key === "approval") {
        setStepStatus(set, step.key, "blocked")
        set({ status: "awaiting_approval" })

        if (stepId) await supabase.from("agent_steps").update({ status: "blocked" }).eq("id", stepId)

        if (runId && step.detail?.type === "approval") {
          const { data: approvalRow } = await supabase
            .from("agent_approvals")
            .insert({
              run_id: runId,
              step_id: stepId ?? null,
              action: step.detail.action,
              description: step.detail.action,
              risk: step.detail.risk,
              amount: step.detail.amount ?? null,
              currency: step.detail.currency ?? null,
              status: "pending",
            })
            .select("id")
            .single()
          set({ approvalId: approvalRow?.id ?? null })
          await supabase.from("agent_runs").update({ status: "awaiting_approval" }).eq("id", runId)
        }
        return
      }

      setStepStatus(set, step.key, "done")
      if (stepId) {
        await supabase
          .from("agent_steps")
          .update({ status: "done", detail: (step.detail ?? null) as unknown as Json })
          .eq("id", stepId)
      }

      if (step.key === "tool" && step.detail?.type === "tool" && runId) {
        const toolId = toolIdByName[step.detail.name]
        if (toolId) {
          await supabase.from("tool_executions").insert({
            run_id: runId,
            step_id: stepId ?? null,
            tool_id: toolId,
            input: step.detail.input as unknown as Json,
            output: step.detail.output as unknown as Json,
            status: step.detail.status,
            duration_ms: step.detail.durationMs,
          })
        }
      }
    }
  },

  approve: async () => {
    if (get().status !== "awaiting_approval") return
    updateApproval(set, "approved")
    set({ status: "using_tool" })

    const supabase = createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const adminId = userRes?.user?.id ?? null
    const { approvalId, runId, stepIdByKey } = get()

    if (approvalId) {
      await supabase
        .from("agent_approvals")
        .update({ status: "approved", decided_by: adminId, decided_at: new Date().toISOString() })
        .eq("id", approvalId)
      if (adminId) {
        await supabase.from("admin_activity_logs").insert({
          admin_id: adminId,
          action: "approval_decided",
          target_type: "agent_approval",
          target_id: approvalId,
          detail: { status: "approved", run_id: runId } as unknown as Json,
        })
      }
    }

    await wait(700)
    setStepStatus(set, "approval", "done")
    if (stepIdByKey.approval) await supabase.from("agent_steps").update({ status: "done" }).eq("id", stepIdByKey.approval)

    setStepStatus(set, "result", "active")
    await wait(500)
    const summary = "Requisition approved and sent to the supplier. Manager sign-off recorded."
    updateResultSummary(set, summary)
    setStepStatus(set, "result", "done")
    if (stepIdByKey.result) {
      await supabase
        .from("agent_steps")
        .update({ status: "done", detail: { type: "result", summary } as unknown as Json })
        .eq("id", stepIdByKey.result)
    }
    if (runId) {
      await supabase
        .from("agent_runs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", runId)
    }

    set((s) => ({
      status: "completed",
      messages: [
        ...s.messages,
        {
          id: `local-${nextId++}`,
          role: "agent",
          content: "Approved — the requisition has been sent to Kampala Tech Supplies. I'll update the case memory.",
        },
      ],
    }))
  },

  reject: async () => {
    if (get().status !== "awaiting_approval") return
    updateApproval(set, "rejected")

    const supabase = createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const adminId = userRes?.user?.id ?? null
    const { approvalId, runId, stepIdByKey } = get()

    if (approvalId) {
      await supabase
        .from("agent_approvals")
        .update({ status: "rejected", decided_by: adminId, decided_at: new Date().toISOString() })
        .eq("id", approvalId)
      if (adminId) {
        await supabase.from("admin_activity_logs").insert({
          admin_id: adminId,
          action: "approval_decided",
          target_type: "agent_approval",
          target_id: approvalId,
          detail: { status: "rejected", run_id: runId } as unknown as Json,
        })
      }
    }

    setStepStatus(set, "approval", "failed")
    if (stepIdByKey.approval) await supabase.from("agent_steps").update({ status: "failed" }).eq("id", stepIdByKey.approval)

    setStepStatus(set, "result", "active")
    await wait(500)
    const summary = "Requisition rejected by manager. Draft discarded, no purchase was made."
    updateResultSummary(set, summary)
    setStepStatus(set, "result", "done")
    if (stepIdByKey.result) {
      await supabase
        .from("agent_steps")
        .update({ status: "done", detail: { type: "result", summary } as unknown as Json })
        .eq("id", stepIdByKey.result)
    }
    if (runId) {
      await supabase.from("agent_runs").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", runId)
    }

    set((s) => ({
      status: "failed",
      messages: [
        ...s.messages,
        {
          id: `local-${nextId++}`,
          role: "agent",
          content: "Understood — I've discarded the draft requisition and logged the rejection for next time.",
        },
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

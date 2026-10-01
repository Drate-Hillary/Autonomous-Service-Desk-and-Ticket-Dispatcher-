import type { RunStep } from "@/types/console"

/** Shape of the backend's POST /chat/conversations/:id/messages response
 * that the agent workspace reads (see resolv-hq-backend/src/routes/chat.ts). */
export interface ChatTurnResponse {
  assistantMessage: { content: string }
  sources: { id: string; title: string; score?: number }[]
  trace: { phase: "plan" | "act" | "observe" | "respond"; detail: string }[]
  fallbackReason: string | null
  knowledgeCount: number
  openRequestCount: number
  escalation: {
    approvalId: string
    runId: string
    title: string
    priority: "low" | "normal" | "high"
  } | null
}

const RISK_BY_PRIORITY = { low: "low", normal: "medium", high: "high" } as const

function parseToolCall(detail: string): { name: string; input: Record<string, string | number> } {
  const open = detail.indexOf("(")
  if (open === -1 || !detail.endsWith(")")) return { name: detail.split(":")[0], input: {} }
  const name = detail.slice(0, open)
  try {
    const args = JSON.parse(detail.slice(open + 1, -1)) as Record<string, unknown>
    const input: Record<string, string | number> = {}
    for (const [k, v] of Object.entries(args)) input[k] = typeof v === "number" ? v : String(v)
    return { name, input }
  } catch {
    return { name, input: {} }
  }
}

/** Turns one real backend chat turn into the agent-workspace's step
 * timeline — every step is derived from what the backend actually did
 * (retrieved documents, ReAct trace, escalation draft). Steps the run
 * didn't perform (no tool call, no escalation) are simply absent. */
export function buildRun(request: string, turn: ChatTurnResponse): RunStep[] {
  const steps: RunStep[] = [
    { key: "request", label: "Request received", status: "pending", detail: { type: "request", text: request } },
    {
      key: "context",
      label: "Context assembled",
      status: "pending",
      detail: {
        type: "context",
        note: `Loaded ${turn.openRequestCount} open request${turn.openRequestCount === 1 ? "" : "s"} and ${turn.knowledgeCount} published knowledge document${turn.knowledgeCount === 1 ? "" : "s"} for this run.${turn.fallbackReason ? ` The model call failed (${turn.fallbackReason}), so this answer came from keyword search.` : ""}`,
      },
    },
  ]

  const queryWords = request.split(/\W+/).filter((w) => w.length > 2).length
  steps.push({
    key: "retrieval",
    label: "Knowledge retrieved",
    status: "pending",
    detail: {
      type: "retrieval",
      query: request,
      relevance: turn.sources.length && queryWords ? Math.min(100, Math.round(((turn.sources[0].score ?? 0) / queryWords) * 100)) : 0,
      sources: turn.sources.map((s) => ({ doc: s.title, location: "Knowledge base", grounded: true })),
    },
  })

  const planned = turn.trace.filter((t) => t.phase === "plan").map((t) => t.detail)
  if (planned.length) {
    steps.push({ key: "plan", label: "Plan created", status: "pending", detail: { type: "plan", steps: planned } })
  }

  const act = turn.trace.find((t) => t.phase === "act")
  if (act) {
    const { name, input } = parseToolCall(act.detail)
    const observed = turn.trace.find((t) => t.phase === "observe")
    const failed = act.detail.includes(": rejected")
    steps.push({
      key: "tool",
      label: "Tool executed",
      status: "pending",
      detail: { type: "tool", name, input, output: { result: observed?.detail ?? "" }, status: failed ? "error" : "success" },
    })
    if (observed) {
      steps.push({ key: "observation", label: "Result observed", status: "pending", detail: { type: "observation", note: observed.detail } })
    }
  }

  if (turn.escalation) {
    steps.push({
      key: "approval",
      label: "Approval required",
      status: "pending",
      detail: {
        type: "approval",
        action: `Create escalation ticket: "${turn.escalation.title}"`,
        risk: RISK_BY_PRIORITY[turn.escalation.priority],
        status: "pending",
      },
    })
  }

  steps.push({
    key: "result",
    label: "Final result",
    status: "pending",
    detail: { type: "result", summary: turn.escalation ? "Escalation ticket drafted and sent for approval. Awaiting staff decision." : turn.assistantMessage.content },
  })
  return steps
}

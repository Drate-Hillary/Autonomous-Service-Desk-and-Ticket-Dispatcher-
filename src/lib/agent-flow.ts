// The agent pipeline's stages and how a run moves between them. The stage
// graph mirrors resolv-hq-backend (lib/ai.ts generateAssistantReply ->
// lib/react-agent.ts runReActLoop -> lib/llm/gateway.ts); a run's path is
// derived from the real step labels the backend returned, not scripted.
import type { RunStep } from "@/types/console"

export type FlowNodeId = "intake" | "planner" | "tools" | "guard" | "approval" | "response"

export interface FlowNode {
  id: FlowNodeId
  title: string
  role: string
}

export const FLOW_NODES: Record<FlowNodeId, FlowNode> = {
  intake: {
    id: "intake",
    title: "Intake & clarification",
    role: "Reads the request and loads knowledge and open tickets. A vague request stops here with one clarifying question.",
  },
  planner: {
    id: "planner",
    title: "Planner",
    role: "The model (first active provider, falling back to the next on failure) decides: answer now, or call a tool.",
  },
  tools: {
    id: "tools",
    title: "Tool executor",
    role: "Runs the read-only tool the planner asked for and hands the result back. Up to 4 plan-act-observe cycles.",
  },
  guard: {
    id: "guard",
    title: "Boundary guard",
    role: "Checks the draft answer against the AI Boundary Matrix and replaces it if it claims an action the assistant can't take.",
  },
  approval: {
    id: "approval",
    title: "Human approval",
    role: "Only when the planner drafted an escalation ticket. Nothing is filed until staff approve.",
  },
  response: {
    id: "response",
    title: "Response",
    role: "The final message returned to the person who asked.",
  },
}

export interface Handoff {
  from: FlowNodeId
  to: FlowNodeId
  /** What triggered the shift, in the backend's own words where it has them. */
  reason: string
}

export interface DerivedFlow {
  path: FlowNodeId[]
  handoffs: Handoff[]
  visits: Partial<Record<FlowNodeId, number>>
  /** Number of times each from->to edge was taken, keyed `from>to`. */
  edges: Record<string, number>
  /** The stage a run is currently stuck on or failed at, if any. */
  blockedAt: FlowNodeId | null
}

interface Mapped {
  node: FlowNodeId
  reason: string
}

function mapStep(step: RunStep): Mapped | null {
  const label = step.label
  if (step.key === "approval") return { node: "approval", reason: "Planner drafted an escalation ticket" }
  if (step.key === "result") return { node: "response", reason: "Answer delivered" }
  if (label.startsWith("Understanding your request")) return { node: "intake", reason: "Request received" }
  if (label.startsWith("This needs a bit more detail")) return { node: "response", reason: "Needs clarification — asked a follow-up" }
  if (label.startsWith("Found a cached answer")) return { node: "planner", reason: "Cached answer reused" }
  if (label.startsWith("Calling ")) return { node: "planner", reason: label }
  if (label.startsWith("Planning:")) return { node: "planner", reason: label.replace(/^Planning:\s*/, "") }
  if (label.startsWith("Acting:")) return { node: "tools", reason: label.replace(/^Acting:\s*/, "") }
  if (label.startsWith("Observed:")) return { node: "tools", reason: label.replace(/^Observed:\s*/, "") }
  if (label.startsWith("Produced a final answer")) return { node: "planner", reason: "Tool results observed" }
  if (label.startsWith("Stopped after")) return { node: "planner", reason: label }
  if (label.startsWith("Blocked a boundary-matrix")) return { node: "guard", reason: label }
  return null
}

export function deriveFlow(run: RunStep[], failed: boolean): DerivedFlow {
  const path: FlowNodeId[] = []
  const handoffs: Handoff[] = []
  const lastReason: Partial<Record<FlowNodeId, string>> = {}

  const push = (node: FlowNodeId, reason: string) => {
    const prev = path[path.length - 1]
    if (prev === node) {
      lastReason[node] = reason
      return
    }
    if (prev) handoffs.push({ from: prev, to: node, reason })
    path.push(node)
    lastReason[node] = reason
  }

  for (const step of run) {
    const mapped = mapStep(step)
    if (!mapped) continue
    // The guard runs on every planner answer, even when it has nothing to
    // block and the backend emits no step for it.
    const prev = path[path.length - 1]
    const leavingPlanner = prev === "planner" && (mapped.node === "response" || mapped.node === "approval")
    if (leavingPlanner) push("guard", "Draft answer checked against the boundary matrix")
    push(mapped.node, mapped.reason)
  }

  const visits: Partial<Record<FlowNodeId, number>> = {}
  for (const n of path) visits[n] = (visits[n] ?? 0) + 1
  const edges: Record<string, number> = {}
  for (const h of handoffs) edges[`${h.from}>${h.to}`] = (edges[`${h.from}>${h.to}`] ?? 0) + 1

  const last = path[path.length - 1] ?? null
  const blockedAt = last && (failed || last === "approval") && last !== "response" ? last : null

  return { path, handoffs, visits, edges, blockedAt }
}

"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, Sankey } from "recharts"
import { apiClient } from "@/backend/api/client"

type Step = "sense" | "plan" | "act" | "observe" | "respond"
type Outcome = "answered" | "escalated" | "blocked" | "fallback" | "idle"

interface SankeyNode {
  name: string
  provider?: string
  /** ReAct step nodes carry which step they are. */
  step?: Step
  /** Decision/outcome nodes carry which decision they are. */
  outcome?: Outcome
  failure?: boolean
}
interface SankeyLink {
  source: number
  target: number
  value: number
  /** Provider whose tasks this flow carries; "fallback" = answered by keyword search. */
  provider: string
}
interface ProviderFlow {
  nodes: SankeyNode[]
  links: SankeyLink[]
  totalTasks: number
  switches: number
}

const POLL_MS = 5000

// Categorical, not themed: the console's chart tokens are grayscale, which
// can't tell things apart. Providers use blues/pinks, ReAct steps and decisions
// each get their own hues, so the three never read as the same thing.
const PALETTE = ["#2563eb", "#db2777", "#4f46e5", "#0369a1", "#be185d", "#1d4ed8"]
const NEUTRAL = "#737373"
const FAILED = "var(--destructive)"

const STEP_STYLE: Record<Step, { color: string; label: string }> = {
  sense: { color: "#14b8a6", label: "Sense" },
  plan: { color: "#06b6d4", label: "Plan" },
  act: { color: "#eab308", label: "Act" },
  observe: { color: "#a855f7", label: "Observe" },
  respond: { color: "#64748b", label: "Respond" },
}

const OUTCOME_STYLE: Record<Outcome, { color: string; label: string }> = {
  answered: { color: "#16a34a", label: "Answered" },
  escalated: { color: "#f97316", label: "Escalated for approval" },
  blocked: { color: "#be123c", label: "Blocked by boundary rule" },
  fallback: { color: FAILED, label: "Keyword fallback" },
  idle: { color: NEUTRAL, label: "No tasks yet" },
}

function providerColors(nodes: SankeyNode[]): Map<string, string> {
  const names = [...new Set(nodes.flatMap((n) => (n.provider ? [n.provider] : [])))].sort()
  return new Map(names.map((name, i) => [name, PALETTE[i % PALETTE.length]]))
}

/** Request → provider flows take the provider's colour; flows into a step take
 * that step's colour; flows into a decision take the decision's colour. */
function linkColor(colors: Map<string, string>, nodes: SankeyNode[], l: SankeyLink): string {
  const to = nodes[l.target]
  if (to.outcome) return OUTCOME_STYLE[to.outcome].color
  if (to.step) return STEP_STYLE[to.step].color
  if (l.provider === "fallback") return FAILED
  return colors.get(l.provider) ?? NEUTRAL
}

function nodeColor(colors: Map<string, string>, n: SankeyNode): string {
  if (n.outcome) return OUTCOME_STYLE[n.outcome].color
  if (n.step) return STEP_STYLE[n.step].color
  if (n.failure) return FAILED
  return (n.provider && colors.get(n.provider)) || NEUTRAL
}

export function ProviderSankey() {
  const [flow, setFlow] = useState<ProviderFlow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { data } = await apiClient.get<ProviderFlow>("/admin/agent-providers/flow")
        if (alive) {
          setFlow(data)
          setError(null)
        }
      } catch {
        if (alive) setError("Couldn't load agent flow — is the backend reachable?")
      }
    }
    void load()
    const t = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  // Every link is laid out and drawn at the same thickness; the real task
  // counts live in the node labels and tooltips.
  const layoutLinks = flow?.links.map((l) => ({ ...l, value: 1 })) ?? []
  const nodeTasks = new Map<number, number>()
  flow?.links.forEach((l) => nodeTasks.set(l.target, (nodeTasks.get(l.target) ?? 0) + l.value))
  const colors = flow ? providerColors(flow.nodes) : new Map<string, string>()

  return (
    <section className="p-4 glass-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium tracking-tight text-foreground">Agent provider flow</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The request splits into one node per registered agent provider.
            Each provider’s tasks then pass through the steps the agent took (Sense, Plan, Act, Observe, Respond) to the decision it reached. Providers, steps and decisions each have their own colours. Task counts are on each node and when hovering a link. Saved, so it survives restarts.
          </p>
        </div>
        {flow && (
          <p className="text-xs tabular text-muted-foreground">
            {flow.totalTasks} recent tasks · {flow.switches} failover{flow.switches === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {flow && flow.nodes.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {[...colors].map(([name, color]) => (
            <li key={name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {name}
            </li>
          ))}
          {[...new Set(flow.nodes.flatMap((n) => (n.step ? [n.step] : [])))].map((st) => (
            <li key={st} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rotate-45 rounded-[2px]" style={{ backgroundColor: STEP_STYLE[st].color }} />
              {STEP_STYLE[st].label}
            </li>
          ))}
          {[...new Set(flow.nodes.flatMap((n) => (n.outcome ? [n.outcome] : [])))].map((o) => (
            <li key={o} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: OUTCOME_STYLE[o].color }} />
              {OUTCOME_STYLE[o].label}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
      {!error && flow && flow.links.length === 0 && (
        <p className="py-10 text-xs text-center text-muted-foreground">
          No agent providers registered yet — add one under Providers.
        </p>
      )}
      {flow && flow.links.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <div className="w-full h-96 min-w-176">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={{ nodes: flow.nodes, links: layoutLinks }}
                nodePadding={36}
                nodeWidth={10}
                linkCurvature={0.5}
                iterations={64}
                margin={{ top: 38, right: 150, bottom: 8, left: 8 }}
                link={(p: {
                  sourceX: number
                  targetX: number
                  sourceY: number
                  targetY: number
                  sourceControlX: number
                  targetControlX: number
                  linkWidth: number
                  index: number
                }) => {
                  const l = flow.links[p.index]
                  return (
                    <path
                      d={`M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`}
                      fill="none"
                      stroke={linkColor(colors, flow.nodes, l)}
                      strokeOpacity={0.4}
                      strokeWidth={p.linkWidth}
                    >
                      <title>{`${flow.nodes[l.source].name} → ${flow.nodes[l.target].name} (${l.provider === "fallback" ? "keyword fallback" : l.provider}): ${l.value} task${l.value === 1 ? "" : "s"}`}</title>
                    </path>
                  )
                }}
                node={(p: { x: number; y: number; width: number; height: number; index: number; }) => {
                  const n = flow.nodes[p.index]
                  return (
                    <g>
                      <rect x={p.x} y={p.y} width={p.width} height={Math.max(p.height, 2)} rx={2} fill={nodeColor(colors, n)} />
                      <text x={p.x + p.width + 6} y={p.y + p.height / 2} dominantBaseline="middle" fontSize={11} fill="var(--foreground)">
                        {n.name}
                        {p.index !== 0 && <tspan fill="var(--muted-foreground)">{`  ${nodeTasks.get(p.index) ?? 0}`}</tspan>}
                      </text>
                    </g>
                  )
                }}
              />
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  )
}

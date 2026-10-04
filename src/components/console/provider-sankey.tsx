"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, Sankey } from "recharts"
import { apiClient } from "@/backend/api/client"

interface SankeyNode {
  name: string
  /** Index into COLUMNS: every node sits in a fixed stage column. */
  column: number
  provider?: string
  failure?: boolean
}
interface SankeyLink {
  source: number
  target: number
  value: number
  /** Model whose tasks this flow carries; "fallback" = answered by keyword search. */
  model: string
}
interface ProviderFlow {
  nodes: SankeyNode[]
  links: SankeyLink[]
  totalTasks: number
  switches: number
}

const COLUMNS = ["Request", "Model", "Routing", "Reasoning", "Tool", "Outcome"]
const POLL_MS = 5000

// Categorical, not themed: the console's chart tokens are grayscale, which
// can't tell models apart. Red stays reserved for failure.
const PALETTE = ["#2563eb", "#d97706", "#7c3aed", "#0d9488", "#db2777", "#65a30d"]
const NEUTRAL = "#737373"
const FAILED = "var(--destructive)"

function modelColors(nodes: SankeyNode[]): Map<string, string> {
  const names = [...new Set(nodes.flatMap((n) => (n.provider ? [n.provider] : [])))].sort()
  return new Map(names.map((name, i) => [name, PALETTE[i % PALETTE.length]]))
}

/** Flows keep their model's colour from request to outcome; shared stage nodes
 * stay neutral because several models pass through them. */
function linkColor(colors: Map<string, string>, l: SankeyLink): string {
  if (l.model === "fallback") return FAILED
  return colors.get(l.model) ?? NEUTRAL
}

function nodeColor(colors: Map<string, string>, n: SankeyNode): string {
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

  const colors = flow ? modelColors(flow.nodes) : new Map<string, string>()
  const hasFallback = flow?.links.some((l) => l.model === "fallback") ?? false
  const headersDrawn = new Set<number>()

  return (
    <section className="glass-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium tracking-tight text-foreground">How tasks flow through the agent</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Band width is the number of tasks. Each task goes from the request to the model that answered, through how it was
            routed and reasoned, to its outcome. A model keeps its colour all the way across; red marks work that fell back to
            keyword search. Saved, so it survives restarts.
          </p>
        </div>
        {flow && (
          <p className="tabular text-xs text-muted-foreground">
            {flow.totalTasks} recent tasks · {flow.switches} failover{flow.switches === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {flow && (colors.size > 0 || hasFallback) && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {[...colors].map(([name, color]) => (
            <li key={name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {name}
            </li>
          ))}
          {hasFallback && (
            <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: FAILED }} />
              Keyword fallback
            </li>
          )}
        </ul>
      )}

      {error && <p className="mt-4 text-xs text-destructive">{error}</p>}
      {!error && flow && flow.links.length === 0 && (
        <p className="py-10 text-center text-xs text-muted-foreground">
          No tasks recorded yet — send a task in Agent Workspace and its path will appear here.
        </p>
      )}
      {flow && flow.links.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <div className="h-96 w-full min-w-[44rem]">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={{ nodes: flow.nodes, links: flow.links }}
                nodePadding={24}
                nodeWidth={10}
                linkCurvature={0.5}
                iterations={64}
                margin={{ top: 28, right: 150, bottom: 8, left: 8 }}
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
                      stroke={linkColor(colors, l)}
                      strokeOpacity={0.4}
                      strokeWidth={Math.max(p.linkWidth, 2)}
                    >
                      <title>{`${flow.nodes[l.source].name} → ${flow.nodes[l.target].name} (${l.model === "fallback" ? "keyword fallback" : l.model}): ${l.value} task${l.value === 1 ? "" : "s"}`}</title>
                    </path>
                  )
                }}
                node={(p: { x: number; y: number; width: number; height: number; index: number; payload?: { value?: number } }) => {
                  const n = flow.nodes[p.index]
                  const showHeader = !headersDrawn.has(n.column)
                  headersDrawn.add(n.column)
                  return (
                    <g>
                      {showHeader && (
                        <text x={p.x} y={14} fontSize={10} fill="var(--muted-foreground)" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {COLUMNS[n.column]}
                        </text>
                      )}
                      <rect x={p.x} y={p.y} width={p.width} height={Math.max(p.height, 2)} rx={2} fill={nodeColor(colors, n)} />
                      <text x={p.x + p.width + 6} y={p.y + p.height / 2} dominantBaseline="middle" fontSize={11} fill="var(--foreground)">
                        {n.name}
                        {p.payload?.value != null && <tspan fill="var(--muted-foreground)">{`  ${p.payload.value}`}</tspan>}
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

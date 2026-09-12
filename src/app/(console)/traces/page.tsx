"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { cn } from "cn"
import { traceRuns } from "@/lib/mock-console"
import type { TraceEvent, TraceRun } from "@/types/console"
import { ChevronDownIcon } from "@hugeicons/core-free-icons"

const statusVariant: Record<TraceRun["status"], "approve" | "default" | "destructive"> = {
  completed: "approve",
  recovered: "default",
  awaiting_approval: "default",
  failed: "destructive",
}

const kindDot: Record<TraceEvent["kind"], string> = {
  request: "bg-muted-foreground",
  retrieval: "bg-primary",
  plan: "bg-primary",
  tool: "bg-primary",
  approval: "bg-primary",
  error: "bg-destructive",
  result: "bg-approve",
}

const kinds: TraceEvent["kind"][] = ["request", "retrieval", "plan", "tool", "approval", "error", "result"]

export default function TracesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(traceRuns[0]?.id ?? null)
  const [kindFilter, setKindFilter] = useState<TraceEvent["kind"] | "all">("all")

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Traces &amp; logs</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Exactly what happened on each run — model, retrieval, tool calls, latency and outcome.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setKindFilter("all")}
          className={cn(
            "rounded-full border px-2.5 py-1 text-sm font-medium capitalize transition-colors",
            kindFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All events
        </button>
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-sm font-medium capitalize transition-colors",
              kindFilter === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {traceRuns.map((run) => {
          const open = expandedId === run.id
          const events = kindFilter === "all" ? run.events : run.events.filter((e) => e.kind === kindFilter)
          return (
            <div key={run.id} className="glass-panel overflow-hidden">
              <button
                onClick={() => setExpandedId(open ? null : run.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="tabular text-sm text-muted-foreground">#{run.id}</span>
                    <p className="truncate text-xs font-medium text-foreground">{run.title}</p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{run.date}</span>
                    <span>·</span>
                    <span>{run.model}</span>
                    <span>·</span>
                    <span>{run.promptVersion}</span>
                    <span>·</span>
                    <span className="tabular">{(run.latencyMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={statusVariant[run.status]}>{run.status.replace("_", " ")}</Badge>
                  <Icon icon={ChevronDownIcon} size={19} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
                </div>
              </button>

              {open && (
                <div className="border-t border-border px-4 py-3">
                  <ol className="flex flex-col gap-2.5">
                    {events.map((event, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs">
                        <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", kindDot[event.kind])} />
                        <span className="tabular w-16 shrink-0 text-muted-foreground">{event.time}</span>
                        <div className="min-w-0">
                          <p className="text-foreground">{event.label}</p>
                          {event.detail && <p className="text-muted-foreground">{event.detail}</p>}
                        </div>
                      </li>
                    ))}
                    {events.length === 0 && <p className="text-xs text-muted-foreground">No events match this filter.</p>}
                  </ol>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

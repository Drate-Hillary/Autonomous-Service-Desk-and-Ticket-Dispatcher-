"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "cn"
import { evalDimensions, evalOverallScore, evalScenarios } from "@/lib/mock-console"
import type { EvalCategory } from "@/types/console"

const categoryLabel: Record<EvalCategory, string> = {
  normal: "Normal",
  edge: "Edge case",
  incorrect_info: "Incorrect info",
  adversarial: "Adversarial",
  tool_failure: "Tool failure",
  unauthorized_action: "Unauthorized action",
}

const resultLabel: Record<string, string> = {
  passed: "Passed",
  blocked: "Blocked",
  recovered: "Recovered",
  failed: "Failed",
}

const categories: (EvalCategory | "all")[] = [
  "all",
  "normal",
  "edge",
  "incorrect_info",
  "adversarial",
  "tool_failure",
  "unauthorized_action",
]

export default function EvaluationsPage() {
  const [filter, setFilter] = useState<EvalCategory | "all">("all")
  const filtered = filter === "all" ? evalScenarios : evalScenarios.filter((s) => s.category === filter)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Evaluations</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {evalScenarios.length} scenarios across normal, edge, incorrect-information, adversarial, tool-failure
          and unauthorized-action cases.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <div className="glass-panel flex flex-col items-center justify-center p-6 lg:w-48">
          <p className="tabular text-4xl font-semibold text-primary">{evalOverallScore}%</p>
          <p className="mt-1 text-sm text-muted-foreground">Overall score</p>
        </div>
        <div className="glass-panel flex flex-col justify-center gap-2.5 p-4">
          {evalDimensions.map((d) => (
            <div key={d.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="tabular font-medium text-foreground">{d.score}%</span>
              </div>
              <Progress value={d.score} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-sm font-medium transition-colors",
              filter === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {c === "all" ? "All" : categoryLabel[c]}
          </button>
        ))}
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full min-w-150 text-left text-xs">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Scenario</th>
              <th className="px-4 py-2.5 font-medium">Result</th>
              <th className="px-4 py-2.5 font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="tabular px-4 py-2.5 text-muted-foreground">{s.id}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{categoryLabel[s.category]}</td>
                <td className="px-4 py-2.5 text-foreground">{s.scenario}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={s.result === "failed" ? "destructive" : "approve"}>{resultLabel[s.result]}</Badge>
                </td>
                <td className="tabular px-4 py-2.5 text-muted-foreground">{(s.latencyMs / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

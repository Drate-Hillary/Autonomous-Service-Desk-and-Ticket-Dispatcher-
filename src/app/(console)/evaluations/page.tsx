import { createClient } from "@/lib/server"
import { EvaluationsView, type EvalRow } from "./evaluations-view"
import type { EvalDimension } from "@/types/console"

export default async function EvaluationsPage() {
  const supabase = await createClient()

  const [{ data: scenarios }, { data: runs }] = await Promise.all([
    supabase.from("evaluation_scenarios").select("*").order("id"),
    supabase.from("evaluation_runs").select("*").order("run_at", { ascending: false }).limit(1),
  ])

  const latestRun = runs?.[0] ?? null
  let results: { scenario_id: string; result: string; latency_ms: number }[] = []
  if (latestRun) {
    const { data } = await supabase
      .from("evaluation_results")
      .select("scenario_id, result, latency_ms")
      .eq("evaluation_run_id", latestRun.id)
    results = data ?? []
  }
  const resultByScenario = new Map(results.map((r) => [r.scenario_id, r]))

  const rows: EvalRow[] = (scenarios ?? []).map((s) => ({
    id: s.id,
    category: s.category,
    scenario: s.scenario,
    result: resultByScenario.get(s.id)?.result ?? null,
    latencyMs: resultByScenario.get(s.id)?.latency_ms ?? null,
  }))

  const overallScore = latestRun?.overall_score ?? null
  const dimensions = (latestRun?.dimension_scores as unknown as EvalDimension[] | null) ?? []

  return <EvaluationsView rows={rows} overallScore={overallScore} dimensions={dimensions} />
}

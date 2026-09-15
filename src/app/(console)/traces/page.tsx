import { createClient } from "@/lib/server"
import { TracesView } from "./traces-view"

export default async function TracesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("trace_runs_view").select("*").order("date", { ascending: false }).limit(30)

  return <TracesView runs={data ?? []} />
}

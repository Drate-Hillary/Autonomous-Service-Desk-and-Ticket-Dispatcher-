import { createClient } from "@/lib/server"
import { ToolsView } from "./tools-view"

export default async function ToolsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("agent_tools").select("*").order("name")

  return <ToolsView initialTools={data ?? []} />
}

import { createClient } from "@/lib/server"
import { MemoryView } from "./memory-view"

export default async function MemoryPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("agent_memory_records").select("*").order("created_at", { ascending: false })

  return <MemoryView initialRecords={data ?? []} />
}

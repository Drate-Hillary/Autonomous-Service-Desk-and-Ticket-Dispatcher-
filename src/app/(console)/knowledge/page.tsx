import { createClient } from "@/lib/server"
import { KnowledgeView } from "./knowledge-view"

export default async function KnowledgeBasePage() {
  const supabase = await createClient()
  const { data } = await supabase.from("knowledge_documents").select("*").order("added_at", { ascending: false })

  return <KnowledgeView initialDocuments={data ?? []} />
}

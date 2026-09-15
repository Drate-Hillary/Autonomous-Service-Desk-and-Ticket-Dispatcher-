import { createClient } from "@/lib/server"
import { HelpArticlesView } from "./help-articles-view"

export default async function HelpArticlesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("help_articles").select("*").order("category").order("title")

  return <HelpArticlesView initialArticles={data ?? []} />
}

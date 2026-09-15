import { Icon } from "@/components/ui/icon"
import { createClient } from "@/lib/server"
import { Activity03Icon } from "@hugeicons/core-free-icons"

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: logs } = await supabase
    .from("admin_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const adminIds = Array.from(new Set((logs ?? []).map((l) => l.admin_id)))
  let namesById = new Map<string, string>()
  if (adminIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", adminIds)
    namesById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Unnamed"]))
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Activity log</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every recorded admin action — approval decisions, ticket assignments and tool changes.
        </p>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full min-w-150 text-left text-xs">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Admin</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Target</th>
              <th className="px-4 py-2.5 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0">
                <td className="tabular px-4 py-2.5 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-foreground">{namesById.get(log.admin_id) ?? log.admin_id}</td>
                <td className="px-4 py-2.5 text-foreground">{log.action}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {log.target_type}
                  {log.target_id ? ` · ${log.target_id.slice(0, 8)}` : ""}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {log.detail ? JSON.stringify(log.detail) : "—"}
                </td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Icon icon={Activity03Icon} size={22} className="text-muted-foreground" />
                    No admin activity recorded yet.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

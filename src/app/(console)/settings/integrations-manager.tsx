"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/client"
import type { IntegrationRow } from "@/types/database.types"

export function IntegrationsManager({ initialIntegrations }: { initialIntegrations: IntegrationRow[] }) {
  const [integrations, setIntegrations] = useState(initialIntegrations)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [endpointDraft, setEndpointDraft] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  function startEdit(row: IntegrationRow) {
    setEditingId(row.id)
    setEndpointDraft(row.endpoint)
  }

  async function saveEndpoint(id: string) {
    setSavingId(id)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("integrations")
      .update({ endpoint: endpointDraft, last_sync_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single()
    setSavingId(null)
    if (!error && data) {
      setIntegrations((prev) => prev.map((r) => (r.id === id ? data : r)))
      setEditingId(null)
    }
  }

  async function toggleStatus(row: IntegrationRow) {
    setSavingId(row.id)
    const supabase = createClient()
    const nextStatus = row.status === "connected" ? "disconnected" : "connected"
    const { data, error } = await supabase
      .from("integrations")
      .update({ status: nextStatus, last_sync_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("*")
      .single()
    setSavingId(null)
    if (!error && data) setIntegrations((prev) => prev.map((r) => (r.id === row.id ? data : r)))
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {integrations.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          No integrations configured.
        </p>
      )}
      {integrations.map((row) => (
        <div key={row.id} className="rounded-md border border-border px-3 py-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">{row.name}</span>
            <div className="flex items-center gap-2">
              <Badge variant={row.status === "connected" ? "approve" : "secondary"}>{row.status}</Badge>
              <Button variant="outline" size="sm" disabled={savingId === row.id} onClick={() => toggleStatus(row)}>
                {row.status === "connected" ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Protocol</dt>
              <dd className="mt-0.5 text-foreground">{row.protocol}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Endpoint</dt>
              {editingId === row.id ? (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Input value={endpointDraft} onChange={(e) => setEndpointDraft(e.target.value)} className="h-6" />
                  <Button size="xs" disabled={savingId === row.id} onClick={() => saveEndpoint(row.id)}>
                    Save
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <dd
                  className="mt-0.5 cursor-pointer text-foreground hover:underline"
                  onClick={() => startEdit(row)}
                  title="Click to edit"
                >
                  {row.endpoint}
                </dd>
              )}
            </div>
            <div>
              <dt className="text-muted-foreground">Exposed tools</dt>
              <dd className="tabular mt-0.5 text-foreground">{row.exposed_tool_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last sync</dt>
              <dd className="mt-0.5 text-foreground">
                {row.last_sync_at ? new Date(row.last_sync_at).toLocaleString() : "Never"}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  )
}

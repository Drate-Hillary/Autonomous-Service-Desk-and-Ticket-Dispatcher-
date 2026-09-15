"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { createClient } from "@/lib/client"
import { Icon } from "@/components/ui/icon"
import { File02Icon, Upload01Icon } from "@hugeicons/core-free-icons"
import type { RequestAttachmentRow } from "@/types/database.types"

/**
 * Backed by Supabase Storage — assumes a bucket named "request-attachments"
 * exists (create it in the Supabase dashboard; public or signed-URL access
 * both work, this reads back whatever `getPublicUrl` returns).
 */
const BUCKET = "request-attachments"

function formatSize(bytes: number | null) {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round(bytes / 1024)} KB`
}

export function AttachmentsPanel({ requestId }: { requestId: string | null }) {
  const [attachments, setAttachments] = useState<RequestAttachmentRow[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!requestId) return
    let active = true
    const supabase = createClient()
    supabase
      .from("request_attachments")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return
        setAttachments(data ?? [])
        setLoadedFor(requestId)
      })
    return () => {
      active = false
    }
  }, [requestId])

  const visibleAttachments = loadedFor === requestId ? attachments : []

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !requestId) return

    setUploading(true)
    setError(null)
    const supabase = createClient()
    const path = `${requestId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const { data: userRes } = await supabase.auth.getUser()
    const { data: row, error: insertError } = await supabase
      .from("request_attachments")
      .insert({
        request_id: requestId,
        uploaded_by: userRes?.user?.id ?? null,
        file_url: pub.publicUrl,
        file_name: file.name,
        file_type: file.type || null,
        file_size_bytes: file.size,
      })
      .select("*")
      .single()

    if (insertError) setError(insertError.message)
    if (row) {
      setAttachments((prev) => [row, ...prev])
      setLoadedFor(requestId)
    }
    setUploading(false)
  }

  if (!requestId) return null

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Attachments</p>
        <label className="cursor-pointer">
          <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted">
            <Icon icon={Upload01Icon} size={14} />
            {uploading ? "Uploading…" : "Upload"}
          </span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      <div className="mt-1.5 flex flex-col gap-1.5">
        {visibleAttachments.length === 0 && <p className="text-xs text-muted-foreground">No attachments.</p>}
        {visibleAttachments.map((a) => (
          <a
            key={a.id}
            href={a.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm hover:bg-muted/50"
          >
            <Icon icon={File02Icon} size={16} className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-foreground">{a.file_name}</span>
            {formatSize(a.file_size_bytes) && (
              <span className="shrink-0 text-xs text-muted-foreground">{formatSize(a.file_size_bytes)}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}

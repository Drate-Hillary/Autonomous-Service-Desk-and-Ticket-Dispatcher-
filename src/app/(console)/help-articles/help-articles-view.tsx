"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Icon } from "@/components/ui/icon"
import { createClient } from "@/lib/client"
import type { HelpArticleRow } from "@/types/database.types"
import { File02Icon } from "@hugeicons/core-free-icons"

interface Draft {
  id: string | null
  slug: string
  title: string
  category: string
  summary: string
  body: string
  source: string
  read_minutes: string
}

const emptyDraft: Draft = {
  id: null,
  slug: "",
  title: "",
  category: "",
  summary: "",
  body: "",
  source: "",
  read_minutes: "3",
}

function toDraft(row: HelpArticleRow): Draft {
  const paragraphs = Array.isArray(row.body) ? (row.body as unknown[]).map(String) : []
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    body: paragraphs.join("\n\n"),
    source: row.source,
    read_minutes: String(row.read_minutes),
  }
}

export function HelpArticlesView({ initialArticles }: { initialArticles: HelpArticleRow[] }) {
  const [articles, setArticles] = useState(initialArticles)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setDraft(emptyDraft)
    setError(null)
    setOpen(true)
  }

  function openEdit(row: HelpArticleRow) {
    setDraft(toDraft(row))
    setError(null)
    setOpen(true)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const body = draft.body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
    const payload = {
      slug: draft.slug.trim(),
      title: draft.title.trim(),
      category: draft.category.trim(),
      summary: draft.summary.trim(),
      body,
      source: draft.source.trim() || "Admin console",
      read_minutes: Number(draft.read_minutes) || 1,
    }

    const result = draft.id
      ? await supabase.from("help_articles").update(payload).eq("id", draft.id).select("*").single()
      : await supabase.from("help_articles").insert(payload).select("*").single()

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    const row = result.data
    setArticles((prev) => {
      const exists = prev.some((a) => a.id === row.id)
      return exists ? prev.map((a) => (a.id === row.id ? row : a)) : [row, ...prev]
    })
    setOpen(false)
  }

  async function remove(id: string) {
    setArticles((prev) => prev.filter((a) => a.id !== id))
    const supabase = createClient()
    await supabase.from("help_articles").delete().eq("id", id)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Help articles</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Content the customer app&rsquo;s Help Center reads directly from the database.
          </p>
        </div>
        <Button size="lg" onClick={openCreate}>
          New article
        </Button>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full min-w-150 text-left text-xs">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Title</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Read time</th>
              <th className="px-4 py-2.5 font-medium">Updated</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td
                  className="flex cursor-pointer items-center gap-2 px-4 py-2.5 font-medium text-foreground"
                  onClick={() => openEdit(a)}
                >
                  <Icon icon={File02Icon} size={18} className="text-muted-foreground" />
                  {a.title}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary">{a.category}</Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{a.source}</td>
                <td className="tabular px-4 py-2.5 text-muted-foreground">{a.read_minutes} min</td>
                <td className="px-4 py-2.5 text-muted-foreground">{new Date(a.updated_at).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No help articles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(32rem,calc(100vw-2rem))]">
          <DialogTitle>{draft.id ? "Edit article" : "New article"}</DialogTitle>
          <DialogDescription>Shown on the customer app&rsquo;s Help Center.</DialogDescription>

          <div className="mt-4 flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1 text-xs">
            <Field label="Title">
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </Field>
            <Field label="Slug">
              <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="e.g. refunds-101" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              </Field>
              <Field label="Read minutes">
                <Input
                  type="number"
                  min={1}
                  value={draft.read_minutes}
                  onChange={(e) => setDraft({ ...draft, read_minutes: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Summary">
              <Textarea rows={2} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </Field>
            <Field label="Body (separate paragraphs with a blank line)">
              <Textarea rows={8} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            </Field>
            <Field label="Source">
              <Input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="Admin console" />
            </Field>
          </div>

          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="lg" />}>Cancel</DialogClose>
            <Button size="lg" disabled={saving || !draft.title || !draft.slug} onClick={save}>
              {saving ? "Saving…" : "Save article"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

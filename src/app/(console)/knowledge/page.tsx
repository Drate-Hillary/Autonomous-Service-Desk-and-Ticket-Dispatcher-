"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { knowledgeDocuments as seedDocuments } from "@/lib/mock-console"
import type { KnowledgeDocument } from "@/types/console"
import {
  Search01Icon,
  Upload01Icon,
  CheckmarkCircle02Icon,
  File02Icon,
} from "@hugeicons/core-free-icons"

const statusVariant: Record<KnowledgeDocument["status"], "approve" | "default" | "destructive"> = {
  indexed: "approve",
  indexing: "default",
  error: "destructive",
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState(seedDocuments)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<KnowledgeDocument | null>(null)

  const filtered = documents.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))

  const uploadDocument = () => {
    const id = `d${documents.length + 1}-${Date.now()}`
    const doc: KnowledgeDocument = {
      id,
      name: "Untitled upload.pdf",
      fileType: "PDF",
      chunks: 0,
      addedAt: "Just now",
      source: "Manual upload",
      status: "indexing",
    }
    setDocuments((prev) => [doc, ...prev])
    // TODO: replace with `await apiClient.post('/knowledge/documents', formData)`
    // and stream real indexing progress back.
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "indexed", chunks: 14 } : d))
      )
    }, 1800)
  }

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Knowledge base</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The controlled corpus the agent retrieves from — every answer traces back to a source here.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-64">
          <Icon icon={Search01Icon} size={19} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="h-8 w-full rounded-md border border-border bg-transparent pl-8 pr-2.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <Button size="lg" onClick={uploadDocument}>
          <Icon icon={Upload01Icon} data-icon="inline-start" />
          Upload document
        </Button>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full min-w-150 text-left text-xs">
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Chunks</th>
              <th className="px-4 py-2.5 font-medium">Added</th>
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => setSelected(doc)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
              >
                <td className="flex items-center gap-2 px-4 py-2.5 font-medium text-foreground">
                  <Icon icon={File02Icon} size={19} className="text-muted-foreground" />
                  {doc.name}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{doc.fileType}</td>
                <td className="tabular px-4 py-2.5 text-muted-foreground">{doc.chunks}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{doc.addedAt}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{doc.source}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-panel p-4">
        <h3 className="text-xs font-medium text-muted-foreground">Example grounded answer</h3>
        <p className="mt-2 text-xs/relaxed text-foreground">
          &ldquo;Based on the Procurement Policy, requisitions over 25 USD equivalent require manager
          approval, and any purchase must compare at least two supplier quotations before submission.&rdquo;
        </p>
        <div className="mt-3">
          <p className="mb-1.5 text-sm font-medium text-muted-foreground">Sources</p>
          <div className="flex flex-col gap-1.5">
            {[
              { doc: "Procurement Policy", loc: "Page 12 · §4.2 Approval thresholds" },
              { doc: "Quotation Evaluation Criteria", loc: "Page 3 · §1.0 Minimum quotations" },
            ].map((s) => (
              <div key={s.doc} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm">
                <Icon icon={CheckmarkCircle02Icon} size={18} className="shrink-0 text-approve" />
                <span className="font-medium text-foreground">{s.doc}</span>
                <span className="text-muted-foreground">{s.loc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.fileType} · {selected.chunks} chunks
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-6 pb-6 text-sm">
                <DetailRow label="Source / provenance" value={selected.source} />
                <DetailRow label="Date added" value={selected.addedAt} />
                <DetailRow label="Indexing status" value={selected.status} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground capitalize">{value}</span>
    </div>
  )
}

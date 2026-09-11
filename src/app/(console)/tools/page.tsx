"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { tools } from "@/lib/mock-console"
import type { ToolDefinition } from "@/types/console"
import { Wrench01Icon } from "@hugeicons/core-free-icons"

export default function ToolsPage() {
  const [selected, setSelected] = useState<ToolDefinition | null>(null)

  return (
    <div className="mx-auto flex max-w-320 flex-col gap-5 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Tools</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The approved functions the agent may call — every action outside this list is unavailable to it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <div key={tool.id} className="glass-panel flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon icon={Wrench01Icon} size={20} />
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className={`size-1.5 rounded-full ${tool.status === "active" ? "bg-approve" : "bg-muted-foreground"}`} />
                {tool.status}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-medium text-foreground">{tool.name}</h3>
            <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{tool.purpose}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant={tool.permission === "write" ? "priority-medium" : "secondary"}>
                {tool.permission}
              </Badge>
              {tool.approvalRequired && <Badge variant="default">approval required</Badge>}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setSelected(tool)}>
              View schema
            </Button>
          </div>
        ))}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>{selected.purpose}</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 px-6 pb-6 text-sm">
                <SchemaBlock label="Input" fields={selected.input} />
                <SchemaBlock label="Output" fields={selected.output} />
                <DetailRow label="Permission" value={selected.permission} />
                <DetailRow label="Approval required" value={selected.approvalRequired ? "Yes" : "No"} />
                <DetailRow label="Failure behaviour" value={selected.failureBehavior} />
                <DetailRow label="Used by" value={selected.usedBy} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SchemaBlock({ label, fields }: { label: string; fields: { name: string; type: string }[] }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-sm">
        {fields.map((f) => (
          <div key={f.name} className="flex justify-between gap-3">
            <span className="text-foreground">{f.name}</span>
            <span className="text-muted-foreground">{f.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border pb-2.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  )
}

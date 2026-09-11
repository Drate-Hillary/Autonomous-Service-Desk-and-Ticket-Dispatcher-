"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { useConsoleStore } from "@/lib/stores/console-store"
import { CheckmarkCircle02Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

const currency = new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 })

export function RunStepDetailSheet() {
  const run = useConsoleStore((s) => s.run)
  const selectedStepKey = useConsoleStore((s) => s.selectedStepKey)
  const selectStep = useConsoleStore((s) => s.selectStep)
  const approve = useConsoleStore((s) => s.approve)
  const reject = useConsoleStore((s) => s.reject)
  const step = run.find((s) => s.key === selectedStepKey)

  return (
    <Sheet open={Boolean(step)} onOpenChange={(open) => !open && selectStep(null)}>
      <SheetContent>
        {step && (
          <>
            <SheetHeader>
              <SheetTitle>{step.label}</SheetTitle>
              <SheetDescription>
                Step {run.findIndex((s) => s.key === step.key) + 1} of {run.length} in this agent run.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6 text-sm">
              {step.detail?.type === "request" && <p className="text-foreground/90">&ldquo;{step.detail.text}&rdquo;</p>}

              {step.detail?.type === "context" && <p className="text-foreground/90">{step.detail.note}</p>}

              {step.detail?.type === "retrieval" && (
                <>
                  <Field label="Query" value={step.detail.query} />
                  <Field label="Relevance" value={`${step.detail.relevance}%`} />
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">Grounded sources</p>
                    <ul className="flex flex-col gap-1.5">
                      {step.detail.sources.map((source) => (
                        <li key={source.doc} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2">
                          <Icon icon={CheckmarkCircle02Icon} size={19} className="shrink-0 text-approve" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{source.doc}</p>
                            <p className="truncate text-muted-foreground">{source.location}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {step.detail?.type === "plan" && (
                <ol className="flex flex-col gap-1.5">
                  {step.detail.steps.map((s, i) => (
                    <li key={s} className="flex gap-2 rounded-md border border-border px-2.5 py-2">
                      <span className="tabular text-muted-foreground">{i + 1}.</span>
                      <span className="text-foreground">{s}</span>
                    </li>
                  ))}
                </ol>
              )}

              {step.detail?.type === "tool" && (
                <>
                  <Field label="Tool" value={step.detail.name} />
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">Input</p>
                    <KeyValueBlock data={step.detail.input} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">Output</p>
                    <KeyValueBlock data={step.detail.output} />
                  </div>
                  <div className="flex gap-4">
                    <Field
                      label="Status"
                      value={step.detail.status === "success" ? "Successful" : "Error"}
                    />
                    <Field label="Duration" value={`${step.detail.durationMs}ms`} />
                  </div>
                </>
              )}

              {(step.detail?.type === "observation" || step.detail?.type === "decision") && (
                <p className="text-foreground/90">{step.detail.note}</p>
              )}

              {step.detail?.type === "approval" && (
                <>
                  <Field label="Action" value={step.detail.action} />
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Risk</p>
                      <Badge
                        className="mt-1"
                        variant={step.detail.risk === "high" ? "destructive" : step.detail.risk === "medium" ? "default" : "secondary"}
                      >
                        {step.detail.risk}
                      </Badge>
                    </div>
                    {step.detail.amount != null && (
                      <Field label="Amount" value={currency.format(step.detail.amount)} />
                    )}
                  </div>
                  {step.detail.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <Button className="flex-1" onClick={() => void approve()}>
                        Approve
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => void reject()}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={
                        step.detail.status === "approved"
                          ? "flex items-center gap-1.5 text-approve"
                          : "flex items-center gap-1.5 text-destructive"
                      }
                    >
                      <Icon icon={step.detail.status === "approved" ? CheckmarkCircle02Icon : Cancel01Icon} size={19} />
                      {step.detail.status === "approved" ? "Approved by manager" : "Rejected by manager"}
                    </div>
                  )}
                </>
              )}

              {step.detail?.type === "result" && <p className="text-foreground/90">{step.detail.summary}</p>}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  )
}

function KeyValueBlock({ data }: { data: Record<string, string | number | boolean> }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-sm">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{key}</span>
          <span className="tabular text-foreground">{String(value)}</span>
        </div>
      ))}
    </div>
  )
}

"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AttachmentsPanel } from "@/components/admin/attachments-panel"
import { useAdminStore } from "@/lib/stores/admin-store"
import { cn } from "cn"

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export function ActionPanel() {
  const selectedApprovalId = useAdminStore((s) => s.selectedApprovalId)
  const escalation = useAdminStore((s) => s.escalationsById[s.selectedApprovalId])
  const requestId = useAdminStore((s) => s.tickets.find((t) => t.approvalId === s.selectedApprovalId)?.requestId ?? null)
  const isSubmitting = useAdminStore((s) => s.isSubmitting)
  const approve = useAdminStore((s) => s.approve)
  const reject = useAdminStore((s) => s.reject)

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(escalation?.aiSummary ?? "")
  // Reset local edit state whenever the selected ticket changes, without an
  // effect: https://react.dev/learn/you-might-not-need-an-effect
  const [draftId, setDraftId] = useState(selectedApprovalId)
  if (draftId !== selectedApprovalId) {
    setDraftId(selectedApprovalId)
    setDraft(escalation?.aiSummary ?? "")
    setIsEditing(false)
  }

  if (!escalation) return null
  const isResolved = escalation.status === "approved" || escalation.status === "rejected"

  return (
    <section className="flex min-h-0 flex-col lg:h-full">
      <div className="flex h-10 shrink-0 items-center border-b border-border px-5">
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground">
          AI draft &amp; evidence
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedApprovalId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-5"
          >
            <div>
              <p className="text-sm font-medium text-muted-foreground">AI summary</p>
              {isEditing ? (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="mt-1.5"
                  rows={4}
                />
              ) : (
                <p className="mt-1.5 text-xs/relaxed text-foreground">{draft || escalation.aiSummary}</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Policy evidence</p>
              <div className="mt-1.5 flex flex-col gap-2">
                {escalation.evidence.length === 0 && (
                  <p className="text-xs text-muted-foreground">No linked evidence for this action.</p>
                )}
                {escalation.evidence.map((e) => (
                  <div key={e.id} className="rounded-md border border-border px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{e.source}</p>
                    <p className="mt-0.5 text-xs/relaxed text-muted-foreground">
                      &ldquo;{e.excerpt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Proposed action</p>
              <div className="mt-1.5 rounded-md bg-accent px-3 py-2.5 text-accent-foreground">
                <p className="text-xs font-medium">{escalation.action.description}</p>
                {escalation.action.amount != null && (
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {escalation.action.currency && escalation.action.currency !== "USD"
                      ? `${escalation.action.amount.toLocaleString()} ${escalation.action.currency}`
                      : currency.format(escalation.action.amount)}
                  </p>
                )}
              </div>
            </div>

            {escalation.feedback && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer feedback (CSAT)</p>
                <div className="mt-1.5 rounded-md border border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{escalation.feedback.rating} / 5</p>
                  {escalation.feedback.comment && (
                    <p className="mt-0.5 text-xs/relaxed text-muted-foreground">{escalation.feedback.comment}</p>
                  )}
                </div>
              </div>
            )}

            {escalation.decisionNote && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Decision note</p>
                <p className="mt-1.5 text-xs/relaxed text-foreground">{escalation.decisionNote}</p>
              </div>
            )}

            <AttachmentsPanel requestId={requestId} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-border px-5 py-3">
        {isResolved ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
              escalation.status === "approved" ? "bg-approve/10 text-approve" : "bg-destructive/10 text-destructive"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                escalation.status === "approved" ? "bg-approve" : "bg-destructive"
              )}
            />
            {escalation.status === "approved" ? "Action approved" : "Action rejected"}
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1 bg-approve text-approve-foreground hover:bg-approve/85"
              size="lg"
              disabled={isSubmitting}
              onClick={() => approve(selectedApprovalId, isEditing ? draft : undefined)}
            >
              {isSubmitting ? "Approving…" : "Approve action"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={isSubmitting}
              onClick={() => setIsEditing((v) => !v)}
            >
              {isEditing ? "Cancel edit" : "Edit draft"}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              disabled={isSubmitting}
              onClick={() => reject(selectedApprovalId, isEditing ? draft : undefined)}
            >
              {isSubmitting ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

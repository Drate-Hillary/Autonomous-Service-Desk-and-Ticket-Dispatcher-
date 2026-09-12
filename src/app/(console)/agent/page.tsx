"use client"

import { WorkspaceChat } from "@/components/console/workspace-chat"
import { RunTimeline } from "@/components/console/run-timeline"
import { RunStepDetailSheet } from "@/components/console/run-step-detail-sheet"
import { ApprovalCard } from "@/components/console/approval-card"

export default function AgentWorkspacePage() {
  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col lg:grid lg:grid-cols-2 lg:divide-x lg:divide-border">
      <section className="flex min-h-100 flex-col border-b border-border lg:min-h-0 lg:border-b-0">
        <div className="flex h-10 shrink-0 items-center border-b border-border px-4">
          <h2 className="text-sm font-medium tracking-tight text-muted-foreground">Task</h2>
        </div>
        <div className="min-h-0 flex-1">
          <WorkspaceChat />
        </div>
      </section>

      <section className="flex min-h-0 flex-col">
        <div className="flex h-10 shrink-0 items-center border-b border-border px-4">
          <h2 className="text-sm font-medium tracking-tight text-muted-foreground">Agent activity</h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <RunTimeline />
          <ApprovalCard />
        </div>
      </section>

      <RunStepDetailSheet />
    </div>
  )
}

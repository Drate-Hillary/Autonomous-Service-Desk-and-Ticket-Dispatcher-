"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "cn"
import { escalations } from "@/lib/stores/admin-store"
import { useAdminStore } from "@/lib/stores/admin-store"

export function TranscriptView() {
  const selectedTicketId = useAdminStore((s) => s.selectedTicketId)
  const escalation = escalations[selectedTicketId]

  return (
    <section className="flex min-h-0 flex-col lg:h-full">
      <div className="flex h-10 shrink-0 items-center border-b border-border px-5">
        <h2 className="text-sm font-medium tracking-tight text-muted-foreground">
          Transcript
        </h2>
      </div>
      <ScrollArea className="min-h-100 lg:flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTicketId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-3 px-5 py-4"
          >
            {escalation?.transcript.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "max-w-[85%] rounded-md px-3 py-2 text-xs/relaxed",
                  entry.role === "user"
                    ? "self-end bg-secondary text-secondary-foreground"
                    : "self-start border border-border text-foreground"
                )}
              >
                <p>{entry.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.timestamp}</p>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </section>
  )
}

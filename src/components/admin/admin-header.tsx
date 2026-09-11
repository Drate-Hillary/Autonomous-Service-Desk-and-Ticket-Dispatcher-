import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { Ticket } from "@/types"

const priorityVariant = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
} as const

export function AdminHeader({ ticket }: { ticket: Ticket }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Badge variant={priorityVariant[ticket.priority]}>
          {ticket.priority} priority
        </Badge>
        <p className="truncate text-sm font-medium text-foreground">{ticket.subject}</p>
      </div>
      <Avatar className="size-6">
        <AvatarFallback>JM</AvatarFallback>
      </Avatar>
    </header>
  )
}

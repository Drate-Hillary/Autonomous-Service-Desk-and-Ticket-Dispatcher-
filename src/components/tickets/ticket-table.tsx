"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { useRequestsStore } from "@/lib/stores/requests-store"
import type { RequestPriority, Ticket } from "@/types"

const priorityVariant: Record<RequestPriority, "priority-high" | "priority-medium" | "priority-low"> = {
  urgent: "priority-high",
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
}

const statusVariant: Record<string, "approve" | "default" | "secondary"> = {
  completed: "approve",
  processing: "default",
}

export function TicketTable() {
  const tickets = useRequestsStore((s) => s.tickets)
  const isLoading = useRequestsStore((s) => s.isLoading)
  const fetchTickets = useRequestsStore((s) => s.fetchTickets)

  useEffect(() => {
    void fetchTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading && tickets.length === 0) {
    return <p className="px-1 text-xs text-muted-foreground">Loading tickets…</p>
  }

  if (tickets.length === 0) {
    return <p className="px-1 text-xs text-muted-foreground">No open tickets right now.</p>
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-accent/40 text-sm text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Priority</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Assigned</th>
            <th className="px-3 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <tr className="transition-colors hover:bg-accent/30">
      <td className="px-3 py-2.5 align-top">
        <Link href={`/tickets/${ticket.id}`} className="font-medium text-primary hover:underline">
          #{ticket.ticketNumber}
        </Link>
      </td>
      <td className="max-w-64 truncate px-3 py-2.5 align-top text-foreground">
        <Link href={`/tickets/${ticket.id}`} className="hover:underline">
          {ticket.title}
        </Link>
      </td>
      <td className="px-3 py-2.5 align-top text-muted-foreground">{ticket.customerName ?? "Unknown"}</td>
      <td className="px-3 py-2.5 align-top text-muted-foreground">{ticket.category}</td>
      <td className="px-3 py-2.5 align-top">
        <Badge variant={priorityVariant[ticket.priority]}>{ticket.priority}</Badge>
      </td>
      <td className="px-3 py-2.5 align-top">
        <Badge variant={statusVariant[ticket.status] ?? "secondary"}>{ticket.status}</Badge>
        {ticket.aiHandled && (
          <Badge variant="outline" className="ml-1">
            AI
          </Badge>
        )}
      </td>
      <td className="px-3 py-2.5 align-top text-muted-foreground">{ticket.assignedAgentName ?? "Unassigned"}</td>
      <td className="px-3 py-2.5 align-top text-muted-foreground">
        {new Date(ticket.updatedAt).toLocaleString()}
      </td>
    </tr>
  )
}

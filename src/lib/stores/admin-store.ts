import { create } from "zustand"
import { escalations, tickets } from "@/lib/mock-data"
import type { EscalationDecision, Ticket } from "@/types"

interface AdminState {
  tickets: Ticket[]
  selectedTicketId: string
  decisions: Record<string, EscalationDecision>
  isSubmitting: boolean
  selectTicket: (ticketId: string) => void
  approve: (ticketId: string) => Promise<void>
  reject: (ticketId: string) => Promise<void>
  toggleEdit: (ticketId: string) => void
}

export const useAdminStore = create<AdminState>((set, get) => ({
  tickets,
  selectedTicketId: tickets[0].id,
  decisions: {},
  isSubmitting: false,

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  approve: async (ticketId) => {
    if (get().isSubmitting) return
    set({ isSubmitting: true })
    // TODO: replace with `await approveEscalation(ticketId)`
    await wait(500)
    set((s) => ({
      decisions: { ...s.decisions, [ticketId]: "approved" },
      isSubmitting: false,
    }))
  },

  reject: async (ticketId) => {
    if (get().isSubmitting) return
    set({ isSubmitting: true })
    // TODO: replace with `await rejectEscalation(ticketId)`
    await wait(500)
    set((s) => ({
      decisions: { ...s.decisions, [ticketId]: "rejected" },
      isSubmitting: false,
    }))
  },

  toggleEdit: (ticketId) =>
    set((s) => ({
      decisions: {
        ...s.decisions,
        [ticketId]: s.decisions[ticketId] === "editing" ? undefined : "editing",
      } as Record<string, EscalationDecision>,
    })),
}))

// escalations is re-exported here so components only need one import
// source for admin-related mock/derived data.
export { escalations }

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

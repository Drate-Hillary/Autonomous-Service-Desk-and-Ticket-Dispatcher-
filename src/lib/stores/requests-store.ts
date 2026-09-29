import { create } from "zustand"
import { apiClient } from "@/backend/api/client"
import type { Ticket, TicketDetail } from "@/types"

interface RequestsState {
  tickets: Ticket[]
  detailById: Record<string, TicketDetail>
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  fetchTickets: () => Promise<void>
  fetchDetail: (id: string) => Promise<void>
  changeStatus: (id: string, status: string) => Promise<void>
  assignToMe: (id: string) => Promise<void>
  close: (id: string) => Promise<void>
  reply: (id: string, text: string) => Promise<void>
}

export const useRequestsStore = create<RequestsState>((set, get) => ({
  tickets: [],
  detailById: {},
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchTickets: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await apiClient.get<Ticket[]>("/requests")
      set({ tickets: data, isLoading: false })
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : "Failed to load tickets" })
    }
  },

  fetchDetail: async (id) => {
    set({ error: null })
    try {
      const { data } = await apiClient.get<TicketDetail>(`/requests/${id}`)
      set((s) => ({ detailById: { ...s.detailById, [id]: data } }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load ticket" })
    }
  },

  changeStatus: async (id, status) => {
    if (get().isSubmitting) return
    set({ isSubmitting: true })
    try {
      const { data } = await apiClient.patch<TicketDetail>(`/requests/${id}/status`, { status })
      set((s) => ({
        isSubmitting: false,
        detailById: { ...s.detailById, [id]: data },
        tickets: s.tickets.map((t) => (t.id === id ? { ...t, status: data.status } : t)),
      }))
    } catch (err) {
      set({ isSubmitting: false, error: err instanceof Error ? err.message : "Failed to update status" })
    }
  },

  assignToMe: async (id) => {
    if (get().isSubmitting) return
    set({ isSubmitting: true })
    try {
      const { data } = await apiClient.patch<TicketDetail>(`/requests/${id}/assign`)
      set((s) => ({
        isSubmitting: false,
        detailById: { ...s.detailById, [id]: data },
        tickets: s.tickets.map((t) =>
          t.id === id ? { ...t, assignedAgentId: data.assignedAgentId, assignedAgentName: data.assignedAgentName } : t
        ),
      }))
    } catch (err) {
      set({ isSubmitting: false, error: err instanceof Error ? err.message : "Failed to assign" })
    }
  },

  close: async (id) => {
    if (get().isSubmitting) return
    set({ isSubmitting: true })
    try {
      const { data } = await apiClient.patch<TicketDetail>(`/requests/${id}/close`)
      set((s) => ({
        isSubmitting: false,
        detailById: { ...s.detailById, [id]: data },
        tickets: s.tickets.map((t) => (t.id === id ? { ...t, closedAt: data.closedAt } : t)),
      }))
    } catch (err) {
      set({ isSubmitting: false, error: err instanceof Error ? err.message : "Failed to close ticket" })
    }
  },

  reply: async (id, text) => {
    if (get().isSubmitting || !text.trim()) return
    set({ isSubmitting: true })
    try {
      await apiClient.post(`/requests/${id}/messages`, { text })
      await get().fetchDetail(id)
      set({ isSubmitting: false })
    } catch (err) {
      set({ isSubmitting: false, error: err instanceof Error ? err.message : "Failed to send reply" })
    }
  },
}))

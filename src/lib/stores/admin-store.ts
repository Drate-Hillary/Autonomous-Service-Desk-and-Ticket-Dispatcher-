import { create } from "zustand"
import { createClient } from "@/lib/client"
import type { AdminTicket, Escalation, TranscriptEntry } from "@/types"
import type { Json, RequestPriority } from "@/types/database.types"

interface AdminOption {
  id: string
  name: string
}

interface RawApproval {
  id: string
  request_id: string | null
  action: string
  description: string
  risk: "low" | "medium" | "high"
  amount: number | null
  currency: string | null
  status: "pending" | "approved" | "rejected"
  decision_note: string | null
  created_at: string
}

interface RawRequest {
  id: string
  code: string
  title: string
  priority: RequestPriority
  customer_id: string
  assigned_admin_id: string | null
}

interface AdminState {
  tickets: AdminTicket[]
  escalationsById: Record<string, Escalation>
  transcriptsByRequest: Record<string, TranscriptEntry[]>
  admins: AdminOption[]
  selectedApprovalId: string
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  fetchTickets: () => Promise<void>
  fetchAdmins: () => Promise<void>
  selectTicket: (approvalId: string) => void
  loadDetail: (approvalId: string) => Promise<void>
  approve: (approvalId: string, note?: string) => Promise<void>
  reject: (approvalId: string, note?: string) => Promise<void>
  assignAdmin: (requestId: string, adminId: string | null) => Promise<void>
}

function formatWaiting(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.round(ms / 60000))
  if (mins < 60) return `${mins} min`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr`
  return `${Math.round(hrs / 24)} d`
}

export const useAdminStore = create<AdminState>((set, get) => ({
  tickets: [],
  escalationsById: {},
  transcriptsByRequest: {},
  admins: [],
  selectedApprovalId: "",
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchTickets: async () => {
    set({ isLoading: true, error: null })
    const supabase = createClient()

    const { data: approvals, error } = await supabase
      .from("agent_approvals")
      .select("id, request_id, action, description, risk, amount, currency, status, decision_note, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      set({ isLoading: false, error: error.message })
      return
    }

    const rows = (approvals ?? []) as RawApproval[]
    const requestIds = Array.from(new Set(rows.map((r) => r.request_id).filter((id): id is string => Boolean(id))))

    let requestsById = new Map<string, RawRequest>()
    let namesById = new Map<string, string>()
    if (requestIds.length > 0) {
      const { data: requests } = await supabase
        .from("requests")
        .select("id, code, title, priority, customer_id, assigned_admin_id")
        .in("id", requestIds)
      requestsById = new Map((requests ?? []).map((r) => [r.id, r as RawRequest]))

      const customerIds = Array.from(new Set((requests ?? []).map((r) => r.customer_id)))
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", customerIds)
        namesById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Unknown customer"]))
      }
    }

    const tickets: AdminTicket[] = rows.map((row) => {
      const request = row.request_id ? requestsById.get(row.request_id) : undefined
      return {
        approvalId: row.id,
        requestId: row.request_id,
        code: request?.code ?? null,
        customerName: request ? (namesById.get(request.customer_id) ?? "Unknown customer") : "Unknown customer",
        subject: request?.title ?? row.description,
        priority: request?.priority ?? "medium",
        waitingSince: formatWaiting(row.created_at),
        status: row.status,
        assignedAdminId: request?.assigned_admin_id ?? null,
      }
    })

    const escalationsById: Record<string, Escalation> = { ...get().escalationsById }
    for (const row of rows) {
      const existing = escalationsById[row.id]
      escalationsById[row.id] = {
        approvalId: row.id,
        requestId: row.request_id,
        aiSummary: row.description,
        evidence: existing?.evidence ?? [],
        action: {
          type: row.action,
          description: row.description,
          amount: row.amount ?? undefined,
          currency: row.currency ?? undefined,
          risk: row.risk,
        },
        decisionNote: row.decision_note,
        status: row.status,
        feedback: existing?.feedback ?? null,
      }
    }

    set({
      tickets,
      escalationsById,
      isLoading: false,
      selectedApprovalId: get().selectedApprovalId || tickets[0]?.approvalId || "",
    })
  },

  fetchAdmins: async () => {
    const supabase = createClient()
    const { data: available } = await supabase.from("admin_profiles").select("id").eq("is_available", true)
    const ids = (available ?? []).map((a) => a.id)
    if (ids.length === 0) {
      set({ admins: [] })
      return
    }
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids)
    set({
      admins: (profiles ?? []).map((p) => ({ id: p.id, name: p.full_name ?? "Unnamed admin" })),
    })
  },

  selectTicket: (approvalId) => {
    set({ selectedApprovalId: approvalId })
    void get().loadDetail(approvalId)
  },

  loadDetail: async (approvalId) => {
    const ticket = get().tickets.find((t) => t.approvalId === approvalId)
    const requestId = ticket?.requestId
    if (!requestId) return

    const supabase = createClient()
    const alreadyLoaded = requestId in get().transcriptsByRequest
    if (alreadyLoaded) return

    const [{ data: messages }, { data: conversations }, { data: feedback }] = await Promise.all([
      supabase
        .from("request_messages")
        .select("id, sender_type, text, created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true }),
      supabase
        .from("ai_conversations")
        .select("id")
        .eq("request_id", requestId)
        .order("started_at", { ascending: false })
        .limit(1),
      supabase.from("request_feedback").select("rating, comment").eq("request_id", requestId).maybeSingle(),
    ])

    const transcript: TranscriptEntry[] = (messages ?? []).map((m) => ({
      id: m.id,
      role: m.sender_type === "customer" ? "user" : "agent",
      content: m.text,
      timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    }))

    let evidence: Escalation["evidence"] = []
    const conversationId = conversations?.[0]?.id
    if (conversationId) {
      const { data: msgs } = await supabase.from("ai_messages").select("id").eq("conversation_id", conversationId)
      const messageIds = (msgs ?? []).map((m) => m.id)
      if (messageIds.length > 0) {
        const { data: sources } = await supabase
          .from("ai_message_sources")
          .select("id, label, excerpt")
          .in("message_id", messageIds)
        evidence = (sources ?? []).map((s) => ({ id: s.id, source: s.label, excerpt: s.excerpt ?? "" }))
      }
    }

    set((s) => ({
      transcriptsByRequest: { ...s.transcriptsByRequest, [requestId]: transcript },
      escalationsById: {
        ...s.escalationsById,
        [approvalId]: s.escalationsById[approvalId]
          ? {
              ...s.escalationsById[approvalId],
              evidence,
              feedback: feedback ? { rating: feedback.rating, comment: feedback.comment } : null,
            }
          : s.escalationsById[approvalId],
      },
    }))
  },

  approve: async (approvalId, note) => {
    if (get().isSubmitting) return
    set({ isSubmitting: true })
    const supabase = createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const adminId = userRes?.user?.id ?? null

    const payload: {
      status: "approved"
      decided_by: string | null
      decided_at: string
      decision_note?: string
      description?: string
    } = {
      status: "approved",
      decided_by: adminId,
      decided_at: new Date().toISOString(),
    }
    if (note) {
      payload.decision_note = note
      payload.description = note
    }

    const { error } = await supabase.from("agent_approvals").update(payload).eq("id", approvalId)
    if (!error && adminId) {
      await supabase.from("admin_activity_logs").insert({
        admin_id: adminId,
        action: "approval_decided",
        target_type: "agent_approval",
        target_id: approvalId,
        detail: { status: "approved" } as unknown as Json,
      })
    }

    set((s) => ({
      isSubmitting: false,
      tickets: s.tickets.map((t) => (t.approvalId === approvalId ? { ...t, status: "approved" } : t)),
      escalationsById: s.escalationsById[approvalId]
        ? {
            ...s.escalationsById,
            [approvalId]: {
              ...s.escalationsById[approvalId],
              status: "approved",
              decisionNote: note ?? s.escalationsById[approvalId].decisionNote,
              aiSummary: note ?? s.escalationsById[approvalId].aiSummary,
            },
          }
        : s.escalationsById,
    }))
  },

  reject: async (approvalId, note) => {
    if (get().isSubmitting) return
    set({ isSubmitting: true })
    const supabase = createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const adminId = userRes?.user?.id ?? null

    const payload: {
      status: "rejected"
      decided_by: string | null
      decided_at: string
      decision_note?: string
    } = {
      status: "rejected",
      decided_by: adminId,
      decided_at: new Date().toISOString(),
    }
    if (note) payload.decision_note = note

    const { error } = await supabase.from("agent_approvals").update(payload).eq("id", approvalId)
    if (!error && adminId) {
      await supabase.from("admin_activity_logs").insert({
        admin_id: adminId,
        action: "approval_decided",
        target_type: "agent_approval",
        target_id: approvalId,
        detail: { status: "rejected" } as unknown as Json,
      })
    }

    set((s) => ({
      isSubmitting: false,
      tickets: s.tickets.map((t) => (t.approvalId === approvalId ? { ...t, status: "rejected" } : t)),
      escalationsById: s.escalationsById[approvalId]
        ? {
            ...s.escalationsById,
            [approvalId]: {
              ...s.escalationsById[approvalId],
              status: "rejected",
              decisionNote: note ?? s.escalationsById[approvalId].decisionNote,
            },
          }
        : s.escalationsById,
    }))
  },

  assignAdmin: async (requestId, adminId) => {
    const supabase = createClient()
    const { error } = await supabase.from("requests").update({ assigned_admin_id: adminId }).eq("id", requestId)
    if (error) return

    const { data: userRes } = await supabase.auth.getUser()
    if (userRes?.user) {
      await supabase.from("admin_activity_logs").insert({
        admin_id: userRes.user.id,
        action: "request_assigned",
        target_type: "request",
        target_id: requestId,
        detail: { assigned_admin_id: adminId } as unknown as Json,
      })
    }

    set((s) => ({
      tickets: s.tickets.map((t) => (t.requestId === requestId ? { ...t, assignedAdminId: adminId } : t)),
    }))
  },
}))

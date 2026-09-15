import { create } from "zustand"
import { createClient } from "@/lib/client"
import type { ChatStreamItem, Citation } from "@/types"

interface ChatState {
  conversationId: string | null
  stream: ChatStreamItem[]
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
}

let nextId = 100

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
}

/**
 * /chat is deliberately public (see src/middleware.ts) — it's the
 * customer-facing demo surface, not part of the staff console. Because of
 * that, `auth.uid()` may be null here, and ai_conversations/ai_messages RLS
 * requires `customer_id = auth.uid()` to insert. So: try to persist for real
 * when a customer session exists (e.g. staff previewing the demo while
 * signed in, or once the customer app reuses this flow signed-in), and fall
 * back to the local-only stream otherwise — the UI never blocks on it.
 */
export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  stream: [],
  isLoading: false,

  sendMessage: async (content) => {
    if (!content.trim() || get().isLoading) return

    const userMessage: ChatStreamItem = {
      type: "message",
      id: `local-${nextId++}`,
      role: "user",
      content,
      timestamp: timestamp(),
    }
    set((s) => ({ stream: [...s.stream, userMessage], isLoading: true }))

    const supabase = createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const customerId = userRes?.user?.id ?? null

    let conversationId = get().conversationId
    if (!conversationId) {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ customer_id: customerId, channel: "chat" })
        .select("id")
        .single()
      conversationId = !error && data ? data.id : null
      set({ conversationId })
    }

    if (conversationId) {
      await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content })
    }

    const toolId = `local-${nextId++}`
    await wait(500)
    set((s) => ({
      stream: [...s.stream, { type: "tool", id: toolId, label: "Searching knowledge base", status: "running" }],
    }))

    await wait(1100)
    set((s) => ({
      stream: s.stream.map((item) =>
        item.type === "tool" && item.id === toolId ? { ...item, status: "done" } : item
      ),
    }))

    const replyText =
      "Got it — I've logged that and I'm keeping the request open with your manager's review. I'll message you here the moment there's an update."

    let citations: Citation[] | undefined
    if (conversationId) {
      const { data: assistantMessage } = await supabase
        .from("ai_messages")
        .insert({ conversation_id: conversationId, role: "assistant", content: replyText })
        .select("id")
        .single()

      if (assistantMessage?.id) {
        const { data: sources } = await supabase
          .from("ai_message_sources")
          .select("id, label, excerpt")
          .eq("message_id", assistantMessage.id)
        if (sources?.length) {
          citations = sources.map((s, i) => ({
            id: s.id,
            number: i + 1,
            policyLabel: s.label,
            excerpt: s.excerpt ?? "",
          }))
        }
      }
    }

    const agentMessage: ChatStreamItem = {
      type: "message",
      id: `local-${nextId++}`,
      role: "assistant",
      content: replyText,
      timestamp: timestamp(),
      citations,
    }
    await wait(400)
    set((s) => ({ stream: [...s.stream, agentMessage], isLoading: false }))
  },
}))

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

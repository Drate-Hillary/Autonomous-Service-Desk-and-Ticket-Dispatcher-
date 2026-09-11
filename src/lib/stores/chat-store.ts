import { create } from "zustand"
import { initialChatStream } from "@/lib/mock-data"
import type { ChatStreamItem } from "@/types"

interface ChatState {
  sessionToken: string
  stream: ChatStreamItem[]
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
}

let nextId = 100

export const useChatStore = create<ChatState>((set, get) => ({
  sessionToken: "demo-session-token",
  stream: initialChatStream,
  isLoading: false,

  sendMessage: async (content) => {
    if (!content.trim() || get().isLoading) return

    const userMessage: ChatStreamItem = {
      type: "message",
      id: `local-${nextId++}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }),
    }
    set((s) => ({ stream: [...s.stream, userMessage], isLoading: true }))

    // TODO: replace this simulated round-trip with
    //   await postChatMessage(get().sessionToken, content)
    // once the backend endpoint exists. The shape of `stream` already
    // matches what that response is expected to produce.
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

    const agentMessage: ChatStreamItem = {
      type: "message",
      id: `local-${nextId++}`,
      role: "agent",
      content:
        "Got it — I've logged that and I'm keeping the request open with your manager's review. I'll message you here the moment there's an update.",
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }),
    }
    await wait(400)
    set((s) => ({ stream: [...s.stream, agentMessage], isLoading: false }))
  },
}))

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

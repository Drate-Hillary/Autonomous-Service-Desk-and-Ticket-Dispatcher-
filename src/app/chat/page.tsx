import { ChatHeader } from "@/components/chat/chat-header"
import { ChatWindow } from "@/components/chat/chat-window"
import { ChatInput } from "@/components/chat/chat-input"

export default function ChatPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 120% 60% at 50% 0%, color-mix(in oklch, var(--primary) 6%, transparent), transparent)",
      }}
    >
      <ChatHeader />
      <main className="flex-1">
        <ChatWindow />
      </main>
      <ChatInput />
    </div>
  )
}

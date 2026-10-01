import { create } from "zustand"
import { apiClient } from "@/backend/api/client"

export type NotificationType = "request_update" | "ai" | "support" | "completed" | "system"

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  createdAt: string
  read: boolean
  requestId?: string
}

const POLL_MS = 30_000

interface NotificationsState {
  items: AppNotification[]
  unreadCount: number
  isLoading: boolean
  fetchNotifications: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  /** Starts the live refresh; returns a stop function. Safe to call from several mounts — one timer runs. */
  startPolling: () => () => void
}

let pollers = 0
let timer: ReturnType<typeof setInterval> | null = null

const countUnread = (items: AppNotification[]) => items.filter((n) => !n.read).length

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    try {
      const { data } = await apiClient.get<AppNotification[]>("/notifications")
      set({ items: data, unreadCount: countUnread(data), isLoading: false })
    } catch {
      // Transient network error: keep what we have and try again on the next tick.
      set({ isLoading: false })
    }
  },

  markRead: async (id) => {
    const previous = get().items
    const items = previous.map((n) => (n.id === id ? { ...n, read: true } : n))
    set({ items, unreadCount: countUnread(items) })
    try {
      await apiClient.patch(`/notifications/${id}/read`)
    } catch {
      set({ items: previous, unreadCount: countUnread(previous) })
    }
  },

  markAllRead: async () => {
    const previous = get().items
    const items = previous.map((n) => ({ ...n, read: true }))
    set({ items, unreadCount: 0 })
    try {
      await apiClient.patch("/notifications/read-all")
    } catch {
      set({ items: previous, unreadCount: countUnread(previous) })
    }
  },

  startPolling: () => {
    pollers += 1
    if (pollers === 1) {
      set({ isLoading: true })
      void get().fetchNotifications()
      timer = setInterval(() => {
        // No point polling a tab nobody is looking at; the visibility handler catches up.
        if (document.visibilityState === "visible") void get().fetchNotifications()
      }, POLL_MS)
      document.addEventListener("visibilitychange", onVisible)
    }
    return () => {
      pollers -= 1
      if (pollers === 0) {
        if (timer) clearInterval(timer)
        timer = null
        document.removeEventListener("visibilitychange", onVisible)
      }
    }
  },
}))

function onVisible() {
  if (document.visibilityState === "visible") void useNotificationsStore.getState().fetchNotifications()
}

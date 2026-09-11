import axios from "axios"

/**
 * Shared Axios instance for the RESOLV-HQ backend. Both the customer chat
 * store and the admin dashboard store are already structured to call
 * through this client — swap the mock branch in each store's actions for
 * the commented call below once the endpoints exist.
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
})

apiClient.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? window.sessionStorage.getItem("resolv_session_token") : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- Chat -------------------------------------------------------------
// export function postChatMessage(sessionToken: string, content: string) {
//   return apiClient.post<ChatMessage>("/chat/messages", { sessionToken, content })
// }

// --- Admin escalations --------------------------------------------------
// export function fetchTickets() {
//   return apiClient.get<Ticket[]>("/escalations")
// }
// export function fetchEscalation(ticketId: string) {
//   return apiClient.get<Escalation>(`/escalations/${ticketId}`)
// }
// export function approveEscalation(ticketId: string) {
//   return apiClient.post(`/escalations/${ticketId}/approve`)
// }
// export function rejectEscalation(ticketId: string, reason?: string) {
//   return apiClient.post(`/escalations/${ticketId}/reject`, { reason })
// }

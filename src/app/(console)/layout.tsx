import { AppSidebar } from "@/components/app-sidebar"
import { ConsoleHeader } from "@/components/console/console-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from "@/lib/server"

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const { data: profile } = authUser
    ? await supabase.from("profiles").select("full_name, avatar_url").eq("id", authUser.id).single()
    : { data: null }

  const user = {
    name: profile?.full_name ?? authUser?.email?.split("@")[0] ?? "Staff",
    email: authUser?.email ?? "",
    avatar: profile?.avatar_url ?? "",
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar user={user} />
      <SidebarInset>
        <ConsoleHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

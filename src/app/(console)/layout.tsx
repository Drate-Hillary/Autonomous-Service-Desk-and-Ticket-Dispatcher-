import { AppSidebar } from "@/components/app-sidebar"
import { ConsoleHeader } from "@/components/console/console-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset>
        <ConsoleHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

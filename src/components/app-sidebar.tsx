"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardBrowsingIcon,
  Robot02Icon,
  Knowledge01Icon,
  Wrench01Icon,
  AiBrain01Icon,
  Chart01Icon,
  Activity03Icon,
  Shield01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"

const data = {
  user: {
    name: "Manager",
    email: "manager@resolv-hq.app",
    avatar: "",
  },
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: <HugeiconsIcon icon={DashboardBrowsingIcon} strokeWidth={2} /> },
    { title: "Agent Workspace", url: "/agent", icon: <HugeiconsIcon icon={Robot02Icon} strokeWidth={2} /> },
    { title: "Knowledge Base", url: "/knowledge", icon: <HugeiconsIcon icon={Knowledge01Icon} strokeWidth={2} /> },
    { title: "Tools", url: "/tools", icon: <HugeiconsIcon icon={Wrench01Icon} strokeWidth={2} /> },
    { title: "Memory", url: "/memory", icon: <HugeiconsIcon icon={AiBrain01Icon} strokeWidth={2} /> },
  ],
  navGovernance: [
    { title: "Evaluations", url: "/evaluations", icon: <HugeiconsIcon icon={Chart01Icon} strokeWidth={2} /> },
    { title: "Traces & Logs", url: "/traces", icon: <HugeiconsIcon icon={Activity03Icon} strokeWidth={2} /> },
    { title: "Guardrails", url: "/guardrails", icon: <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} /> },
  ],
  navSecondary: [
    { title: "Settings", url: "/settings", icon: <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="text-sm font-semibold">R</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Resolv-HQ</span>
                <span className="truncate text-xs">Agent Console</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Operate" items={data.navMain} />
        <NavMain label="Governance" items={data.navGovernance} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

import { Icon } from "@/components/ui/icon"
import { cn } from "cn"
import type { IconSvgElement } from "@hugeicons/react"

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string
  value: string
  icon: IconSvgElement
  tone?: "default" | "warn" | "danger"
}) {
  return (
    <div className="glass-panel flex items-center gap-3 p-3.5">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          tone === "default" && "bg-primary/10 text-primary",
          tone === "warn" && "bg-primary/10 text-primary",
          tone === "danger" && "bg-destructive/10 text-destructive"
        )}
      >
        <Icon icon={icon} size={21} />
      </span>
      <div className="min-w-0">
        <p className="tabular truncate text-lg font-semibold text-foreground">{value}</p>
        <p className="truncate text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

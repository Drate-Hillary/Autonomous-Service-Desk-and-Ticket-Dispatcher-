import { Badge } from "@/components/ui/badge"
import { Icon } from "@/components/ui/icon"
import { CpuIcon, FileAttachmentIcon, ServerCogIcon } from "@hugeicons/core-free-icons"

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-xs text-muted-foreground">Model, prompt versioning and external integrations.</p>
      </div>

      <section className="glass-panel p-4">
        <div className="flex items-center gap-2">
          <Icon icon={CpuIcon} size={20} className="text-primary" />
          <h3 className="text-xs font-medium text-foreground">Model</h3>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <Field label="Foundation model" value="resolv-agent-v3" />
          <Field label="Context window" value="128k tokens" />
          <Field label="Temperature" value="0.2 (deterministic)" />
        </dl>
      </section>

      <section className="glass-panel p-4">
        <div className="flex items-center gap-2">
          <Icon icon={FileAttachmentIcon} size={20} className="text-primary" />
          <h3 className="text-xs font-medium text-foreground">Prompt versions</h3>
        </div>
        <ul className="mt-3 flex flex-col divide-y divide-border text-xs">
          {[
            { name: "procurement-planner", version: "1.4.0", status: "active" },
            { name: "retrieval-grounding", version: "1.1.2", status: "active" },
            { name: "approval-summariser", version: "1.0.3", status: "active" },
          ].map((p) => (
            <li key={p.name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-foreground">{p.name}</span>
              <span className="flex items-center gap-2">
                <span className="tabular text-muted-foreground">v{p.version}</span>
                <Badge variant="approve">{p.status}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel p-4">
        <div className="flex items-center gap-2">
          <Icon icon={ServerCogIcon} size={20} className="text-primary" />
          <h3 className="text-xs font-medium text-foreground">Integrations</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          The agent exposes its tools through an MCP-style interface, so other agents or systems can call the
          same approved functions under the same guardrails.
        </p>
        <div className="mt-3 rounded-md border border-border px-3 py-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Procurement MCP Server</span>
            <Badge variant="approve">connected</Badge>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Protocol</dt>
              <dd className="mt-0.5 text-foreground">MCP 1.0</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Endpoint</dt>
              <dd className="mt-0.5 text-foreground">mcp://resolv-hq/procurement</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Exposed tools</dt>
              <dd className="tabular mt-0.5 text-foreground">4</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last sync</dt>
              <dd className="mt-0.5 text-foreground">2 min ago</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  )
}

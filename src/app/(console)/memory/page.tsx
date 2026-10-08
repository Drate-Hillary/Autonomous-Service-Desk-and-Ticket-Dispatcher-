import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const memoryFacts = [
  {
    name: "Preferred contact method",
    storage: "customer_memory_facts.preferred_contact_method",
    purpose: "Keep replies aligned with how the customer wants updates delivered.",
    retention: "Until the customer disables or edits the fact.",
  },
  {
    name: "Standing note",
    storage: "customer_memory_facts.standing_note",
    purpose: "Carry an informative preference into future conversations without re-asking.",
    retention: "Until the customer removes it.",
  },
]

const gateRules = [
  "Memory is informative only and never authorizes a real action.",
  "The approval gate remains the enforcement boundary for any consequential request.",
  "Customer-owned memory stays separate from staff-only operational memory.",
  "Staff can read customer memory but cannot change it without consent.",
]

const mcpCapabilities = [
  {
    name: "account_status_lookup",
    purpose: "Read the caller's own account status and profile information.",
    inputs: "None; resolves to the current authenticated user.",
    outputs: "Account summary, status, and key profile fields.",
    boundary: "Read-only and scoped to the caller's own account.",
  },
  {
    name: "outage_status_checker",
    purpose: "Check whether the caller has an open issue or active support signal.",
    inputs: "No required parameters; the tool inspects the caller's own requests.",
    outputs: "Open issue summary, status, and whether a follow-up is needed.",
    boundary: "Restricted to the same customer context and never cross-customer.",
  },
  {
    name: "draft_escalation_ticket",
    purpose: "Prepare a draft escalation without submitting it.",
    inputs: "A summary string describing why the escalation is needed.",
    outputs: "A draft title, description, category, and priority for review.",
    boundary: "Draft-only; the model must not treat this as a submitted action.",
  },
  {
    name: "search_knowledge_base",
    purpose: "Retrieve the relevant support knowledge before proposing a response.",
    inputs: "Focused search terms or a request context.",
    outputs: "Returned knowledge snippets and relevant citations.",
    boundary: "Read-only retrieval; it never mutates records or grants authority.",
  },
]

export default function MemoryMcpPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Memory + MCP
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Customer memory and model interface guardrails
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          This page centralizes the memory rules, persistence model, and the read-only MCP-style
          capability boundary used by the support agent.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stored facts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">2 approved customer memory items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Access model</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Customer-owned and scoped to the same user</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Authority model</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Informational only; approval gate stays active</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer memory facts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {memoryFacts.map((fact) => (
              <div key={fact.name} className="rounded-md border border-border/70 bg-muted/20 p-3">
                <div className="mb-2 text-sm font-medium text-foreground">{fact.name}</div>
                <dl className="space-y-2 text-xs text-muted-foreground">
                  <div>
                    <dt className="font-medium text-foreground">Storage</dt>
                    <dd>{fact.storage}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Purpose</dt>
                    <dd>{fact.purpose}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Retention</dt>
                    <dd>{fact.retention}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data handling and guardrails</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {gateRules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-md border border-border/70 bg-background p-3 text-xs text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">Separation of concerns</div>
              <p>
                Customer memory facts live in <span className="font-medium text-foreground">customer_memory_facts</span>
                ; staff operational memory sits in a different, staff-only record set. This prevents a
                customer preference from becoming a privileged operational capability.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MCP-style interface summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mcpCapabilities.map((capability) => (
            <div
              key={capability.name}
              className="rounded-md border border-border/70 bg-muted/20 p-4"
            >
              <div className="mb-2 text-sm font-semibold text-foreground">{capability.name}</div>
              <dl className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                <div className="md:col-span-2">
                  <dt className="font-medium text-foreground">Purpose</dt>
                  <dd>{capability.purpose}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Inputs</dt>
                  <dd>{capability.inputs}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Outputs</dt>
                  <dd>{capability.outputs}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-medium text-foreground">Boundary</dt>
                  <dd>{capability.boundary}</dd>
                </div>
              </dl>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

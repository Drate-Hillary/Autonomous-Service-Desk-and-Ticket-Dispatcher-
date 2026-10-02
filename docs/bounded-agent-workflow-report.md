# Working Bounded Agent Workflow — Report

**Week 5 — Agent Architecture and Bounded Autonomy** 
**Implementation:** `resolv-hq-backend/src/lib/react-agent.ts` (`runReActLoop()`), `agent-tools.ts`, `ai.ts`, `ai-boundary.ts`, `llm/gateway.ts`
**Companions:** [`agent-task-contract.md`](./agent-task-contract.md) · [`architecture-diagram.md`](./architecture-diagram.md) · [`../evidence/traces/week-5-execution-traces.md`](../evidence/traces/week-5-execution-traces.md)

## 1. Verdict

The workflow is **implemented and running end to end**, and it is bounded by structure, not just by prompt. A live model has completed a full turn through it (T1). What is **not yet demonstrated live** is the model calling tools, the iteration cap firing, and the boundary check catching a real model output; those are verified by code reading and offline tests only. See §7.

## 2. The task and why it is multi-step

**Goal:** resolve or route a customer support query without ever executing a state-changing action itself.

A single question can need several dependent lookups: check the caller's open requests, search the knowledge base, then draft an escalation if a human must act. The model chooses the next approved action from what the previous one returned, so the path varies per query instead of following a fixed script.

## 3. How the workflow runs

```
Caller message
  → Clarification gate (deterministic; vague query → one question, loop not entered)
  → SENSE   prompt v1.1 + query + caller-scoped knowledge, requests, account
  → PLAN    model decides via native tool-calling: answer, or call a tool
  → ACT     executeAgentTool() runs one of 4 approved tools
  → OBSERVE result appended as a tool message → back to PLAN (max 4 cycles)
  → RESPOND plain-content answer
  → Boundary check (detectBoundaryViolation) → answer to caller
```

| Phase | Mechanism | Code |
|---|---|---|
| Sense | Context built once, scoped to the authenticated user id | `ai.ts` |
| Plan | `completeWithFallback(messages, AGENT_TOOL_DEFINITIONS)`; real model decision | `react-agent.ts`, `llm/gateway.ts` |
| Act | Closed-set tool executor; unknown name returns `Unknown tool` and runs nothing | `agent-tools.ts` |
| Observe | `tool`-role message with the result; malformed arguments are returned to the model as an error rather than executed | `react-agent.ts` |
| Respond | Final content, then boundary check on the text | `ai.ts`, `ai-boundary.ts` |

## 4. The bounds

| Bound | Setting | Enforced by |
|---|---|---|
| Iterations | `MAX_ITERATIONS = 4`; on exhaustion return a safe "wasn't able to work through this fully" message | Loop counter |
| Tools | `search_knowledge_base`, `account_status_lookup`, `outage_status_checker`, `draft_escalation_ticket`; all schemas `additionalProperties:false` with explicit `required` | Tool definitions + executor `default` branch |
| Side effects | None. Three tools are read-only; the fourth returns a draft and writes nothing | Tool implementations |
| Data reach | Caller's own data only; no tool takes a customer/account argument | Per-caller loaders |
| Fabricated actions | Prompt rule 2, plus deterministic regex backstop on the output driven by the `boundary_rules` table; a hit discards the text and substitutes a safe fallback | `ai-boundary.ts` |
| Human approval | A drafted escalation is persisted as an `agent_approvals` row; staff approve or reject via `decideApproval()`, which the agent cannot call | `chat.ts`, approvals route |
| Provider failure | Backoff retry → next provider → keyword fallback with `fallbackReason` | `gateway.ts`, `ai.ts` |
| Caller role | Staff get one extra prompt sentence only; tools, cap, boundary, scoping unchanged | `system-prompt.ts` |

## 5. Stop and hand-off conditions

The turn ends in exactly one of five ways: normal answer; clarification question; iteration cap; boundary-violation fallback; gateway-unavailable keyword fallback. A human is brought in when the caller needs a state-changing action (draft → approval queue), when the answer is ungrounded or the cap is hit (offer to open a support request), or when a boundary violation is caught.

## 6. Evidence

| Evidence | Result | Strength |
|---|---|---|
| **T1, live model** (Gemini, `gemini-3.8-flash`): password-reset question | 1 iteration, 0 tool calls, grounded answer with title/page citation, no fallback, 18.8 s | Real run, but shows Sense → Respond only |
| **T2, failure/recovery**: Gemini `429` quota, Anthropic `400` no credit | Gateway failed over, then the keyword fallback answered with a safe grounded reply and a recorded `fallbackReason`; 4.6 s | Real run; provider-level, not tool-level |
| Tool failure and authorization tests (Week 4): missing parameter, cross-customer, unknown tool, ungrounded query | Executed output against `agent-tools.ts` | Real, executed ([`tool-failure-auth-test-evidence.md`](./tool-failure-auth-test-evidence.md)) |
| Boundary detector: 4 fabricated-action phrasings caught, 2 compliant responses passed | 6/6 | Offline hand-written cases ([`ai-boundary-matrix.md`](./ai-boundary-matrix.md)) |
| `tsc --noEmit` and `eslint` clean; backend boots and answers `/health` | Pass | Build checks |

## 7. What is not yet proven

| Gap | Why it matters | To close |
|---|---|---|
| No live trace with a **tool call** (Plan → Act → Observe) | T1's model answered from pre-loaded context and called nothing, so live tool-use is unobserved | Run a query whose answer is not in the pre-loaded context, e.g. open-request status or an escalation |
| No live **iteration-cap** or **boundary-violation** event | These exits are the core of "bounded", yet are verified by reading code and offline tests only | Provoke or stub-test each, and label stubs as such |
| Live **customer vs. staff** comparison | Parity rests on code reading | Run the same prompt as both callers on a working model |
| Whether **4** is the right ceiling | Untested against real tool-use behaviour | Observe iteration counts over the Week 7 scenario set |
| Detector is a narrow regex set | A paraphrased fabricated action can pass | Test against real model phrasing; tune `boundary_rules` |

**Blocker for all of these:** no provider currently has capacity. Gemini's free tier (20 requests/day) is exhausted and the Anthropic account has no credit. Fixing that is the single prerequisite.

## 8. Strengths and limits, plainly

**Strengths:** the bounds are enforced in code at four independent points (closed tool set, read-only tools, per-caller scoping, output check) plus an approval gate, so a misbehaving model cannot change state or reach another customer's data; the system degrades to a safe answer rather than an error; and it was built a week ahead of schedule.

**Limits:** the evidence for live autonomous behaviour is thin (one live turn, no tool use observed), the safety exits are not yet exercised against a real model, and the system currently depends on a single paid provider being funded.

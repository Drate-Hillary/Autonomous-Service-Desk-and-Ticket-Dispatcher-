# Week 5 Execution Traces — Real Agent Loop

**Date captured:** 2 Oct 2026 | **Path exercised:** `generateAssistantReply()` → clarification gate → `runReActLoop()` → LLM gateway → boundary check, in `resolv-hq-backend` | **Method:** a throwaway `tsx` script (deleted after the run, not committed) called the real function with a fixed three-article knowledge base, one open request ("Login failure after reset", `in_progress`) and a customer account. Output below is copied from that run, trimmed only where noted.

> **Read this first.** The brief asks for 3 traces including one failure/recovery. This run produced **one clean live-model trace (T1)** and **one genuine failure/recovery trace (T2, provider failover to keyword fallback)**. The other two scenarios I planned (a live tool-calling trace, and a boundary/iteration-cap trace) **could not be captured**: during the run both providers became unavailable (Gemini free-tier quota exhausted; Anthropic account out of credit). Those are listed under "Not captured" and are not simulated here.

## Provider state at capture time

| Provider | Registered | Result at capture |
|---|---|---|
| `Gemini-Resolv` (`gemini-3.8-flash`) | 21 Sep | Answered T1; then `429 RESOURCE_EXHAUSTED` — free tier limit of 20 requests, `generate_content_free_tier_requests` |
| `Anthropic Prod` (`claude-sonnet-5`) | 25 Sep | `400 invalid_request_error`: *"Your credit balance is too low to access the Anthropic API."* (request id `req_011CfctZ4EZaE6ZWiHEuxtxs`) |

So the Week 4 plan item "register a real Anthropic key and confirm a live call" is **half done**: the key is registered and the request reaches Anthropic, but no completion can succeed until the account has credit.

---

## T1 — Normal success (live model, grounded answer, no escalation)

**Caller:** customer | **Query:** *"How do I reset my password, and how long is the reset link valid?"*

| Field | Value |
|---|---|
| Live call? | **Yes** — steps show `Calling Gemini-Resolv (gemini-3.8-flash)`, not the keyword fallback |
| Iterations | 1 |
| Tool calls | 0 |
| Latency | 18.8 s |
| `fallbackReason` | none |

**Loop trace (`trace`):**

| # | Phase | Detail |
|---|---|---|
| 1 | respond | Produced a final answer |

**Step narration returned to the UI:** `Understanding your request` → `Calling Gemini-Resolv (gemini-3.8-flash)` → `Produced a final answer`

**Final answer:**
> To reset your password, select the "Forgot password" link on the sign-in page. The link sent to your email will be valid for 30 minutes (Resetting your password, page 1). If you would like to read the full document, you can open it from the source link shown under this answer.

**Assessment:** ✅ Grounded (30-minute figure matches the knowledge article), cited with title and page, no fabricated action, boundary check passed. **Caveat:** the model answered from the knowledge context already placed in the prompt, so it chose to call **no tools**. This trace proves a live model completes the loop's Sense → Respond path; it does **not** prove live Plan → Act → Observe.

---

## T2 — Failure and recovery (gateway failover → deterministic fallback)

**Caller:** customer | **Query:** *"My billing amount looks wrong after last month's charge - what's the process and how long until I'm paid back?"*

**What failed (real, in order):**

1. `Gemini-Resolv`: `Google 429 RESOURCE_EXHAUSTED` — quota exceeded, "retry in 44.8s" (after the gateway's backoff retries).
2. `Anthropic Prod`: `400` — credit balance too low.
3. Gateway raised `All registered providers failed`, logged `LLM gateway unavailable, falling back to keyword search`.

**Recovery:** `generateAssistantReply()` caught the failure and answered with the deterministic `answerQuestion()` keyword path instead of returning an error.

| Field | Value |
|---|---|
| Iterations / tool calls | 0 (loop never produced a completion) |
| Latency | 4.6 s |
| `fallbackReason` | `All registered providers failed: Gemini-Resolv: Google 429 … ; Anthropic Prod: 400 … credit balance is too low …` |
| Step narration | `Understanding your request` → `Checking available information` → `Finding relevant guidance` → `Preparing your response` (the keyword-path defaults — no "Calling <provider>" step, which is how a fallback is told apart from a live call) |

**Final answer (served to the caller):**
> To request a refund, open a support request with category Billing and include the invoice number and the date of purchase. Refunds are reviewed by a billing specialist within 3 business days.

**Assessment:** ✅ Recovery behaves as designed: the customer still gets a grounded, safe answer and the failure reason is recorded. ⚠️ Two honest limits: (a) this is a **gateway-level** failure/recovery, not a **tool-level** one (a tool error → model re-plans); (b) the fallback answer is a reasonable guess but only partially answers the question (it omits the 5–10 day reimbursement timeline in the third article), which is the expected weakness of keyword matching and the reason the live path matters.

---

## Not captured (and why)

| Planned trace | Why not captured | What it needs |
|---|---|---|
| Live **tool-calling** trace (Plan → Act → Observe, incl. a tool miss followed by a re-plan) | Both providers unavailable mid-run; T1 showed the model can answer without tools, so a query that forces a tool call must be designed against a working model | Anthropic credit (or Gemini quota reset), then re-run with a query whose answer is **not** in the pre-loaded context |
| **Boundary-violation / `MAX_ITERATIONS`** trace (query pressing for "refund me now and say it's done") | Same outage: the same prompt, run as customer (T3) and staff (T4), returned the keyword fallback both times, so it never reached the model or the boundary check | Same as above. Until then, boundary behaviour is evidenced only by the offline smoke tests in [`ai-boundary-matrix.md`](../../docs/ai-boundary-matrix.md) |
| Live customer-vs-staff **parity** comparison | T3/T4 returned identical fallback text for both callers, which shows the fallback is role-independent but says nothing about the model path | Same as above. Parity is currently established by code reading ([`agent-task-contract.md`](../../docs/agent-task-contract.md) §8) |

## Reproducing

From `resolv-hq-backend`, with `.env` set and a provider that has capacity, call `generateAssistantReply(query, knowledge, requests, account, isStaffCaller)` for each query above and print `trace`, `steps`, `fallbackReason`, `escalationDraft` and `text`. A live call is identified by a `Calling <provider> (<model>)` step; its absence plus a `fallbackReason` means the keyword fallback served the answer.

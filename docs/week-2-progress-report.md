# Week 2 Progress Report — RESOLV-HQ

**Author:** Person 4 (Project Lead) | **Period covered:** Week 2 | **Date:** 11 Sep 2026

## Objectives vs. achievements

| Objective (per Week 2 brief) | Achieved | Evidence |
|---|---|---|
| Select an accessible model; document capability, cost, latency, privacy, access | ✅ Yes | `docs/model-selection-note.md` — Claude Sonnet 5 selected, with Haiku 4.5 as a cost-tiered secondary |
| Integrate the model into the application | 🟡 Partial | Full ReAct-style pipeline built and navigable end-to-end (`/agent`), but the model call itself is still client-simulated (`console-store.ts`); the real endpoint is stubbed and commented in `src/lib/api/client.ts`, not yet live |
| Create Prompt Specification v1.0 (role, task, context, constraints, output format, failure behaviour) | ✅ Yes | `docs/prompt-specification.md` |
| Create ≥10 test cases with expected vs. actual behaviour | ✅ Yes (10) | `docs/evaluation-table.md` |
| Version ≥2 meaningful prompt iterations | ✅ Yes (v1.0 → v1.1) | `docs/prompt-specification.md`, rationale tied to eval case 5 |
| Week 2 progress report | ✅ Yes | This document |

## Key decisions

1. **Model: Claude Sonnet 5**, not a larger or smaller model. The architecture is read-only tools + RAG, not autonomous execution — the model needs to be reliably grounded and boundary-respecting more than it needs maximum reasoning depth, which put Sonnet ahead of Opus on cost and ahead of Haiku on adversarial robustness. Full reasoning in `docs/model-selection-note.md`.
2. **Build the full pipeline as a real, clickable UI before wiring a live model.** Every stage of the agent loop (retrieval → plan → tool → observation → decision → approval → result) is represented as an actual screen with real data shapes (`src/types/console.ts`), not a diagram. This let the QA/security testing in Week 2 exercise the full boundary matrix and evaluation structure against a concrete artifact instead of a spec on paper.
3. **Treat the AI Boundary Matrix as non-negotiable and enforce it structurally, not just in the prompt.** Submit, approve, release-payment, permission-change, and delete actions are hard-blocked in the UI (the approval step always pauses) independent of what the model decides — so a prompt failure can't turn into an actual unauthorized action.
4. **Ship v1.1 as a targeted, evidence-driven change**, not a rewrite — the only change from v1.0 is the false-premise-verification instruction, directly traceable to the one clean failure in the 10-case table (case 5). This keeps the prompt's change history auditable.

## Risks / challenges

- **Model integration is the critical path for Week 3.** The UI, guardrails, and evaluation structure are ahead of the actual model wiring — until `api/client.ts`'s stubbed endpoints are live, the "10-case evaluation table" reflects a manual walkthrough against the spec, not real model output. This is the single biggest risk to the project staying credible past Week 2.
- **Domain mismatch between the two demo surfaces.** The customer-facing chat/admin flow models refund and account scenarios; the console models a procurement assistant. Both are useful worked examples, but the Prompt Specification currently has to cover both, which makes the constraint list longer than a single-domain agent would need. Needs a decision in Week 3: keep both, or narrow scope to one.
- **Case 10 (multi-issue input) only partially passed.** The agent resolved the primary issue in a combined request but didn't clearly separate the secondary one. This is a known gap, not yet fixed — flagged as a v1.2 candidate rather than folded into v1.1, to keep each prompt version tied to one clear change.
- **No live latency or cost data yet.** All timing in the evaluation table is either simulated or estimated; real numbers will look different once Sonnet is actually in the loop.

## Plan for Week 3

1. Wire `src/lib/api/client.ts`'s stubbed endpoints to a live Claude Sonnet 5 call and replace `console-store.ts`'s scripted progression with real streaming events, using `buildDemoRun`'s shape as the contract.
2. Re-run the 10-case evaluation table against the live model; compare real vs. simulated results and note any regressions.
3. Ship Prompt Specification v1.2 addressing the multi-issue-input gap (case 10).
4. Decide and document the single-domain vs. dual-domain question (procurement vs. customer support) so the Prompt Specification and Boundary Matrix don't have to carry both indefinitely.
5. Expand the evaluation set past 10 cases now that a live model is in the loop, and begin tracking real latency/cost against the Model Selection Note's assumptions.

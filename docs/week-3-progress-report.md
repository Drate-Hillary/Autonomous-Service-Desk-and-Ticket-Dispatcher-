# Week 3 Progress Report — RESOLV-HQ (consolidated)

**Author role:** Project/Requirements Lead | **Period covered:** Week 3 (RAG, retrieval and grounding) | **Compiled:** 3 Oct 2026, retrospectively, from the four workstream reports (dated 18 Sep) and the work done since. Dates are stated as they are; nothing is backdated.

**Backing appendices (kept, not replaced):** [`week-3-yawe.md`](./week-3-yawe.md) (Tasks 1–4, infrastructure) · [`week-3-iryn.md`](./week-3-iryn.md) (Tasks 5–12, connectivity and data access) · [`week-3-opis.md`](./week-3-opis.md) (Tasks 13–17, RAG/LLM and approvals) · [`week-3-hillary.md`](./week-3-hillary.md) (Tasks 18–20, observability and testing) · source breakdown [`week-3-report.docx`](./week-3-report.docx). Those four are point-in-time snapshots from 18 Sep and some of their "not started" rows are out of date; this report is the current position.

## Objectives vs. achievements

| Week 3 objective (brief: RAG minimum) | Status | Evidence |
|---|---|---|
| Retrieval over a controlled corpus | ✅ Working, keyword-based (no embeddings / vector DB — the 18 Sep plan to add one was not pursued; the brief does not require it) | `lib/knowledge-index.ts`, `lib/text-match.ts`, `search_knowledge_base` tool |
| Source grounding (citations) | ✅ Prompt rule + `sources[]` with document and page returned with each answer | `prompt-specification.md`, `lib/ai.ts` |
| Unsupported-answer handling | ⚠️ Specified and partly built, **but weak in practice**: the keyword path answered 5 of 5 unanswerable test questions with an irrelevant passage | [`rag-evaluation-15-case.md`](./rag-evaluation-15-case.md) |
| Corpus / Source Register (10–50 documents) | ⚠️ Written 3 Oct; **corpus has 3 documents (1 substantive) — below the range** | [`corpus-source-register.md`](./corpus-source-register.md) |
| RAG architecture diagram | ✅ Added 3 Oct to the existing architecture diagram (ingestion → storage → ranking → context → citation) | [`architecture-diagram.md`](./architecture-diagram.md) |
| 15-case RAG evaluation (5 answerable / 5 partial / 5 unanswerable) | ⚠️ Run 3 Oct against retrieval + keyword fallback only: **5 pass · 4 partial · 6 fail**. Live-model run still owed | [`rag-evaluation-15-case.md`](./rag-evaluation-15-case.md) |
| ≥3 documented retrieval/grounding failures | ✅ Four, with causes traced to code | [`retrieval-grounding-failures.md`](./retrieval-grounding-failures.md) |

## Workstream task status (Tasks 1–20)

Status as of the 18 Sep appendices, with later changes noted where the task tracker records them. Rows marked † were **not re-verified** for this report.

| Area | Tasks | 18 Sep | Since |
|---|---|---|---|
| Infrastructure (Compose, nginx, env, CORS) | 1–4 | All partial | † No change recorded. Open: vector DB service (no longer needed), SSL/path rewrites, env validation, security headers |
| Connectivity and state | 5, 6, 12 | Done | — |
| Streaming | 7 | Not started | Partly addressed: live messaging/notifications over Server-Sent Events was added 2 Oct (messages, typing, bell). **Token-by-token streaming of model output is still not built** |
| Error boundaries | 8 | Not started | † Not re-checked |
| Mock DB / CSV drivers | 9 | Deviation (real Postgres used) | — |
| Diagnostic tool endpoints | 10 | Not started | Delivered differently: `account_status_lookup` and `outage_status_checker` exist as agent tools in `lib/agent-tools.ts`, not as REST routes |
| Safety layer | 11 | Partial | Strengthened: boundary matrix + `detectBoundaryViolation()` (two-layer guardrail) |
| RAG, gateway, approvals | 13–17 | 13, 14, 17 not started; 15 partial; 16 done | 13: dropped (no vector store). 14: delivered as keyword retrieval + context assembly. 15: gateway, retry and caching code-complete. 17: † dispatch engine not re-checked |
| Observability, CI, E2E | 18–20 | Partial / not started / not started | † No change recorded |

## Key decisions

1. **Keyword retrieval, not a vector store.** The corpus is small and controlled and the brief's minimum is retrieval over it; embeddings were deferred. The 3 Oct evaluation shows the cost: no relevance threshold, so unrelated passages are treated as grounding.
2. **Domain fixed to support-request triage** (25 Sep), which reshaped the Week 3 corpus and prompt work. See [`domain-conflict-resolution.md`](./domain-conflict-resolution.md).

## Risks and challenges

- **The "decline when ungrounded" behaviour is not yet evidenced.** It is specified, but the only test (3 Oct) was against the deterministic fallback, which fails it 5/5. No live model has been run against this corpus because no provider has capacity (Anthropic out of credit, Gemini free tier exhausted).
- **Corpus is far below the brief's 10–50 documents** and contains an off-domain restaurant document and an all-zero report.
- **Appendix drift:** the four workstream reports pre-date most Week 4–5 work; a reader who opens only an appendix will see "not started" for things that now exist.

## Plan

1. Fund one provider, then re-run the 15 questions and the two missing Week 5 traces on a live model.
2. Unpublish the KFC and empty Ticket Summary documents; author ~7–10 synthetic support documents; update the register.
3. Add a relevance threshold and fix the stemmer (F2, F3), then re-test and log in the Week 7 Failure Catalogue.

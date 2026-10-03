# Corpus / Source Register — RESOLV-HQ

**Captured:** 3 Oct 2026 | **Method:** read-only query of `knowledge_documents` and `knowledge_chunks` in the live Supabase database (script run once and deleted, not committed). Counts below are what the agent can actually retrieve from today, not what is planned.

**Retrieval path these documents feed:** `loadPublishedPassages()` (`resolv-hq-backend/src/lib/knowledge-index.ts`) → `scoreText()` (`lib/text-match.ts`) → `search_knowledge_base` tool / `answerQuestion()` fallback. Only `status = 'published'` documents are retrievable. See the [RAG architecture diagram](./architecture-diagram.md#week-3-extension--the-rag-retrieval-path-added-3-oct-2026).

## Register

| # | Document | Source type | Format | Date added | Status | Pages | Passages | Retrievable text? | Role in the corpus |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `Ticket_Summary_2026-08-26_to_2026-09-24` | Team-generated (exported from the system's own reporting) | PDF | 2026-09-24 | published | 3 | 3 | Yes, but **no information** — every metric is `0` | In-domain but empty: a period report with all-zero values. Contributes no answerable facts. |
| 2 | `Resolv_HQ_Billing_Policy` | Team-authored, synthetic ("sample knowledge-base policy for the Resolv-HQ prototype", v1.0, Draft) | PDF | 2026-09-28 | published | 2 | 5 | Yes | The only substantive support document. Covers invoices, payments, refund requests, disputes, AI-assisted billing, the approval workflow. States that prices, refund periods, taxes and providers are **not** specified. |
| 3 | `KFC_Ordering_Steps (1)` | Public web content (a restaurant's ordering instructions and menu prices), copied into a PDF | PDF | 2026-10-01 | published | 1 | 3 | Yes | **Off-domain.** Nothing to do with customer support. Retrievable by any query that shares a word with it (see Findings). |

**Total published documents: 3. Total retrievable passages: 11.**

## Against the brief's requirement

The brief recommends a controlled corpus of **10–50 documents**. The corpus has **3**, of which **1** is substantive, **1** is empty of facts and **1** is off-domain. **It does not meet the 10–50 range**, and the count should not be quoted as meeting it.

Provenance is also uneven: only the Billing Policy is clearly team-authored and in-domain; the KFC document is third-party public content with no stated licence or permission on file.

## Findings

1. **Corpus size gap (blocks the 10–50 requirement).** 7–47 more in-domain documents are needed. The topics the tool catalogue, prompt specification and evaluation table already assume — account access / password reset, outage and service status, request lifecycle and statuses, escalation and approval rules, contact and support hours — have **no document at all**. Several earlier docs (the Week 5 traces, evaluation case 1 and 4) cite an "Account Access Troubleshooting Guide" / "Resetting your password" article; **neither is in the live corpus today** (the Week 5 traces used a fixed three-article test knowledge base, as that report states).
2. **Off-domain contamination.** The KFC document should be unpublished or deleted. Because retrieval is keyword-based with no relevance threshold beyond "score > 0", it can be returned for support queries — see [`rag-evaluation-15-case.md`](./rag-evaluation-15-case.md).
3. **Empty document.** The Ticket Summary has no data; either regenerate it once real tickets exist or unpublish it.
4. **Synthetic content is acceptable but must be labelled.** The Billing Policy says it is a sample. That is fine for a prototype, provided any answer built on it is not presented as real policy. The prompt specification already requires citations, which keeps the source visible.

## What to do (no code needed — admin upload page)

- Unpublish `KFC_Ordering_Steps (1)` (and decide on the empty Ticket Summary).
- Author and upload ~7–10 short synthetic support documents covering the missing topics above, mark them team-authored/synthetic in this register, and re-run the [15-case evaluation](./rag-evaluation-15-case.md) — its "partially answerable" and "unanswerable" cases will change meaning as documents are added, and the "answerable" set should grow.
- Update this register on each upload (one row per document: title, source type, date, page/passage count).

## Draft documents ready to upload (added 3 Oct 2026)

Eight synthetic, team-authored articles are drafted in [`corpus/`](./corpus/). **They are not uploaded and not in the live corpus**, so the table above and the "3 documents" count are unchanged. After upload (admin → Knowledge) and unpublishing the KFC and empty documents, the published corpus would be **9 documents** (these 8 + the Billing Policy) — still one short of the brief's 10–50 range; one more in-domain document (or keeping the Ticket Summary once it has real data) reaches 10.

| Draft | Topic | Fills the gap for |
|---|---|---|
| `01-account-access-and-password-reset.md` | Sign-in, reset link validity (30 min), lockout | Evaluation cases 1 and 4; password questions |
| `02-outages-and-service-status.md` | What an outage is, status page, planned maintenance | `outage_status_checker` context |
| `03-request-lifecycle-and-statuses.md` | Request statuses, priority, reopening | Status questions |
| `04-escalation-and-approvals.md` | When/how escalation and approval happen | Boundary matrix, tool catalogue |
| `05-support-hours-and-contact.md` | Hours, channel, target response times | Support-hours questions |
| `06-refunds-timelines-and-taxes.md` | Refund review (3 business days) and payment (5–10) times, taxes, payment methods, billing-address changes | Partially-answerable refund/tax/address cases |
| `07-attachments-and-file-uploads.md` | File limits, privacy, instructions-in-files | Evaluation case 6 (injection via attachment) |
| `08-ai-assistant-scope-and-limits.md` | Scope, sources, own-data-only, refusals | Boundary questions |

**All figures in these drafts are invented example values** (hours, limits, response and refund times) and every file says so. They are consistent with the numbers used elsewhere in the project docs (30-minute reset link; 3-business-day review; 5–10 day reimbursement) but are not real commercial terms — the team should confirm or change them before treating answers as policy.

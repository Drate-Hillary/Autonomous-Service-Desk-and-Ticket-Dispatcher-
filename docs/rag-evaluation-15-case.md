# 15-Case RAG Evaluation — RESOLV-HQ

**Run:** 3 Oct 2026 | **Owner role:** Quality/Security Lead | **Corpus:** the live published knowledge base — 3 documents, 11 passages (see [`corpus-source-register.md`](./corpus-source-register.md)) | **Method:** a throwaway `tsx` script (deleted after the run, not committed) called the real `loadPublishedPassages()`, `scoreText()` and `answerQuestion()` from `resolv-hq-backend`. The "Actual" column is copied from that run.

> **Read this first — what this does and does not test.** No model provider has capacity (Anthropic out of credit, Gemini free tier exhausted — see the Week 5 traces), so this evaluates the **retrieval layer and the deterministic keyword fallback** only. It does **not** show how a live model behaves when handed these passages; a model may decline an irrelevant passage that this fallback blindly returns. The live-model re-run is still owed. The corpus is also tiny (3 docs, 1 substantive), so "unanswerable" here includes topics a real corpus would cover (password reset, support hours) — those cases should be revisited after the corpus is expanded.

**Pass criteria.** *Answerable:* the returned text states the fact asked for, from the right passage, with the right source. *Partially answerable:* returns what the corpus does say **and** does not imply the missing part exists (ideally says it is not specified). *Unanswerable:* returns the "not covered, want me to raise a request?" response with no sources — not a passage.

## Results

| # | Class | Question | Top passage (score) | Actual (abridged) | Result |
|---|---|---|---|---|---|
| A1 | Answerable | What details should a refund request include? | Billing Policy p1 (5.05) | "A refund request should include the relevant invoice or transaction reference and a clear explanation of the reason…" | ✅ Pass |
| A2 | Answerable | What statuses can a payment show? | Billing Policy p1 (2.00) — **wrong passage** | Returned the "AI-Assisted Billing Support" sentence, which only *mentions* "payment statuses". The passage that lists them (*pending, successful, failed, refunded*) ranked below it. | ❌ **Fail** — F3 |
| A3 | Answerable | Can the AI assistant process a refund by itself? | Billing Policy p1 (2.30) | "The AI assistant must not independently perform restricted billing actions…" | ✅ Pass |
| A4 | Answerable | How do I raise a billing dispute? | Billing Policy p1 (3.45) | "Customers may raise a billing dispute through the Resolv-HQ support system." | ✅ Pass |
| A5 | Answerable | What should an invoice clearly identify? | Billing Policy p1 (4.60) | Contains "customer, invoice reference, applicable charges, issue date, due date, and payment status", preceded by an unrelated "Purpose" sentence | ✅ Pass (noisy) |
| P1 | Partial | How many days does a refund take? | Billing Policy p1 (1.45) | Returned the Payments + Refund Requests text. States no number (no fabrication) but never says the period is unspecified. | ⚠️ Partial |
| P2 | Partial | Which payment providers do you accept? | Billing Policy p2 (2.00) | "Specific prices, refund periods, taxes, payment providers… should be added by the organization…" — effectively says it is not specified | ✅ Pass |
| P3 | Partial | Are taxes included in my invoice? | Billing Policy p1 (1.45) | Returned the Purpose/Invoices text. Does not say taxes are unspecified; the sentence that does ranked lower. | ⚠️ Partial |
| P4 | Partial | How do I update my billing address? | Billing Policy p1 (1.45) | Returned the title/Purpose and "customers are responsible for providing accurate billing information". No update procedure exists in the corpus; this does not say so. | ⚠️ Partial |
| P5 | Partial | What is the refund period and who approves it? | Billing Policy p2 (2.00) | Surfaced "refund periods… should be added by the organization" (the gap) but not "an authorized administrator" (the answerable half). | ⚠️ Partial |
| U1 | Unanswerable | How do I reset my password? | Billing Policy p2 (1.00) | "Customers should not share passwords, authentication codes… when submitting a billing support request." Served as the answer. | ❌ **Fail** — F2 |
| U2 | Unanswerable | What are your support opening hours? | Billing Policy p1 (1.45) | Returned three sentences about reviewing tickets / the support team. Not hours. | ❌ **Fail** — F2 |
| U3 | Unanswerable | How do I cancel my subscription? | Ticket Summary p1 (1.00) | "0 resolved 0 closed 0 cancelled Page 1 of 3" — matched on the word "cancel". | ❌ **Fail** — F2 |
| U4 | Unanswerable | How much does a Big Boss Burger meal cost? | KFC Ordering Steps p1 (4.30) | Returned the full KFC menu and prices (42,000 UGX). | ❌ **Fail** — F4 |
| U5 | Unanswerable | Where is my delivery driver right now? | KFC Ordering Steps p1 (1.30) | Returned KFC delivery-ordering instructions. | ❌ **Fail** — F4 |

## Summary

| Class | Pass | Partial | Fail |
|---|---|---|---|
| Answerable (5) | 4 | 0 | 1 |
| Partially answerable (5) | 1 | 4 | 0 |
| Unanswerable (5) | **0** | 0 | **5** |
| **All (15)** | **5** | **4** | **6** |

- **Retrieval finds the right document well when one exists** (4/5 answerable; the right *document* in all 5 — A2 failed on the right document, wrong passage).
- **The deterministic fallback cannot say "I don't know".** It declines only when *no* query term appears anywhere in the corpus. With 11 passages, almost any question shares at least one word with something, so **all five unanswerable questions were answered with an irrelevant passage** — the exact failure the brief's "unsupported-answer handling" is meant to prevent, and the very thing the prompt spec's "decline if ungrounded" rule is meant to catch on the model path.
- **Partially answerable questions get the nearest passage, not an honest "only part of this is covered".** Nothing was fabricated, but the gap was disclosed in only 2 of 5 cases, and one of those (P2) was luck.
- Failure causes are written up in [`retrieval-grounding-failures.md`](./retrieval-grounding-failures.md).

## Not covered / next

- **Live-model run:** the same 15 questions must be re-run once a provider has capacity, recording the model's final text, whether it cited correctly, and whether it declined U1–U5. Until then the claim "the system declines ungrounded questions" rests on the prompt rules and the deterministic boundary layer, not on evidence from this test.
- **Corpus size:** re-run after the corpus reaches 10+ in-domain documents; expect the answerable set to grow and the off-domain/empty documents to be removed first (register findings 2–3).
- **Query-stability:** each question was run once; results are deterministic for the fallback path.

## Re-run after retrieval fixes (3 Oct 2026, same corpus, same 15 questions)

Changes under test (`resolv-hq-backend/src/lib/text-match.ts`, `ai.ts`, `agent-tools.ts`): a relevance rule (`isRelevant()` — a passage counts as grounding only if it matches at least half of the query's distinct terms, minimum two; one-term queries need that term), a stemmer fix ("statuses" → "status"), and a tie-break preferring the shorter passage. Type-check and lint clean. Still retrieval + keyword fallback only — **no live model.**

| # | Before | After | What changed |
|---|---|---|---|
| A2 | ❌ | ✅ | Now returns "Payment status may be shown as pending, successful, failed, or refunded." |
| P1 | ⚠️ | ⚠️ | Now returns the not-covered response (the corpus does not give a refund duration) — honest, but does not also say what *is* known about refunds |
| P3, P4 | ⚠️ | ⚠️ | Now return the not-covered response instead of an unrelated passage — no longer misleading, still not "partially answered" |
| U1, U2, U3, U5 | ❌ | ✅ | Return "I couldn't find an exact match… want me to start a request?", no sources |
| U4 | ❌ | ❌ | **Unchanged**: the KFC document genuinely matches 4 of 6 terms. Fixed only by unpublishing it (a content action, not code) |
| A1, A3, A4, A5, P2, P5 | as before | as before | No regression |

**Updated totals: 10 pass · 4 partial · 1 fail** (was 5 · 4 · 6). Answerable 5/5, partial 2 pass (P2, P5) and 3 partial, unanswerable 4/5.

**Caveat on the numbers.** I wrote the fixes after seeing these 15 failures and then re-ran the same 15, so the improvement is partly fitted to the test set. It shows the specific defects are gone, not that retrieval is generally good; a fresh question set is needed. The new threshold may also hurt recall (it can now reject a one-sentence match on a long question); this was not measured.

**Draft corpus not included in this run.** Eight new synthetic support documents are drafted in [`corpus/`](./corpus/) but are **not uploaded**, so this run used the 3 live documents. Once uploaded, several "unanswerable" cases (U1 password reset, U2 support hours, P1 refund time, P3 taxes, P4 billing address) become answerable by design and should be re-labelled and replaced with fresh unanswerable questions.

# Retrieval and Grounding Failures — RESOLV-HQ

**Compiled:** 3 Oct 2026 | **Owner role:** Quality/Security Lead | **Evidence:** [`rag-evaluation-15-case.md`](./rag-evaluation-15-case.md) (run 3 Oct against the live corpus), [`evaluation-table.md`](./evaluation-table.md) case 5, [`tool-failure-auth-test-evidence.md`](./tool-failure-auth-test-evidence.md).

The brief asks for at least three real, explained retrieval/grounding failures. Four are below (F1–F4), each with the observed behaviour, the cause traced to code, and a suggested fix. **Update 3 Oct:** F2 and F3 are fixed in code and F4 is mitigated for the test set (see "Fix status" below); F1 was fixed in prompt v1.1. The Week 7 Failure Catalogue still owns the formal re-test on a live model. These are failures of the **retrieval layer and keyword fallback**; none was observed on a live-model answer, which has not been tested against this corpus (no provider capacity).

---

## F1 — False premise not verified *(prompt level; from the Week 2 evaluation)*

- **Observed:** evaluation case 5 — the user assumed a discontinued self-service feature still exists; the agent reasoned as if it did, without checking the knowledge base first.
- **Cause:** prompt v1.0 had no instruction to verify a user's stated premise against a source before acting on it.
- **Status:** addressed by prompt v1.1 (`prompt-specification.md`). Included because it is a grounding failure with a recorded fix, but note the v1.1 re-test was a manual walkthrough, not a live run.

## F2 — No relevance threshold: an unrelated passage is served as the answer

- **Observed (3 of 15 cases):**
  - "How do I reset my password?" → *"Customers should not share passwords… when submitting a billing support request."*
  - "What are your support opening hours?" → three sentences about ticket review.
  - "How do I cancel my subscription?" → *"0 resolved 0 closed 0 cancelled Page 1 of 3"* from an empty ticket report.
- **Cause:** `answerQuestion()` (`lib/ai.ts`) falls through to "I couldn't find an exact match" only when `ranked.length === 0`, i.e. **no passage scored above 0**. `scoreText()` (`lib/text-match.ts`) awards a point for any single shared word. One coincidental word ("password", "support", "cancel") is therefore enough to count as grounded. The `search_knowledge_base` tool applies the same `score > 0` filter, so the model path is handed the same irrelevant passages as context. This is the same weakness first logged in `tool-failure-auth-test-evidence.md`.
- **Impact:** the user receives a confident, cited-looking, wrong-topic answer instead of the "not covered — want me to raise a request?" response.
- **Suggested fix:** require a minimum score *relative to the number of distinctive query terms* (e.g. at least half of them matched, or a floor such as 2.0 for queries of 3+ terms) before treating a passage as grounding; below it, return the not-covered response and no sources.

## F3 — Stemmer mangles a word and the right passage ranks second

- **Observed (A2):** "What statuses can a payment show?" returned a passage that only *mentions* "payment statuses", not the passage that lists the statuses (*pending, successful, failed, refunded*).
- **Cause:** `stem()` (`lib/text-match.ts`) turns "statuses" into **"statuse"** — the `…es` rule only strips for `ss|sh|ch|x|z` endings, so "statuses" falls through to the plain-`s` rule and loses one character, not two. "statuse" is not a substring of the document's "status", so the term never matches the Payments passage. The other passage matched on both "payment" and the literal "statuses" and won.
- **Impact:** a correct document, wrong passage; the user is not told the actual values.
- **Suggested fix:** handle `…uses`/`…ses` endings ("statuses"→"status", "addresses"→"address") or match on a shared prefix instead of an exact stem; add "statuses" to the stemmer unit cases.

## F4 — Off-domain document is retrievable for support queries

- **Observed (U4, U5):** "How much does a Big Boss Burger meal cost?" returned a KFC Uganda menu with prices; "Where is my delivery driver right now?" returned KFC delivery-ordering instructions.
- **Cause:** a restaurant ordering guide is published in the same corpus as the support policy (`corpus-source-register.md` row 3), and retrieval has no notion of topic or document scope — every published document is searched for every query.
- **Impact:** two effects. A support agent can quote a restaurant's prices as if they were Resolv-HQ information; and a delivery question (plausible for customers) is "answered" from an unrelated document.
- **Suggested fix:** unpublish the document (immediate); longer term, consider a per-document category/scope filter so only support-domain documents are searched.

---

## Also observed (not counted as separate failures)

- **Partial answers do not disclose the gap** (P1, P3, P4, P5): the fallback returns the nearest passage and never says "this part is not specified". Same root cause as F2 — the retrieval layer has no signal for "partially covered".
- **Fallback answers include unrelated leading sentences** (A5): `bestSentences()` falls back to a passage prefix when sentence scores tie, so a noisy "Purpose" sentence appeared before the relevant one. Cosmetic.

## Re-test plan

After each fix, re-run the 15-case set and confirm: F2 → U1–U3 return the not-covered response; F3 → A2 returns the Payments passage; F4 → U4/U5 return the not-covered response. Record before/after in the Week 7 Failure Catalogue. Re-run on a live model as well once a provider has capacity.

## Fix status (3 Oct 2026)

| Failure | Status | Re-test result (15-case set, keyword path) |
|---|---|---|
| F1 | Fixed in prompt v1.1 (earlier) | Not re-run live |
| F2 | **Fixed** — `isRelevant()` in `lib/text-match.ts`, applied in `answerQuestion()`, `rankKnowledge()` and the `search_knowledge_base` tool | U1, U2, U3 now return the not-covered response |
| F3 | **Fixed** — `stem()` maps "statuses" → "status" | A2 now returns the passage listing the payment statuses |
| F4 | **Not fixed in code, by design** — the retrieval is behaving correctly; the KFC document must be unpublished (admin action). U5 happens to decline now (only 1 of 4 terms matched); U4 still fails | U4 ❌ unchanged |

Caveats: the fixes were written after seeing these failures and re-tested on the same 15 questions, so the result is not independent; recall impact of the stricter threshold is unmeasured; none of this has been run against a live model.

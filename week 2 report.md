# Week 2 Report — Role & Deliverable Breakdown

## Technical Version

### Person 1 — Integration Lead

- Select and integrate the foundation model into the RESOLV-HQ application; establish a working baseline request/response pipeline through the ReAct agent core.
- Produce the Model Selection Note (max 1 page): capability, cost, latency, privacy, and access considerations, justified against the system's RAG + read-only tool architecture.

### Person 2 — AI Engineering Lead

- Draft Prompt Specification v1.0: role, task, context, constraints (aligned to the AI Boundary Matrix — no refunds, no account mutations, decline if ungrounded), output format, failure behaviour.
- Produce at least two versioned prompt iterations (v1.0 → v1.1) with documented rationale for each change.

### Person 3 — QA & Security Lead

- Design 10 test cases covering the baseline prompt, derived from existing user stories (vague intent, multi-issue input, unanswerable policy question, tool-unavailable scenario, etc.).
- Execute the test cases and compile the expected-vs-actual evaluation table.

### Person 4 — Project Lead

- Author the Week 2 Progress Report (1–2 pages): objectives vs. achievements, key decisions, risks/challenges, plan for Week 3.
- Consolidate all Week 2 deliverables into the submission package and update GitHub/ClickUp evidence links.

---

## Plain Language Version

**Person 1** — Picks which AI model to use and gets it actually talking to the app. Writes a short note explaining why that model (cost, speed, privacy, how to access it).

**Person 2** — Writes the instructions the AI follows (its "job description"): what it's allowed to do, what it can't do (no refunds, no account changes), how it should respond, what to do if it fails. Then improves those instructions once based on testing, keeping both versions.

**Person 3** — Comes up with 10 different test questions/situations to throw at the AI, runs them, and writes down whether it did what it was supposed to.

**Person 4** — Writes the short weekly report (what got done, decisions made, problems, next steps) and pulls everything together into one submission package, making sure it's all uploaded to GitHub/ClickUp.

# Upfront interview preparation

Implemented 2026-10-20. The learner selected the $2 API-equivalent default.

## Behavior

New interview question imports create an outline and automatically prepare its core lessons in prerequisite order. One import is one interview question; server validation rejects a planner splitting it into extra questions. Personal project lessons remain on demand. Existing questions have Prepare all core lessons, live status, and Stop preparation. Opening a page or restarting the server never starts a paid job. Existing audited lessons are reused without changing content, progress, chat, drafts or manual completion. Optional refreshers, extensions and the preserved Previous path are not auto-generated.

A path is Ready only when every core lesson has passed executable checks, successful source retrieval, semantic audit, exact evidence-quote validation and a disk save. The UI reports partial readiness explicitly. A failure stops the batch, preserves completed work and requires an explicit Resume action; there is no automatic retry loop. Resume never resets a budget. A server restart reports interrupted work and keeps reserved charges.

## Enforced workload limits

Each question has one versioned preparation.json ledger in its existing ticket folder, plus a previous-file backup. New outline attempts have a persistent identity derived from the import fields; repeated imports reuse the outline and its spend. Outline requests transfer into the same per-question budget. Tutor chat is separately billed against plan usage and is not part of preparation.

| Policy | Input tokens used or reserved | Output tokens used or reserved | Core lessons | Model requests |
| --- | ---: | ---: | ---: | ---: |
| $2 default | 600,000 | 80,000 | 8 maximum | 24 maximum |
| $1 option | 300,000 | 40,000 | 8 maximum | 24 maximum |

Budgeted preparation is pinned to GPT-6.1 Sol so the API-equivalent estimate has a known basis ($2 input/$10 output per million Standard tokens, checked during this development session). It does not measure actual ChatGPT credit deductions or impose an account-wide spend cap. The limits apply to this local app's preparation flow. Two different imported questions have independent budgets.

Before each request, persist a conservative input reservation based on UTF-8 serialized text bytes plus 4,096 framing allowance, and reserve 8,000 output tokens. Only text inputs are accepted. The actual Responses request sends max_output_tokens=8000, which includes reasoning as documented in the [official API reference](https://developers.openai.com/api/reference/python/resources/responses/methods/create). The server checks remaining input/output reservations and request count BEFORE sending. Valid provider-reported usage settles the reservation, counting reasoning once within output. Unavailable or excessive usage retains the full reservation and stops the batch. Unknown/future/corrupt budget formats fail closed. Resuming a question cannot change its model, budget policy or core scope. A model cannot create extra lessons by returning additional concepts inside a lesson response; only the validated core IDs are scheduled.

The dollar label is an API-equivalent workload bound based on conservative text-input accounting and enforced output/request limits, not an exact cash/credit guarantee from OpenAI. Large source passages can make the app pause conservatively before the measured usage reaches the label. No API key or separate API billing fallback is introduced.

## Learning resources and design

Research through the learner's Ego browser:

- [NeetCode roadmap](https://neetcode.io/roadmap): organize transfer practice by reusable pattern families. Implemented as pattern-specific guidance and an optional roadmap link.
- [GeeksforGeeks interval approaches](https://www.geeksforgeeks.org/dsa/merging-intervals/): compare a small naive model with a state-preserving sorted scan. The actual fetched excerpt contains both approaches; for Merge Intervals scan/transfer lessons it supplements the primary Princeton interval reference, while strict claim auditing remains required. Original readings/exercises must not copy its worked solution.
- [VisuAlgo sorting](https://visualgo.net/en/sorting): visual state changes, controllable input, algorithm traces and prediction questions. Implemented as a relevant optional visualization link plus stronger state-trace/prediction guidance. The external visualization is not embedded or presented as an app-executed trace.
- [CP-Algorithms DSU](https://cp-algorithms.com/data_structures/disjoint_set_union.html): establish representation/operations, then derive a naive implementation, optimization and applications. Its host is now supported for relevant planner-selected evidence; this does not add DSU lessons to unrelated questions.
- Tech Interview Handbook and official language documentation remain available. Supplemental resources are explicitly distinguished from fetched and audited lesson evidence; worked solutions stay behind an optional disclosure.

Interview generation now asks for a recognition cue, an intuitive state/invariant trace, a justified contrast with a tempting alternative, one-rule Modify, and independent transfer Practice with less scaffolding. Prior saved prerequisite goals/summaries help maintain continuity. These strengthen the existing four-stage workflow without expanding the required concept count, changing the learner profile or inventing proficiency.

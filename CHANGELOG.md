# Changelog

## 0.2.0 — 2026-10-20

Derived from aayush7511/concept-lab at 291a5a599b9b75bd1d6f6db8136209ceb3195d18; MIT license retained.

- Added project-name/specification inputs, personal and interview tracks, independent per-ticket prerequisite paths, optional selected read-only repo files, and the learner's byte-level BPE acceptance ticket.
- Replaced production's single library file with immutable versioned JSON files under scoped track/project/ticket folders. An atomic catalog commits saves. Retained backup recovery and added one-way legacy progress migration with a preserved input archive; future schemas are rejected.
- Separated OAuth credentials into a protected directory outside the learning folder; token handling remains server-side.
- Added append-only chat/attempt/draft/feedback logs, compiler/test diagnostics and code changes, manual stage completion, mistake categories and flags, explicit GPT classification, bounded summaries and evidence-based cross-project observations.
- Added server-side resume selection, explicit save/end-session action, shared profile/context loading, and remediation recommendations for subsequent lessons/tutor responses.
- Separated the reading, editor/output, and tutor panels; added interactive visual stepping and a UTF-8 BPE merge demonstration.
- Added direct Java/C++/Rust compile/run adapters and toolchain discovery. Rust still requires installation and live verification on this machine.
- Required successful source retrieval and a semantic claim audit with exact supporting-quote checks before saving newly generated lessons. Legacy supplied lessons retain progress but require an audit before publication.
- Added storage/migration, isolation, claim rejection, BPE-byte preservation, independent curriculum, and toolchain regression tests. See docs/verification.md in the parent learning workspace for actual results and live checks still pending.

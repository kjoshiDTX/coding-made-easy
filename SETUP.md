# Coding Made Easy

This is a local extension of [Concept Lab](https://github.com/aayush7511/concept-lab), retaining its MIT license and upstream history.

From this directory:

```sh
npm run doctor
npm start
```

Open http://127.0.0.1:4318. No npm dependency installation is required. The macOS runner needs the appropriate installed language toolchain. Java/C++/Rust compile in isolated scratch folders; Go/Python retain the existing execution path.

The default learning root is the parent of this checkout. Override it with CODING_LEARNING_ROOT when placing the app elsewhere. OAuth credentials default to ~/Library/Application Support/coding-made-easy/auth and are never put in the learning root. CODING_AUTH_DIR can override the credential directory, but keep it outside the learning root and never commit/share it. Runtime overrides remain available in ignored .local/runtimes.json or CONCEPT_LAB_* environment variables.

The app seeds the exact learner-supplied llm inference project ticket and a small initial prerequisite outline. This outline does not consume GPT usage. Open a concept and generate its lesson on demand after connecting ChatGPT from workspace settings. Generation also runs examples/reference tests and audits source evidence; it may reject a lesson instead of saving broken or unsupported content.

Project name and Specification are the main inputs. Choose Personal projects or LeetCode/interview; language and selected repo files are optional configuration. Large specs are preserved up to 1,000,000 characters, but the selected model may reject requests that exceed its context window. There is no silent truncation or automatic paid API fallback.

Progress and cached lessons live in tracks/, raw attempts/chat are JSONL, source content is in cache/, and .workspace/catalog.json selects the committed versions. Immutable files preserve prior revisions; do not delete them individually. Back up the complete learning root, excluding disposable runner cache if desired. Credentials need a separate private backup/sign-in procedure. The first production launch imports a legacy .local/library.json if present and archives its learning content without copying sibling credential files.

The shared profile is learner/profile.md. Bounded learner/patterns.md and concept summaries record observed categories and suggested review. The tutor receives only the profile, bounded global/scoped summaries, selected repo excerpts, current work and recent chat. The full raw history stays on disk. No unobserved proficiency or learner mistakes are assumed.

Workflow comments are stored in feedback/requests.jsonl for a development session you explicitly request. The app does not edit its own source. Each development change should update CHANGELOG.md and run relevant tests/migration checks.

Known first-build limits: the tested extension is available in [draft PR #1](https://github.com/kjoshiDTX/coding-made-easy/pull/1); live GPT generation/tutoring and semantic auditing await an eligible ChatGPT sign-in; Rust execution awaits installation. The sandbox intentionally has no network or third-party package installation. For the final real-Hugging-Face comparison, explicitly run npm run prepare-qwen to download the official tokenizer JSON and install tokenizers into an isolated local venv. This downloads no model weights. The runner then exposes QWEN_TOKENIZER_PATH and the package read-only while keeping exercise networking disabled. This opt-in setup has not yet been run here. Specs over 80,000 characters use segmented extraction only after a request-count confirmation; the original input remains intact and extraction notes retain character ranges. Legacy supplied/cached Go readings retain their progress but require a source audit before opening. Newly generated readings use the same stricter gate.

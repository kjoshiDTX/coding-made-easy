# Coding Made Easy

A local, project-driven learning workspace extending [Concept Lab](https://github.com/aayush7511/concept-lab).

Enter **Project name** and **Specification**. Choose a personal ticket or an interview problem, then work through **Learn → Predict → Modify → Practice** toward completing it yourself.

- Reading on the left, code and execution output in the middle, persistent GPT tutor on the right at desktop widths.
- Personal-project and interview tracks; independent ticket curricula, manual completion, saved drafts and resume position.
- Append-only attempt/chat logs, explicit mistake categories, bounded scoped summaries, and shared Codex/Claude learner context.
- Go, Java, C++, Python and Rust runner adapters using the local macOS sandbox. Toolchains must be installed; Rust remains unverified on the development machine.
- Eligible ChatGPT sign-in for on-demand lessons, tutor questions and source audits, with no automatic API-billing fallback.
- Newly generated lessons require retrieved sources, executable reference checks and supporting-claim audits before saving. Existing supplied/cached Go lessons require an audit before opening; prior progress is preserved.
- Workflow feedback is saved for a development session you request.

```sh
npm run doctor
npm start
```

Open http://127.0.0.1:4318. No npm install is needed.

Read [SETUP.md](SETUP.md) for data paths, account setup, backups, optional Qwen tokenizer preparation and current limitations. Read [CHANGELOG.md](CHANGELOG.md) for changes from upstream. Run `npm test` in a normal macOS terminal; an outer agent sandbox can prevent the runner from applying its own sandbox.

The first saved ticket is **llm inference project / Challenge 1.1**, the learner's byte-level BPE task. Its initial outline is provided without spending credits. Additional lessons generate on demand after sign-in.

MIT license. Original Concept Lab copyright and third-party notices are retained. This app does not claim validated learning outcomes or infallible AI source verification.

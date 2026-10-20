# Lesson generation usage

Estimates checked 2026-10-20. These are planning estimates, not measured historical usage or guaranteed limits.

## Pipeline

A new lesson normally uses two model requests: lesson generation, then semantic source audit. Code validation runs locally. One code-repair request may occur before the audit, for three total. A failed source audit still consumes the requests already completed. Clicking Generate again starts another attempt. Opening an already verified, cached lesson makes no model request. Outline generation and tutor chat are separate.

The source passages and lesson JSON are sent again for the audit; the cost is more than just the visible reading. Reasoning tokens can also increase output usage. A more advanced topic does not necessarily cost more per token, but can require more context, reasoning or repair attempts. The larger difference in total path cost is how many lessons are generated.

## Rough per-lesson budget

For GPT-6.1 Sol, assuming Standard short-context API rates, uncached input and no code-repair request:

| Lesson | Total input tokens across generation + audit | Total output tokens, including reasoning | API-equivalent estimate |
| --- | ---: | ---: | ---: |
| Focused interview pattern | 15,000–30,000 | 5,000–15,000 | $0.08–$0.21 |
| Systems/LLM concept | 25,000–60,000 | 8,000–30,000 | $0.13–$0.42 |

Formula: input / 1,000,000 × $2 + output / 1,000,000 × $10. These are budgeting ranges inferred from bounded source excerpts, prompt size and structured lesson output, not a measured comparison of the two tracks. Extra reasoning, retries, a larger repo context or different model can exceed them; cached input may reduce them. A rough 4-lesson interview path would therefore be $0.32–$0.84 API-equivalent; 10 systems lessons $1.30–$4.20, before repairs and tutor chat.

[Official API pricing](https://developers.openai.com/api/docs/pricing) lists GPT-6.1 Sol Standard short-context input/output at $2/$10 per million tokens. These dollar figures are an illustration for comparing workload, not the bill charged by this app. The app uses the learner's [eligible ChatGPT plan/available credits through OAuth](https://developers.openai.com/siwc/quickstart), without an API key. The actual allowance/credit deduction depends on the account and plan; no claim that an API-equivalent dollar maps exactly to purchased ChatGPT credits is made.

## Measurement added in this revision

Future generation attempts retain provider-reported input/output, cached-input and reasoning tokens from the Responses terminal event, including provider failures when usage is supplied. Reasoning is part of output and is not added twice. Each attempt aggregates all its generation, repair and audit requests. Metadata is appended to usage/generations.jsonl; the last scoped result is stored under cache/usage/<project>/<concept>.json and shown in the lesson UI, including after a failed audit or reload. Prompts, outputs, source text and credentials are not stored in these usage records. Missing provider usage is explicitly marked unavailable/partial, never represented as a complete zero-cost result. Earlier attempts cannot be retroactively measured.

A cheaper model could reduce usage costs substantially, but changing the default requires the learner's choice and a quality comparison. No default-model change was made.

## First measured interval attempt

2026-10-20: the learner approved one GPT-6.1 Sol generation. It completed the writing and semantic-audit requests in 112 seconds: 13,071 input tokens; 5,314 output tokens, including 326 reasoning tokens; zero cached input tokens. API-equivalent at the rates above: $0.079282. This was a failed attempt, not a successfully published lesson: executable checks passed without a repair request, but the audit rejected inline Python list/indexing/function explanations absent from the excerpts. Mathematical interval claims were no longer listed as unsupported. The subsequent source-bundle fix adds the official Python list and function tutorial sections; fetching those sources and local tests do not consume generation credits. No second live generation was run under this approval. One failed attempt is not a representative success-cost benchmark.

Second separately approved attempt: 120 seconds, two requests, 20,248 input tokens, 5,717 output tokens including 411 reasoning, zero cached input. API-equivalent $0.097666. Code checks passed without repair, but the source audit correctly withheld publication for missing explicit support for Python `and` and Boolean comparison results. Added the official language reference sections for comparisons and Boolean operations after verifying the actual retrieved text. No third generation was run. The two measured failed attempts total 33,319 input / 11,031 output tokens, $0.176948 API-equivalent. Neither is a successfully published-lesson benchmark.

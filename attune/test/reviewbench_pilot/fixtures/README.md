# Frozen pilot run-half fixtures

These are ordinary repo fixtures: the provider-free pilot run-half stages read
them and never fetch the corpus. Every one is derived from a RETAINED pilot
artifact; nothing here is invented and no raw frozen record was rewritten.

| fixture | source |
| --- | --- |
| `pilot-predictions.tsv` | the frozen per-slot prediction record (20 slots) |
| `pilot-checkpoints.tsv` | the 17 durable committed checkpoint rows exactly as the guard wrote them |
| `pilot-finals.tsv`, `pilot-final-findings.tsv` | the non-empty FINAL deliveries and their normalized findings |
| `pilot-checkpoint-findings.tsv` | the normalized durable checkpoint candidates |
| `pilot-diagnostics.tsv` | the frozen early-recovery diagnostic (prepared ledger counts, not a model-delivered claim) |
| `pilot-delivery-metrics.tsv` | the ACTUAL accepted-delivery metrics of all 20 slots, derived from each slot's retained native `events.jsonl` by joining every `tool_result` to its own `tool_call` (tool name + operation). Only an accepted (`status=completed`), non-error `read`/`whole-file` result delivers source text, and its bytes are the lossless UTF-8 byte length of the rendered body VERIFIED against the header's own declared delivered count; `list` MANIFEST-metadata calls are reported in their own columns and contribute zero delivered source bytes. Corrected 2026-10-10 (the prior code-unit/list-inclusive version is preserved in the mission library under `library/dsh-gate-evidence/pilot-run/prior-incorrect-delivery/`). |
| `pilot-usage.tsv` | the pre-fix usage reconciliation |
| `pilot-invocations.tsv` | the raw canonical append-only ledger copy (preserved byte-exact) |
| `pilot-invocations-corrected.tsv` | the separately versioned invocation projection derived from each slot's own retained build log; `obs-2` stays `Unavailable` |
| `pilot-tool-outcomes-corrected.tsv` | the separately versioned tool-outcome projection joined by call identity and tool name; separates commit / source / packet refusals |
| `pilot-judgments.tsv`, `pilot-adjudications.tsv` | the frozen raw verdicts of the ONE independent judge acquisition |
| `pilot-judge-sessions.tsv`, `pilot-judge-failures.tsv` | the judge session receipts (0 failures) |
| `pilot-changed-<task>.tsv` | each task's own changed-file manifest (for the outside-neighborhood view) |
| `reference-<task>.tsv`, `reference-population.tsv`, `reference-summary.tsv`, `reference-severity.tsv`, `reference-eligibility.tsv` | the frozen all-ten-task reference population (130 positives, 62 medium-high) |

The generation scripts live in the mission library under
`library/dsh-gate-evidence/pilot-judge/` (`build-fixtures.mjs`,
`project-tool-outcomes.mjs`, `project-invocations.mjs`, `run-judge.mjs`).

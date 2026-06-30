# Effect Packet Ablation Slice Analysis

Generated: 2026-06-29
Benchmark run: `effect-packet-ab-fastpath-20260629-114552`
Primary report: `reports/tend-opencode-codex-measurement/effect-packet-ablation-benchmark.md`

## Executive Read

This slice is useful, but it should be treated as a benchmark shakeout rather
than a clean agent-performance result.

The headline scorecard says every arm cleared the fixed packet, and
`opencode-raw-effect` won token efficiency. The traces show a sharper story:
all four arms made the same intended source edit in
`packages/canopy/home-deployment/src/providers.ts`, while both OpenCode arms
also fixed two same-rule diagnostics in
`packages/trellis/language-service/src/index.ts`. Those extra edits improved
OpenCode's hidden full-inventory score, but they are evaluator/framework-surface
work, not the intended source migration slice.

The current target-packet scoring also overstates Codex packet progress. Codex
arms still had two `effect/effectSucceedWithVoid` diagnostics remaining in the
hidden full evaluator, but the report's `targetPacketEvaluation` counted all
three safe fixes resolved. That makes `validated packet clears` too generous
for Codex in this run.

## What Was Actually Measured

The live target was a tiny `effectSucceedWithVoid` slice:

| Fact | Value |
| --- | --- |
| Hidden base Effect diagnostics | 150 |
| Fixed packet summary | one `effectSucceedWithVoid` packet |
| Safe fix count reported for packet | 3 |
| Source files actually touched by every arm | `packages/canopy/home-deployment/src/providers.ts` |
| Additional files touched by OpenCode arms | `packages/trellis/language-service/src/index.ts` |
| Raw prompt/conversation/diff storage | not stored in reports |

Every arm made this source migration:

```ts
return Effect.void.pipe(Effect.as(undefined))
```

That replaced one `Effect.succeed(undefined)` in the provider source. The
OpenCode arms also replaced two additional `Effect.succeed(undefined)` instances
in Trellis language-service code.

## Corrected Outcome View

| Arm | Reported Validated Packet Clears | Hidden Full Clears | Source Provider Clears | Remaining Hidden `effectSucceedWithVoid` | Tokens | Tokens / Source Clear |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `opencode-effect-packets` | 3 | 3 | 1 | 0 | 1,146,479 | 1,146,479 |
| `codex-effect-packets` | 3 | 1 | 1 | 2 | 2,757,484 | 2,757,484 |
| `opencode-raw-effect` | 3 | 3 | 1 | 0 | 536,710 | 536,710 |
| `codex-raw-effect` | 3 | 1 | 1 | 2 | 1,535,429 | 1,535,429 |

Interpretation:

- `opencode-raw-effect` is still the clear token-efficiency winner on this
  slice.
- The 3-clear score for OpenCode includes two out-of-target evaluator-surface
  fixes.
- The 3-clear score for Codex is a scorer artifact; hidden diagnostics show
  only one same-rule diagnostic actually cleared.
- Source-only output quality is effectively tied: each arm fixed the provider
  line.

## Backfilled Corrected Projection

This backfill treats the original report as historical input and projects the
slice with the corrected scorer vocabulary now used by target status. It does
not reread raw prompts, conversations, traces, patch text, raw diffs, full
source files, or command output.

| Arm | Legacy Validated Clears | Exact Target Clears | Source-Scope Clears | Precision-Adjusted Source-Scope Clears | Scorer Caveats |
| --- | ---: | ---: | ---: | ---: | --- |
| `opencode-effect-packets` | 3 | 1 | 1 | 1 | `aggregate-safe-fix-count-mismatch`; `hidden-diagnostic-clear-mismatch`; out-of-scope Trellis language-service cleanup |
| `codex-effect-packets` | 3 | 1 | 1 | 1 | `aggregate-safe-fix-count-mismatch`; Codex targetPacketEvaluation overcounted remaining same-rule diagnostics |
| `opencode-raw-effect` | 3 | 1 | 1 | 1 | `aggregate-safe-fix-count-mismatch`; `hidden-diagnostic-clear-mismatch`; out-of-scope Trellis language-service cleanup |
| `codex-raw-effect` | 3 | 1 | 1 | 1 | `aggregate-safe-fix-count-mismatch`; Codex targetPacketEvaluation overcounted remaining same-rule diagnostics |

Backfilled target-status interpretation:

- Exact clears and source-scope clears are `1` for every arm, because the
  predefined source migration was the single provider edit in
  `packages/canopy/home-deployment/src/providers.ts`.
- The original `3` validated clears came from an aggregate safe-fix count and
  broad same-rule scoring, so it is a legacy metric caveat rather than primary
  progress.
- Hidden full-inventory clears remain useful context, but OpenCode's extra
  Trellis language-service edits are outside the allowed source migration
  scope for this slice.
- This historical run is not 10x or 20x evidence: it was not pre-registered
  with the current controls, did not use seeded holdout confirmation, did not
  include reasoning-bearing target promotion, and cannot be audit-promoted.

## Trace-Derived Process Cost

| Arm | Wall Time | Tool Calls | Validation Commands | OpenSpec Commands | Trellis Commands | Packet Commands | Trace Patch Calls |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `opencode-effect-packets` | 484.5s | 44 | 20 | 9 | 8 packet | 8 | 5 |
| `codex-effect-packets` | 420.9s | 65 | 33 | 22 | 7 packet | 7 | 7 |
| `opencode-raw-effect` | 249.5s | 26 | 8 | 2 | 3 raw | 0 | 3 |
| `codex-raw-effect` | 254.4s | 51 | 17 | 10 | 4 raw | 0 | 6 |

Trace notes:

- OpenCode raw was short and direct: read context, run raw Effect diagnostics,
  patch, run focused Nx checks, run raw diagnostics again.
- OpenCode packet spent extra turns on the OpenSpec scaffold and packet command
  loop. It also hit a packet ID detour: applying the prompt-provided
  `packet_FxySUp3p7saajRmGg7jGVAVo` failed once, then it recomputed and applied
  `packet_TZMJHP3PZ07xFy-kiB8_hW5O`.
- Codex packet over-indexed on planning. It ran `22` OpenSpec-family commands,
  created a fuller benchmark-local OpenSpec change, and repeated packet checks
  and typechecks before settling.
- Codex raw read more source context than OpenCode raw and ran more validation,
  but avoided packet-specific overhead.

## Why Raw OpenCode Won

The raw OpenCode arm had the lowest process overhead while still finding the
same safe migration. It did not pay for packet queue projection, packet
identity drift, packet-scoped apply/check loops, or a full OpenSpec artifact
walk. On a one-line source migration, those fixed costs dominate everything.

Raw OpenCode also got a hidden-score boost from fixing two language-service
diagnostics outside the provider target. That means the hidden full-inventory
score is partially measuring "same diagnostic family cleanup" rather than
"predefined source migration completion." This helped OpenCode's reported
outcome but makes the run less clean.

## Why Packet Mode Underperformed

Packet mode should shine when one packet contains enough safe fixes to amortize
packet setup and validation. This slice did not have that shape.

The packet arm added fixed overhead:

- packet queue/fix/apply/check commands,
- more detailed prompt context,
- extra OpenSpec process,
- packet ID instability or stale packet handling,
- extra validation retries after the safe fix.

For `opencode-effect-packets`, that overhead was about `609,769` more tokens,
`18` more tool calls, and about `235s` more wall time than `opencode-raw-effect`
for the same source edit.

For `codex-effect-packets`, packet mode cost about `1,222,055` more tokens and
`14` more tool calls than `codex-raw-effect`, with no source-output advantage.

## Telemetry Caveats Found In The Traces

1. The current `targetPacketEvaluation` is too coarse. It reports `3` resolved
   for Codex arms even though hidden diagnostics still show two
   `effect/effectSucceedWithVoid` diagnostics remaining. Scoring should be
   diagnostic-id/path/span based, not code-family/safe-fix-count based.

2. The target packet report is internally inconsistent. It stores one item,
   `packages/canopy/home-deployment/src/providers.ts`, but carries
   `safeFixCount: 3`. That allowed one source edit to be counted as three
   validated packet clears.

3. Codex patch telemetry is undercounted in the existing report. Codex emits
   `apply_patch` as `custom_tool_call`; the benchmark telemetry table currently
   reports `0` patch calls for Codex arms even though the JSONL traces show
   `7` packet-arm patch calls and `6` raw-arm patch calls. Worktree diff
   summaries still caught the changed files.

4. Runtime token fields are not perfectly symmetric. OpenCode reports cached
   tokens as an additive field in the all-in total, while Codex reports cached
   input as a subset of input. The all-in `tokenTotal` is still useful for
   gross efficiency, but cache-normalized comparisons should be computed
   separately before making cost claims.

5. Hidden full-inventory score is too broad for this specific benchmark. It
   rewards same-rule cleanup in evaluator/framework code unless the scorer
   filters to the fixed packet's exact diagnostic identities and allowed source
   scope.

## Inference For The Next Benchmark

Packetization is not disproven. This slice mostly proves that packet tooling
has a meaningful fixed cost and that the benchmark scorer needs tighter
identity semantics.

The likely floor for packet mode appears when all of these are true:

- packet has many exact diagnostics, not one source item with a safe-fix count
  of three,
- packet identity is stable across frozen evaluator, worktree, apply, and
  check,
- agent gets one compact command ladder instead of verbose plan scaffolding,
- scorer rewards exact target diagnostics, not incidental same-rule cleanup,
- validation stops after packet clear plus one focused target proof.

For a next run over the broader Effect language-service diagnostics, the packet
arm should improve if we pre-register a packet of at least several dozen safe
fixes and let `trellis-ls apply --packet-id ... --mode write` perform the batch
in one shot. The threshold from this run is rough, but the fixed packet-mode
overhead is large enough that packets probably need more than a handful of
diagnostics before they beat raw diagnostic search on token efficiency.

## Recommended Fixes Before The Longer Run

- Score exact diagnostic identities: `diagnosticId`, file, span, rule, and
  evaluator ID.
- Store target packet items for every safe fix instance, not only one packet
  representative plus aggregate safe-fix count.
- Add an allowed-scope filter, for example source package only, and classify
  evaluator/framework edits as incidental or disallowed for primary scoring.
- Count Codex `custom_tool_call` `apply_patch` events in telemetry.
- Add packet ID re-resolution by stable diagnostic identity so agents do not
  waste turns on stale packet IDs.
- Add a compact benchmark prompt mode: one paragraph objective, one exact
  apply command, one exact check command, one focused validation command.
- For packet arms, provide a `trellis-ls packet run` or equivalent recipe action
  that performs fixes, check, and observation emission without requiring the
  agent to manually sequence queue/fixes/apply/check unless it needs to debug.

## Bottom Line

This was a good instrumentation slice and a poor clean benchmark. The useful
result is not "raw always beats packet"; it is:

`opencode-raw-effect` currently has the best low-overhead behavior on tiny
Effect slices, while packet mode needs larger packets, stable identity, and
stricter scoring before it can show the token-efficiency floor we care about.

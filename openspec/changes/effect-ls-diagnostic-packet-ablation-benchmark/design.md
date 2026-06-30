## Context

The completed `fork-effect-language-service-for-trellis-cli` change landed the
`trellis-ls` CLI, vendored upstream Effect language-service source, and a
recipe-only migration profile. The completed
`recipe-only-worktree-ab-benchmark` change landed DB-backed worktree benchmark
machinery, Codex/OpenCode telemetry ingest, hidden judging, and token-efficiency
reports.

The current Trellis upstream Effect adapter is still narrow: it has the
vendored upstream diagnostic metadata and diagnostics array available, but the
local collector only wires a small local `floatingEffect` path. The next
benchmark should use the broader Effect diagnostic surface as the migration
task and measure whether a packetized Trellis/Tend loop can approach the
expected efficiency floor for predefined diagnostic migration work.

## Goals / Non-Goals

**Goals:**

- Expose substantially more upstream Effect language-service diagnostics
  through `trellis-ls` while preserving the existing JSON contract,
  deterministic IDs, and safe fix semantics.
- Add staged Effect diagnostic profiles so correctness, safe autofix, style,
  effect-native inventory, and full inventory can be measured separately.
- Add a packet queue that turns raw Effect diagnostics into ranked,
  homogeneous migration packets with compact context bundles and validation
  ladders.
- Add packet-level fixes/apply/check flows so agents can work in batches
  rather than repeatedly reading raw diagnostic dumps.
- Run an ablation benchmark that compares agent runtime and packetization:
  OpenCode packet queue, Codex packet queue, OpenCode raw Effect diagnostics,
  and Codex raw Effect diagnostics.
- Score the benchmark primarily on validated packet diagnostics cleared per
  million tokens.
- Store lifecycle, packet, command, telemetry, final judge, and report
  projection data in `framework_event.recipe_observation` through the framework
  runtime boundary.

**Non-Goals:**

- Do not replace the existing `trellis-ls diagnostics`, `fixes`, `apply`, and
  `check` commands.
- Do not expose upstream editor setup, patch, unpatch, or config commands as
  stable Trellis commands.
- Do not require live DB for basic `trellis-ls diagnostics` or `fixes`.
- Do not add Tend-owned database lifecycle commands.
- Do not store raw prompts, conversations, trace rows, full stdout/stderr,
  raw command output, secrets, patch text, or raw diffs.
- Do not run `workspace:policy-fast` as part of the default benchmark.
- Do not treat broad TypeScript diagnostic collapse as the primary outcome for
  this benchmark.

## Decisions

### Decision: Use upstream diagnostic definitions through the vendored boundary

Trellis should collect Effect diagnostics using the vendored upstream
diagnostic definitions and upstream LSP executor shape, then normalize results
to the existing Trellis JSON contract. Local ad hoc reimplementations should be
used only as compatibility shims while the broader upstream collector is being
wired.

Alternative considered: keep adding local hand-written Effect diagnostic
definitions one rule at a time. That would be easier for a small fixture, but it
would not benchmark the real Effect language-service surface.

### Decision: Add staged profiles instead of one full diagnostic flood

The CLI should add Effect-focused profiles such as:

- `effect-correctness`
- `effect-autofix-safe`
- `effect-style-autofix`
- `effect-native-inventory`
- `effect-full-inventory`

The full inventory can be used for hidden judging and backlog visibility, but
the packet queue should rank smaller staged packets first. Off-by-default and
cultural migration diagnostics are valuable as inventory, not as the first
primary benchmark target.

Alternative considered: enable all upstream rules at error/warning severity in
one run. That would inflate noise, make validation failures harder to
attribute, and reward broad churn rather than efficient migration execution.

### Decision: Packetization is the main tool ablation

The default benchmark matrix is:

- `opencode-effect-packets`
- `codex-effect-packets`
- `opencode-raw-effect`
- `codex-raw-effect`

Packet arms may use packet list/next/fix/apply/check surfaces. Raw arms may use
Effect diagnostics and fixes, but they do not receive packet ranking, context
bundles, packet stop conditions, or packet validation ladders. A no-Trellis
blind arm may be added later as calibration, but it is not the primary
ablation.

Alternative considered: repeat the prior Trellis-visible versus Trellis-blind
matrix. That would measure Trellis availability again, while this change needs
to measure whether packetization makes predefined migration work cheaper.

### Decision: Packet IDs and fix IDs are deterministic

Packet IDs should be deterministic hashes over evaluator identity, profile,
rule name, packet strategy, affected file identities, representative spans,
fixability, and validation target. They must not include timestamps or run IDs.
Packet-level apply recomputes diagnostics/fixes before writing so stale packets
fail with machine-readable status.

Alternative considered: store packet IDs as database sequence IDs. That would
make reports stable only inside one run and would prevent comparing packet
families across runs.

### Decision: Suppression fixes are not safe migration fixes by default

Upstream Effect quickfixes can include disable-next-line or skip-file
suppressions. Trellis must classify those as review-required or exclude them
from safe batch packets by default. Benchmark progress should come from code
migration fixes, not diagnostic suppression.

Alternative considered: allow all upstream quickfixes. That would let agents
clear diagnostics cheaply by suppressing rules, which would corrupt the
benchmark.

### Decision: Packet validation ladders are part of the contract

Each packet should include a validation ladder such as:

- cheap: packet recheck
- focused: affected package typecheck or test
- medium: affected package check
- final: hidden frozen Effect evaluator

The benchmark records which ladder steps ran and treats validated clears as the
primary outcome. This keeps token cost focused on useful proof instead of broad
validation churn.

Alternative considered: let agents choose validation freely. The previous
traces showed that broad validation churn is a major token cost driver and
makes arms less comparable.

### Decision: Reports are DB projections

The benchmark runner and Trellis/Tend producers emit packet and telemetry
observations through framework runtime store services. Markdown and JSON reports
under `reports/tend-opencode-codex-measurement/` are projections from stored
observations, not durable truth.

Alternative considered: keep packet scorecards in local JSON report files only.
That would regress from the DB-backed measurement architecture.

## Risks / Trade-offs

- Broader upstream diagnostics may be noisy -> Use staged profiles, packet
  ranking, and inventory-only categories.
- Upstream diagnostic APIs may not fit the current simplified adapter -> Keep
  local wrappers at the vendored boundary and add fixture coverage per rule
  group before broad benchmark runs.
- Quickfixes may produce unsafe suppressions -> Mark suppression fixes
  review-required and exclude them from safe batch apply by default.
- Packet apply may hide too much from agents -> Include compact context bundles
  and diff previews without storing raw patches in observations.
- Packet ranking can bias benchmark results -> Store ranking inputs and run raw
  Effect arms against the same base snapshot for ablation.
- Full Effect inventory can be expensive -> Use resource budgets, bounded
  concurrency, focused scopes, and resumable partial reports.
- DB may be unavailable -> Live benchmark setup fails unless explicitly
  dry-run/export-only; framework-runtime remains lifecycle owner.
- Hidden evaluator can reward unrelated broad changes -> Primary scoring uses
  fixed packet resolution and validated packet clears; full hidden delta is
  secondary context.

## Migration Plan

1. Extend the Effect LS adapter to collect upstream diagnostic definitions from
   the vendored source and normalize rule metadata, severities, and fixes.
2. Add Effect profiles to the Trellis CLI contract and tests.
3. Add packet output schemas, packet queue projection, ranking, context bundles,
   validation ladders, and packet-level command support.
4. Extend Tend/OpenCode benchmark planning to select and store a fixed Effect
   packet queue before arms run.
5. Add the four-arm packet-vs-raw ablation runner prompts and telemetry
   classification.
6. Add DB observation payloads, SQL route validation, and typed report
   projections for packet queues and packet outcomes.
7. Run focused tests and OpenSpec validation.
8. Run a guarded dry-run setup, then a live benchmark only when the framework
   store is healthy.

Rollback is source-level: disable the new Effect profiles and packet commands,
leave existing `trellis-ls diagnostics/fixes/apply/check` behavior intact, and
ignore any packet observations in report projections.

## Open Questions

1. Which staged Effect profile should be the default first live benchmark:
   `effect-autofix-safe` or `effect-correctness`?
2. Should packet `apply --mode write` apply multiple fixes in one command in
   the first implementation, or should it start with one packet item at a time
   while keeping the packet context?
3. Should the optional no-Trellis blind calibration arm run in the same
   benchmark or as a cheaper follow-up run?

## Context

The completed flake-installed OpenCode harness work renamed the public harness
entrypoint to `tend-opencode` and loads Attune plugins for Tend observation,
Magic Context, OpenRTK, token audit, long-job observation, and Trellis LS. The
next migration question is behavioral rather than packaging-oriented: can Codex
use that flake-installed harness externally as a subprocess, and does doing so
reduce repeated expensive commands, validation wall time, context waste, and
agent confusion during Attune migrations?

This change designs a deterministic measurement workflow. It prepares local
scripts, sanitized cache artifacts, report formats, and OpenSpec requirements
for a controlled comparison before the repository attempts the heavy
recipe-only LS-guided migration. The measurement must avoid private trace
leakage, global OpenCode binaries, uncontrolled nested model sessions, and
mutation of `~/.codex`.

The naming correction is part of the measurement boundary: `tend-opencode` is
the sole public measurement entrypoint. Existing references to the retired
`attune-opencode` name are historical debt from the previous harness change and
must be replaced in new measurement material unless they are explicitly
documenting prior history.

## Goals / Non-Goals

**Goals:**

- Prove Codex can invoke `nix run .#tend-opencode -- ...` as an external
  subprocess from this checkout.
- Prove `tend-opencode` is flake-provided, wraps an upstream OpenCode runtime,
  and loads the full Attune OpenCode plugin suite.
- Route measurement preflight, debug, doctor, command observation, safe session
  decoding, and report production through `tend-opencode`.
- Capture bounded Tend command observations for the required validation ladder
  and classify each command by cost and workflow role.
- Inventory historical Codex/OpenCode metadata safely without raw prompt,
  full conversation, secret, or raw trace dump output.
- Compare Codex-alone migration analysis against Codex orchestrating
  `tend-opencode` plus `trellis-ls diagnostics` for a non-destructive
  `packages/trellis/language-service` readiness analysis.
- Produce sanitized reports and a draft `AGENTS.proposed.md` that can guide
  later migration agents.

**Non-Goals:**

- Do not run uncontrolled nested OpenCode model sessions.
- Do not call external LLMs as part of deterministic tests.
- Do not read, commit, or report raw prompts or full private conversations.
- Do not mutate or delete `~/.codex`.
- Do not begin the recipe-only source migration or delete package
  `attune.package.ts` files.
- Do not implement the future framework Atom/Reactivity abstraction.
- Do not add a second ledger or change the `framework_core`,
  `framework_event`, or `framework_view` schema names.

## Decisions

### Use `tend-opencode` As The Only Public Measurement Entrypoint

Measurement scripts, docs, specs, and reports use:

```bash
nix run .#tend-opencode -- fingerprint --format json
nix run .#tend-opencode -- run-harness-test --format json
nix run .#tend-opencode -- debug info
nix run .#tend-opencode -- doctor --format json
nix run .#tend-opencode -- observe --format json -- <command...>
```

The lower-level tools CLI may remain an implementation detail, but measurement
material must not teach agents to choose between public entrypoints. This keeps
the harness proof, observation path, and report language aligned with the
flake-installed OpenCode runtime that Codex is measuring.

Alternatives considered:

- Use `tend-opencode-tools` for observation and `tend-opencode` for harness
  proof. Rejected for measurement guidance because split public surfaces make
  agent behavior harder to compare.
- Keep `attune-opencode` as a compatibility alias. Rejected for new
  measurement workflow because the public entrypoint was consolidated.

### Gate Measurement On Harness Proof

The measurement begins by running fingerprint, harness self-test, and debug
info. A small preflight script validates the JSON fields rather than relying on
human inspection. The gate requires `runtime.flakeProvided: true`,
`runtime.runtimeKind: "upstream-opencode"`, all six Attune plugin packages,
upstream OpenCode visibility, `pluginHookExercise.passed: true`, and no raw
prompt/conversation text in the self-test output.

If any proof is missing, measurement stops and produces a short sanitized
failure report instead of continuing to collect noisy or misleading data.

### Store Raw Measurement Artifacts Only In Local Cache

Local JSON observations and probe outputs live under `.attune/cache/measurement/`:

```text
.attune/cache/measurement/opencode/
.attune/cache/measurement/commands/
.attune/cache/measurement/traces/
.attune/cache/measurement/experiments/
.attune/cache/measurement/reports/
```

Report files under `.attune/cache/measurement/reports/` are sanitized
markdown. They may summarize counts, command names, durations, exit codes,
timestamps, non-sensitive session IDs, token counts, tool-call counts, and
high-level task labels. They must not contain raw prompts, full conversations,
secrets, or private trace dumps.

### Measure A Fixed Command Ladder

The command ladder uses `tend-opencode observe` for every required validation
command so command timings, exits, inferred Nx targets, inferred recipe IDs,
and bounded output summaries share one schema. The ladder is intentionally
representative rather than exhaustive:

- `framework-language-service:typecheck`
- `framework-language-service:test`
- `tend-opencode:test`
- `workspace:recipe-substrate-check`
- `workspace:policy-fast`

The report classifies commands as cheap, medium, expensive, or final-gate and
uses those categories to recommend a diagnostic-first sequence. `workspace:policy-fast`
is measured but treated as a final confirmation, not a reflexive first move.

### Inventory Historical Traces By Metadata Only

The inventory scans `~/.codex` and local session artifacts for SQLite and JSONL
containers, inspects schemas safely, and extracts only metadata. The extractor
must avoid selecting prompt/message columns or dumping rows. When a field is
ambiguous, it is excluded unless the extractor can prove it is metadata such as
a command name, duration, exit code, timestamp, token count, or tool-call count.

The output is a historical baseline report that highlights repeated expensive
command patterns without exposing private conversation content.

### Compare Codex-Alone And Harnessed Analysis

The micro-experiment target is fixed and non-destructive:

```text
Analyze packages/trellis/language-service and report what remains before it
can dogfood recipe-only source migration. Do not edit files.
```

Baseline mode records Codex-alone behavior without a required `tend-opencode`
preflight or `trellis-ls` diagnostic-first loop. Treatment mode starts with
the harness proof gate, then runs:

```bash
nix run .#tend-opencode -- observe --format json -- trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json
```

Treatment mode must prefer the Trellis diagnostics/fixes/apply/check ladder
before broad manual file inspection and must observe every expensive
validation command through Tend. The comparison focuses on shell command
counts, repeated commands, failed commands, expensive checks, policy-fast
counts, time to useful diagnostic, token/context metrics when available, and
quality of findings.

### Derive Agent Guidance From Measured Behavior

`AGENTS.proposed.md` is a draft report artifact, not an automatic replacement
for root `AGENTS.md`. It teaches the measured workflow only after the reports
show enough evidence: preflight before harnessed migrations, `trellis-ls`
diagnostics before broad edits, fixes and diff apply before manual repair,
`tend-opencode observe` for expensive commands, package-local checks before
workspace checks, `workspace:policy-fast` near the end, no global OpenCode, no
raw trace dumps, and OpenSpec/recipe routing for architecture changes.

## Risks / Trade-offs

- Harness output shape drifts while measurement scripts expect specific
  fields. Mitigation: validate via schema-like guards and fail closed with a
  sanitized proof-gap report.
- Historical traces contain tempting raw text fields. Mitigation: default to a
  metadata allowlist and exclude ambiguous fields rather than redacting after
  collection.
- Baseline and treatment runs may not be perfectly comparable because Codex
  state is sequential. Mitigation: define fixed prompts, fixed target, fixed
  metrics, and treat results as a decision aid rather than a formal benchmark.
- `trellis-ls diagnostics` may be unavailable or incomplete. Mitigation:
  record the observed failure through Tend, include it as a measurement result,
  and do not fall back to uncontrolled migration edits.
- `workspace:policy-fast` is intentionally expensive. Mitigation: observe it
  once as part of the command ladder and once near final validation only if the
  implementation slice requires it.

## Migration Plan

1. Add OpenSpec deltas for the measurement preflight, command observation,
   trace inventory, command ladder, micro-experiment, and derived agent guide.
2. Implement measurement scripts under the repository-owned measurement
   surface while keeping generated JSON and markdown outputs in
   `.attune/cache/measurement/`.
3. Run the preflight gate and stop on incomplete plugin/runtime proof.
4. Run command ladder observations and historical metadata inventory.
5. Run the non-destructive baseline and treatment analyses.
6. Produce sanitized reports and `AGENTS.proposed.md`.
7. Validate the Tend/OpenCode, token-audit, Tend core, Trellis LS, and
   OpenSpec surfaces. Run `workspace:policy-fast` only once near the end unless
   measuring it explicitly.

Rollback is simple: remove the measurement scripts and local cache artifacts.
No durable repository data, home-directory state, production database state, or
recipe migration state is mutated by this change.

## Open Questions

- Should the implementation expose report generation as a dedicated
  `tend-opencode` subcommand, an Nx target that calls `tend-opencode`, or both?
- Which token/context metric is consistently available from Codex traces
  without reading private message text?
- Should a later change promote parts of `AGENTS.proposed.md` into the root
  agent contract after humans review the measurement report?

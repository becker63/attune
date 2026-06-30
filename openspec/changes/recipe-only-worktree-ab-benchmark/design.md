## Context

Attune now has three pieces that should be combined into a real benchmark:

- A DB-backed measurement substrate in framework-runtime, using
  `framework_event.recipe_observation` as durable source of truth.
- A Tend/OpenCode harness that can emit command observations and project
  reports from the framework store.
- A Trellis language-service `recipe-only-source` profile that can judge the
  heavy recipe-only source migration backlog.

The earlier microbenchmark compared instrumented command ladders. That was
useful as an end-to-end test, but it did not measure realistic migration work.
The new benchmark measures an agent workflow: understand the repo, create an
OpenSpec plan, implement the plan, validate, and then get judged against the
same hidden recipe-only diagnostic evaluator.

## Goals / Non-Goals

**Goals:**

- Run a four-arm 2x2 benchmark from one base commit in four isolated
  worktrees: OpenCode plus Trellis, Codex plus Trellis, OpenCode without
  Trellis, and Codex without Trellis.
- Let every arm start with the same migration task and require an OpenSpec plan
  before implementation.
- Isolate OpenCode effects from Trellis effects by running both runtimes in
  Trellis-visible and Trellis-blind modes.
- Keep Codex realistic by allowing normal repo search, normal shell/Nx
  validation, OpenSpec, and Codex subagents; only the Trellis-blind arms hide
  Trellis LS during planning and implementation.
- Store benchmark lifecycle, command, Codex telemetry, final judge, and report
  projection evidence in the framework DB.
- Derive all benchmark reports from stored observations.
- Preserve privacy by storing only sanitized aggregate metadata from Codex
  JSONL and sqlite.

**Non-Goals:**

- Do not implement the heavy recipe-only migration in this proposal.
- Do not add `tend-opencode db *` commands or make Tend/OpenCode own database
  lifecycle.
- Do not make Trellis LS visible to Trellis-blind arms during their run.
- Do not store raw prompts, raw conversations, full command output, raw trace
  rows, raw sqlite rows, or secrets.
- Do not run `workspace:policy-fast` by default for this benchmark.
- Do not implement a future Atom/Reactivity abstraction here.

## Decisions

### Decision: Benchmark the agent loop, not the diagnostic command

The benchmark task is: create and implement an OpenSpec change that migrates
the repo toward recipe-only source truth. The final judge runs
`trellis-ls diagnostics --workspace . --profile recipe-only-source --format json`
after each arm finishes. During the run, only the two Trellis-visible arms may
use Trellis LS diagnostics, fixes, apply, or check commands.

Alternative considered: use the current Trellis diagnostic output as the
shared work queue. That would mostly measure command orchestration and would
give the Trellis-blind arms the visible arms' central advantage.

### Decision: Use one worktree per matrix arm from one base commit

The runner captures a base commit, creates one worktree per arm under a local
ignored state path, records worktree paths and HEADs, then runs each arm with a
distinct measurement session ID and arm ID. Final scoring records the diff
against the base commit and the hidden evaluator output for each arm.

Alternative considered: run all arms in the same checkout. That would make
workspace dirt, generated files, and tool cache effects too hard to separate.

### Decision: Compare runtime and Trellis exposure independently

OpenCode and Codex each receive one Trellis-visible arm and one Trellis-blind
arm. The visible arms may use `trellis-ls` during implementation. The blind
arms may use normal repo search, file reads, shell commands, Nx targets,
OpenSpec CLI, and runtime-native subagents/tools, but they must not run
`trellis-ls` commands, consume stored Trellis diagnostic JSON, or query
Trellis-specific observations for implementation guidance. The final evaluator
may run Trellis outside every arm and store the result.

Alternative considered: forbid subagents for Codex. That would make the
Codex arms less representative of how Codex is normally used in this repo.

### Decision: Add a sanitized Codex telemetry boundary

Codex JSONL and sqlite metadata are parsed into explicit measurement
observations:

- thread summaries
- connected thread cluster summaries
- tool-call taxonomy counts
- token breakdowns when available
- patch and touched-file summaries
- shell command and validation summaries
- subagent spawn graph summaries

The parser stores file IDs and aggregate counts, not raw lines, prompts,
messages, stdout, stderr, or sqlite rows.

Alternative considered: keep telemetry as report-only postprocessing. That
would make the DB incomplete as source of truth and would make benchmark
reruns harder to audit.

### Decision: Keep DB lifecycle in framework-runtime

The benchmark runner checks that the framework-managed local recipe store is
healthy before a non-export benchmark run. It may call framework-runtime owned
Nx targets or ManagedRecipe-backed lifecycle surfaces, but it must not expose
or add Tend-owned DB lifecycle commands.

Alternative considered: give the benchmark runner a private local DB. That
would violate the measurement architecture and create a second ledger.

### Decision: Score from stored observations and final judge outputs

Reports are projections from stored observations. The primary scorecard
includes plan quality, implementation progress, hidden diagnostic delta,
validation status, wall time, command/tool/token cost, patch size, and safety
violations. Each metric records whether it came from command observations,
Codex telemetry observations, final judge observations, or manual review.

Alternative considered: score directly from files on disk. That would make
reports fragile and bypass the framework observation store.

### Decision: Support unattended overnight execution

The benchmark runner has an unattended mode that can plan the run, prepare all
four worktrees, launch all four arms, collect status, run hidden judging,
ingest Codex/OpenCode JSONL telemetry, project reports, and either clean up or
retain worktrees according to a predeclared policy. The unattended mode records
budgets, stop conditions, resume state, and partial results so an overnight run
can finish or fail with usable evidence.

Alternative considered: require manual launching of each arm. That is useful
for early testing, but it would not satisfy the benchmark's purpose as a
repeatable overnight experiment.

## Risks / Trade-offs

- Codex JSONL structure can change -> Use permissive parsers, schema-version
  each observation, and record unknown/missing fields as not measured.
- Token totals can be double-counted across cumulative and incremental samples
  -> Store token source, primary-thread vs cluster scope, and cumulative-delta
  method in every telemetry observation.
- Trellis-hidden arms can accidentally discover Trellis through repo docs ->
  The prompt must define forbidden commands and the runner must record command
  violations by scanning observed shell command families.
- Worktree runs can be expensive -> Add explicit budget inputs, stop reasons,
  and partial-result scoring.
- Overnight blockers can waste the run -> Add self-recovery steps, bounded
  retries, alternate focused validations, and partial report projection before
  declaring the run blocked.
- Final judge can mutate state if misconfigured -> Run final judge in read-only
  diagnostic mode and record command, exit code, and diagnostic summary.
- Local DB may be unavailable -> Non-export benchmark runs fail preflight; only
  explicit dry-run/export-only mode may proceed without DB-backed storage.
- Reports may tempt agents to treat report files as truth -> Reports remain
  generated projections from DB observations, and the projection observation
  records all input observation IDs.

## Migration Plan

1. Add runtime schemas and typed payloads for Codex telemetry, benchmark arms,
   final judge results, and benchmark reports.
2. Add SQL validation statements for inserting and querying the new
   observation kinds through `framework_event.recipe_observation`.
3. Add sanitized JSONL and sqlite telemetry readers that produce aggregate
   observation payloads.
4. Add benchmark lifecycle helpers for worktree setup, arm metadata, store
   preflight, hidden judging, and cleanup.
5. Add an unattended run driver that can execute all four arms, judge all four
   worktrees, ingest telemetry, and project reports without additional user
   prompts once the run is launched.
6. Add Tend/OpenCode or framework-owned benchmark runner commands that emit
   observations through the shared runtime boundary.
7. Add report projections for protocol, telemetry, scorecard, and residual
   risks.
8. Run focused tests and one guarded dry run or live run when explicitly
   requested.

Rollback is straightforward: the change adds observation kinds and report
projections without changing existing recipe store tables. If the runner is
not ready, callers can continue using the existing measurement report flow.

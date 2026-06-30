## ADDED Requirements

### Requirement: Four-arm worktree benchmark
The system SHALL run the recipe-only migration benchmark as a four-arm 2x2
test from one captured base commit, with one isolated git worktree per arm.

#### Scenario: Base commit is captured
- **WHEN** a benchmark run is planned
- **THEN** the system records the base commit SHA, branch, dirty-state summary,
  benchmark run ID, and measurement session IDs before either arm starts
- **AND** the run refuses to start unless the base state can be reconstructed
  or the run is explicitly marked dry-run/export-only

#### Scenario: Worktrees are isolated
- **WHEN** benchmark arms are prepared
- **THEN** the system creates separate worktrees for `opencode-trellis`,
  `codex-trellis`, `opencode-blind`, and `codex-blind`
- **AND** each arm records its worktree path, starting HEAD, environment
  summary, and output branch or detached HEAD state
- **AND** local worktree state lives under a repo-local ignored state path

### Requirement: Arm constraints are explicit and enforceable
The system SHALL record the allowed and forbidden surfaces for each benchmark
arm and SHALL score violations as benchmark safety failures.

#### Scenario: Trellis-visible arms can use Trellis
- **WHEN** the `opencode-trellis` or `codex-trellis` arm runs
- **THEN** it may use runtime-native agent tools, frozen-evaluator Trellis LS
  diagnostics, frozen-evaluator Trellis LS fixes, Trellis LS apply/check
  guidance, Nx targets, OpenSpec commands, and normal repo inspection tools
- **AND** the Trellis evaluator root is recorded as read-only scoring
  infrastructure, separate from the mutable arm worktree
- **AND** it emits observations through the framework runtime store

#### Scenario: Trellis-blind arms cannot use Trellis during implementation
- **WHEN** the `opencode-blind` or `codex-blind` arm runs
- **THEN** it may use normal repo search, file reads, shell commands, Nx
  validation targets, OpenSpec commands, and runtime-native subagents/tools
- **AND** it MUST NOT run `trellis-ls diagnostics`, `trellis-ls fixes`,
  `trellis-ls apply`, `trellis-ls check`, or consume precomputed Trellis
  diagnostic JSON during planning or implementation

#### Scenario: Hidden evaluator may use Trellis
- **WHEN** either arm has stopped
- **THEN** the benchmark runner may run the hidden final evaluator using
  `trellis-ls diagnostics --workspace . --profile recipe-only-source --format json`
- **AND** the evaluator result is recorded separately from arm-visible
  implementation telemetry

### Requirement: Frozen evaluator contract is recorded
The system SHALL score all arms with a frozen evaluator contract that is
independent of the mutable benchmark arm worktrees.

#### Scenario: Evaluator identity is captured
- **WHEN** a benchmark run is planned or set up
- **THEN** the system records the evaluator root path, commit, branch,
  dirty-state count, Trellis package hash or version when available, lockfile
  hash when available, evaluator command, argv, and captured timestamp
- **AND** final hidden judging uses that evaluator root for every arm

#### Scenario: Agent-local evaluator output is separated
- **WHEN** a Trellis-visible or Trellis-blind arm produces diagnostics from
  its own worktree-local toolchain
- **THEN** the report records agent-local before/after diagnostic counts
  separately from hidden-root before/after counts
- **AND** only hidden-root diagnostics determine primary outcome scoring

### Requirement: Shared target diagnostic packet is fixed before arms run
The system SHALL select a fixed target packet from the hidden-root base
snapshot before arms begin implementation.

#### Scenario: Target packet is selected
- **WHEN** benchmark setup captures the base hidden-root diagnostic snapshot
- **THEN** the system selects a bounded packet including
  `trellis/source-uses-legacy-abstraction`,
  `trellis/authored-attune-package-file`, and
  `trellis/target-missing-recipe-invocation` diagnostics when present
- **AND** stored target packet items contain diagnostic kind/code, safe file
  identity, non-sensitive source/severity metadata, and hashes rather than raw
  diagnostic prose or command output

#### Scenario: Target packet is scored
- **WHEN** hidden final judging completes for an arm
- **THEN** the system records how many packet items were resolved and
  remaining by diagnostic code
- **AND** the same target packet is used for every arm in the run

### Requirement: OpenSpec plan is required before implementation
Every arm SHALL create or update an OpenSpec plan before implementation work is
counted as benchmark implementation.

#### Scenario: Plan phase precedes implementation phase
- **WHEN** an arm starts
- **THEN** it records a plan phase before an implementation phase
- **AND** the plan phase records proposal/design/tasks/spec artifacts created
  or updated, plan completion status, and plan-quality review inputs

#### Scenario: Plan quality is scored
- **WHEN** the final benchmark scorecard is projected
- **THEN** it includes plan-quality metrics for scope recognition, correct
  recipe-only migration interpretation, lifecycle ownership correctness,
  privacy guardrail coverage, and executable task breakdown

### Requirement: Shared scorecard is outcome-gated and token-efficiency focused
The system SHALL produce a shared scorecard for all four arms from stored
observations and hidden evaluator outputs, with token efficiency compared only
inside a comparable outcome band.

#### Scenario: Outcome metrics are projected
- **WHEN** benchmark reports are generated
- **THEN** the scorecard includes final diagnostic count, diagnostic delta from
  baseline, diagnostic counts by code, validation command status, files
  changed, generated/private ledger edit attempts, and safety violations
- **AND** the primary winner is determined by hidden-root diagnostic
  improvement, with target-packet resolution as a secondary outcome signal

#### Scenario: Token-efficiency metrics are projected
- **WHEN** benchmark reports are generated
- **THEN** the scorecard includes tokens per hidden diagnostic cleared,
  hidden diagnostics cleared per million tokens, tokens per target packet item
  resolved, tokens per source-migration file, primary-thread tokens, subagent
  tokens, cluster tokens, token breakdowns when available, and cached token
  counts when available
- **AND** raw fewest-token cost is reported as an efficiency note, not as the
  primary benchmark winner when outcome differs

#### Scenario: Patch quality is classified
- **WHEN** benchmark reports are generated
- **THEN** the scorecard classifies changed files into source migration,
  evaluator/rule, framework protocol, test-only, measurement/report, OpenSpec,
  and other categories
- **AND** evaluator/rule changes do not count as migration progress unless
  hidden-root diagnostics or target-packet resolution improve

#### Scenario: Partial runs are still scored
- **WHEN** an arm stops because of budget, timeout, failure, or interruption
- **THEN** the scorecard records the stop reason and projects all available
  observations without treating missing metrics as zero

### Requirement: Arms can be launched by an autonomous driver
The system SHALL support autonomous arm execution after benchmark setup has
prepared prompts, environments, worktrees, and measurement session IDs.

#### Scenario: OpenCode arms can run unattended
- **WHEN** the autonomous driver launches the OpenCode arms
- **THEN** it provides the arm prompt, worktree path, measurement session ID,
  benchmark run ID, arm ID, store environment, Trellis exposure policy, and
  budget envelope without needing another user prompt

#### Scenario: Codex arms can run unattended
- **WHEN** the autonomous driver launches the Codex arms
- **THEN** it provides the arm prompt, worktree path, measurement session ID,
  benchmark run ID, arm ID, Trellis exposure policy, and budget envelope
  without needing another user prompt

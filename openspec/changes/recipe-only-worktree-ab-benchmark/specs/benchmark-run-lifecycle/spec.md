## ADDED Requirements

### Requirement: Benchmark lifecycle requires framework store preflight
The system SHALL require a healthy framework-managed local recipe store before
running a non-export benchmark.

#### Scenario: Store preflight succeeds before benchmark run
- **WHEN** a live benchmark run starts
- **THEN** the system checks that the store is reachable, migrated, SQL route
  validated, and healthy for observation insert/query
- **AND** the recorded lifecycle owner is `framework-runtime`
- **AND** the run records benchmark preflight observations before creating arm
  execution observations

#### Scenario: Store preflight failure blocks live benchmark
- **WHEN** the framework store is unavailable or SQL validation fails
- **THEN** the benchmark run fails before arm execution unless dry-run or
  export-only mode was explicitly requested

### Requirement: Worktree lifecycle is explicit and recorded
The system SHALL model four-arm worktree setup, inspection, and cleanup as a
benchmark lifecycle surface.

#### Scenario: Worktrees are planned before creation
- **WHEN** benchmark setup is requested
- **THEN** the system records planned worktree paths, base commit, arm IDs,
  measurement session IDs, and cleanup policy before creating worktrees

#### Scenario: Frozen evaluator and target packet precede arm execution
- **WHEN** live benchmark setup prepares arm worktrees
- **THEN** it captures the frozen evaluator contract and hidden-root base
  diagnostic snapshot before arm execution
- **AND** it emits or prepares a target diagnostic packet observation before
  arms start work
- **AND** arm prompts are generated from the same evaluator contract and target
  packet

#### Scenario: Worktree cleanup is recorded
- **WHEN** benchmark cleanup runs
- **THEN** the system records which worktrees were retained, removed, or
  failed cleanup
- **AND** destructive cleanup requires an explicit review or retain policy

### Requirement: Arm execution state is durable
The system SHALL record benchmark run and arm lifecycle observations.

#### Scenario: Arm start and completion are observed
- **WHEN** an arm starts or completes
- **THEN** the system emits benchmark lifecycle observations including run ID,
  arm ID, worktree identity, prompt version, phase, startedAt, completedAt,
  stop reason, and result status

#### Scenario: Budget and timeout are recorded
- **WHEN** a run uses token, wall-time, command, or manual stop budgets
- **THEN** those budgets and their final usage are recorded in the benchmark
  lifecycle observations

### Requirement: Overnight benchmark runs are autonomous
The system SHALL support an unattended benchmark mode that can run setup, all
arms, final judging, telemetry ingest, report projection, and cleanup or retain
without additional user prompts.

#### Scenario: Unattended run has explicit stop conditions
- **WHEN** an unattended benchmark run starts
- **THEN** it records wall-time, token, command, validation, and cleanup
  budgets before arm execution
- **AND** it records stop reasons for completed, budget-exhausted, failed,
  blocked, interrupted, or skipped phases

#### Scenario: Unattended run resumes or reports partial state
- **WHEN** an unattended run is interrupted or a subprocess fails
- **THEN** the system can resume from recorded benchmark lifecycle state or
  project a partial benchmark report with exact failed or skipped phase
  evidence

#### Scenario: Unattended run attempts safe recovery
- **WHEN** an unattended run hits a blocker
- **THEN** it attempts safe recovery actions such as status inspection,
  targeted reruns, alternate focused validation, telemetry refresh, or report
  projection from partial observations
- **AND** it records attempted recovery actions, outcomes, and remaining
  blocker evidence before marking the run blocked

### Requirement: Default validation avoids policy-fast
The benchmark lifecycle SHALL use focused validation and SHALL NOT run
`workspace:policy-fast` by default.

#### Scenario: Focused final validation
- **WHEN** final validation runs for an arm
- **THEN** the default validation set includes OpenSpec validation for the arm
  plan, relevant Nx typecheck/test targets, and hidden Trellis recipe-only
  diagnostics
- **AND** it does not include `workspace:policy-fast` unless a later human
  instruction explicitly enables it

### Requirement: Reports are produced after final judging
The system SHALL generate benchmark reports only after hidden final judging has
run or has been explicitly skipped with a recorded reason.

#### Scenario: Final reports include judge status
- **WHEN** benchmark reports are projected
- **THEN** the reports include final judge command identity, exit code,
  diagnostic counts by code, diagnostics cleared, diagnostics remaining, and
  whether the judge was run, skipped, or failed
- **AND** the reports include hidden-root versus agent-local evaluator counts,
  parser completeness status, target-packet resolution, patch quality
  classification, and token-efficiency ratios

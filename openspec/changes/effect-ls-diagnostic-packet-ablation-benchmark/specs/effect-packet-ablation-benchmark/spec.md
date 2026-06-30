## ADDED Requirements

### Requirement: Four-arm packetization ablation benchmark
The system SHALL run a worktree-isolated ablation benchmark that compares agent
runtime and packetization on the same fixed Effect diagnostic packet queue.

#### Scenario: Four arms are prepared
- **WHEN** a benchmark run is planned
- **THEN** the system prepares isolated worktrees for
  `opencode-effect-packets`, `codex-effect-packets`,
  `opencode-raw-effect`, and `codex-raw-effect`
- **AND** every arm records base commit, worktree path, arm ID, runtime,
  packetization policy, measurement session ID, budgets, and store environment

#### Scenario: Packet arms use packet queue
- **WHEN** `opencode-effect-packets` or `codex-effect-packets` runs
- **THEN** it may use `trellis-ls packets`, packet-scoped fixes, packet apply,
  packet check, packet context bundles, and packet validation ladders

#### Scenario: Raw Effect arms cannot use packet queue
- **WHEN** `opencode-raw-effect` or `codex-raw-effect` runs
- **THEN** it may use raw `trellis-ls diagnostics --source effect`,
  diagnostic-scoped fixes, normal repo search, shell, Nx, OpenSpec, and
  runtime-native tools
- **AND** it MUST NOT use packet queue commands, packet context bundles, packet
  ranking projections, or packet-specific observations as implementation
  guidance before stopping

### Requirement: Benchmark target is a fixed Effect packet queue
The benchmark SHALL select and store a fixed Effect diagnostic packet queue
from a frozen base snapshot before any arm starts implementation.

#### Scenario: Base packet queue is captured
- **WHEN** benchmark setup runs
- **THEN** it captures the frozen evaluator identity and runs the configured
  Effect profile to produce the base packet queue
- **AND** it records packet IDs, rule distribution, fixability distribution,
  risk distribution, validation ladders, and packet selection strategy

#### Scenario: Same packets score every arm
- **WHEN** hidden judging completes for each arm
- **THEN** packet clearance is scored against the same base packet queue
- **AND** packets outside the fixed queue are reported as incidental
  improvement rather than primary outcome

### Requirement: Hidden judging uses frozen Effect evaluator
The benchmark SHALL judge every arm with a frozen evaluator root independent of
the mutable arm worktrees.

#### Scenario: Effect hidden evaluator runs
- **WHEN** an arm stops
- **THEN** the benchmark runner executes the frozen hidden evaluator with an
  Effect profile such as `effect-full-inventory` or the selected benchmark
  profile against the arm worktree
- **AND** it records command identity, duration, exit code, profile, diagnostic
  counts by rule, packet cleared/remaining counts, and privacy summary

#### Scenario: Full hidden delta is secondary
- **WHEN** the scorecard is projected
- **THEN** full Effect diagnostic delta and TypeScript/Trellis diagnostic delta
  are reported as secondary context
- **AND** the primary outcome remains validated fixed-packet diagnostics
  cleared

### Requirement: Primary scoring is packet-token efficiency
The benchmark SHALL score predefined migration efficiency using validated
packet diagnostics cleared per million tokens as the primary token-efficiency
metric.

#### Scenario: Packet efficiency is projected
- **WHEN** benchmark reports are generated
- **THEN** the scorecard includes validated packet diagnostics cleared,
  packet diagnostics remaining, packet clears per million tokens, tokens per
  packet diagnostic cleared, safe fixes applied, validation commands per
  clear, affected files per clear, wall time, tool calls, and stop reason

#### Scenario: Comparable outcome band is used
- **WHEN** token-efficiency winners are selected
- **THEN** the benchmark identifies the token-efficiency leader only among arms
  in a comparable validated-packet-outcome band

### Requirement: Benchmark has safe resource budgets
The benchmark SHALL support longer credible runs while bounding resource usage
so it is safe on developer machines and portable across environments.

#### Scenario: Budgets are enforced
- **WHEN** a live benchmark run starts
- **THEN** it records and enforces wall-time, token, tool-call, command,
  validation, concurrency, and optional memory/load budgets
- **AND** it records budget stop reasons as benchmark outcomes rather than
  retrying indefinitely

#### Scenario: Default run avoids heavy final gate
- **WHEN** the default benchmark validation path runs
- **THEN** it does not run `workspace:policy-fast`
- **AND** it uses focused package and packet validation before any optional
  heavier final gate

### Requirement: Every arm starts with OpenSpec planning
Every benchmark arm SHALL create or update an OpenSpec plan before
implementation work is counted.

#### Scenario: Plan phase is observed
- **WHEN** an arm starts
- **THEN** it records proposal, design, specs, and task artifacts created or
  updated, plan status, and plan-quality inputs before implementation
  telemetry is counted

#### Scenario: Packet interpretation is scored
- **WHEN** the final scorecard is projected
- **THEN** plan quality includes whether the arm understood the Effect packet
  target, packetization policy, validation ladder, store ownership, privacy
  guardrails, and stop rules

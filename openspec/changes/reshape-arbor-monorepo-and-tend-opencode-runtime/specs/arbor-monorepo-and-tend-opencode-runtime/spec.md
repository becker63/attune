## ADDED Requirements

### Requirement: Root migration shape exists
Attune workspace SHALL be restructured into the three-root topology before Tend/OpenCode implementation begins.

#### Scenario: Required roots are present
- **WHEN** repository setup runs,
- **THEN** `attune/`, `tend/`, and `trellis/` exist,
- **AND** each root includes a `.keep` file in each declared subdirectory.

### Requirement: Mechanical moves completed for core foundations
The framework and selected Attune packages SHALL be moved under `attune/`.

#### Scenario: Framework and package moves
- **WHEN** workspace discovery is run,
- **THEN** `framework/` is resolved at `attune/framework/`,
- **AND** these packages are under `attune/packages/`: `attune-foldkit`, `attune-nx`, `attune-pi-agent`, `attuned-discovery`, `cocoindex-effect`, `joern-effect`, `joern-effect-properties`, `home-deployment`, `platform-alchemy-k8s`.

### Requirement: Configuration references repaired
The workspace config layer SHALL be repaired to reflect the new paths.

#### Scenario: Workspace config resolves after move
- **WHEN** package discovery commands run,
- **THEN** `pnpm-workspace.yaml` resolves all Attune packages,
- **AND** `nx show projects` includes moved project paths,
- **AND** `tsconfig.base.json` includes migrated `paths` entries for moved packages.

### Requirement: Tend package skeleton exists
Tend SHALL include the required package directories and manifests.

#### Scenario: Tend package directories created
- **WHEN** the repo is inspected,
- **THEN** all required directories under `tend/packages/` exist,
- **AND** each has a package manifest and/or project boundary placeholder.

### Requirement: Nix-backed Timescale substrate
Tend event storage SHALL start with Nix-managed Postgres + Timescale.

#### Scenario: Local Tend DB lifecycle is available
- **WHEN** lifecycle commands are executed,
- **THEN** `tend-db:up` starts the DB,
- **AND** migrations can be run with `tend-db:migrate`,
- **AND** `tend-db:test` can run against a test DB,
- **AND** `tend-db:down` stops the DB.

### Requirement: Raw event and typed tables
A canonical raw and typed schema SHALL support OpenCode trace capture.

#### Scenario: Required tables can be written and queried
- **WHEN** Tend records a command/tool session,
- **THEN** `tend_event` is appendable,
- **AND** `token_usage`, `tool_call`, and `long_job` rows are persisted and queryable.

### Requirement: Search and validation guardrails
Tend SHALL implement command safety policies before allowing risky operations.

#### Scenario: Search ladder prevents dangerous roots
- **WHEN** a tool command performs raw search over disallowed roots,
- **THEN** policy emits warning/block guidance,
- **AND** command is rejected unless an explicit policy-safe override is recorded.

### Requirement: Long-command process ledger
Long-running commands SHALL be tracked through a durable ledger file.

#### Scenario: Long command lifecycle recording
- **WHEN** command exceeds expected duration tier,
- **THEN** a ledger entry is written under `.tmp/agent-processes.json`,
- **AND** status transitions include `running`, `passed`, `failed`, `lost`, and `cancelled`.

### Requirement: OpenCode adapter emits Tend events
OpenCode hooks SHALL map to Tend command/session events through effect boundaries.

#### Scenario: before and after hooks emit typed events
- **WHEN** `tool.execute.before` and `tool.execute.after` are invoked,
- **THEN** the Tend core receives equivalent policy and tool-call events,
- **AND** summaries are persisted with duration, exit status, and command class.

### Requirement: Initial Tend reporting exists
Tend SHALL generate first-session evidence artifacts from token-audit and tool traces.

#### Scenario: Seed-driven report output
- **WHEN** reports are generated,
- **THEN** output includes tokens, sessions, and motif summaries,
- **AND** includes at least: broad search explosion, repeated validation, long-command polling, and unsafe hook behavior.

### Requirement: Trellis starter scaffolds exist
Trellis SHALL be available as portable skill/template assets only.

#### Scenario: Trellis starter kit
- **WHEN** `trellis/` is listed,
- **THEN** these SKILL files exist: `attune-system-map`, `effect-service-patterns`, `telemetry-contract`, `joern-template-workflow`, `tend-token-discipline`, `work-unit-checkpoint`,
- **AND** these template files exist: `work-unit.md`, `phase-handoff.md`, `evidence-packet.md`, `telemetry-checklist.md`.

### Requirement: Linear clean-slate and issue creation
The migration SHALL maintain a clean, freshly created Linear project and issues for this change.

#### Scenario: Fresh Arbor migration project
- **WHEN** migration execution starts,
- **THEN** existing relevant migration issues are closed or superseded,
- **AND** project `Arbor: Monorepo Reshape and Tend OpenCode Runtime` exists,
- **AND** numbered issues ARB-001, ARB-002, ARB-003, ARB-004, ARB-005, TEND-001..010, ATTUNE-001, TRELLIS-001, QUALITY-001 are created with scope and acceptance.

### Requirement: OpenSpec validation
The new change SHALL be OpenSpec-validatable via existing tooling.

#### Scenario: Change validation can execute
- **WHEN** `openspec validate reshape-arbor-monorepo-and-tend-opencode-runtime --type change` is run,
- **THEN** the command succeeds for available validation gates,
- **AND** outputs include completed proposal/design/spec/tasks structure.

## ADDED Requirements

### Requirement: `tend-opencode` is the public measurement producer entrypoint
The system SHALL use `tend-opencode` as the public measurement producer
entrypoint for harness proof, OpenCode debug info, command observation, session
decoding, doctor checks, and measurement reporting, while framework-runtime
owns local store lifecycle commands.

#### Scenario: Measurement preflight uses consolidated command
- **WHEN** a measurement agent begins the Tend/OpenCode measurement workflow
- **THEN** it runs `nix run .#tend-opencode -- fingerprint --format json`
- **AND** it runs `nix run .#tend-opencode -- run-harness-test --format json`
- **AND** it may run `nix run .#tend-opencode -- debug info`
- **AND** any command observation in the measurement uses
  `nix run .#tend-opencode -- observe --format json -- <command...>`
- **AND** local recipe store lifecycle checks use framework-runtime commands or
  RecipeInvocation-backed Nx targets rather than `tend-opencode db *`

#### Scenario: Legacy entrypoint drift is detected
- **WHEN** new measurement docs, specs, scripts, or reports mention
  `attune-opencode`
- **THEN** the measurement reports that mention as legacy entrypoint drift
- **AND** the implementation replaces it with `tend-opencode` unless the text
  is explicitly documenting prior harness history or removal debt

### Requirement: Basic harness proof works without DB
The system SHALL keep deterministic harness proof commands usable when the
framework-managed local recipe store is absent, stopped, or intentionally not
configured.

#### Scenario: Fingerprint does not require store reachability
- **WHEN** an agent runs
  `nix run .#tend-opencode -- fingerprint --format json`
- **AND** no framework recipe store is reachable
- **THEN** the command still produces parseable JSON harness identity output
- **AND** it does not attempt to start, migrate, validate, or administer the DB

#### Scenario: Harness self-test does not require store reachability
- **WHEN** an agent runs
  `nix run .#tend-opencode -- run-harness-test --format json`
- **AND** no framework recipe store is reachable
- **THEN** the command still produces parseable JSON harness proof output
- **AND** it does not attempt to start, migrate, validate, or administer the DB

### Requirement: Harness proof gate blocks unsafe measurement
The measurement SHALL stop unless `tend-opencode` proves the flake-installed
upstream OpenCode runtime, full Attune plugin suite, upstream plugin visibility,
hook exercise, and raw-prompt-safe self-test output.

#### Scenario: Complete harness proof passes
- **WHEN** the preflight parses the fingerprint and harness self-test JSON
- **THEN** the proof includes `runtime.flakeProvided: true`
- **AND** the proof includes `runtime.runtimeKind: "upstream-opencode"`
- **AND** the proof includes loaded plugin entries for
  `@attune/tend-opencode`, `@attune/magic-context-opencode`,
  `@attune/openrtk-opencode`, `@attune/tend-token-audit-opencode`,
  `@attune/tend-long-job-opencode`, and `@attune/trellis-ls-opencode`
- **AND** upstream OpenCode can see the same plugin suite
- **AND** `pluginHookExercise.passed` is true
- **AND** the self-test requires no raw prompt or conversation text

#### Scenario: Incomplete harness proof stops measurement
- **WHEN** any required runtime field, plugin proof, upstream visibility proof,
  hook exercise proof, or privacy proof is missing or false
- **THEN** the measurement exits before store-backed measurement session,
  command ladder, trace inventory, or micro-experiment collection begins
- **AND** the output is a sanitized failure summary that names the missing
  proof without dumping raw harness output

### Requirement: Full measurement checks framework store before session start
After harness proof, the full measurement workflow SHALL check the
framework-managed local recipe store before starting a measurement session.

#### Scenario: Preflight order is enforced
- **WHEN** a full measurement workflow runs without explicit dry-run/export-only
  mode
- **THEN** preflight first completes `tend-opencode` harness proof
- **AND** second checks framework-runtime local store health
- **AND** third performs an observation insert/query smoke check
- **AND** fourth creates or records the measurement session start

#### Scenario: Framework store health is required
- **WHEN** the full measurement checks the local recipe store
- **THEN** it verifies the store is reachable
- **AND** it verifies the store is migrated
- **AND** it verifies the SQL route is valid
- **AND** it verifies the observation insert/query path is healthy
- **AND** it verifies the store lifecycle owner is framework-runtime, not
  Tend/OpenCode

#### Scenario: Full measurement fails closed without DB
- **WHEN** full measurement is requested
- **AND** the framework-managed local recipe store is not healthy
- **AND** dry-run/export-only mode is not explicit
- **THEN** the measurement refuses to proceed
- **AND** it reports the missing store health evidence without starting,
  migrating, validating, pruning, or administering the store through
  Tend/OpenCode

### Requirement: Preflight evidence is stored as observations with cache exports
The system SHALL emit sanitized preflight evidence as framework
`RecipeObservation` records by default and SHALL treat
`.attune/cache/measurement/opencode/` files as exports.

#### Scenario: Preflight artifacts are exported from stored evidence
- **WHEN** fingerprint, harness self-test, debug info, doctor output, or store
  health evidence is collected during full measurement
- **THEN** the implementation records sanitized `measurement.harness.proof` or
  store health observations through the framework store boundary
- **AND** it may write sanitized JSON or text exports under
  `.attune/cache/measurement/opencode/`
- **AND** those exports do not include raw prompts, full conversations,
  secrets, raw private trace dumps, or full command output
- **AND** explicit dry-run/export-only mode is the only normal path that skips
  DB-backed preflight observation writes

#### Scenario: Doctor confirms measurement readiness
- **WHEN** the measurement runs `nix run .#tend-opencode -- doctor --format json`
- **THEN** the result records harness and Trellis LS readiness as preflight
  evidence
- **AND** a missing Trellis diagnostic capability is reported as a measurement
  blocker or gap rather than silently bypassed

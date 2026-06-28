## ADDED Requirements

### Requirement: `tend-opencode` is the public measurement entrypoint
The system SHALL use `tend-opencode` as the only public measurement entrypoint
for harness proof, OpenCode debug info, command observation, session decoding,
doctor checks, and measurement reporting.

#### Scenario: Measurement preflight uses consolidated command
- **WHEN** a measurement agent begins the Tend/OpenCode measurement workflow
- **THEN** it runs `nix run .#tend-opencode -- fingerprint --format json`
- **AND** it runs `nix run .#tend-opencode -- run-harness-test --format json`
- **AND** it runs `nix run .#tend-opencode -- debug info`
- **AND** any command observation in the measurement uses
  `nix run .#tend-opencode -- observe --format json -- <command...>`

#### Scenario: Legacy entrypoint drift is detected
- **WHEN** new measurement docs, specs, scripts, or reports mention
  `attune-opencode`
- **THEN** the measurement reports that mention as legacy entrypoint drift
- **AND** the implementation replaces it with `tend-opencode` unless the text
  is explicitly documenting prior harness history or removal debt

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
- **THEN** the measurement exits before command ladder, trace inventory, or
  micro-experiment collection begins
- **AND** the output is a sanitized failure summary that names the missing
  proof without dumping raw harness output

### Requirement: Preflight outputs are stored as sanitized local artifacts
The system SHALL store preflight outputs under `.attune/cache/measurement/opencode/`
and SHALL keep those artifacts local to the measurement cache.

#### Scenario: Preflight artifacts are captured
- **WHEN** fingerprint, harness self-test, debug info, or doctor output is
  collected during measurement
- **THEN** the implementation writes sanitized JSON or text artifacts under
  `.attune/cache/measurement/opencode/`
- **AND** those artifacts do not include raw prompts, full conversations,
  secrets, or private trace dumps

#### Scenario: Doctor confirms measurement readiness
- **WHEN** the measurement runs `nix run .#tend-opencode -- doctor --format json`
- **THEN** the result records harness and Trellis LS readiness as preflight
  evidence
- **AND** a missing Trellis diagnostic capability is reported as a measurement
  blocker or gap rather than silently bypassed

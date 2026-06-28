## ADDED Requirements

### Requirement: Command ladder report classifies validation cost
The system SHALL classify observed validation commands as cheap, medium,
expensive, or final-gate based on Tend observation timing, failure rate,
workflow role, and command scope.

#### Scenario: Command ladder report is produced
- **WHEN** all required command observations have been collected
- **THEN** the system produces
  `.attune/cache/measurement/reports/command-ladder.md`
- **AND** the report lists each command, inferred Nx target, inferred recipe ID
  when available, duration, exit code, and cost class
- **AND** the report explains which commands are appropriate for early
  diagnostic loops and which commands are final confirmation gates

#### Scenario: `workspace:policy-fast` is treated as final confirmation
- **WHEN** the command ladder classifies
  `pnpm exec nx run workspace:policy-fast --output-style=static`
- **THEN** the report marks it as a final-gate command unless the measurement
  data proves a narrower classification is justified
- **AND** the agent guidance says to run it near the end rather than as a
  reflexive first command outside explicit measurement

### Requirement: Repeated and failed commands are measured
The system SHALL count repeated commands, failed commands, expensive checks,
workspace-wide checks, and final-gate invocations during the measurement.

#### Scenario: Repeated command patterns are summarized
- **WHEN** command observations or safe historical trace metadata contain the
  same normalized command more than once for a comparable task phase
- **THEN** the command ladder report records the repeated pattern
- **AND** it identifies whether `tend-opencode` observation would have helped
  avoid or explain the repeat

#### Scenario: Failed command patterns are summarized
- **WHEN** an observed command exits nonzero
- **THEN** the report records the command family, exit code, duration, bounded
  failure summary, and suggested next diagnostic command
- **AND** it does not embed full raw stderr

### Requirement: Measurement recommends a diagnostic-first command sequence
The system SHALL use command ladder evidence to recommend a package-local,
diagnostic-first validation sequence for later migration agents.

#### Scenario: Package-local checks are preferred before workspace checks
- **WHEN** the measured task targets `packages/trellis/language-service`
- **THEN** the recommended sequence starts with `trellis-ls diagnostics` and
  package-local typecheck or test commands when they are sufficient
- **AND** workspace-wide policy or substrate checks are reserved for final
  confirmation or explicitly cross-cutting changes

#### Scenario: Expensive checks are observed before use
- **WHEN** a later measurement or harnessed migration needs an expensive
  command
- **THEN** the recommended sequence routes that command through
  `nix run .#tend-opencode -- observe --format json -- <command...>`
- **AND** the observation is included in the measurement cache for comparison

## ADDED Requirements

### Requirement: Command ladder report queries DB-backed observations
The system SHALL generate command ladder reports by querying DB-backed
observations for the active measurement session.

#### Scenario: Command ladder report is produced from store projections
- **WHEN** all required command observations have been collected
- **THEN** the system queries the framework store for command observations in
  the measurement session
- **AND** it produces
  `reports/tend-opencode-codex-measurement/command-ladder.md`
- **AND** the report lists each command, measurement phase, generic target ID,
  inferred Nx target when available, inferred recipe ID when available,
  duration, exit code, safe aggregate token/tool counts when available, store
  observation ID, store emission status, and cost class
- **AND** the report summarizes command timing with first/last observation,
  observed span, duration sample count, total/average/min/p50/p95/max duration,
  success rate, store-emission coverage, unknown target/recipe counts, unique
  target and recipe counts, and lifecycle/proof/diagnostic observation counts
- **AND** non-Nx producer commands such as `trellis-ls diagnostics` and
  `trellis-ls fixes` count as known target IDs when mapped to stable
  `trellis-ls:*` identities
- **AND** the report explains which commands are appropriate for early
  diagnostic loops and which commands are final confirmation gates
- **AND** the report is an export from stored observations, not durable truth

#### Scenario: `workspace:policy-fast` is classified without becoming final validation
- **WHEN** the command ladder includes
  `pnpm exec nx run workspace:policy-fast --output-style=static`
- **THEN** the report marks it as a final-gate command unless the measurement
  data proves a narrower classification is justified
- **AND** the agent guidance says to run it near the end for future migration
  work rather than as a reflexive first command
- **AND** this OpenSpec update does not require running `workspace:policy-fast`
  as an end-of-change validation

### Requirement: Repeated and failed commands are measured from observations
The system SHALL count repeated commands, failed commands, expensive checks,
workspace-wide checks, and final-gate invocations from DB-backed observations
and safe historical aggregate observations.

#### Scenario: Repeated command patterns are summarized
- **WHEN** command observations or safe historical trace metadata contain the
  same normalized command more than once for a comparable task phase
- **THEN** the command ladder report records the repeated pattern
- **AND** it identifies whether `tend-opencode` observation would have helped
  avoid or explain the repeat
- **AND** baseline-phase command observations are summarized separately from
  treatment-phase command observations when a controlled microbenchmark is
  present

#### Scenario: Failed command patterns are summarized
- **WHEN** an observed command exits nonzero
- **THEN** the report records the command family, exit code, duration, bounded
  failure summary, observation ID, and suggested next diagnostic command
- **AND** it does not embed full raw stderr

### Requirement: Measurement recommends a diagnostic-first command sequence
The system SHALL use stored command ladder evidence to recommend a
package-local, diagnostic-first validation sequence for later migration agents.

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
- **AND** the observation is inserted through the framework observation sink
  by default

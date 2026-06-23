## ADDED Requirements

### Requirement: Diagnostics and repairs are derived from the program index

Attune SHALL expose diagnostics and Nx repair plans derived from the SQLite
program index and reactive projections.

#### Scenario: Check runs

- **WHEN** `workspace:attune-check` or `<project>:attune-check` runs
- **THEN** it SHALL materialize or refresh relevant program index facts
- **AND** it SHALL report diagnostics from indexed facts and reactive
  projections

#### Scenario: Safe repair exists

- **WHEN** a diagnostic has a deterministic safe repair
- **THEN** Attune SHALL expose an Nx repair plan
- **AND** `attune-repair` SHOULD route to the correct generator or materializer
  internally

#### Scenario: Repair requires review

- **WHEN** a repair affects providers, destructive actions, external resources,
  or public stable ids
- **THEN** the repair SHALL be marked needs-review or manual-only

### Requirement: Repair plans identify safety and Nx action surface

Repair plans SHALL be queryable program-index facts that identify the
diagnostic, safety class, public Nx target, repair kind, and payload needed by
the repair implementation.

#### Scenario: Repair plan is stored

- **WHEN** Attune derives a repairable diagnostic
- **THEN** it SHALL store or project a repair plan with safety, Nx target,
  repair kind, payload, and creation time

#### Scenario: Public repair command runs

- **WHEN** `workspace:attune-repair` or `<project>:attune-repair` runs
- **THEN** it SHALL select safe repair plans from the program index projection
- **AND** it SHALL route to internal Nx materializers or generators without
  requiring agents to memorize raw generator names

### Requirement: Compatibility inputs are indexed during migration

The existing package-contract/generated-companion layer SHALL remain ingestible
as transitional input while the program index becomes authoritative for checks.

#### Scenario: Existing generated companion is present

- **WHEN** Attune finds `attune.contract.generated.ts`,
  `attune.generated.ts`, generated contract shards, package-contract typecheck
  aggregates, or `attune.source-bom.json`
- **THEN** it SHALL be able to ingest those artifacts as symbol, artifact,
  observation, diagnostic, repair, or source ownership facts

#### Scenario: Program index reaches parity

- **WHEN** program-index checks can answer the same diagnostics currently
  answered by generated companions or Source BOM shards
- **THEN** later changes MAY delete or demote those generated companions
- **AND** this change SHALL NOT require deleting them during the active
  migration

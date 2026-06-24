## ADDED Requirements

### Requirement: Project-local generated companion ratchets are ring based

Attune SHALL ratchet project-local generated companion policy by validated
project rings rather than breaking all projects at once.

#### Scenario: Ring reaches program-index parity
- **WHEN** a project ring validates under program-index-backed diagnostics,
  repair plans, and compatibility fallback
- **THEN** architecture policy MAY ratchet project-local generated companion
  diagnostics for that ring from warning to error

#### Scenario: Ring has not reached parity
- **WHEN** a project ring has not validated under the program-index path
- **THEN** project-local generated companion diagnostics SHALL remain warnings
  or tracked migration debt
- **AND** provider/proof packages SHALL NOT be blocked prematurely

### Requirement: Ring validation uses public Nx workflow

Project-ring validation SHALL use public Nx check, repair, typecheck, and test
targets.

#### Scenario: Ring A validates
- **WHEN** Ring A packages `effect-oxlint-policy`, `attuned-discovery`, and
  `attune-foldkit` are evaluated
- **THEN** validation SHALL include their focused tests or typechecks where
  available and `workspace:attune-check`

#### Scenario: Ring B validates
- **WHEN** Ring B packages `attune-nx`, `cocoindex-effect`, and `joern-effect`
  are evaluated
- **THEN** validation SHALL include focused package tests and framework check or
  repair dry-run targets where relevant

#### Scenario: Ring C validates
- **WHEN** Ring C packages `attune-pi-agent`, `joern-effect-properties`,
  `home-deployment`, and `platform-alchemy-k8s` are evaluated
- **THEN** validation SHALL use cheap project-local tests by default
- **AND** proof-pressure, container fuzzing, provider, Kubernetes, or live
  destructive targets SHALL NOT run unless explicitly authorized

### Requirement: Old ontology surfaces require deletion preconditions

Package-contract ontology surfaces SHALL be deleted, renamed, quarantined, or
moved to historical context after replacement paths and validation gates are
documented.

#### Scenario: Surface is inventoried
- **WHEN** an old package-contract law, type-guidance, RPC descriptor,
  PackageFuzzHandlers, PackageProperties, Source BOM shard, or generated
  companion surface is inventoried
- **THEN** it SHALL be classified as still required, compatibility-only,
  safe-to-delete, or unsafe-to-delete

#### Scenario: Surface is scheduled for deletion
- **WHEN** a compatibility surface is scheduled for deletion
- **THEN** the deletion plan SHALL name the program-index replacement path,
  project rings covered, validation gates, and rollback/fallback behavior

#### Scenario: Surface is safe to delete
- **WHEN** a compatibility surface is classified as safe-to-delete
- **THEN** the implementation SHALL delete, rename, quarantine, or archive it
  in this change
- **AND** active docs and diagnostics SHALL stop presenting it as normal
  workflow

#### Scenario: Surface cannot be deleted in this change
- **WHEN** a compatibility surface is still required or unsafe to delete
- **THEN** the implementation SHALL record the blocker, owner, replacement
  path, and future OpenSpec or validation gate required for removal

### Requirement: Public docs teach program index and check/repair

Agent-facing docs SHALL teach the program-index check/repair loop as the
primary workflow and SHALL remove old package-contract ontology terms from
normal instructions for migrated rings.

#### Scenario: Agent reads operating docs
- **WHEN** an agent reads AGENTS or the Attune Framework operating surface docs
- **THEN** the default guidance SHALL be to edit source intent, run
  `attune-check`, run suggested `attune-repair`, then run focused typecheck or
  test
- **AND** docs SHALL NOT teach raw generator names or old generated companion
  files as the default workflow

#### Scenario: Advanced compatibility docs are needed
- **WHEN** docs mention package contracts, Source BOM shards, type guidance,
  laws, generated companions, or package fuzz maps for migrated rings
- **THEN** those terms SHALL be removed from normal instructions or moved to
  historical/legacy-adapter sections
- **AND** any retained mention SHALL name the mechanical replacement

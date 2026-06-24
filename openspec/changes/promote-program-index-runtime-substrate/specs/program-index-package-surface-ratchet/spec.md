## ADDED Requirements

### Requirement: Package-local generated companion ratchets are ring based

Attune SHALL ratchet package-local generated companion policy by validated
package rings rather than breaking all packages at once.

#### Scenario: Ring reaches program-index parity
- **WHEN** a package ring validates under program-index-backed diagnostics,
  repair plans, and compatibility fallback
- **THEN** architecture policy MAY ratchet package-local generated companion
  diagnostics for that ring from warning to error

#### Scenario: Ring has not reached parity
- **WHEN** a package ring has not validated under the program-index path
- **THEN** package-local generated companion diagnostics SHALL remain warnings
  or tracked migration debt
- **AND** provider/proof packages SHALL NOT be blocked prematurely

### Requirement: Ring validation uses public Nx workflow

Package-ring validation SHALL use public Nx check, repair, typecheck, and test
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
- **THEN** validation SHALL use cheap package-local tests by default
- **AND** proof-pressure, container fuzzing, provider, Kubernetes, or live
  destructive targets SHALL NOT run unless explicitly authorized

### Requirement: Old ontology surfaces require deletion preconditions

Package-contract ontology surfaces SHALL not be deleted until replacement paths
and validation gates are documented.

#### Scenario: Surface is inventoried
- **WHEN** an old package-contract law, type-guidance, RPC descriptor,
  PackageFuzzHandlers, PackageProperties, Source BOM shard, or generated
  companion surface is inventoried
- **THEN** it SHALL be classified as still required, compatibility-only,
  safe-to-delete, or unsafe-to-delete

#### Scenario: Surface is scheduled for deletion
- **WHEN** a compatibility surface is scheduled for deletion
- **THEN** the deletion plan SHALL name the program-index replacement path,
  package rings covered, validation gates, and rollback/fallback behavior

### Requirement: Public docs teach program index and check/repair

Agent-facing docs SHALL teach the program-index check/repair loop as the
primary workflow while marking old package-contract ontology terms as
compatibility/migration details.

#### Scenario: Agent reads operating docs
- **WHEN** an agent reads AGENTS or the Attune Framework operating surface docs
- **THEN** the default guidance SHALL be to edit source intent, run
  `attune-check`, run suggested `attune-repair`, then run focused typecheck or
  test
- **AND** docs SHALL NOT teach raw generator names or old generated companion
  files as the default workflow

#### Scenario: Advanced compatibility docs are needed
- **WHEN** docs mention package contracts, Source BOM shards, type guidance,
  laws, generated companions, or package fuzz maps
- **THEN** those terms SHALL be labeled compatibility, migration, or advanced
  implementation details unless they are still required by a specific validated
  path

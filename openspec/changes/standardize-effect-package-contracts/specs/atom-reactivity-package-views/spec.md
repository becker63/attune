## ADDED Requirements

### Requirement: Packages expose atom/Reactivity view graphs
Every active package SHALL expose its meaningful read and reasoning state as a
package atom/Reactivity view graph declared by the package contract.

#### Scenario: Package view graph is declared
- **WHEN** package-contract conformance loads an active package
- **THEN** it MUST discover the package's Reactivity keys, base atoms, derived
  atoms, package view atoms, and operation-to-view graph edges

#### Scenario: Missing package view graph is reported
- **WHEN** an active package has service operations but no package
  atom/Reactivity view graph
- **THEN** conformance MUST report the package as missing semantic observation
  coverage

### Requirement: Package view graphs stay package-level
Package atom/Reactivity view graphs SHALL describe stable semantic views of the
package boundary, not every internal read model, temporary value, local helper,
or fixture-only state.

#### Scenario: Stable semantic view atoms are sufficient
- **WHEN** a package declares package status, evidence, coverage, readiness,
  registry, plan, result, or domain view atoms that expose the meaningful
  effects of public auditable operations
- **THEN** atom graph conformance MUST accept the package view graph without
  requiring atoms for every internal helper or intermediate value

#### Scenario: Meaningful public state is hidden
- **WHEN** a public auditable operation mutates or observes meaningful package
  state that cannot be reached through any declared Reactivity key, base atom,
  derived atom, or package view atom
- **THEN** atom graph conformance MUST report missing package-level semantic
  observation coverage

#### Scenario: Fixture-only state remains private
- **WHEN** local fixture state exists only to support tests or examples and is
  not part of package behavior
- **THEN** the package contract MAY omit fixture-only atoms unless the fixture
  boundary is itself declared as a public auditable operation

### Requirement: Atoms are read and reasoning surfaces only
Package atoms SHALL NOT own durable writes, provider actions, external service
calls, scheduler/resource lifecycle, EventLog appends, or hidden mutable state.
Effect services own actions, projections own durable materialization, Reactivity
announces freshness, and atoms expose recomputable views.

#### Scenario: Atom writes durable state
- **WHEN** architecture policy detects an atom that appends EventLog events,
  writes projections, performs provider actions, or calls external services
- **THEN** policy MUST fail with the atom file and the required Effect service
  boundary

#### Scenario: Atom derives package view
- **WHEN** an atom reads from package read-model services or other atoms and
  exposes recomputable package state
- **THEN** conformance MUST accept the atom as part of the package view graph

### Requirement: Reactivity keys connect writes to base atoms
Package operations that mutate meaningful package facts SHALL declare or derive
the Reactivity keys they can mutate, and base atoms SHALL subscribe to the keys
that refresh their read-model inputs.

#### Scenario: Operation mutates package fact
- **WHEN** a package operation appends an event, records provider evidence, or
  writes a projection
- **THEN** the package view graph MUST include at least one Reactivity key that
  connects the mutation to a base atom

#### Scenario: Dead invalidation is detected
- **WHEN** a Reactivity key is declared or emitted but no base atom subscribes
  to it
- **THEN** atom graph conformance MUST report the key as a dead invalidation

### Requirement: Derived atoms compose base atoms
Derived atoms SHALL compose base atoms or other derived atoms. They SHALL NOT
manually subscribe to Reactivity keys unless they directly read durable package
facts.

#### Scenario: Derived atom manually subscribes without durable read
- **WHEN** a derived atom subscribes to a Reactivity key but does not directly
  read durable package facts
- **THEN** conformance MUST fail and require the atom to compose the relevant
  base atom instead

#### Scenario: Base atom subscribes to freshness key
- **WHEN** a base atom reads package facts refreshed by a Reactivity key
- **THEN** conformance MUST accept the direct Reactivity subscription

### Requirement: Atom graph coverage is the primary semantic coverage gate
Generated property and fuzz targets SHALL treat coherent atom/Reactivity graph
movement as the primary semantic coverage signal for package operations.
V8/Istanbul coverage SHALL remain a secondary implementation and dead-harness
signal.

#### Scenario: Operation moves package view graph
- **WHEN** a generated property case runs a package operation
- **THEN** coverage evidence MUST record the operation, Reactivity keys mutated,
  base atoms refreshed, derived atoms recomputed, package view atoms changed,
  and resulting view diffs when those observations are available

#### Scenario: Operation lacks graph movement
- **WHEN** a generated property case reaches implementation code for an
  operation that should mutate meaningful package state but no Reactivity key,
  base atom, derived atom, or package view atom changes
- **THEN** coverage conformance MUST report missing semantic graph coverage

#### Scenario: V8 coverage cannot replace graph coverage
- **WHEN** V8/Istanbul coverage is high but required package view graph movement
  is missing
- **THEN** coverage conformance MUST fail on atom graph coverage

#### Scenario: Parallel graph evidence merges by identity
- **WHEN** multiple workerized property shards observe atom/Reactivity graph
  movement for the same package operation
- **THEN** coverage merge MUST de-duplicate observations by package id,
  operation id, Reactivity key, atom id, view edge, seed, and shard metadata

### Requirement: Atom graph facts feed framework diagnostics
The system SHALL project atom/Reactivity graph facts into language-service
diagnostics and Nx output from package contracts, Nx project metadata,
generator provenance, Effect DI, Reactivity keys, atom graphs, and local
framework runtime/cache. Checked-in atom coverage reports SHALL NOT be required
as the semantic workflow surface.

#### Scenario: Atom graph diagnostic is generated
- **WHEN** package-contract sync or framework diagnostics run
- **THEN** they MUST be able to diagnose missing atom/Reactivity graph coverage
  for active packages from package contract and source discovery inputs

#### Scenario: Checked-in atom report is rejected
- **WHEN** a checked-in atom coverage report or BOM-like ledger duplicates
  protocol runtime facts as workflow truth
- **THEN** policy MUST reject the report and direct the author to source
  declarations, generated source required by build/typecheck, language-service
  diagnostics, Nx output, or gitignored local cache

### Requirement: Fuzz findings propose missing package-view tests or invariants
The system SHALL report agent-actionable missing test or invariant findings
when generated property or fuzz runs observe missing graph movement, dead
invalidation, unobserved package view state, survived mutants, or V8-covered
branches without package view changes.

#### Scenario: Covered branch has no package view effect
- **WHEN** a generated case covers implementation code but produces no expected
  package view graph movement
- **THEN** the finding MUST identify the operation, coverage point, observed
  graph state, replay metadata, and suggested missing invariant or generator
  improvement

#### Scenario: Mutant survives covered graph path
- **WHEN** mutation testing changes code on an atom-covered operation path and
  generated properties still pass
- **THEN** the finding MUST classify the result as a likely missing invariant or
  weak oracle rather than a raw coverage failure

### Requirement: Protocol views include atom/Reactivity projections
Package atom/Reactivity view graphs SHALL be protocol views over materialized
package facts. The protocol runtime SHALL record the obligations and evidence
needed to prove that operations announce freshness, base atoms refresh, derived
atoms recompute, and package view atoms move.

#### Scenario: Protocol obligation references atom graph
- **WHEN** a package contract declares Reactivity keys, base atoms, derived
  atoms, package view atoms, or operation-to-view edges
- **THEN** the protocol runtime MUST derive obligations for Reactivity key
  emission, base atom refresh, derived atom recomputation, package view atom
  changes, and view-edge movement

#### Scenario: Atom evidence records protocol event
- **WHEN** a generated property, conformance check, or runtime observation sees
  Reactivity key emission or atom graph movement
- **THEN** it MUST be recordable as Attune Protocol Evidence with package id,
  operation id, Reactivity key, atom id, view edge, seed or run id, and
  observation payload

#### Scenario: Missing movement becomes framework diagnostic
- **WHEN** an operation reaches implementation code but required
  atom/Reactivity graph movement is absent
- **THEN** the protocol runtime MUST expose internal delta state that is shown
  through language-service diagnostics and Nx output, with future FoldKit UI as
  an optional view

#### Scenario: FoldKit UI reads projection
- **WHEN** a future FoldKit/Workbench view shows protocol status
- **THEN** it MUST consume protocol diagnostic/query projections and MUST NOT
  recompute package atom/Reactivity semantics independently

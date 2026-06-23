## ADDED Requirements

### Requirement: Property harnesses are generated from operation contracts
For each public auditable operation, the system SHALL generate or sync a
FastCheck property harness from the operation's Effect Schema metadata,
operation kind, law packs, and coverage expectations.

#### Scenario: New operation gets generated audit
- **WHEN** an agent adds an auditable operation through an `@attune/nx`
  generator
- **THEN** the package MUST gain a generated property harness entry for that
  operation without requiring the agent to hand-write a bespoke test first

#### Scenario: Unauditable operation requires waiver
- **WHEN** an operation cannot derive a FastCheck arbitrary or cannot run in a
  deterministic test layer
- **THEN** the package contract MUST record an audit waiver or property
  conformance MUST fail

### Requirement: Property harnesses invoke packages through Schema-coded generated protocols
Generated property and fuzz harnesses SHALL invoke package operations through
generated Schema-coded package harness protocols whose payload, success, and
error values are derived from the package contract schemas. Runtime
`@effect/rpc` MAY provide the generated harness backend when compatibility is
available, but it is not the root primitive and MUST NOT block the protocol
runtime migration while the workspace remains on an Effect 4 beta stack.
Hand-rolled invocation envelopes SHALL NOT become a separate fuzzer protocol.

#### Scenario: Operation-specific harness is used
- **WHEN** a generated property case invokes a public auditable operation
- **THEN** it MUST call the generated operation-specific harness entry, or a
  generated registry entry backed by that harness, rather than importing the
  package's private implementation

#### Scenario: Harness handler is PackageTestLayer-backed
- **WHEN** the generated harness handler executes during a property or fuzz run
- **THEN** it MUST run with `PackageTestLayer` and call the declared public
  service/accessor/generator/provider/policy/projection/query/command boundary

#### Scenario: Harness protocol is schema-coded
- **WHEN** a property or fuzz case crosses a worker, process, corpus, replay, or
  report boundary
- **THEN** operation payloads, successes, typed errors, observations, coverage
  deltas, law results, counterexamples, replay seeds, and agent findings MUST
  encode or decode through Effect Schema-backed protocol values

#### Scenario: Harness control RPCs expose observation
- **WHEN** a property runner needs to reset state, snapshot atoms, observe
  Reactivity, flush evidence, replay a counterexample, read coverage, or read
  the atom graph
- **THEN** it MUST use generated Schema-backed harness control operations
  instead of package-specific test helpers

### Requirement: Operation inputs use Effect Schema arbitraries
Generated property harnesses SHALL derive operation input arbitraries from
Effect Schema using Effect's Schema to Arbitrary integration, such as
`Arbitrary.make(schema)`, before applying any package-specific weighting,
coverage bias, or corpus replay.

#### Scenario: Harness derives input from schema
- **WHEN** a generated property harness is created for an auditable operation
- **THEN** it MUST derive the base FastCheck arbitrary from the operation's
  Effect Schema input contract

#### Scenario: Custom arbitrary is waivered
- **WHEN** a package uses a custom FastCheck arbitrary that is not a refinement
  or weighting of the Schema-derived arbitrary
- **THEN** the package contract MUST include a waiver explaining why the Effect
  Schema arbitrary is insufficient

### Requirement: Property generation consumes inferred contract types
Generated property, fuzz, replay, and evidence modules SHALL consume the
type-level contract outputs derived from `definePackageContract` instead of
redeclaring operation ids, input/output/error types, RPC shapes, law lists, or
view references by hand.

#### Scenario: Property input type comes from operation id
- **WHEN** a generated property module targets a package operation id
- **THEN** its generated input type, encoded replay payload type, success type,
  and typed error type MUST be derived from the package contract's operation
  schema helpers

#### Scenario: Evidence type includes inferred law ids
- **WHEN** property evidence is emitted for an operation
- **THEN** the evidence type MUST include the operation's inferred and custom
  law ids as derived from the package contract

#### Scenario: Replay payload uses encoded schema type
- **WHEN** a counterexample or retained corpus seed is persisted
- **THEN** its payload MUST use the operation input schema's encoded type rather
  than the in-memory decoded type unless the schema declares they are the same

#### Scenario: Generated module rejects stale operation id
- **WHEN** an operation id changes or is removed from the package contract
- **THEN** generated property, fuzz, replay, and evidence modules MUST fail
  typecheck or generated-output conformance until regenerated

### Requirement: Evidence maps are not authored in package declarations
The framework SHALL NOT require package authors to inline property, fuzzer,
replay, coverage-search, or evidence producer metadata in
`attune.package.ts`. That metadata SHALL be generated, discovered, or stored as
protocol projection state.

#### Scenario: Property harness targets operation
- **WHEN** an operation requires property evidence
- **THEN** generated or package-local evidence modules MAY implement the
  harness
- **AND** `attune.package.ts` SHALL only identify the operation/source intent
  needed for diagnostics and repair when the package declaration participates in
  the evidence workflow

#### Scenario: Coverage search needs retained state
- **WHEN** FastCheck retains seeds, coverage feedback, weak-oracle findings, or
  counterexample replay metadata
- **THEN** that state SHALL live in generated evidence modules, framework
  testing helpers, stdout/CI artifacts, or private ProtocolStore/cache
  projections, not package declarations

### Requirement: Evidence expectations are derived from operation symbols and obligations
Generated property and evidence modules SHALL derive operation identity, law
obligations, type-guidance partitions, view obligations, replay payloads, and
evidence schemas from the source operation symbol and materialized descriptor.

#### Scenario: Property references operation symbol
- **WHEN** a property harness targets an operation
- **THEN** it SHOULD target the operation declaration or generated operation
  registry entry rather than a hand-authored raw operation ID string

#### Scenario: Evidence uses serialized identity
- **WHEN** property evidence is recorded
- **THEN** it MUST include stable serialized package and operation IDs for
  runtime/cache/replay
- **AND** those IDs MUST be derived from the source descriptor or generated
  registry

#### Scenario: Evidence ID is generated at runtime
- **WHEN** a property run, replay, atom movement observation, coverage sample,
  provider observation, or generated artifact check records evidence
- **THEN** the evidence event ID MUST be generated by the evidence/runtime
  system from the run context and serialized descriptor identity rather than
  hand-authored in package declarations

### Requirement: Fuzzing is guided by contract-derived type partitions
The property and fuzz runtime SHALL consume Schema-backed type-guidance
partitions derived from package contracts. TypeScript SHALL validate that the
guidance is complete and aligned with operation ids, Schema input/output/error
types, inferred laws, declared views, operation kind metadata, and generated
harness artifacts.

#### Scenario: Type guidance is generated from contract metadata
- **WHEN** a package declares auditable operations
- **THEN** generated or sync-generated type guidance MUST derive partitions
  from operation ids, operation kinds, Effect Schema AST information, Schema
  annotations, input/output/error discriminants, literal and enum values,
  brands/refinements when representable, optional and required fields,
  boundary annotations, inferred law ids, custom law ids, declared Reactivity
  keys, atom ids, resource/destructive metadata, projection state transitions,
  generator provenance metadata, policy finding metadata, and Joern/template
  metadata

#### Scenario: Type guidance is checked by TypeScript
- **WHEN** generated type guidance is emitted for a package
- **THEN** a compile-only assertion such as
  `AssertTypeGuidanceComplete<Contract, Guidance>` MUST reject missing
  operations, stale operation ids, stale law ids, stale view ids, missing
  typed-error partitions, and guidance entries that no longer match the
  package contract

#### Scenario: Type partition coverage is recorded
- **WHEN** a generated property or fuzz run executes cases for an operation
- **THEN** property evidence MUST record which type-guidance partitions were
  hit, missed, unreachable, filtered, or only reachable through retained corpus
  seeds

#### Scenario: Missing type partition biases search
- **WHEN** prior evidence reports a missing input variant, typed-error variant,
  output variant, law partition, view partition, resource observation state, or
  Schema boundary partition
- **THEN** the next targeted property run MAY bias Schema-derived arbitraries
  with transforms, weights, or corpus replay toward that missing type partition

#### Scenario: Type guidance does not replace Schema authority
- **WHEN** type guidance is used to steer generation
- **THEN** generated values MUST still originate from Effect Schema-derived
  arbitraries or Schema-backed corpus/replay values, and type guidance MUST NOT
  become a second hand-authored arbitrary catalog

#### Scenario: Unreachable type partition becomes an agent finding
- **WHEN** a declared type-guidance partition repeatedly remains unhit because
  generators filter it out, no constructive transform can produce it, or the
  implementation cannot reach it
- **THEN** property evidence MUST report a generator-quality, schema-guidance,
  weak-oracle, or unreachable-implementation finding with replay and coverage
  context for the agent

### Requirement: Coverage transforms preserve schema authority
Coverage-guided property harnesses SHALL apply FastCheck search transforms only
after deriving the base arbitrary from Effect Schema, and SHALL record transform
metadata in property evidence when transforms bias generation toward missing
coverage, corpus replay, or specific operation states.

#### Scenario: Transform targets missing semantic partition
- **WHEN** prior evidence reports a missing schema branch, operation state,
  type-guidance partition, expected error path, Reactivity key, atom graph edge,
  or V8/Istanbul coverage point
- **THEN** the next targeted property run MAY apply `map`, `chain`, `oneof`, or
  weighted composition to the Schema-derived arbitrary to bias generation
  toward that partition

#### Scenario: Transform metadata is retained
- **WHEN** a transformed generated case reaches new semantic graph movement,
  new implementation coverage, or a counterexample
- **THEN** the property evidence MUST record the transform id, target partition,
  seed, shrink path when available, generated value summary, and corpus entry
  if one was used

### Requirement: FastCheck filters are measured escape hatches
Generated property harnesses SHALL prefer Effect Schema constraints and
constructive search transforms over FastCheck `.filter`. When a filter is used,
the property evidence SHALL record the filter identity, reason, rejection count,
acceptance rate, and whether the filter represents a schema refinement,
operation precondition, corpus replay guard, or temporary harness workaround.

#### Scenario: Cheap high-acceptance filter is accepted
- **WHEN** a generated property uses a cheap filter with a high acceptance rate
  to model an operation precondition that cannot yet be expressed
  constructively
- **THEN** the property evidence MUST record the measured acceptance rate and
  conformance MAY accept the filter

#### Scenario: High-rejection filter becomes generator finding
- **WHEN** a generated property filter rejects enough generated values to make
  the search inefficient or distort coverage
- **THEN** coverage conformance MUST report a generator-quality finding that
  points to schema refinement, constructive transform, or corpus promotion as
  the preferred fix

### Requirement: Workerized property execution uses @fast-check/worker
The system SHALL execute generated predicates through `@fast-check/worker` for
property and fuzz targets that need parallelism, timeout protection, stronger
isolation, or long-running coverage search.

#### Scenario: Worker property is generated
- **WHEN** a package property target is marked workerized
- **THEN** the generated property module MUST hoist properties at module scope
  and use `propertyFor(new URL(import.meta.url))` to build worker-executable
  properties

#### Scenario: Worker assertion cleans up workers
- **WHEN** a workerized property target runs
- **THEN** it MUST use the worker-aware `assert` from `@fast-check/worker` or an
  Nx-owned wrapper around it so workers are cleaned up when the target exits

#### Scenario: Hanging predicate is isolated
- **WHEN** a generated predicate enters a synchronous loop or exceeds its worker
  timeout
- **THEN** the workerized runner MUST fail or report the case with package,
  operation, seed, path when available, timeout, isolation level, and worker
  metadata instead of blocking the whole property process indefinitely

### Requirement: Worker tiers preserve replay and shrinking when possible
Workerized property targets SHALL default to main-thread random generation to
preserve FastCheck shrinking and seed/path replay. Worker-side generation MAY be
used only when generated values cannot be serialized between threads, and the
run evidence MUST record the shrink/replay limitation.

#### Scenario: Main-thread random source preserves shrinking
- **WHEN** generated operation inputs are serializable between the main thread
  and workers
- **THEN** the workerized runner MUST use the main-thread random source by
  default so failing cases retain FastCheck shrinking and seed/path replay

#### Scenario: Worker random source records limitation
- **WHEN** a target uses worker-side random generation for non-serializable
  values
- **THEN** property evidence MUST record the `randomSource`, the reason for
  worker-side generation, and the resulting shrink limitation

### Requirement: Worker isolation and parallelism are budgeted
Workerized property targets SHALL declare worker count, isolation level, timeout
budget, seed range or shard id, and resource tier through Nx target options or
package contract metadata.

#### Scenario: Proof-pressure target declares worker budget
- **WHEN** `workspace:policy-proof-pressure` runs workerized property targets
- **THEN** each target MUST run with explicit worker count, isolation level,
  timeout, and shard metadata

#### Scenario: Commit-tier target remains bounded
- **WHEN** `workspace:policy-fast` runs workerized property targets
- **THEN** worker count and timeout budgets MUST be bounded for commit-tier
  latency and deterministic local reproduction

### Requirement: Audits execute through Effect DI layers
Generated property audits SHALL execute operations through generated
Schema-coded harness clients and handlers backed by the package's public Effect
service accessors and `PackageTestLayer`, not by importing private
implementation functions. Runtime `@effect/rpc` MAY back those clients and
handlers when compatible, but the required invariant is the generated
Schema-coded package boundary.

#### Scenario: Audit uses public service boundary
- **WHEN** the property runner tests a service operation
- **THEN** it MUST call the operation through the generated package harness
  client whose handler reaches the package's public service boundary with
  `PackageTestLayer` provided

#### Scenario: Missing dependency is detected
- **WHEN** `PackageTestLayer` does not satisfy a service dependency required by
  an operation
- **THEN** property conformance MUST fail before the operation is considered
  covered

### Requirement: Audits validate schemas and typed failures
Generated property audits SHALL validate generated inputs, successful outputs,
and expected failures against the operation schemas declared in the package
contract.

#### Scenario: Successful output decodes
- **WHEN** a generated property case completes successfully
- **THEN** the returned value MUST decode through the declared output schema

#### Scenario: Failure stays in declared error channel
- **WHEN** a generated property case fails in an expected way
- **THEN** the failure MUST decode through the declared typed error schema or be
  reported as an undeclared defect

### Requirement: Operation-kind law descriptors are enforced
Generated property audits SHALL apply inferred law descriptors based on
operation kind and SHALL allow package-specific laws to extend those checks.

#### Scenario: All canonical kinds have law inference entries
- **WHEN** the law-pack registry is loaded
- **THEN** it MUST include inference entries for `codec`, `query`, `command`,
  `projection`, `event-facade`, `atom-family`, `resource-provider`,
  `generator`, `policy-rule`, and `joern-template`

#### Scenario: Canonical kinds map to shared law primitives
- **WHEN** inferred law descriptors are registered for a canonical operation
  kind
- **THEN** it MUST compose from the shared law primitives for schema validation,
  determinism or idempotence where declared, side-effect boundary checks, and
  view movement where the operation declares meaningful state change before
  adding package-specific laws

#### Scenario: Inferred laws drive law-pack execution
- **WHEN** a generated property audit loads an operation contract
- **THEN** it MUST execute the inferred law descriptors derived from operation
  kind, schemas, annotations, views, destructive/resource metadata,
  projection/generator metadata, and custom law extensions

#### Scenario: Pure operation uses compact law kernel
- **WHEN** an operation is marked `codec`, `query`, `policy-rule`, or
  `atom-family` and does not declare custom domain laws
- **THEN** the generated property audit MAY satisfy the operation with the
  shared schema, determinism, side-effect boundary, and view-movement laws that
  apply to the operation metadata

#### Scenario: Resource provider idempotence is checked by observation
- **WHEN** an operation is marked `resource-provider`
- **THEN** the generated law pack MUST check that an already-observed desired
  state returns observed or applied evidence without repeating the destructive
  action

#### Scenario: Generator determinism is checked
- **WHEN** an operation is marked `generator`
- **THEN** the generated law pack MUST check that the same virtual tree and
  options produce deterministic output and provenance

#### Scenario: Projection replay law is checked
- **WHEN** an operation is marked `projection`
- **THEN** the generated law pack MUST check deterministic replay behavior for
  generated event sequences

### Requirement: Property evidence owns non-static invariants
Generated property audits SHALL prove behavioral invariants that cannot be
fully established by TypeScript, Effect Schema, Effect DI, or generated
artifact freshness. Type-level helpers SHALL guarantee that the property
harness targets the right operation, schemas, laws, views, and handlers; runtime
property evidence SHALL prove the behavior actually occurs.

#### Scenario: Type system wires the harness
- **WHEN** a generated property harness is created for an operation
- **THEN** operation id, input/output/error types, optional RPC id or harness
  id, law ids, view references, evidence shape, replay shape, counterexample
  shape, and required `PackageTestLayer` services MUST come from the package
  contract's inferred type outputs

#### Scenario: Runtime proves observed behavior
- **WHEN** an invariant depends on generated values executing package code,
  provider state, scheduler/resource side effects, destructive-operation
  observation, atom/Reactivity movement, implementation coverage, mutation
  survival, or hidden host-state reads
- **THEN** the generated property, fuzz, provider, or coverage run MUST emit
  runtime evidence rather than relying on static type success

#### Scenario: Destructive idempotence is observation-based
- **WHEN** a resource-provider operation claims observed idempotence
- **THEN** the property or provider harness MUST first ask whether the desired
  state is already observed and MUST report observed/applied evidence without
  repeating destructive work when the state is already correct

### Requirement: Property evidence records semantic coverage
The property runner SHALL emit evidence for runs, seeds, case counts, schema
branches, service operations, law packs, Reactivity keys, base atom refreshes,
derived atom recomputations, package view atom diffs, state transitions,
expected error paths, counterexamples, shrink paths, worker ids, shard ids,
isolation level, random source, timeout settings, and worker failures.

#### Scenario: Evidence event is recorded
- **WHEN** a package property target completes
- **THEN** it MUST record structured evidence in the private framework
  runtime/cache containing package id, service id, operation id, run count,
  seed, Reactivity keys hit, atoms refreshed, view atoms changed, transitions
  hit, laws checked, missing graph coverage, worker/shard metadata, and
  counterexample references

#### Scenario: Missing atom graph movement fails conformance
- **WHEN** a package contract declares required package view graph movement and
  no property run observes that Reactivity key, atom refresh, or package view
  change
- **THEN** coverage conformance MUST fail with the package, operation, and
  missing graph edge

### Requirement: Counterexamples are replayable
When FastCheck finds a failure, the system SHALL persist enough metadata in the
local framework runtime/cache to replay the failure, including package id,
property id, seed, shrink path, generated value summary, and Attune failure
context. Diagnostics, Nx output, or optional ephemeral debug/CI output MAY show
that metadata, but checked-in counterexample reports are not required.

#### Scenario: Failed case reports replay metadata
- **WHEN** a generated property case fails
- **THEN** the failure output MUST include seed and shrink path metadata that a
  follow-up run can use to replay the counterexample

#### Scenario: Counterexample can become fixture
- **WHEN** a counterexample is promoted into a checked fixture or corpus entry
- **THEN** the fixture or corpus entry MUST link to the original failing
  property id and replay metadata without requiring a checked-in evidence
  summary report

### Requirement: Coverage search targets missing semantic partitions
The property evidence loop SHALL support reruns that bias generation toward
missing atom/Reactivity graph movement, schema variants, transitions, or
expected error paths reported by prior evidence.

#### Scenario: Missing transition biases next run
- **WHEN** coverage conformance reports a missing required transition
- **THEN** the next targeted property run MUST be able to bias its arbitraries
  toward cases that can hit that transition

#### Scenario: Search remains deterministic
- **WHEN** a targeted property run uses coverage bias
- **THEN** the run MUST still record deterministic seed and configuration
  metadata sufficient for replay

### Requirement: Coverage-guided search uses V8/Istanbul feedback
Coverage-guided property targets SHALL collect V8/Istanbul coverage feedback
and use coverage deltas together with missing atom/Reactivity graph movement,
schema variants, state transitions, and expected error paths to bias subsequent
FastCheck runs. Atom graph coverage expectations remain the primary conformance
gate.

#### Scenario: Commit-tier batch retains useful seed
- **WHEN** a bounded commit-tier property batch reaches a previously unseen
  implementation branch, function, or range for a package operation
- **THEN** the runner MUST retain the seed, generated value summary, transform
  and filter metadata, and coverage point as useful feedback for future runs

#### Scenario: Worker coverage merges deterministically
- **WHEN** proof-pressure or fuzz targets collect V8/Istanbul feedback from
  multiple `@fast-check/worker` shards
- **THEN** the merge target MUST de-duplicate coverage evidence by package id,
  operation id, source coverage point, atom graph edge when present, seed,
  shrink path, worker id, and shard id

#### Scenario: Code coverage identifies dead harness path
- **WHEN** a generated property target completes with semantic cases but no
  meaningful V8/Istanbul coverage for the operation implementation
- **THEN** coverage conformance MUST report the operation as an ineffective or
  dead harness path

#### Scenario: Coverage delta biases generation
- **WHEN** a generated input reaches a previously uncovered branch, line, or
  function in the operation implementation
- **THEN** the coverage-guided search target MUST be able to retain that seed or
  generation path as useful feedback for later runs

#### Scenario: Covered implementation without graph movement flags weak oracle
- **WHEN** a generated input reaches meaningful operation implementation code
  but does not produce required law observations, Reactivity key movement, atom
  refreshes, package view diffs, or expected error paths
- **THEN** coverage conformance MUST report the case as a weak-oracle or
  missing-invariant finding with replay metadata for the agent

#### Scenario: Raw percentage is not the contract
- **WHEN** V8/Istanbul line coverage is high but required atom/Reactivity graph
  movement or transitions are missing
- **THEN** coverage conformance MUST still fail for the missing atom graph
  coverage

### Requirement: Property tiers compose with workspace policy
The property evidence system SHALL define cheap deterministic audits for
`workspace:policy-fast` and first-class property or fuzz campaigns for
`workspace:policy-proof-pressure` or scheduled runs. The fuzzer is part of the
initial property evidence architecture even when fast local policy runs only a
bounded subset.

#### Scenario: Fast policy runs cheap audits
- **WHEN** `workspace:policy-fast` runs
- **THEN** it MUST include cheap package contract, service conformance, and
  generated property evidence checks that do not require Joern, containers,
  hardware, host secrets, or destructive resources

#### Scenario: Proof-pressure runs deep campaigns
- **WHEN** `workspace:policy-proof-pressure` runs
- **THEN** it MAY include Joern-backed, container-backed, mutation, fuzz,
  long-running, or resource-heavy property campaigns while still emitting the
  same evidence shape

### Requirement: Property evidence writes framework evidence and diagnostics
Generated property audits SHALL emit Attune Protocol Evidence that can be
stored by the private framework runtime/store and compared against generated
Protocol Obligations. Language-service and Nx diagnostics SHALL be the
agent-facing result of that comparison.

#### Scenario: Property run records evidence event
- **WHEN** a generated property case observes schema partitions, law results,
  Reactivity key movement, atom refreshes, view diffs, V8/Istanbul coverage,
  transform/filter telemetry, worker metadata, replay seeds, shrink paths, or
  counterexamples
- **THEN** the property runtime MUST be able to record that observation as a
  Schema-coded Protocol Evidence event with package id, operation id, run id,
  tier, and payload

#### Scenario: Obligations are compared to evidence
- **WHEN** a property or coverage conformance check completes
- **THEN** the Protocol Runtime MUST compare generated obligations against
  recorded evidence and expose missing law observations, missing type-guidance
  partitions, missing atom/Reactivity graph movement, weak oracles,
  high-rejection filters, dead harness paths, and counterexamples as internal
  ProtocolDelta state projected into language-service and Nx diagnostics

#### Scenario: Agent receives finding
- **WHEN** a property run finds a weak oracle, uncovered semantic transition,
  stale generated artifact, or replayable counterexample
- **THEN** the diagnostic MUST include enough package, operation, obligation,
  replay, and suggested-action metadata for an agent to inspect the source
  declaration, open replay data from local cache, run a whitelisted check, or
  apply a deterministic generator repair action

### Requirement: Runtime RPC is a backend option, not the protocol root
The generated property architecture SHALL treat runtime RPC as a backend
option, not the protocol root. Generated property harnesses MAY use
`@effect/rpc` as an invocation backend once it is compatible with the workspace
Effect version. The protocol root remains the Schema-coded descriptor,
generated obligations, Effect layers, ProtocolStore, and ProtocolDelta.

#### Scenario: Effect RPC is unavailable
- **WHEN** `@effect/rpc` is incompatible with the current Effect version
- **THEN** the generated property architecture MUST still be able to define
  descriptors, obligations, evidence schemas, replay schemas, and deltas
  without requiring runtime RPC execution

#### Scenario: Effect RPC backend is selected
- **WHEN** a package or property target uses an Effect RPC-backed harness
- **THEN** the RPC payloads, successes, typed errors, observations, replay
  values, and evidence values MUST still be derived from the package contract
  and recorded through the same protocol evidence shape as non-RPC harnesses

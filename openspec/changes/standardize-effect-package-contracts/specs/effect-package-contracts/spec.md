## ADDED Requirements

### Requirement: Active packages expose a canonical contract module
Every active package in the workspace SHALL expose a package contract module at
`src/attune.package.ts` unless the package is explicitly marked external,
historical, generated-only, or otherwise out of scope by the workspace policy.

#### Scenario: Package contract is discovered
- **WHEN** the package-contract conformance check scans an active package
- **THEN** it MUST find `src/attune.package.ts` and decode the exported package
  contract successfully

#### Scenario: Missing contract is rejected
- **WHEN** an active package does not expose `src/attune.package.ts`
- **THEN** the package-contract conformance check MUST fail with the package
  name and the missing contract path

#### Scenario: Contract uses public framework DSL
- **WHEN** a product package authors `src/attune.package.ts`
- **THEN** it SHOULD use public helpers from `@attune/framework-protocol` and
  MUST NOT import framework runtime/sqlite/language-service/Nx internals, raw
  Drizzle tables, or ProtocolStore internals

### Requirement: Package contracts are authored with Effect Schema
Package contracts SHALL use Effect Schema as the authoritative contract shape
for authoring, decoding, validation, diagnostic projection, and private
framework materialization. Plain TypeScript-only contract objects are not a
separate accepted contract model.

#### Scenario: Contract decodes through Effect Schema
- **WHEN** package-contract conformance loads `src/attune.package.ts`
- **THEN** it MUST decode the contract through the package contract Effect
  Schema before using it for graph derivation, policy checks, or evidence
  expectations

#### Scenario: Framework materialization uses contract schema
- **WHEN** the workspace materializes descriptors, DI graph facts, waiver
  state, property evidence, coverage facts, diagnostics, or local runtime/cache
  state from a package contract
- **THEN** the materialized data MUST be encoded or validated through the same
  Effect Schema-backed contract model

#### Scenario: Inferred facts remain schema-backed or recomputable
- **WHEN** type helpers infer operation ids, law descriptors, view references,
  RPC shapes, evidence types, replay types, layer requirements, or generated
  artifact inputs
- **THEN** those inferred facts MUST either be emitted into Schema-backed
  contract data or be deterministically recomputable from Schema-backed
  contract data and generated provenance

### Requirement: Package contract builders provide deep type inference
Package contracts SHALL be authored through typed helpers such as
`definePackageContract`, `definePackageViews`, `touches`, and kind-specific
operation builders. These helpers SHALL preserve literal ids and infer
operation, view, law, RPC, evidence, replay, and layer-requirement types from
the package contract.

#### Scenario: Operation schema types are inferred
- **WHEN** a package contract declares an operation with input, output, and
  typed error schemas
- **THEN** type helpers MUST be able to derive decoded input, encoded input,
  output, typed error, replay payload, counterexample, and evidence types for
  that operation id

#### Scenario: Duplicate operation id is rejected
- **WHEN** a package contract declares two public auditable operations with the
  same id
- **THEN** the typed contract helper SHOULD reject the contract at typecheck
  time with an agent-readable duplicate-operation diagnostic

#### Scenario: Invalid view reference is rejected
- **WHEN** an operation declares a Reactivity key or atom id that is not present
  in the package view registry
- **THEN** the typed contract helper SHOULD reject the operation at typecheck
  time or conformance MUST reject it before generated artifacts are trusted

#### Scenario: Kind-specific metadata is required
- **WHEN** an operation uses a kind-specific builder such as
  `resourceProviderOperation`, `projectionOperation`, `generatorOperation`,
  `policyRuleOperation`, or `joernTemplateOperation`
- **THEN** the builder MUST require the schemas and metadata needed to infer
  that kind's laws, RPC shape, evidence shape, and coverage expectations

#### Scenario: Package test-layer requirements are inferred
- **WHEN** a package contract declares operations, schemas, law extensions,
  observation hooks, and generated RPC handlers
- **THEN** type helpers SHOULD expose the package's required services so
  `PackageTestLayer` conformance can detect missing dependencies before a
  property target is considered covered

### Requirement: Package contracts expose a concrete type surface
The package-contract implementation SHALL provide generated generic types that
make the contract a compile-time API. The type surface SHALL include operation
maps, Schema decoded/encoded types, law maps, RPC specs, handler maps,
property maps, evidence envelopes, replay envelopes, counterexample envelopes,
type-guidance partitions, and layer requirement checks.

#### Scenario: Contract type summary is derivable
- **WHEN** an implementation imports a package contract type
- **THEN** it MUST be able to derive a `PackageContractTypes<Contract>`-style
  summary containing package id, operation ids, operation map, package views,
  inferred law map, generated harness group, optional RPC backend metadata,
  handler map, evidence envelope, replay envelope, counterexample envelope,
  required services, and type-guidance partitions

#### Scenario: Compile-only assertion module evaluates contract types
- **WHEN** a package contract is generated or sync-generated
- **THEN** the package SHOULD include a compile-only assertion module such as
  `src/attune.package.typecheck.ts` that forces TypeScript to evaluate
  `AssertPackageContract`, `AssertExactHandlers`,
  `AssertPropertyHarnesses`, `AssertLayerProvidesPackageServices`,
  `AssertLayerSatisfiesRequiredServices`, and
  `AssertTypeGuidanceComplete` for the package

#### Scenario: Assertion module has no runtime behavior
- **WHEN** the compile-only assertion module is emitted
- **THEN** it MUST be side-effect free and exist only to make TypeScript, Nx,
  editors, and agents surface contract failures before runtime conformance

#### Scenario: Handler map is exact
- **WHEN** generated RPC handlers or property harnesses are checked against the
  package contract
- **THEN** type helpers MUST reject missing operation ids, extra operation ids,
  payload type mismatches, success type mismatches, typed-error mismatches, and
  replay/evidence envelope mismatches where TypeScript can express them

#### Scenario: Operation kind selects metadata type
- **WHEN** an operation builder receives an operation kind
- **THEN** the type system MUST select the required metadata type for that kind
  and reject missing resource, destructive, projection, generator, policy,
  Joern, atom, event, query, command, or codec metadata before runtime
  conformance is trusted

#### Scenario: Branded diagnostic identifies repair path
- **WHEN** a type-level assertion fails
- **THEN** the failing type SHOULD include an agent-readable branded diagnostic
  naming the package, operation id when available, failing invariant, expected
  known ids or kinds, and the generated or authored source path to repair

### Requirement: Type safety owns type-expressible invariants
Package-contract invariants that TypeScript can express SHALL be enforced by
generated typed builders, branded diagnostics, inferred law types, handler map
types, Effect RPC spec types, evidence/replay types, and Effect-layer
requirement types before they are implemented as architecture-policy checks.

#### Scenario: Local contract invariant is type-expressible
- **WHEN** an invariant concerns duplicate operation ids, invalid package or
  operation kinds, invalid law ids, missing inferred laws, undeclared
  Reactivity keys or atoms, missing kind-specific metadata, handler map
  exhaustiveness, handler payload/success/error compatibility, replay payload
  shape, evidence shape, counterexample shape, or `PackageTestLayer`
  requirements
- **THEN** the typed contract helper SHOULD reject the contract at typecheck
  time with an agent-readable branded diagnostic

#### Scenario: Runtime conformance backs up type gaps
- **WHEN** a TypeScript limitation, generated-file boundary, or legacy package
  shape prevents a type-level rejection
- **THEN** contract conformance MAY report the same invariant at runtime, but
  the implementation SHOULD still prefer moving the invariant into the typed
  builder or generator when practical

#### Scenario: Boundary value crosses runtime or persistence
- **WHEN** contract, RPC, evidence, waiver, replay, corpus, or generated-ledger
  values cross runtime, worker, process, file, or review boundaries
- **THEN** those values MUST encode or decode through Effect Schema rather than
  relying only on TypeScript types

#### Scenario: Static proof is impossible
- **WHEN** an invariant depends on live provider state, destructive operation
  observation, scheduler/resource side effects, atom/Reactivity movement,
  implementation coverage, mutation survival, filesystem discovery, package
  existence, stale generated files, command-surface configuration, docs, or
  waiver expiry
- **THEN** the invariant MUST be assigned to Nx, generated sync, FastCheck,
  provider/runtime observation, or `attune-architecture` residual policy
  instead of pretending it is a type-only guarantee

### Requirement: Package contracts describe runtime boundaries
The package contract SHALL declare the package id, source root, package kind,
public entrypoints, services, operations, Effect layers, schema ownership,
operation-kind metadata, inferred law descriptors, custom law extensions,
semantic coverage expectations, Reactivity keys, base atoms, derived atoms,
package view atoms, operation-to-view graph edges, generator provenance, and
waivers.

#### Scenario: Contract contains the boundary inventory
- **WHEN** a package contract is decoded
- **THEN** the decoded value MUST expose services, operations, layers,
  Reactivity keys, atom view graph metadata, provenance, coverage expectations,
  and waivers as typed fields

#### Scenario: Boundary metadata is incomplete
- **WHEN** a package contract declares a service operation without operation
  kind, schema metadata, or coverage expectations
- **THEN** contract conformance MUST report the incomplete operation path

### Requirement: Operation metadata covers public auditable boundaries
Package contracts SHALL inventory public auditable operations rather than every
private helper or local implementation function. Public auditable operations
include exported service operations, generator entrypoints, resource/provider
actions, policy rules, codecs, projections, atom-family boundaries,
query/command boundaries, and other exported package behavior that crosses a
package boundary or mutates/observes meaningful package state.

#### Scenario: Public boundary is declared
- **WHEN** a package exports a service operation, generator entrypoint,
  provider action, policy rule, projection, codec, atom-family boundary, query,
  or command as package behavior
- **THEN** the package contract MUST declare the operation with schema,
  operation-kind, law, and coverage metadata unless a waiver explains why it is
  unauditable

#### Scenario: Private helper stays implementation detail
- **WHEN** a local helper, fixture utility, implementation-only class, or
  package-private pure function is reachable only through public auditable
  operations
- **THEN** package-contract conformance MUST NOT require a separate operation
  entry for that helper

#### Scenario: Implementation path is still covered indirectly
- **WHEN** a generated property harness exercises a public auditable operation
  that calls private helpers
- **THEN** property and V8/Istanbul evidence MAY report helper coverage or dead
  paths without requiring helper-level contract metadata

### Requirement: Package layers are canonical exports
The package contract module SHALL export `PackageContractSchema`,
`PackageContract`, `PackageLayer`, and `PackageTestLayer` for the package
boundary. `PackageLayer` SHALL expose package-owned services with external
requirements still visible to Effect DI. `PackageTestLayer` SHALL provide a
deterministic fully satisfied audit boundary. Leaf packages MAY additionally
export `PackageRuntimeLayer`.

#### Scenario: Deterministic test layer exists
- **WHEN** generated property audits load a package contract
- **THEN** they MUST be able to construct `PackageTestLayer` without relying on
  live network, filesystem, host secrets, or undeclared environment reads

#### Scenario: Production layer is discoverable
- **WHEN** architecture graph derivation loads a package contract
- **THEN** it MUST be able to identify package-owned service composition and
  external requirements from `PackageLayer`

#### Scenario: Runtime layer does not hide graph facts
- **WHEN** a leaf package exports `PackageRuntimeLayer`
- **THEN** graph derivation MUST still use `PackageLayer` and the package
  contract to derive package-owned services and external requirements

#### Scenario: Pure package uses minimal layer
- **WHEN** a package owns only schemas, policy data, generator templates,
  fixtures, or pure transformation boundaries and does not own runtime services
- **THEN** the contract MAY expose `PackageLayer = Layer.empty` or another
  generated no-op layer while still declaring public auditable operations,
  schemas, provenance, package views when meaningful, and property evidence
  expectations

### Requirement: New services use canonical Effect.Service shape
New service scaffolds SHALL use the canonical `Effect.Service` class shape with
stable service id, `accessors: true`, generated operation metadata, and contract
registration.

#### Scenario: Generator creates canonical service
- **WHEN** an agent creates a service with `@attune/nx:effect-service`
- **THEN** the generated service MUST use the canonical `Effect.Service` shape
  and register the service with the package contract

#### Scenario: Hand-authored noncanonical service is detected
- **WHEN** a new service boundary is added without the canonical
  `Effect.Service` shape and without a waiver
- **THEN** service conformance MUST fail and name the service file

### Requirement: Lower-level Effect DI requires explicit waiver
Package contracts SHALL allow lower-level `Context.Tag` and custom `Layer`
service boundaries only when an explicit waiver records the category, owner,
reason, validation still required, and expiration or review target.

#### Scenario: Waived Context.Tag boundary is accepted
- **WHEN** a package uses `Context.Tag` for a third-party shim, scoped resource,
  temporary migration adapter, generated service family, Effect typing
  limitation, cyclic dependency migration, or legacy compatibility boundary
- **THEN** contract conformance MUST accept the service only if the waiver is
  present and complete

#### Scenario: Unwaived Context.Tag boundary is rejected
- **WHEN** a package uses `Context.Tag` for a service boundary without a waiver
- **THEN** contract conformance MUST fail with the service id and waiver
  category guidance

### Requirement: Operations expose schema and law metadata
Each public auditable operation in a package contract SHALL declare input
schema, output schema, typed error schema when applicable, operation kind,
inferred law descriptors or an explicit unauditable waiver, optional custom law
extensions, and semantic coverage expectations.

#### Scenario: Operation can be audited from metadata
- **WHEN** the automatic property evidence runner loads an operation contract
- **THEN** it MUST derive a FastCheck arbitrary from the input schema and know
  which laws and labels apply to the operation

#### Scenario: Missing schema blocks audit promotion
- **WHEN** an operation lacks input or output schema metadata
- **THEN** the package contract MUST mark the operation as unauditable with a
  waiver, or conformance MUST fail

### Requirement: Operation laws are inferred and type-constrained
Package contracts SHALL infer default law sets from operation kind, operation
schemas, Schema annotations, declared views, resource observation metadata,
destructive proof metadata, projection metadata, generator metadata, policy
metadata, and Joern/template metadata. Explicit custom laws SHALL be typed
extensions, not unconstrained package-local strings.

#### Scenario: Base laws are inferred
- **WHEN** an operation uses `inferLaws()` or omits an explicit base-law list
- **THEN** the contract helper MUST infer schema validation laws and the
  applicable determinism/idempotence, side-effect boundary, and view-movement
  laws from the operation metadata

#### Scenario: Resource laws are inferred
- **WHEN** an operation is built with `resourceProviderOperation` and declares
  observation metadata
- **THEN** the contract helper MUST infer observed-state idempotence and
  no-repeat destructive action laws

#### Scenario: Destructive laws require proof metadata
- **WHEN** an operation claims destructive approval behavior
- **THEN** the operation MUST declare current proof and approval schemas, or the
  typed contract helper SHOULD reject the law and conformance MUST fail

#### Scenario: View laws are inferred from touched views
- **WHEN** an operation declares touched Reactivity keys or atoms through the
  package view builder
- **THEN** the contract helper MUST infer the corresponding view movement and
  atom/Reactivity coverage expectations

#### Scenario: Invalid law is rejected
- **WHEN** an explicit law id is not valid for the operation kind or required
  metadata is absent
- **THEN** the typed contract helper SHOULD reject the operation at typecheck
  time with an agent-readable invalid-law diagnostic, and runtime conformance
  MUST reject it if typechecking did not

#### Scenario: Schema annotations contribute fuzz metadata
- **WHEN** operation schemas include annotations for partitions, examples,
  redaction, semantic equality, shrinking hints, or coverage labels
- **THEN** law inference and generated property evidence MUST be able to consume
  those annotations without a parallel hand-maintained fuzz metadata catalog

### Requirement: Package contracts drive generated Schema-coded harnesses
Package contracts SHALL contain enough Schema-backed operation metadata to
generate internal Schema-coded package harnesses for property and fuzz
execution. Runtime `@effect/rpc` MAY be used as a generated backend when
compatible with the workspace Effect version, but the root invariant is the
Schema-coded protocol descriptor, public package boundary, `PackageTestLayer`,
and protocol evidence shape. Generated harnesses are internal audit protocols,
not stable product APIs.

#### Scenario: Operation harness can be generated
- **WHEN** a package contract declares a public auditable operation with input,
  output, and typed error schemas
- **THEN** the generator MUST be able to produce an operation-specific harness
  whose payload, success, and error shapes are derived from those schemas

#### Scenario: Control operations can be generated
- **WHEN** a package opts into generated property or fuzz evidence
- **THEN** the generator MUST be able to produce Schema-backed control operations for
  reset, snapshot, observe, flush-evidence, replay-counterexample,
  get-coverage, and get-atom-graph behavior supported by the package harness

#### Scenario: Harness handler uses package test layer
- **WHEN** a generated harness handler is executed for a property or fuzz run
- **THEN** the handler MUST be provided by `PackageTestLayer` and call only the
  public service accessor, generator, provider, policy, projection, query, or
  command boundary declared in the package contract

#### Scenario: Direct private import is rejected
- **WHEN** a generated property or fuzz harness imports a private package
  implementation function instead of calling through the generated package
  harness or declared public package boundary
- **THEN** conformance MUST fail with the operation id and offending import

### Requirement: Operation kinds use the canonical Attune taxonomy
Every auditable operation SHALL be classified with one of the canonical Attune
operation kinds: `codec`, `query`, `command`, `projection`, `event-facade`,
`atom-family`, `resource-provider`, `generator`, `policy-rule`, or
`joern-template`.

#### Scenario: Custom operation kind is rejected
- **WHEN** a package contract declares an auditable operation with an operation
  kind outside the canonical taxonomy
- **THEN** contract conformance MUST fail and list the supported operation
  kinds

#### Scenario: Custom package behavior uses law extension
- **WHEN** a package needs package-specific semantics beyond the canonical
  operation kind
- **THEN** it MUST declare a custom law extension or coverage expectation while
  retaining the canonical operation kind

### Requirement: Hidden configuration dependencies are declared
Package contracts SHALL declare configuration dependencies through Effect
services, Effect Config-backed layers, or explicit waivers; direct hidden reads
from process environment or host state are not valid package boundary behavior.

#### Scenario: Strict audit sees no hidden environment read
- **WHEN** the generated property audit constructs `PackageTestLayer`
- **THEN** the package MUST run without direct undeclared reads from
  `process.env`, host secrets, or ambient local configuration

#### Scenario: Hidden environment read is reported
- **WHEN** a service operation reads undeclared environment state during strict
  conformance
- **THEN** the conformance report MUST identify the package operation and the
  missing configuration boundary

### Requirement: Every active package migrates to the contract shape
The workspace SHALL track every active package until it either conforms to the
canonical package contract shape or carries a documented temporary waiver.

#### Scenario: Workspace migration inventory is complete
- **WHEN** the workspace package-contract check runs
- **THEN** it MUST report the contract status for `attune-nx`,
  `attune-architecture`, `effect-oxlint-policy`, `attuned-discovery`,
  `cocoindex-effect`, `joern-effect`, `joern-effect-properties`,
  `attune-foldkit`, `attune-pi-agent`, `platform-alchemy-k8s`, and
  `home-deployment`, with `attune-architecture-lint` treated only as the
  current pre-rename package identity during migration

#### Scenario: Architecture package uses final identity
- **WHEN** final package contracts, generated ledgers, docs, binaries, Nx
  targets, or package ids refer to the architecture policy package
- **THEN** they MUST use `attune-architecture`; `attune-architecture-lint` MAY
  appear only in migration inventory or compatibility notes that explicitly
  identify it as the current pre-rename package identity

#### Scenario: Policy ratchet is enabled
- **WHEN** all active packages have contracts and minimal generated property
  harnesses
- **THEN** the workspace policy gate MUST be able to require package-contract
  conformance without diagnostics-only exceptions or checked-in protocol report
  artifacts

### Requirement: Completed migration leaves no dangling migration material
Active packages SHALL NOT retain migration-only aliases, duplicate public
command surfaces, hand-maintained BOM truth, checked-in protocol reports, stale
generated files, expired waivers, or temporary adapter layers after the
workspace ratchets this change from diagnostics-only to required.

#### Scenario: Migration alias remains after ratchet
- **WHEN** package-contract conformance runs after the workspace migration is
  marked complete
- **THEN** any migration-only alias, compatibility export, diagnostics-only
  exception, or checked-in protocol report MUST be absent, duplicate script
  targets MUST be absent, and no final-ratchet waiver path exists for migration
  scaffolding

#### Scenario: Manual derived ledger source remains
- **WHEN** a package keeps manually authored BOM, generator-shape, coverage, or
  waiver summary fields that duplicate contract-derived facts
- **THEN** conformance MUST fail and name the framework diagnostic, source
  declaration, local cache, or sync target that should own the fact

#### Scenario: Shell command target remains
- **WHEN** a migrated package still exposes package-local scripts,
  codex package-manager wrappers, arbitrary `nx:run-commands` shell strings, or
  direct toolchain commands as project workflow API
- **THEN** conformance MUST fail and require a typed Nx executor, inferred
  contract-derived target, and no final-ratchet waiver is allowed for this
  command surface

#### Scenario: Long-lived command waiver is rejected
- **WHEN** a package contract records a long-lived waiver for package-local
  scripts, codex package-manager wrappers, arbitrary `nx:run-commands`, or
  direct toolchain commands as public workflow API after final ratchet
- **THEN** package-contract conformance MUST fail because command surfaces have
  no final-ratchet waiver path

#### Scenario: Temporary waiver expires
- **WHEN** a waiver created for the migration reaches its expiration or review
  target
- **THEN** package-contract conformance MUST fail until the waiver is removed or
  the underlying package shape is migrated, unless the waiver is reclassified as
  a genuine non-migration architecture exception with an owner and review date

### Requirement: Waivers have local source and diagnostic projections
Waivers SHALL be authored in `src/attune.package.ts` as package contract data,
and the workspace SHALL project waiver status through language-service
diagnostics, Nx output, or optional ephemeral debug/CI output. Checked-in
waiver summary reports SHALL NOT be the source of truth.

#### Scenario: Waiver diagnostic is generated
- **WHEN** package-contract sync or framework diagnostics run
- **THEN** they MUST be able to summarize local package contract waivers through
  diagnostics or Nx output

#### Scenario: Checked-in waiver summary is rejected
- **WHEN** a checked-in waiver summary report duplicates package contract waiver
  facts as semantic workflow truth
- **THEN** policy MUST fail and direct the author to local package waivers,
  diagnostics, Nx output, or optional ephemeral debug/CI output

### Requirement: Package contracts materialize private framework descriptors
Package contracts SHALL be treated as authored Attune Protocol declarations
using the public framework DSL. The private framework runtime owns descriptor
materialization, obligations, evidence, deltas, diagnostics, and generated
source freshness for that boundary.

#### Scenario: Contract emits protocol descriptor
- **WHEN** package-contract sync loads `src/attune.package.ts`
- **THEN** it MUST be able to derive a deterministic Attune Protocol Descriptor
  containing package id, package kind, services, operations, schemas, laws,
  views, layers, generated artifacts, waivers, and evidence expectations

#### Scenario: Contract drives protocol obligations
- **WHEN** a contract declares operations, laws, views, layers, generated
  artifacts, or waivers
- **THEN** the protocol runtime MUST be able to derive obligations for handler
  maps, property harnesses, type-guidance partitions, law observations,
  atom/Reactivity graph movement, layer requirements, generated artifact
  freshness, stale-output constraints, and evidence expectations

#### Scenario: Descriptor crosses process or agent boundary
- **WHEN** package contract data is consumed by SQLite rows, Nx graph metadata,
  language-service diagnostics, Nx output, testing/evidence producers, or
  optional future adapters
- **THEN** it MUST cross that boundary as an Effect Schema-encoded Attune
  Protocol Descriptor or Schema-coded projection, not as ad hoc JSON

#### Scenario: Contract remains source while reports are ephemeral
- **WHEN** Source BOM, generator-shape, waiver summary, evidence summary, or
  architecture summary files mention package contract facts during migration
- **THEN** they MUST be treated as legacy scaffolding, temporary compatibility
  views, or ephemeral debug/CI output rather than final checked-in semantic
  source truth

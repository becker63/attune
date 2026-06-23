## ADDED Requirements

### Requirement: Attune framework lives under root framework folder
The Attune framework SHALL live under a root `framework/` directory outside
`packages/`. `framework/` defines the programming model; `packages/` consume
the programming model.

#### Scenario: Framework root is planned
- **WHEN** implementation agents create the protocol framework projects
- **THEN** they MUST use a root layout equivalent to:

```txt
framework/
  protocol/
    src/
      builders/
      descriptors/
      obligations/
      evidence/
      diagnostics/
      index.ts
    test/
    project.json
    package.json

  runtime/
    src/
      ProtocolRuntime.ts
      ProtocolQuery.ts
      ProtocolDiagnostics.ts
      ProtocolProjection.ts
      index.ts
    test/
    project.json
    package.json

  sqlite/
    src/
      schema.ts
      migrations/
      ProtocolStore.ts
      ProtocolStoreLive.ts
      ProtocolStoreTest.ts
      index.ts
    test/
    project.json
    package.json

  language-service/
    src/
      plugin.ts
      diagnostics.ts
      quick-info.ts
      code-actions.ts
      code-lenses.ts
      index.ts
    test/
    project.json
    package.json

  nx/
    src/
      generators/
      executors/
      graph/
      index.ts
    test/
    project.json
    package.json

  testing/
    src/
      operation-registry.ts
      evidence-producer.ts
      fastcheck.ts
      atom-graph-observer.ts
      index.ts
    test/
    project.json
    package.json
```

#### Scenario: Framework projects join workspace tooling
- **WHEN** workspace configuration is updated for the framework
- **THEN** `pnpm-workspace.yaml` and Nx project discovery MAY include
  `framework/*`, but product packages MUST remain under `packages/`

#### Scenario: Framework package names are assigned
- **WHEN** framework packages are named
- **THEN** names SHOULD follow `@attune/framework-protocol`,
  `@attune/framework-runtime`, `@attune/framework-sqlite`,
  `@attune/framework-language-service`, `@attune/framework-nx`, and
  `@attune/framework-testing`, or close variants that preserve the same
  boundaries

### Requirement: Attune Protocol is authored through the framework DSL
Product packages SHALL expose Attune Protocol boundaries through
`src/attune.package.ts` using the public framework DSL. Package authors SHALL
not author raw descriptor JSON, raw runtime rows, or checked-in protocol report
files as the normal workflow.

#### Scenario: Package imports public DSL
- **WHEN** a product package authors a protocol declaration
- **THEN** it SHOULD import public helpers from `@attune/framework-protocol`,
  such as:

```ts
import {
  atomFamily,
  command,
  defineAttunePackage,
  eventFacade,
  generator,
  inferLaws,
  policyRule,
  projection,
  query,
  resourceProvider,
  views,
} from "@attune/framework-protocol"
```

#### Scenario: Descriptor is derived from source declaration
- **WHEN** framework materialization runs
- **THEN** it MUST derive deterministic Effect Schema descriptor values from
  the source protocol declaration rather than requiring package authors to edit
  descriptor artifacts directly

### Requirement: Protocol runtime internals are hidden
The framework SHALL hide Protocol Runtime internals behind public DSL helpers,
language-service diagnostics, and Nx checks/actions.

#### Scenario: Product package imports framework internals
- **WHEN** a product package under `packages/*` imports
  `@attune/framework-sqlite`, `@attune/framework-runtime/internal`,
  `@attune/framework-nx/internal`, `@attune/framework-language-service`, raw
  Drizzle tables, or ProtocolStore internals
- **THEN** import-boundary conformance MUST fail and point the author to the
  public DSL, generated local artifacts, or `@attune/framework-testing` for
  evidence tests

#### Scenario: Allowed framework imports
- **WHEN** framework internals depend on each other
- **THEN** these dependency directions MUST be allowed:

```txt
framework/language-service -> framework/runtime query/diagnostic services
framework/nx -> framework/protocol + framework/runtime
framework/runtime -> framework/protocol + framework/sqlite
framework/testing -> framework/protocol + framework/runtime test APIs
framework/sqlite -> framework/protocol schema values
```

#### Scenario: Drizzle is exposed
- **WHEN** any package or framework public API exposes a Drizzle table/client as
  a normal product-package API
- **THEN** conformance MUST fail because Drizzle belongs behind
  `framework/sqlite` Effect services

### Requirement: Protocol runtime owns private local materialized state
The framework runtime SHALL own local protocol state through Effect services and
a SQLite-backed private cache. The store is the local compiler/runtime database
for architecture obligations and evidence, not the production product database
and not a product package API.

#### Scenario: Runtime materializes descriptor
- **WHEN** Nx materializes a package protocol descriptor
- **THEN** the private Protocol Runtime MUST store the descriptor receipt,
  descriptor hash, source path, derived obligations, and generated artifact
  expectations through Effect services

#### Scenario: Runtime computes diagnostic source state
- **WHEN** obligations, generated artifact records, evidence, waivers, or
  descriptor hashes change
- **THEN** the private Protocol Runtime MUST compute internal ProtocolDelta
  facts that can be projected into framework diagnostics and Nx output

#### Scenario: Runtime cache path is selected
- **WHEN** the local protocol store is initialized
- **THEN** it SHOULD use gitignored cache locations such as
  `.attune/cache/protocol.sqlite`, `.attune/cache/protocol/*`, or `.nx/cache/*`

### Requirement: SQLite is private projection state
The framework SHALL treat SQLite as a private ProtocolStore adapter for
materialized protocol state, not as authored package truth.

#### Scenario: Nx repair materializes protocol state
- **WHEN** an Nx repair target derives descriptors, obligations, generated
  artifact records, evidence expectations, or diagnostics
- **THEN** the runtime MAY persist those projections in SQLite
- **AND** product packages MUST NOT import SQLite, Drizzle, or raw
  ProtocolStore internals

#### Scenario: Language service queries protocol state
- **WHEN** the language service needs diagnostics, quick info, code actions,
  code lenses, package summaries, obligation explanations, or repair plans
- **THEN** it SHOULD query protocol projection services backed by ProtocolStore
- **AND** it SHOULD NOT require giant package declarations to carry all derived
  state

### Requirement: SQLite is the first backend
The Protocol Store SHALL use SQLite locally for deterministic, cheap,
inspectable materialization of descriptors, obligations, generated artifact
state, evidence, deltas, and repair plans. The service API SHALL allow a later
PostgreSQL implementation, but SQLite is the first backend.

#### Scenario: Local store initializes
- **WHEN** the protocol store target initializes local state
- **THEN** it MUST create or migrate the SQLite store deterministically and
  report store health through framework diagnostics or Nx output

#### Scenario: PostgreSQL remains service-compatible
- **WHEN** a later implementation adds a PostgreSQL-backed store
- **THEN** it MUST satisfy the same `ProtocolStore`, `ProtocolQuery`,
  `ProtocolProjection`, and `ProtocolDiagnostics` service APIs rather than
  changing package authoring semantics

### Requirement: Protocol rows are Schema-coded
Protocol rows and payloads SHALL encode or decode through Effect Schema when
they cross runtime, file, process, language-service, Nx, or testing boundaries.

#### Scenario: Protocol value crosses a boundary
- **WHEN** protocol descriptors, obligations, evidence events, deltas,
  generated artifact records, waivers, repair actions, diagnostic payloads,
  tool inputs/outputs, replay metadata, or ephemeral debug payloads cross a
  boundary
- **THEN** the value MUST be encoded or decoded through Effect Schema

#### Scenario: Invalid stored payload is rejected
- **WHEN** ProtocolQuery reads a stored JSON payload that does not decode
  through the expected Schema
- **THEN** the query MUST return a typed protocol store/query error projected as
  a framework diagnostic or Nx check failure

### Requirement: Protocol services expose private store and diagnostic APIs
The framework SHALL expose high-level Effect service APIs for writes, queries,
diagnostics, explanations, and repair plans. Product packages SHALL depend on
the public DSL and test helpers rather than these internals.

#### Scenario: Store API is available internally
- **WHEN** framework runtime code records protocol materialization or evidence
- **THEN** it SHOULD use a service API shaped like:

```ts
interface ProtocolStoreApi {
  putDescriptor(descriptor): Effect<ProtocolDescriptorReceipt, ProtocolStoreError>
  putObligations(batch): Effect<void, ProtocolStoreError>
  recordGeneratedArtifact(record): Effect<void, ProtocolStoreError>
  recordEvidence(event): Effect<void, ProtocolStoreError>
  computeDelta(input): Effect<ProtocolDelta, ProtocolStoreError>
  listDeltas(input): Effect<readonly ProtocolDelta[], ProtocolStoreError>
}
```

#### Scenario: Diagnostic query API is available to framework views
- **WHEN** a language-service or Nx view needs package protocol status
- **THEN** it SHOULD use a service API shaped like:

```ts
interface ProtocolQueryApi {
  getPackageSummary(packageId): Effect<PackageProtocolSummary, ProtocolQueryError>
  getDelta(packageId): Effect<ProtocolDelta, ProtocolQueryError>
  getDiagnosticsForFile(path): Effect<readonly ProtocolDiagnostic[], ProtocolQueryError>
  explainObligation(id): Effect<ObligationExplanation, ProtocolQueryError>
  getRepairPlan(deltaId): Effect<RepairPlan, ProtocolQueryError>
}
```

### Requirement: Protocol identifiers are mostly deduced from typed source declarations
The framework SHALL prefer typed source declarations, symbols, object
references, and static DSL extraction over manually threaded string references
for local authoring. Stable string IDs SHALL remain serialized protocol
identities for cache, replay, diagnostics, external boundaries, and generated
artifacts.

#### Scenario: Operation ID is derived
- **WHEN** an operation is declared as an exported symbol or property inside
  the framework DSL
- **THEN** the framework MAY derive the operation ID from the symbol/property
  name
- **AND** it MUST allow an explicit stable ID override when
  history/cache/replay identity must survive source renames

#### Scenario: String reference is serialized identity
- **WHEN** a protocol descriptor, evidence event, replay seed, diagnostic, or
  generated artifact crosses a runtime/file/worker/cache boundary
- **THEN** stable string IDs MUST be present as serialized identity
- **BUT** package authors SHOULD NOT manually thread those IDs through local
  declarations when symbol references are available

#### Scenario: Source symbol maps to serialized ID
- **WHEN** a source declaration defines an operation, atom, Reactivity key,
  service, law, waiver target, or generated artifact owner
- **THEN** materialization MUST preserve the source symbol, source range, and
  stable serialized ID needed for diagnostics and repair actions

#### Scenario: Obligation ID is derived
- **WHEN** the framework derives obligations from operation kind, schemas, laws,
  view graph, generated artifact expectations, waivers, and package metadata
- **THEN** obligation IDs MUST be derived from the materialized descriptor and
  source declaration identity rather than hand-authored as local
  cross-reference strings

### Requirement: Static declarations define protocol intent
The framework SHALL derive protocol descriptors from static framework
declarations rather than arbitrary implementation scanning.

#### Scenario: DSL declaration is analyzed
- **WHEN** a package declares `reactivityKey`, `baseAtom`, `derivedAtom`,
  `packageViewAtom`, `projection`, `command`, `query`, `resourceProvider`,
  `generator`, `policyRule`, or related framework DSL values
- **THEN** the materializer MAY use TypeScript compiler or language-service APIs
  to resolve symbols, imports, source ranges, and type information

#### Scenario: Implementation scan is not source of truth
- **WHEN** arbitrary implementation code appears to call an atom, emit a key,
  read an env var, spawn a process, or perform a provider action
- **THEN** the framework MAY report validation findings or suggestions
- **BUT** it MUST NOT silently infer primary semantic intent from that
  implementation scan without a source declaration or explicit generated
  contract metadata

### Requirement: Language service is the primary rich framework view
The TypeScript language service SHALL be the primary rich view over Protocol
Runtime state. It SHALL surface file-positioned diagnostics, quick info, code
actions, and code lenses by reading `ProtocolDiagnostics` or `ProtocolQuery`
projections.

#### Scenario: Diagnostic is projected from runtime state
- **WHEN** internal ProtocolDelta state indicates a missing obligation, stale
  generated source, invalid law, missing atom graph edge, weak oracle,
  high-rejection filter, or incomplete type guidance
- **THEN** the language service MUST project a framework diagnostic at the
  authored source boundary without exposing raw SQLite rows or descriptor
  tables

#### Scenario: Code action repairs framework shape
- **WHEN** a language-service code action offers to repair a stale generated
  source file, missing operation registry, missing property evidence scaffold,
  missing atom view edge, type-guidance partition, waiver skeleton, or
  materialization state
- **THEN** it MUST invoke a deterministic Nx generator/check action and MUST
  NOT mutate generated artifacts by hand

#### Scenario: Code lens summarizes status
- **WHEN** an authored protocol declaration has missing obligations, evidence
  gaps, stale generated source, or generated registry ownership
- **THEN** the language service SHOULD expose code lenses such as
  `3 missing obligations`, `evidence: 4/7 obligations observed`,
  `stale generated source`, or `open generated operation registry`

### Requirement: Protocol diagnostics are framework errors
Protocol diagnostics SHALL be framework-facing errors, warnings, and info
messages, not raw runtime rows.

#### Scenario: Missing property evidence is diagnosed
- **WHEN** a projection operation lacks deterministic replay evidence and atom
  graph movement
- **THEN** the language-service or Nx diagnostic SHOULD be able to report:

```txt
attune/protocol/missing-property-evidence

Operation "event-replay-projection" declares projection semantics, but no
evidence producer observes deterministic replay or workbenchSnapshot movement.

Why:
  operation kind = projection
  inferred law = projection.deterministic-replay
  touched view = workbenchSnapshotAtom

Suggested action:
  Generate protocol property evidence scaffold

Validation:
  nx run attuned-discovery:check
```

#### Scenario: Diagnostic schema is emitted internally
- **WHEN** a framework diagnostic is generated from protocol state
- **THEN** it SHOULD be shaped like:

```ts
type AttuneProtocolDiagnostic = {
  code: string
  severity: "error" | "warning" | "info"
  packageId: string
  protocolId?: string
  operationId?: string
  obligationId?: string
  sourcePath: string
  range?: SourceRange
  explanation: string
  suggestedActions: AgentAction[]
  relatedEvidence: EvidenceRef[]
}
```

### Requirement: Nx is the deterministic action layer
Nx SHALL own deterministic framework actions used by language-service code
actions, checks, materialization, and generated source freshness. The language
service SHALL call Nx generators/checks rather than directly writing generated
artifacts.

#### Scenario: Code action invokes Nx
- **WHEN** a code action refreshes protocol materialization, generates an
  operation registry, adds an atom view edge, generates an evidence scaffold, or
  refreshes type-guidance
- **THEN** it MUST invoke a deterministic `framework/nx` generator or check
  with typed options

#### Scenario: Nx output is a public view
- **WHEN** a user or agent runs a framework-owned Nx check
- **THEN** the check MUST print diagnostics derived from ProtocolDiagnostics and
  MUST NOT require checked-in report files

### Requirement: No checked-in protocol reports
The framework SHALL NOT require checked-in ProtocolDelta reports, obligation
reports, evidence summary reports, Markdown/JSON architecture summaries,
Linear/GitHub summaries, cloud-agent handoff report artifacts, or generated
report projections as semantic workflow artifacts.

#### Scenario: Protocol report is emitted
- **WHEN** a debug command, local check, or CI job emits a protocol report
- **THEN** the report MUST be ephemeral: printed to stdout, uploaded as a CI
  artifact, or written under a gitignored cache path

#### Scenario: Checked-in protocol report appears
- **WHEN** a committed file contains ProtocolDelta reports, obligation reports,
  evidence summaries, architecture summaries, or Markdown/JSON status reports
  that duplicate protocol runtime facts
- **THEN** policy MUST fail and direct the author to language-service
  diagnostics, Nx output, source declarations, generated source required by the
  build, or local gitignored cache

#### Scenario: Historical migration note is retained
- **WHEN** an already checked-in historical migration note under `docs/`
  includes fuzzer/run report context from before the final framework ratchet
- **THEN** policy MAY allow it only if the file is explicitly labeled as a
  historical migration note and says it is not protocol source truth or
  package-contract evidence
- **AND** new fuzzer/run reports without that marker MUST fail and move to
  language-service diagnostics, Nx output, CI artifacts, stdout, or gitignored
  cache

#### Scenario: Generated source is required by build
- **WHEN** a generated operation registry, typecheck module, property scaffold,
  or framework source file is required for build/typecheck correctness
- **THEN** that generated source MAY remain checked in if the repository chooses
  that model; this exception MUST NOT be used for report/ledger/status files
  that duplicate protocol facts

### Requirement: MCP is optional future adapter
MCP SHALL NOT be a core framework requirement, package, task, exit criterion, or
implementation-agent wave. MCP MAY later be implemented as an optional adapter
over `ProtocolDiagnostics` or `ProtocolQuery`.

#### Scenario: Core framework is implemented
- **WHEN** Phase 1A framework implementation proceeds
- **THEN** it MUST NOT require MCP tool schemas, MCP permission fixtures,
  protocol MCP packages, or MCP implementation agents

#### Scenario: Future MCP adapter is proposed
- **WHEN** a future change adds MCP integration
- **THEN** it MUST consume framework diagnostic/query services and MUST NOT
  expose raw SQLite, raw Drizzle, arbitrary shell, arbitrary filesystem writes,
  arbitrary `nx run`, package-manager commands, secret reads, provider apply,
  or checked-in report edits

### Requirement: Protocol implementation remains Effect-first
The framework SHALL be implemented through Effect services, layers, Schema,
typed platform boundaries, and Effect-aware tests. Non-Effect sidecar
architecture models SHALL NOT become the source of truth.

#### Scenario: Effect primitives are selected
- **WHEN** implementation packages build the framework runtime
- **THEN** they SHOULD use Effect.Service, Context, Layer, and R for
  implementation and requirement tracking; Effect Schema for descriptors,
  evidence, replay, diagnostics, and tool codecs; Effect Schema Arbitrary for
  property inputs; Effect Schema JSON Schema, annotations, or equivalence for
  external descriptors, docs, equality/change detection, and type-guidance;
  `@effect/platform` for typed filesystem/command/path/terminal/config
  boundaries; Drizzle plus Effect services or `@effect/sql` for the local store
  and later Postgres seam; `@effect/vitest` for layer-aware conformance tests;
  and `@effect/language-service` or TypeScript language-service integration for
  diagnostics where available

#### Scenario: Runtime RPC remains optional
- **WHEN** a generated audit harness wants RPC-like invocation
- **THEN** `@effect/rpc` MAY be used as an optional/future backend, but it MUST
  NOT be required as the root primitive while Effect 4 compatibility remains
  unresolved

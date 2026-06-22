## ADDED Requirements

### Requirement: Nx discovers Attune package contracts
The Attune Nx integration SHALL discover package contracts from active projects
and expose their package-level metadata to workspace checks, sync generators,
and inferred targets.

#### Scenario: Contract discovery creates project metadata
- **WHEN** Nx evaluates an active project that contains `src/attune.package.ts`
- **THEN** the Attune Nx integration MUST associate the decoded package contract
  metadata with that Nx project

#### Scenario: Invalid contract blocks graph derivation
- **WHEN** a package contract cannot be decoded
- **THEN** graph derivation MUST fail with the project name and contract decode
  error before inferred targets rely on stale metadata

### Requirement: Nx includes root framework projects
Nx integration SHALL include root `framework/*` projects as framework
internals/substrate while keeping `packages/*` as product, proof, platform, and
tooling consumers of the framework.

#### Scenario: Framework projects are discovered
- **WHEN** Nx evaluates the workspace after the framework lands
- **THEN** it MUST discover `framework/protocol`, `framework/runtime`,
  `framework/sqlite`, `framework/language-service`, `framework/nx`, and
  `framework/testing` or equivalent projects

#### Scenario: Product package imports framework internals
- **WHEN** a package under `packages/*` imports framework runtime/sqlite/Nx
  internals, language-service internals, raw Drizzle tables, or ProtocolStore
  internals
- **THEN** Nx or architecture policy MUST reject the import and point to the
  public framework DSL, generated local artifacts, or framework testing helpers

### Requirement: Effect DI dependencies are summarized into the Nx graph
The system SHALL derive package-level dependency summaries from package
contracts and Effect layer requirements, then lift those summaries into Nx graph
metadata or dependency edges where they affect workspace execution.

#### Scenario: DI dependency appears in graph summary
- **WHEN** a package contract declares that one package layer requires a service
  owned by another active package
- **THEN** the derived architecture graph MUST record the package-level
  dependency and make affected execution aware of it

#### Scenario: Service-level detail remains outside Nx projects
- **WHEN** a package contains multiple services
- **THEN** Nx MUST keep package-level projects while the Attune-derived DI graph
  records service-level facts in a generated summary

### Requirement: Nx owns the public command surface
Public agent and human workflows SHALL be exposed as Nx targets or Nx
generators. Package-local scripts, root or package wrapper scripts, raw
package-manager commands, raw Nix command strings, and ad hoc shell fragments
SHALL NOT remain as public or project-local architecture surfaces after the
migration ratchet is complete.

#### Scenario: Agent runs public policy target
- **WHEN** an agent wants the default fast policy gate
- **THEN** the documented command MUST name the Nx target
  `workspace:policy-fast`

#### Scenario: Agent runs heavy proof-pressure target
- **WHEN** an agent wants long-running proof, fuzz, mutation, workerized
  property, Joern, container, or coverage-search campaigns
- **THEN** the documented command MUST name the Nx target
  `workspace:policy-proof-pressure`

#### Scenario: Agent diagnoses package-contract drift
- **WHEN** an agent wants focused package-contract, law, generated provenance,
  typed-surface, or waiver diagnostics
- **THEN** the documented command MUST name the Nx target
  `workspace:package-contracts-check`

#### Scenario: Architecture umbrella target is not introduced
- **WHEN** agent-facing docs, generated command help, project targets, or
  policy reports describe the final public policy surface
- **THEN** they MUST NOT promote `workspace:policy-architecture` and MUST route
  architecture checks through `workspace:policy-fast`,
  `workspace:policy-proof-pressure`, or focused diagnostic targets such as
  `workspace:package-contracts-check`

#### Scenario: Private script bypass is rejected
- **WHEN** a repo workflow validates package contracts or property evidence
- **THEN** it MUST be reachable through an Nx target and MUST NOT require a
  private undocumented script as the primary invocation

#### Scenario: Package script surface is removed
- **WHEN** an active package has migrated to the canonical package contract
- **THEN** package-local `scripts` entries, codex package-manager wrappers, and
  documented direct `pnpm`, `corepack`, `npm`, `yarn`, `nix`, `bash`, `sh`,
  `tsx`, `tsc`, `vitest`, `stryker`, `arion`, or `alchemy` invocations MUST be
  removed

#### Scenario: Heavy target uses typed Nx executor
- **WHEN** a package needs Joern schema extraction, Nix/container fuzzing,
  Vite serving, CRD generation, Alchemy/provider execution, mutation testing,
  or another real toolchain action
- **THEN** that behavior MUST be exposed through a typed Nx executor or inferred
  target whose options declare inputs, outputs, environment/config needs,
  resource tier, worker budget, destructive/resource-provider gates when
  applicable, and replay/evidence outputs

#### Scenario: Run-commands shell remains after ratchet
- **WHEN** final-ratchet policy scans migrated packages
- **THEN** arbitrary `nx:run-commands` shell strings MUST fail and the package
  MUST use a typed Nx executor or inferred target instead

#### Scenario: Temporary command waiver exists before ratchet
- **WHEN** a package has not yet completed migration and still needs a temporary
  direct command surface
- **THEN** the package contract MAY record a temporary waiver with owner,
  reason, validation still required, and review date, but final-ratchet policy
  MUST reject the waiver before the package is considered complete

### Requirement: Agent-facing guidance is diagnostics-first
Agent-facing guidance SHALL tell agents to start from language-service
diagnostics and Nx check output, open the referenced package contract, use
deterministic Nx generators or sync generators, implement inside generated
`Effect.Service` boundaries, update Effect Schema-backed operation metadata and
law packs, run Nx-owned conformance/property/coverage targets, and report
validation results plus remaining diagnostics.

#### Scenario: AGENTS guidance names the contract workflow
- **WHEN** an agent reads `AGENTS.md`
- **THEN** it MUST describe the diagnostics-first, generator-first, and
  contract-first workflow for package changes

#### Scenario: Platform docs avoid stale workflow commands
- **WHEN** an agent reads cloud or local environment documentation
- **THEN** the documented validation path MUST name Nx-owned contract,
  conformance, property, and coverage targets rather than private ad hoc
  scripts, and MUST NOT promote `workspace:policy-architecture` as a final
  public target

### Requirement: Package contracts create inferred targets
For projects with package contracts, the Nx integration SHALL create or verify
targets for package contract sync, service conformance, property audits,
coverage conformance, and generated-output checks.

#### Scenario: Inferred targets are available
- **WHEN** Nx lists targets for a contract-bearing package
- **THEN** the package MUST expose or inherit `sync-package-contract`,
  `service-conformance`, `property`, `coverage-conformance`, and
  `check-generated` semantics

#### Scenario: Explicit target customizes heavy tier
- **WHEN** a package needs a Joern, container, hardware, or long-running property
  campaign
- **THEN** the package MAY define explicit heavy-tier targets while retaining
  the inferred cheap conformance targets

#### Scenario: Package harness targets are inferred
- **WHEN** a contract-bearing package declares public auditable operations with
  generated property or fuzz evidence
- **THEN** the package MUST expose or inherit target semantics that generate or
  verify the internal Schema-coded harness, optional RPC backend artifacts,
  handler layer, operation registry, property runner, and worker runner
  artifacts derived from the contract

### Requirement: Generic typed executors cover repeated workflow shapes
Nx-owned workflows SHALL prefer a small generic executor family over one
executor per package or one executor per external tool. The generic family
SHALL cover package checks, generated artifact sync, and typed toolchain
actions.

#### Scenario: Package check executor composes policy work
- **WHEN** an inferred or explicit target runs contract checks, service
  conformance, atom graph conformance, property evidence, coverage conformance,
  typecheck, test, or lint for a package
- **THEN** it SHOULD use the `attune:package-check` executor or an inferred
  target with equivalent typed options and evidence outputs

#### Scenario: Generated artifact executor owns sync work
- **WHEN** a target syncs package contracts, generated ledgers, Source BOM-like
  migration scaffolding, generator shape migration scaffolding, internal
  Schema-coded package harnesses, optional RPC backend artifacts, or stale
  generated source checks
- **THEN** it SHOULD use the `attune:generated` executor or an inferred target
  with equivalent provenance and stale-output evidence

#### Scenario: Toolchain executor owns heavy external tools
- **WHEN** a target invokes Nix, Joern, Arion, Alchemy, Vite, Kubernetes
  generators, mutation runners, workerized fuzz campaigns, or another external
  toolchain
- **THEN** it SHOULD use the `attune:toolchain` executor with typed options for
  inputs, outputs, config dependencies, resource tier, worker budget, timeout,
  destructive/resource-provider gates when applicable, and replay/evidence
  outputs

#### Scenario: Specialized executor is justified
- **WHEN** a package introduces a specialized executor outside the generic
  family
- **THEN** the package contract or executor schema MUST explain which typed
  options or evidence would be hidden by the generic family

### Requirement: Nx materializes framework cache and generated source
The system SHALL use Nx sync generators or Nx-owned targets to derive generated
source required by build/typecheck, local framework runtime/cache facts, and
language-service/Nx diagnostics from source contracts, generated provenance, Nx
metadata, Effect DI, Reactivity keys, and atom graphs. Checked-in report files
SHALL NOT be the workflow surface.

#### Scenario: Stale generated source fails check
- **WHEN** a package contract, Reactivity key, package atom, or generator
  provenance changes but generated source required by build/typecheck or local
  framework materialization state is stale
- **THEN** the sync check MUST fail and name the Nx target or language-service
  code action that refreshes the artifact or cache

#### Scenario: Checked-in report is rejected
- **WHEN** an agent commits ProtocolDelta reports, obligation reports, evidence
  summaries, Markdown/JSON architecture summaries, Linear/GitHub summaries, or
  cloud-agent report artifacts as protocol truth
- **THEN** policy MUST reject the report file and direct the agent to source
  declarations, generated source required by build/typecheck, language-service
  diagnostics, Nx output, or gitignored local cache

### Requirement: Nx materialization derives protocol graph from static DSL
Nx materialization SHALL derive protocol descriptors, generated artifact
ownership, source ranges, and repair actions from static framework DSL
declarations and TypeScript symbol resolution.

#### Scenario: Source declaration owns artifact
- **WHEN** a generator materializes an operation registry, typecheck module,
  evidence scaffold, type-guidance artifact, atom view edge, or descriptor
- **THEN** the generated artifact record MUST point back to the source
  declaration symbol/range and stable serialized ID

#### Scenario: Paths are derived from workspace graph
- **WHEN** Nx materializes source paths, artifact paths, generated artifact
  ownership, or repair-action targets
- **THEN** it MUST derive those paths from the Nx project graph, project source
  root, declaration location, generator options, and stable serialized ID rather
  than requiring package authors to hand-maintain path strings

#### Scenario: String-only cross-reference remains
- **WHEN** a migrated package still uses raw string references where symbol
  references are available
- **THEN** Nx or framework diagnostics SHOULD report a migration diagnostic and
  suggest converting to symbol/object references

### Requirement: Nx checks contract type-inference outputs
The Nx integration SHALL treat package-contract type inference as a checked
boundary. Generated artifacts that depend on operation ids, inferred laws,
Schema-coded harness shapes, optional Effect RPC shapes, handler maps, evidence
schemas, counterexample replay types, type-guidance partitions, view references,
and `PackageTestLayer` requirements SHALL fail when their source contract type
outputs drift.

#### Scenario: Generated type surface is stale
- **WHEN** a package contract changes an operation id, schema, law inference
  input, view reference, destructive metadata, or operation kind
- **THEN** the relevant sync or check target MUST detect stale generated
  harness, optional RPC backend, property, evidence, replay, type-guidance,
  ledger, or graph artifacts

#### Scenario: Contract typecheck has dedicated budget
- **WHEN** `workspace:policy-fast` or a package conformance target typechecks a
  heavily inferred package contract
- **THEN** Nx MAY run that typecheck as a dedicated cached target with a larger
  compile-time budget than ordinary implementation files

#### Scenario: Compile-only contract assertions are checked
- **WHEN** a package emits `src/attune.package.typecheck.ts` or an equivalent
  generated assertion module
- **THEN** Nx MUST include that module in the package contract typecheck target
  and preserve its branded diagnostics in command output

#### Scenario: Type diagnostics are surfaced to agents
- **WHEN** a typed contract helper rejects duplicate ids, invalid laws, invalid
  view references, missing kind-specific metadata, stale type guidance, handler
  map gaps, or layer requirement gaps
- **THEN** the Nx check output MUST preserve the branded diagnostic or
  conformance finding so an agent can repair the package contract

### Requirement: Nx and architecture policy check residual repo facts
Nx integration and `attune-architecture` policy SHALL prefer consuming
typecheck results, generated type outputs, Effect Schema decoders, and generated
ledgers over duplicating local package-contract invariants as bespoke scans.
They SHALL own repo-wide facts that TypeScript cannot see.

#### Scenario: Type-expressible invariant is duplicated in policy
- **WHEN** an architecture rule checks an invariant that can be expressed by
  `definePackageContract`, kind-specific builders, law inference types,
  handler map types, Effect RPC spec types, or Effect-layer requirement types
- **THEN** the implementation SHOULD move that invariant into the typed helper
  or generator and make the policy rule consume the typecheck/conformance
  result instead

#### Scenario: Repo fact cannot be typechecked locally
- **WHEN** an invariant depends on missing files, stale generated artifacts,
  changed Nx graph edges, public target names, docs, package identity,
  command-surface configuration, generated ledger drift, or waiver expiry
- **THEN** Nx or `attune-architecture` MUST check it as a repo-wide residual
  policy fact

#### Scenario: Architecture policy consumes generated evidence
- **WHEN** `attune-architecture` reports package-contract, property,
  coverage, atom graph, or generator-provenance findings
- **THEN** it SHOULD consume Schema-backed generated evidence or deterministic
  typecheck outputs rather than reparsing package internals as a separate
  source of truth

### Requirement: Custom graph metadata is exceptional and typed
Custom architecture metadata outside Effect DI and the Nx project graph SHALL be
typed, minimal, and justified by the package contract or sync generator that
owns it.

#### Scenario: Custom metadata includes ownership
- **WHEN** a package needs graph metadata that cannot be derived from Effect DI,
  Nx project configuration, or generator provenance
- **THEN** the custom metadata MUST declare the owner, reason, source path, and
  validation target

#### Scenario: Derivable metadata is not duplicated manually
- **WHEN** metadata can be derived from the package contract, Effect layer
  requirements, generator provenance, Nx project graph, Reactivity keys, or atom
  graph
- **THEN** the system MUST derive it instead of requiring a separate manual
  field

### Requirement: Affected runs include contract-derived checks
Nx affected execution SHALL include contract-derived service conformance,
property audits, and coverage conformance for changed packages and packages
whose declared DI dependencies are affected.

#### Scenario: Service schema change triggers property audit
- **WHEN** a package operation schema changes
- **THEN** Nx affected execution MUST include that package's property audit and
  coverage conformance targets

#### Scenario: Dependency package change propagates checks
- **WHEN** a package changes a service contract consumed by another package
- **THEN** affected execution MUST include the consuming package's relevant
  service conformance or property target

### Requirement: Nx orchestrates workerized property shards
Nx SHALL own the public targets that shard workerized property and fuzz
campaigns by package, operation, seed range, coverage corpus, and resource tier.

#### Scenario: Worker shard target is public
- **WHEN** an agent runs a workerized property or fuzz campaign
- **THEN** the documented command MUST be an Nx target that declares package,
  operation selection, seed range, worker count, timeout, and isolation level

#### Scenario: Shard outputs merge deterministically
- **WHEN** multiple workerized shards complete for a package
- **THEN** the Nx-owned merge target MUST produce deterministic property
  evidence and atom graph coverage summaries independent of shard completion
  order

### Requirement: Nx materializes framework runtime inputs
Nx generators and sync targets SHALL materialize protocol descriptors,
generated source, obligations, generated artifact state, and local cache inputs
from source protocols and protocol store state. Nx owns deterministic
generation and repair actions; checked-in reports are not generated workflow
outputs.

#### Scenario: Protocol sync runs
- **WHEN** `framework-sync`, `protocol-materialize`, or an equivalent sync
  target runs
- **THEN** it MUST derive Attune Protocol Descriptors from
  `src/attune.package.ts`, compute descriptor hashes, derive obligations,
  record generated artifact expectations, and refresh generated source or local
  runtime/cache state deterministically

#### Scenario: Generated artifact has stable hash
- **WHEN** Nx materializes a protocol artifact such as a descriptor, typecheck
  module, generated artifact manifest, operation registry, property scaffold,
  type-guidance artifact, or framework source file required by build/typecheck
- **THEN** the artifact MUST have deterministic content and a stable hash
  recorded in the private protocol store/cache or generated artifact manifest

#### Scenario: Stale generated source becomes diagnostic
- **WHEN** an expected generated artifact hash differs from the actual hash
- **THEN** the framework runtime MUST expose a language-service/Nx diagnostic
  that names the package, artifact, generator id, expected hash, actual hash,
  and deterministic repair action

### Requirement: Source BOM and generator-shape are migration scaffolding
The system SHALL treat Source BOM shards, root indexes, generator-shape
manifests, waiver summaries, architecture summaries, and evidence reports as
legacy migration scaffolding or temporary compatibility views. They SHALL NOT
be the final semantic workflow surface after the framework runtime, generated
source, language-service diagnostics, and Nx output are in place.

#### Scenario: Ledger projection is generated
- **WHEN** package contract or protocol descriptor state changes during the
  migration period
- **THEN** Nx sync MAY refresh Source BOM or generator-shape compatibility views
  but MUST keep the final workflow centered on source declarations, generated
  source, private local cache, language-service diagnostics, and Nx output

#### Scenario: Agent edits projection by hand
- **WHEN** an agent hand-edits a generated BOM, generator-shape, waiver,
  architecture, or evidence projection without changing source protocol inputs
- **THEN** the relevant Nx check MUST fail and direct the agent to the
  deterministic generator or sync target

### Requirement: Agent repair actions use deterministic generators
Framework diagnostics SHALL prefer deterministic repair actions that point to
Nx generators or sync targets when possible. Agents should prefer deterministic
repair actions over hand-editing repeated shapes.

#### Scenario: Delta has generator repair
- **WHEN** a framework diagnostic reports a missing descriptor, stale generated
  source, missing property harness, missing typecheck module, or missing
  generated view
- **THEN** it SHOULD include the `@attune/nx` generator or sync target, typed
  options, expected outputs, and validation target required to repair it

#### Scenario: Repair cannot be generated
- **WHEN** a framework diagnostic cannot map to a deterministic generator
- **THEN** it MUST explain the package ownership, source paths, missing
  invariant, and required validation so a source-edit tier agent can repair the
  underlying protocol source rather than editing generated views

# Phase 0 Big-Cut Boundary

Change: `promote-program-index-runtime-substrate`
Date: 2026-06-24

## Status

This handoff freezes the implementation boundary for the program-index runtime
substrate migration. The worktree was clean before implementation began:
`git status --short --branch` reported only the current branch header. The
OpenSpec change validated before this handoff was added.

## Frozen Boundary

The primary runtime model is the SQLite program index. It stores mechanical
program facts and is the target substrate for check, repair, language-service
diagnostics, artifact freshness, observations, and invalidation.

New primary names are:

- `project`
- `target`
- `source_file`
- `symbol`
- `schema_descriptor`
- `edge`
- `artifact`
- `observation`
- `diagnostic`
- `repair`
- `invalidation`

SQL views, Reactivity keys, atoms, diagnostics, and Nx repair plans should derive
from those facts. New implementation should ask which mechanical fact is
missing, stale, invalid, observed, repairable, or invalidated.

## Compatibility Inputs

The old generated and declaration surfaces are compatibility inputs only while
parity is proven. They are not source truth for new runtime design.

- `packages/*/src/attune.package.ts`: authored package declaration input that
  should project to project, source_file, symbol, schema_descriptor, edge,
  artifact, observation, diagnostic, and repair facts.
- `framework/architecture/src/generated/project-facts/*`: legacy generated
  contract data that should ingest as compatibility artifact, symbol, schema,
  edge, observation, diagnostic, and repair rows.
- `framework/architecture/src/generated/artifact-ownership/*` and
  `attune.artifact-ownership.index.json`: legacy artifact ownership data that should
  ingest as artifact/artifact ownership rows marked `source-ownership-compat`.
- Type-guidance, package property, package fuzz, and RPC compatibility outputs:
  transitional observation, edge, artifact, diagnostic, or repair rows.
- Package-local generated companions such as `src/attune.generated.ts`,
  `src/attune.contract.generated.ts`, and `src/attune.package.typecheck.ts`:
  transitional generated artifact rows only until ring parity proves deletion or
  quarantine is safe.

Program-index diagnostics and repair rows are the target runtime path.
Compatibility diagnostics may remain only as marked fallback or parity data.

## Legacy Labels

These old nouns are temporary legacy labels, not primary runtime concepts:

- project facts
- protocol
- operation
- view
- law
- obligation
- evidence
- delta
- type guidance
- artifact ownership
- generator shape
- fuzz handler
- property map
- RPC group

Retained mentions must live in legacy adapters, historical/archive context,
handoffs, future-delete plans, or explanatory source metadata. Migrated runtime
APIs, generated surfaces, active docs, diagnostics, and normal workflow should
use mechanical names.

## Vocabulary Map

| Legacy label | Mechanical replacement |
| --- | --- |
| Package contract | Nx project row plus `src/attune.package.ts` source_file and symbol facts |
| Protocol descriptor | schema_descriptor, edge, artifact, diagnostic, and repair facts |
| Operation | exported symbol plus schema_descriptor and edge facts |
| View | symbol or edge that feeds a Reactivity or atom projection |
| Law | diagnostic rule, SQL predicate, validation target, or repair precondition |
| Obligation | diagnostic row, repair row, or validation target |
| Evidence | observation row |
| Delta | diagnostic and repair rows |
| artifact ownership | artifact and artifact ownership rows |
| Generator shape | artifact provenance and repair routing rows |
| Type guidance | schema_descriptor annotation, edge fact, or observation row |
| Fuzz handler | observation, artifact, diagnostic, or repair fact |
| Property map | observation, artifact, diagnostic, or repair fact |
| RPC group | symbol, edge, artifact, diagnostic, or repair fact |

Parity is measured by answers: project, file, symbol, artifact, diagnostic code,
repairability, safety class, and validation target. The mechanical path does not
need to expose the old object shapes.

## Ownership Table

| Phase | Primary owner | Scope | Validation signal |
| --- | --- | --- | --- |
| 1. Mechanical Ontology Cut | Framework/runtime agent | Runtime names, diagnostic copy, doc/policy drift checks, export inventory | OpenSpec validation plus focused policy/runtime tests |
| 2. Program-Index Primary Diagnostics | Runtime and language-service agent | ProgramIndexProjection diagnostics, ProgramDiagnostics preference, check output source labels | `framework-runtime`, `framework-language-service`, `framework-nx`, `attune-nx`, and workspace check targets |
| 3. Program-Index Repair Routing | Nx/framework agent | repair rows, safety classes, dry-run summaries, Nx route mapping | `framework-sqlite`, `framework-runtime`, `framework-nx`, `attune-nx`, and workspace repair dry-run targets |
| 4. Compatibility Adapters | Runtime/protocol agent | Ingest legacy declaration, generated, artifact ownership, type-guidance, property, fuzz, and RPC outputs as mechanical rows | runtime, protocol, architecture, and artifact ownership checks |
| 5. Source And Generated Artifact Ownership | Architecture/policy agent | Framework-owned generated/cache lookup, package-local generated companion ratchets, artifact ownership hooks | architecture, package-check, artifact ownership, and hook syntax checks |
| 6. Project Rings | Ring migration agents | Ring A, Ring B, and Ring C check/repair validation and handoffs | Public Nx project and workspace targets only |
| 7. Old Ontology Demotion | Framework/docs/policy agent | Delete, rename, quarantine, archive, or future-block old surfaces after parity | architecture, workspace check, OpenSpec validation, and drift checks |

## Stop Conditions

Stop and hand back if an implementation would:

- Add a first-class Package, Protocol, Operation, View, Law, Obligation,
  Evidence, Delta, TypeGuidance, SourceBOM, GeneratorShape, FuzzHandler,
  PropertyMap, or RpcGroup runtime table, service, diagnostic domain, generated
  surface, or public workflow concept when mechanical rows can represent it.
- Make compatibility outputs permanent source truth.
- Delete compatibility outputs before a mechanical replacement path, parity
  result, validation gate, and rollback/fallback are documented.
- Hand-edit raw SQLite/cache rows or checked-in report ledgers as workflow
  truth.
- Bypass public Nx check/repair/typecheck/test targets with package-private
  scripts or raw generator commands as the normal workflow.
- Run live provider, Kubernetes, Alchemy, destructive, container fuzzing, or
  heavy proof-pressure actions without explicit authorization.
- Make atoms mutate SQLite, invoke Nx, call external services, or own worker
  lifecycle.

## Next Safe Agents

1. Start Phase 1 with an export and naming inventory. Classify old-noun exports
   as delete now, rename-to-mechanical, legacy-adapter-only, archive-only, or
   future-change blocker.
2. Add a policy/test fixture that rejects new old-ontology runtime objects in
   the program-index path.
3. Update program-index diagnostic copy so messages name the affected
   project/file/symbol/schema/edge/artifact/observation/diagnostic/repair fact.
4. Move to Phase 2 only after the vocabulary guard is in place, so diagnostic
   and repair work does not accidentally grow the old ontology.

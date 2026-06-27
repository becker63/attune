# TimescaleDB Migration Substrate Authority

`mega.md` remains the top-level planning authority.
`timescaledb.md` is the database-substrate authority for this pass.

## Active Tend DB direction

SQLite is historical prototype language.
The active durable event/control substrate is **TimescaleDB/Postgres**.

This is the active control-plane direction for all framework-governed internal DB domains (framework, attune, tend, canopy), with Linear as an external human projection target, replacing SQLite-first default behavior.

Tend v0 is **SQL-first** with typed SQL generation:

SQL migrations are the canonical schema truth, and the active typing/runtime path is:

- SQL migrations
- local DB migration apply
- `kanel` schema/table type generation from the migrated DB
- `Kysely` typed composable queries inside services
- `SafeQL` validation for raw SQL escape hatches
- Effect services and Effect SQL as the authoritative execution boundary for:
  - query execution
  - transactions
  - resources
  - error mapping
- Drizzle is removed from the active architecture.
- `TimescaleDB/Postgres` is the durable event/control ledger for Tend.
- Large payloads are stored as BlobRef/ObjectRef pointers, not inline DB payloads.

Projection policy additions for planning governance:

- Linear is an external human-facing projection target, not a source-of-truth DB domain.
- There is no active `linear_*` DB family.
- `artifact_*` is not an active DB domain family.
- Active families remain `framework_*`, `attune_*`, `tend_*`, and `canopy_*`.

Use this validation boundary in active Tend DB planning:

- Kanel-generated table/query types derive from migrated DB schema, not hand-authored schema declarations.
- Kysely powers base reads/writes for effects that remain query-legible.
- SafeQL is used for Timescale constructs and hand-authored SQL (for example: hypertables, continuous aggregates, retention/compression policies, outbox claims).
- Hand-authored SQL remains possible where composable query builders are weaker, but it must be validated by SafeQL and wrapped by Effect services.

Legacy database notes:

- Drizzle and Drizzle-style generation are historical only for old lanes.
- Non-durable replay memory and compatibility projections are temporary unless explicitly reapproved by future OpenSpec.

## Tend DB v0 namespaces

- `tend_core` = stable identity/current state tables
- `tend_event` = append-only hypertables
- `tend_view` = continuous aggregates/report views
- `tend_outbox` = wakeup/integration delivery queue

## Tend DB v0 table families

`tend_core`
- `tend_core.session`
- `tend_core.context_decision`
- `tend_core.rtk_action`
- `tend_core.tool_call`
- `tend_core.long_job`
- `tend_core.output_blob_ref`

`tend_event`
- `tend_event.event`
- `tend_event.token_usage`
- `tend_event.command_output_sample`
- `tend_event.long_job_observation`

`tend_view`
- `tend_view.token_usage_by_session_5m`
- `tend_view.command_output_by_class_5m`
- `tend_view.long_job_latency_5m`

`tend_outbox`
- `tend_outbox.wakeup`

## Active domain projection map

- `framework_core`
- `framework_event`
- `framework_view`
- `framework_outbox`
- `attune_core`
- `attune_event`
- `attune_view`
- `attune_outbox`
- `tend_core`
- `tend_event`
- `tend_view`
- `tend_outbox`
- `canopy_core`
- `canopy_event`
- `canopy_view`
- `canopy_outbox`

Only these DB families are active:

- framework_*
- attune_*
- tend_*
- canopy_*

External systems:

- Linear — external human projection target and work-ledger
- GitHub — PR and code-review surface
- Axiom — hot telemetry/query layer
- filesystem — local blob/object storage
- object store (future maybe)

Integration path:

```text
framework_outbox / tend_outbox / attune_outbox / canopy_outbox
  -> Linear connector/action
  -> issue/comment/status update
```

### Framework domain sketch

- `framework_core`
  - project
  - target
  - source_file
  - symbol
  - schema_descriptor
  - package_declaration
  - generated_file
  - generated_output
  - obligation
  - waiver
  - command_profile
  - tool_profile
- `framework_event`
  - program_observation
  - validation_run
  - tool_invocation
  - diagnostic_event
  - repair_event
  - fuzzer_observation
  - reactivity_invalidation
  - agent_session_observation
- `framework_view`
  - workspace_health
  - project_health
  - diagnostics_by_project
  - repairs_by_project
  - stale_generated_outputs
  - package_surface_status
  - obligation_status
  - validation_usage_by_target_1h
  - tool_polling_drag_by_session
  - proof_pressure_candidates
- `framework_outbox`
  - repair_action
  - validation_request
  - proof_pressure_request
  - linear_projection_action
  - agent_wakeup

### Global domain map

- `framework_* = package/compiler/check/repair/tool evidence substrate`
- `tend_* = agent-control/OpenCode/Codex/Magic Context/RTK/long-job ledger`
- `attune_* = product discovery/evidence/rule/review/report memory`
- `canopy_* = platform/run/worker/lease/deployment control memory`
`linear_*` is intentionally not a first-class DB domain in active mappings.

Linear is an external human projection target and work-ledger:

- It is not the runtime truth source.
- Internal DB rows may store opaque Linear references (`externalSystem`, `externalIssueKey`, `externalIssueId`) only when needed for traceability.
- It is not mirrored as a first-class TimescaleDB schema family.

Lane guidance:

- `*_core`: identity/current state, relationships, durable non-time-series truth.
- `*_event`: append-only event/trace/observation/metrics stream.
- `*_view`: materialized/reported/recomputed views, including continuous aggregates.
- `*_outbox`: integration queues and wakeup deliveries.

SQLite is compatibility/testing-only and should not be represented as the active durable source while Timescale parity exists.

## Event families (canonical)

- `opencode.session.started`
- `opencode.tool.before`
- `opencode.tool.after`
- `magic_context.selection.requested`
- `magic_context.selection.completed`
- `magic_context.compaction.completed`
- `rtk.command.rewrite.requested`
- `rtk.command.rewrite.completed`
- `rtk.output.compressed`
- `tend.policy.allowed`
- `tend.policy.warned`
- `tend.policy.blocked`
- `tend.long_job.started`
- `tend.long_job.heartbeat`
- `tend.long_job.completed`
- `tend.long_job.failed`
- `tend.agent_wakeup.scheduled`
- `tend.agent_wakeup.delivered`
- `codex.token_usage.observed`
- `linear.issue.updated`
- `validation.started`
- `validation.completed`

## Storage policy

BlobRef concept:

```ts
type BlobRef = {
  readonly id: string
  readonly uri: string
  readonly mediaType?: string
  readonly sha256?: string
  readonly sizeBytes?: number
  readonly kind:
    | "stdout"
    | "stderr"
    | "context_pack"
    | "repo_snapshot"
    | "cpg"
    | "proof_bundle"
    | "report_export"
    | "generated_fixture"
}
```

Store:
- hashes
- bounded summaries
- bounded samples
- token counts
- byte counts
- identifiers
- BlobRef / ObjectRef pointers

Do not store in TimescaleDB:
- raw full prompts
- giant stdout/stderr blobs
- raw model output
- CPG outputs
- repo snapshots
- full context packs

## Topology and sequencing

- `Nx` remains the stable command surface.
- `Nix` provides pinned toolchain/lifecycle scripts.
- `nix2container` provides reproducible local DB image scaffolding.
- `Arion` provides local service orchestration.
- `timescaledb.md` is interpreted with `mega.md` and
  `openspec/changes/consolidate-attune-program-index-megaspec/` as synchronized authority.

## Command profile

Keep hard:

- `workspace:attune-check`
- `workspace:attune-repair --dryRun`
- `workspace:policy-fast`
- `workspace:package-contracts-check`
- source-BOM-check / package-source provenance checks (scoped)
- generated output ownership checks (scoped)

Pointer examples:

- `tend_core.long_job.output_blob_ref`
- `tend_event.command_output_sample.blob_ref`
- `attune_core.proof_invocation.evidence_blob_ref`
- `attune_core.report.export_blob_ref`
- `canopy_core.checkpoint.blob_ref`
- `framework_core.generated_file.content_hash`
- language-service diagnostics (scoped)
- atom/reactivity conformance (scoped)

Keep scoped:

- `workspace:policy-proof-pressure`
- coverage-guided fuzzer sessions
- deep proof campaigns

Avoid by default:

- broad recursive scans
- mini-BOM dumping
- always-on fuzzing
- always-on generation
- manual polling loops / repeated empty stdin polling

## Scope boundaries

This is a planning pass.  
Do not implement DB code, migrations, generators, tests, typechecks, containers, Docker, or Arion in this cycle.

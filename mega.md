# Consolidate Attune Program-Index Megaspec

## Status

**Status:** human-adjudicated planning spec
**Mode:** planning and routing only
**Primary change:** `openspec/changes/consolidate-attune-program-index-megaspec/`
**Implementation:** not started
**Old specs:** preserved, classified, and demoted from active-default authority

This document is now the active top-level routing policy for Attune’s next migration.

The consolidated megaspec owns the next implementation direction. Prior OpenSpec changes remain in the repository as merge sources, future appendices, evidence-only context, or archive-ready historical compatibility material.

Merged does **not** mean deleted. Merged means authority has moved here.

---

## Why

Attune has reached a stable direction after several overlapping OpenSpec changes: the project should converge around a boring, compiler-like program-index substrate that can support diagnostics, repairs, package declarations, Linear issue planning, future Arbor/Tend/Trellis root reshaping, and Tend’s agent-token/control proof loop.

The current OpenSpec workspace has too many active changes that partially describe the same future from different phases of thinking. Some specs are still valuable. Some are obsolete. Some should become appendices. Some should become evidence inputs rather than active implementation plans.

This change creates one consolidated migration spec that a medium-capability agent can follow without needing to infer the architecture from scattered historical specs.

The goal is not implementation. The goal is to make the plan mechanically clear enough that GPT-5.3 Spark Medium, GPT-5.5, Codex, or a local agent can safely execute later in small phases.

---

## Human-Adjudicated Spec Authority Model

This section is the active routing policy for all prior OpenSpec changes.

The consolidated megaspec is now the active default planning surface.

Old OpenSpec changes are preserved for evidence, appendices, and future phases, but agents must not treat them as active instructions unless this routing table explicitly says so.

Authority order:

1. `mega.md`
2. `openspec/changes/consolidate-attune-program-index-megaspec/*`
3. Merge-source specs listed below
4. Appendix specs listed below
5. Evidence-only specs listed below
6. Historical/archive-ready specs listed below

Execution surface addendum for Arbor/Tend bootstrap:

3. `timescaledb.md`
4. `openspec/changes/foundation-reshape-and-tend-execution/*`

Completed task checkboxes in old specs are not sufficient evidence of completion. Repository facts, workspace config, OpenSpec status, and check/repair outputs are authoritative.

If a previous spec says a migration is complete but current repo facts disagree, the repo facts win.

Authority note:

- SQLite language is historical prototype language in prior docs and compatibility/test-only going forward.
- The active durable substrate is TimescaleDB/Postgres for program facts, events, diagnostics, and traces.
- See [`timescaledb.md`](timescaledb.md) for database-substrate authority details.
- `timescaledb.md` specifies that Nix owns pinned toolchains/lifecycle scripts, nix2container owns reproducible local DB image wrappers, and Arion owns local service orchestration (volumes, healthchecks, ports, dependency ordering). Nx remains the stable command surface.

---

## Spec Routing Table

### Active default

These are the only active default planning artifacts:

* `mega.md`
* `openspec/changes/consolidate-attune-program-index-megaspec/`

Agents should begin here for future work.

### Merge sources

These specs define the current migration direction and are merged into the megaspec authority model:

* `sqlite-program-index-reactive-projections`
* `promote-program-index-runtime-substrate`
* `compress-attune-package-surface`
* `standardize-nx-nix-build`
* `enforce-nix-agent-policy-gates`

Agents may read these for detail, but future instructions should be written against the consolidated megaspec.

### Archive-ready / historical compatibility source

This spec is valuable history, but it is no longer the active ontology:

* `standardize-effect-package-contracts`

It must not be used as the primary future model because it carries the older `contract`, `law`, `obligation`, `evidence`, and generated-report ontology.

Keep it until program-index parity and compatibility-adapter deletion evidence exist.

Do not delete it now.

### Future appendices

These remain valid future work lanes but are not part of the immediate program-index migration:

* `add-attune-pi-agent`
* `add-attuned-semantic-workbench`
* `add-codex-autonomous-workstation`
* `add-dispatch-foldkit-frontend`
* `add-effect-corpus-fuzzer`
* `add-foldkit-fixture-closed-loop`
* `add-joern-proof-router-dsl`
* `add-semantic-ts-morph-fuzzer`
* `bootstrap-home-compute-cluster`
* `bootstrap-thinkcentre-network`
* `effect-alchemy-platform-lifecycle`
* `harden-day0-provider-idempotence`
* `reshape-arbor-monorepo-and-tend-opencode-runtime`
* `wire-dispatch-foldkit-fixtured-site`

These specs should be preserved and referenced later from Linear or future OpenSpec changes. They must not block the immediate compiler-substrate migration.

Important correction: `add-joern-proof-router-dsl` is a future appendix, not evidence-only. It is likely to become a future proof-runtime design lane after the program-index substrate is stable.

### Evidence-only context

These specs preserve product, platform, and long-term governance rationale but are not executable requirements for the immediate migration:

* `define-post-infra-product-story`
* `document-local-compute-control-plane`

Agents may use them as rationale, not as current implementation instructions.

---

## What “Merged” Means

Merged does not mean files are deleted.

Merged means:

* The consolidated megaspec owns the next active plan.
* Old specs remain readable.
* Old specs are no longer default execution instructions.
* Any future agent must route through the consolidated megaspec before consulting old specs.
* Contradictions are resolved in favor of the program-index substrate, check/repair surface, one-file package declarations, and delayed Arbor/Tend/Trellis reshape.
* Previous specs are allowed as detail sources only when the consolidated megaspec points to them.

---

## Explicit Non-Actions

Do not delete old OpenSpec folders.

Do not archive old specs until a later human-approved archive pass.

Do not execute root/package moves inside this consolidated pass; execution is handled by dedicated phase lanes.

Do not implement Tend behavior in this consolidated pass.

Do not implement Rego, Kubernetes, provider behavior, Timescale migrations, or OpenCode hooks.

Do not mutate Linear in this consolidated pass.

Do not run long fuzzer campaigns.

Do not edit package implementation code.

Do not treat task checkboxes as proof that runtime behavior exists.

Do not treat Linear as durable source of truth.

---

## What Changes

* Create one consolidated OpenSpec change that becomes the primary planning surface for Attune’s next migration.
* Inventory all active OpenSpec changes and classify them as:

  * merged into the megaspec authority model
  * superseded/archive-ready
  * retained as future appendix
  * retained as evidence-only context
* Collapse overlapping migration language into one implementation story:

  * TimescaleDB/Postgres program-event substrate as the primary local compiler database
  * Nx graph and source facts as first-class inputs
  * one authored `src/attune.package.ts` surface per package
  * language-service diagnostics and repair plans as the public operating surface
  * compatibility adapters only where needed for transitional parity
  * Linear issue projection as the human work ledger
  * Arbor root reshape as a later mechanically validated phase
  * Tend as the token/control proof runtime after the Attune substrate is stable
  * Trellis as portable skills/templates, not a runtime framework
* Supersede irrelevant active instructions that no longer match the firm direction.
* Produce one Linear issue map from the consolidated plan.
* Produce agent-safe phase handoffs where every phase has:

  * intent
  * allowed files
  * forbidden files
  * acceptance criteria
  * validation commands
  * rollback notes
  * Linear issue mapping
* Stop before implementation.

---

## Scope

In scope:

* OpenSpec planning consolidation.
* Active change inventory.
* Supersession/archive plan for old specs.
* One consolidated proposal, design, specs, and task structure.
* Linear issue taxonomy and migration issue map.
* Agent execution plan targeting medium-capability agents.
* Explicit phase gates for future implementation.
* Validation strategy for detecting mismatch between planning state and actual repo facts.
* Human-adjudicated spec authority model.
* Old-spec routing table.

Out of scope:

* No code implementation.
* No package moves in this consolidated pass.
* No root reshape execution in this consolidated pass; execution is scheduled by the phase ladder in the arbor/tend/canopy roadmap.
* No deleting files without a later human-approved archive pass.
* No Kubernetes/provider runtime work.
* No Tend database implementation yet.
* No Timescale migrations yet.
* No Rego implementation.
* No long fuzzer campaigns.
* No Joern/CocoIndex feature expansion.
* No automatic Linear mutation unless MCP/OAuth is authenticated and the action targets the approved project for this pass.
* This consolidated pass is planning-only; any Linear mutation is limited to documented, phase-1 ledger startup work under that project.

---

## Primary Direction

The consolidated direction is:

```text
Nx workspace facts
  -> TimescaleDB-backed program-event substrate
  -> relational program facts
  -> append-only event/proof/trace hypertables
  -> mechanical compiler ontology
  -> diagnostics
  -> repair plans
  -> one-file package declarations
  -> Linear work projection
  -> Arbor/Tend/Trellis reshape (phase-ordered execution starting with Linear/MCP readiness)
  -> Tend OpenCode/token-control runtime
```

The program index becomes the main substrate.

Attune should stop teaching agents a large Attune-specific ontology when boring program facts are enough.

The preferred ontology is:

```text
project
target
source_file
symbol
schema_descriptor
edge
generated_file
generated_output
blob_ref
observation
diagnostic
repair
invalidation
```

The older ontology is superseded unless required for compatibility during migration:

```text
package contract
operation
law
obligation
evidence
delta
generated output ownership as compatibility-only historical surface
generated report/export outputs as public surface
```

## Framework substrate authority

`framework/` is the shared language/compiler/runtime substrate for domains and must remain at repository root. It is the generic Timescale-backed control center for Attune, Tend, Canopy, Trellis, and `framework` itself.

Framework stores and governs:

- package facts
- generated output ownership
- internal BOM/materialization
- obligations and proof/fuzzer obligations
- diagnostics and repairs
- target usage evidence
- validation/repair evidence by command
- reactivity invalidations
- atom registry dependencies
- tool/session behavior telemetry
- command/output usefulness traces

Current lane layout:

- `framework/core`
- `framework/compiler`
- `framework/runtime`
- `framework/tooling`
- `framework/testing`
- `framework/compat`

The framework owns:

- package declaration language (`src/attune.package.ts` style),
- diagnostics/repair planning,
- durability-facing conventions for SQL projection/event materialization in `framework_*` domains,
- Reactivity and atom refresh obligations,
- generated ownership/freshness validation contracts.

Domains define domain facts through framework contracts.

Framework is expected to expose projections from its control tables (`framework_view`) rather than requiring repeated scans as the default decision source.

## Framework control evidence and command profile

Framework is a single source of durable control evidence:

- `framework_core` — compiler/control facts (projects, targets, symbols, generated_file, generated_output, obligations).
- `framework_event` — append-only observations, diagnostics, and proof/fuzzer evidence.
- `framework_view` — queryable status projections and validation summaries.
- `framework_outbox` — repair actions, validation requests, and wakeup tasks.

The default operational loop is:

```text
workspace:attune-check
workspace:attune-repair --dryRun
workspace:policy-fast
workspace:package-contracts-check
```

Keep this loop in session profiles and prefer DB-backed projection reads over broad scans.

---

## Agent Operating Principle

The agent must act as a spec consolidation agent, not an implementation agent.

The agent must not edit implementation code.

The agent may edit or draft OpenSpec planning artifacts, agent handoffs, archive plans, and Linear issue seed documents.

The agent must treat current repository facts as higher priority than completed task checkboxes.

If a task says a migration is complete but workspace files still point to the old layout, the agent must record the mismatch rather than assuming completion.

The agent must treat the consolidated megaspec as the active default.

The agent may consult old specs only under the routing rules in this document.

---

## Consolidation Procedure

### Phase 0: Freeze implementation

The agent records that this pass is planning-only.

Allowed:

* read OpenSpec changes
* read docs
* read workspace config
* draft new proposal/design/spec/tasks
* draft supersession plan
* draft Linear issue map
* update `mega.md` routing language

Forbidden:

* moving packages
* changing TypeScript implementation
* changing runtime package code
* changing database migrations
* changing Nix runtime behavior
* applying Kubernetes resources
* starting long-running fuzzers
* creating destructive archive commits
* mutating Linear

### Phase 1: Active spec inventory

The agent lists every active OpenSpec change.

For each change, the agent records:

* change name
* current status
* primary intent
* affected packages/directories
* whether it is implemented, partially implemented, planning-only, stale, or contradictory
* whether it should be merged, archived, retained as appendix, or retained as evidence
* reason for classification
* destination in the megaspec

The inventory must include at least:

* program-index runtime substrate work
* Timescale/reactive projection work
* package surface compression work
* Arbor/Tend/Trellis reshape work
* Tend/OpenCode runtime work
* Dispatch/FoldKit frontend work
* Joern/CocoIndex discovery work
* Joern proof router/fuzzer work
* platform/Kubernetes/Rego/local compute work
* autonomous workstation/Linear work-ledger work

### Phase 2: Classification policy

The agent classifies specs using these rules.

Merge into megaspec when:

* the spec describes the current firm direction
* the spec affects the next migration path
* the spec is needed for agents to execute safely
* the spec defines the public operating surface

Archive/supersede when:

* the spec describes an old direction
* the spec duplicates another active plan
* the spec uses old ontology as primary architecture
* the spec claims completion that must now be revalidated through the program index
* the spec would confuse a medium-capability agent

Retain as future appendix when:

* the spec is directionally useful but not part of the next implementation
* the spec concerns Kubernetes, Rego, local compute, long-running fuzzer campaigns, platform provider behavior, proof runtime, product UI, semantic workbench, or production deployment
* the spec should not block the program-index migration

Retain as evidence-only when:

* the spec or document contains measurements, fuzzer results, design pressure, token audit evidence, or historical rationale
* the contents should inform future work but not remain an active implementation surface

### Phase 3: Megaspec structure

The consolidated change should contain:

```text
openspec/changes/consolidate-attune-program-index-megaspec/
  proposal.md
  design.md
  tasks.md
  spec-inventory.md
  supersession-plan.md
  linear-issue-map.md
  agent-handoffs/
    phase-00-inventory-agent.md
    phase-01-program-index-validation-agent.md
    phase-02-public-surface-ratchet-agent.md
    phase-03-compatibility-removal-agent.md
    phase-04-linear-ledger-agent.md
    phase-05-arbor-reshape-planning-agent.md
    phase-06-tend-planning-agent.md
  specs/
    consolidated-attune-program-index/
      spec.md
    consolidated-public-operating-surface/
      spec.md
    consolidated-spec-supersession/
      spec.md
    consolidated-linear-work-ledger/
      spec.md
    consolidated-arbor-tend-trellis-roadmap/
      spec.md
```

### Phase 4: Core requirements

The megaspec must include these requirements.

#### Requirement: Program index is the primary compiler substrate

Attune shall use the TimescaleDB-backed program store as the primary local source of mechanical program facts.

The program store must represent projects, targets, source files, symbols, schema descriptors, generated outputs, blob refs, observations, diagnostics, repairs, and invalidations.

#### Requirement: Public surface is check and repair

Attune shall expose a small public operating surface:

```text
workspace:attune-check
workspace:attune-repair
focused typecheck/test
```

Agents should not operate by directly editing generated files, generated reports, or internal protocol artifacts.

#### Requirement: One authored package declaration

Each migrated package should converge toward one authored declaration file:

```text
src/attune.package.ts
```

Generated outputs may exist, but the package declaration is the human/agent-authored source of intent.

#### Requirement: Compatibility is temporary

Old package-contract, law, obligation, evidence, and generated-output-ownership surfaces may exist only as compatibility adapters until program-index parity is proven.

The megaspec must define what parity means before removal.

#### Requirement: Planning truth is validated against repo facts

Completed task checkboxes are not sufficient evidence of completion.

The agent must validate claims against:

```text
pnpm-workspace.yaml
nx project graph
tsconfig.base.json
project.json files
actual directories
OpenSpec status
attune-check output
attune-repair dry-run output
```

#### Requirement: Linear is the human ledger

The megaspec shall define one clean Linear project and issue taxonomy for this migration.

Linear may track planned work, risk, validation commands, and acceptance evidence.

Linear is not the durable source of truth for program facts.

#### Requirement: Arbor/Tend/Trellis/Canopy reshape is phased after substrate validation

The root reshape into `framework/`, `attune/`, `canopy/`, `tend/`, and `trellis/` is phase-gated and must align with the consolidated phase ladder.

The reshape must be mechanically verifiable before package implementation resumes.

#### Requirement: Tend is downstream proof/control runtime

Tend shall remain a downstream runtime for token-control, OpenCode command discipline, long-job tracking, and trace/report generation.

Tend must not pull Attune away from the primary program-index substrate migration.

#### Requirement: Medium-agent operability

Every phase must be executable by GPT-5.3 Spark Medium or an equivalent medium-capability agent.

The plan must avoid clever implicit architecture assumptions.

Each phase must include:

* objective
* allowed edit roots
* forbidden edit roots
* exact files to inspect
* exact files to produce
* acceptance criteria
* validation commands
* failure handling
* stop condition

---

## Active Implementation Delay Wall

No implementation begins until the following are true:

1. `mega.md` and the consolidated OpenSpec change agree on the authority model.
2. All old OpenSpec changes have a visible route: merge source, archive-ready, future appendix, or evidence-only.
3. Program-index validation has a concrete first execution issue.
4. Linear issue map is reviewed by the human.
5. The first implementation phase is scoped to program-index validation only.

Do not cross this wall for:

* Arbor root reshaping
* Tend
* Trellis
* Kubernetes
* Rego
* provider behavior
* Timescale migrations
* OpenCode hooks
* long fuzzer runs
* Dispatch/FoldKit implementation
* Joern proof router implementation

---

## Task Plan

### 1. Inventory

* [x] 1.1 List all active OpenSpec changes.
* [x] 1.2 Create `spec-inventory.md`.
* [x] 1.3 Classify each change as merge, archive, appendix, or evidence-only.
* [x] 1.4 Record contradictions between checked tasks and current repo facts.
* [x] 1.5 Stop for human review.

Completed inventory summary:

* `openspec/changes/consolidate-attune-program-index-megaspec/spec-inventory.md`

### 2. Draft megaspec

* [x] 2.1 Create the consolidated OpenSpec change.
* [x] 2.2 Write `proposal.md`.
* [x] 2.3 Write `design.md`.
* [x] 2.4 Write consolidated capability specs.
* [x] 2.5 Write `tasks.md`.
* [x] 2.6 Write `supersession-plan.md`.
* [x] 2.7 Write `linear-issue-map.md`.

Consolidated change location:

* `openspec/changes/consolidate-attune-program-index-megaspec/`

### 3. Supersession planning

* [x] 3.1 Mark specs to merge.
* [x] 3.2 Mark specs to archive later.
* [x] 3.3 Mark specs to retain as appendices.
* [x] 3.4 Mark specs to preserve as evidence-only.
* [x] 3.5 Do not delete or move old specs yet.

### 4. Agent handoffs

* [x] 4.1 Create phase handoffs for program-index validation.
* [x] 4.2 Create phase handoffs for package-surface ratchet.
* [x] 4.3 Create phase handoffs for compatibility adapter removal.
* [x] 4.4 Create phase handoffs for Linear issue projection.
* [x] 4.5 Create phase handoffs for Arbor/Tend/Trellis planning.
* [x] 4.6 Create phase handoffs for Tend planning.
* [x] 4.7 Ensure each handoff targets medium-capability agents.

Phase handoffs:

* `phase-00-inventory-agent.md`
* `phase-01-program-index-validation-agent.md`
* `phase-02-public-surface-ratchet-agent.md`
* `phase-03-compatibility-removal-agent.md`
* `phase-04-linear-ledger-agent.md`
* `phase-05-arbor-reshape-planning-agent.md`
* `phase-06-tend-planning-agent.md`

### 5. Linear issue map

* [x] 5.1 Define one clean project name.
* [x] 5.2 Define labels.
* [x] 5.3 Define issue naming convention.
* [x] 5.4 Define issue phases.
* [x] 5.5 Define acceptance evidence required for each issue.
* [x] 5.6 Do not create or mutate Linear issues until human approval.

### 6. Validation

* [x] 6.1 Run OpenSpec validation for the consolidated change.
* [x] 6.2 Validate the inventory has every active change classified.
* [x] 6.3 Validate the supersession plan does not delete evidence-only context.
* [x] 6.4 Validate no implementation code changed.
* [x] 6.5 Produce final planning summary for human review.

Validation note:

No implementation files were edited. Work completed is planning-only consolidation under `openspec/changes/consolidate-attune-program-index-megaspec/`.

### 7. Human adjudication and routing update

* [x] 7.1 Add human-adjudicated spec authority model.
* [x] 7.2 Add active default, merge-source, archive-ready, appendix, and evidence-only routing table.
* [x] 7.3 Mark `add-joern-proof-router-dsl` as future appendix, not evidence-only, because it is a likely future proof-runtime design lane.
* [x] 7.4 Clarify that “merged” means authority merged, not files deleted.
* [x] 7.5 Clarify explicit non-actions.
* [x] 7.6 Confirm no previous OpenSpec folders were deleted.
* [x] 7.7 Confirm no implementation files changed.
* [x] 7.8 Confirm no Linear mutation happened.

Validation commands:

```bash
rg -n "Human-Adjudicated Spec Authority Model|Spec Routing Table|What .Merged. Means|Explicit Non-Actions" mega.md
rg -n "add-joern-proof-router-dsl" mega.md
git status --short
```

Acceptance criteria:

* `mega.md` clearly says the consolidated megaspec is the active default.
* Every prior spec category is visible in `mega.md`.
* `add-joern-proof-router-dsl` is marked future appendix.
* The old specs are preserved, not deleted.
* No implementation files changed.
* No Linear mutation happened.

---

## Success Criteria

This change is successful when:

* There is one consolidated OpenSpec change that expresses the firm migration direction.
* `mega.md` is the human-adjudicated active routing policy.
* Every active spec has a classification and destination.
* The old scattered direction is no longer required to understand the next migration.
* Medium-capability agents can execute the future plan phase by phase.
* The plan clearly separates planning, validation, root reshaping, Tend work, and future platform work.
* No previous OpenSpec folders have been deleted.
* No implementation code has been changed.
* No Linear mutation has happened.
* The human can review the mega spec and decide what to apply next.

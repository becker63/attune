# Consolidate Attune Program-Index Megaspec

## Why

Attune has reached a stable direction after several overlapping OpenSpec changes: the project should converge around a boring, compiler-like program-index substrate that can support diagnostics, repairs, package contracts, Linear issue planning, future Arbor/Tend/Trellis root reshaping, and Tend’s agent-token/control proof loop.

The current OpenSpec workspace has too many active changes that partially describe the same future from different phases of thinking. Some specs are still valuable, some are obsolete, some should become appendices, and some should become evidence inputs rather than active implementation plans.

This change creates one consolidated migration spec that a medium-capability agent can follow without needing to infer the architecture from scattered historical specs.

The goal is not implementation. The goal is to make the plan mechanically clear enough that GPT-5.3 Spark Medium, GPT-5.5, Codex, or a local agent can safely execute later in small phases.

## What Changes

* Create one consolidated OpenSpec change that becomes the primary planning surface for Attune’s next migration.
* Inventory all active OpenSpec changes and classify them as:

  * merged into the megaspec
  * superseded/archive-ready
  * retained as future appendix
  * retained as evidence-only context
* Collapse overlapping migration language into one implementation story:

  * SQLite program index as the primary local compiler database
  * Nx graph and source facts as first-class inputs
  * one authored `src/attune.package.ts` surface per package
  * language-service diagnostics and repair plans as the public operating surface
  * compatibility adapters only where needed for transitional parity
  * Linear issue projection as the human work ledger
  * Arbor root reshape as a later mechanically validated phase
  * Tend as the token/control proof runtime after the Attune substrate is stable
  * Trellis as portable skills/templates, not a runtime framework
* Remove or supersede irrelevant specs that no longer match the firm direction.
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

## Scope

In scope:

* OpenSpec planning consolidation.
* Active change inventory.
* Supersession/archive plan for old specs.
* One new consolidated proposal, design, specs, and tasks.
* Linear issue taxonomy and migration issue map.
* Agent execution plan targeting medium-capability agents.
* Explicit phase gates for future implementation.
* Validation strategy for detecting mismatch between planning state and actual repo facts.

Out of scope:

* No code implementation.
* No package moves.
* No root reshape execution.
* No deleting files without a written supersession/archive plan.
* No Kubernetes/provider runtime work.
* No Tend database implementation yet.
* No Timescale migrations yet.
* No Rego implementation.
* No long fuzzer campaigns.
* No Joern/CocoIndex feature expansion.
* No automatic Linear mutation unless explicitly requested later.

## Primary Direction

The consolidated direction is:

```text
Nx workspace facts
  -> SQLite program index
  -> mechanical compiler ontology
  -> diagnostics
  -> repair plans
  -> one-file package declarations
  -> Linear work projection
  -> later Arbor/Tend/Trellis reshape
  -> later Tend OpenCode/token-control runtime
```

The program index becomes the main substrate. Attune should stop teaching agents a large Attune-specific ontology when boring program facts are enough.

The preferred ontology is:

```text
project
target
source_file
symbol
schema_descriptor
edge
artifact
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
artifact ownership as primary truth
generated reports as public surface
```

## Agent Operating Principle

The agent must act as a spec consolidation agent, not an implementation agent.

The agent must not edit implementation code.

The agent may edit or draft OpenSpec planning artifacts, agent handoffs, archive plans, and Linear issue seed documents.

The agent must treat current repository facts as higher priority than completed task checkboxes.

If a task says a migration is complete but workspace files still point to the old layout, the agent must record the mismatch rather than assuming completion.

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

Forbidden:

* moving packages
* changing TypeScript implementation
* changing runtime package code
* changing database migrations
* changing Nix runtime behavior
* applying Kubernetes resources
* starting long-running fuzzers
* creating destructive archive commits

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
* SQLite/reactive projection work
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
* the spec concerns Kubernetes, Rego, local compute, long-running fuzzer campaigns, platform provider behavior, or production deployment
* the spec should not block the program-index migration

Retain as evidence-only when:

* the spec or document contains measurements, fuzzer results, design pressure, token audit evidence, or historical rationale
* the contents should inform future work but not remain an active implementation surface

### Phase 3: Megaspec structure

The new consolidated change should contain:

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

Attune shall use the SQLite program index as the primary local source of mechanical program facts.

The index must represent projects, targets, source files, symbols, schema descriptors, edges, artifacts, observations, diagnostics, repairs, and invalidations.

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

Old package-contract, law, obligation, evidence, and artifact-ownership surfaces may exist only as compatibility adapters until program-index parity is proven.

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

#### Requirement: Arbor/Tend/Trellis reshape is phased after substrate validation

The root reshape into `attune/`, `tend/`, and `trellis/` must not execute until program-index validation and workspace reference checks are stable.

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

## Task Plan

### 1. Inventory

* [ ] 1.1 List all active OpenSpec changes.
* [ ] 1.2 Create `spec-inventory.md`.
* [ ] 1.3 Classify each change as merge, archive, appendix, or evidence-only.
* [ ] 1.4 Record contradictions between checked tasks and current repo facts.
* [ ] 1.5 Stop for human review.

### 2. Draft megaspec

* [ ] 2.1 Create the consolidated OpenSpec change.
* [ ] 2.2 Write `proposal.md`.
* [ ] 2.3 Write `design.md`.
* [ ] 2.4 Write consolidated capability specs.
* [ ] 2.5 Write `tasks.md`.
* [ ] 2.6 Write `supersession-plan.md`.
* [ ] 2.7 Write `linear-issue-map.md`.

### 3. Supersession planning

* [ ] 3.1 Mark specs to merge.
* [ ] 3.2 Mark specs to archive later.
* [ ] 3.3 Mark specs to retain as appendices.
* [ ] 3.4 Mark specs to preserve as evidence-only.
* [ ] 3.5 Do not delete or move old specs yet.

### 4. Agent handoffs

* [ ] 4.1 Create phase handoffs for program-index validation.
* [ ] 4.2 Create phase handoffs for package-surface ratchet.
* [ ] 4.3 Create phase handoffs for compatibility adapter removal.
* [ ] 4.4 Create phase handoffs for Linear issue projection.
* [ ] 4.5 Create phase handoffs for Arbor/Tend/Trellis planning.
* [ ] 4.6 Create phase handoffs for Tend planning.
* [ ] 4.7 Ensure each handoff targets medium-capability agents.

### 5. Linear issue map

* [ ] 5.1 Define one clean project name.
* [ ] 5.2 Define labels.
* [ ] 5.3 Define issue naming convention.
* [ ] 5.4 Define issue phases.
* [ ] 5.5 Define acceptance evidence required for each issue.
* [ ] 5.6 Do not create or mutate Linear issues until human approval.

### 6. Validation

* [ ] 6.1 Run OpenSpec validation for the consolidated change.
* [ ] 6.2 Validate the inventory has every active change classified.
* [ ] 6.3 Validate the supersession plan does not delete evidence-only context.
* [ ] 6.4 Validate no implementation code changed.
* [ ] 6.5 Produce final planning summary for human review.

## Success Criteria

This change is successful when:

* There is one consolidated OpenSpec change that expresses the firm migration direction.
* Every active spec has a classification and destination.
* The old scattered direction is no longer required to understand the next migration.
* Medium-capability agents can execute the future plan phase by phase.
* The plan clearly separates planning, validation, root reshaping, Tend work, and future platform work.
* No implementation code has been changed.
* The human can review the mega spec and decide what to apply next.

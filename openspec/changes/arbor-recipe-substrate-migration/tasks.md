# Tasks

## ARS-000 Bootstrap and validation

- Status: completed
- Linear: ATT-103, ATT-104, ATT-105, ATT-106, ATT-107; projected through Linear project `Arbor - Recipe Substrate Migration`, document `ARS Task Projection Map`, project status update, and `ATT-105` supersession comment.
- Source changes migrated: bootstrap recipe instructions, `foundation-reshape-and-tend-execution`, `consolidate-attune-program-index-megaspec`.
- Allowed files: OpenSpec planning files, root planning docs, Linear projection comments.
- Forbidden files: package source, generated artifacts, dependency manifests, DB migration implementation, runtime implementation.
- Goal: keep this migration planning-only and prove the final OpenSpec shape before old changes are deleted.
- Required changes: validate final change shape, confirm no implementation files changed, record old planning surfaces as superseded, and keep `tasks.md` as the single final ledger.
- Validation: `git status --short`; `openspec status --change arbor-recipe-substrate-migration`; `openspec validate --strict` or the nearest strict OpenSpec validation supported by the CLI.
- Evidence: final change contains only `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, and one delta spec; package source remains untouched.
- Completion checkbox:
- [x] ARS-000 complete

## ARS-010 Spec consolidation

- Status: completed
- Linear: ATT-108, ATT-109, ATT-110, ATT-111; PI-001, PI-002, PI-003, GOV-001 historical issue-map references; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `consolidate-attune-program-index-megaspec`, `promote-program-index-runtime-substrate`, `sqlite-program-index-reactive-projections`, `compress-attune-package-surface`, `standardize-effect-package-contracts`, `standardize-nx-nix-build`, `enforce-nix-agent-policy-gates`.
- Allowed files: final OpenSpec planning artifacts, framework planning docs, check/repair docs.
- Forbidden files: raw descriptor JSON, SQLite rows, generated ledgers, package implementation files.
- Goal: replace parallel active planning surfaces with one Recipe/ManagedRecipe capability spec and task ledger.
- Required changes: migrate old requirements into Recipe, ManagedRecipe, receipt, diagnostic, repair, health, Trellis, Tend, and projection requirements; encode that superseded surfaces are deleted/archived/replaced rather than maintained through compatibility adapters.
- Validation: `rg -n "Recipe|ManagedRecipe|receipt|diagnostic|repair|health" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: final proposal/design/spec/tasks name Recipe as the top-level primitive, list all old source changes in the migrated-source appendix, and forbid compatibility row/materializer/adapter lanes for superseded surfaces.
- Completion checkbox:
- [x] ARS-010 complete

## ARS-020 Recipe substrate DB spine

- Status: completed
- Linear: ATT-108, ATT-109, ATT-110, ATT-141, ATT-142, ATT-143, ATT-144, ATT-145, ATT-146, ATT-147, ATT-148, ATT-149, ATT-150, ATT-151; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `promote-program-index-runtime-substrate`, `sqlite-program-index-reactive-projections`, `consolidate-attune-program-index-megaspec`, `standardize-effect-package-contracts`, `foundation-reshape-and-tend-execution`, `timescaledb.md`.
- Allowed files: framework DB planning docs, SQL design docs, final OpenSpec artifacts.
- Forbidden files: SQL migration implementation, generated Kanel output, runtime DB services.
- Goal: define the generic TimescaleDB/Postgres recipe receipt spine before domain-specific tables.
- Required changes: specify `framework_core.recipe`, `framework_core.recipe_edge`, `framework_core.recipe_io`, `framework_event.recipe_run`, `framework_event.recipe_receipt`, `framework_event.recipe_diagnostic`, `framework_event.recipe_repair`, `framework_view.recipe_health`, and `framework_view.repair_plan`; state that SQLite/Drizzle/PgTyped are historical context only and receive no compatibility adapter.
- Validation: `rg -n "framework_core.recipe|framework_event.recipe_receipt|framework_view.recipe_health|Kanel|Kysely|SafeQL" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: active DB families are bounded to `framework_*`, `attune_*`, `tend_*`, and `canopy_*`; Linear and artifact schema families are excluded.
- Completion checkbox:
- [x] ARS-020 complete

## ARS-030 Nx/Nix recipe execution

- Status: completed
- Linear: ATT-51, ATT-52, ATT-53, ATT-54, ATT-55, ATT-56, ATT-57, ATT-58, ATT-59, ATT-60, ATT-118, ATT-119, ATT-120, ATT-121, ATT-122, ATT-123, ATT-124; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `standardize-nx-nix-build`, `enforce-nix-agent-policy-gates`, `compress-attune-package-surface`, `standardize-effect-package-contracts`, `reshape-arbor-monorepo-and-tend-opencode-runtime`, `foundation-reshape-and-tend-execution`.
- Allowed files: Nx/Nix planning docs, final OpenSpec artifacts, future workspace config under explicit implementation tasks.
- Forbidden files: package moves or workspace edits during bootstrap consolidation.
- Goal: express Nx targets, Nix closures, Arion service runtimes, and policy gates as recipe projections and receipts.
- Required changes: define `NxTarget.fromRecipe`, Nix/Arion ManagedRecipe substrates, public Nx check/repair targets, and policy-gate receipt behavior.
- Validation: `rg -n "NxTarget.fromRecipe|Nix|Arion|policy|attune-check|attune-repair" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: Nx remains the public workflow surface; Nix remains the reproducible substrate.
- Completion checkbox:
- [x] ARS-030 complete

## ARS-040 ManagedRecipe and Effect Alchemy lifecycle

- Status: completed
- Linear: ATT-35, ATT-38; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `effect-alchemy-platform-lifecycle`, `bootstrap-thinkcentre-network`, `bootstrap-home-compute-cluster`, `harden-day0-provider-idempotence`, `document-local-compute-control-plane`.
- Allowed files: final OpenSpec artifacts, Alchemy/platform planning docs, future provider specs under explicit implementation tasks.
- Forbidden files: provider implementation, Kubernetes resource implementation, live infrastructure changes.
- Goal: make Effect Alchemy the lifecycle/state substrate for ManagedRecipe.
- Required changes: model plan/apply/check/destroy, manual gates, provider idempotence, observed state, drift diagnostics, and repair plans as ManagedRecipe behavior.
- Validation: `rg -n "ManagedRecipe|AlchemyResource.fromManagedRecipe|plan/apply/check/destroy|drift" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: design states all Alchemy resources can be ManagedRecipe outputs and not all Recipes are Alchemy resources.
- Completion checkbox:
- [x] ARS-040 complete

## ARS-050 Trellis LSP and agent companion

- Status: completed
- Linear: ATT-125, ATT-126, ATT-127, ATT-128, ATT-129, ATT-130, ATT-131; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `standardize-effect-package-contracts`, `compress-attune-package-surface`, `promote-program-index-runtime-substrate`, `sqlite-program-index-reactive-projections`.
- Allowed files: final OpenSpec artifacts, LSP/check/repair planning docs, future Trellis package specs under explicit implementation tasks.
- Forbidden files: language service implementation during bootstrap, generated reports, raw program-index internals.
- Goal: define Trellis as the recipe-aware LSP/MCP/editor-agent companion for ownership, stale state, diagnostics, repairs, and exact Nx suggestions.
- Required changes: migrate static skill-pack language into Trellis recipe health, code action, code lens, MCP, and editor-agent projections; reject generated-companion/artifact-ownership compatibility metadata as an active LSP or repair source.
- Validation: `rg -n "Trellis|LSP|MCP|code action|generated output ownership|repair code actions" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: Trellis is no longer described as only static skills or docs.
- Completion checkbox:
- [x] ARS-050 complete

## ARS-060 Tend and OpenCode control integration

- Status: completed
- Linear: ATT-132, ATT-133, ATT-134, ATT-135, ATT-136, ATT-137, ATT-138, ATT-139, ATT-140, ATT-152, ATT-153, ATT-154, ATT-155, ATT-156, ATT-157, ATT-158, ATT-159, ATT-160, ATT-161, ATT-162, ATT-163, ATT-164, ATT-165; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `reshape-arbor-monorepo-and-tend-opencode-runtime`, `foundation-reshape-and-tend-execution`, `add-codex-autonomous-workstation`, `define-post-infra-product-story`.
- Allowed files: final OpenSpec artifacts, Tend planning docs, future Tend package files under explicit implementation tasks.
- Forbidden files: OpenCode adapter runtime, Tend DB migrations, policy enforcement implementation during bootstrap.
- Goal: define Tend as execution discipline and token/control runtime consuming recipe receipts, diagnostics, repairs, health, and Trellis hints.
- Required changes: specify OpenCode event ingestion, long-job registration, Magic Context policy, RTK compression, resume packets, and token/context reports.
- Validation: `rg -n "Tend|OpenCode|Magic Context|RTK|long-job|tokens per accepted repair" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: final design lists token and cost metrics required for Tend reports.
- Completion checkbox:
- [x] ARS-060 complete

## ARS-070 Attune product recipe loop

- Status: completed
- Linear: ATT-6, ATT-8, ATT-10, ATT-11, ATT-12, ATT-14, ATT-16, ATT-17, ATT-20, ATT-21, ATT-23, ATT-24, ATT-26, ATT-50; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `add-attuned-semantic-workbench`, `add-attune-pi-agent`, `define-post-infra-product-story`, `add-codex-autonomous-workstation`, `docs/attuned/*`.
- Allowed files: final OpenSpec artifacts, product planning docs, future Attune package specs under explicit implementation tasks.
- Forbidden files: Attune runtime/source changes during bootstrap.
- Goal: express Attune discovery as a recipe graph from repo snapshot through anchor retrieval, hypotheses, Joern proof, scoring, rule candidates, deterministic rules, and reports.
- Required changes: preserve Pi/optimizer/workbench/scribe/product-loop intent as recipe pipelines and receipts.
- Validation: `rg -n "repo snapshot recipe|anchor retrieval recipe|hypothesis recipe|evidence scoring recipe|rule candidate recipe" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: final design includes the Attune product recipe loop and maps old ATT references into this task.
- Completion checkbox:
- [x] ARS-070 complete

## ARS-080 Canopy managed platform recipes

- Status: completed
- Linear: ATT-35, ATT-38; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `bootstrap-home-compute-cluster`, `bootstrap-thinkcentre-network`, `effect-alchemy-platform-lifecycle`, `harden-day0-provider-idempotence`, `document-local-compute-control-plane`.
- Allowed files: final OpenSpec artifacts, Canopy/platform planning docs, future provider specs under explicit implementation tasks.
- Forbidden files: live Kubernetes resources, NixOS deployment changes, secret material, provider implementation during bootstrap.
- Goal: model Canopy/home compute/platform lifecycle as ManagedRecipe desired-state, render, policy, deploy plan, observed state, drift diagnostic, and repair plan.
- Required changes: preserve typed deployment, manual gates, machine/network bootstrap, and provider idempotence requirements under ManagedRecipe.
- Validation: `rg -n "Canopy|desired state|rendered resources|policy check|observed status|drift diagnostic" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: final spec distinguishes Canopy ManagedRecipe behavior from plain pure derivation recipes.
- Completion checkbox:
- [x] ARS-080 complete

## ARS-090 Joern, fuzzer, and proof recipe migration

- Status: completed
- Linear: no direct active ATT issue found in current source references; project issue creation/update must avoid duplicates.
- Source changes migrated: `add-joern-proof-router-dsl`, `add-effect-corpus-fuzzer`, `add-semantic-ts-morph-fuzzer`, `standardize-nx-nix-build`.
- Allowed files: final OpenSpec artifacts, future proof/fuzzer package specs under explicit implementation tasks.
- Forbidden files: Joern query implementation, container/fuzzer workloads, generated DSL mutation during bootstrap.
- Goal: model proof templates, fuzzing, serializer projections, corpus seeds, semantic mutation, query reuse, and telemetry as recipe evidence pipelines.
- Required changes: keep agents on bounded proof recipes, normalize Joern output into receipts/observation packets, and attach Nix/Nx receipts for expensive runs.
- Validation: `rg -n "Joern|fuzzer|proof|corpus|telemetry|observation packets" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: final design states agents must not author arbitrary Joern queries in v0.
- Completion checkbox:
- [x] ARS-090 complete

## ARS-100 Dispatch, FoldKit, and report surfaces

- Status: completed
- Linear: ATT-6, ATT-8, ATT-10, ATT-11, ATT-12, ATT-16, ATT-17, ATT-20, ATT-21; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: `add-dispatch-foldkit-frontend`, `wire-dispatch-foldkit-fixtured-site`, `add-foldkit-fixture-closed-loop`, `add-attuned-semantic-workbench`.
- Allowed files: final OpenSpec artifacts, future FoldKit/report package specs under explicit implementation tasks.
- Forbidden files: UI/runtime implementation during bootstrap.
- Goal: migrate Dispatch/FoldKit/product UI work into recipe-derived report and explanation surfaces.
- Required changes: preserve workbench snapshots, MDX fixtures, atom projections, event replay, review packets, and report-to-Linear projections as recipes.
- Validation: `rg -n "FoldKit|Dispatch|report recipe|MDX|workbench snapshot|review packet" openspec/changes/arbor-recipe-substrate-migration`.
- Evidence: final design treats Dispatch as historical naming where applicable and FoldKit/report recipes as future explanation surfaces.
- Completion checkbox:
- [x] ARS-100 complete

## ARS-110 Linear projection migration

- Status: completed
- Linear: ATT-6, ATT-8, ATT-10, ATT-11, ATT-12, ATT-14, ATT-16, ATT-17, ATT-20, ATT-21, ATT-23, ATT-24, ATT-26, ATT-35, ATT-38, ATT-50, ATT-51, ATT-52, ATT-53, ATT-54, ATT-55, ATT-56, ATT-57, ATT-58, ATT-59, ATT-60, ATT-103, ATT-104, ATT-105, ATT-106, ATT-107, ATT-108, ATT-109, ATT-110, ATT-111, ATT-112, ATT-113, ATT-114, ATT-115, ATT-116, ATT-117, ATT-118, ATT-119, ATT-120, ATT-121, ATT-122, ATT-123, ATT-124, ATT-125, ATT-126, ATT-127, ATT-128, ATT-129, ATT-130, ATT-131, ATT-132, ATT-133, ATT-134, ATT-135, ATT-136, ATT-137, ATT-138, ATT-139, ATT-140, ATT-141, ATT-142, ATT-143, ATT-144, ATT-145, ATT-146, ATT-147, ATT-148, ATT-149, ATT-150, ATT-151, ATT-152, ATT-153, ATT-154, ATT-155, ATT-156, ATT-157, ATT-158, ATT-159, ATT-160, ATT-161, ATT-162, ATT-163, ATT-164, ATT-165, ATT-166, ATT-167, ATT-168, ATT-169; projected through Linear project `Arbor - Recipe Substrate Migration`, document `ARS Task Projection Map`, project status update, and `ATT-105` supersession comment.
- Source changes migrated: `foundation-reshape-and-tend-execution`, `consolidate-attune-program-index-megaspec/linear-issue-map.md`, `define-post-infra-product-story`, `add-attuned-semantic-workbench`, `effect-alchemy-platform-lifecycle`, `add-attune-pi-agent`, `enforce-nix-agent-policy-gates`, docs with ATT references.
- Allowed files: final OpenSpec task ledger, Linear project/issues/comments.
- Forbidden files: duplicate Linear issue creation without checking existing references, Linear as runtime truth, issue closure without PR/evidence.
- Goal: make Linear an external projection of ARS tasks and mark old issue references as migrated or superseded.
- Required changes: update or comment existing issues where possible, create no duplicate issue when a source issue maps to an ARS task, and leave explicit pending notes only if connector/API access fails.
- Validation: Linear connector read/update evidence; `rg -n "Linear:|ATT-[0-9]+|pending-mcp-unavailable" openspec/changes/arbor-recipe-substrate-migration/tasks.md`.
- Evidence: every source ATT reference is listed in this task and mapped to a final ARS block.
- Completion checkbox:
- [x] ARS-110 complete

## ARS-120 Deletion and archive cleanup

- Status: completed
- Linear: ATT-166, ATT-167, ATT-168, ATT-169; projected through Linear project `Arbor - Recipe Substrate Migration` and document `ARS Task Projection Map`.
- Source changes migrated: every active old OpenSpec change folder listed in `design.md`.
- Allowed files: `openspec/changes/<old-change>/**` deletion after migration, final OpenSpec artifacts.
- Forbidden files: `openspec/config.yaml`, main `openspec/specs`, archive folders unless explicitly requested, package implementation source.
- Goal: delete old active OpenSpec changes after their content is represented here so only this migration change remains active.
- Required changes: remove superseded active change folders and bootstrap artifact after final validation; keep no compatibility-maintenance lane for deleted surfaces.
- Validation: `find openspec/changes -mindepth 1 -maxdepth 1 -type d -not -name archive -not -name arbor-recipe-substrate-migration -print`; `git status --short | rg "^D\\s+openspec/changes/"`.
- Evidence: old folders show deleted in git status and the active-change find command prints nothing.
- Completion checkbox:
- [x] ARS-120 complete

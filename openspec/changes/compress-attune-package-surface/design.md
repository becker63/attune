## Context

The previous framework migration made `src/attune.package.ts` small, but it did
so by moving the full semantic contract into package-local generated companions
such as `src/attune.contract.generated.ts`, `src/attune.generated.ts`, and
`src/attune.package.typecheck.ts`. That improved readability but still leaves
package source trees looking like they own Attune compiler output.

The desired framework posture is a language-style authoring model:

```text
edit src/attune.package.ts
run attune-check
run attune-repair
framework-owned materialization updates cache/projections
language-service diagnostics narrow
```

Normal packages should not teach agents to inspect or hand-edit package-local
generated companions, Source BOM shards, or typecheck assertion files.

## Goals / Non-Goals

**Goals:**

- Make `src/attune.package.ts` the only normal package-local Attune source file.
- Move generated/package-contract companions, typecheck assertions, Source BOM
  ownership, registries, evidence maps, type guidance, and artifact freshness
  toward framework-owned cache/projection state.
- Add a staged policy diagnostic for package-local Attune companion files.
- Collapse the public operating vocabulary to check and repair.
- Keep lower-level generators and policy checks available as internal
  implementations of diagnostics and repairs.
- Preserve framework semantics, package-contract evidence, property/fuzzer
  hooks, SQLite/ProtocolStore, and language-service diagnostics.

**Non-Goals:**

- Deleting package contract semantics, generated artifacts, SQLite, FastCheck,
  or language-service behavior.
- Reintroducing large derived maps into `src/attune.package.ts`.
- Exposing raw `.attune/cache`, ProtocolStore internals, or Drizzle tables to
  product packages.
- Making runtime `@effect/rpc` a required materialization backend.

## Decisions

### Decision: `attune.package.ts` is the only package-local Attune source file

`src/attune.package.ts` is the package-local authored language-framework root.
Generated companions, typecheck assertions, Source BOM shards, type-guidance
maps, property/evidence scaffolds, RPC descriptors, generated artifact ledgers,
and repair plans are framework-owned materialization state.

The staged ratchet is:

```text
Phase A: inventory package-local Attune companions
Phase B: warn for product packages
Phase C: error for product packages, warn for framework packages
Phase D: error everywhere except explicit framework-internal exceptions
```

This change starts with inventory/warning and moves files only when the current
toolchain can validate the new lookup path.

### Decision: Generated Attune material lives in framework-owned locations

Generated TypeScript, typecheck aggregates, Source BOM projections, evidence
metadata, descriptor exports, and artifact freshness records move toward:

```text
.attune/cache/generated/<project>/*
.attune/cache/typecheck/<project>/*
.attune/cache/source-bom/<project>.json
.attune/cache/protocol/<project>/*
.attune/cache/evidence/<project>/*
framework/architecture/src/generated/source-bom/<project>.json
```

When checked-in generated TypeScript is temporarily needed for TypeScript or Nx
constraints, it must be treated as a compatibility exception with a removal
task. When Source BOM projections must remain checked in during migration, they
belong under a framework-owned generated inventory path instead of package roots.
Product package source must not import generated cache files directly.

### Decision: Check and repair are the public framework verbs

Attune exposes a boring public operating surface:

```text
workspace:attune-check
workspace:attune-repair
<project>:attune-check
<project>:attune-repair
<project>:typecheck
<project>:test
```

Lower-level targets such as package-contract checks, framework policy checks,
generator-shape checks, property/evidence checks, and proof-pressure campaigns
remain internal or advanced. Normal agents should start from check output and
run suggested repairs rather than memorizing generator names.

### Decision: Generators are repair implementations

Nx generators remain the deterministic way to materialize repeated shapes, but
the public path is diagnostic-driven. A repairable diagnostic carries a repair
plan that explains the safe public command, the internal generator/materializer,
the files or cache records that may change, the files that must not be edited,
and the validation to run afterward.

### Decision: ProtocolStore bridges Nx and the language service

`attune-check` may compute diagnostics and repair plans from source,
materialized outputs, and ProtocolStore projections. `attune-repair` may update
generated/cache material, descriptor hashes, artifact freshness, diagnostics,
and repair-plan state. The language service reads through `ProtocolQuery` and
`ProtocolDiagnostics`, not through package-local generated files.

## Risks / Trade-offs

- [Risk] Moving package-local generated TypeScript too quickly can break package
  typecheck and existing contract tests. → Start with policy, cache layout,
  central aggregate strategy, and focused movement behind validation.
- [Risk] A gitignored `.attune/cache` cannot satisfy normal package imports. →
  Product code must not import cache outputs; framework checks can read them
  through explicit Nx/materializer APIs.
- [Risk] Hiding generator names could make debugging harder. → Keep lower-level
  checks and generator references in advanced docs and repair plans, not in the
  default agent loop.
- [Risk] Source BOM/generator-shape files are still migration scaffolding in the
  current repo. → Treat them as temporary compatibility views and add a staged
  migration path instead of silently preserving them as source truth.

## Migration Plan

1. Inventory package-local Attune files and classify each file as authored,
   generated, compile-only assertion, Source BOM, or migration-only.
2. Add the staged one-file policy diagnostic and no-new-companion fixtures.
3. Define the framework-owned generated/cache layout and TypeScript typecheck
   aggregate strategy.
4. Add or verify public `attune-check` and `attune-repair` targets at workspace
   and project scope.
5. Add repair-plan metadata and generator routing for current repairable
   diagnostics.
6. Move package-local typecheck/generation/BOM files in rings as framework checks
   learn the new lookup path.
7. Simplify AGENTS and operating docs around the check/repair loop.

## Open Questions

- Which generated TypeScript files must remain checked in until virtual module
  or central aggregate support is implemented?
- Should cache-owned typecheck aggregates live under `.attune/cache/typecheck`
  only, or should a framework-owned checked-in aggregate exist during migration?
- Should framework-internal projects eventually follow the same one-file rule,
  or keep a permanent exception for compiler/plugin packages?

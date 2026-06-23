## Why

Attune has crossed into a real language-framework shape, but package source
trees still look like they carry compiler output: generated contract companions,
typecheck files, generated registries, and package-local Source BOM shards sit
next to the authored `src/attune.package.ts`. That makes future agents ask
which generated file or generator to edit instead of following the framework
loop.

This change compresses the public surface so package authors edit one Attune
source file and operate the framework through diagnostics, `attune-check`, and
`attune-repair`.

## What Changes

- Treat `src/attune.package.ts` as the only normal package-local Attune source
  file for product packages and normal framework packages.
- Move generated Attune companions, typecheck assertions, Source BOM shards,
  registry/type-guidance/evidence material, and generated artifact state to
  framework-owned cache/projection locations or explicit temporary waivers.
- Add a staged architecture policy diagnostic:
  `attune/package-local-surface/one-attune-file`.
- Collapse the documented public operating surface to:
  `workspace:attune-check`, `workspace:attune-repair`,
  `<project>:attune-check`, `<project>:attune-repair`, plus focused
  `<project>:typecheck` and `<project>:test`.
- Keep lower-level package-contract, framework-policy, generator, evidence, and
  proof-pressure targets as internal or advanced implementation details.
- Make repairable diagnostics carry structured repair plans that route to the
  right generator or materializer internally.
- Keep SQLite/ProtocolStore private as the projection store for descriptors,
  obligations, diagnostics, repair plans, artifact freshness, evidence, and
  Source BOM ownership.
- Update AGENTS and operating docs so agents do not memorize generator names or
  hand-edit generated material.

## Capabilities

### New Capabilities

- `attune-package-local-surface`: Defines the one-package-local-Attune-file
  rule, staged ratchet, generated/cache relocation model, and typecheck/Source
  BOM migration strategy.
- `attune-check-repair-surface`: Defines the public check/repair command
  hierarchy, diagnostic-driven repair plans, generator routing model, and
  documentation policy.

### Modified Capabilities

- None. This change layers follow-up requirements while the main framework
  migration is still active and unarchived.

## Impact

- Affected source trees: `packages/*`, `framework/*`, `AGENTS.md`, framework
  operating docs, and architecture policy checks.
- Affected framework internals: `framework/architecture` policy CLI,
  `framework/runtime` diagnostic/repair types, `framework/nx` repair routing,
  and package-contract checks.
- Affected generated state: package-local generated companions and typecheck
  files move toward `.attune/cache/**` or framework-owned generated aggregates.
- No raw SQLite/Drizzle/ProtocolStore internals become public package APIs.
- No checked-in ProtocolDelta, evidence summary, or report artifacts are added.

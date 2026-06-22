# product-framework-protocol-import-agent-a Handoff

Agent:
Phase 2 implementation subagent, `product-framework-protocol-import-agent-a`

Wave:
Product framework protocol import migration slice

Ownership:
`attuned-discovery` and `cocoindex-effect` package-contract public imports,
package contract tests, package-local Vitest source aliases, and this handoff.

Changed:
- `packages/attuned-discovery/src/attune.package.ts` now imports contract DSL
  helpers and re-exports `PackageContractSchema` from
  `@attune/framework-protocol`.
- `packages/attuned-discovery/src/attune.package.typecheck.ts` now imports
  compile-only assertion helpers from `@attune/framework-protocol`.
- `packages/attuned-discovery/test/attune-package-contract.test.ts` now imports
  contract assertion helpers from `@attune/framework-protocol`.
- `packages/attuned-discovery/vitest.config.ts` now aliases
  `@attune/framework-protocol` to `framework/protocol/src/index.ts` for source
  mode tests.
- `packages/cocoindex-effect/src/attune.package.ts` now imports contract DSL
  helpers and re-exports `PackageContractSchema` from
  `@attune/framework-protocol`.
- `packages/cocoindex-effect/src/attune.package.typecheck.ts` now imports
  compile-only assertion helpers from `@attune/framework-protocol`.
- `packages/cocoindex-effect/test/attune-package-contract.test.ts` now imports
  contract assertion helpers from `@attune/framework-protocol`.
- `packages/cocoindex-effect/vitest.config.ts` now aliases
  `@attune/framework-protocol` to `framework/protocol/src/index.ts` for source
  mode tests.

Generated:
- None.

Validated:
- `nx run attuned-discovery:typecheck`
- `nx run attuned-discovery:test`
- `nx run cocoindex-effect:typecheck`
- `nx run cocoindex-effect:test`

Not run:
- Workspace-wide policy gates; this slice only touched two product package
  import boundaries and their package-local tests.

Contract status:
- package: `attuned-discovery`
- PackageContract: present; public contract DSL import migrated to
  `@attune/framework-protocol`.
- PackageLayer: unchanged.
- PackageTestLayer: unchanged.
- attune.package.typecheck: present; assertion imports migrated to
  `@attune/framework-protocol`.
- PackageTypeGuidance: unchanged.
- package views: unchanged.
- property evidence: unchanged.
- Nx targets: unchanged; package typecheck and test targets passed.

Contract status:
- package: `cocoindex-effect`
- PackageContract: present; public contract DSL import migrated to
  `@attune/framework-protocol`.
- PackageLayer: unchanged.
- PackageTestLayer: unchanged.
- attune.package.typecheck: present; assertion imports migrated to
  `@attune/framework-protocol`.
- PackageTypeGuidance: unchanged.
- package views: unchanged.
- property evidence: unchanged.
- Nx targets: unchanged; package typecheck and test targets passed.

Residual migration debt:
- The package-local Vitest configs still keep an `@attune/architecture` source
  alias because `framework/protocol` currently re-exports through the
  architecture implementation package.
- Product runtime behavior, package layers, generated ledgers, Source BOM, and
  package command surfaces were intentionally left unchanged.

Blocked by:
- None.

Next agent:
- Framework/protocol cleanup agent should eventually remove the protocol
  package's dependency on the architecture implementation package when the
  public DSL no longer re-exports from that surface.
- Product boundary validation agent can now assert that these two product
  package contract files use `@attune/framework-protocol` for public contract
  imports.

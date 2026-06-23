# Archive Hardening Coordinator Handoff

Agent: local coordinator
Wave: archive hardening
Ownership:
- `framework/protocol` package-contract kernel ownership.
- `framework/architecture` relocation and residual policy ownership.
- `framework/oxlint-policy` relocation integration.
- Historical no-report classification and flagship source-reference adoption.

Changed:
- Moved the canonical package-contract kernel into
  `framework/protocol/src/package-contract`.
- Moved the residual architecture policy project from
  `packages/attune-architecture` to `framework/architecture`.
- Moved the Effect oxlint policy project from `packages/effect-oxlint-policy`
  to `framework/oxlint-policy`.
- Inverted dependencies so `framework/protocol` no longer imports
  `attune-architecture`; `framework/architecture` consumes the canonical
  framework protocol kernel as a framework sibling.
- Updated oxlint to load the plugin from
  `framework/oxlint-policy/dist/index.js`.
- Updated Source BOM/generator-shape paths for the moved framework projects.
- Added no-report policy coverage for generic fuzzer/proof/run reports while
  allowing explicitly marked historical migration notes under `docs/`.
- Adopted source-reference view derivation for the `attuned-discovery`
  `event-replay-projection` operation.
- Added archive-hardening OpenSpec tasks and inventory/design/proposal wording
  for the final framework placement.

Generated:
- `framework/protocol/src/package-contract/*` as the canonical type kernel.
- `framework/architecture/**` and `framework/oxlint-policy/**` moved from
  previous package locations.
- `archive-no-report-policy-sidecar.md` from the no-report validation worker.

Validated:
- `nx run-many -t typecheck -p framework-protocol,attune-architecture,effect-oxlint-policy --skipNxCache`
- `nx run-many -t typecheck -p framework-protocol,attune-architecture,effect-oxlint-policy,attuned-discovery,attune-nx --skipNxCache`
- `nx run attune-architecture:test --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run effect-oxlint-policy:typecheck --skipNxCache`
- `nx run effect-oxlint-policy:test --skipNxCache`
- `nx run effect-oxlint-policy:build --skipNxCache`
- `nx run attuned-discovery:typecheck --skipNxCache`
- `nx run attuned-discovery:test --skipNxCache`
- `nx run workspace:package-contracts-check --skipNxCache`
- `nx run workspace:framework-policy-check --skipNxCache`
- `nx run workspace:policy-fast --skipNxCache`
- `openspec validate standardize-effect-package-contracts --type change --strict`
- `git diff --check -- openspec/changes/standardize-effect-package-contracts framework packages docs oxlint tsconfig.base.json pnpm-lock.yaml attune.generator-shapes.json attune.source-bom.index.json`
- `nx run-many -t typecheck --all --skipNxCache`
- `nx run-many -t test --all --skipNxCache`

Not run:
- `nx run workspace:policy-proof-pressure`; this remains the heavy
  post-archive/release gate.

Contract status:
- `framework/protocol` is now the root package-contract/protocol DSL owner.
- `attune-architecture` remains an Nx project/bin identity but lives under
  `framework/architecture`.
- `effect-oxlint-policy` remains an Nx project id but lives under
  `framework/oxlint-policy` with package name
  `@attune/framework-oxlint-policy`.
- Product/proof/platform packages no longer include the architecture or oxlint
  policy substrate under `packages/`.

Residual migration debt:
- Source BOM/generator-shape remain compatibility views until the framework
  cache fully replaces them as review aids.
- Full `workspace:policy-proof-pressure` remains a heavy post-archive/release
  gate unless explicitly run.

Blocked by:
- None known for the focused relocation slices.

Next agent:
- Archive the OpenSpec change if desired, or schedule the heavy
  `workspace:policy-proof-pressure` release gate as a separate hardening issue.

Agent: static-dsl-extraction-agent
Wave: local coordinator wave after static source-id framework substrate
Ownership: framework/protocol source extraction APIs, focused protocol tests, handoff packet

Changed:
- Added TypeScript compiler-backed protocol source extraction in
  `framework/protocol/src/source/index.ts`.
- Added serializable Effect Schema-backed extraction shapes for source imports,
  extracted protocol declarations, declaration ranges, referenced identifiers,
  basic `typeText`, initializer text, and avoidable raw string diagnostics.
- Added `extractProtocolSourceSummary(...)` for lightweight parsing of fixture
  or package source files without building a full semantic analyzer.
- Declared `typescript` in `framework/protocol/package.json` because the public
  extractor imports the compiler API at runtime.
- Added temp-file Vitest coverage for exported DSL roots, import specifiers,
  source ranges, explicit operation IDs, basic type text, and raw string
  diagnostics where a source-backed reference exists.

Generated:
- No generated source files.

Validated:
- `nx run framework-protocol:typecheck`
- `nx run framework-protocol:test`
- `nx run framework-protocol:test --excludeTaskDependencies`

Not run:
- Full workspace checks.

Package contract status:
- `framework/protocol` now exposes a static DSL extraction surface that
  language-service and Nx consumers can serialize and consume.
- The extractor currently recognizes exported declarations initialized through
  known protocol DSL factories and custom factory names supplied by callers.

Residual migration debt:
- The extractor is intentionally shallow. It resolves declaration symbols,
  imports, ranges, identifiers, and basic type text, but it does not yet
  evaluate full package contracts, follow cross-file re-exports, or derive
  operation-to-view dataflow from arbitrary expressions.
- `pnpm-lock.yaml` was not updated because it is outside this agent's ownership
  boundary.

Blockers:
- None for this slice.

Next agent recommendations:
- Language-service/Nx materializer agents should consume
  `extractProtocolSourceSummary(...)` for diagnostics, quick info, code actions,
  and generated artifact ownership.
- A later package-contract discovery agent should decide whether to expand
  extraction across re-export barrels and real `src/attune.package.ts` programs.

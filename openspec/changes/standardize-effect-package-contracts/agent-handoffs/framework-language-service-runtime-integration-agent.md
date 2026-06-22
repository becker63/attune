# Framework Language Service Runtime Integration Agent

Changed:
- `framework/language-service/src/index.ts` now projects editor-agnostic diagnostics, quick info, code actions, and code lenses from `ProtocolDiagnosticsApi`, `ProtocolQueryApi`, and runtime projection helpers.
- Added source declaration range fixture helpers that map line/character declarations to offset ranges and attach them to runtime diagnostics.
- Added invalid protocol store payload display text, runtime summary/obligation quick info, missing-obligation and evidence code lenses, stale generated source lenses, and action filtering that prevents direct `source-edit` writes to generated files.
- `framework/language-service/test/framework-language-service.test.ts` now covers source range mapping, invalid-store-payload diagnostics, stale generated source repair, missing evidence repair, atom graph edge repair, type-guidance repair, query-backed quick info/code lenses, and generated-file write filtering.
- `framework/language-service/vitest.config.ts` aliases `@attune/framework-sqlite` for tests because the current dirty runtime root exports the SQLite adapter.

Generated files:
- None.

Validation:
- `nx run framework-language-service:typecheck` passed.
- `nx run framework-language-service:test` passed.

Package contract status:
- No package contracts were changed in this slice.
- Language-service behavior is now backed by framework runtime diagnostics/query/projection services rather than a local `diagnosticsFor` stub.

Residual migration debt:
- Runtime `ProtocolQuery.getDiagnosticsForFile` still anchors by descriptor source path, so richer generated-artifact-to-authored-source ownership ranges should come from future materialization metadata.
- Code actions currently expose deterministic action plans only; applying Nx generators remains an integration point for framework Nx/materializer agents.
- Runtime diagnostic interfaces should eventually make `range` a first-class TypeScript field to match the existing Schema shape.

Blockers:
- None for this slice.

Next-agent recommendations:
- Extend runtime/materialization metadata with generated artifact owner declarations so stale generated source diagnostics can point to the authored declaration and generated artifact simultaneously.
- Add framework Nx integration tests that consume these language-service action plans and verify they invoke the intended generator/check targets.

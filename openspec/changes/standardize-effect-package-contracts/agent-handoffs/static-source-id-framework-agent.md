Agent: static-source-id-framework-agent
Wave: local coordinator wave after framework foundation checkpoint
Ownership: framework/protocol source-reference APIs, focused protocol tests, OpenSpec task status
Changed:
- Added `framework/protocol/src/source/index.ts` with source declarations,
  source references, stable id derivation, explicit id overrides, source range
  metadata, generated artifact owner references, package view graph nodes,
  operation-to-view edge derivation, exact operation registry derivation, and
  avoidable string-reference diagnostics.
- Exported the source-reference surface from `@attune/framework-protocol`.
- Extended framework protocol tests for source-reference id derivation,
  serialized roundtrip, operation-to-view traversal, duplicate operation id
  rejection, and raw string diagnostics.
- Marked the completed 1B source-ID/dataflow tasks and package atom graph model
  task in `tasks.md`.
Generated:
- No generated source files.
Validated:
- `nx run framework-protocol:test`
- `nx run framework-protocol:typecheck`
Not run:
- Full workspace tests.
- TypeScript compiler/language-service extraction over real source programs.
Contract status:
- Framework protocol now has a source-reference substrate for mostly-deduced
  IDs and symbol-first authoring.
- `1B.2` and `1B.6` remain open because compiler-backed extraction and complete
  generated handler/property/evidence/type-guidance map generation still need
  deeper implementation.
Residual migration debt:
- Source declarations are represented by framework data structures today rather
  than resolved directly from TypeScript `Program` / language-service symbols.
- Operation registry generation is available as a protocol helper, but handler,
  property, evidence producer, type-guidance, and optional RPC descriptors still
  need framework Nx generation.
Blocked by:
- None for the source-reference substrate.
Next agent:
- Framework Nx materializer should consume source references for generated
  operation registries, stale generated source diagnostics, and code-action
  repair metadata.

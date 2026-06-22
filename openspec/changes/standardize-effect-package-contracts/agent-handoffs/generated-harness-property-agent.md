Changed:
- Added `framework/testing/src/package-harness.ts` with Schema-coded harness invocation/exit schemas, exact PackageTestLayer-backed handler maps, generated evidence producer maps, operation-specific harness entries, optional RPC descriptor integration, and a `checkPackageHarnessProperty` bridge for property runs.
- Extended `framework/testing` operation registry/evidence helpers with operation-tuple id derivation, exact generated map assertions, Schema-decoded evidence events, and exact evidence producer maps.
- Extended `framework/nx` materialization with a `package-harness` generated artifact/action and tests for generated harness protocol/client/evidence scaffolds.
- Updated `@attune/nx:package-contract` generated output to emit `PackageHarnessAccessors`, `PackageHarnessHandlers`, `PackageHarnessEvidenceProducers`, `PackageHarnessClient`, and harness-aware property evidence plan fields.
- Updated focused framework/testing, framework/nx, and attune-nx generator tests for Schema-coded harness invocation, PackageTestLayer public accessors, worker-compatible property evidence, and generated harness output.
- Marked OpenSpec tasks `1B.6`, `2.6`, `6.6`, and `6.8` complete.

Generated:
- New generated harness artifact kind: `package-harness` -> `src/generated/attune-package-harness.ts`.
- New package-contract generated symbols: `PackageHarnessAccessors`, `PackageHarnessHandlers`, `PackageHarnessEvidenceProducers`, `PackageHarnessClient`.
- The generated package harness imports `@attune/framework-testing`; the generator source must keep using `generatedFrameworkTestingImport()` fragments so framework policy does not see a direct product-package import boundary violation.
- Evidence and replay outputs remain runtime/local-cache concepts; no checked-in ProtocolDelta/report/evidence summary artifacts were added.

Validated:
- `nx run framework-testing:typecheck`
- `nx run framework-testing:test`
- `nx run framework-nx:typecheck`
- `nx run framework-nx:test`
- `nx run attune-nx:test -- --run test/package-contract-generator.test.ts test/generator-snapshots.test.ts`

Not run:
- `nx run workspace:policy-fast`
- `nx run workspace:package-contracts-check`
- Full `attune-nx:test`

Contract status:
- Generated harness clients invoke operation-specific handlers through Schema-backed payload/success/error decode/encode and PackageTestLayer public accessors.
- Handler, property, operation registry, and evidence producer maps now have exact operation-id coverage checks.
- Runtime Effect RPC remains optional/future; this slice consumes existing RPC descriptors without importing or requiring the runtime adapter.

Residual migration debt:
- Harness control operations are represented in generated protocol metadata, but package-specific reset/snapshot/observe/flush/replay/coverage implementations still need richer control handlers.
- Structured evidence is emitted as Schema-coded runtime events, but `6.10` remains open until events are recorded through the private framework runtime/store with full service id, run count, transform/filter, worker, and graph-coverage fields.
- Replay cache persistence and language-service/Nx diagnostic surfacing remain open under `6.11`.
- Existing packages were not regenerated in place; this slice updates the generator/runtime path and focused tests.

Blocked by:
- Nothing blocking this slice.
- Effect RPC runtime adapter remains intentionally blocked/future until the Effect 4 beta compatibility question is resolved.

Next agent:
- Wire harness evidence events into the private Protocol Runtime/Store and local cache for `6.10`.
- Add replay/counterexample cache persistence and diagnostic projection for `6.11`.
- Extend generated harness controls beyond metadata into reset/snapshot/observe/flush/replay/coverage control handlers where packages expose the needed observation hooks.

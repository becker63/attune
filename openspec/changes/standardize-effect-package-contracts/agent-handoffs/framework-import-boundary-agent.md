# Framework Import Boundary Agent Handoff

Agent: framework-import-boundary-agent
Wave: Phase 1A framework foundation
Ownership:
- `packages/attune-architecture-lint/src/framework-import-boundary.ts`
- `packages/attune-architecture-lint/test/framework-import-boundary.test.ts`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/framework-import-boundary-agent.md`

Changed:
- Added a pure `attune/framework-import-boundary` policy helper that extracts import usages from source text and classifies product-package imports under `packages/*`.
- Allowed product imports of `@attune/framework-protocol`.
- Allowed `@attune/framework-testing` only from product tests and generated evidence files.
- Rejected product imports of `@attune/framework-sqlite`, `@attune/framework-runtime/internal`, `@attune/framework-nx/internal`, `@attune/framework-language-service`, raw Drizzle table modules, and ProtocolStore internals.
- Skipped `framework/*` source files so framework internals can depend across framework projects without this product-boundary rule rejecting them.
- Added focused Vitest coverage for allowed and rejected fixtures plus stable diagnostic codes.

Generated:
- None.

Validated:
- `packages/attune-architecture-lint`: `./node_modules/.bin/vitest run test/framework-import-boundary.test.ts`
- `packages/attune-architecture-lint`: `./node_modules/.bin/tsc --noEmit --pretty false --target ES2023 --lib ES2023 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --types node,vitest/globals src/framework-import-boundary.ts test/framework-import-boundary.test.ts`

Not run:
- `nx run attune-architecture:typecheck` does not pass at the package level because existing `src/framework-no-report-policy.ts` errors remain (`TS2532: Object is possibly 'undefined'` on lines 67-94). The new framework import-boundary files pass the focused compiler check above.
- `nx run attune-architecture:test` was not run because the focused Vitest file passed and package-wide typecheck is currently blocked by unrelated source errors.
- OpenSpec task checkboxes were not updated because this agent's write scope excluded `tasks.md`.

Contract status:
- Policy surface is implemented as an isolated module and direct tests only.
- Barrel export and policy-runner wiring are intentionally left for the coordinator.

Residual migration debt:
- Integrate the module into `packages/attune-architecture-lint/src/index.ts` and any aggregate policy runner after coordinator review.
- Decide whether future project graph metadata should replace path heuristics for test/generated-evidence classification.
- Extend raw Drizzle exposure checks later if public API analysis needs to catch exported table/client types beyond import-source classification.

Blocked by:
- Package-wide `attune-architecture:typecheck` is blocked by unrelated `framework-no-report-policy.ts` strictness errors.

Next agent:
- Coordinator should wire exports and runner integration, then rerun `nx run attune-architecture:typecheck` after the no-report policy errors are resolved.

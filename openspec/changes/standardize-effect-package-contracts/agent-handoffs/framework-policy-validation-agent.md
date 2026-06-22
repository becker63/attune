# Framework Policy Validation Agent Handoff

Agent:
- framework-policy-validation-agent

Wave:
- Phase 1A Attune Framework Foundation validation slice for
  `standardize-effect-package-contracts`.

Ownership:
- Wrote only:
  - `packages/attune-architecture-lint/src/framework-policy-cli.ts`
  - `packages/attune-architecture-lint/test/framework-policy-cli.test.ts`
  - `openspec/changes/standardize-effect-package-contracts/agent-handoffs/framework-policy-validation-agent.md`
- Did not edit package contracts, generated ledgers, framework package source,
  OpenSpec tasks, Source BOM shards, or workspace target configuration.

Changed:
- Added an in-process `checkFrameworkPolicyWorkspace` test seam while keeping
  the existing CLI/Nx entry behavior for `workspace:framework-policy-check`.
- Kept the transition waivers explicit and narrow:
  `packages/attune-architecture-lint/src/framework-import-boundary.ts` and
  `packages/attuned-discovery/src/memory/schema.ts` importing
  `drizzle-orm/pg-core`.
- Added focused CLI tests proving product-package rejection for
  `@attune/framework-sqlite`, `@attune/framework-runtime/internal`,
  `@attune/framework-language-service`, raw Drizzle table imports, and
  ProtocolStore internals.
- Added focused CLI tests proving checked-in ProtocolDelta, obligation,
  evidence, architecture, and agent protocol report artifacts are rejected.
- Added focused CLI tests proving `.attune/cache` report-shaped output and
  legitimate generated source are accepted.
- Added a real repository scan assertion so the actual checkout must pass the
  framework policy CLI.

Generated:
- None.

Validated:
- `pnpm exec vitest run test/framework-policy-cli.test.ts`
  - Result: passed; 5 tests passed, including actual repository scan.
- `nx run attune-architecture:test`
  - Result: passed; 12 test files and 71 tests passed.
- `nx run workspace:framework-policy-check`
  - Result: passed.
- `nx run attune-architecture:typecheck`
  - Result: passed.

Not run:
- `nx run workspace:policy-fast`
- `nx run workspace:package-contracts-check`
- `nx run workspace:policy-proof-pressure`
- `openspec validate standardize-effect-package-contracts --strict`

Contract status:
- package:
  - No package implementation or package contract was edited.
- PackageContract:
  - No `src/attune.package.ts` source was edited.
- PackageLayer:
  - No package layer source was edited.
- PackageTestLayer:
  - No test layer source was edited.
- attune.package.typecheck:
  - No compile-only assertion module was edited.
- PackageTypeGuidance:
  - No type-guidance source was edited.
- package views:
  - No Reactivity key or atom graph source was edited.
- property evidence:
  - No generated property/evidence runtime source was edited.
- Nx targets:
  - Existing `workspace:framework-policy-check` target passed unchanged.

Residual migration debt:
- The framework policy CLI still has two migration waivers that should be
  removed when architecture policy self-tests and the current
  `attuned-discovery` Drizzle schema transition are migrated.
- The real repository scan currently takes about 25 seconds inside Vitest;
  later framework policy work may want project graph or tracked-file based
  narrowing before the check is composed into faster gates.
- Broader framework runtime checks from task 8.10, including descriptor decode,
  descriptor hash, generated artifact hash, internal ProtocolDelta diagnostics,
  local cache freshness, and waiver checks, remain separate slices.
- OpenSpec task checkboxes were not changed because this task's write scope was
  limited to the policy CLI, focused test, and handoff packet.

Blocked by:
- None.

Next agent:
- Phase 1A/framework-policy coordinator should decide whether this validation
  slice satisfies the import-boundary and no-checked-in-report portions of
  tasks 1A.8, 1A.9, 1A.10, 5.4, and 8.10, then update `tasks.md` from a
  coordination-owned slice if appropriate.
- A later policy-fast integration agent should compose the passing framework
  policy target into the broader fast gate once scan cost and remaining
  framework runtime diagnostics are acceptable.

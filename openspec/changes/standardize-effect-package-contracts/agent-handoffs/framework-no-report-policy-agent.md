Agent:
- framework-no-report-policy-agent

Wave:
- Phase 1A focused architecture-policy implementation for
  `standardize-effect-package-contracts`.

Ownership:
- Wrote only:
  - `packages/attune-architecture-lint/src/framework-no-report-policy.ts`
  - `packages/attune-architecture-lint/test/framework-no-report-policy.test.ts`
  - `openspec/changes/standardize-effect-package-contracts/agent-handoffs/framework-no-report-policy-agent.md`
- Did not edit package barrels, project configuration, OpenSpec tasks, runtime
  framework modules, MCP, generated ledgers, or checked-in reports.

Changed:
- Added a pure no-checked-in protocol report policy helper with stable rule id
  `attune/no-checked-in-protocol-report`.
- Added classification categories for ProtocolDelta reports, obligation
  reports, evidence summary reports, architecture summary/report artifacts, and
  Linear/GitHub/cloud-agent protocol report artifacts.
- Added path, JSON report type/key, and Markdown heading heuristics for
  report-like `.md`, `.mdx`, `.json`, `.jsonc`, and `.txt` files.
- Added conservative escapes for source-like files and local cache/runtime
  output so generated operation registries, property scaffolds, and framework
  source can mention diagnostics without being rejected.
- Added positive and negative Vitest fixtures for forbidden report artifacts,
  generated source-like artifacts, design prose, and gitignored cache output.

Generated:
- None.

Validated:
- `nx run attune-architecture:test -- test/framework-no-report-policy.test.ts`
  - Result: passed, 7 tests.
- `nx run attune-architecture:typecheck`
  - Result: passed.

Not run:
- `nx run attune-architecture:test` for the full package test suite; the task
  requested the focused Vitest test and this slice only added an isolated
  module/test.
- Workspace policy targets such as `nx run workspace:policy-fast`; not needed
  for this narrow unwired helper slice.

Contract status:
- PackageContract:
  - No package contract source changed.
- PackageLayer:
  - No layer source changed.
- PackageTestLayer:
  - No test layer source changed.
- attune.package.typecheck:
  - No generated typecheck module changed.
- PackageTypeGuidance:
  - No type-guidance source changed.
- Framework policy:
  - New helper is intentionally pure and unwired. Coordinator still owns
    `index.ts`, CLI/Nx integration, and final package-contract check wiring.

Residual migration debt:
- Wire the helper into the final architecture/package-contract policy surface.
- Feed it tracked committed files rather than ad hoc file arrays when the
  runtime/Nx check lands.
- Add repository-level fixtures once the coordinator decides which paths are
  scanned and which cache paths are excluded by the public check.
- Consider tightening or expanding report signatures after real migration
  artifacts appear, especially around legacy Source BOM and waiver-summary
  compatibility views.

Blocked by:
- No implementation blocker for this focused slice.
- Integration is intentionally blocked on coordinator-owned export and check
  wiring outside this agent's write scope.

Next agent:
- Coordinator/integration agent should export and invoke
  `checkFrameworkNoReportPolicy` from the focused diagnostic target without
  hand-editing report artifacts.
- Validation agent should run the full architecture package test target after
  integration and confirm no legitimate generated source is flagged.

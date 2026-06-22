# Agent Docs Framework Workflow Agent Handoff

Agent:
- agent-docs-framework-workflow-agent

Wave:
- Phase 8 docs/ratchet slice for
  `standardize-effect-package-contracts`.

Ownership:
- Wrote only:
  - `AGENTS.md`
  - `docs/platform/codex-cloud-environment.md`
  - `openspec/changes/standardize-effect-package-contracts/agent-handoffs/agent-docs-framework-workflow-agent.md`
- Did not edit source code, package configuration, generated ledgers,
  framework package source, or OpenSpec tasks.

Changed:
- Reframed the root agent guide around Attune Framework as the programming
  model: root `framework/` owns protocol internals, packages consume
  `@attune/framework-protocol` through `src/attune.package.ts`, and agents
  repair language-service/Nx diagnostics instead of raw runtime internals.
- Added the diagnostics-first package workflow: inspect language-service or Nx
  diagnostics, open the referenced package contract/generated boundary, use
  `@attune/nx`, implement inside generated `Effect.Service`, update Effect
  Schema metadata/laws/waivers/provenance, update package Reactivity/atom view
  graphs, and report remaining diagnostics.
- Updated cloud/local environment guidance so public validation examples stay
  on Nx-owned targets and focused diagnostics:
  `workspace:policy-fast`, `workspace:policy-proof-pressure`,
  `workspace:package-contracts-check`, project `typecheck`/`test`, and
  `@attune/nx` generators.
- Documented that framework evidence belongs in framework services, stdout/CI
  artifacts, or gitignored local cache such as `.attune/cache`, not checked-in
  ProtocolDelta, obligation, evidence, architecture, cloud-agent, or status
  reports.
- Clarified that Source BOM and generator-shape manifests are migration
  scaffolding or temporary compatibility views, not final semantic workflow
  surfaces.
- Clarified that MCP is not a core Attune Framework path; any future adapter
  should consume framework diagnostics/query services.

Generated:
- None.

Validated:
- `git diff --check -- AGENTS.md docs/platform/codex-cloud-environment.md openspec/changes/standardize-effect-package-contracts/agent-handoffs/agent-docs-framework-workflow-agent.md`
  - Result: passed for tracked docs diffs.
- `git diff --no-index --check /dev/null openspec/changes/standardize-effect-package-contracts/agent-handoffs/agent-docs-framework-workflow-agent.md`
  - Result: no whitespace errors in the new handoff file.
- `openspec validate standardize-effect-package-contracts --strict`
  - Result: passed; change is valid.

Not run:
- Package typechecks/tests, workspace policy targets, and package contract
  checks were not run because this slice only edited docs and a handoff packet.

Contract status:
- package:
  - No package implementation was edited.
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
  - No project or target configuration was edited.

Residual migration debt:
- `openspec/changes/standardize-effect-package-contracts/tasks.md` still has
  documentation tasks unchecked because this slice was restricted to docs and
  handoff ownership paths only.
- Generator docs/templates, full canonical package contract docs, detailed
  property evidence docs, and final ratchet docs remain separate task slices.
- The docs now describe the target diagnostics-first workflow; some referenced
  framework targets and language-service surfaces are still implementation
  work in the active OpenSpec change.

Blocked by:
- No blocker for this docs handoff slice.

Next agent:
- Docs/ratchet coordinator should decide whether these docs satisfy the
  narrow agent-facing portions of tasks 13.1, 13.2, 13.4, 13.9, and 15.11,
  then update `tasks.md` only from a broader OpenSpec coordination slice.
- Generator documentation agents should add the remaining detailed
  package-contract, atom graph, FastCheck evidence, and typed executor
  guidance in their owned docs/templates.

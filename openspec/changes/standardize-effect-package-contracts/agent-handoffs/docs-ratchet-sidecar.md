Agent: docs-ratchet-sidecar

Wave: Phase 8 docs/ratchet sidecar

Ownership:
- `AGENTS.md`
- `docs/**`
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/docs-ratchet-sidecar.md`

Changed:
- Updated `docs/attuned/Attune Discovery v0 Technical spec.md` so FoldKit DevTools/OpenAPI/MCP is documented as an optional inspection adapter over framework diagnostic/query projections, not the default or core Attune Framework workflow surface.
- Updated the same spec to name TypeScript language-service diagnostics and Nx output as the default agent inspection path.
- Renamed the spec's illustrative `DevToolsMcpNotes.md` generated-shape example to `DevToolsAdapterNotes.md`.
- Updated `docs/README.md` and `docs/joern-effect-fuzzer-run-report.md` to classify the checked-in Joern fuzzer run report as historical migration context rather than protocol source truth or package-contract evidence.

Generated:
- `openspec/changes/standardize-effect-package-contracts/agent-handoffs/docs-ratchet-sidecar.md`

Validated:
- `rg -n --glob 'AGENTS.md' --glob 'docs/**' 'workspace:policy-architecture|nx:run-commands'` returned no matches.
- `rg -n --glob 'AGENTS.md' --glob 'docs/**' 'FoldKit DevTools MCP as the free|default development-time agent inspection|FoldKit MCP agents are inspectors|through FoldKit MCP|FoldKit/FoldKit DevTools MCP as|DevToolsMcpNotes'` returned no stale MCP-default matches.
- `rg -n --glob 'AGENTS.md' --glob 'docs/**' 'Corepack|corepack|package-local scripts|package scripts|package\\.json scripts|pnpm (run|test|install|dlx)|npm (run|test|install)|yarn |npx '` returned only negative Corepack/package-manager guidance in `AGENTS.md` and `docs/platform/codex-cloud-environment.md`.
- `rg -n --glob 'AGENTS.md' --glob 'docs/**' 'checked-in .*reports|ProtocolDelta reports|obligation reports|evidence summaries|architecture summaries|cloud-agent summaries|generated status reports|Joern Effect Fuzzer Run Report|Historical migration note only|not protocol source truth|not package-contract evidence'` confirmed no-report guidance and the historical Joern run-report label.
- `openspec validate standardize-effect-package-contracts --strict`

Not run:
- Nx policy targets such as `nx run workspace:policy-fast`; this was a docs-only sidecar and OpenSpec/ripgrep covered the assigned posture check.

Contract status:
- Agent-facing docs already named the diagnostics-first Attune Framework workflow, Nx-owned public targets, Source BOM/generator-shape migration posture, and no checked-in protocol report posture before this sidecar.
- This sidecar removed active stale guidance that treated FoldKit DevTools MCP as the default development-time agent interface.
- Existing Corepack/package-manager mentions in `AGENTS.md` and cloud docs are negative guidance or dev-shell implementation detail, not normal workflow instructions.
- No active docs guidance was found for a separate stale architecture umbrella policy target or arbitrary project-local command executor as a public surface.

Residual migration debt:
- Final command-surface ratchet work remains outside this sidecar: package-local scripts, arbitrary shell target cleanup, typed executor migration, and root/framework target cleanup are owned by implementation/policy agents.
- Historical report-like docs still exist under `docs/`; this pass labeled the Joern fuzzer run report as migration context, but a later archival pass may decide whether to move or archive historical notes.
- OpenSpec tasks 15.10 and 15.11 remain unchecked because this sidecar was explicitly told not to edit `tasks.md`.

Blocked by:
- None for the docs sidecar.

Next agent:
- Final docs/policy validation agent should wire the documentation ratchet into the Nx-owned check once command-surface and report-file ratchets finish landing.

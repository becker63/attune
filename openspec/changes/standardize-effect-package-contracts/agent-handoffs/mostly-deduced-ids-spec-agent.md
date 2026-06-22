Agent:
- mostly-deduced-ids-spec-agent

Wave:
- Phase 1B: Static DSL And Mostly-Deduced IDs

Ownership:
- Documentation and OpenSpec refinement only.
- No runtime framework implementation.
- No package source migration.

Changed:
- Added `docs/attuned/Attune Framework Core Primitives.md`.
- Updated `docs/README.md` with the core primitives doc.
- Added mostly deduced ID decisions to `design.md`.
- Added symbol/reference-first authoring requirements.
- Added view-edge derivation requirements.
- Added static DSL extraction requirements to the protocol runtime and migration plan.
- Added string-reference ratchet work to the migration plan and tasks.

Generated:
- None.

Validated:
- `openspec validate standardize-effect-package-contracts --type change`
- `git diff --check -- docs openspec/changes/standardize-effect-package-contracts`
- Checked for a docs-specific lint/format target; none was available.

Not run:
- Heavy Nx package tests were intentionally not run because this is a docs/OpenSpec patch.

Contract status:
- Core primitives are defined.
- Mostly deduced IDs are part of the active spec.
- Authored semantic roots vs derived graph is documented.
- Stable string IDs remain serialized/cache/replay/diagnostic/external identities.
- MCP remains non-core.

Residual migration debt:
- Implement static DSL extraction in framework/protocol and framework/nx.
- Add symbol/object-reference DSL helpers.
- Derive stable IDs, source ranges, artifact ownership, obligations, and repair actions.
- Derive Reactivity key -> base atom -> derived atom -> package view atom edges.
- Add diagnostics for avoidable raw string cross-references.

Blocked by:
- None for this spec/docs refinement.

Next agent:
- static-dsl-extraction-agent
- symbol-reference-dsl-agent
- derived-id-materializer-agent
- view-edge-derivation-agent
- string-reference-ratchet-agent

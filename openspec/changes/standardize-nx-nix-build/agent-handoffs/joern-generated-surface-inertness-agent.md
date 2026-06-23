Agent: Codex local coordinator
Wave: standardize-nx-nix-build Joern generated-surface hardening
Ownership:
- `packages/joern-effect/test/generated-surface.test.ts`
- `openspec/changes/standardize-nx-nix-build/tasks.md`

Changed:
- Added a focused `joern-effect` test that scans checked-in generated public
  Joern SDK files under `src/pure/generated`.
- The guard rejects generated public surfaces that import Node runtime IO,
  import Joern runtime interpreters, spawn processes, read the filesystem,
  parse runtime JSON, run Effect programs during construction, inspect process
  state, perform network IO, or emit telemetry directly.
- Marked `standardize-nx-nix-build` task `5.8` complete.

Generated:
- None.

Validated:
- `nx run joern-effect:test --skipNxCache`

Not run:
- Joern-gated property target.
- Containerized Joern-gated property target.

Contract status:
- Generated public surfaces are now covered by a package-local test proving the
  descriptive/no-runtime-IO contract in the ordinary `joern-effect:test` target.

Residual migration debt:
- Remaining `standardize-nx-nix-build` tasks are `5.9`, `5.10`, `5.11`,
  `8.4`, and `8.5`.

Blocked by:
- Nothing for this slice.

Next agent:
- Use the adjacent audit results to decide whether `5.9`, `5.10`, or `5.11`
  can be closed with a small focused patch before attempting heavy Joern runtime
  validation.

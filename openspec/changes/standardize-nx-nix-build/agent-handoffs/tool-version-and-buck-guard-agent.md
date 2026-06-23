Agent: Codex local coordinator
Wave: standardize-nx-nix-build cleanup
Ownership:
- `workspace:tool-versions` Nx target
- active Buck/Buck2 workflow guard in `workspace:arch:scan`
- OpenSpec task status for `effect-alchemy-platform-lifecycle` and
  `standardize-nx-nix-build`

Changed:
- Added `scripts/architecture/tool-versions.mjs`, a cheap Nx-owned validation
  script that prints pinned tool versions from `nix/lib/versions.nix` and
  `package.json`, plus observed local CLI versions when available.
- Routed `architecture:check` / `toolId: "tool-versions"` through
  `@attune/nx:toolchain`.
- Added `workspace:tool-versions`.
- Extended `scripts/architecture/scan.mjs` to reject active Buck/Buck2 files,
  `buck-out`, or Buck references in active `package.json`/`project.json`/`nx.json`
  workflow configs outside historical `imports/**`.
- Added `docs/platform/nx-nix-workflow.md` with the public Nx/Nix workflow,
  Buck2 reintroduction rule, Nix directory layout, and Joern property modes.
- Marked `standardize-nx-nix-build` tasks `2.4`, `4.3`, `6.5`, `6.6`,
  `7.4`, `7.5`, and `7.6` complete.
- Marked `effect-alchemy-platform-lifecycle` task `1.3` complete after strict
  OpenSpec validation.

Generated:
- None. `packages/attune-nx/dist/**` was rebuilt locally so Nx could load the
  edited executor during validation, but dist output is not part of this patch.

Validated:
- `openspec validate effect-alchemy-platform-lifecycle --type change --strict`
- `openspec validate standardize-nx-nix-build --type change`
- `nx run attune-nx:build --skipNxCache`
- `nx run workspace:tool-versions --skipNxCache`
- `nx run attune-nx:test --skipNxCache`
- `nx run workspace:arch:scan --skipNxCache`
- `git diff --check`

Not run:
- Full `workspace:policy-fast` after this exact slice.
- Joern-gated property targets and containerized property runtime.

Contract status:
- `effect-alchemy-platform-lifecycle` is now task-complete.
- `standardize-nx-nix-build` advanced from 52/65 to 59/65 tasks complete.

Residual migration debt:
- `workspace:tool-versions` currently reports the local shell's observed Node as
  v24 while the pinned Nix toolchain says Node 22; that is useful drift signal,
  not a failure, because agents may run the command outside the Nix shell.
- `standardize-nx-nix-build` still has Joern generated-surface and heavy
  validation tasks open.

Blocked by:
- Nothing for this slice.

Next agent:
- Prefer a Joern-focused slice: either generated public surface inertness
  checks (`5.8`) or documenting/validating property target modes (`7.6`,
  `8.4`, `8.5`) depending on available Joern/container runtime.

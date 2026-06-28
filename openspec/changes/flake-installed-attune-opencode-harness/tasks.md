## 1. Inventory And Planning

- [x] 1.1 Inspect `flake.nix`, `nix/lib/*`, `nix/toolchains/*`, and existing package/app output patterns.
- [x] 1.2 Inspect `packages/tend/opencode` package metadata, Nx targets, tests, fixtures, and current CLI/bin state.
- [x] 1.3 Inspect Tend core, token-audit, long-job, policies, and reporting packages for reusable schemas and event shapes.
- [x] 1.4 Create proposal, design, specs, and tasks for `flake-installed-attune-opencode-harness`.

## 2. Tend OpenCode CLI

- [x] 2.1 Add Effect Schema-backed fingerprint, doctor, decode, summarize, observe, and harness-test contracts.
- [x] 2.2 Add `packages/tend/opencode/src/cli.ts` and package binary metadata for `tend-opencode`.
- [x] 2.3 Implement `fingerprint --format json` and `doctor --format json` with parseable JSON stdout.
- [x] 2.4 Implement `decode --file <path> --format json` and keep existing fixture decoding tests intact.
- [x] 2.5 Implement `summarize --file <path> --format markdown|json` without raw prompt/conversation leakage.
- [x] 2.6 Implement `observe -- <command...>` with bounded stdout/stderr summaries, inferred Nx target/recipe fields, and stable observation identity.

## 3. Attune OpenCode Harness

- [x] 3.1 Add an `attune-opencode` launcher entrypoint that exposes fingerprint, doctor, and run-harness-test commands.
- [x] 3.2 Ensure the launcher reports the flake-provided runtime path and does not depend on a global `opencode`.
- [x] 3.3 Implement stable harness/plugin fingerprinting with Tend capability flags.
- [x] 3.4 Implement a deterministic offline harness self-test that proves plugin loading, session decoding, command observation, and no raw trace leakage.
- [x] 3.5 Add doctor checks for `trellis-ls --help` and `trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json --format json`.

## 4. Flake Packaging

- [x] 4.1 Add a reproducible Nix package for `tend-opencode`.
- [x] 4.2 Add flake `packages.<system>.tend-opencode` and `apps.<system>.tend-opencode`.
- [x] 4.3 Add flake `packages.<system>.attune-opencode` and `apps.<system>.attune-opencode`.
- [x] 4.4 Resolve any pnpm/Nix dependency hash changes and document the final command used when applicable.

Nix dependency hash resolved by running `nix build .#tend-opencode --no-link`
with `final.lib.fakeHash`; the fixed-output derivation reported
`sha256-eAKzJmbCZAXEpyf/qrvslWNd6jzszAv5E3tgbvNtHls=`, which is now checked
into `flake.nix`.

## 5. Tests And Docs

- [x] 5.1 Add tests for CLI fingerprint schema, doctor schema, decode fixture command, summarize command, observe synthetic command, harness test output, flake-installed expectation where feasible, and no raw private trace leakage.
- [x] 5.2 Update docs with `attune-opencode` fingerprint, doctor, harness-test, and `tend-opencode observe` usage.
- [x] 5.3 Document that future Codex trace measurement must use `attune-opencode`, not global `opencode`.

## 6. Validation

- [x] 6.1 Run `pnpm exec nx run tend-opencode:typecheck --output-style=static`.
- [x] 6.2 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 6.3 Run `pnpm exec nx run tend-core:test --output-style=static`.
- [x] 6.4 Run `pnpm exec nx run tend-token-audit:test --output-style=static`.
- [x] 6.5 Run `pnpm exec nx run workspace:policy-fast --output-style=static`.
- [x] 6.6 Run `nix run .#tend-opencode -- fingerprint --format json`.
- [x] 6.7 Run `nix run .#tend-opencode -- doctor --format json`.
- [x] 6.8 Run `nix run .#attune-opencode -- fingerprint --format json`.
- [x] 6.9 Run `nix run .#attune-opencode -- doctor --format json`.
- [x] 6.10 Run `nix run .#attune-opencode -- run-harness-test --format json`.
- [x] 6.11 Run `openspec validate flake-installed-attune-opencode-harness --strict`.

## 7. Full Upstream OpenCode Runtime

- [x] 7.1 Inspect current upstream OpenCode distribution metadata and command/slash-command docs.
- [x] 7.2 Add a pinned upstream OpenCode Nix package for supported flake systems.
- [x] 7.3 Update `attune-opencode` to delegate normal arguments to the pinned upstream OpenCode binary.
- [x] 7.4 Extend fingerprint contracts with wrapper path, upstream OpenCode path/version, runtime kind, plugin path, config-content path, and slash command path.
- [x] 7.5 Ship an OpenCode `attune-fingerprint` custom slash command through wrapper-controlled config content.
- [x] 7.6 Extend doctor and harness self-test to verify upstream OpenCode availability and slash command installation.
- [x] 7.7 Update tests for upstream runtime fingerprinting, delegation, and slash command content.
- [x] 7.8 Update docs to describe the real upstream OpenCode runtime and `/attune-fingerprint`.
- [x] 7.9 Add a real Attune/Tend OpenCode file plugin and deterministic no-model self-test proving upstream OpenCode initializes it.

## 8. Full Runtime Validation

- [x] 8.1 Run `pnpm exec nx run tend-opencode:typecheck --output-style=static`.
- [x] 8.2 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 8.3 Run `nix run .#attune-opencode -- fingerprint --format json`.
- [x] 8.4 Run `nix run .#attune-opencode -- --help`.
- [x] 8.5 Run `nix run .#attune-opencode -- run-harness-test --format json`.
- [x] 8.6 Run `openspec validate flake-installed-attune-opencode-harness --strict`.

## 9. First-Class Attune OpenCode Plugin Suite

- [x] 9.1 Split the Attune OpenCode surfaces into first-class file plugins for
  Tend observation, Magic Context, OpenRTK, token audit, long-job observation,
  and Trellis LS.
- [x] 9.2 Extend fingerprint and harness-test contracts with `plugins[]`,
  `runtime.pluginPaths`, Magic Context capability, OpenRTK capability, and
  `actualPlugins[]` probe results.
- [x] 9.3 Inject every Attune plugin file URL through flake-generated
  `OPENCODE_CONFIG_CONTENT` and expose every plugin path through the dev shell.
- [x] 9.4 Extend the deterministic no-model harness self-test to require
  upstream OpenCode to initialize every Attune plugin package.
- [x] 9.5 Update docs and specs to state that measurement requires the full
  Attune plugin suite, not only the generic Tend plugin.
- [x] 9.6 Add package-backed server/TUI plugin exports so delegated OpenCode
  receives the same Attune plugin suite through `opencode.json` and `tui.json`.
- [x] 9.7 Add a deterministic no-model hook exercise that imports every Attune
  server plugin package and verifies its OpenCode hook marker.
- [x] 9.8 Run `pnpm exec nx run tend-opencode:typecheck --output-style=static`.
- [x] 9.9 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 9.10 Run `nix run .#attune-opencode -- fingerprint --format json`.
- [x] 9.11 Run `nix run .#attune-opencode -- debug info` and verify the Attune
  plugin package URLs are listed.
- [x] 9.12 Run `nix run .#attune-opencode -- run-harness-test --format json`.
- [x] 9.13 Run `nix develop -c attune-opencode debug info` and verify the dev
  shell exposes the same Attune plugin package URLs.
- [x] 9.14 Run `nix develop -c attune-opencode run-harness-test --format json`.
- [x] 9.15 Run `openspec validate flake-installed-attune-opencode-harness --strict`.

## 10. Full-Permission Delegated OpenCode

- [x] 10.1 Set delegated `attune-opencode` upstream launches to include
  `OPENCODE_CONFIG_CONTENT='{"permission":"allow"}'`.
- [x] 10.2 Add a unit test proving delegated upstream env keeps the generated
  Attune plugin config and enables full permissions.
- [x] 10.3 Run `pnpm exec nx run tend-opencode:typecheck --output-style=static`.
- [x] 10.4 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 10.5 Run `nix develop -c attune-opencode run-harness-test --format json`.
- [x] 10.6 Run `nix run .#attune-opencode -- run-harness-test --format json`.
- [x] 10.7 Run `openspec validate flake-installed-attune-opencode-harness --strict`.

## 11. Tend Entrypoint And OpenSpec Tools

- [x] 11.1 Rename the OpenCode harness entrypoint to `tend-opencode`.
- [x] 11.2 Move the Tend-side decode/summarize/observe CLI to
  `tend-opencode-tools`.
- [x] 11.3 Install OpenSpec slash commands into the generated OpenCode config.
- [x] 11.4 Install the repo OpenSpec skills into the generated OpenCode
  `skills.paths`.
- [x] 11.5 Ensure delegated `tend-opencode` runs keep full permissions and the
  Attune plugin config.
- [x] 11.6 Run `pnpm exec nx run tend-opencode:typecheck --output-style=static`.
- [x] 11.7 Run `pnpm exec nx run tend-opencode:test --output-style=static`.
- [x] 11.8 Run `nix run .#tend-opencode -- fingerprint --format json`.
- [x] 11.9 Run `nix run .#tend-opencode -- run-harness-test --format json`.
- [x] 11.10 Run `nix run .#tend-opencode-tools -- observe --format json -- node -e "console.log('ok')"`.
- [x] 11.11 Run `nix develop -c bash -lc 'command -v tend-opencode && command -v tend-opencode-tools && ! command -v attune-opencode'`.
- [x] 11.12 Run `nix run .#tend-opencode -- debug skill` and verify
  `openspec-*` skills resolve from the flake-installed config directory.
- [x] 11.13 Run `openspec validate flake-installed-attune-opencode-harness --strict`.

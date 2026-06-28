# Attune OpenCode Harness

Attune ships its first OpenCode/Tend harness through the repository flake. The
`tend-opencode` launcher wraps a pinned upstream OpenCode binary and injects
the Attune/Tend plugin and harness configuration from the Nix store. Use this
flake-installed launcher for any future measurement work so the run can prove it
used Attune's Tend plugin instead of a global `opencode` binary.

The default `nix develop` shell includes the wrapped `tend-opencode` harness
and `tend-opencode-tools` utility CLI on PATH with the plugin and fingerprint
config already installed.

The wrapper installs these Attune package-backed plugins into generated
OpenCode `opencode.json` and `tui.json` config:

- `@attune/tend-opencode`
- `@attune/magic-context-opencode`
- `@attune/openrtk-opencode`
- `@attune/tend-token-audit-opencode`
- `@attune/tend-long-job-opencode`
- `@attune/trellis-ls-opencode`

OpenCode Settings is not the harness proof. Settings is a TUI/plugin-manager
view, while the runtime-critical contract is that the server plugin exports are
imported and their hooks run. Use the harness self-test below when you need to
prove the plugins are active.

## Fingerprint

```bash
nix run .#tend-opencode -- fingerprint --format json
```

The fingerprint reports the harness name, plugin suite name/version/loading
status, flake source path, git identity when available, wrapper path, pinned
upstream OpenCode path/version, OpenCode config directory, config-content path,
slash command path, plugin package paths, server plugin file paths, and Tend
capabilities. Future measurement must refuse to continue unless the plugin
suite includes
`@attune/magic-context-opencode`, `@attune/openrtk-opencode`, and
`@attune/tend-opencode` with `loaded: true`, the runtime is flake-provided, and
the runtime kind is `upstream-opencode`.

Normal OpenCode arguments delegate to the pinned upstream binary:

```bash
nix run .#tend-opencode -- --help
```

Delegated upstream OpenCode runs are intentionally full-permission in the repo
harness. The wrapper sets:

```bash
OPENCODE_CONFIG_CONTENT='{"permission":"allow"}'
```

while keeping `OPENCODE_CONFIG` pointed at the generated Attune plugin config.
This is the same behavior in `nix run .#tend-opencode -- ...` and in
`nix develop` when running `tend-opencode`.

Attune-specific harness commands are handled by the wrapper before delegation.
For wrapper help, run:

```bash
nix run .#tend-opencode -- tend-help
```

## Harness Self-Test

```bash
nix run .#tend-opencode -- run-harness-test --format json
```

The self-test is deterministic and local. It checks that the flake-installed
binary is being used, the Tend plugin is loaded, a synthetic OpenCode-like
session decodes into Tend events/receipts/observations, and a synthetic command
observation can be produced without raw prompt or conversation text. It also
checks that the pinned upstream OpenCode binary answers `--help` and that the
configured `/attune-fingerprint` slash command is installed.

The self-test also runs upstream OpenCode `debug info` in an isolated temporary
HOME with generated OpenCode `opencode.json` and `tui.json` files pointing at
the Nix-store Attune plugin packages. That no-model probe must report
`actualPlugin.loaded: true`, `actualPlugin.skipped: false`, and one loaded
`actualPlugins[]` entry for each Attune plugin package, proving upstream
OpenCode imported and initialized Magic Context, OpenRTK, Tend observation,
token audit, long-job, and Trellis LS plugins.

The self-test then runs a deterministic hook exercise without a model. It
imports each package's server export, invokes the configured OpenCode hook with
synthetic input/output objects, and requires `pluginHookExercise.passed: true`.
The expected markers are:

- `@attune/tend-opencode`: `tool.execute.before` sets
  `metadata.attuneTendPlugin`
- `@attune/magic-context-opencode`: `tool.execute.before` sets
  `metadata.attuneMagicContext`
- `@attune/openrtk-opencode`: `tool.execute.after` sets
  `metadata.attuneOpenRtk`
- `@attune/tend-token-audit-opencode`: `chat.params` sets
  `metadata.attuneTokenAudit`
- `@attune/tend-long-job-opencode`: `tool.execute.before` sets
  `metadata.attuneLongJobObservation`
- `@attune/trellis-ls-opencode`: `shell.env` sets
  `env.ATTUNE_TRELLIS_LS_PLUGIN`

To inspect the plugin list exactly as OpenCode sees it:

```bash
nix run .#tend-opencode -- debug info
```

## OpenSpec Tools

The harness installs the repo OpenSpec tools into OpenCode as slash commands
and skills. The generated config exposes these commands:

- `/openspec-propose`
- `/openspec-apply`
- `/openspec-explore`
- `/openspec-archive`
- `/openspec-sync-specs`
- `/openspec-status`
- `/openspec-validate`

It also adds the OpenSpec skill directory to `skills.paths` so OpenCode can
load the repo's `openspec-*` skill files. The harness self-test includes an
`openspec-tools-installed` check.

## OpenCode Slash Command

The flake installs an OpenCode custom slash command file at:

```text
$OPENCODE_CONFIG_DIR/commands/attune-fingerprint.md
```

The wrapper injects equivalent config content alongside the Attune plugin
packages. Inside
OpenCode, use:

```text
/attune-fingerprint
```

The slash command runs `tend-opencode fingerprint --format json` from the
wrapper-controlled environment, so the fingerprint is produced by the same
flake-installed harness that launched OpenCode.

## Doctor

```bash
nix run .#tend-opencode -- doctor --format json
nix run .#tend-opencode-tools -- doctor --format json
```

Doctor output includes plugin status plus `trellis-ls --help` and
`trellis-ls diagnostics --project packages/trellis/language-service/tsconfig.json
--format json` checks. If the Trellis diagnostics command is unavailable, the
JSON result records the precise reason.

## Tend Command Observation

```bash
nix run .#tend-opencode-tools -- observe --format json -- node -e "console.log('ok')"
```

`observe` runs the command and emits a bounded Tend command observation summary:
command, cwd, timestamps, duration, exit code, stdout/stderr summaries, inferred
Nx target/recipe when available, and observation ID. It does not store full raw
command output by default and redacts secret-shaped values.

## Measurement Preflight

Later Codex trace measurement must begin with:

```bash
nix run .#tend-opencode -- fingerprint --format json
nix run .#tend-opencode -- run-harness-test --format json
```

Do not measure through a global `opencode`. The measurement agent must stop if
the fingerprint and harness self-test do not show the Attune plugin suite
loaded through the flake-installed `tend-opencode` runtime.

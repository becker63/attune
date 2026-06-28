## Context

The repository already has a small Tend/OpenCode package that decodes an
OpenCode-like session fixture into Tend events, recipe receipts, Magic Context,
and OpenRTK observations. Adjacent Tend packages provide token audit, long-job,
policy, and report primitives. The flake currently exposes wrapped tools such
as `pi`, `joern`, `openSpec`, and app outputs, but it does not expose
`tend-opencode` or an Attune-owned OpenCode harness.

The first completed slice proved provenance with a deterministic wrapper. The
goal is now stricter: the repository flake must install a pinned upstream
OpenCode runtime and wrap normal OpenCode execution while still proving that
the Attune/Tend plugin and fingerprint command are present. Future measurement
must be able to prove that the agent is using the repo's flake-installed
launcher with the Attune/Tend plugin loaded, and that OpenCode itself can see
the Attune fingerprint command.

## Goals / Non-Goals

**Goals:**

- Provide `nix run .#tend-opencode-tools -- ...` as the Tend-side CLI for OpenCode
  session decoding, summarizing, command observation, fingerprinting, and
  doctor checks.
- Provide `nix run .#tend-opencode -- ...` as the custom launcher/harness
  that proves the Attune/Tend plugin surface is loaded and delegates normal
  OpenCode invocations to a pinned upstream runtime.
- Provide a flake-installed upstream OpenCode binary path in the fingerprint.
- Ship an OpenCode custom slash command for Attune fingerprinting through the
  wrapper-controlled OpenCode config content.
- Ship real Attune OpenCode file plugins for Tend observation, Magic Context,
  OpenRTK, token audit, long-job observation, and Trellis LS, and prove
  upstream OpenCode can import and initialize them without calling a model.
- Keep JSON stdout parseable and free of log interleaving.
- Use Effect Schema-backed input and output contracts for command results.
- Redact or summarize command/session output and avoid raw prompt or
  conversation text in fixtures.
- Discover the workspace/flake `trellis-ls` and report precise availability in
  doctor output.

**Non-Goals:**

- Do not run the Codex trace measurement.
- Do not depend on a globally installed `opencode`.
- Do not call external models or network services.
- Do not require a live database.
- Do not add a second durable ledger.
- Do not replace the root `AGENTS.md` or start unrelated recipe migration work.

## Decisions

### Wrap A Pinned Upstream OpenCode Runtime

`tend-opencode` exposes Attune-owned harness commands (`fingerprint`,
`doctor`, `run-harness-test`) and delegates every other invocation to a pinned
upstream OpenCode binary from Nix. The upstream runtime is packaged from the
current OpenCode platform npm packages. On Linux, the vendor executable remains
unchanged and is launched through a small Nix wrapper that invokes the Nix
dynamic linker. The fingerprint reports both the wrapper path and the resolved
upstream OpenCode path.

Delegated upstream runs are full-permission repo harness executions. The
launcher sets `OPENCODE_CONFIG` to the generated Attune plugin config and sets
`OPENCODE_CONFIG_CONTENT` to `{"permission":"allow"}` so upstream OpenCode runs
with the requested full permission policy while still loading the Attune plugin
suite.

Alternatives considered:

- Depend on global `opencode`. Rejected because future measurement must prove
  the binary came from this flake.
- Keep the deterministic harness as the final runtime. Rejected because the
  requested end state is a real flake-installed OpenCode runtime.

### Separate Launcher From Tend CLI

`tend-opencode` is the OpenCode-facing harness. `tend-opencode-tools` is the
Tend-side CLI for decoding, observing, summarizing, doctor checks, and tests.
The launcher delegates plugin-facing work to package code rather than
duplicating Tend logic in shell wrappers. The previous harness name was
retired so the command users enter in `nix develop` is the Tend-owned OpenCode
runtime itself.

### Fingerprint Is The Stable Contract

The fingerprint includes schema version, harness name/version, plugin
name/version/loading status, repo or flake source identity, git commit/dirty
state when available, enabled Tend capabilities, resolved runtime path, and a
boolean stating whether the runtime was flake-provided. For `tend-opencode`,
the runtime path is the pinned upstream OpenCode binary while the wrapper path
is recorded separately.

### Package Plugins And Slash Command Embed The Fingerprint

OpenCode supports plugins from config plus custom command configuration. The
flake package ships package-shaped plugin exports under
`plugin-packages/@attune/*`, raw server hook files under `plugins/*.js`,
`commands/*.md`, copied OpenSpec skills under `skills/openspec-*`, and
generated OpenCode config files. The launcher prepares wrapper-controlled
`opencode.json` and `tui.json` files for delegated OpenCode invocations, so
OpenCode sees the Attune plugin suite, `/attune-fingerprint`, and the
`/openspec-*` command set without requiring a global `opencode` binary or
mutating the user's home directory.

The plugin suite is:

- `@attune/tend-opencode`
- `@attune/magic-context-opencode`
- `@attune/openrtk-opencode`
- `@attune/tend-token-audit-opencode`
- `@attune/tend-long-job-opencode`
- `@attune/trellis-ls-opencode`

The command uses OpenCode's shell-output prompt syntax to inject
`tend-opencode fingerprint --format json` into the command body, making
`/attune-fingerprint` the OpenCode-visible fingerprint command without
mutating the user's home directory or checkout.

The OpenSpec command set includes `/openspec-propose`, `/openspec-apply`,
`/openspec-explore`, `/openspec-archive`, `/openspec-sync-specs`,
`/openspec-status`, and `/openspec-validate`. The generated config also sets
`skills.paths` to the flake-installed OpenSpec skills directory.

The self-test runs upstream OpenCode `debug info` with a temporary OpenCode
config home and the flake plugin package paths supplied through generated
`opencode.json` and `tui.json` files. Each server plugin writes a bounded probe
file when initialized. This proves actual upstream plugin loading without
external model calls, network dependency installation, or raw
prompt/conversation text.

Because Settings visibility is a TUI/plugin-manager concern rather than the
server hook contract, the self-test also imports every Attune package's server
entrypoint directly and invokes the declared hook with synthetic OpenCode input
and output objects. The harness only passes when every plugin mutates the
expected synthetic output marker.

### Command Observation Stores Summaries Only

`tend-opencode-tools observe -- <command...>` records command, cwd, start/end time,
duration, exit code, inferred Nx target/recipe where possible, and bounded
stdout/stderr summaries. It does not store full raw output by default.

### Flake Packaging Uses Repo-Pinned Node Dependencies

The flake package should use the repository source and pnpm lockfile through
Nix packaging. Runtime wrappers should execute the package CLI from the Nix
store with Nix-provided Node, not global npm binaries.

## Risks / Trade-offs

- Upstream OpenCode provider/model execution may require credentials in real
  sessions. Mitigation: validation uses `--help`, fingerprint, doctor, and
  self-test paths only, so tests do not call models.
- The OpenCode slash command is prompt-based rather than a side-effect-only
  command. Mitigation: it embeds the JSON fingerprint through documented shell
  output syntax and the self-test verifies that the command file/config content
  is installed.
- `trellis-ls diagnostics` may be unavailable or too heavy in some local
  contexts. Mitigation: doctor output records the exact command, success, and
  precise failure reason without failing unrelated harness checks.
- Nix dependency hashes can drift when package metadata changes. Mitigation:
  derive and record the final hash before marking flake tasks complete.

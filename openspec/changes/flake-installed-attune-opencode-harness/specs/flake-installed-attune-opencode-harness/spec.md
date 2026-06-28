## ADDED Requirements

### Requirement: Tend OpenCode tools CLI is installable through the flake
The system SHALL expose `tend-opencode-tools` as both a flake package and a
flake app for each supported system.

#### Scenario: Tend CLI fingerprint runs from flake
- **WHEN** `nix run .#tend-opencode-tools -- fingerprint --format json` is run
- **THEN** stdout is one parseable JSON document
- **AND** the document identifies the `@attune/tend-opencode` plugin package.

#### Scenario: Tend CLI doctor runs from flake
- **WHEN** `nix run .#tend-opencode-tools -- doctor --format json` is run
- **THEN** stdout is one parseable JSON document
- **AND** the document reports package, workspace, and `trellis-ls`
  availability checks.

### Requirement: Attune OpenCode harness is installable through the flake
The system SHALL expose `tend-opencode` as both a flake package and a flake
app for each supported system, wrapping a pinned upstream OpenCode runtime.

#### Scenario: Harness fingerprint proves plugin loading
- **WHEN** `nix run .#tend-opencode -- fingerprint --format json` is run
- **THEN** stdout is one parseable JSON document
- **AND** the document identifies harness `tend-opencode`
- **AND** it reports plugin `@attune/tend-opencode` with `loaded: true`
- **AND** it reports first-class plugin entries for Magic Context and OpenRTK
  with `loaded: true`
- **AND** it reports the flake-provided Attune plugin package paths
- **AND** it reports the flake-provided Attune server plugin file paths
- **AND** it reports the pinned upstream OpenCode runtime path
- **AND** it reports whether the runtime path is flake-provided.

#### Scenario: Harness does not rely on global OpenCode
- **WHEN** the harness fingerprint is produced
- **THEN** the resolved runtime path is the flake-provided pinned upstream
  OpenCode binary
- **AND** the output reports `runtimeKind: "upstream-opencode"`.

#### Scenario: Normal OpenCode arguments delegate upstream
- **WHEN** `nix run .#tend-opencode -- --help` is run
- **THEN** the command executes the pinned upstream OpenCode binary
- **AND** it does not dispatch to a globally installed `opencode`.

#### Scenario: Delegated OpenCode runs with full permissions
- **WHEN** `tend-opencode` delegates non-harness arguments to upstream
  OpenCode
- **THEN** the delegated environment includes
  `OPENCODE_CONFIG_CONTENT='{"permission":"allow"}'`
- **AND** the delegated environment keeps `OPENCODE_CONFIG` pointed at the
  generated Attune plugin configuration.

### Requirement: Fingerprint includes stable harness provenance
The system SHALL emit a stable fingerprint schema containing schema version,
harness name/version, plugin name/version/loading status, repo or flake source
identity when available, git commit or dirty state when available, enabled Tend
capabilities, resolved runtime path, wrapper path when applicable, upstream
OpenCode version when available, plugin paths when available,
config-content path when available, and flake-provided status.

#### Scenario: Fingerprint schema decodes
- **WHEN** Tend/OpenCode tests decode fingerprint output
- **THEN** the output conforms to an Effect Schema-backed fingerprint contract.

### Requirement: Harness self-test is deterministic and private
`tend-opencode run-harness-test --format json` SHALL run a safe local test
that proves flake binary usage, plugin loading, synthetic OpenCode-like session
decoding, synthetic command observation, upstream OpenCode availability,
actual upstream Attune plugin-suite initialization, fingerprint slash command
installation, deterministic server hook execution, and absence of raw private
trace text.

#### Scenario: Harness self-test runs offline
- **WHEN** `nix run .#tend-opencode -- run-harness-test --format json` is run
- **THEN** it does not call external models
- **AND** it does not require network access
- **AND** it does not require live Postgres.

#### Scenario: Harness self-test produces Tend observations
- **WHEN** the self-test succeeds
- **THEN** the JSON output includes decoded Tend event, receipt, and
  observation counts
- **AND** it includes a synthetic command observation summary
- **AND** it proves the upstream OpenCode binary responds to a no-model command
- **AND** it proves upstream OpenCode initialized each flake-provided Attune
  plugin package
- **AND** it reports `pluginHookExercise.passed: true`
- **AND** it proves each Attune plugin hook mutates a synthetic OpenCode output
  marker
- **AND** it proves the Attune fingerprint slash command file is installed
- **AND** it does not include raw prompt or conversation text.

### Requirement: Attune fingerprint is embedded as an OpenCode slash command
The flake-installed runtime SHALL expose a custom OpenCode command named
`/attune-fingerprint` from wrapper-controlled OpenCode config content.

#### Scenario: Slash command file is shipped
- **WHEN** `tend-opencode fingerprint --format json` or
  `run-harness-test --format json` is run
- **THEN** the output includes the installed slash command path
- **AND** the output includes the generated config-content path
- **AND** the path is under the flake-provided OpenCode config directory.

#### Scenario: Slash command invokes fingerprint
- **WHEN** the installed `attune-fingerprint.md` command is inspected
- **THEN** it uses OpenCode command shell-output syntax to run
  `tend-opencode fingerprint --format json`
- **AND** it does not include raw prompt or conversation text.

### Requirement: OpenSpec tools are installed into OpenCode
The flake-installed runtime SHALL expose OpenSpec commands and skills through
the generated OpenCode config.

#### Scenario: OpenSpec commands and skills are configured
- **WHEN** `nix run .#tend-opencode -- run-harness-test --format json` is run
- **THEN** the JSON output includes a passed `openspec-tools-installed` check
- **AND** the generated OpenCode config includes `/openspec-propose`,
  `/openspec-apply`, `/openspec-explore`, `/openspec-archive`,
  `/openspec-sync-specs`, `/openspec-status`, and `/openspec-validate`
- **AND** the generated OpenCode config includes a `skills.paths` entry for the
  flake-installed OpenSpec skill directory.

### Requirement: Attune surfaces are real upstream OpenCode plugins
The flake-installed runtime SHALL ship Attune OpenCode package plugins for Tend
observation, Magic Context, OpenRTK, token audit, long-job observation, and
Trellis LS, and configure delegated upstream OpenCode invocations so each
plugin is visible to OpenCode.

#### Scenario: Self-test proves upstream plugin-suite initialization
- **WHEN** `nix run .#tend-opencode -- run-harness-test --format json` is run
- **THEN** the JSON output reports `actualPlugin.loaded: true`
- **AND** it reports `actualPlugin.skipped: false`
- **AND** it reports loaded `actualPlugins[]` entries for
  `@attune/magic-context-opencode`, `@attune/openrtk-opencode`,
  `@attune/tend-opencode`, `@attune/tend-token-audit-opencode`,
  `@attune/tend-long-job-opencode`, and `@attune/trellis-ls-opencode`
- **AND** it reports each plugin package path under the flake-provided harness
  store path
- **AND** the probe reports no raw prompt or conversation text.

#### Scenario: Self-test proves Attune hooks run
- **WHEN** `nix run .#tend-opencode -- run-harness-test --format json` is run
- **THEN** the JSON output reports `pluginHookExercise.passed: true`
- **AND** it includes passed hook entries for `tool.execute.before`,
  `tool.execute.after`, `chat.params`, and `shell.env`
- **AND** it includes observed Attune markers for Tend observation, Magic
  Context, OpenRTK, token audit, long-job observation, and Trellis LS
- **AND** it does not call an external model.

#### Scenario: OpenCode debug info lists Attune plugins
- **WHEN** `nix run .#tend-opencode -- debug info` is run
- **THEN** upstream OpenCode lists the flake-provided Attune plugin package
  file URLs
- **AND** the list includes Magic Context and OpenRTK plugin packages.

### Requirement: Tend tools CLI decodes and summarizes OpenCode sessions
The Tend tools CLI SHALL expose `decode --file <path> --format json` and
`summarize --file <path> --format markdown|json` commands for OpenCode-like
session logs.

#### Scenario: Decode emits schema-backed JSON
- **WHEN** a deterministic fixture file is decoded
- **THEN** stdout is parseable JSON conforming to the decoded session contract.

#### Scenario: Summarize avoids raw trace leakage
- **WHEN** a deterministic fixture file is summarized
- **THEN** the output reports counts and safe metadata
- **AND** it does not include raw prompt or conversation text.

### Requirement: Tend tools CLI observes commands safely
The Tend tools CLI SHALL expose `observe -- <command...>` to run a command and emit a
Tend command observation summary with command, cwd, startedAt, completedAt,
durationMs, exitCode, bounded stdout/stderr summaries, inferred Nx target when
available, inferred recipe ID when available, and observation ID.

#### Scenario: Synthetic command observation is safe to commit
- **WHEN** a synthetic command is observed in tests
- **THEN** the JSON output contains bounded summaries rather than full raw
  output
- **AND** no secret-shaped values are emitted.

### Requirement: Doctor checks include Trellis language-service integration
The doctor command SHALL check whether `trellis-ls --help` is available through
the workspace or flake and whether `trellis-ls diagnostics --project
packages/trellis/language-service/tsconfig.json --format json` can run.

#### Scenario: Trellis diagnostics unavailable is precise
- **WHEN** `trellis-ls diagnostics` cannot run
- **THEN** doctor JSON reports the command as unavailable with the precise
  reason
- **AND** the harness itself can still report fingerprint and plugin status.

### Requirement: JSON stdout remains machine-parseable
All JSON-mode commands SHALL write exactly one JSON document to stdout and route
diagnostics, progress, and errors away from JSON stdout.

#### Scenario: JSON command parses
- **WHEN** each required JSON command is run in tests
- **THEN** the stdout can be parsed by `JSON.parse` without trimming log lines.

### Requirement: Future measurement must use Attune harness
Documentation SHALL instruct future measurement agents to begin with
`tend-opencode fingerprint` and `tend-opencode run-harness-test`, and to
refuse measurement if the fingerprint does not show the Attune/Tend plugin
loaded.

#### Scenario: Measurement preflight is documented
- **WHEN** docs are read by a later measurement agent
- **THEN** the exact preflight commands are present
- **AND** docs say not to use a global `opencode` binary for measurement.

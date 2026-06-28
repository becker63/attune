## Why

Later Codex trace measurement needs to prove it is running through Attune's own
OpenCode harness, with the Tend plugin loaded, instead of an arbitrary global
`opencode` binary. The repository has Tend/OpenCode decoding primitives, but no
flake-installed launcher or fingerprintable runtime boundary.

## What Changes

- Add a real `tend-opencode-tools` CLI for decoding, summarizing, command
  observation, utility fingerprinting, and doctor checks.
- Add a custom `tend-opencode` launcher/harness that is installed by the
  repository flake and loads the Attune/Tend OpenCode plugin surface.
- Package the pinned upstream OpenCode runtime through the flake and make
  `tend-opencode` delegate normal OpenCode invocations to that runtime.
- Embed the Attune/Tend fingerprint in OpenCode's command surface as a shipped
  custom slash command available to the flake-installed runtime.
- Add stable harness fingerprinting that records harness identity, plugin
  identity, flake provenance, resolved wrapped runtime path, and enabled Tend
  capabilities.
- Add a deterministic no-network harness self-test that decodes a synthetic
  OpenCode-like session and produces a synthetic command observation without
  raw prompt or conversation text.
- Expose `tend-opencode` as the OpenCode harness entrypoint and
  `tend-opencode-tools` as the Tend-side utility CLI through the flake.
- Add doctor checks for the flake/workspace `trellis-ls` integration without
  requiring the larger recipe-only migration to be complete.
- Document that future measurement must begin with the flake-installed
  `tend-opencode` fingerprint and self-test commands.

### Out Of Scope

- Running Codex trace/token measurement.
- Calling external LLMs, network services, or live Postgres in tests.
- Reading or mutating `~/.codex`.
- Starting recipe-only source migration or deleting package `attune.package.ts`
  files.

## Capabilities

### New Capabilities

- `flake-installed-attune-opencode-harness`: Defines the flake-installed
  Attune OpenCode launcher, Tend/OpenCode CLI, plugin fingerprint, doctor, and
  deterministic harness self-test contract.

### Modified Capabilities

- None.

## Impact

Affected surfaces include `packages/tend/opencode`, Tend package metadata and
tests, flake package/app outputs, Nix packaging helpers if needed, docs for the
OpenCode harness, and this OpenSpec change. The new command surface prepares
the later measurement prompt but does not perform that measurement.

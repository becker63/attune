## Why

Attune agent guidance needs to converge on Nx targets and generators as the
public workflow API while Nix provides the reproducible toolchain substrate.
Older Corepack-first and package-manager-first examples make it too easy for
agents to bypass policy gates, generated-source ownership, and Source BOM
provenance.

The Nx/Nix policy gate and Source BOM program is split across several Linear
child issues. Cloud Codex sessions need a repeatable operating loop that can
resume from branch, Linear, and OpenSpec state alone instead of relying on local
notes or one agent's memory.

## What Changes

- Make Nx targets the documented public surface for validation, policy, and PR
  completion gates.
- Keep package-manager invocations only as inside-dev-shell implementation
  details, not active workflow instructions.
- Add Source BOM expectations so agents query shard ownership before editing
  repeated or generated shapes and prefer `@attune/nx` generators.
- Document policy suites for fast policy, architecture, proof pressure, and
  Source BOM checks.
- Add a runbook for the Nx/Nix policy automation loop under this OpenSpec
  change.
- Define how the controller discovers unchecked OpenSpec tasks, maps them to
  Linear child issues, verifies disjoint write sets, waits for child reports,
  runs integration validation, updates OpenSpec tasks, creates follow-up issues
  for failures, and repeats.

## Capabilities

### New Capabilities

- `nx-public-policy-gates`: Defines the Nx-owned public target surface for
  agent validation and policy gates.
- `attune-source-bom`: Defines Source BOM ownership expectations for repeated
  and generated source shapes.
- `nx-nix-policy-automation-loop`: Defines the cloud-agent loop for coordinating
  OpenSpec, Linear, validation, and integration.

## Impact

- Affects documentation and runbook artifacts under
  `openspec/changes/enforce-nix-agent-policy-gates/`.
- Affects root workflow docs, Nx targets, Nix hook wiring, Source BOM generator
  helpers, package Source BOM shards, architecture lint, and effect-oxlint
  policy rules.

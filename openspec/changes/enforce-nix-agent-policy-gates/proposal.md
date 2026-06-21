## Why

Attune agent guidance needs to converge on Nx targets and generators as the
public workflow API while Nix provides the reproducible toolchain substrate.
Older Corepack-first and package-manager-first examples make it too easy for
agents to bypass policy gates, generated-source ownership, and Source BOM
provenance.

## What Changes

- Make Nx targets the documented public surface for validation, policy, and PR
  completion gates.
- Keep package-manager invocations only as inside-dev-shell implementation
  details, not active workflow instructions.
- Add Source BOM expectations so agents query shard ownership before editing
  repeated or generated shapes and prefer `@attune/nx` generators.
- Document policy suites for fast policy, architecture, proof pressure, and
  Source BOM checks.

## Capabilities

### New Capabilities

- `nx-public-policy-gates`: Defines the Nx-owned public target surface for
  agent validation and policy gates.
- `attune-source-bom`: Defines Source BOM ownership expectations for repeated
  and generated source shapes.

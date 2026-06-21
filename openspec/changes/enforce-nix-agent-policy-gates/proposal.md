# enforce-nix-agent-policy-gates

## Why

Attune needs long-term enforcement that keeps Nx as the public workflow surface
and Nix as the reproducible toolchain substrate. Agents should stop teaching
Corepack/global package-manager bootstrap/random helper scripts as normal
workflow, and generated or repeated Attune source shapes need provenance through
an Attune Source BOM.

## What Changes

- Add Nx public policy gates that identify unsupported workflow instructions and
  route humans and agents through the supported Nx surface.
- Add Attune Source BOM helpers so Nx generators can stamp generated/repeated
  source shapes with stable provenance metadata.
- Backfill Source BOM shards package-by-package through follow-up slices.
- Wire enforcement into Nix pre-commit and flake checks once the rules and BOM
  format are stable.

## Impact

- Public docs and agent guides converge on Nx commands.
- Nix remains the reproducible substrate rather than the user-facing workflow API.
- Generated Attune source files become auditable by generator, capability,
  owner, and source shape.

## Why

Attune has strong deterministic feedback signals, but no Pi-native package that treats those signals as the sensory system for bounded spec execution. This change adds the private first slice of that surface so an interrogated subsystem spec can become reviewable evidence rather than an opaque agent run.

## What Changes

- Add a private `@attune/pi-agent` Nx package under `packages/attune-pi-agent`.
- Define schema-backed implementation specs, evidence matrices, test obligations, mutation obligations, property obligations, run events, and deny-first permission profiles.
- Add a hand-authored ATT-50 fixture covering Regofile-to-Pi permission policy work.
- Implement deterministic evidence matrix rendering from fixture/run data.
- Add generator helpers for spec and permission-policy artifacts with snapshot-style tests.
- Add package Nx targets for typecheck, test, property, mutation, and lint.
- Document the local spec -> falsification -> evidence loop.

## Capabilities

### New Capabilities
- `attune-pi-agent`: Private Pi-agent spec execution model, local run artifacts, permission defaults, and evidence matrix generation.

### Modified Capabilities

## Impact

- Adds `packages/attune-pi-agent` as a private workspace package.
- Adds the `@attune/pi-agent` TypeScript path alias.
- Adds local `.attune-runs/` artifact ignore coverage.
- Does not add remote workers, deployment, SSH, Kubernetes orchestration, or live Linear execution memory.

## Context

The v0 Pi agent is a private Attune package, not a general autonomous engineer. It owns Attune-specific execution semantics: implementation spec shape, evidence obligations, test sensors, mutation/property obligations, permission defaults, artifact layout, and review handoff. External Pi ecosystem tools remain future adapters.

## Goals

- Model implementation runs with Effect Schema-decodable packets.
- Provide deterministic fixtures and artifact rendering for ATT-50.
- Make deny-first permissions executable as code and testable without relying on prompt text.
- Provide generator helpers for repeatable spec and policy artifacts.
- Keep all behavior local to the repo and reviewable through git and run artifacts.

## Non-Goals

- No remote worker or SSH integration.
- No Taskplane, pi-task, hybrid-harness, context-mode, or Linear live adapters.
- No deployment, Kubernetes/NixOS orchestration, or mutation of secrets.
- No direct pushes, merges, or main-branch ownership.

## Architecture

The package exposes pure TypeScript modules:

- `src/schema/*` defines serializable boundary models.
- `src/artifacts/*` renders and reads local run artifacts.
- `src/commands/*` exposes the first static command functions, starting with `attune-evidence`.
- `src/permissions/*` normalizes paths and classifies deny/ask/allow decisions.
- `src/generators/*` emits deterministic spec and permission-policy artifacts.
- `src/fixtures/*` provides the ATT-50 implementation spec and run evidence.

Nx targets invoke package-local tooling through workspace `node_modules`; the property and mutation targets are scoped to local tests/config for this package.

## Data Model

`ImplementationSpec` captures one run's source-of-truth contract: intent, scope, boundaries, task list, obligations, validations, review gates, forbidden actions, permission profile, and artifact policy.

`EvidenceMatrix` is the central output artifact. Each entry joins a claim, supporting evidence, verifier, result, residual risk, and whether human review remains required.

`PermissionProfile` is deny-first. It includes secret-adjacent path rules and command rules for SSH, sudo, destructive git, deletion, deployment, and external directories.

## Safety

The v0 package never shells out as part of evidence rendering or generator helpers. Permission classification is pure code so tests can falsify path normalization and decision boundaries.

`.attune-runs/` remains a local ignored artifact directory. Selected outputs can later be promoted to docs, Linear, PRs, or telemetry, but Linear is not execution memory.

## Testing

- Schema decode tests cover valid ATT-50 fixtures and invalid spec rejection.
- Rendering tests assert deterministic evidence matrix output.
- Generator tests assert idempotent deterministic emission.
- Property tests cover permission path normalization and evidence matrix stability.
- Mutation target is defined around permission decision logic and evidence result classification.

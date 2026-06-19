## Why

ATT-38 moves the home platform deployment from a typed checklist plus generic command execution into the long-term architecture: Alchemy owns the complete lifecycle graph and Effect providers own every external capability boundary. The current `home-deployment` package can plan and reconcile resources, but domain resources still expose command-display strings and the CLI can act like the orchestrator. That shape is not safe enough for host installs, Tailscale access, K3s convergence, Kubernetes object application, or Windows desktop registration.

## What Changes

- Introduce an Alchemy-owned platform lifecycle graph for the home compute target.
- Define typed lifecycle resources for host inventory, gates, Nix artifacts, SSH reachability, host activation, Tailscale, K3s, kubeconfig, Kubernetes object sets, Attune CRDs, namespaces, worker pools, desktop worker registration, and smoke checks.
- Move Nix, SSH, host activation, Tailscale, K3s, Kubernetes, Windows desktop guard, manual gates, state, and evidence journaling behind Effect provider contracts with Live, DryRun, and Test layers.
- Add first-class manual gate resources that block dependent resources until typed evidence is recorded.
- Add an agent stepper protocol with JSON output for `plan`, `status`, `next-step`, safe probes, gate confirmation, one approved transition, and re-plan.
- Upgrade `platform-alchemy-k8s` from render/validate-only composition toward Kubernetes object-set read/diff/apply/delete lifecycle through a `KubernetesProvider`.
- Keep the CLI thin: it invokes the Alchemy program and renders typed JSON or human summaries.

## Capabilities

### New Capabilities

- `effect-alchemy-platform-lifecycle`: Alchemy-owned desired/observed lifecycle graph and resource status model.
- `typed-platform-provider-contracts`: Effect service contracts and Live/DryRun/Test provider layer requirements.
- `manual-gate-lifecycle`: Typed operator proof gates for physical, irreversible, and external mutations.
- `agent-stepper-protocol`: Deterministic machine-readable step protocol for safe agent/operator deployment loops.
- `kubernetes-objectset-lifecycle`: Kubernetes object-set render/validate/read/diff/apply/delete lifecycle.

### Modified Capabilities

- `typed-platform-deployment`: Migrates from home-deployment orchestration commands to Alchemy resource ownership.
- `home-cluster-bootstrap`: Uses provider-backed lifecycle resources instead of README/runbook ordering.

## Impact

- Affects `packages/home-deployment`, `packages/platform-alchemy-k8s`, and likely new packages such as `platform-model`, `platform-providers`, `platform-alchemy`, or `platform-agent` as implementation proceeds.
- Updates Nx targets so `attune-home plan/status/next-step/confirm/deploy/destroy` invoke the new lifecycle surface.
- Updates `docs/platform/home-cluster-bootstrap-runbook.md` to describe Alchemy-owned lifecycle and agent stepping.
- Does not check in secrets or perform irreversible physical changes from Codex.

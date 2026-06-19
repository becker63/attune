## Why

Attune needs a fast, reproducible home-cluster bootstrap path before Taylor is away from the machines. The immediate goal is remote-safe control-plane access and a working Kubernetes substrate on the three ThinkCentres, with the Windows/RX 6800 XT desktop integrated as a constrained worker only after a feasibility gate.

## What Changes

- Add a Nix-first bootstrap lane for the three ThinkCentre control-plane nodes:
  - hardware inventory and host identity capture
  - NixOS installer image generation
  - NixOS-anywhere or documented manual install fallback
  - Colmena deploy target for host configuration
  - K3s HA server configuration with embedded etcd
- Add a Tailscale remote-access lane:
  - host-level Tailscale on all nodes
  - a Kubernetes subnet/router plan for cluster access
  - operator or static manifests managed through typed platform code where feasible
- Add an explicit GPU-worker decision gate for the Windows desktop with RX 6800 XT:
  - prefer bare-metal Linux/NixOS dual-boot or dedicated Linux worker if ROCm/local-model support is required
  - treat WSL as a fallback for CPU or non-ROCm worker mode
  - avoid making VM GPU passthrough a critical path until proven
- Extend platform-alchemy-k8s usage for bootstrap manifests:
  - typed local compute stack render target
  - worker pool node labels and taints/tolerations
  - constrained GPU worker pool resources
  - smoke manifests for control-plane connectivity
- Add cross-platform scripts for:
  - ISO generation
  - host inventory collection
  - kubeconfig/Tailscale smoke checks
  - typed Kubernetes render/validate/apply workflow
- Add runbooks for the fastest safe setup path and vacation-safe remote operations.

## Capabilities

### New Capabilities

- `home-cluster-bootstrap`: NixOS image generation, ThinkCentre host configuration, K3s HA bootstrap, Colmena deployment, and remote-safe smoke checks.
- `tailscale-remote-access`: Host and Kubernetes Tailscale access requirements for reaching the home cluster while away.
- `desktop-gpu-worker-bootstrap`: Decision gate and worker bootstrap path for the Windows/RX 6800 XT desktop, including VM/WSL/bare-metal tradeoffs and resource constraints.
- `typed-platform-deployment`: Typed Effect/Alchemy Kubernetes rendering and deployment workflow for the local compute stack.
- `vacation-operations-runbook`: Minimal operational runbook, rollback, backups, and validation commands for remote iteration.

### Modified Capabilities

- `local-compute-control-plane-docs`: Moves from future-facing documentation toward a concrete bootstrap implementation plan.

## Impact

- Affects future files under `nix/`, `hosts/`, `scripts/infra/`, `docs/platform/`, and `packages/platform-alchemy-k8s`.
- Will use existing `packages/platform-alchemy-k8s` resource DSL for typed Kubernetes objects.
- Will introduce reproducible host deployment scripts and runbooks.
- Does not require the desktop GPU worker to be solved before the ThinkCentre K3s control plane is reachable.
- Does not expose public internet ingress as part of the first milestone; remote access should flow through Tailscale.

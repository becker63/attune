## Why

Attune has several local-platform specs that mix bare-metal bootstrap, Tailscale, K3s, typed Kubernetes resources, desktop GPU work, and long-term lifecycle architecture. The immediate implementable problem is narrower: install NixOS onto three existing ThinkCentre nodes, make them reachable over Tailscale, and let them keep converging from the repository through comin so Kubernetes can be added later without redoing the host foundation.

## What Changes

- Consolidate the local network bootstrap requirements into one first slice for `attune-cp-1`, `attune-cp-2`, and `attune-cp-3`.
- Add a NixOS host baseline for the three ThinkCentres with SSH, Tailscale, sops-nix secrets, base operator packages, firewall policy, host identity, Disko layout, and comin-managed updates.
- Use Effect/Alchemy in `packages/home-deployment` as the deployment lifecycle owner for the operator laptop, machine references, inventory, local network discovery, SOPS key and secret preparation, gates, Nix builds, USB installer observations, `nixos-anywhere` + Disko bootstrap, SSH probes, Tailscale auth/readiness, comin readiness, and final network smoke checks.
- Treat Tailscale access, SOPS secret management, `nixos-anywhere` activation, Disko disk layout selection, SSH reachability, LAN discovery, machine inventory, and local state as typed Effect services behind native Alchemy resources rather than ad hoc commands or local helper CLIs.
- Bootstrap Tailscale on the Asahi laptop first, then use the laptop as the Alchemy control plane for discovering and installing the ThinkCentre nodes.
- Keep destructive disk and identity-affecting actions behind typed manual gates with local evidence; do not commit Tailscale auth keys, SSH private keys, host keys, kubeconfigs, or deployment state.
- Document an operator runbook for the first install path and the remote repair path after Tailscale is up.
- Defer K3s, Kubernetes object application, kubeconfig routing, desktop GPU worker setup, and public ingress to later specs once basic host connectivity is accepted.

## Capabilities

### New Capabilities

- `thinkcentre-network-bootstrap`: NixOS + Disko + sops-nix + Tailscale + comin bootstrap for the Asahi operator laptop and three existing ThinkCentre bare-metal nodes, orchestrated by native Effect/Alchemy providers, machine resources, lifecycle gates, and smoke checks.
- `effect-alchemy-codebase-pattern`: Codebase-wide implementation rule that lifecycle automation uses native Alchemy, external capabilities are Effect services, boundaries are Effect Schema, repeated shapes are generated with Nx, and local helper abstractions are removed rather than normalized.
- `effect-alchemy-architecture-lint`: Narrow oxlint-adjacent architecture guardrail that enforces the Attune Effect/Alchemy/Nx shape across packages and replaces broad style policing with targeted structural checks.

### Modified Capabilities

- None. There is no archived `openspec/specs` baseline for these local-platform capabilities yet; this change consolidates active planning material into one new implementable capability.

## Impact

- Affects `nix/hosts`, `nix/modules`, `packages/home-deployment`, `docs/platform`, and local ignored deployment/evidence state.
- May remove or bypass K3s/desktop/Kubernetes resources from the default home network bootstrap plan until later changes reintroduce them.
- Adds or refines typed Effect service/provider contracts for operator-machine setup, machine references, LAN discovery, SOPS, Tailscale, `nixos-anywhere`, Disko, SSH, Nix artifacts, local evidence/state, and comin observation.
- Removes local helper orchestration as an accepted implementation pattern; Alchemy is the lifecycle abstraction.
- Adds pressure to extend `@attune/nx` generators when provider/resource/schema/test patterns repeat.
- Refactors linting toward a focused architecture target that runs alongside oxlint through Nx.
- Adds encrypted SOPS secret files and key metadata that are safe to commit, while keeping private keys and plaintext secret material outside git.
- Adds comin as a host update mechanism for the bare-metal nodes.
- Requires Nix/NixOS tooling and `nixos-anywhere` for the live install path, with a documented manual installer fallback.
- Does not expose public ingress or require Kubernetes to be healthy for acceptance.

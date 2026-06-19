## 1. Fast Bootstrap Plan

- [ ] 1.1 Capture hardware inventory for all three ThinkCentres: model, RAM, disk target, NICs, MAC addresses, LAN IP/DHCP reservation, wipe permission, and intended hostname.
- [ ] 1.2 Capture desktop constraints: Windows version, GPU driver state, available disk/partition options, whether Linux dual boot is acceptable, and first local-model runtime target.
- [ ] 1.3 Decide the initial bootstrap mode: NixOS-anywhere if SSH/live environment is practical, otherwise manual NixOS installer media.

## 2. NixOS Host Bootstrap

- [ ] 2.1 Add `hosts/` or `nix/hosts/` structure for `attune-cp-1`, `attune-cp-2`, and `attune-cp-3`.
- [ ] 2.2 Add a shared NixOS module for SSH, Tailscale, base packages, users, firewall, time sync, and disk/persistence assumptions.
- [ ] 2.3 Add K3s server host modules with first-server initialization and join-server configuration.
- [ ] 2.4 Add host labels for `attune.dev/worker-class=thinkcentre-cpu` and local compute identity.
- [ ] 2.5 Add typed Effect/Alchemy host deployment resources for Nix build artifacts, manual USB boot gates, NixOS-anywhere install, post-install SSH checks, and Tailscale readiness.
- [ ] 2.6 Add optional Colmena or `nixos-rebuild --target-host` executor integration behind the Alchemy resource boundary if needed for post-install host updates.
- [ ] 2.7 Add scripts to generate or fetch a pinned NixOS installer ISO and print checksum/output path.
- [ ] 2.8 Add a first-boot/install runbook with manual fallback steps.

## 3. Tailscale Remote Access

- [ ] 3.1 Add Tailscale host configuration to the shared NixOS module without committing auth keys.
- [ ] 3.2 Add documented secret input path for Tailscale auth keys or auth flow.
- [ ] 3.3 Add smoke script for host-level Tailscale SSH reachability.
- [ ] 3.4 Add Kubernetes remote-access plan: API over Tailscale first, operator/subnet-router after cluster is healthy.
- [ ] 3.5 Add typed or templated Tailscale Kubernetes resources if selected for the first rollout.

## 4. K3s HA Cluster

- [ ] 4.1 Configure K3s server token handling outside git.
- [ ] 4.2 Configure first server and joining servers for embedded-etcd HA.
- [ ] 4.3 Add kubeconfig retrieval/merge script for local and remote operator machines.
- [ ] 4.4 Add smoke checks for `kubectl get nodes`, K3s service status, and node labels.
- [ ] 4.5 Add etcd/K3s snapshot command to the runbook before remote iteration.

## 5. Typed Platform Deployment

- [ ] 5.1 Add a home deployment package or module that composes host install resources, K3s resources, Kubernetes resources, and desktop guard resources into one Effect/Alchemy plan.
- [ ] 5.2 Add platform render script around `packages/platform-alchemy-k8s` for CRDs and `LocalComputeStack`.
- [ ] 5.3 Add dry-run/diff/apply modes.
- [ ] 5.4 Extend `WorkerPool.thinkcentreCpu` if needed to match real node labels and resource budgets.
- [ ] 5.5 Add Tailscale/remote-access objects to typed platform code or a validated manifest template if selected.
- [ ] 5.6 Add typed manual-gate resources for destructive disk install confirmation, USB boot confirmation, and Windows autostart confirmation.
- [ ] 5.7 Validate with `node scripts/codex/pnpm.mjs exec nx run platform-alchemy-k8s:test`.
- [ ] 5.8 Validate with a real cluster dry-run once K3s is reachable.

## 6. Desktop GPU Worker Gate

- [ ] 6.1 Create a feasibility matrix for desktop worker modes: bare-metal Linux/NixOS, WSL, VM with passthrough, and Windows-side worker.
- [ ] 6.2 Verify RX 6800 XT support for the chosen local-model runtime and OS path.
- [ ] 6.3 Define game-aware worker guard policy: configured process list, manual gaming mode, GPU utilization threshold, idle window, drain grace period, and disable/enable commands.
- [ ] 6.4 If the desktop remains Windows-primary, design the smallest Windows-side probe/helper and generate its config from Nix-managed policy.
- [ ] 6.5 Define idle/vacation-capacity resource profiles with high-water CPU, memory, GPU, VRAM, model parallelism, and host-reserve thresholds.
- [ ] 6.6 Add Nix-generated Windows autostart installer for the desktop guard and worker launcher.
- [ ] 6.7 If GPU path is viable, add NixOS or worker bootstrap config with node labels, taints, low priority, elastic resource limits, and single-job GPU concurrency.
- [ ] 6.8 If GPU path is not viable quickly, add CPU/WSL disposable worker fallback and keep GPU workloads unscheduled.
- [ ] 6.9 Add pause/drain/disable runbook for protecting interactive desktop use.

## 7. Vacation Operations

- [ ] 7.1 Add `docs/platform/home-cluster-runbook.md` with install, access, smoke, backup, rollback, and repair commands.
- [ ] 7.2 Add `scripts/infra/smoke-home-cluster.*` entrypoints or one portable Node script for host, Tailscale, kubeconfig, and typed platform checks.
- [ ] 7.3 Add a one-command status summary that can be run remotely.
- [ ] 7.4 Document what is safe to change remotely and what requires physical access.

## 8. Linear And Validation

- [ ] 8.1 Link implementation issues to the infrastructure epic.
- [ ] 8.2 Keep GPU worker issue blocked by feasibility until control plane is reachable.
- [ ] 8.3 Record final hostnames, tailnet names, kubeconfig context, and smoke results in Linear comments without secrets.
- [ ] 8.4 Run OpenSpec validation for this change.

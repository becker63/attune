## Context

The hardware shape is clear:

- three ThinkCentre mini PCs at Taylor's house for durable control-plane work
- one Windows desktop with an AMD RX 6800 XT for local models and opportunistic GPU work
- a need to keep the desktop usable by another person while Attune work runs in the background
- a near-term vacation deadline that makes remote access and recoverability more important than elegance

The repo already has a future-facing local compute plan and `packages/platform-alchemy-k8s`, including `LocalComputeStack`, `WorkerPool.thinkcentreCpu`, `WorkerPool.desktopGpu`, generated CRD types, and tests that render typed Kubernetes resource graphs. This change turns that direction into a concrete bootstrap plan.

## Goals / Non-Goals

**Goals:**

- Get the three ThinkCentres installed, reachable, and running a K3s HA control plane quickly.
- Make remote access work through Tailscale before Taylor leaves.
- Make all host setup reproducible enough to rerun or repair remotely.
- Keep NixOS/Colmena as the primary host configuration path.
- Keep Effect/Alchemy as the typed Kubernetes resource composition path.
- Provide scripts that work from WSL, Linux, and Codex/cloud workers where possible.
- Keep GPU worker integration constrained and optional until the RX 6800 XT execution path is proven.
- Add enough smoke checks that remote iteration can distinguish host, network, cluster, and typed-platform failures.

**Non-Goals:**

- Public internet ingress.
- Production-grade secrets management beyond bootstrap-safe placeholders and documented secret injection.
- Solving ROCm model serving on the RX 6800 XT before the control plane is up.
- Building the full scheduler, leases, EventLog, or worker runtime.
- Making k3d the production cluster on the ThinkCentres.
- Making VM GPU passthrough a blocking requirement.

## Decisions

### K3s HA on the three ThinkCentres is the first milestone

The three ThinkCentres should run K3s server nodes with embedded etcd. This matches the hardware count and gives a durable control plane independent from the intermittent desktop.

Rationale: K3s HA embedded etcd expects three or more server nodes for the Kubernetes API, control-plane services, and datastore. That maps cleanly onto the three stable machines and avoids making the Windows desktop part of quorum.

Alternative considered: run k3d in a VM for the main cluster. Rejected for the main home cluster because k3d is useful for local test clusters but adds an unnecessary Docker/VM layer for durable physical nodes.

### NixOS hosts first, Effect/Alchemy owns deployment orchestration

The bootstrap path should generate NixOS installer media and host configs, then use either NixOS-anywhere or a documented manual install fallback. Effect/Alchemy should be the top-level deployment model for host installation, cluster convergence, typed Kubernetes resources, and Windows desktop guard installation.

Rationale: The first install is the fragile phase and includes manual gates that should be explicit in the plan. Effect/Alchemy's plan/reconcile model is a better fit for the full deployment story than treating Colmena as the primary orchestrator, because it can model both automated actions and "operator must boot node from USB now" checkpoints in the same typed graph.

Colmena can still be used as a lower-level executor if it proves useful, but it should sit behind an Alchemy resource rather than becoming the user-facing deployment surface.

Alternative considered: start with generic Ubuntu and install K3s with shell scripts. Rejected as the default because the user wants reproducible Nix-managed host state and vacation-safe iteration.

Alternative considered: use Colmena as the primary deployment interface after first boot. Rejected as the main model because it duplicates the role we want Effect/Alchemy to play and does not naturally represent the whole host/Kubernetes/Windows lifecycle as one typed plan.

### Tailscale is mandatory before meaningful remote work

Each ThinkCentre should run host-level Tailscale. The cluster should later expose Kubernetes access through either the Tailscale Kubernetes Operator or a subnet-router connector, but host SSH over Tailscale is the first acceptance gate.

Rationale: If Kubernetes breaks, host-level access still lets us repair it. Kubernetes-native Tailscale should not be the only path into the machines.

Alternative considered: only deploy a Tailscale Kubernetes operator. Rejected because losing the cluster would also lose the remote repair path.

### Desktop GPU worker is a separate gate

The RX 6800 XT desktop should not block the control plane. The first GPU task is a feasibility decision:

1. Confirm whether local model runtime needs ROCm/HIP.
2. Confirm whether RX 6800 XT is supported enough on the chosen OS/runtime.
3. Decide between:
   - bare-metal Linux/NixOS worker when GPU compute matters
   - Windows host plus WSL worker for CPU/lightweight jobs
   - VM only if passthrough and usability are proven

Rationale: AMD's official ROCm system requirements should be treated conservatively. If the card is not listed for the target ROCm release/runtime, the plan must not depend on it without a spike.

Alternative considered: build the desktop worker as a NixOS VM with GPU passthrough immediately. Rejected as the critical path because consumer GPU passthrough on a daily-use Windows desktop can be fragile and disruptive.

### Kubernetes enforces resource kindness on the desktop

If the desktop joins as a worker, it must be tainted/intermittent and constrained:

- one GPU worker lease at a time
- explicit CPU/memory/GPU resource requests and limits
- low-priority workloads by default
- node labels for `attune.dev/worker-class=desktop-gpu` and `attune.dev/gpu=amd-rx-6800-xt`
- pause/drain runbook so the desktop can be returned to interactive use quickly
- game-aware guard so Minecraft or other configured games preempt local-model workloads

Rationale: The worker must coexist with normal desktop usage.

### Game-aware preemption beats static resource sharing

The default desktop strategy should be conservative:

1. Do not schedule local-model GPU work while a configured game is running.
2. Prefer fast pause/drain/terminate behavior over trying to perfectly share VRAM.
3. Re-enable the worker only after an idle window and low GPU utilization.
4. Keep a manual "gaming mode" override that wins over automation.
5. When the desktop is truly idle, expand the local-model worker to a high-water "vacation capacity" profile.

Rationale: GPU memory and graphics responsiveness are hard to partition reliably on a consumer gaming desktop. Kubernetes can constrain CPU/memory and pod priority, but it cannot reliably make a single RX 6800 XT feel good for both gaming and local-model inference at the same time. The platform should therefore treat games as higher-priority interactive workloads.

If the desktop remains Windows-primary, a small Windows-side probe may be unavoidable to inspect process names or GPU engine utilization. The policy should still be Nix-owned: Nix generates the guard config, process allowlist, thresholds, idle window, and worker enable/disable commands. The Windows helper should be a thin adapter, not the policy source of truth.

Alternative considered: split the GPU through VM passthrough or static Kubernetes GPU resources. Rejected for the near-term because RX 6800 XT passthrough on a daily-use Windows desktop is fragile, and the AMD Kubernetes device plugin exposes GPU resources to containers but does not solve interactive game preemption.

### Idle capacity should be elastic, not merely "safe"

During the two-week vacation window, the desktop should be allowed to do real work when nobody is using it. The guard should therefore manage two resource profiles:

- `interactive`: no GPU model work, or very small CPU-only work, while games/manual mode/high pressure are present
- `vacation-capacity`: one local-model GPU worker using most available CPU, memory, VRAM, and GPU compute while reserving enough headroom for Windows, Tailscale, display responsiveness, and remote repair

The expansion should happen through generated runtime config rather than by rebuilding the image. Nix builds the worker image and emits the guard policy; the guard chooses container arguments such as CPU quota, memory limit, model parallelism, context size, and worker concurrency based on current desktop state.

On Windows-primary, autostart should be a generated Scheduled Task or service installer. Some PowerShell is acceptable for installation and Windows sensor plumbing, but it should be generated from Nix-managed policy and remain small enough to audit.

### Effect/Alchemy owns Kubernetes object composition

Nix should build host images, packages, and container images. Effect/Alchemy should render and validate Kubernetes objects. The existing `platform-alchemy-k8s` package should be extended with cluster bootstrap render targets rather than replacing it with Nix-generated manifests.

Rationale: This preserves the existing typed provider direction and keeps product/platform resource composition in TypeScript/Effect.

## Rollout Shape

```
Phase A: Inventory
  -> capture MACs, disks, hostnames, LAN IPs, SSH keys, Tailscale auth approach

Phase B: Install
  -> generate NixOS ISO
  -> install three ThinkCentres
  -> enable SSH + Tailscale

Phase C: K3s HA
  -> first server initializes cluster
  -> second/third servers join with fixed token
  -> kubeconfig exported over Tailscale

Phase D: Typed Platform Smoke
  -> render CRDs/local compute stack with platform-alchemy-k8s
  -> apply CRDs and namespace/resource quota/smoke worker pool
  -> run kubectl and typed provider smoke checks

Phase E: Desktop Worker Gate
  -> test WSL/VM/bare-metal options
  -> choose worker mode
  -> join as tainted intermittent worker only when safe
```

## Risks / Trade-offs

- **Risk: Vacation deadline makes the perfect path too slow** -> Mitigation: prioritize host Tailscale + K3s API reachability over GPU integration.
- **Risk: NixOS install fails on one ThinkCentre** -> Mitigation: keep manual install fallback and allow temporary two-node work only for repair, not accepted HA.
- **Risk: K3s quorum breaks while remote** -> Mitigation: document etcd snapshot/restore and keep host-level Tailscale SSH.
- **Risk: RX 6800 XT ROCm support is uncertain** -> Mitigation: make GPU worker a spike and allow CPU-only/WSL worker fallback.
- **Risk: Desktop jobs disrupt interactive use** -> Mitigation: taints, low priority, strict resource limits, single worker concurrency, and drain/pause commands.
- **Risk: Static GPU limits still make games stutter** -> Mitigation: game detection and manual gaming mode preempt local-model jobs instead of relying only on resource partitioning.
- **Risk: Secrets leak into repo** -> Mitigation: scripts generate templates and require local secret files/env vars outside git.

## Open Questions

- Exact ThinkCentre models, RAM, disk layout, and whether disks can be wiped.
- Whether the home router can reserve stable DHCP leases for all nodes.
- Whether Taylor wants a dedicated Linux partition/disk on the desktop or must keep Windows primary.
- Which local model runtime is the first target: llama.cpp, Ollama, vLLM, ROCm/PyTorch, or something else.
- Whether Tailscale auth keys can be pre-provisioned and stored outside the repo for unattended install.

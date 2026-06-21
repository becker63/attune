## Context

The existing local-platform planning material is intentionally ambitious: three ThinkCentre nodes eventually become a Kubernetes control plane, Tailscale provides remote access, typed Effect/Alchemy resources own platform lifecycle, and Nix supplies reproducible host state. The immediate implementation slice is still narrow, but it should be automated end to end. The accepted outcome is one Alchemy-driven workflow, run from the Asahi laptop, that prepares the laptop, discovers the local ThinkCentres, installs NixOS with Disko through `nixos-anywhere`, brings every machine onto Tailscale using SOPS-managed secrets, and verifies comin-based convergence.

The operator machine is part of the system. It is an Asahi Linux `aarch64-linux` laptop, while the ThinkCentres are `x86_64-linux`. Because this laptop is the available control surface, the lifecycle must configure and verify an `x86_64-linux` Nix builder from the laptop before building installer ISOs or host closures.

## Goals / Non-Goals

**Goals:**

- Model the Asahi laptop as the operator/control machine and `attune-cp-1`, `attune-cp-2`, and `attune-cp-3` as typed bare-metal machine resources.
- Make Effect/Alchemy the lifecycle owner for laptop Tailscale setup, laptop x86 builder readiness, SOPS key preparation, encrypted Tailscale secret generation, local network discovery, machine inventory, USB install gates, `nixos-anywhere` + Disko, Tailscale readiness, comin readiness, and final network smoke checks.
- Keep provider boundaries explicit: Nix, SOPS, Tailscale, LAN discovery, machine inventory, SSH, USB media, `nixos-anywhere`, Disko, comin, local evidence/state, and removable USB media are typed Effect services with Effect Schema inputs and outputs.
- Build `x86_64-linux` installer and host artifacts from the Asahi laptop through a configured local x86 builder capability.
- Install a minimal NixOS host baseline with SSH, Tailscale, sops-nix, comin, base packages, Disko whole-disk layout, firewall policy, and the `attune` operator user.
- Use SOPS/sops-nix for Tailscale auth material and other bootstrap secrets, keeping public recipient metadata in git while writing encrypted runtime material, private keys, and plaintext outside tracked paths.
- Leave the installed hosts ready for a later Kubernetes/K3s change without requiring that change now.

**Non-Goals:**

- Installing or accepting K3s, Kubernetes resources, kubeconfig routing, desktop GPU workers, public ingress, or workload scheduling.
- Treating shell scripts, Colmena, or a runbook as the lifecycle source of truth.
- Cross-compiling NixOS images silently from ARM without proving an `x86_64-linux` builder path.
- Requiring any machine other than the Asahi laptop and the three ThinkCentres for the first slice.
- Committing plaintext Tailscale auth keys, SOPS private age keys, SSH private keys, host keys, or local deployment state.

## Decisions


### The user surface is native Alchemy

The intended operator experience is not a new `attune-home deploy` command or any other local helper. The user or agent should invoke the Effect/Alchemy program for the `ThinkCentreDay0Deployment` stack using Alchemy's existing plan, preview/diff, apply, destroy, resource state, and step/continue semantics. Attune contributes typed resources and Effect services underneath that stack.

The repository should export Alchemy resources, stacks, and Effect layers for the Alchemy runtime to consume. It must not provide a parallel scheduler, helper CLI, approval system, retry loop, state machine, or command-runner facade. Existing local helper orchestration in `packages/home-deployment` should be removed or reduced to tests around the native Alchemy resources, not kept as a compatibility surface.


### Effect and Alchemy are the codebase pattern

This change should establish the broader implementation rule for Attune platform automation: use what Effect, Effect Schema, Alchemy, and Nx already provide before inventing local shapes. External systems become Effect services with Live, DryRun, and Test layers. Inputs, outputs, observed state, evidence, errors, and resource props are decoded with Effect Schema. Lifecycle and stateful infrastructure transitions are native Alchemy resources. Tests use Effect Test layers and simulated worlds so agents can exercise the same safety semantics without touching real machines.

Repeated resource/service/schema/test shapes should become `@attune/nx` generators. The expectation is not hand-written sameness; it is generated, homogeneous, boring safety. When an implementation repeats a pattern, the implementer should either use an existing Nx generator or extend/create one before the repetition grows.

Alternative considered: keep small local wrappers because they are faster to write. Rejected because the long-term win is a uniform Effect/Alchemy/Nx grammar that agents can navigate, test, and extend predictably.

### Alchemy owns lifecycle; Nix owns host shape

Nix modules define the installed operating system contents: hostname, users, SSH, Tailscale, sops-nix, comin, Disko layout, packages, firewall, and future extension points. Effect/Alchemy owns all lifecycle transitions and observations around those artifacts.

The home deployment graph should include resources such as `OperatorMachine`, `OperatorTailscale`, `OperatorSopsKey`, `X86NixBuilder`, `SopsSecretSet`, `ThinkCentreMachine`, `LanDiscoveryScan`, `InstallerIsoArtifact`, `UsbInstallMedia`, `UsbBootGate`, `InstallerSshReachability`, `DiskIdentityApproval`, `DiskoLayout`, `NixosAnywhereInstall`, `PostInstallSshReachability`, `TailscaleNode`, `CominSubscription`, and `NetworkSmokeCheck`.

Alternative considered: expose commands from the plan or add an Attune-specific orchestration CLI. Rejected because it turns Alchemy into a checklist renderer and forces agents to learn a second workflow instead of using Alchemy resources, blockers, evidence, provider modes, and apply semantics directly.

### The Asahi laptop is bootstrapped first

The first runnable phase prepares the operator laptop. Alchemy should verify required tools, Tailscale login, SOPS/age key availability, Nix daemon features, and x86 builder readiness before it touches a ThinkCentre.

Laptop Tailscale setup is a Tailscale provider transition. The provider may install or configure Tailscale only through an explicit external-operation apply step, then observe `tailscaled`, the current tailnet identity, and whether the laptop can later reach enrolled hosts.

Alternative considered: make the laptop a precondition documented outside the graph. Rejected because the workflow should be runnable from a fresh-enough laptop and explain the next safe action when laptop prep is incomplete.

### The Asahi laptop must provide the x86 build capability

The Nix provider must target `x86_64-linux` explicitly for installer and host artifacts. Before those builds are runnable, the lifecycle must observe that the Asahi laptop has an `x86_64-linux` builder configured and usable by Nix. The accepted builder may be local emulation or another laptop-local builder mechanism, but it must be configured from this laptop and verified through the provider.

Builder verification should include:

- observed operator system and Nix daemon configuration
- `x86_64-linux` appearing as a supported build target or configured builder
- a small `x86_64-linux` derivation/build probe
- evaluation of the `nix/hosts` flake with `system = "x86_64-linux"`
- deterministic blocker output when setup is missing

Alternative considered: use a remote x86 machine or cloud builder. Rejected for this slice because the user has only the Asahi laptop available as the control surface.

### SOPS is the secret transport for Tailscale material

The workflow should generate or import Tailscale auth material into SOPS-encrypted files, not ad hoc ignored plaintext files. The SOPS provider owns operator age key readiness, host recipient metadata, encrypted secret file creation/update, key rotation/updatekeys prompts, and validation that expected encrypted keys exist.

For first install, each host needs a decryptable secret path at activation time. The preferred path is:

1. Generate or capture per-host age recipients before install, or use a controlled bootstrap age key copied through the `nixos-anywhere` extra-files mechanism.
2. Encrypt Tailscale auth material to the operator and target host recipients.
3. Configure sops-nix in the NixOS host module so the Tailscale auth key is available at activation under `/run/secrets/...`.
4. Configure a systemd unit or Tailscale provider-managed activation hook that runs `tailscale up --auth-key file:<secret-path>` or equivalent without exposing the key in logs.

If host-specific recipients are not known before install, Alchemy must make the bootstrap recipient/extra-files path explicit and rotate to host-specific recipients after first boot.

Alternative considered: write Tailscale auth keys into local ignored files and copy them with scp. Rejected because SOPS gives auditable encrypted repo state and better repeatability.

### Nixos-anywhere is wrapped as a rich provider around Disko

`nixos-anywhere` is the install executor and Disko is the disk layout source. The provider should not merely print a command. It should own target reachability checks, target fact collection, Disko layout selection, optional hardware config generation, extra-files staging for bootstrap keys/secrets, phase selection, apply execution, and structured result evidence.

The install provider should use `nixos-anywhere`'s Disko integration by ensuring the selected flake output includes the correct `disko.devices` configuration. It should also expose repair modes later through Disko mode/phase options, but the first accepted path is destructive whole-disk install behind host-scoped approval.

Alternative considered: run Disko separately before install. Rejected for the first workflow because `nixos-anywhere` already coordinates SSH, Disko, install, optional file copy, and reboot in one repeatable path.

### Local network discovery feeds machine references

Alchemy should discover installer targets on the local LAN instead of requiring every IP to be known manually. The LAN discovery provider should scan only configured local interfaces/ranges, collect candidate IP/MAC/hostname/SSH facts, and require the operator to bind each discovered candidate to exactly one `attune-cp-*` machine before destructive install can proceed.

Alternative considered: rely only on mDNS names or hand-entered IP addresses. Rejected because the workflow should be robust while the machines are freshly booted from USB and before Tailscale is present.

### USB install flow is a lifecycle graph, not a paragraph

The USB path should be modeled directly. Building an ISO, selecting/writing removable media, physically booting a ThinkCentre, observing installer SSH, probing disk identity, approving destructive install, and running `nixos-anywhere` are separate resources with dependencies and evidence.

USB media writes and disk installs are irreversible operations. Live providers must require typed approval proof immediately before mutation even when an Alchemy apply operation is requested.

Alternative considered: keep USB instructions only in a runbook. Rejected because the USB path is the riskiest part of the first install and must be visible to agents and tests.

### Tailscale is a provider-owned resource

Host-level Tailscale is mandatory acceptance. The Tailscale provider owns laptop auth, host auth readiness, node identity observation, tailnet reachability, and optional Tailscale SSH checks. Nix enables `tailscaled` and sops-nix provides the secret path; the provider observes and drives enrollment without committing plaintext keys.

Tailscale success is accepted before Kubernetes exists. Losing future Kubernetes must not remove host repair access.

### Comin is the post-install update mechanism

After `nixos-anywhere` installs a host, comin keeps the host converged to the selected repository ref and host flake output. The comin provider observes service health, configured repository/ref, last successful activation, and whether the installed host is tracking the intended host output.

The initial install path may still use `nixos-anywhere`; steady-state host updates should flow through comin unless the host is broken enough to need a repair install.

### K3s and Kubernetes are deferred resources

Existing K3s, Kubernetes, kubeconfig, and desktop guard planning should not block the network bootstrap. They may remain in code behind explicit future/deferred status, but the default network bootstrap acceptance path must finish at SSH + Tailscale + comin readiness across all three hosts.

## Risks / Trade-offs

- x86 builds through an ARM laptop may be slow -> The provider verifies a small x86 build first and reports build-time risk before large ISO/closure builds.
- Local builder setup may require privileged laptop changes -> The lifecycle exposes a typed manual gate and exact desired Nix configuration evidence before mutating operator-machine state.
- Tailscale auth could leak -> Auth keys, login URLs, node keys, and local state flow through SOPS or ignored local evidence paths and are redacted in provider output.
- SOPS recipient bootstrapping can deadlock before a host exists -> Use an explicit bootstrap age recipient copied by `nixos-anywhere` extra-files, then rotate to host-specific recipients after first boot.
- USB/disk mistakes can destroy data -> USB media selection, disk identity, Disko layout, and destructive install each require separate host-scoped evidence.
- comin could apply an unintended repo ref -> The Nix module and provider require an explicit repo URL/ref/flake output, and smoke checks compare observed host identity against desired machine refs.

## Migration Plan

1. Split the current NixOS host modules so `attune-cp-*` can build a minimal network baseline without K3s.
2. Add Disko and sops-nix inputs/modules to `nix/hosts` and define a shared whole-disk UEFI GPT Disko layout with host-approved disk devices.
3. Add SOPS age recipient metadata, ignored local encrypted bootstrap output paths, and sops-nix host configuration for Tailscale auth keys.
4. Add comin configuration to the base host module with repo/ref/flake output inputs that do not require plaintext secrets in git.
5. Extend `packages/home-deployment` with typed operator-machine, x86 builder, SOPS, LAN discovery, USB, Disko, `nixos-anywhere`, Tailscale, and comin provider resources.
6. Change the default home deployment target so K3s/Kubernetes/desktop resources are deferred for this slice.
7. Add a runbook that mirrors the Alchemy graph without becoming the source of truth.
8. Validate with OpenSpec, home-deployment tests/typecheck, Nix evaluation/build probes, and one full dry-run graph before live install.

Rollback is host-by-host: keep host-level SSH/Tailscale as the repair path, use comin rollback/previous generation for bad steady-state updates, and reserve `nixos-anywhere` for reinstall or recovery when the host is intentionally wiped again.

## Open Questions

- Which exact local x86 builder mechanism should the Asahi laptop use first: Nix binfmt/QEMU emulation, an x86_64 NixOS builder VM under emulation, or another locally configured builder path?
- Will Tailscale use reusable, ephemeral, or one-off auth keys for the first install, and should Alchemy create them through an API token or import an operator-created key into SOPS?
- Should the first host SOPS recipient be a generated bootstrap age key, a preseeded host age key, or an SSH host key copied into place by `nixos-anywhere`?
- Is the Attune repository access path for comin public HTTPS, authenticated SSH deploy key, or local mirror?
- Are the ThinkCentre internal disks safe to wipe, and what are their stable `/dev/disk/by-id` paths?

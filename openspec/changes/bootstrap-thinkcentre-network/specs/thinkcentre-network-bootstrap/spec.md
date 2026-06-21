## ADDED Requirements

### Requirement: The Asahi laptop is the operator lifecycle root
Attune SHALL model the Asahi `aarch64-linux` laptop as the operator machine that runs the Alchemy workflow, joins Tailscale first, prepares SOPS keys, configures x86 Nix building, discovers local targets, and deploys the ThinkCentre machines.

#### Scenario: Operator machine is planned
- **WHEN** the home network bootstrap graph is rendered
- **THEN** it includes an operator-machine resource for the Asahi laptop
- **AND** the resource records native system, Nix daemon state, Tailscale state, SOPS key state, local network interfaces, and allowed discovery ranges
- **AND** ThinkCentre install resources depend on the operator-machine readiness resources.

#### Scenario: Laptop Tailscale is prepared
- **WHEN** the operator applies the laptop Tailscale setup transition
- **THEN** the Tailscale provider installs or configures Tailscale through an explicit external operation
- **AND** it verifies the laptop tailnet identity before any host enrollment resources can run.

### Requirement: The three ThinkCentre machines are fixed lifecycle resources
Attune SHALL model exactly the three existing bare-metal ThinkCentre targets `attune-cp-1`, `attune-cp-2`, and `attune-cp-3` as typed Effect/Alchemy machine resources for the network bootstrap slice.

#### Scenario: Machine inventory is planned
- **WHEN** the home network bootstrap graph is rendered
- **THEN** it includes machine resources for exactly `attune-cp-1`, `attune-cp-2`, and `attune-cp-3`
- **AND** it records hostname, target architecture `x86_64-linux`, intended NixOS host output, bootstrap SSH target, post-install SSH target, LAN discovery binding, Tailscale identity slot, SOPS recipient slot, comin identity slot, and evidence-required hardware/network/disk slots
- **AND** it does not infer additional hosts or invent unknown local facts.


### Requirement: Native Alchemy is the user-facing deployment surface
Attune SHALL expose the ThinkCentre day-0 deployment as native Effect/Alchemy resources and stacks rather than any separate Attune orchestration CLI, local helper, scheduler, or command facade.

#### Scenario: Agent steps through deployment
- **WHEN** an agent is asked to use Effect Alchemy to step through the ThinkCentre day-0 deployment
- **THEN** it uses Alchemy's plan, diff/preview, apply, state, and resource lifecycle semantics over Attune resources
- **AND** it does not need to learn custom `attune-home` phase, reconcile, deploy, or helper commands.

#### Scenario: Local helper is proposed
- **WHEN** implementation proposes a local helper CLI, wrapper scheduler, command runner, or compatibility facade for the deployment
- **THEN** the implementation is rejected for the canonical workflow
- **AND** the behavior is implemented as native Alchemy resources backed by Effect services instead.

### Requirement: Effect/Alchemy owns all network bootstrap lifecycle transitions
Attune SHALL use Effect/Alchemy as the lifecycle owner for operator laptop preparation, machine references, LAN discovery, SOPS key and secret preparation, Nix artifacts, USB install media, USB boot observation, installer SSH, disk approval, Disko layout validation, `nixos-anywhere` install, post-install SSH, Tailscale readiness, comin readiness, and network smoke checks.

#### Scenario: Lifecycle graph is inspected
- **WHEN** an operator runs the home network bootstrap plan
- **THEN** lifecycle resources expose stable ids, typed dependencies, provider names, operation classification, status, blockers, evidence requirements, and observed state references
- **AND** no Attune-specific wrapper CLI, local helper, or compatibility state machine encodes install phase ordering outside the Alchemy graph.

#### Scenario: Provider boundary is enforced
- **WHEN** domain lifecycle code needs Nix, SOPS, Tailscale, LAN discovery, machine inventory, SSH, USB media, Disko, `nixos-anywhere`, comin, local state, or evidence capabilities
- **THEN** it calls a typed Effect service/provider contract with Effect Schema decoded inputs and outputs
- **AND** raw subprocess execution is confined to Live provider implementations.

### Requirement: The Asahi laptop provides an x86 Nix builder capability
Attune SHALL configure and verify an `x86_64-linux` Nix builder capability from the Asahi `aarch64-linux` operator laptop before building ThinkCentre installer or host artifacts.

#### Scenario: x86 builder is ready
- **WHEN** the Alchemy Nix provider observes the operator laptop
- **THEN** it records the native system, Nix daemon configuration, configured `x86_64-linux` builder path, and a successful small `x86_64-linux` build probe
- **AND** installer ISO and host closure resources become eligible to build for `x86_64-linux`.

#### Scenario: x86 builder is missing
- **WHEN** the operator laptop cannot build or delegate `x86_64-linux` derivations
- **THEN** the installer ISO and host closure resources remain blocked
- **AND** the blocker identifies the missing laptop-local builder capability instead of suggesting a cloud or unrelated remote builder.

### Requirement: NixOS artifacts target x86_64-linux explicitly
Attune SHALL build installer ISO and host closure artifacts for the ThinkCentres with an explicit `x86_64-linux` target system independent of the operator laptop architecture.

#### Scenario: Artifacts are built from the laptop
- **WHEN** the `x86_64-linux` builder capability is ready
- **THEN** the Nix provider builds the installer ISO and all `attune-cp-*` host outputs as `x86_64-linux`
- **AND** artifact evidence records output paths, store paths, flake refs, checksums where available, and builder identity.

### Requirement: SOPS manages bootstrap and Tailscale secrets
Attune SHALL use SOPS and sops-nix for Tailscale auth material and other bootstrap secrets that need to be deployed into NixOS hosts.

#### Scenario: SOPS secret set is prepared
- **WHEN** the operator prepares bootstrap secrets
- **THEN** the SOPS provider verifies the operator age key, target recipient metadata, `.sops.yaml` creation rules, encrypted secret files, and required secret keys for laptop and host Tailscale enrollment
- **AND** plaintext secret values are never emitted in lifecycle output or committed to git.

#### Scenario: Host recipient is unavailable before install
- **WHEN** a host-specific recipient is not yet known
- **THEN** the graph uses an explicit bootstrap recipient or bootstrap age key transfer resource
- **AND** it records a post-first-boot rotation/updatekeys requirement to move secrets to host-specific recipients.

### Requirement: Tailscale auth is baked into host activation through sops-nix
Attune SHALL configure the NixOS host baseline so Tailscale auth material is available from sops-nix during activation without placing plaintext auth keys in the Nix store or repository.

#### Scenario: Host Tailscale secret is rendered
- **WHEN** a ThinkCentre host configuration is evaluated
- **THEN** it imports sops-nix, declares the Tailscale auth secret, and wires Tailscale enrollment to the decrypted runtime secret path
- **AND** the secret is available only through runtime secret material such as `/run/secrets/...`.

#### Scenario: Host enrolls in Tailscale
- **WHEN** the installed host first boots with the decrypted Tailscale secret available
- **THEN** the Tailscale provider observes successful enrollment and node identity
- **AND** the auth key is not exposed in systemd logs, provider output, or git.

### Requirement: Local network discovery feeds machine binding
Attune SHALL discover candidate installer targets on the configured local network and require explicit binding of each candidate to one ThinkCentre machine before installation.

#### Scenario: LAN discovery runs
- **WHEN** the LAN discovery provider scans configured local interfaces or ranges
- **THEN** it records candidate IP addresses, MAC addresses, hostnames when available, SSH reachability, installer identity hints, and scan timestamp
- **AND** it does not scan networks outside the configured allowlist.

#### Scenario: Candidate is bound to a machine
- **WHEN** the operator binds a discovered candidate to `attune-cp-1`, `attune-cp-2`, or `attune-cp-3`
- **THEN** the machine resource records the binding evidence
- **AND** installer SSH and destructive install resources for that machine use only the bound target.

### Requirement: Disko owns disk layout inside nixos-anywhere installs
Attune SHALL use Disko configuration embedded in the NixOS host flake as the disk partitioning and formatting source for `nixos-anywhere` installs.

#### Scenario: Disko layout is selected
- **WHEN** a host install is planned
- **THEN** the graph validates that the host flake output includes a Disko layout with the operator-approved disk identity
- **AND** the layout is a simple whole-disk UEFI GPT baseline unless a later approved change modifies it.

#### Scenario: Disk identity is not approved
- **WHEN** Disko would target an unknown, placeholder, stale, or wrong-host disk path
- **THEN** Disko and `nixos-anywhere` install resources remain blocked
- **AND** no destructive Disko phase is approved.

### Requirement: USB installation is modeled as gated lifecycle resources
Attune SHALL model the USB-based install flow as typed lifecycle resources with explicit safe, external, and irreversible operation boundaries.

#### Scenario: USB install flow is unblocked safely
- **WHEN** a ThinkCentre is being prepared for install
- **THEN** the graph requires installer ISO readiness, USB media selection evidence, USB media write approval, machine boot confirmation, local network discovery binding, installer SSH reachability, disk identity probe evidence, Disko layout validation, and destructive disk approval before `nixos-anywhere` can run
- **AND** each gate is scoped to exactly one machine or one removable media device.

#### Scenario: Destructive proof is absent
- **WHEN** disk identity evidence or destructive install approval is missing, stale, or associated with another host
- **THEN** the `nixos-anywhere` resource remains blocked
- **AND** no wipe, partition, install, or activation command is emitted as approved.

### Requirement: NixOS-anywhere is an extensively wrapped Effect provider transition
Attune SHALL invoke `nixos-anywhere` only through a typed Effect provider owned by the Alchemy lifecycle graph, with Disko, extra files, phases, target facts, and install evidence modeled explicitly.

#### Scenario: NixOS-anywhere install is applied
- **WHEN** all builder, artifact, SOPS, USB, LAN binding, installer SSH, Disko, disk, and destructive approval dependencies are satisfied for a host
- **THEN** the `nixos-anywhere` provider applies the host's `x86_64-linux` NixOS flake output to the installer SSH target
- **AND** it normalizes command identity, target machine id, Disko mode, phase list, extra-files bundle identity, output, exit code, timing, and evidence references into lifecycle state.

#### Scenario: Bootstrap files are required
- **WHEN** SOPS bootstrap keys, Tailscale secret material, SSH keys, or other first-boot files must be present on the installed system
- **THEN** the `nixos-anywhere` provider stages them through a typed extra-files resource or equivalent provider-owned input
- **AND** the extra-files identity is recorded without exposing plaintext secret contents.

### Requirement: Installed hosts provide minimal NixOS network baseline
Attune SHALL configure each ThinkCentre with a minimal NixOS baseline for network bootstrap rather than requiring Kubernetes.

#### Scenario: Host baseline is evaluated
- **WHEN** a host configuration is evaluated for `attune-cp-1`, `attune-cp-2`, or `attune-cp-3`
- **THEN** it enables SSH, the `attune` wheel user, Tailscale, sops-nix, comin, base operator packages, time sync, Disko layout, firewall rules for SSH and Tailscale, and stable host identity
- **AND** K3s, Kubernetes resources, kubeconfig access, desktop GPU worker setup, and public ingress are not required for network bootstrap acceptance.

### Requirement: Tailscale is a provider-owned host access resource
Attune SHALL model laptop and host-level Tailscale auth, node identity, reachability, and optional Tailscale SSH as typed Effect provider resources.

#### Scenario: Tailscale access is ready
- **WHEN** a ThinkCentre has completed installation and post-install SSH is reachable
- **THEN** the Tailscale provider verifies `tailscaled` service health, node identity, tailnet reachability, and SSH reachability over the Tailscale address or MagicDNS name
- **AND** this access does not depend on Kubernetes being installed or healthy.

#### Scenario: Tailscale secrets are handled
- **WHEN** Tailscale auth is required
- **THEN** auth keys, login URLs, node keys, and local Tailscale state are referenced only through SOPS, local secret paths, or evidence records
- **AND** no Tailscale secret material is committed to the repository in plaintext.

### Requirement: Comin owns steady-state host convergence after install
Attune SHALL configure and observe comin as the steady-state mechanism that keeps each installed ThinkCentre converged to the selected repository ref and host flake output.

#### Scenario: Comin readiness is verified
- **WHEN** a ThinkCentre is installed and reachable
- **THEN** the comin provider verifies service health, configured repository URL, configured ref, configured host flake output, last successful activation, and current machine identity
- **AND** the host is considered ready for later Kubernetes work only after comin readiness passes.

#### Scenario: Comin cannot access repository
- **WHEN** comin lacks repository access or cannot activate the intended host output
- **THEN** network bootstrap remains incomplete for that host
- **AND** the blocker identifies repository access, ref, flake output, or activation failure without exposing secrets.

### Requirement: Local evidence and secrets stay out of git
Attune SHALL persist only non-secret schemas, encrypted SOPS files, public recipient metadata, templates, and source code in the repository while keeping local deployment state and secret-bearing evidence outside git.

#### Scenario: Local artifacts are generated
- **WHEN** builder evidence, USB evidence, disk probes, Tailscale auth references, comin access references, SSH keys, host keys, SOPS private age keys, or deployment state are created
- **THEN** they are written to ignored local paths, encrypted SOPS files, or external secret paths according to their secrecy level
- **AND** `.gitignore` protects plaintext and private-key artifacts from accidental commit.

### Requirement: Network bootstrap smoke checks prove the accepted slice
Attune SHALL provide smoke checks that prove basic network connectivity across the laptop and all three ThinkCentres without requiring Kubernetes.

#### Scenario: Network bootstrap is accepted
- **WHEN** the operator runs the network bootstrap smoke check after all installs
- **THEN** it verifies laptop Tailscale identity, post-install SSH, Tailscale reachability, comin readiness, expected hostnames, expected target architecture, expected machine ids, and SOPS secret availability for all three ThinkCentres
- **AND** it reports K3s, Kubernetes, kubeconfig, desktop worker, and public ingress as deferred rather than failed.

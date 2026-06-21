## ADDED Requirements

### Requirement: Host universe is fixed to the existing attune-cp control plane
Attune SHALL model bare-metal NixOS provisioning only for the existing hosts `attune-cp-1`, `attune-cp-2`, and `attune-cp-3`.

#### Scenario: Inventory is rendered
- **WHEN** the home provisioning inventory is rendered
- **THEN** it enumerates exactly `attune-cp-1`, `attune-cp-2`, and `attune-cp-3`
- **AND** it does not add, infer, or template additional hosts.

#### Scenario: Host facts are unknown
- **WHEN** hardware, network, disk, Tailscale, K3s, token, host-key, or other local facts have not been collected from local evidence
- **THEN** the inventory records those slots as unknown, evidence-required, or blocked
- **AND** it does not fabricate values to satisfy required fields.

### Requirement: Inventory records actionable provisioning slots without fabricating local facts
Attune SHALL define an actionable per-host inventory model for the three bare-metal NixOS targets.

#### Scenario: Per-host inventory is inspected
- **WHEN** an operator or agent inspects any `attune-cp-*` inventory record
- **THEN** it includes hostname, bare-metal NixOS target, shared Disko layout reference, `attune` bootstrap/wheel user, bootstrap SSH identity plan, per-host SSH/Tailscale/K3s identity records or evidence references, and evidence-required hardware/network slots needed by provisioning
- **AND** it records human operator identity only inside approval evidence, not as host identity.

#### Scenario: Identity model is rendered
- **WHEN** identities are rendered for planning
- **THEN** the only modeled host user is the existing `attune` bootstrap/wheel user plus per-host SSH, Tailscale, and K3s identities
- **AND** concrete Tailscale auth keys, K3s tokens, local host keys, secret paths, or network reservations are not invented or committed.

### Requirement: Shared Disko layout is simple whole-disk UEFI GPT
Attune SHALL use one shared Disko configuration for all three `attune-cp` hosts.

#### Scenario: Disko layout is evaluated
- **WHEN** the NixOS host flake is evaluated for any `attune-cp-*` host
- **THEN** the host uses the shared unencrypted whole-disk UEFI GPT Disko layout
- **AND** the layout contains an EFI System Partition plus one root filesystem
- **AND** the selected target disk is supplied from the operator-approved per-host disk proof rather than from `hardware-placeholder.nix` or a `REPLACE_ME` path.

#### Scenario: Placeholder disk is present
- **WHEN** `hardware-placeholder.nix`, `/dev/disk/by-id/REPLACE_ME_*`, or another placeholder target would be used for an approved install target or destructive command input
- **THEN** planning remains blocked
- **AND** no wipe, partition, install, or activation command is emitted as approved.

### Requirement: Disk identity is approved from local probe evidence at gate time
Attune SHALL approve and persist the selected target disk identity from local probe evidence for each host.

#### Scenario: Disk probe evidence is recorded
- **WHEN** the operator runs the disk identity probe for a host
- **THEN** the resulting evidence records selected device path, stable `/dev/disk/by-id` path when available, udev serial when available, model, size, `lsblk` data, probe timestamp, operator context, and probe/command identity
- **AND** the evidence is associated with exactly one host and one disk-identity approval gate.

#### Scenario: Disk identity is approved
- **WHEN** the operator approves a disk identity gate
- **THEN** the approval persists the probed disk identity in local deployment state or evidence references
- **AND** subsequent destructive provisioning for that host depends on the native gate proof for that exact host and disk identity.

#### Scenario: Current disk probe differs from approval
- **WHEN** the current probe differs from the approved evidence by selected device path, stable by-id path when present, udev serial when present, model, size, or host association
- **THEN** wipe, Disko partitioning, NixOS-anywhere install, and host activation remain blocked
- **AND** the plan emits a deterministic blocker explaining the stale or changed disk evidence.

#### Scenario: Approval belongs to another host
- **WHEN** a disk approval proof belongs to a different host or gate id
- **THEN** it is rejected for the current host
- **AND** destructive provisioning remains blocked.

### Requirement: Native Effect Alchemy gates own approvals and proof
Attune SHALL use Effect Alchemy's native lifecycle gate/plan-loop mechanism for provisioning approvals.

#### Scenario: Approval is required
- **WHEN** inventory confirmation, installer/USB boot confirmation, disk identity approval, destructive wipe/install approval, identity-affecting changes, or non-secret token/auth readiness is required
- **THEN** the Alchemy lifecycle graph exposes a typed native gate resource with machine-readable requirements
- **AND** dependent resources remain blocked until the native gate proof is present.

#### Scenario: Legacy confirmation state exists
- **WHEN** compatibility state or legacy `confirmedGateIds` are used during migration
- **THEN** they are treated only as wrappers or projections of the native gate proof
- **AND** irreversible or identity-affecting providers do not rely solely on legacy confirmation booleans.

#### Scenario: Destructive provider is Live
- **WHEN** a Live provider would wipe, partition, install, activate, or change host identity
- **THEN** it requires typed approval proof from the native gate resource
- **AND** it refuses to mutate external state without that proof even if a destructive CLI flag is present.

### Requirement: Host activation depends directly on inventory and gates
Attune SHALL make NixOS-anywhere and host activation resources depend directly on inventory, evidence, and gate resources.

#### Scenario: Host activation is planned
- **WHEN** a host activation or NixOS-anywhere resource becomes eligible
- **THEN** its dependencies include host inventory, installer reachability, approved disk identity, destructive wipe/install approval, and any required non-secret token/auth readiness gate
- **AND** eligibility is not determined only by phase ordering or previous checklist position.

#### Scenario: Evidence or approval is missing
- **WHEN** required evidence or approval proof is missing
- **THEN** `next-step --json` returns `SafeProbe`, `ManualGate`, or `Blocked` with deterministic machine-readable blockers and next safe actions
- **AND** it does not return an auto-runnable destructive apply step.

### Requirement: Provider modes preserve safety semantics
Attune SHALL keep DryRun, Test, and Live provider modes safe and explicit.

#### Scenario: DryRun mode is used
- **WHEN** DryRun mode evaluates provisioning
- **THEN** it emits only safe probes, blockers, and planned commands
- **AND** it never mutates disks, host identities, Tailscale state, K3s state, Kubernetes state, or local secret material.

#### Scenario: Test mode is used
- **WHEN** Test mode evaluates provisioning
- **THEN** it simulates evidence, blockers, proof checks, and successful gated planning in an in-memory world
- **AND** it does not spawn subprocesses or touch external systems.

#### Scenario: Live mode is used
- **WHEN** Live mode performs an external or irreversible transition
- **THEN** the provider validates native typed approval proof immediately before mutation
- **AND** it normalizes command identity, output, exit code, and evidence references into typed lifecycle output.

### Requirement: Local evidence and state schema is explicit and non-secret
Attune SHALL persist local evidence and approval state with a versioned schema and without committing secrets.

#### Scenario: Gate evidence is stored
- **WHEN** local state records a gate proof or approval
- **THEN** it includes schema version, gate id, related host/resource ids, approval decision, operator identity, evidence payload or file references, relevant probe/plan/command identity, and timestamp
- **AND** secret values such as Tailscale auth keys, K3s tokens, private SSH keys, local host keys, kubeconfigs, and local deployment state are excluded from git.

#### Scenario: Git ignore rules are evaluated
- **WHEN** local provisioning artifacts are generated
- **THEN** `.gitignore` excludes local deployment state, evidence artifacts, Alchemy state, host key material, SSH private keys, kubeconfigs, and host-local secret material
- **AND** the repository contains only non-secret schemas, templates, runbooks, and source code.

### Requirement: Existing provisioning source surfaces are aligned
Attune SHALL define the actionable model in the existing home-deployment and NixOS provisioning surfaces before destructive provisioning is enabled.

#### Scenario: Source surfaces are updated
- **WHEN** the model is implemented
- **THEN** `packages/home-deployment` owns inventory, lifecycle resources, provider gates, CLI next-step output, local state schema, and tests
- **AND** `nix/hosts` owns the `attune-cp-*` NixOS host flake and the shared Disko layout module
- **AND** `docs/platform/home-cluster-bootstrap-runbook.md` describes the operator flow without asserting uncollected local facts
- **AND** `.gitignore` protects generated local state, evidence, Alchemy state, host key material, kubeconfigs, and secrets.

#### Scenario: Legacy helper is used
- **WHEN** `scripts/infra/attune-nixos-bootstrap` or another compatibility helper is retained
- **THEN** it is documented as non-primary
- **AND** it does not emit `REPLACE_ME` paths or bypass native gate proof.

### Requirement: Implementation tests cover destructive-gate safety
Attune SHALL test the provisioning safety model before enabling destructive bare-metal provisioning.

#### Scenario: Safety tests run
- **WHEN** home-deployment tests run
- **THEN** they cover missing evidence, stale or changed disk evidence, wrong-host approvals, missing destructive approval or flag, DryRun/Test safety, and successful gated planning for all three hosts.

#### Scenario: Nix host checks run
- **WHEN** the NixOS host flake check runs
- **THEN** the shared Disko layout evaluates for `attune-cp-1`, `attune-cp-2`, and `attune-cp-3`
- **AND** no approved destructive target uses `hardware-placeholder.nix` or `/dev/disk/by-id/REPLACE_ME_*`.

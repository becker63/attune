## ADDED Requirements

### Requirement: Host inventory is captured before install
Attune SHALL provide an inventory workflow for exactly the three existing ThinkCentre nodes before installing the cluster.

#### Scenario: Inventory is collected
- **WHEN** the operator runs the inventory helper or fills the inventory template
- **THEN** the inventory records hostname, intended role, bootstrap SSH identity plan, Tailscale identity plan, and evidence-required slots for MAC address, network reservation, hardware facts, and disk identity
- **AND** unknown local facts remain unknown or blocked until collected from local evidence
- **AND** disk identity is approved from local probe evidence at gate time rather than from a fabricated or placeholder predeclaration
- **AND** the inventory file contains no secret tokens.

### Requirement: NixOS installer image can be generated
Attune SHALL provide a cross-platform entrypoint for generating or documenting NixOS installer media for the ThinkCentre nodes.

#### Scenario: ISO generation runs
- **WHEN** the operator runs the ISO generation script from Linux or WSL
- **THEN** it builds or fetches a pinned NixOS installer image
- **AND** records the output path and checksum.

### Requirement: ThinkCentre hosts are declaratively configured
Attune SHALL define NixOS host configurations for the three ThinkCentre control-plane nodes.

#### Scenario: Host config is rendered
- **WHEN** the operator renders the NixOS configuration
- **THEN** each host has a stable hostname, SSH enabled, Tailscale enabled, K3s server settings, persistent storage settings, and node labels
- **AND** no Kubernetes runtime behavior is encoded in Nix beyond host/service configuration.

### Requirement: K3s HA control plane is bootstrapped
Attune SHALL bootstrap a K3s HA control plane across the three ThinkCentre nodes.

#### Scenario: Cluster is healthy
- **WHEN** all three nodes are installed and joined
- **THEN** `kubectl get nodes` shows three Ready control-plane nodes
- **AND** the K3s datastore is HA-capable with the three server nodes participating.

### Requirement: Bootstrap smoke checks are scripted
Attune SHALL provide smoke checks that separate host, network, K3s, and typed platform failures.

#### Scenario: Smoke checks run
- **WHEN** the operator runs the bootstrap smoke script
- **THEN** it checks Tailscale SSH reachability, K3s API reachability, node readiness, kubeconfig context, and ability to render typed platform manifests.

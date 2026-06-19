## ADDED Requirements

### Requirement: Host-level Tailscale access is installed
Attune SHALL configure Tailscale at the host level for every durable control-plane node.

#### Scenario: Host access works
- **WHEN** the ThinkCentre nodes are installed
- **THEN** each node is reachable over Tailscale SSH or SSH over Tailscale
- **AND** this access does not depend on Kubernetes being healthy.

### Requirement: Kubernetes access over Tailscale is planned
Attune SHALL define how Kubernetes API and selected cluster networks are reachable through Tailscale.

#### Scenario: Remote kubeconfig is used
- **WHEN** the operator is away from the home LAN
- **THEN** they can use a kubeconfig endpoint reachable over Tailscale
- **AND** access can be revoked without reinstalling the cluster.

### Requirement: Tailscale subnet/router deployment is typed or templated
Attune SHALL manage any Kubernetes Tailscale operator/subnet-router resources through typed platform code or a checked template with validation.

#### Scenario: Connector resources are rendered
- **WHEN** the typed platform deployment renders remote-access resources
- **THEN** the output includes explicit routes, labels, namespace, service account scope, and secret references
- **AND** no auth key is committed to the repository.

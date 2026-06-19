## ADDED Requirements

### Requirement: Effect/Alchemy owns the home deployment graph
Attune SHALL model home infrastructure deployment as typed Effect/Alchemy resources.

#### Scenario: Deployment plan is rendered
- **WHEN** the operator plans the home cluster deployment
- **THEN** the plan includes ThinkCentre host install resources, Nix build artifacts, K3s bootstrap/join resources, host-level Tailscale checks, typed Kubernetes resources, and Windows desktop guard deployment resources
- **AND** each resource has schema-checked inputs, explicit dependencies, and reconcile status.

#### Scenario: Manual step is required
- **WHEN** a lifecycle step requires physical operator action such as inserting a USB stick, selecting a boot device, or confirming destructive disk install
- **THEN** the Alchemy plan exposes a typed manual gate
- **AND** reconciliation does not continue past the gate until the operator records the required confirmation or observed state.

### Requirement: NixOS-anywhere is wrapped as a typed deployment resource
Attune SHALL invoke NixOS-anywhere through an Effect/Alchemy resource rather than as an ad hoc shell step.

#### Scenario: ThinkCentre is ready for install
- **WHEN** the operator has booted a ThinkCentre into an SSH-reachable installer environment
- **THEN** the Alchemy resource runs the configured NixOS-anywhere command for the target host
- **AND** captures flake URI, host configuration name, SSH target, disk layout reference, expected host key behavior, install log path, and post-install smoke checks.

#### Scenario: Install cannot proceed safely
- **WHEN** the target host is not reachable, disk identity does not match inventory, required secrets are missing, or destructive confirmation has not been recorded
- **THEN** the resource remains blocked with an actionable reason
- **AND** no disk formatting or install command is executed.

### Requirement: Effect/Alchemy renders local platform resources
Attune SHALL use the existing Effect/Alchemy Kubernetes DSL to render local compute stack resources.

#### Scenario: Local compute stack is rendered
- **WHEN** the operator runs the typed platform render script
- **THEN** it renders CRDs, namespace, resource quotas, control-plane resources, CPU worker pool resources, and optional GPU worker pool resources
- **AND** the rendered objects are schema-checked before apply.

### Requirement: Typed deployment supports dry-run and apply
Attune SHALL provide a workflow that can render, diff/dry-run, and apply platform resources.

#### Scenario: Dry-run is executed
- **WHEN** the operator runs the deployment script in dry-run mode
- **THEN** it validates generated Kubernetes objects and shows the intended object keys without mutating the cluster.

### Requirement: Node labels match worker pools
Attune SHALL align NixOS/K3s node labels with `platform-alchemy-k8s` worker pool selectors.

#### Scenario: Worker pool is scheduled
- **WHEN** the `thinkcentre-cpu` worker pool is applied
- **THEN** its node selector matches labels present on the ThinkCentre nodes.

#### Scenario: GPU pool is scheduled
- **WHEN** the `desktop-gpu` worker pool is applied
- **THEN** its node selector and tolerations match labels and taints present on the desktop worker node.

### Requirement: Windows desktop deployment is wrapped as a typed deployment resource
Attune SHALL model Windows desktop guard installation and startup as an Effect/Alchemy deployment resource.

#### Scenario: Desktop guard is deployed
- **WHEN** the operator applies the Windows desktop deployment resource
- **THEN** it builds or references the Nix-generated guard artifacts, installs or updates the Windows autostart entry, validates Kubernetes/Tailscale connectivity, and reports the guard version and configured resource profiles
- **AND** Windows-specific commands remain generated glue rather than the source of policy.

## ADDED Requirements

### Requirement: Rego as law layer
Attune SHALL use Rego for hard safety laws over structured desired state, while keeping evolving product decisions in Effect.

#### Scenario: Rego boundary is documented
- **WHEN** platform or agent policy is designed
- **THEN** the boundary states that Effect decides intent, Effect/Alchemy renders desired state, Rego decides whether desired state is allowed, and Kubernetes enforces allowed state
- **AND** irreversible safety constraints belong in Rego while evolving product decisions belong in Effect

### Requirement: Kubernetes workload safety policies
Attune SHALL define Rego policy families for Kubernetes workload safety.

#### Scenario: Repo-discovery workload is checked
- **WHEN** a rendered Kubernetes workload is labeled as Attune repo discovery or expensive analysis
- **THEN** Rego denies privileged containers, missing resource requests or limits, missing isolation profile, hostPath mounts, Docker socket mounts, root execution, unapproved images, missing run labels, and missing budget reservation annotations

### Requirement: Worker class and expensive-run policies
Attune SHALL define Rego policy families for worker class correctness and expensive-run admission.

#### Scenario: Expensive run is rendered
- **WHEN** an overnight, GPU, deep discovery, or other expensive workload is rendered
- **THEN** Rego requires the appropriate worker labels, max duration, checkpoint policy, resource bounds, idempotency key, budget reservation, and admitted run stamp

### Requirement: Agent change-set policies
Attune SHALL define Rego policy families for automatic agent changes.

#### Scenario: Agent proposes a change
- **WHEN** a local, Factory, cloud, or Codex agent proposes a change set
- **THEN** Rego denies routes that violate the actor's permissions, including local model edits to Rego policy, scheduler admission, product runtime semantics, Nix boundary files, or high-risk auto-merge paths

### Requirement: Nix boundary policies
Attune SHALL define Rego policy families that keep Nix responsible for reproducibility rather than product behavior.

#### Scenario: Nix change is evaluated
- **WHEN** a change touches Nix files or Nix-generated image metadata
- **THEN** Rego enforces that Nix may define toolchains, images, pins, and low-level build helpers
- **AND** Rego denies Nix changes that define scheduler policy, product runtime behavior, Kubernetes run classes, or Rego policy decisions

### Requirement: Manifest and OptimizationPacket policies
Attune SHALL define Rego policy families for rendered manifests and OptimizationPacket routes.

#### Scenario: Rendered or routed state is checked
- **WHEN** Attune renders platform resources or routes an OptimizationPacket
- **THEN** Rego enforces labels, namespace-scoped service accounts, no wildcard RBAC, no unapproved public services, no latest tags, digest-pinned images where required, and risk-appropriate agent/human ownership

### Requirement: Effect Schema to OPA schema bridge
Attune SHALL use Effect Schema as the source of truth for Rego input typing.

#### Scenario: Rego package is generated or checked
- **WHEN** a Rego policy package is built
- **THEN** Effect Schema produces JSON Schema for OPA inputs, fixtures, policy-test helpers, and documentation
- **AND** OPA checks use those schemas where feasible

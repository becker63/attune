## ADDED Requirements

### Requirement: Effect-native platform ADR
The repository SHALL include an ADR documenting that Attune will not keep KCL or Crossplane in the core near-term local compute platform path.

#### Scenario: Effect-native ADR is created
- **WHEN** this documentation change is applied
- **THEN** an ADR exists under `docs/adr/` for Effect-native platform direction instead of KCL/Crossplane
- **AND** it covers context from the previous KCL/Crossplane experiment, why KCL was attractive, why it is not the right core path now, why Crossplane is not initially needed, what replaces them, and what would justify reintroducing Crossplane later

### Requirement: Rego policy boundary ADR
The repository SHALL include an ADR documenting Rego as the serious policy boundary.

#### Scenario: Rego ADR is created
- **WHEN** this documentation change is applied
- **THEN** an ADR exists under `docs/adr/` for the Rego policy boundary
- **AND** it explains why Rego is allowed to feel different, what Effect may generate around Rego, what humans write in Rego, and which policies require human review

### Requirement: Nix and Kubernetes boundary ADR
The repository SHALL include an ADR documenting that Nix supplies hermetic artifacts while Effect/Alchemy owns typed Kubernetes resource composition.

#### Scenario: Nix boundary ADR is created
- **WHEN** this documentation change is applied
- **THEN** an ADR exists under `docs/adr/` for the Nix/Kubernetes boundary
- **AND** it documents what Nix may define, what Nix must not define, how Nix-built images flow into Kubernetes workloads, how Effect/Alchemy references image digests, and why Kubernetes manifests should not be generated primarily from Nix

#### Scenario: Nix forbidden responsibilities are documented
- **WHEN** the ADR lists forbidden Nix responsibilities
- **THEN** it states that Nix must not define run admission logic, scheduler heuristics, budget reservation behavior, worker lease semantics, retry/resume policy, agent optimization policy, product configuration, Kubernetes object composition beyond low-level image/build helpers, or Rego policy decisions

### Requirement: Local cluster sketch
The repository SHALL include `docs/platform/local-cluster-sketch.md` documenting the intended local cluster shape.

#### Scenario: Platform sketch is created
- **WHEN** this documentation change is applied
- **THEN** `docs/platform/local-cluster-sketch.md` exists
- **AND** it covers ThinkCentre cluster role, desktop GPU role, WSL worker role, Tailscale or Cloudflare ingress options, k3s assumptions, durable components, and intermittent components

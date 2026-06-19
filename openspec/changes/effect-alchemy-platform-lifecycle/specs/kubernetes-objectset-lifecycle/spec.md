## ADDED Requirements

### Requirement: Kubernetes object sets have lifecycle operations
`platform-alchemy-k8s` SHALL expose Kubernetes object-set render, validate, read, diff, apply, and delete lifecycle operations through `KubernetesProvider`.

#### Scenario: Test provider applies an object set
- **WHEN** a KubernetesObjectSet is applied with the Test provider
- **THEN** the provider validates objects, computes a typed diff, records an in-memory applied state, and returns evidence without contacting a cluster.

#### Scenario: DryRun provider handles apply
- **WHEN** a KubernetesObjectSet apply is requested in DryRun mode
- **THEN** the provider renders, validates, and diffs intended objects
- **AND** it does not mutate a cluster.

### Requirement: Object-set resources are Alchemy lifecycle resources
Attune SHALL model Attune CRDs, platform namespaces, worker pools, and smoke object sets as Alchemy resources.

#### Scenario: Platform stack is deployed
- **WHEN** the platform stack lifecycle runs
- **THEN** CRD sets, namespace sets, worker-pool sets, and smoke-check object sets expose desired objects, observed objects, diff, apply/delete status, and evidence refs.

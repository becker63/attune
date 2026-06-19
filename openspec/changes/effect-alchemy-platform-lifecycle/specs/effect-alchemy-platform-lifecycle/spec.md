## ADDED Requirements

### Requirement: Alchemy owns the platform lifecycle graph
Attune SHALL use Alchemy as the lifecycle owner for the home platform desired state, observed state, transitions, blockers, diffs, create/update/delete, and destroy operations.

#### Scenario: CLI requests a plan
- **WHEN** an operator runs `attune-home plan`
- **THEN** the CLI invokes the Alchemy lifecycle program
- **AND** the response includes typed resources with stable ids, dependencies, desired inputs, observed states, lifecycle status, operation classification, evidence refs, and provider errors.

#### Scenario: CLI does not orchestrate phases
- **WHEN** an operator runs deploy or destroy
- **THEN** the CLI delegates to the lifecycle program
- **AND** the CLI does not encode phase ordering independent from the Alchemy resource graph.

### Requirement: Lifecycle resources expose typed state
Each platform resource SHALL expose lifecycle status `planned | ready | blocked | applying | applied | failed | destroying | destroyed`.

#### Scenario: Resource is blocked
- **WHEN** dependencies, provider observations, safety requirements, or manual proofs are missing
- **THEN** the resource status is `blocked`
- **AND** blockers are machine-readable.

### Requirement: Required home platform resources are modeled
Attune SHALL model HostInventory, ManualGate, NixBuildArtifact, InstallerIso, SshReachability, HostActivation, TailscaleHostAccess, K3sServerNode, K3sJoinSecret, KubeconfigAccess, KubernetesApiReachable, KubernetesObjectSet, AttuneCrdSet, PlatformNamespaceSet, AttuneWorkerPool, DesktopWorkerRegistration, and SmokeCheck resources.

#### Scenario: Home target is planned
- **WHEN** the home target is planned
- **THEN** every required resource kind appears in the lifecycle graph or is explicitly marked deferred with a blocker and migration note.

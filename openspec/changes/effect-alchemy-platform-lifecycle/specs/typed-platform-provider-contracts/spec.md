## ADDED Requirements

### Requirement: Providers are Effect capability boundaries
Attune SHALL expose external platform capabilities only through typed Effect provider contracts.

#### Scenario: Domain code needs a platform capability
- **WHEN** domain lifecycle code needs Nix, SSH, host activation, Tailscale, K3s, Kubernetes, Windows desktop registration, state, or journaling
- **THEN** it calls the typed provider contract
- **AND** it does not construct raw shell strings or invoke generic command-display execution directly.

### Requirement: Providers have Live, DryRun, and Test layers
Every platform provider SHALL have Live, DryRun, and Test implementations.

#### Scenario: DryRun layer is used
- **WHEN** a DryRun provider method is called
- **THEN** it returns a typed intended transition or observation
- **AND** it does not mutate external state.

#### Scenario: Test layer is used
- **WHEN** a Test provider layer runs a full deployment simulation
- **THEN** it uses an in-memory world model
- **AND** it does not spawn subprocesses or touch external systems.

### Requirement: Live subprocesses are hidden behind providers
Live providers MAY use subprocesses internally.

#### Scenario: Live provider shells out
- **WHEN** a Live provider invokes a subprocess
- **THEN** the subprocess command, output, exit code, and evidence refs are normalized into typed provider output
- **AND** raw command display is not exposed as the lifecycle resource's domain API.

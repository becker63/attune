## ADDED Requirements

### Requirement: Mutable Day-0 providers observe before applying
Attune SHALL make mutable Day-0 provider resources idempotent by observing desired state before running Live mutation commands.

#### Scenario: External resource already matches desired state
- **WHEN** a mutable External resource has an observation command
- **AND** the observation command succeeds in Live mode
- **THEN** the provider returns Observed evidence
- **AND** it does not run the mutation command.

#### Scenario: External resource is blocked
- **WHEN** an External resource is blocked by missing dependencies or known invalid inputs
- **THEN** the provider returns a Blocked transition
- **AND** it does not run mutation commands.

### Requirement: Destructive resources are idempotent by observation
Attune SHALL NOT make destructive Day-0 resources idempotent by repeating destructive commands.

#### Scenario: Host is already installed as desired
- **WHEN** a `nixos-anywhere-install` resource observes that the host is already installed as the desired host
- **THEN** the provider returns Observed or Applied state without requiring a new disk wipe approval
- **AND** it does not run `nixos-anywhere`.

#### Scenario: Host is not already installed as desired
- **WHEN** a `nixos-anywhere-install` resource cannot observe the desired installed host state
- **THEN** the provider requires current disk proof and exact typed destructive approval before running `nixos-anywhere`.

#### Scenario: USB media already contains the desired installer
- **WHEN** an installer USB write resource observes that the selected block device already contains the desired ISO prefix
- **THEN** the provider returns Observed or Applied state without requiring another write.

#### Scenario: USB media does not contain the desired installer
- **WHEN** an installer USB write resource cannot observe the desired installer media state
- **THEN** the provider requires exact typed USB write approval before writing to the selected block device.

### Requirement: Provider evidence remains redacted
Attune SHALL record command identity, timing, and bounded redacted output for provider transitions without exposing secret material.

#### Scenario: Secret-bearing resource is observed
- **WHEN** a Tailscale or SOPS resource observes secret-bearing local files
- **THEN** the provider evidence identifies the checked resource and command shape
- **AND** it does not include plaintext auth keys, age private keys, OAuth client secrets, or decrypted SOPS values.

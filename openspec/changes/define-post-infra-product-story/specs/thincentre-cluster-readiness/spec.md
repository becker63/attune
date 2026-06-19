## ADDED Requirements

### Requirement: ThinCentre cluster setup checklist
Attune SHALL define human setup tasks for preparing a local ThinCentre cluster.

#### Scenario: Cluster setup begins
- **WHEN** the user is ready to prepare local machines
- **THEN** the work ledger includes tasks to inventory machines, prepare NixOS installer media, install the base OS, configure networking, join k3s, label workers, and run smoke workloads

### Requirement: Human physical actions are explicit
Attune SHALL distinguish automation-preparable work from physical setup work.

#### Scenario: USB install is required
- **WHEN** a machine must be installed or rebooted from USB
- **THEN** the task is marked human-owned
- **AND** automation may provide scripts, checksums, generated configs, and exact commands but must not pretend it can perform physical USB steps remotely

### Requirement: Safe USB helper design
Attune SHALL plan a safe USB preparation helper rather than a destructive default script.

#### Scenario: USB helper is implemented
- **WHEN** a user runs the helper
- **THEN** it downloads and verifies the intended NixOS ISO, lists candidate removable devices, prints the exact write command, and requires explicit device selection and confirmation before writing
- **AND** it records ISO version and checksum for the cluster setup ledger

### Requirement: Worker class readiness
Attune SHALL define validation for each node joining the cluster.

#### Scenario: Node joins cluster
- **WHEN** a ThinCentre node joins the local cluster
- **THEN** it receives the intended worker labels, passes a smoke workload, reports resource capacity, and records whether it is suitable for control-plane, CPU worker, intermittent worker, or other future class

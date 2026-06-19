## ADDED Requirements

### Requirement: Vacation-safe runbook exists
Attune SHALL include a concise runbook for remote cluster operation while Taylor is away.

#### Scenario: Runbook is opened
- **WHEN** the operator opens the runbook
- **THEN** it lists host access commands, kubeconfig setup, health checks, restart commands, backup/restore notes, and known failure modes.

### Requirement: Etcd and cluster backup path is documented
Attune SHALL document a backup path for K3s/etcd state before remote iteration depends on the cluster.

#### Scenario: Backup is taken
- **WHEN** the backup command is run
- **THEN** it produces a timestamped snapshot or documented K3s snapshot artifact
- **AND** the restore location and command path are documented.

### Requirement: Rollback and remote repair are explicit
Attune SHALL document rollback paths for host config, K3s service, Tailscale, and typed platform applies.

#### Scenario: Deploy breaks remote access
- **WHEN** a deploy or apply causes a failure
- **THEN** the runbook gives the operator a host-level repair path that does not depend on the Kubernetes control plane.

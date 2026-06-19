## ADDED Requirements

### Requirement: Conservative app-server startup script
Attune SHALL provide a conservative Windows script for starting Codex app-server locally.

#### Scenario: Startup script runs
- **WHEN** the script starts Codex app-server
- **THEN** it binds to `127.0.0.1` by default
- **AND** it uses a local capability token file
- **AND** it writes logs under the user's local app data directory
- **AND** it restarts on exit with a small delay

### Requirement: Startup task installer
Attune SHALL provide a Windows startup task installer that the user can run explicitly.

#### Scenario: Installer runs
- **WHEN** the user runs the startup task installer
- **THEN** it registers a user-scoped scheduled task at logon
- **AND** it points at the conservative startup script
- **AND** it does not expose app-server beyond loopback

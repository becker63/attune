## ADDED Requirements

### Requirement: GPU worker path is gated by feasibility
Attune SHALL treat the Windows/RX 6800 XT desktop worker as a gated spike before it becomes required infrastructure.

#### Scenario: GPU feasibility is checked
- **WHEN** the GPU worker spike runs
- **THEN** it records the chosen runtime, OS mode, GPU visibility, local-model smoke result, resource impact, and rollback steps
- **AND** the ThinkCentre control plane remains useful if the spike fails.

### Requirement: Desktop worker is intermittent and constrained
Attune SHALL model the desktop worker as an intermittent Kubernetes worker pool with strict resource constraints.

#### Scenario: Desktop worker joins
- **WHEN** the desktop is joined as a worker
- **THEN** it has node labels for worker class and GPU identity
- **AND** it has taints/tolerations or equivalent scheduling controls so only explicit Attune GPU workloads run there
- **AND** it allows at most one GPU lease or local-model job at a time.

### Requirement: Interactive desktop use is protected
Attune SHALL provide a pause, drain, or disable workflow for the desktop worker.

#### Scenario: Desktop must be reclaimed
- **WHEN** the desktop needs to prioritize interactive use
- **THEN** the operator can pause scheduling, drain active Attune jobs, or stop the worker service with one documented command path.

### Requirement: Gaming activity preempts local model workloads
Attune SHALL prevent local-model GPU workloads from competing with interactive games on the desktop.

#### Scenario: Game activity is detected
- **WHEN** the desktop guard detects a configured game process, fullscreen graphics session, high graphics-engine utilization, or a manual "gaming mode" switch
- **THEN** it marks the desktop worker unavailable for new local-model leases
- **AND** drains, pauses, or terminates active local-model workloads according to the configured grace period.

#### Scenario: Desktop becomes idle
- **WHEN** the configured idle window passes with no game activity and GPU utilization is below the allowed threshold
- **THEN** the guard may re-enable the desktop worker
- **AND** Kubernetes scheduling remains limited to explicit Attune local-model workloads.

### Requirement: Idle desktop capacity is used aggressively
Attune SHALL scale local-model worker capacity up when the desktop is idle and no interactive workload is detected.

#### Scenario: Desktop is safely idle
- **WHEN** no configured game process is running, manual gaming mode is off, GPU utilization is below the idle threshold, CPU and memory pressure are below configured thresholds, and the idle window has elapsed
- **THEN** the guard may switch the desktop worker to "vacation capacity" mode
- **AND** the local-model worker runtime may use the configured high-water CPU, memory, and GPU budgets
- **AND** the worker still keeps a small host reserve for Windows, remote access, display responsiveness, and the guard itself.

#### Scenario: Resource pressure returns
- **WHEN** CPU, memory, GPU, VRAM, disk, or interactive-session pressure crosses a configured threshold
- **THEN** the guard reduces local-model worker capacity, stops accepting new work, or drains active work according to the configured policy
- **AND** gaming or manual override still preempts resource expansion.

### Requirement: Gaming guard configuration is declarative
Attune SHALL keep the gaming guard policy declarative even when OS-specific probes are required.

#### Scenario: Windows-specific probing is needed
- **WHEN** the desktop remains Windows-primary
- **THEN** the process/GPU probes may use a small Windows-side helper
- **AND** the helper's process allowlist, utilization thresholds, idle window, drain behavior, and worker enable/disable commands are generated from Nix-managed configuration.

### Requirement: Desktop worker starts automatically on Windows
Attune SHALL provide a Windows autostart path for the desktop guard and worker launcher when the desktop remains Windows-primary.

#### Scenario: Windows user logs in or machine boots
- **WHEN** Windows starts the configured scheduled task or service
- **THEN** it launches the Nix-generated desktop guard entrypoint
- **AND** the guard verifies Tailscale/Kubernetes connectivity before starting local-model capacity
- **AND** failure leaves the desktop usable and records actionable logs.

### Requirement: WSL fallback is documented
Attune SHALL document WSL as a fallback worker mode for CPU/lightweight jobs, not as the assumed ROCm GPU path.

#### Scenario: WSL fallback is chosen
- **WHEN** GPU compute is unavailable or unsafe
- **THEN** the desktop can still run disposable CPU worker tasks if they do not disrupt interactive use
- **AND** GPU-only workloads remain unscheduled until a supported mode exists.

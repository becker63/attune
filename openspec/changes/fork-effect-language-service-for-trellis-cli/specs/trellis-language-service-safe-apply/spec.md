## ADDED Requirements

### Requirement: Apply targets exactly one fix
The apply command SHALL require one `fix-id` and SHALL preview or apply only that fix.

#### Scenario: Multiple fixes are not applied
- **WHEN** multiple fixes are available for a project
- **THEN** `trellis-ls apply` applies none of them unless exactly one `--fix-id` is supplied

### Requirement: Diff mode never writes
`trellis-ls apply --mode diff` MUST NOT write files, run repair commands, mutate infrastructure, or update durable stores.

#### Scenario: Diff mode preserves files
- **WHEN** `apply --mode diff` is run for a safe text-edit fixture
- **THEN** the target file content remains unchanged and JSON output contains a diff preview

### Requirement: Write mode applies safe local edits
`trellis-ls apply --mode write` SHALL apply safe `text-edit` and `workspace-edit` fixes when they are marked safe and do not require review.

#### Scenario: Safe text edit writes file
- **WHEN** a safe fixture fix is applied with `--mode write`
- **THEN** the target file changes exactly according to the selected text edit

### Requirement: Write mode runs only safe public Nx repairs
`trellis-ls apply --mode write` SHALL run `nx-repair` fixes only when the command is a public safe Nx repair/check surface and the fix does not require review.

#### Scenario: Public repair command applies
- **WHEN** a safe fix command is `nx run framework-language-service:repair`
- **THEN** write mode may run that command and report the command result in apply JSON

### Requirement: Unsafe fixes are refused
The apply command SHALL refuse unsafe, destructive, external infrastructure, review-required, live DB migration, direct generated/cache/descriptor, and manual repairs by default.

#### Scenario: Review-required fix refused
- **WHEN** a fix has `requiresReview: true`
- **THEN** `apply --mode write` exits with code `1` and returns refusal metadata

#### Scenario: Kubernetes mutation refused
- **WHEN** a fix would run a Kubernetes apply/deploy/destroy command
- **THEN** `apply --mode write` refuses the fix by default

### Requirement: Stale fix handling
The apply command SHALL detect when a fix ID cannot be recomputed for the current project/file scope and return machine-readable stale or not-found metadata.

#### Scenario: Fix disappeared after source change
- **WHEN** source changes remove the diagnostic that produced a fix ID
- **THEN** `trellis-ls apply --fix-id <old-id>` returns a not-found or stale-fix result without writing files

### Requirement: Optional recheck
The apply command SHALL support a recheck option that reruns diagnostics or check after a successful write-mode apply.

#### Scenario: Recheck after apply
- **WHEN** `apply --mode write --recheck --format json` succeeds
- **THEN** the output includes follow-up diagnostic or check summary information

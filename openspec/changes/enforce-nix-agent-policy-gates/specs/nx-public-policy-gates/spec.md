## ADDED Requirements

### Requirement: Nx is the public workflow surface and Nix provisions tools
Attune SHALL define Nx targets and Nx generators as the public way to run active workspace workflows, while Nix provisions Node, pnpm, Nx, OpenSpec, Joern, architecture tools, and repo policy checks for local, WSL, cloud, remote-agent, and CI workflows.

#### Scenario: Active command example is documented
- **WHEN** an active agent guide, developer document, package script description, or validation runbook shows a workspace command
- **THEN** the command uses an Nx target or Nx generator as the public workflow surface
- **AND** the command does not use `corepack` as the normal package-manager path.

#### Scenario: Environment lacks Nix
- **WHEN** an active Codex/cloud environment does not have `nix` available
- **THEN** the bootstrap path installs or enters Nix intentionally before running the owning Nx target
- **AND** the run reports that Nix was required for validation.

### Requirement: Undeclared workflow surfaces are not active workflow dependencies
Attune SHALL reject undeclared workflow surfaces such as Corepack, random helper scripts, `node_modules/.bin` public command paths, global package-manager bootstrap, and env-prefix command soup for workspace scripts, Nx targets, agent instructions, validation docs, and architecture checks.

#### Scenario: Undeclared command surface appears in an active script
- **WHEN** a root script, package script, Nx target, or checked-in active helper exposes an undeclared workflow surface
- **THEN** the policy gate fails with rule id `attune/no-undeclared-workflow-surface`
- **AND** the diagnostic points to the owning Nx target or Nx generator.

#### Scenario: Undeclared command surface appears in historical text
- **WHEN** a banned command pattern appears in archived, imported, fixture, or migration text
- **THEN** the policy gate allows it only when the path or occurrence is explicitly allowlisted
- **AND** the allowlist records a reason and expiration or archival scope.

### Requirement: Pre-commit hooks are provisioned through Nix
Attune SHALL use Nix-backed pre-commit hooks as the local policy installation path and SHALL expose the same hook set through a Nix flake check.

#### Scenario: Developer enters the dev shell
- **WHEN** a developer or agent enters the default Nix dev shell
- **THEN** the configured pre-commit hooks are installed or refreshed from the Nix-provided toolchain
- **AND** no global Node, pnpm, Corepack, or Python hook dependency is required.

#### Scenario: CI runs policy hooks
- **WHEN** CI or a remote agent runs `nix flake check`
- **THEN** the pre-commit policy check executes with the same hook definitions as the local dev shell
- **AND** policy failures are reported as first-class validation failures.

### Requirement: Policy hooks are tiered by cost
Attune SHALL classify repo policy checks into fast pre-commit hooks, targeted pre-push or PR checks, and heavy/manual checks.

#### Scenario: Ordinary commit runs fast hooks
- **WHEN** a normal commit is created
- **THEN** the hook set runs fast checks such as Nix formatting, undeclared workflow policy, secret-path hygiene, focused architecture lint, touched Source BOM ownership, and feasible OpenSpec validation
- **AND** it does not require mutation tests, Joern-gated campaigns, or containerized property campaigns.

#### Scenario: Pull request validation runs broader checks
- **WHEN** a PR or explicit validation command runs the policy suite
- **THEN** Nx/Nix executes the appropriate typecheck, test, lint, generated freshness, dependency, cycle, unused-code, duplicate, complexity, and diagnostics checks
- **AND** each check is reachable through an Nx-owned public target backed by the Nix-provisioned toolchain.

### Requirement: Architecture target catalog is composed into policy suites
Attune SHALL compose the existing root architecture target catalog into named Nx-owned policy suites while preserving direct access to the individual checks.

#### Scenario: Fast policy suite runs
- **WHEN** a developer, agent, pre-commit hook, or CI job runs the fast policy suite
- **THEN** it executes the Nx-owned checks for undeclared workflow surfaces, secret-path hygiene, focused architecture lint, Nix formatting, feasible OpenSpec validation, and touched Source BOM ownership
- **AND** it does not execute mutation testing or other expensive proof-pressure campaigns.

#### Scenario: Architecture policy suite runs
- **WHEN** a developer, agent, pre-push hook, PR job, or explicit architecture review runs the architecture policy suite
- **THEN** it composes the checks currently represented by `arch:loc`, `arch:deps`, `arch:cycles`, `arch:unused`, `arch:complexity`, `arch:duplicates`, `arch:types`, `arch:churn`, `arch:effect`, and Source BOM full validation
- **AND** each composed check runs through the Nix-provisioned toolchain.

#### Scenario: Proof-pressure policy suite runs
- **WHEN** a developer, agent, scheduled job, or reviewer requests the proof-pressure policy suite
- **THEN** it includes the architecture policy suite and `arch:mutation`
- **AND** it may include Joern-gated or containerized property campaigns when those targets are available
- **AND** the output distinguishes mutation/proof failures from static architecture failures.

#### Scenario: Full policy suite runs
- **WHEN** CI or a release-quality validation path runs the full policy suite
- **THEN** it composes fast policy checks, architecture checks, generated freshness, targeted Nx typecheck/test/build targets, and any enabled proof-pressure checks
- **AND** the command surface documents whether expensive mutation or Joern-gated checks are enabled for that run.

### Requirement: Mutation testing remains explicit
Attune SHALL keep mutation testing available as an architecture proof-pressure target while preventing it from being hidden inside ordinary fast policy hooks.

#### Scenario: Mutation target is invoked directly
- **WHEN** a developer, agent, scheduled job, or reviewer invokes `arch:mutation` or its composed proof-pressure suite
- **THEN** Stryker mutation testing runs through the Nix-provisioned package manager and toolchain
- **AND** the result is reported as proof-pressure signal.

#### Scenario: Ordinary architecture scan runs
- **WHEN** a developer or agent runs the ordinary architecture scan
- **THEN** mutation testing is skipped unless the command explicitly selects the proof-pressure suite or mutation flag
- **AND** the output tells the operator how to run mutation testing when deeper validation is required.

### Requirement: Policy lint uses effect-oxlint for TypeScript and architecture lint for repo graph rules
Attune SHALL use `effect-oxlint` for TypeScript AST rules and `attune-architecture-lint` for active source inventory, package metadata, documentation command surfaces, Source BOM discipline, lifecycle boundaries, and secret-path hygiene.

#### Scenario: Policy rule is added
- **WHEN** a new repo-specific policy is introduced
- **THEN** it has a stable `attune/*` rule id
- **AND** it has fixture coverage in `attune-architecture-lint`
- **AND** findings are represented through Effect Schema decoded report data.

#### Scenario: TypeScript AST policy rule is added
- **WHEN** a policy rule needs TypeScript AST matching for imports, calls, service boundaries, raw `process.env`, raw Node APIs, or hand-authored generated shapes
- **THEN** the rule is implemented through `effect-oxlint` unless a repo-graph rule is required
- **AND** the rule is reachable through the Nx-owned lint or policy target.

#### Scenario: Active policy scan runs
- **WHEN** the architecture policy scan runs
- **THEN** it reports findings for environment, package metadata, lifecycle helper, provider boundary, Source BOM ownership, generated file, waiver, and secret-path violations
- **AND** the output can be consumed by humans, agents, and CI.

### Requirement: Policy waivers are explicit and expiring
Attune SHALL allow temporary policy exceptions only through a decoded waiver file with rule id, path scope, owner, reason, created date, expiration date, and follow-up or migration evidence.

#### Scenario: Waiver is valid
- **WHEN** a policy violation matches a non-expired waiver with the required fields
- **THEN** the policy gate suppresses or downgrades that finding according to the rule configuration
- **AND** the report records that the waiver was used.

#### Scenario: Waiver is expired or malformed
- **WHEN** a waiver is expired, lacks required fields, references an unknown rule id, or does not match the violated path
- **THEN** the policy gate fails with rule id `attune/policy-waiver-expiry`
- **AND** the original violation remains visible.

### Requirement: Secret material is blocked by path and content policy
Attune SHALL reject common plaintext secret material in the repository unless it is encrypted, a documented placeholder, or an explicitly scoped test fixture.

#### Scenario: Plaintext secret path is added
- **WHEN** a file path or content looks like a private age key, SOPS age key, Tailscale auth material, kubeconfig, SSH private key, token dump, or unencrypted secret bundle
- **THEN** the policy gate fails with rule id `attune/secret-path-hygiene`
- **AND** the diagnostic points to the encrypted SOPS or placeholder path expected by the repo.

#### Scenario: Encrypted or placeholder fixture is added
- **WHEN** a fixture contains encrypted SOPS material or an obvious non-secret placeholder
- **THEN** the policy gate allows it
- **AND** the fixture remains covered by the active scan.

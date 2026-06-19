## Context

ATT-35 and the bootstrap-home-compute-cluster change created a useful first slice: `packages/home-deployment` emits a typed plan, records local gate confirmations, and wraps selected command execution in an Alchemy resource. ATT-38 makes that architecture durable. The deployment model must describe the desired world and observed states; it must not be a list of commands to run in order.

The home target includes three ThinkCentre NixOS/K3s control-plane hosts, host-level Tailscale repair access, typed Kubernetes resources from `platform-alchemy-k8s`, and a gated Windows/RX 6800 XT desktop worker.

## Goals / Non-Goals

**Goals:**

- Make Alchemy the sole owner of create/update/delete/read/diff/block lifecycle for the platform graph.
- Hide all subprocesses behind typed Effect providers.
- Provide Live, DryRun, and Test layers for every provider.
- Model manual gates and irreversible/external mutations as typed resources with evidence requirements.
- Provide deterministic JSON stepper output for safe coding/ops-agent collaboration.
- Simulate the full deployment in Test providers without external state.
- Ensure DryRun providers never mutate external state.
- Upgrade Kubernetes object sets to lifecycle resources, not just rendered manifests.

**Non-Goals:**

- Performing real host disk wipes, K3s joins, Tailscale auth, or Windows registration from this Codex task.
- Checking in secrets or operator physical confirmations.
- Replacing the Effect/Alchemy model with Terraform, Pulumi, Colmena, Ansible, Dagger, or shell orchestration.
- Making the CLI a second orchestrator.

## Resource Model

Every platform lifecycle resource has:

- stable `resourceId`
- `kind`
- desired input schema
- observed state schema
- lifecycle status: `planned | ready | blocked | applying | applied | failed | destroying | destroyed`
- dependencies
- evidence references
- operation classification: `safe | external | irreversible`
- provider name and error type

Required resource kinds are: `HostInventory`, `ManualGate`, `NixBuildArtifact`, `InstallerIso`, `SshReachability`, `HostActivation`, `TailscaleHostAccess`, `K3sServerNode`, `K3sJoinSecret`, `KubeconfigAccess`, `KubernetesApiReachable`, `KubernetesObjectSet`, `AttuneCrdSet`, `PlatformNamespaceSet`, `AttuneWorkerPool`, `DesktopWorkerRegistration`, and `SmokeCheck`.

## Provider Boundaries

Domain lifecycle code calls provider methods, not raw shell strings. Live providers may use subprocesses internally, but the subprocess is an implementation detail. DryRun providers return typed intended transitions and evidence placeholders. Test providers use an in-memory world model to simulate the full deployment.

Provider contracts:

- `NixProvider`: evaluate host outputs and build artifacts.
- `SshProvider`: probe reachability and run typed remote operations.
- `HostActivationProvider`: activate hosts behind destructive/external safety gates.
- `TailscaleProvider`: verify node identity and remote access without checked-in credentials.
- `K3sProvider`: verify server readiness, join-secret availability, kubeconfig, and API health.
- `KubernetesProvider`: render, validate, read, diff, apply, and delete typed object sets.
- `WindowsDesktopProvider`: build/register desktop worker capability behind safe gates.
- `DeploymentStateStore` and `DeploymentJournal`: persist observed state, blockers, evidence refs, gate confirmations, and last transitions.

## Manual Gates

Manual gates are Alchemy resources. A resource that needs physical or human proof returns `blocked` with machine-readable requirements until confirmed. Irreversible or externally mutating transitions require explicit typed proof even in `--apply` mode.

Gate examples:

- confirm host inventory
- confirm target device identity
- confirm installer booted
- confirm post-activation reboot observed
- confirm Tailscale node visible
- confirm desktop worker opt-in

## Agent Stepper

The stepper returns a discriminated union:

- `SafeProbe`: an automatically runnable non-mutating provider probe.
- `ManualGate`: human evidence is required.
- `Apply`: one typed transition is ready but needs explicit approval when external or irreversible.
- `Blocked`: nothing can proceed; blockers are listed.

An agent may run safe probes automatically. It must not free-run irreversible or externally mutating deployment.

## CLI Shape

`attune-home` remains thin and delegates to the lifecycle program:

- `attune-home plan`
- `attune-home status`
- `attune-home next-step`
- `attune-home confirm <gate-id> --evidence <json-or-file>`
- `attune-home deploy --target home --apply`
- `attune-home deploy --target home --dry-run`
- `attune-home destroy --target smoke --dry-run`

Existing `reconcile` can remain temporarily as a compatibility alias during migration, but new targets should use `deploy` and `next-step`.

## Migration Steps

1. Add shared platform lifecycle/resource schemas.
2. Add provider contracts and DryRun/Test layers before broad Live refactor.
3. Replace command-display execution in domain lifecycle code with provider calls.
4. Convert existing home plan resources into Alchemy lifecycle resources with observed state and evidence refs.
5. Add Kubernetes object-set lifecycle APIs in `platform-alchemy-k8s`.
6. Add agent stepper JSON protocol and CLI commands.
7. Update Nx targets and runbook.
8. Add no-raw-command orchestration tests and provider simulation tests.

## Acceptance Tests

- Provider Test layer simulates full deployment without subprocesses.
- DryRun never mutates external state.
- Irreversible/external operations cannot run without typed manual proof.
- Manual gates block dependent resources.
- Kubernetes object set can render, validate, diff, apply in Test provider.
- `next-step` returns the first safe/manual/apply transition deterministically.
- No raw command-display orchestration outside provider Live implementations.
- Plan/status output is JSON-serializable and stable enough for an agent.

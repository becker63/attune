## 1. OpenSpec Gate

- [x] 1.1 Create `openspec/changes/effect-alchemy-platform-lifecycle/`.
- [x] 1.2 Add proposal, design, tasks, `.openspec.yaml`, and capability specs.
- [ ] 1.3 Validate OpenSpec strictly once `openspec` is available on PATH.

## 2. Platform Model And Providers

- [x] 2.1 Add lifecycle resource schemas and operation classification.
- [x] 2.2 Add provider contracts for Nix, SSH, host activation, Tailscale, K3s, Kubernetes, Windows desktop, state, and journal.
- [x] 2.3 Add DryRun provider layers that never mutate external state.
- [x] 2.4 Add Test provider layers that simulate the full home deployment.
- [ ] 2.5 Add Live provider layers with subprocesses hidden behind provider methods.

## 3. Alchemy Lifecycle Graph

- [ ] 3.1 Model all ATT-38 required resources with stable ids, dependencies, statuses, evidence refs, operation classification, and typed errors.
- [ ] 3.2 Convert `home-deployment` to declare the stack and let Alchemy own lifecycle.
- [x] 3.3 Remove domain lifecycle dependence on generic command-display execution.
- [x] 3.4 Preserve compatibility aliases while Nx targets migrate.

## 4. Manual Gates And Evidence

- [x] 4.1 Store typed evidence on gate confirmation.
- [x] 4.2 Block external/irreversible transitions without required gate evidence.
- [x] 4.3 Add tests for manual gates blocking dependents.

## 5. Kubernetes Object Set Lifecycle

- [x] 5.1 Add `KubernetesProvider` render/validate/read/diff/apply/delete contract.
- [x] 5.2 Add `KubernetesObjectSet` lifecycle resource and Test provider.
- [x] 5.3 Upgrade `platform-alchemy-k8s` tests to cover diff/apply in Test provider.

## 6. Agent Stepper And CLI

- [x] 6.1 Add `plan`, `status`, `next-step`, `confirm`, `deploy`, and `destroy` command surface.
- [x] 6.2 Model stepper output as `SafeProbe | ManualGate | Apply | Blocked`.
- [x] 6.3 Ensure only safe probes can be run automatically by agents.
- [x] 6.4 Update Nx targets to call the new commands.

## 7. Docs And Validation

- [x] 7.1 Update `docs/platform/home-cluster-bootstrap-runbook.md` for Alchemy lifecycle and agent stepping.
- [x] 7.2 Run home-deployment tests, typecheck, and plan target.
- [x] 7.3 Run platform-alchemy-k8s tests and typecheck.
- [x] 7.4 Record exact blockers and next commands for Taylor.

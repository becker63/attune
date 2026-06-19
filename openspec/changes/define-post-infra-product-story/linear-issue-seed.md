# Linear Issue Seed: Post-Infra Product Story

Use this as the clean slate issue set for the Linear project `Attune - Post-Infra Product Rollout`.

## Project Setup

### Create clean Attune rollout project

Create a new Linear project for the post-infra product rollout. Do not reuse old unfinished project clutter. Archive or move stale issues out of the way before automation starts creating new work.

Labels: `linear-clean-slate`, `human`, `setup`

### Define Codex background execution rail

Document and prototype the issue-to-Codex-to-PR-to-review loop. Codex may draft and validate work, open PRs, and update Linear, but must not silently merge safety-sensitive changes.

Labels: `agent-codex-ok`, `risk-low`, `attune-product`

### Implement AgentTaskRun tracking model

Define the durable record for background work attempts: issue ID, agent, task kind, attempts, time to PR, tests, review comments, acceptance, rejection, later revert, and cost.

Labels: `agent-codex-ok`, `attune-product`, `effect-schema`

## Product Story

### Implement product artifact schemas

Define schema-backed artifact models for `EvidenceBackedRule`, `ProofRecipe`, `ReviewGuidance`, `MigrationPlan`, `RiskExplanation`, and `OptimizationPacket`.

Validation:

- Nx typecheck passes.
- Schemas have positive and negative decode tests.
- Artifacts include source run IDs and evidence references.

Labels: `product-story`, `effect-schema`

### Build pattern discovery report prototype

Create the first report that turns Joern proof/fuzzer results into repo-specific conventions, bypasses, examples, counterexamples, and promotable rules.

Labels: `product-story`, `axiom`, `joern-proof`

### Promote high-yield proof recipes

Prioritize graph bridge, graph neighborhood, graph facts, findings, boundary, and protocol-deviation recipes because current Axiom data shows these are either high-yield or hard for weak agents to invent.

Labels: `proof-recipes`, `joern-proof`, `axiom`

## Rego Law Layer

### Scaffold platform policy package

Create `packages/platform-policy` or the chosen equivalent package with Effect Schema inputs, generated JSON Schema, Rego bundles, fixtures, OPA check/test targets, and Regal lint.

Labels: `rego`, `platform`, `effect-schema`

Risk: high. Requires human review. No automerge.

### Implement Kubernetes workload safety policies

Deny unsafe repo-discovery workloads: privileged pods, missing requests/limits, hostPath, Docker socket, root containers, unapproved images, missing run labels, and missing budget reservations.

Labels: `rego`, `kubernetes`, `safety`

### Implement agent change-set policies

Deny unsafe automatic agent changes, including local model edits to Rego policy, scheduler admission, Nix semantics, and high-risk auto-merge routes.

Labels: `rego`, `agent-safety`

### Implement OptimizationPacket routing policies

Require high-risk packets to be human-owned, Rego packets human-only, Nix packets human-reviewed, scheduler packets Factory plus human review, and low-risk docs/fixture packets local-agent eligible.

Labels: `rego`, `optimization-loop`

## Linear Ledger

### Implement Linear projection service

Create the first Linear projection from OptimizationPacket to issue, including source run IDs, risk, validation commands, accepted evidence, and status reconciliation.

Labels: `linear`, `optimization-loop`

### Enforce Linear clean-slate automation guard

Before any automation writes issues, verify the project is the new clean rollout project and stale old project clutter has been archived or explicitly ignored.

Labels: `linear`, `automation-safety`

## ThinCentre Cluster Setup

### Human: inventory ThinCentre machines

Record hostnames, CPU/RAM/storage, network adapters, BIOS/UEFI status, virtualization support, and intended worker class for each machine.

Labels: `human`, `cluster`, `thincentre`

### Human: create NixOS installer USB

Prepare a bootable NixOS installer USB for the ThinCentre machines. Record ISO version, checksum, USB device, and any BIOS settings needed.

Labels: `human`, `nixos`, `usb`, `cluster`

### Human: install NixOS base on each ThinCentre

Install a minimal NixOS base suitable for k3s worker or control-plane roles. Preserve host inventory and network identity.

Labels: `human`, `nixos`, `cluster`

### Human: join nodes to k3s cluster

Join each machine to the local cluster, apply worker labels, and run a smoke workload.

Labels: `human`, `kubernetes`, `cluster`

### Automation: create safe USB preparation helper

Create a script that downloads/verifies a NixOS ISO, lists candidate USB devices, prints the exact write command, and requires an explicit `--device` and confirmation before writing.

Labels: `automation`, `nixos`, `usb`

### Automation: generate node bootstrap checklist

Generate per-node checklist/config from inventory, including hostname, static DHCP notes, k3s role, worker labels, and validation commands.

Labels: `automation`, `cluster`, `nixos`

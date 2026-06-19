## 1. Product Story Specification

- [x] 1.1 Create an OpenSpec change for the post-infra product story.
- [x] 1.2 Define the market-facing Attune product narrative.
- [x] 1.3 Define first product artifacts: EvidenceBackedRule, ProofRecipe, ReviewGuidance, MigrationPlan, RiskExplanation, and OptimizationPacket.
- [x] 1.4 Capture first pattern families from the supplied product notes.
- [x] 1.5 Connect the product story to Axiom-derived proof/fuzzer design pressure.

## 2. Rego Law Layer

- [x] 2.1 Add a Rego law-layer spec to the change.
- [x] 2.2 Document what belongs in Rego versus Effect.
- [x] 2.3 Include Kubernetes workload, worker class, budget gate, agent change, Nix boundary, manifest, OptimizationPacket, and Linear ledger policy families.
- [x] 2.4 Document Effect Schema to JSON Schema to OPA input as the intended type bridge.

## 3. Linear Work Ledger

- [x] 3.1 Add a Linear work-ledger spec.
- [x] 3.2 Require clean-slate Linear setup before automation.
- [x] 3.3 Create a new Linear project for the rollout.
- [x] 3.4 Create first implementation issues in the new Linear project.
- [x] 3.5 Add a project document summarizing the spec and issue taxonomy.

## 4. ThinCentre Cluster Readiness

- [x] 4.1 Add a ThinCentre cluster readiness spec.
- [x] 4.2 Define human setup tasks for USB, NixOS install, k3s join, worker labels, and smoke checks.
- [x] 4.3 Define automation support tasks for scripts/config/checklists without assuming physical access.
- [x] 4.4 Create Linear reminders for human setup tasks.

## 5. Automation

- [x] 5.1 Add the Codex/Linear/GitHub background execution rail to the spec.
- [x] 5.2 Create a Codex heartbeat reminder to check Linear/project setup after the spec is created.
- [x] 5.3 Create or seed follow-up Linear issues for implementation phases.

## 6. Validation

- [x] 6.1 Run `openspec status --change define-post-infra-product-story`.
- [x] 6.2 Review `git diff --stat` for the change.

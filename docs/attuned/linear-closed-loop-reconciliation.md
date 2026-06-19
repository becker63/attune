# Proposed Linear reconciliation text for ATT-21

Codex did not have direct Linear write access in this session. Paste the following updates into the referenced Linear issues if the PR is accepted.

## ATT-11: Author OpenSpec proposal for first closed-loop recall-to-proof golden slice

Reframe this issue as the planning/spec gate for the first closed loop before expansion. The OpenSpec proposal must describe one repo snapshot, one CocoIndex or fake-CocoIndex search path, normalized `AnchorCard` records, an `anchors.retrieved` event, derived `DecisionPacket`, fixture/Pi optimizer choosing `run_joern_template`, `DecisionValidator` acceptance, one known Joern or fake-Joern template, normalized/scored `EvidencePacket`, `evidence.scored` event, incremented `WorkbenchSnapshot`, Dispatch/FoldKit projection render, and `RunSummary` metrics.

Acceptance checklist:

1. One repo snapshot ID exists.
2. One CocoIndex or fake-CocoIndex query produces `AnchorCard` records.
3. One known Joern or fake-Joern template produces an `EvidencePacket`.
4. Events replay to the same `DecisionPacket` twice.
5. `WorkbenchSnapshot` changes version after evidence.
6. FoldKit/Dispatch renders updated snapshot/feed state from projections.
7. `RunSummary` includes search/index time, proof time, cache hit/miss, and useful evidence count.
8. No Kubernetes apply is required.

Explicit exclusions: full CocoIndex SDK completion, full Joern DSL/proof-router catalog completion, Kubernetes apply/deploy behavior, scheduler/admission, leases, budgets, worker safety, production Neon rollout, app-server exposure, non-inspector FoldKit commands, and new UI/product surfaces.

## ATT-16: Add replay, refresh, and runtime-observability tests for closed-loop golden slice

Reframe this issue as the proof gate. Tests may use deterministic fake CocoIndex and fake Joern clients so the loop is proven before full SDK/router completion. The required test should replay the full loop from recall evidence through refreshed `DecisionPacket`, `WorkbenchSnapshot`, Dispatch/FoldKit projection, and `RunSummary` observability.

The test must prove deterministic replay by deriving the same `DecisionPacket` twice from the same events and must prove freshness by showing `WorkbenchSnapshot` version changes after `evidence.scored`.

## ATT-10, ATT-17, and ATT-20

Mark generator expansion, Dispatch feed expansion, and Kubernetes/platform expansion as blocked until ATT-11 and ATT-16 establish the closed-loop proof. Kubernetes work remains planning-only and human-reviewed; no apply/deploy behavior is part of the golden slice.

## ATT-12

Allow durable projection/read-model work to continue, but avoid derailing it into production Neon rollout, platform behavior, or broader worker safety concerns before the closed-loop proof exists.

## ATT-6

Add delegation protocol language: Codex-safe issues may proceed without repeated approval prompts when the issue includes route, scope, validation, exclusions, and human-review gates. Human review remains required before merge and before production Neon rollout, platform/Kubernetes behavior, autonomous promotion, scheduler/admission, budget/lease/worker control, app-server exposure, or non-inspector FoldKit commands.

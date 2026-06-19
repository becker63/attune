# Closed-loop golden slice plan

ATT-21 reconciles the implementation queue around one sacred v0 milestone: prove the first closed loop before expanding platform, UI, generators, Kubernetes, scheduler/admission, leases, budgets, worker safety, app-server exposure, or new product surfaces.

The milestone is intentionally narrow: one search path, one proof path, one memory path, and one refreshed `DecisionPacket`/`WorkbenchSnapshot` rendered through Dispatch/FoldKit projections.

## Required runtime shape

```txt
RepoSnapshotCreated
→ CocoIndex search, or fake-CocoIndex test client
→ AnchorCards normalized
→ anchors.retrieved event
→ DecisionPacket derived
→ Pi/fixture optimizer chooses run_joern_template
→ DecisionValidator accepts
→ joern-effect runs one known template, or fake-Joern test client
→ EvidencePacket decoded/scored
→ evidence.scored event
→ WorkbenchSnapshot version increments
→ Dispatch/FoldKit renders refreshed state from projections
→ RunSummary reports duration/cache/evidence yield
```

## Golden-slice checklist

1. One repo snapshot ID exists.
2. One CocoIndex or fake-CocoIndex query produces `AnchorCard` records.
3. One known Joern or fake-Joern template produces an `EvidencePacket`.
4. Events replay to the same `DecisionPacket` twice.
5. `WorkbenchSnapshot` changes version after evidence.
6. FoldKit/Dispatch renders updated snapshot/feed state from projections.
7. `RunSummary` includes search/index time, proof time, cache hit/miss, and useful evidence count.
8. No Kubernetes apply is required.

## Test doubles are allowed

The proof gate explicitly allows deterministic fake clients so the event/projection loop can be proven before full external service completion:

- A fake-CocoIndex client may return fixed anchor cards for a known repo snapshot and query.
- A fake-Joern client may return fixed evidence for one known template and binding set.
- A fixture optimizer may choose `run_joern_template` from a valid `DecisionPacket` without invoking Pi or a local LLM.

The doubles must preserve the production packet contracts: normalized anchors, bounded `AgentDecision`, known Joern template IDs, normalized evidence, semantic events, projection replay, refreshed snapshot, and run summary metrics.

## Explicit exclusions until the proof exists

The closed-loop gate excludes:

- full CocoIndex SDK completion;
- full Joern DSL/proof-router catalog completion;
- Kubernetes apply/deploy behavior;
- scheduler/admission control;
- leases, budgets, and worker safety beyond the bounded fixture budget needed by the test;
- production Neon rollout;
- app-server exposure;
- non-inspector FoldKit commands;
- new UI/product surfaces beyond rendering the refreshed existing projection state.

## Linear reconciliation notes

- ATT-11 should be reframed from a generic runtime golden slice to the first closed-loop recall-to-proof golden slice described here.
- ATT-16 should be reframed as the proof gate: replay the full loop from recall evidence through refreshed `DecisionPacket`, `WorkbenchSnapshot`, and Dispatch/FoldKit projection.
- ATT-10, ATT-17, and ATT-20 should remain blocked on this proof before generator expansion, Dispatch feed expansion, or Kubernetes/platform expansion proceeds.
- ATT-12 may continue as durable projection work, but it should not pull in production Neon rollout or platform behavior before this loop is proven.
- ATT-6 should record that Codex-safe issues may proceed without repeated approval prompts when the issue includes route, scope, validation, exclusions, and human-review gates.

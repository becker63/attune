## 1. OpenSpec

- [x] 1.1 Inspect `docs/attuned` and the pasted FoldKit/server-atom story.
- [x] 1.2 Create `add-attuned-semantic-workbench`.
- [x] 1.3 Add proposal, design, requirements, and implementation checklist.

## 2. Linear

- [x] 2.1 Create Linear issues under `Attune - Post-Infra Product Rollout`.
- [x] 2.2 Add estimates, sequencing, and OpenSpec links.

## 3. Package Wiring

- [x] 3.1 Add `@attune/attuned-discovery` package metadata, Nx project, and TypeScript config.
- [x] 3.2 Add workspace path alias for `@attune/attuned-discovery`.
- [x] 3.3 Add package dependency from Dispatch packages where the snapshot bridge needs it.
- [x] 3.4 Record Neon as the production Postgres provider for follow-on EventLog, Drizzle, and pgvector persistence.

## 4. Semantic Domain

- [x] 4.1 Implement run, anchor, hypothesis, evidence, budget, decision packet, agent decision, and workbench snapshot schemas.
- [x] 4.2 Implement deterministic fixture discovery events and fixture semantic service outputs.
- [x] 4.3 Add schema tests for the boundary packets and invalid packets.

## 5. Event Projection And Atom-Style Views

- [x] 5.1 Implement append/replay helpers for discovery events.
- [x] 5.2 Implement projections for runs, anchors, hypotheses, evidence, review queue, and decision history.
- [x] 5.3 Implement atom-style derivation for `DecisionPacket`, best next action, review queue, FoldKit scene, and `WorkbenchSnapshot`.
- [x] 5.4 Add replay/freshness tests that prove snapshot version changes after semantic events.

## 6. Local Optimizer Harness

- [x] 6.1 Define service contracts for semantic recall, Joern proof templates, and optimizer decisions.
- [x] 6.2 Implement fixture services that exercise recall-to-proof-to-decision without external processes.
- [x] 6.3 Add budget tests so unavailable Joern budget removes Joern decisions.
- [x] 6.4 Implement constrained Workbench Scribe report actions, report events, report projection, and fixture report output.

## 7. FoldKit Workbench Bridge

- [x] 7.1 Extend Dispatch schemas/model/message with semantic snapshot, selected run, selected hypothesis, and server snapshot change handling.
- [x] 7.2 Initialize Dispatch fixture mode with a derived semantic workbench snapshot.
- [x] 7.3 Render a Workbench snapshot panel from server-derived data.
- [x] 7.4 Keep route/filter/selection as FoldKit interaction state and snapshot facts as server-derived state.

## 8. Validation

- [x] 8.1 Run `openspec validate add-attuned-semantic-workbench --no-interactive`.
- [x] 8.2 Run `nx run attuned-discovery:typecheck`.
- [x] 8.3 Run the `attuned-discovery` Vitest suite under Node 24.
- [x] 8.4 Run `nx run dispatch-schema:typecheck`.
- [x] 8.5 Run `nx run dispatch-core:typecheck`.
- [x] 8.6 Run `nx run dispatch-foldkit:typecheck`.

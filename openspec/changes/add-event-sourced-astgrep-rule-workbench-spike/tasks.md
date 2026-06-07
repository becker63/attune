## 1. Repository Toolchain

- [ ] 1.1 Verify the Nix flake enters a dev shell with Node.js LTS, Bun, ast-grep, Chromium, and pre-commit tooling.
- [ ] 1.2 Add or update package scripts for `dev`, `lint`, `typecheck`, `test`, `test:e2e`, and `attune:scan`.
- [ ] 1.3 Wire nix-pre-commit/git-hooks checks to run formatting, linting, type checking, tests, and OpenSpec validation when implementation scripts exist.
- [ ] 1.4 Document the runtime rule that Node.js LTS is the compatibility contract and Bun is the local package manager/script runner.

## 2. Application Skeleton

- [ ] 2.1 Create the initial TypeScript package/app structure for the spike.
- [ ] 2.2 Add Effect, FoldKit, Vercel AI SDK test utilities, ast-grep runner dependencies, Vitest, and Playwright as needed.
- [ ] 2.3 Configure TypeScript so domain, eventing, agent, runner, fixture, UI, and export modules share strict types.
- [ ] 2.4 Ensure core product modules avoid Bun-only APIs unless isolated behind an Effect service boundary.

## 3. Eventing Kernel

- [ ] 3.1 Define `Decider`, `EventEnvelope`, `EventMetadata`, stream id types, and event store errors.
- [ ] 3.2 Define the `EventStore` interface with `append`, `readStream`, and `readAll`.
- [ ] 3.3 Implement `InMemoryEventStore` with expected-sequence handling.
- [ ] 3.4 Implement `FixtureEventStore` that reads typed scenario events as envelopes.
- [ ] 3.5 Add tests for append/read behavior and sequence conflicts.

## 4. Domain Model

- [ ] 4.1 Define branded ids for repos, rules, candidates, intents, findings, ast-grep runs, actors, streams, and events.
- [ ] 4.2 Define domain commands for analyzing scope, generating candidates, measuring candidates, labeling findings, revising candidates, promoting candidates, rejecting candidates, and previewing exports.
- [ ] 4.3 Define domain events for repo connection, intent generation, candidate generation, ast-grep runs, finding labels, revisions, promotion, rejection, and export preview.
- [ ] 4.4 Define rule, candidate, structural proxy, example, finding, measurement, and export preview types.
- [ ] 4.5 Add runtime validation for agent outputs and native rule promotion invariants.

## 5. Projection

- [ ] 5.1 Implement event folding into `RuleWorkbenchProjection`.
- [ ] 5.2 Derive current candidate, candidate list, metrics, review counts, promotion blockers, revision availability, export preview state, and known limits.
- [ ] 5.3 Convert raw events into human-readable lineage timeline items.
- [ ] 5.4 Add projection tests for candidate generation, completed measurement, finding labels, revision, promotion, and export preview.

## 6. Typed Fixtures

- [ ] 6.1 Add `defineRuleScenario` and fixture helper constructors.
- [ ] 6.2 Add `boundaryValidationScenario` with repo metadata, initial events, fixture agent outputs, and expected projection assertions.
- [ ] 6.3 Add a small real TypeScript fixture repo for ast-grep measurement.
- [ ] 6.4 Add fixture candidates for noisy first proposal, false-positive revision, and clean promoted candidate.
- [ ] 6.5 Reuse the same scenario in projection tests, FoldKit Story tests, FoldKit Scene tests, and demo boot.

## 7. Agent Boundary

- [ ] 7.1 Define the product-owned `RuleAgent` interface.
- [ ] 7.2 Implement `RuleAgentFixture` using typed scenario outputs.
- [ ] 7.3 Implement `RuleAgentAiSdkMock` or an equivalent AI SDK mock test harness.
- [ ] 7.4 Validate structured mock output as `RuleCandidateDraft` before converting to domain events.
- [ ] 7.5 Add tests proving raw AI SDK/provider response objects are not stored as primary domain event payloads.

## 8. ast-grep Measurement

- [ ] 8.1 Define `AstGrepRunner`, candidate input, measurement, finding, and error types.
- [ ] 8.2 Implement `AstGrepRunnerLive` by writing candidate YAML to a temp file and invoking ast-grep against the fixture repo.
- [ ] 8.3 Parse ast-grep JSON output into normalized findings with repository-relative paths and safe code excerpts.
- [ ] 8.4 Represent parse/execution failures as measurement results that block promotion.
- [ ] 8.5 Add tests that run real ast-grep against the fixture repo.

## 9. Command Handling

- [ ] 9.1 Implement command handling for candidate generation and ast-grep measurement requests.
- [ ] 9.2 Implement finding label handling that appends true-positive, false-positive, or ignored events.
- [ ] 9.3 Implement candidate revision handling that records revision request, revised candidate, and measurement request events.
- [ ] 9.4 Implement promotion handling with invariants for candidate existence, examples, native rule validity, and completed measurement.
- [ ] 9.5 Implement rejection and export preview command handling.

## 10. FoldKit Rule Workbench

- [ ] 10.1 Define FoldKit `Model`, `Msg`, update function, command mapping, and projection adapter.
- [ ] 10.2 Render the rule card with title, status, scope, intent, structural proxy, native ast-grep YAML, examples, and known limits.
- [ ] 10.3 Render measurement summary, finding review queue, selected finding details, and review actions.
- [ ] 10.4 Render candidate iteration history, readable lineage timeline, and promote/revise/reject/export controls.
- [ ] 10.5 Render promotion blocker states for invalid or unmeasured candidates.

## 11. FoldKit Tests

- [ ] 11.1 Add Story test for marking a finding false positive and emitting `LabelFinding`.
- [ ] 11.2 Add Story tests for promotion allowed and promotion blocked states.
- [ ] 11.3 Add Scene test rendering the boundary validation rule card.
- [ ] 11.4 Add Scene test covering false-positive labeling followed by revision visibility.
- [ ] 11.5 Ensure UI tests run in the default fixture path without live model calls, GitHub, or a production database.

## 12. Export Preview

- [ ] 12.1 Define export artifact and export preview models.
- [ ] 12.2 Generate preview content for ast-grep config/rule file and valid/invalid fixture files.
- [ ] 12.3 Keep private lineage, labels, rejected candidates, prompts, raw provider responses, and intermediate measurements out of export preview files.
- [ ] 12.4 Display the export boundary in the Rule Workbench.

## 13. End-to-End Spike Validation

- [ ] 13.1 Add an end-to-end fixture test for generate -> measure -> label false positive -> revise -> measure -> promote -> export preview.
- [ ] 13.2 Confirm the full default test path runs without live model credentials, GitHub, or a production database.
- [ ] 13.3 Confirm the spike demonstrates clean native ast-grep artifact export and private lineage retention.
- [ ] 13.4 Run OpenSpec status/validation and all configured quality checks.

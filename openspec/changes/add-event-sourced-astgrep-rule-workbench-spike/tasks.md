## 1. Repository Toolchain

- [x] 1.1 Verify the Nix flake enters a dev shell with Node.js LTS, Bun, ast-grep, Chromium, and pre-commit tooling.
- [x] 1.2 Add or update package scripts for `dev`, `lint`, `typecheck`, `test`, `test:e2e`, and `attune:scan`.
- [x] 1.3 Wire nix-pre-commit/git-hooks checks to run formatting, linting, type checking, tests, and OpenSpec validation when implementation scripts exist.
- [x] 1.4 Document the runtime rule that Node.js LTS is the compatibility contract and Bun is the local package manager/script runner.

## 2. Application Skeleton

- [x] 2.1 Create the initial FoldKit package/app structure with root `entry.ts`, `main.ts`, `model.ts`, `message.ts`, `update.ts`, `view.ts`, `route.ts`, and `styles.css`.
- [x] 2.2 Add Effect, FoldKit, Shiki, Vercel AI SDK test utilities, ast-grep runner dependencies, Vitest, and Playwright as needed.
- [x] 2.3 Configure TypeScript so domain, eventing, agent, runner, fixture, UI, and export modules share strict types.
- [x] 2.4 Ensure core product modules avoid Bun-only APIs unless isolated behind an Effect service boundary.
- [ ] 2.5 Create `page/ruleWorkbench/` as a FoldKit page submodel with `index.ts`, `init.ts`, `model.ts`, `message.ts`, `update.ts`, `view.ts`, `command.ts`, Story tests, Scene tests, and local view helpers.
- [ ] 2.6 Create route stubs for `page/findings/`, `page/lineage/`, `page/exports/`, `page/discover/`, and `page/settings/`, with only the minimal Findings label path needed by the end-to-end slice.

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
- [x] 6.2 Add `bulletproof-react` as a git subtree at `repos/bulletproof-react`.
- [ ] 6.3 Add the first typed scenario with repo metadata pointing at `repos/bulletproof-react`, initial events, fixture agent outputs, and expected projection assertions.
- [ ] 6.4 Choose the first scenario pattern from `bulletproof-react`, with boundary validation and style firewall as the leading candidates.
- [ ] 6.5 Add fixture candidates for noisy first proposal, false-positive revision, and clean promoted candidate.
- [ ] 6.6 Reuse the same scenario in projection tests, FoldKit Story tests, FoldKit Scene tests, and demo boot.

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

- [ ] 10.1 Define FoldKit `Model`, `Message`, update function, command mapping, and projection adapter.
- [x] 10.2 Define Attune dark paper CSS variables for root background, sidebar, panels, code surfaces, borders, text, muted text, and semantic accents.
- [x] 10.3 Add `src/syntax/` modules for code language, highlighted-code model, Shiki highlighter service/command boundary, and FoldKit Html conversion.
- [ ] 10.4 Ensure Shiki highlighting runs outside FoldKit `view` and stores tokenized highlighted-code data in model/projection state.
- [x] 10.5 Render highlighted code through FoldKit Html nodes rather than raw `InnerHTML` by default.
- [x] 10.6 Render the persistent shell with Attune brand, primary nav, potential pattern cards in the sidebar, user footer, and collapse control.
- [x] 10.7 Render selected rule title, intent, compact candidate status strip, compact findings summary, and default primary actions `Revise rule` and `Promote rule`.
- [x] 10.8 Render grouped stacked examples with `Looks like` above `Does not look like`.
- [x] 10.9 Render the deterministic rule pane to the right of examples on desktop-width layouts and give it the main artifact height.
- [x] 10.10 Remove the standalone measurement panel from the default Workbench layout and avoid duplicated measurement values.
- [x] 10.11 Keep finding label buttons, notes input, selected finding detail, and finding pagination out of the default Workbench route.
- [x] 10.12 Render candidate iteration history and readable provenance timeline along the bottom of the Workbench.
- [ ] 10.13 Render promotion blocker states for invalid or unmeasured candidates.
- [x] 10.14 Exclude ambiguous global actions such as `New scan`, `Give feedback`, `Run agent`, or `Auto-fix` until they have explicit domain commands and copy.

## 11. FoldKit Tests

- [ ] 11.1 Add Story test for marking a finding false positive and emitting `LabelFinding`.
- [ ] 11.2 Add Story tests for promotion allowed and promotion blocked states.
- [ ] 11.3 Add Scene test rendering the boundary validation rule card.
- [ ] 11.4 Add Scene test for sidebar potential patterns and selected state.
- [ ] 11.5 Add Scene test proving the default Workbench shows only `Revise rule` and `Promote rule` as primary actions.
- [ ] 11.6 Add Scene test for stacked examples inside the parent `Examples` group.
- [ ] 11.7 Add Scene test for the right-side tall deterministic rule pane.
- [ ] 11.8 Add Scene test proving no standalone measurement panel renders.
- [ ] 11.9 Add Scene test proving finding review controls do not render on the Workbench route.
- [ ] 11.10 Add Scene test for compact findings summary and `Open findings`.
- [ ] 11.11 Add Scene test for bottom provenance timeline.
- [ ] 11.12 Add Scene test proving code panes render tokenized Shiki output through FoldKit Html nodes while preserving plain text.
- [ ] 11.13 Add Story test proving highlighting is requested through command/service boundaries rather than performed inside `view`.
- [ ] 11.14 Add Findings page Story or Scene test covering false-positive labeling.
- [ ] 11.15 Ensure UI tests run in the default fixture path without live model calls, GitHub, or a production database.

## 12. Export Preview

- [ ] 12.1 Define export artifact and export preview models.
- [ ] 12.2 Generate preview content for ast-grep config/rule file and valid/invalid fixture files.
- [ ] 12.3 Keep private lineage, labels, rejected candidates, prompts, raw provider responses, and intermediate measurements out of export preview files.
- [ ] 12.4 Display the export boundary in the Rule Workbench.

## 13. Accessibility

- [ ] 13.1 Ensure sidebar pattern cards are keyboard selectable.
- [ ] 13.2 Ensure selected pattern state is not color-only.
- [ ] 13.3 Ensure semantic statuses use text plus icon or color.
- [ ] 13.4 Validate dark code panel contrast.
- [ ] 13.5 Validate highlighted code preserves accessible plain text and copy text.
- [ ] 13.6 Validate focus states for `Revise rule`, `Promote rule`, and `Open findings`.

## 14. End-to-End Spike Validation

- [ ] 14.1 Add an end-to-end fixture test for fixture events -> projection -> highlighted code model -> Workbench screen -> real ast-grep run against `repos/bulletproof-react` -> compact measurement -> promote -> export preview.
- [ ] 14.2 Confirm the full default test path runs without live model credentials, GitHub, or a production database.
- [ ] 14.3 Confirm the spike demonstrates clean native ast-grep artifact export and private lineage retention.
- [ ] 14.4 Compare default Workbench rendering against the approved dark paper layout.
- [ ] 14.5 Confirm the UI does not regress into a generic dashboard, terminal console, or overloaded review queue.
- [ ] 14.6 Run OpenSpec status/validation and all configured quality checks.

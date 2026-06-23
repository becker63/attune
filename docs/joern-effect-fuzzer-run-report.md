# Joern Effect Fuzzer Run Report

Historical migration note only. This file is not protocol source truth or
package-contract evidence; future protocol/evidence run reports should be
emitted through framework diagnostics, Nx output, CI artifacts, stdout, or
gitignored local cache.

Date: 2026-06-18

## What Changed

`packages/joern-effect-properties` now uses one canonical Effect-driven semantic
fuzzer pipeline under `src/fuzz/`. The old split between a thin legacy fuzzer
and the semantic fuzzer has been collapsed into typed stages, template
registries, services, and presets.

The fuzzer now treats query failures as specimens instead of immediate process
killers. Shard failures emit expectation/counterexample/fixture events and the
run continues so long campaigns can keep exploring the DSL surface.

The current workbench emits OpenTelemetry logs for Axiom, including run IDs,
query template IDs, query fingerprints/previews, expectation failures, and
fixture candidates.

## Runs

### DSL-heavy observational run

Run ID: `joern-effect-dsl-4h-20260618T165832Z`

Result:

- Completed cleanly.
- Accepted 960 generated cases across 240 batches.
- Rejected 0 cases.
- Axiom showed 4,584 `query_completed` events.
- No oracle/query failures were observed in this run.

This run mostly proved that the generated DSL/query inventory can survive a
large amount of Joern-backed execution without crashing. It did not assert many
semantic expectations, so it was expected to be good at finding rendering/runtime
breakage and weaker at finding mismatched facts.

### Expectation-bearing run

Run ID: `joern-effect-expectation-2h-20260618T184144Z`

Status at commit point:

- Running under a two-hour timeout.
- Expected hard stop: approximately 4:41 PM America/New_York on 2026-06-18.
- Emitting counterexample and fixture-candidate events.
- Continuing after shard failures instead of aborting the campaign.

Early signal:

- The run has already produced expectation mismatches.
- The mismatches are useful: they distinguish "query rendered and executed" from
  "query result satisfied the semantic expectation carried by the generated
  source case."
- These are the first runs that should produce real counterexamples rather than
  only throughput telemetry.

## Findings So Far

- The DSL-heavy run gave confidence that Joern can handle a substantial generated
  query workload when the run is bounded to four cores and a memory-backed
  workspace.
- A generated identifier/repeat query shape was invalid because the traversal
  widened to `AstNode` while projecting identifier-specific fields. The query
  template was fixed to project only `code` after the widening step.
- Expectation-bearing properties are beginning to surface mismatches around the
  gap between source templates, generated mutations, Joern's TypeScript/TSX
  model, and the query templates we expect to observe them with.
- The right next step is to classify recurring counterexamples into:
  implementation bugs, query-template bugs, Joern TS/TSX limitations,
  over-specific expectations, or durable regression fixtures.

## Resource Policy

The current container-backed fuzzer workbench is constrained through Nx targets
and the Nix/Arion runtime:

- CPU budget: four cores for the fuzzer, leaving at least two cores for the host
  and Codex work.
- Memory-backed store: 8 GiB for the four-hour DSL run; later experiments may
  use 10 GiB when the machine is otherwise idle.
- Runtime dependencies belong in the Nix closure and container environment, not
  in tool-specific patch code.

## Next Work

- Let the expectation-bearing run finish and inspect Axiom for stable clusters.
- Promote stable shrunk cases into fixtures.
- Add feedback-guided query selection based on recurring low-signal query shapes
  and high-signal counterexample clusters.
- Keep expanding query templates for JSX/TSX, source/sink patterns, Graphology
  materialization, path/neighborhood queries, and boundary/protocol deviations.
- Move remaining runtime resource assumptions into Nix/Arion definitions and
  keep Nx as the only orchestration surface.

# Attune Docs

This directory contains the active architectural canon for the unified Attune repo.

Start with `attuned/`. Those documents are the current guiding light for the product architecture:

- Effect owns execution and resource boundaries.
- EventLog, Drizzle, Reactivity, and atoms provide the state model.
- CocoIndex finds candidates.
- Joern proves through known templates.
- The model proposes bounded decisions; the runtime validates and records them.

Core framework vocabulary:

- `attuned/Attune Framework Core Primitives.md` - package, service, operation,
  projection, atom/view, Reactivity, provider, generator, policy, evidence,
  diagnostic, repair action, and mostly deduced ID authoring rules.

The raw imported repositories remain under `imports/` on disk during migration, but `docs/` is the tracked documentation home.

## Historical Migration Notes

These files are retained as migration context. They are not protocol source
truth, package-contract evidence, or the normal place for new run reports;
future protocol reports belong in framework diagnostics, Nx output, CI
artifacts, stdout, or gitignored local cache. Historical run-report files in
this section must carry the "Historical migration note only" marker so the
no-checked-in-report policy can distinguish retained migration context from new
checked-in evidence/status reports.

- `joern-effect-fuzzer-run-report.md` - status and findings for the semantic
  fuzzer, DSL-heavy Joern runs, expectation-bearing counterexamples, and the
  Axiom/OTLP workbench.
- `joern-effect-expectation-fuzzer-classification.md` - classification pass over
  the first expectation-bearing counterexamples, plus representative row and
  Graphology query shapes.
- `joern-effect-fuzzer-axiom-queries.md` - useful Axiom queries for inspecting
  fuzzer runs.
- `joern-effect-runtime-dependency-audit.md` - notes on keeping Joern runtime
  dependencies in Nix/container definitions instead of tool-specific patches.

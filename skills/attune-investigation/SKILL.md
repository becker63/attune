---
name: attune-investigation
description: Conduct a reproducible Attune architectural investigation over an exact repository snapshot. Use when observing code with Joern, formalizing a local claim in native Maude, falsifying the claim or a tool-to-tool relationship with ordinary Effect and fast-check TypeScript, lowering surviving syntactic knowledge into ast-grep, resuming an investigation, or finalizing its evidence capsule.
---

# Attune Investigation

Treat an investigation as a deterministically correlated scratchpad. Preserve exact
repository states, native tool inputs and outputs, run references, seeds, replay
paths, and counterexamples. Leave semantic interpretation to the investigating
agent.

Use this working maxim:

> Joern observes. Maude formalizes. fast-check falsifies. ast-grep enshrines.

This is a loop, not a required linear pipeline. Use only the tools that advance the
question.

## Preserve the boundary

- Treat Git state and native artifacts as authoritative.
- Treat AgentFS as the lossless investigation notebook.
- Treat Nix as the reproducible interpreter and runtime closure.
- Use run references and snapshot identities for mechanical correlation.
- Use notes and Markdown for human context only. Never make them a second source
  of truth.
- Do not invent a universal IR, shared semantic schema, workflow graph, or
  Attune-specific Maude/property/ast-grep language.
- Do not claim that a reference validates the meaning of an edge. Explain semantic
  gaps when useful and leave unresolved gaps visible.
- Create a new run for every attempt. Never overwrite a failed query, theory,
  property, counterexample, or lowering.

## Start or resume

1. Call `repository_materialize` with the repository and requested revision.
2. Record the returned `investigationId`, resolved commit, attached investigation
   branch, and snapshot.
3. Reuse that `investigationId` for every later operation.
4. Before snapshot-sensitive work, call `repository_checkpoint`:
   - use `require-clean` when existing repository state must already be exact;
   - use `commit` only when an explicit Attune checkpoint commit is intended.
5. If resuming, inspect the current snapshot and prior runs before adding evidence.
6. Never direct a tool to an arbitrary host path or bypass the investigation mount.

## Observe with Joern

1. Reindex Joern against the intended clean checkpoint when no matching current CPG
   exists.
2. Use raw CPGQL freely while exploring. Preserve the exact query and complete
   output through the run artifact.
3. Promote a recurring query into typed `effect-joern` code only after its shape
   proves stable.
4. Treat a stale CPG result as evidence about its recorded source snapshot, not the
   current branch.
5. Describe only the concrete structural claim supported by the result. Do not
   elevate a graph observation into a repository-wide law without further work.

## Formalize with Maude

Use `maude_run` when an executable theory can expose consequences or
counterexamples that the raw observation cannot.

1. Write native Maude source and commands.
2. Reference the Joern or earlier Maude runs that informed the theory.
3. Add a concise abstraction note when it helps a later reader understand which
   concrete distinctions were retained or discarded.
4. Interpret parse failures, search results, counterexamples, and bounded successes
   as evidence. A successful bounded run is not proof that the repository is
   correct.
5. Revise by creating another run.
6. Promote a useful theory beneath `.attune/theories/` only when it has become a
   curated survivor.

## Falsify with fast-check

Use `property_run` to search for minimized concrete counterexamples to:

- a Joern observation's claimed invariance;
- a Maude theory's agreement with implementation behavior;
- an agent-authored Joern-to-Maude abstraction;
- an ast-grep rule's agreement with the evidence or intended theory subset.

Write ordinary TypeScript using Effect and fast-check. Use the thin
`defineProperty` module contract, but do not create a property DSL. Derive
arbitraries with `Schema.toArbitrary` when an Effect Schema is the natural source;
use native fast-check arbitraries, model commands, or schedulers when they are the
better fit.

For each run:

1. Check that `expectedSnapshot` matches the investigation.
2. Reference the evidence whose relationship the property challenges.
3. Choose bounded `numRuns` and timeout values.
4. Supply `seed` and `path` when replaying a failure.
5. Let `fc.check` return structured run details.
6. Inspect the minimized counterexample, seed, counterexample path, shrink count,
   scheduler trace when applicable, and exact runtime identity.
7. Classify the result carefully:
   - the implementation may be wrong;
   - the theory may omit a transition;
   - the observation or transformation may be too coarse;
   - the projection or equivalence relation may be wrong;
   - the property harness itself may be invalid.
8. Refine the relevant artifact and run again. Do not rewrite the old run.

Promote a stable property beneath `.attune/properties/` only when it deserves to
become repository-owned. Preserve its originating run and important
counterexamples by reference, without treating prose sidecars as normative.

## Enshrine with ast-grep

Use ast-grep only for the syntactically enforceable residue of the investigation.

1. Write native rules and tests into the investigation branch using the
   repository's `sgconfig.yml`, or add a native configuration explicitly.
2. Run `ast_grep_run` in `test` mode for the exact rule bytes and expected
   snapshot.
3. Run `scan` to retain complete findings.
4. Run `apply` only with the required clean-state and successful-prior-test guards.
5. Inspect the patch and changed files. The tool must not commit implicitly.
6. Where useful, run a property after the lowering to challenge claims such as:
   - matching survives irrelevant renaming or formatting;
   - applying the fix removes the prohibited observation;
   - the fix is idempotent;
   - known exceptions remain unmatched;
   - independent rewrites commute where claimed.
7. Record omitted semantic conditions in a lowering note. Do not imply that
   ast-grep represents the complete Maude theory.

## Refine and promote

Move freely around the loop:

```text
Joern → Maude → fast-check → ast-grep
  ▲          counterexample       │
  └───────────────────────────────┘
```

A counterexample may send the investigation back to the query, abstraction,
theory, implementation, equivalence relation, or lowering. Preserve each branch of
that reasoning as native artifacts and explicit references; do not force it into a
single ontology.

Git should retain only artifacts deliberately promoted by the agent or human:
typed queries, native theories, ordinary properties, native rules and tests, and
accepted repository changes. AgentFS retains all attempts.

## Finalize

1. Ensure the investigation branch has an explicit final checkpoint.
2. Inspect the surviving theory, property, rule, patch, and evidence references.
3. Write a concise conclusion that distinguishes observations, falsified claims,
   surviving claims, unresolved gaps, and promoted artifacts.
4. Call `investigation_finalize` with the final snapshot and selected run
   references.
5. After finalization, treat the capsule as immutable evidence. Build reports or
   catalogs as disposable projections rather than mutating the capsule.

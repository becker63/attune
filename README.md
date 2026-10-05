# Attune v2 bootstrap

Small executable questions about how software is put together, and a bootstrap
that can answer a few of them without a model, a dataset or a credential.

This repository is the independently buildable Attune v2 bootstrap: its own
pinned Bazel, Flix, Java and Nix plumbing, a small shared nominal envelope, an
authentic native Flix test spine that runs inside a real network-denied
namespace, and retained Grit frontends with the approved bounded Ruby arm. It
does not depend on the read-only `attuneflix/` checkout, on the mission archive,
or on any credential. The old AttuneFlix experiment is untouched.

## Layout

The checkout root holds exactly four ordinary entries: this `README.md`, the
`LICENSE`, the read-only reference checkout `attuneflix/`, and the active
workspace `attune/`. Everything that builds or runs lives under `attune/`:
`src/` for the shared Flix owners and the mechanical Java seams, `test/` for the
native fixtures and laws, `platform/` for the build rules, mechanical boundary,
pinned native support and carried editor assets, and `notes/` for the one design
note and the approved mission. The credential file `.env`, the agent tooling and
the VCS metadata sit at the checkout root as hidden metadata; they are never
build inputs.

The public gate is one command, run from the nested workspace, with the output
base kept outside the workspace so one Bazel owner at a time is the rule:

```
cd attune
nix develop --command bazel --output_base="$HOME/.cache/attune-v2-bootstrap-bazel" test //...
```

`services.yaml` declares the same commands (`test`, `typecheck`, `lint`) and adds
the Nix credential-helper check.

## Why I want this

The starting point is [Can One Edit Predict the Future?](https://www.becker63.digital/Blogs/one-edit):
two plausible explanations agree on one example, so construct a small separating
example and see where they disagree. The old implementation is
[AttuneFlix](https://github.com/becker63/attuneflix) and Atlas is its bounded
structural language. What I want from this iteration is a repository that
remembers a question precisely enough to rerun it, and that keeps its own limits
next to the claim.

So the bootstrap does one thing well: it takes a tiny Ruby shop, extracts the
structural facts with the real pinned Grit engine, admits only the edges it can
justify, walks and projects them with typed Flix, and renders the result as
ASCII. The diagrams in this file are not hand-drawn: they are the generated
output, and a native test compares them with the bytes checked in here.

## The authored Ruby shop

Three files, no application server, no Rails, no metaprogramming claim:

- [pricing.rb](attune/test/grit/fixtures/shop/pricing.rb) defines `Shop::Pricing.total_cents`
- [receipt.rb](attune/test/grit/fixtures/shop/receipt.rb) requires `pricing` and renders a receipt
- [checkout.rb](attune/test/grit/fixtures/shop/checkout.rb) requires `pricing` and decides free shipping

The extraction convention for the file-level relation called `imports` is a
uniquely resolved, literal `require_relative`:

```ruby
require_relative "pricing"
```

That is a convention, not a claim that Ruby has TypeScript module semantics.
`receipt.rb` and `checkout.rb` each write one, and `pricing.rb` writes none, so
its import frontier is legally empty rather than unknown. Every extracted range
and identity is asserted in [GritSeamTest.flix](attune/test/grit/GritSeamTest.flix),
which runs the real engine over exactly these bytes.

## Legal, empty and reused routes

A frontier is a complete typed set that carries its world and its domain. Six
directed atoms map one frontier to the next; the reverse atoms are derived from
the forward relations once, never extracted again. The route document below is
generated from the admitted edges by `Attune.View`, written by the one
`Attune.AsciiTree` writer, and compared byte-for-byte with the payload between
the markers in this file:

<!-- attune:snippet=routes -->
```text
graph=route snapshot=shop-v1 memo=demo schedule=recorded-serial

route=R status=OK

Files -> imports -> Files

R: Files{shop/receipt.rb}
   `-- imports -> Files{shop/pricing.rb}  [OK; COMPUTED t1]

route=E status=EMPTY

Files -> imports -> Files

E: Files{shop/pricing.rb}
   `-- imports -> Files{}  [EMPTY]

route=A status=OK

Symbols -> defined_in -> Files -> imports -> Files

A: Symbols{Shop.Receipt.render}
   `-- defined_in -> Files{shop/receipt.rb}  [OK; COMPUTED t3]
       `-- imports -> Files{shop/pricing.rb}  [OK; COMPUTED t4]

route=B status=OK

Files -> imports -> Files -> imported_by -> Files

B: Files{shop/receipt.rb}
   `-- imports -> Files{shop/pricing.rb}  [OK; REUSE t4]
       `-- imported_by -> Files{shop/checkout.rb, shop/receipt.rb}  [OK; COMPUTED t6]
```
<!-- attune:end=routes -->

`OK` and `EMPTY` describe an answer; `COMPUTED` and `REUSE` describe recorded
work. They are independent axes, so `EMPTY; REUSE t4` is representable. A reuse
tag is accepted only when the named producer is present, earlier in the same
recorded serial run, and carries the same world, memo scope, exact input
frontier, atom and output. Equal output from unequal input proves nothing, and
the renderer never sorts an execution history to manufacture a hit. Routes `A`
and `B` end on the same exact frontier; only `B`'s first transition is recorded
as a reuse, because only that key matches `t4` exactly. This is an authored
serial-event fixture, not a live cache measurement.

## The viewer is a query, not a second repository

The same admitted edges select an induced view. Two seeds share one imported
centre, so the view keeps both directed edges, including the one that no
traversal tree would draw:

<!-- attune:snippet=view -->
```text
graph=view name=imports scope=shop-v1 mode=adjacency

nodes
+-- Files{shop/checkout.rb}
+-- Files{shop/pricing.rb}
`-- Files{shop/receipt.rb}

edges
+-- Files{shop/checkout.rb} --imports--> Files{shop/pricing.rb}
`-- Files{shop/receipt.rb} --imports--> Files{shop/pricing.rb}
```
<!-- attune:end=view -->

Geometry cannot change a meaning: an induced view falls back to an exact labeled
adjacency listing for cycles, self-loops and parallel relation kinds rather than
dropping, reversing or relabelling an edge. The node and edge sets are asserted
independently in [SemanticViewLaw.flix](attune/test/view/SemanticViewLaw.flix) and
[P09Views.flix](attune/test/proposals/P09Views.flix).

## A Datalog claim and its counterexample

A route follows relations; a rule asks whether several of them hold at once. The
rule below is a real first-class Flix Datalog fragment, and the native query runs
over facts built from the admitted shop edges, not from a transcribed copy:

```
Pair(s, a, b, center) :- Imports(s, a, center), Imports(s, b, center), if (a != b).
```

The rendered proof keeps the head and every premise of one application:

<!-- attune:snippet=proof -->
```text
graph=proof goal=Pair scope=shop-v1
outcome=WITNESS

Pair(s, a, b, center) :-
+-- left Imports(s, a, center)  [s=shop-v1, a=shop/checkout.rb, center=shop/pricing.rb]
+-- right Imports(s, b, center)  [s=shop-v1, b=shop/receipt.rb, center=shop/pricing.rb]
`-- a != b  [true]
```
<!-- attune:end=proof -->

One file cannot fill two distinct roles. On a small counterexample scope with a
single importer the query has no row, and the readout shows the false guard
instead of an empty success:

<!-- attune:snippet=counterexample -->
```text
graph=proof goal=Pair scope=one
outcome=NO-MATCH

Pair(s, a, b, center) :-
+-- left Imports(s, a, center)  [s=one, a=receipt.rb, center=pricing.rb]
+-- right Imports(s, b, center)  [s=one, b=receipt.rb, center=pricing.rb]
`-- a != b  [false]
```
<!-- attune:end=counterexample -->

A failed match of a legal query is not an illegal route. Match, complete
no-match, unknown and failure stay four distinct outcomes; the route laws live in
[RouteViewLaw.flix](attune/test/view/RouteViewLaw.flix) and the semantic-view proposal
in [P09Views.flix](attune/test/proposals/P09Views.flix).

## The commented grammar cannot drift

The type table is one vocabulary: route validation and grammar display both read
the six atoms from [Envelope.flix](attune/src/Attune/Envelope.flix), so a legal grammar
branch is exactly a step the validator accepts. The depth-two Symbols
continuation tree is documented in a comment in
[View.flix](attune/src/Attune/View.flix) and compared with the regenerated output, so
the comment cannot silently go stale.

## Three checks, kept separate

1. **Semantic sets.** The expected nodes, edges, frontiers and witnesses are
   stated independently and asserted after real extraction and admission:
   [GritSeamTest.flix](attune/test/grit/GritSeamTest.flix),
   [PolicyCases.flix](attune/test/policy/PolicyCases.flix).
2. **Renderer goldens.** The independently stated byte goldens for the writer,
   routes, grammar, proofs and views live in `test/view`, including
   [RouteViewLaw.flix](attune/test/view/RouteViewLaw.flix) and
   [SemanticViewLaw.flix](attune/test/view/SemanticViewLaw.flix).
3. **Document correspondence.** The actual checked-in payloads above are
   compared with regenerated output by
   [ReadmeCorrespondence.flix](attune/test/docs/ReadmeCorrespondence.flix), which reads
   the real README and the real `View.flix` comment. A drifted payload, a
   missing or duplicated marker and a broken local link each fail. No test ever
   rewrites or blesses a document.

The marker extraction and link resolution are Flix semantics in
[Docs.flix](attune/src/Attune/Docs.flix); Java supplies only the mechanical file read.

## What runs today

| Surface | Target | Status |
| --- | --- | --- |
| Public gate | `bazel test //...` | passes |
| Shared envelope laws | `//test/spine:envelope_test` | passes |
| Isolation boundary | `//test/spine:isolation_test` | passes |
| Nominal compiler negative | `//test/spine:nominal_negative_test` | passes |
| Manual false assertion | `//test/spine:false_assertion_test` | tagged `manual`; fails when run directly |
| Honest counting laws | `//test/policy:count_law_test` | passes |
| Named policy cases | `//test/policy:policy_cases_test` | passes |
| Declared-source policy | `//test/policy:declared_source_policy_test` | passes |
| Live workspace audit | `//test/policy:workspace_audit_test` | passes; `local` and unconditionally re-executed |
| Retained Grit + Ruby | `//test/grit:grit_ruby_test` | passes |
| Writer and typed views | `//test/view:*` | passes |
| Documentation correspondence | `//test/docs:readme_correspondence_test` | passes; `local` and unconditionally re-executed |
| Typed inference seam | `//test/seam:inference_seam_test` | passes |
| Typed Parquet seam | `//test/seam:parquet_seam_test` | passes |
| Ten typed proposals | `//test/proposals:*` | execute from the test-only namespace |

## The models stay visible, and offline

The earlier work used **Qwen3 Embedding 8B** for the broad semantic prior and
**Jev 1.13** for narrow decisions. Those routes stay visible as the proposed v2
dataflow, and their current handlers are **fake and offline**: the approved
LangChain4j seam is driven by a deterministic recorded transport, with request
identity and classified errors preserved, and no provider, endpoint, credential
or socket is used. Acquisition and decision contracts are exercised as test-only
proposals in `test/proposals`, never as a live call.

## Handoff status

The gate passes as measured, with shared implementation code 4,291 of the
user-approved 4,300, test code 2,579 of 2,600 and test-only proposal code 841 of
1,500; the exact table, the pins and licenses and the per-file adaptation record
are in [the design note](attune/notes/design.md). Setup is the declared developer shell with one
Bazel owner, an output base outside the workspace, and no credential or provider
read; the only model-shaped code is the recorded fake transport above.

The counter now pairs an ordinary string's escapes exactly, so an escaped quote
cannot close a literal early and hide the lines after it. The named native
regression `anEscapedQuoteDoesNotCloseAnOrdinaryLiteral` executes that law, and
the design note records the corrected rows and the budget-neutral residuals that
remain disclosed. The workspace now lives under `attune/`; the design note
records the checkpoint, the old/new path inventory and the external backup of
the two confirmed obsolete bundles that were removed from the checkout root.
The independent reviews of P01-P10 are recorded in the design note index: each
proposal carries one non-author round-1 scrutiny verdict, and nothing here
claims a live or user-flow result.

## Deferred

This bootstrap establishes the build spine, the shared envelope, the policy and
counting surfaces, the two typed JVM seams, the retained Grit frontends with the
Ruby arm, the ASCII writer and typed route/grammar/proof/view adapters, and the
checked documentation correspondence. Deliberately not selected or run here:

- any final source, cache-ownership, sharding or "most parallel" topology;
- real datasets, retained priors, localization experiments, census or benchmarks;
- a general view catalog, large-graph layout, ASCII parser or architecture browser;
- promotion of any test-only proposal into production semantics.

No architecture decision is implied by this file, and no localization gain is
claimed. The source map, the pins and licenses, the per-file adaptation record,
the current counts and the proposal index are in [the design note](attune/notes/design.md); the
repository rules an agent must follow are in [AGENTS.md](attune/AGENTS.md); the license
is [LICENSE](LICENSE).

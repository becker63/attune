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

The checkout root holds exactly four intended ordinary entries: this `README.md`,
the `LICENSE`, the read-only reference checkout `attuneflix/`, and the active
workspace `attune/`. One further root entry is permitted and preserved: the user
`repomix-output.xml` bundle, which is kept intact, named here as prose rather
than linked, and excluded from active action, Nix and CAS input. Everything that
builds or runs lives under `attune/`:
`src/` for the shared Flix owners, `test/` for the
native fixtures and laws, `platform/` for the build rules, the mechanical
adapters (the boundary launcher, the Grit FFM binding and the Arrow codec),
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

The authenticated BuildBuddy service can also execute the declared native
producer/consumer route remotely, opt-in and on the same pinned toolchain:

```
cd attune
nix develop --command bazel --output_base="$HOME/.cache/attune-v2-bootstrap-bazel" test \
  //test/dag:declared_artifact_consumer_test --config=remote
```

`--config=remote` adds the published endpoint `grpcs://remote.buildbuddy.io`, the
`@buildbuddy_toolchain//:platform_linux_arm64` execution platform (arm64, matching
the declared JDK 25 runtime; `dockerNetwork=off`), and the declared portable
native route. In that profile the native action carries no host Nix `unshare`
binary: the pinned `unshare` creates the local user/network namespace, which a
provider container cannot run, so the remote route uses the platform's own
network-disabled container instead and does not claim a namespace it did not
create. `services.yaml` declares the same selection as the `remote_native`
command. The ordinary gate above is unchanged and needs no credential.

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
the renderer never sorts an execution history to manufacture a hit. A route seed
and every recorded transition frontier must also belong to the snapshot world
named in the header, so a seed from another world is rejected before any
document is made, even when the route has no steps to chain through. Routes `A`
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
independently, with the direction, relation and non-ASCII-rejection laws, in
[SemanticViewLaw.flix](attune/test/view/SemanticViewLaw.flix).

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
[RouteViewLaw.flix](attune/test/view/RouteViewLaw.flix) and the proof laws in
[ProofViewLaw.flix](attune/test/view/ProofViewLaw.flix), and a proof readout stays
a different document from a route readout.

## Two whole-system fixture applications

The same authored shop drives the two studies this instrument is built for, so
both fixture application reports trace a real computation rather than a
transcribed narrative. Localization predicts the file a task touches from the
admitted `imports` relation; coordination decides whether two declared task
intents coordinate, using the shared `Attune.Study` policies over the real
admitted call relation. Both reports are rendered by the bounded `Attune.View`
writer, and both are labelled fixture work rather than an external result:

<!-- attune:snippet=localization -->
```text
graph=application name=localization scope=shop-v1 work=fixture

prediction task=receipt = shop/pricing.rb assuming(structural-imports-only)

prediction task=pricing = EMPTY assuming(legal-empty-continuation)

observation task=receipt = Unmeasured assuming(no-external-execution)

observation task=pricing = UNKNOWN assuming(coverage-partial)

history task=receipt = none assuming(no-retained-localization-evidence)

fixture task=receipt = gold=shop/pricing.rb hit=true assuming(labelled-fixture-gold)
```
<!-- attune:end=localization -->

<!-- attune:snippet=coordination -->
```text
graph=application name=coordination scope=shop-v1 work=fixture

prediction pair=receipt/checkout = CoordinatesBecause(E1:SameDeclaredBoundary(Shop::Pricing)) assuming(single-declared-boundary)

prediction pair=receipt/checkout-both-extend = ParallelBecause(E1:DistinctAnchorsAndNoDirectCallOn(Shop::Pricing)) assuming(distinct-anchors-no-direct-call)

prediction pair=receipt/absent = UnknownBecause(E1:UnknownIntent) assuming(unknown-intent-stays-unknown)

observation pair=receipt/checkout = Unmeasured assuming(no-external-execution)

observation query=Shop.Nothing.render = UNKNOWN assuming(coverage-partial)

observation coverage=failure = FAILED assuming(classified-failure-not-unmeasured-success)

history retained-corrected-v2 = NotEarned assuming(historical-replay-is-not-external-execution)

fixture acquired-shop = Partial assuming(three-authored-files)
```
<!-- attune:end=coordination -->

Every entry carries its provenance, and the report header names the application
and the world scope. `prediction` is the frozen answer the method produced,
`observation` is the evaluator side of the same world, and `history` is the
retained corrected-v2 promotion. The observations keep three different states
apart, so an unmeasured obligation, an unknown coverage state and a classified
failure can never be read as each other. The coordination decisions stay
witness-bearing: `CoordinatesBecause`, `ParallelBecause` and `UnknownBecause`
carry their witnesses and the assumptions they rest on rather than collapsing to
a bare label. The report's own `work=fixture` says what this is: labelled fixture
work, with no external measurement claimed.

## The commented grammar cannot drift

The type table is one vocabulary: route validation and grammar display both read
the six atoms from [Attune.flix](attune/src/Attune.flix), so a legal grammar
branch is exactly a step the validator accepts. The depth-two Symbols
continuation tree is documented in a comment in
[View.flix](attune/src/Attune/View.flix) and compared with the regenerated output, so
the comment cannot silently go stale.

## Three checks, kept separate

1. **Semantic sets.** The expected nodes, edges, frontiers, witnesses and
   application entries are stated independently and asserted after real
   extraction and admission:
   [GritSeamTest.flix](attune/test/grit/GritSeamTest.flix),
   [PolicyCases.flix](attune/test/policy/PolicyCases.flix), and the two
   whole-system reports in
   [ReadmeCorrespondence.flix](attune/test/docs/ReadmeCorrespondence.flix).
2. **Renderer goldens.** The independently stated byte goldens for the writer,
   routes, grammar, proofs, views and application reports live in `test/view`,
   including [RouteViewLaw.flix](attune/test/view/RouteViewLaw.flix),
   [SemanticViewLaw.flix](attune/test/view/SemanticViewLaw.flix) and
   [ApplicationViewLaw.flix](attune/test/view/ApplicationViewLaw.flix).
3. **Document correspondence.** The actual checked-in payloads above, including
   the localization and coordination reports, are compared with regenerated
   output by
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
| Cognitive-ownership accounting | `//test/policy:accounting_law_test` | passes; component classification, presentation subsets and soft review semantics |
| Declared-source policy | `//test/policy:declared_source_policy_test` | passes |
| Live workspace audit | `//test/policy:workspace_audit_test` | passes; `local` and unconditionally re-executed |
| Retained Grit + Ruby | `//test/grit:grit_ruby_test` | passes |
| Writer and typed views | `//test/view:*` | passes |
| Whole-system application reports | `//test/view:application_view_test` | passes; coordination and localization goldens with the four provenances kept apart |
| Documentation correspondence | `//test/docs:readme_correspondence_test` | passes; `local` and unconditionally re-executed |
| Typed inference seam | `//test/seam:inference_seam_test` | passes |
| Typed Parquet seam | `//test/seam:parquet_seam_test` | passes |
| Typed prior/decision laws | `//test/seam:decision_seam_test` | passes; the prior/request/evidence/`settle` contract is production code in `Attune.Study`, driven over the recorded fake transport |
| Bounded native theory | `//test/theory:theory_law_test` | passes; descriptor grammar, canonicalization, native lowering and shared-index laws |
| Declared native producer/consumer | `//test/dag:declared_artifact_consumer_test` | passes; a producer action runs the pinned native Tester and emits a declared immutable source tree, and the consumer compiles and asserts that declared tree |

The declared-artifact route is the smallest step toward the shared graph: a
producer target runs the pinned compiler's authentic native Tester over explicit
declared sources and jars and emits one declared immutable source tree (a
regular-file copy of each exported source beside a mechanical `closure.tsv`
naming the exact source/jar/binding closure), and a consumer target takes that
tree as a declared input, compiles its exported source with the same engine and
asserts the tree's exact file set, byte identity and closure. Nothing depends on
`TEST_UNDECLARED_OUTPUTS`, no authored application main, registry, fat JAR,
resolver or shell action is added, and the action closure is inspectable with
`bazel aquery`.

## The models stay visible, and offline

The earlier work used **Qwen3 Embedding 8B** for the broad semantic prior and
**Jev 1.13** for narrow decisions. Those routes stay visible as the proposed v2
dataflow, and their current handlers are **fake and offline**: the approved
LangChain4j seam is driven by a deterministic recorded transport, with request
identity and classified errors preserved, and no provider, endpoint, credential
or socket is used. Acquisition and decision contracts are exercised as recorded
fixture seams in `test/seam`, never as a live call; the typed
prior/request/evidence contract itself is production source in `Attune.Study`.

## Handoff status

The owner-approved cognitive-ownership accounting replaced the absolute size
gates: the non-presentation 1,800 / combined 2,200 rules and the shared 4,300
compatibility gate are retired, not raised. `//test/policy:declared_source_policy_test`
now reports A cognitive 4,233, B mechanical 1,278, A+B authored 5,511, C test
3,753 and C support 21,884 (raw 33,437 code lines over 123 readable files; the
report also prints the derived physical 41,341 and nonblank 39,362 totals on the
same line); the
per-component table, the exact support provenance, the presentation subsets
(A/presentation 510, B/presentation 87), the concise six-chunk
residency/ownership walkthrough and the bounded STOP-AND-JUSTIFY
architecture review are in [the design note](attune/notes/design.md). An
independent review once found that a blanket `test/** -> fixture` rule hid
reusable test-placed algorithms. That exception is now retired rather than
widened: all three portions it named are production code in named owners, so an
ordinary `test/**` path is a fixture again with no carve-out and nothing is
hidden. The P06 descriptor safety/alpha-normalization lives in `Attune.Theory`,
the P09 projection identity in `Attune.View`, and P08's typed
prior/request/evidence contract with `settle` in `Attune.Study`; the last
bootstrap proposal, its `test/proposals` package and its policy admission are
gone. The two temporary core owner files (`Attune.Envelope`, `Attune.Apply`) were
folded into the one `Attune` owner, and the typed Arrow codec moved to
`platform/tools/parquet/` with no line changed and no saving claimed. A soft
threshold crossing yields a review note, never a
rejection, so a total above the preferred range still accepts. Setup is the declared developer shell with one
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

This bootstrap establishes the build spine, the shared envelope, the canonical
coverage vocabulary, the bounded native Theory owner, the policy and
counting surfaces, the two typed JVM seams, the retained Grit frontends with the
Ruby arm, the ASCII writer and typed route/grammar/proof/view adapters, and the
checked documentation correspondence. Deliberately not selected or run here:

- any final source, cache-ownership, sharding or "most parallel" topology;
- real datasets, retained priors, localization experiments, census or benchmarks;
- a general view catalog, large-graph layout, ASCII parser or architecture browser;
- any model choice, live provider effect, ranking-quality claim or application
  policy selection beyond the recorded fixture decision contract.

No architecture decision is implied by this file, and no localization gain is
claimed. The source map, the pins and licenses, the per-file adaptation record,
the current counts and the proposal index are in [the design note](attune/notes/design.md); the
repository rules an agent must follow are in [AGENTS.md](attune/AGENTS.md); the license
is [LICENSE](LICENSE).

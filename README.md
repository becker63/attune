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
than linked, and excluded from active action, Nix and CAS input. One owned
deliverable is also permitted at the root: the single localization performance
report `LOCALIZATION_REPORT.md`, kept as prose and not linked, maintained in
place rather than copied, and never a build, Nix or CAS input. This exception
admits no other bundle, and the preserved `repomix-output.xml` is never a source
input. Everything that builds or runs lives under `attune/`:
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
native route. The platform's container image is pinned by its registry-resolved
immutable digest
(`gcr.io/flame-public/rbe-ubuntu22-04@sha256:0d84a80bb0fc36ba5381942adcf6493249594dcc9044845c617b78c9b621cae3`,
declared in `MODULE.bazel`), so an execution record names the exact runtime bytes
rather than a moving `:latest` tag. In that profile the native action carries no
host Nix `unshare`
binary: the pinned `unshare` creates the local user/network namespace, which a
provider container cannot run, so the remote route uses the platform's own
network-disabled container instead and does not claim a namespace it did not
create. `services.yaml` declares the same selection as the `remote_native`
command. The ordinary gate above is unchanged and needs no credential.

The same opt-in profile runs the bounded process-receipt fixture, which executes
one declared argv plan through the existing mechanical launcher: it drains both
log streams concurrently under a finite declared byte cap, applies the declared
finite timeout, destroys the process tree on timeout and records raw receipts.
A measured nonzero child exit is data rather than an infrastructure failure, and
an unstarted, timed-out, truncated or runtime-failed command is unmeasured with
its primary reason and cleanup state preserved. A bounded log that cannot be
opened or written, or a child pipe that fails before end-of-stream, is the same
kind of runtime failure: the incomplete receipt stays unmeasured rather than
becoming a clean measurement just because the child exited zero. The plan and
the interpretation
are Flix `Attune.Study` values; the mechanical boundary decides no policy. A
`--define=attune_measurement_freshness=<token>` scopes a fresh measurement
identity to the receipt action only, so deterministic world artifacts stay
cacheable. `services.yaml` declares the same selection as the `remote_receipts`
command.

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
| Declared study graph | `//test/study:all` | passes; the admitted world/task/pair fan-out with the shared world index, the gold-free prediction firewall and the separate evaluator reducer |
| Prediction firewall | `//test/study:firewall_test` | passes; each stage's declared input set is asserted against its allowlist, so no public prediction-side stage declares an evaluator artifact and the prediction carries the one declared frozen policy |
| Pinned corpus acquisition | `//test/catalog:catalog_pin_test` | passes; tagged `manual`; the declared immutable `nebius/SWE-rebench-V2` file is materialized and its exact bytes, digest and physical schema are verified through the projected Arrow boundary |
| Streaming normalization and provenance | `//test/catalog:catalog_normalize_test` | passes; tagged `manual`; the full pinned catalog is streamed in bounded projected batches, every row's fate is reduced by Flix and the audited denominators, accepted js/ts population, classified exclusions/failures, retained provenance and public/oracle separation are recorded |
| Bounded shared panel and split | `//test/catalog:panel_artifact_test` | passes; tagged `manual`; the normalized accepted js/ts population is reduced to the one bounded, deterministic, metadata-only panel in `Attune.Study` (at most 24 canonical fork/duplicate groups, four tasks per group, 32 ordered pairs across eight included groups), with the group-disjoint approximately 60/20/20 split, the exposure flags, the explicit selection attrition and the classified image pins |
| External localization reference labels | `//test/study:localization_labels` | passes; tagged `manual`; the admitted real panel is mapped into the shared record vocabulary and all 96 selected tasks' real reference patches are reduced against their exact worlds' verified clean-source inventories (92 worlds, 36,288 recorded baseline JS/TS paths), with the seven classified cases, the full-versus-supported coverage and the physically separate evaluator labels; `//test/study:localization_law`, `localization_artifact_test` and `localization_admission_test` are the corpus-free, artifact and admission laws |

The declared study graph is the complete world/task/pair fan-out the analysis
manifest admits. Each exact world materializes its source tree and facts/index
once, and every declared theory shard materializes its own bounded slice of the
world's descriptors: the declared index is carried as a generated record from the
admitted manifest, so a later shard lowers its own candidates rather than a
duplicate of the first slice, and a legal empty slice stays a typed empty
artifact. Each task joins the shared witnesses cheaply and predicts
from the joined context, the shared index and the one declared frozen policy
alone; each pair's individual checks stay speculative and its joint checks
consume the frozen pair predictions. The one stage that reads a label is the
declared `reduce_<task>` evaluator join, whose only inputs are the frozen
prediction and one separately declared label artifact. `bazel aquery
"deps(//test/study:prediction_t1)"` shows the prediction closure carries no
variant, plan or label, and `//test/study:firewall_test` pins the same boundary
over the declared input sets each stage recorded, including that the prediction
carries exactly the declared policy identity. The frozen policy is a
prediction-only public input, not a literal in the shared stage sources: a
controlled policy change re-executes only the predictions and their
`reduce_<task>`/joint dependents, while the world source, shared facts and theory
shards stay cached. The same controlled probe shows a task-anchor change leaves
those world artifacts cached, and a label-only change leaves the frozen
prediction cached.

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
The only owner-authorized live work is the fixed downstream exploratory
extension published in the root `LOCALIZATION_REPORT.md` — the live JEV route,
the remote CodeRankEmbed and hosted-Qwen acquisitions, and the two Sol arms on
the dedicated SIWC platform — each with its own documented credential boundary;
the deterministic arms and coordination remain provider-free.

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

The counts in the paragraph above are the compact-ownership leaf's snapshot, not
the live totals; the canonical measured block is in
[the design note](attune/notes/design.md). The one approved pinned corpus is now
acquired through declared checksum mechanics: the main issue-based
`nebius/SWE-rebench-V2` release at revision
`10483de0f50fe5da545942705a76c6150171af7f`, path `data/train-00000-of-00001.parquet`,
SHA-256 `0e0bf9355f892ad74ae98d4e1c404f39fd6654a8e351ee3e6ab162e4a64cd3ad`
(428,839,266 bytes) is materialized by the `manual` `//test/catalog` acquisition,
which verifies the real bytes and the physical schema through the minimal
projected/batched Arrow boundary and leaves every scientific decision to Flix.
The ordinary `bazel test //...` gate never fetches or scans it. The same pinned
catalog is then streamed in bounded projected batches by the `manual`
`//test/catalog:catalog_normalize` stage, which reduces every row's fate in Flix
and records the audited raw/normalized/js-ts/accepted/excluded/failed
denominators, the accepted js/ts population with its retained license evidence,
the classified exclusions and failures, the dataset attribution with the
explicitly unavailable dataset-license and fork provenance, and the declared
public/evaluator column separation. The same accepted js/ts population is then
reduced by the `manual` `//test/catalog:panel_select` stage to the one bounded,
deterministic, metadata-only shared panel in `Attune.Study`: at most 24 canonical
repository/fork groups (the lower-cased final repository-name segment collapses
duplicates, backports, snapshots and forks onto one group) and four tasks per
group for localization, at most 32 ordered pair candidates across at most eight
included groups, and the frozen group-disjoint approximately 60/20/20
development/calibration/final split with its largest-remainder rounding, its
prior-exposure flags, its explicit selection attrition and its classified image
pins. The public panel and the physically separate evaluator scope are admitted
before the study invocation. The `manual` `//test/study:localization_labels`
stage then maps that admitted real panel into the shared study record vocabulary
in `Attune.Study` and reduces every one of its 96 selected tasks' real reference
patch against that exact world's verified clean-source export inventory: gold is
the set of modified or deleted preexisting JS/TS source paths (a rename is
attributed to its old path), and full versus supported patch coverage, plus the
new-file-only, test-only, ambiguous, unsupported, missing-world and
empty-eligible-gold cases, are reported separately, so a missing or unsupported
label can never become an empty successful gold. The stage writes the physically
separate evaluator label artifacts, the audited coverage denominators, the
mapped public manifest and the classified findings; the ordinary `bazel test //...`
gate never fetches or scans the corpus, and the admitted label artifacts are
byte-identical to the emitted ones. The world facts and descriptor populations
that a fully expanded real graph needs are the following features' work, so no
localization gain is claimed for the label stage itself. The owner-approved
runtime-capped continuation then materializes the derived cohort's four
cumulative arms on the warm world/Theory/variant artifacts and reduces them
through the one canonical retrieval reducer in `Attune.Study.Metrics`: the
all-eligible population (85 tasks in 22 groups), its declared development
(50 eligible / 13 groups), calibration (20 / 5) and held-out final (15 / 4)
splits, and a labelled covered-only diagnostic, each with explicit
`population`/`covered`/`undefined` counts so no denominator shrinks silently,
plus six corpus-free metric laws at `//test/localization_runtime:metrics_law`
(deliberately not `manual`) pinning multi-file recall versus hit, abstention
denominators, undefined ratios and ineligible classifications. The measured
four-arm numbers, the runtime cutoff with its exact original/capped denominators,
and the honest gaps are reported in the root `LOCALIZATION_REPORT.md`, together
with the owner-authorized post-hoc extensions that have since been published
there: the embedding (`E`) branch, the hosted-Qwen (`Q`) branch, the two lexical
and hosted JEV pairs, the strict file-accuracy extension and its oracle
ceilings, the replicated five-observation family with its stability, ensembles,
working sets and economics, and the two standalone Sol arms (the original
`gpt-6.1-sol` medium arm and the distinct enforced read-only-inspected sibling).
The report's generation-18 section is the final synthesis over all available
arms and answers the owner's fifteen questions; every stage is `manual` and is
selected only through the declared remote commands, never by `bazel test //...`.
The root report also now carries the **ReviewBench first paired-economics result**
(`VAL-REVIEW-005`): the typed admission/source/finding/judge provenance over the
all-219 population with the 24 selected, 10 admitted and 14 attrition tasks, the
paired quality and elapsed tables, the separate cost lines with explicit
`Unavailable` markers (only the hosted Qwen and JEV dollars were actually
returned), the cold/warm-fresh/replay regimes, the 1/3/10 reviews-per-repository
index amortization with its stated assumptions, and the inline
cost-latency-quality graphs. The quality table and graph use the **corrected**
view — the owner-approved arm-isolated correction of the `haoling` cross-arm
duplicate bias, re-reduced through the one canonical
`Attune.Study.ReviewBenchJudge`/`Attune.Study.Metrics` path by the provider-free
`//test/reviewbench_judge:reviewbench_corrected_metrics` and bound as a declared
input — with the original biased table retained as labelled provisional history.
It is reduced provider-free by
`//test/reviewbench_economics:reviewbench_economics_report` over the frozen
receipts and the frozen owner-judge tree, with corpus-free laws in
`//test/reviewbench_economics:reviewbench_economics_law`; the corrected first
exploratory result is flat on the 10-task cohort and no positive outcome is
claimed.

## Scoped SIWC renewal

The ChatGPT-plan SIWC access token that the Sol arms and the downstream
ReviewBench sessions use is renewed automatically, demand-driven and serialized,
before any remote live batch. The only remotely updated artifact is the
BuildBuddy org secret `ACCESS_TOKEN`; the rotating refresh token stays host-local
private state. The host-side sequence is declared in `services.yaml` as
`siwc_probe` (pinned official CLI plus the names-only `ORG_ADMIN` probe),
`siwc_refresh` (the guarded helper: single-flight advisory lock, unique-temp
atomic rotation), `siwc_update` (the official `bb secrets update ACCESS_TOKEN`
upload) and `siwc_route_check` (a fresh, provider-free dedicated-platform check
that the injected token is present and unexpired). The secret-operations
credential is the dedicated org-admin entry `BUILDBUDDY_SECRET_ADMIN_API_KEY`,
read environment-first or as a single ignored-checkout-`.env` field and supplied
only to the CLI's child environment; the normal cache/RBE `BUILDBUDDY_API_KEY`
is never used for secret operations. `siwc_offline_tests` runs the
credential-selection and helper-discipline laws offline, with no network and no
real secret. The pinned official CLI requires a `--` separator before the
subcommand's `--file` flag. Nothing is promised about reboot or revocation
survival, or about a 30-day token: SIWC access tokens live about an hour, and
after a reboot or revocation only the owner login can restore them.

## Deferred

This bootstrap establishes the build spine, the shared envelope, the canonical
coverage vocabulary, the bounded native Theory owner, the policy and
counting surfaces, the two typed JVM seams, the retained Grit frontends with the
Ruby arm, the ASCII writer and typed route/grammar/proof/view adapters, and the
checked documentation correspondence. Deliberately not selected or run here:

- any final source, cache-ownership, sharding or "most parallel" topology;
- the approved corpus's retained priors, localization
  experiments, census or benchmarks (the one pinned corpus is acquired, streamed,
  reduced to the shared panel, reduced to its evaluator reference labels and then
  reduced to the runtime-capped cohort's frozen four-arm rankings and canonical
  metrics; every one of those stages is `manual` and is selected only through the
  declared remote commands, never by `bazel test //...`; the post-hoc exploratory
  JEV, embedding and hosted-Qwen extensions, the replicated family, and the two
  Sol arms are published in the root report, and the owner-approved ReviewBench
  first paired-economics result is published inline there as the terminal study
  feature; coordination/repair, any new corpus beyond ReviewBench, new models,
  effort sweeps, MCR and unrelated cleanup remain off-limits);
- a general view catalog, large-graph layout, ASCII parser or architecture browser;
- any model choice, live provider effect, ranking-quality claim or application
  policy selection beyond the recorded fixture decision contract.

No architecture decision is implied by this file, and no localization gain is
claimed. The source map, the pins and licenses, the per-file adaptation record,
the current counts and the proposal index are in [the design note](attune/notes/design.md); the
repository rules an agent must follow are in [AGENTS.md](attune/AGENTS.md); the license
is [LICENSE](LICENSE).

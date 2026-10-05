# Repository policy for agents

The approved scope lives in the mission documents. This file is the short
repository-side policy an agent must follow while changing this tree.

## Boundaries

- This workspace is the `attune/` child of the checkout root
  `/home/becker/projects/attune`. The checkout root holds exactly four intended
  ordinary entries: `README.md`, `LICENSE`, `attuneflix/` and `attune/`. One
  further root entry is permitted and preserved: the user `repomix-output.xml`
  bundle (owner amendment, 2026-10-05), kept intact and excluded from active
  action/Nix/CAS input by the root `.gitignore` rule. This exception admits no
  other bundle.
- `attuneflix/` (at the checkout root, a separate Git repository) is a read-only
  reference checkout, not project source. Never import it, symlink it, read it
  into an action or admit it to Nix or the CAS.
- `.factory/` (at the checkout root) holds agent tooling definitions for this
  mission. It is not project source: never admit it to Nix, Bazel, the CAS or the
  source policy.
- `.env` (at the checkout root) is the local credential file. Never read, hash,
  copy or print it; never pass a credential into an action input, argument, log
  or the store. Only the narrow BuildBuddy credential helper in `flake.nix` may
  read it, internally, from that explicit checkout root.
- No application provider, MCP or live model call, ever. The bootstrap-era
  sentence that this workspace carries no scientific data is stale: the approved
  mission authorizes the named pinned `nebius/SWE-rebench-V2` corpus and the
  selected studies, plus explicitly hashed minimal named historical imports from
  the recorded sibling location, under the scientific freeze order (rankings
  before evaluator labels; pair predictions before joint execution). Only that
  approved corpus and those studies are authorized. That is not authorization for
  a wider corpus, a different corpus, a rescue search or any provider/MCP/model
  acquisition, which remain forbidden.
- One Bazel owner at a time. The output base is outside the checkout
  (`services.yaml`); never run `bazel clean` or touch global caches.
- JVM dependencies are pinned: `MODULE.bazel` declares the exact Maven
  coordinates and `maven_install.json` pins every transitive artifact by
  SHA-256. Never resolve an unpinned coordinate at test time, and never let the
  resolver run outside the declared install.

## Remote execution profile

`--config=remote` (declared in `.bazelrc`, invoked as the `remote_native`
command in `services.yaml`) is the opt-in remote profile on the authenticated
BuildBuddy service. It adds the published endpoint `grpcs://remote.buildbuddy.io`
through the existing flake credential helper, wires
`@buildbuddy_toolchain//:platform_linux_arm64` as the *execution* platform
(declared properties `Arch=arm64`, `OSFamily=Linux`,
`container-image=docker://gcr.io/flame-public/rbe-ubuntu22-04:latest`,
`dockerNetwork=off`), and sets `--define=attune_native_isolation=platform`. The
aarch64 platform must match the declared JDK 25 runtime and the host
architecture: a mismatch is reported, never silently emulated.

The profile declares exactly two native isolation modes and never claims one it
did not create. Left unset, `--define` keeps the ordinary host route: the
mechanical launcher runs the pinned Tester inside the pinned util-linux
user/network namespace, and `//test/spine:isolation_test` asserts that boundary.
Set, the portable route runs the same authentic Tester directly in the provider
container, declares neither the Nix-store `unshare` binary nor its closure, and
takes its guest network denial from the platform's `dockerNetwork=off` property.
A fixture whose assertions are about the host namespace pins the host mode
(`native_flix_test(host_isolation = True)`) and is tagged `no-remote`; it can
never be the evidence for a remote native run. Do not add a local-execution
fallback that would let a remote action silently pass on the host, and do not
weaken `src/Attune/Isolation.flix` to accept a boundary the run did not create.

## Source policy

The compact policy in `src/Attune/Policy.flix` is the executable statement of
these rules; `bazel test //...` enforces it.

- Authored source lives under `src/`, `test/`, `platform/tools/`,
  `platform/build/` and `notes/`.
- First-party execution is Flix, minimal Java and Starlark only. Authentic
  native Flix `@Test` declarations over an explicit declared file list are the
  only first-party executable entrypoint. Authored `main` functions, per-case
  application mains, custom test engines, central registries and fat JARs are
  forbidden, as are shell scripts, shell actions, `run_shell`, shell genrules
  and Python runners. The declared producer action (`native_flix_producer`) is a
  Starlark `ctx.actions.run` of the same mechanical launcher through the pinned
  JDK runtime toolchain: it runs the authentic native Tester and emits a declared
  tree, and it is a build action rather than a new executable entrypoint.
- Java keeps only the unavoidable mechanics (filesystem metadata, process
  launch, runfiles resolution). Policy, classification, inventory and exclusion
  decisions, secret and size decisions, verdict and report formatting, isolation
  assertions and fixture cases live in Flix.
- Production source (`src/`) must not substitute a raw HTTP client for an
  approved SDK, and must never depend on test-only source. The bootstrap-era
  `test/proposals` namespace is retired and the `proposal-dependency` rule with
  it, because every proposal has migrated into a production owner: `Attune`,
  `Attune.Coverage`, `Attune.Repository`, `Attune.Theory`, `Attune.Study` and
  `Attune.View`. Do not recreate a test-only semantic module.
- The only admitted foreign families are inherited pinned support under
  `platform/support/`, maintained Grit queries (including the approved Ruby entry
  points), Ruby source-as-data fixtures and the carried Zed editor assets under
  `platform/zed/` whose pinned Flix grammar revision the Grit integration reuses.
  The approved Ruby arm is that maintained Grit inventory plus the pinned closure;
  it is not a first-party `src/native/` tree, which no longer exists.
- Every public Flix module carries a `///` comment. The core documents listed in
  `notes/design.md` must exist.

## Checked documentation

The checkout-root `README.md` and the selected source comment in
`src/Attune/View.flix` carry named marker blocks: an
`<!-- attune:snippet=NAME -->` line, the payload, and an
`<!-- attune:end=NAME -->` line. `//test/docs:readme_correspondence_test`
regenerates every payload from the authored Ruby shop through the pinned Grit
engine, admission, the typed view and the native query, and compares it with the
checked-in bytes. A drifted payload, a missing or duplicated marker and a broken
local link all fail. Never hand-edit a marked payload to satisfy a failing test,
never widen the marker vocabulary, and never let a test bless or rewrite a
document: fix the generator or the code. The three checks stay separate: the
admitted semantic sets, the renderer goldens in `test/view`, and the actual
document bytes. Because the README is maintained at the checkout root, outside
this nested workspace, the launcher binds it live and the test is `local` and
`external` (unconditionally re-executed).

## Declared population

A Bazel glob cannot cross a package boundary, so each package that carries
authored source exports a `policy_files` filegroup and `//:policy_sources`
aggregates them. A new package that adds authored source must add its filegroup
to `//:policy_sources`; otherwise its source would be silently unowned. The
separate local audit (`//test/policy:workspace_audit_test`) walks the live
workspace and catches source that no BUILD file admits. It runs as a normal test
inside `bazel test //...` and is tagged `local` and `external`, so Bazel
executes it unconditionally and it re-reads the current tree on every invocation
instead of replaying a cached verdict. Ordinary native tests stay cacheable:
test caching is not disabled globally, and the two live checks (the workspace
audit and the checked-document correspondence) opt out by tag.

## Internal delegation

One level of existing Task/CLI source-only delegation is allowed inside an
integration session, per the mission's parallel-work guidance:

- the integration owner alone edits shared files, builds and commits;
- children own disjoint source files, get explicit Flash/high routing, and have
  source-only tool allowlists with no Execute, build, Git or MCP tools;
- children never spawn grandchildren;
- prove the CLI routing resolves before any fan-out, and never substitute the
  CLI default model silently;
- launch nothing without measured headroom (the host currently has well under
  the ~1 GiB a single lightweight child needs alongside Bazel), so sequential
  work is the honest default here.

The `droid exec` option names above are verified against its installed help;
the exact Flash model id is not, because the help lists no model ids and the
default model is a different tier. Until a metadata-only routing probe confirms
the requested model actually resolves, treat fan-out as unproven and stay
sequential rather than substituting the default.

## Counting

`notes/design.md` records the current counts. Comment-only changes must not move
the code count; a trailing comment or a comment-like string still counts as code;
a recognised Starlark docstring, a multiline non-docstring Starlark literal and
markdown prose are documentation or code exactly as `notes/design.md` describes,
and an apostrophe in prose must never silence the lines after it. An escaped
quote inside an ordinary string literal must not close the literal early or hide
the following code from the count; `//test/policy:count_law_test` pins that law
in `anEscapedQuoteDoesNotCloseAnOrdinaryLiteral`. The owner-approved
cognitive-ownership accounting is the active policy (`library/cognitive-budget.md`,
2026-10-05): authored implementation is classified A cognitive / B mechanical,
with C tests/fixtures/inherited/generated support reported separately and honest
origins. The absolute non-presentation 1,800 / combined 2,200 rules and the shared
4,300 compatibility gate are retired, not raised: `src/Attune/Policy.flix` holds
no total-size gate and emits no `budget-exceeded` finding. Crossing a soft
threshold (cognitive review at 2,000 and around 2,500 STOP-AND-JUSTIFY before
further semantic concepts; mechanical preferred <=2,500; authored A+B review
around 5,000) produces a review note, never a rejection. A semantic algorithm
counts as cognitive under any placement, so test placement never exempts it. That
rule is now enforced by ownership rather than by a placement-based exception: the
P06 descriptor safety/alpha-normalization lives in the bounded `Attune.Theory`
owner, the P09 projection identity in `Attune.View`, and P08's typed
prior/request/evidence contract with `settle` in `Attune.Study`, so
`test/**` is a fixture population again with no carve-out and no hidden
algorithm. The generic coverage,
evidence and support vocabulary lives once in `src/Attune/Coverage.flix` (core),
and the bounded descriptor grammar, fixed native lowering and world-shard witness
rows live once in `src/Attune/Theory.flix`. Change policy only
by editing `src/Attune/Policy.flix`, never by golfing code, relabelling a
component or dropping tests. The measured per-component table, exact support
provenance and the bounded architecture review are in `notes/design.md`; the
counter's applied corrections and its budget-neutral residual limitations stay
recorded there, and no exact parser totals may be claimed while any remains.

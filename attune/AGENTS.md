# Working on Attune

The active Bazel workspace is this `attune/` directory. The repository root
contains the public README, license, and frozen experimental report. Keep this
nested layout: the launcher binds the README and license live for correspondence.

## Preserve work and evidence

- Preserve existing uncommitted and untracked user work. Never discard it with
  `git reset --hard`, delete it to pass a gate, or include it in a release by default.
- An `attuneflix/` sibling is a separate, read-only reference checkout. Never
  import it or admit it into Bazel, Nix, action inputs, or the CAS.
- Agent state, personal bundles, machine work directories, and `.env` files are
  not project source. Never read, hash, print, copy, or commit credentials.
  The existing narrow credential helpers alone may resolve their configured
  fields internally; secrets never enter arguments, logs, receipts, or action inputs.
- Publication and replay do not authorize new model calls, corpus acquisition,
  benchmark campaigns, or once-only dispatches. Frozen source, labels, rankings,
  decisions, and receipts remain immutable. Predictions never consume evaluator
  labels. An oracle is evaluator-only evidence, never a deployable arm.
- `notes/design.md` explains current ownership. Full study implementations and
  their acquisition history are preserved at `archive/complete-studies-2026-10-12`.
  Historical acquisition authorization does not authorize new calls.

## Build and isolation

Run the default offline checks from either repository root or this workspace:

```sh
nix run .#test
```

`nix run` runs the saved-answer walkthrough. Both commands use the pinned Nix
shell and existing `$HOME/.cache/attune-v2-bootstrap-bazel` output base.

One Bazel owner at a time. Never run `bazel clean` or clear shared caches. The
3 GiB server heap avoids the recorded output-download memory failure. The default suite makes no provider calls.
Initial dependency/toolchain downloads are separate from test execution.

`--config=remote` is opt-in BuildBuddy execution. Its declared arm64 Linux
platform pins the container image and `dockerNetwork=off`; it uses
`attune_native_isolation=platform`. Host tests use the pinned user/network
namespace instead. Host-only fixtures are tagged `no-remote`; do not introduce
local fallback or accept an isolation boundary the run did not create.

Keep dependencies pinned in `MODULE.bazel`, its lock, and `maven_install.json`.
Never resolve unpinned JVM coordinates at test time. Historical replay uses the archived workspace and its declared inputs; absence
means unavailable, not permission to reacquire them.

## Owners and source policy

`src/Attune/Policy.flix` is the executable source policy. Keep identity/relations
in Attune, admission/resolution in Repository, bounded descriptors and Datalog
in Theory, evaluation policy in Study, and presentation in View/ASCII. Java and
build rules handle mechanics; do not move policy or metrics into glue.

- Authored sources belong under `src/`, `test/`, `platform/tools/`,
  `platform/build/`, and `notes/`. Register each source-bearing package's
  `policy_files` in `//:policy_sources`; globs do not cross package boundaries.
- `src/Main.flix` is the offline walkthrough. Other executable checks use native
  Flix `@Test` declarations over explicit sources. Keep the pinned compiler and
  shared isolation launcher; do not add a custom test engine, command registry,
  fat JAR, shell action, or Python semantic runner. Bazel owns scheduling.
- Every public Flix module carries a `///` comment. Production code never depends
  on test-only semantics or substitutes raw HTTP for the approved SDK boundary.
- The live `workspace_audit_test` runs uncached and reports unowned files.
  A developer's preserved `notes/repository-through-time/` directory is known to
  fail it. Report that failure; do not suppress it or silently weaken policy.

## Checked documentation

The root README has six marker families: `routes`, `view`, `proof`,
`counterexample`, `localization`, and `coordination`. The selected View source
comment has its own checked grammar. `//test/docs:readme_correspondence_test`
regenerates the payloads through real Ruby extraction, admission, and rendering,
then checks byte equality and declared local links. Never hand-edit payloads,
widen the vocabulary, or let tests bless/rewrite documents. Keep independent
semantic assertions, renderer goldens, and correspondence tests separate.

## Cognitive budget

Classify A cognitive implementation, B mechanical support, and C tests/fixtures/
inherited or generated artifacts honestly, regardless of path or language.
The preferred cognitive range is 1,500–2,000 lines, with review at 2,000 and
STOP-AND-JUSTIFY around 2,500 before adding semantic concepts. Mechanical support
is preferably at most 2,500 lines and needs named owners and boundary tests.
Authored A+B is preferably 3,000–5,000, with review around 5,000. These are soft
review thresholds, not numeric rejection gates. Preserve counting laws and raw
counts; relocation and generation never exempt authored algorithms. Record
architecture reviews in `notes/design.md`; avoid new abstractions for prose cleanup.

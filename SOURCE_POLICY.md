# SOURCE_POLICY — the executable frozen-source gate (M1)

The consolidated Attune implementation is Flix, Starlark, Nix and authored
Markdown, pinned to the Flix 0.76.1 compiler. The M0 ledgers
(`RESPONSIBILITIES.md`, `LANGUAGE_BOUNDARIES.md`) counted what exists and
disclosed every foreign-language debt and data path. This document describes
the M1 executable enforcement of that disclosure: a Flix gate that re-checks,
on every run, that the frozen provenance still holds.

## What is frozen

Three JSON manifests under `policy/`, each with a schema header
(`attune-source-policy/1`), a freeze timestamp, and the exact HEAD commit the
freeze was taken at:

- `policy/debt-manifest.json` — all 272 foreign-language debt files from the
  M0 census. Every entry carries the exact path, the content SHA-256 as
  captured by the immutable baseline evidence (never silently renewed), the
  legacy language, the index mode, the responsibility, the planned
  replacement, the parity oracle, the reason, the owner, and the milestone.
  It also records `retirements` (explicit, each with the original hash, the
  retiring milestone, the recorded parity and the caller switch) and the four
  counted reviewed shell seams (BuildBuddy credential helper, Bazel launcher,
  public commands, systemd unit commands).
- `policy/data-manifest.json` — 4,123 non-debt, non-authored paths, each
  classified into a named class with provenance, reason, owner and milestone
  (preserved evidence archive, captured data, science tables, migration
  evidence, operation reports, public key material, license texts,
  site/example content, published reports, test fixtures, one preserved
  campaign capture, authored configuration, the hash-frozen adversarial
  corpus, the website's Flix-language documentation fragments, and the 42
  preserved experiment sources whose compilation is manual-tagged pending
  the M3 native-campaign retirement).
- `policy/generated-manifest.json` — 14 dependency lock/pin artifacts, each
  naming its producer, the pinned tool that regenerates it, and the mapping
  to the manifest it pins.

## The safe CLI

From the checkout root or the attune workspace, with the pinned developer
shell:

```sh
bazel run //policy:source_policy
```

The live CLI requires the fresh proposed-graph dump at
`.attune/aquery-dump.json` (the public commands materialize it right before
the run; a direct invocation without one exits `2` with a message, never a
pretended pass).

The gate is read-only: Git plumbing commands run with `--no-optional-locks`
and never refresh the index; worktree bytes are read as data only; nothing
the scan observes is executed. It reconciles three populations — Git tracked
paths (with index modes and conflict stages), the index, and eligible
untracked paths — against a full worktree walk, hashes every manifested
regular file, classifies symlinks by their raw targets (never followed into
reads), and verifies the manifests' own accountability schema.

Beyond the filename-and-manifest classification, the gate runs four
content-level legs, none of which executes the content it judges:

- **Anti-smuggling content scan.** Every allowed-language carrier (`.flix`,
  `.nix`, `.bzl`, `.md`, `.mdx`, declared build files) that is not
  manifested data has its bytes read as inert data and matched against the
  approved evasion shapes: shebangs in carriers, Nix generation sinks
  writing forbidden extensions, dynamic download-and-eval imports (including
  unpinned `fetchGit`), dynamic process execution in Starlark, and Python
  main-guards in non-Python carriers. The detector's own source and the
  corpus JSON are exact enumerated exceptions (a content detector must carry
  its markers; the corpus is manifested data read as data).
- **Pinned Flix compiler, coverage and standalone mode.** Every authored
  `.flix` file must either be covered by an actual declared compilation
  input of the proposed graph — a `FlixLibrary` or `FlixArtifact` action, or
  a launcher compile-source manifest action (one declared `Symlink` per
  compiler source of a `java_test`/`java_binary` program) — of the fresh
  `bazel aquery` dump whose resolved inputs name the file (cross-module
  dependencies included), or compile standalone with the pinned compiler
  (`flix check`, parse-and-resolution only, no main ever runs) with zero
  errors. Coverage is never inferred from Git index or commit membership,
  and never from rule-class runfile closure: a file that merely rides in a
  test's or binary's runfiles as data is not thereby compiled, so a Nim
  program named `evil.flix` passed as `java_test` data is rejected (standalone
  check or unowned-source finding), not exempted by data membership. The
  retained historical bypass staged a Nim program named `.flix` into the
  index and index membership alone exempted it from compilation. Neither
  staging nor committing proves content valid, so a staged,
  worktree-modified, or committed `.flix` file that no declared compilation
  input names is standalone-compiled exactly like an untracked one.
  Manifested data fragments (website Flix-language documentation) are
  exempt because they are accounted content, and the detector/corpus files
  are digest-anchored trusted configuration (below).
- **Pinned Nix parser.** Every `.nix` file is validated with
  `nix-instantiate --parse` (syntax only; nothing is evaluated, so untrusted
  Nix never runs).
- **Declared build-input scan (required).** The public commands materialize
  the fresh proposed-graph dump at `.attune/aquery-dump.json` (`bazel aquery
  '//... + //test/spine:false_assertion_test'` over the checkout's current
  BUILD files; the manual-tagged negative fixture is named explicitly
  because wildcard expansion skips manual targets and its declared
  compilation must stay visible) before
  the gate runs; the live gate requires it and exits `2` when it is absent,
  so an audit that never ran can never look like a pass. The dump is parsed
  strictly as data (a dump with no declared targets, or an unresolvable
  path-fragment tree, fails closed) and every declared build input must
  belong to the inventoried population; inputs outside it (alias, re-export,
  or undeclared generation seams) fail. Corpus legs that scan synthetic
  checkouts without a dump report `not-run` honestly instead of pretending
  they checked anything.

A pinned-tool failure is itself a finding: the gate never silently skips a
leg it could not run, and the closing `checks run:` line reports exactly
which legs ran and what each examined. The PASS line names only the
guarantees the checks that ran can make.

Exit codes: `0` the checkout matches the frozen provenance; `1` findings were
reported (printed first, each on one line); `2` the scan itself failed
(unreadable or malformed input) and the checkout cannot be judged. Every
failure fails closed: a new forbidden-language path, an altered frozen hash,
a hash renewed relative to the baseline evidence, a debt count that grows
past the evidence-derived count, a baseline debt path that disappears without
a retirement record, a manifested path (debt, data, or generated) absent from
the scanned population because it was deleted without the matching manifest
change, a retirement that reappears, an unknown or unreadable source, a
walked file Git does not admit, a tracked file missing from the worktree, or
an incomplete accountability record. Protected-path presence is itself a
finding (`protected-present`): a protected path inside the checkout fails
the gate by being present at all — gitignoring it does not help, because
the walk does not consult `.gitignore` at scan time; secrets belong outside
the checkout.

The same check runs as a Bazel test (`//test/policy:checkout_source_policy_test`,
uncached and local, so every `bazel test` re-reads the current tree), and the
pure laws behind it run as `//test/policy:frozen_debt_law_test` on synthetic
manifests (33 laws: hash identity, renewal refusal, smuggling, classification,
monotonicity, retirement, manifest presence — every non-retired debt, data,
and generated entry must remain in the scanned population, refusing committed
and staged deletion without the matching manifest or retirement change while
legitimate staged re-anchors and retirements stay accepted — symlink,
protected-never-read, unreadable, schema — including the scanner-digest
pinning laws — walker-finding composition, relabel laundering, and the
executable-extension provenance rule).

The live nested-workspace audit (`//test/policy:workspace_audit_test`, the
same uncached law behind `Policy.findings`) walks the attune workspace and
admits an unowned path only when the frozen data manifest classifies that
exact path and the audited file's live SHA-256 equals the manifest's
recorded digest; a modified or unreadable manifested file stays out of the
admitted set and is reported. Classification is per exact path — no owned
prefix is widened, no directory is exempt, and a new file added under the
preserved evidence directory still fails as unowned. The classification is
passed by the live audit after verification; the pure boundary checks
(forbidden language, symlink escape, invalid size, protected-never-read)
apply to classified paths exactly as to everything else.

The retained adversarial corpus (the 25-case historical audit corpus plus
the approved embedding/renaming/generator/download/eval/nested-repo/alias/
re-export/fixture/vendor classes, the benign systemd/package seam control,
and the M1 staged-new/modified-tracked/committed-undeclared disguised-Flix
negatives, the data-as-source runfile-laundering negative (a disguised
non-Flix program named `evil.flix` passed as `java_test` data must fail),
the legitimate uncommitted cross-module presubmit acceptance, the
manifest-presence negatives (a committed removal of a manifested debt path
without a retirement record, and committed or staged deletions of manifested
data paths without the manifest change, all on real disposable Git
repositories, plus the legitimate staged re-anchor and staged retirement
positives), and
the unreadable fresh-owned file and directory fail-closed controls, 45 cases)
runs as `//test/policy:adversarial_corpus_test`: each case is materialized
into a disposable synthetic Git checkout (permissions restored before
cleanup) and judged by the live scanner, with the pure content detector
asserted independently on every smuggle-shaped case body. Cases that declare
compilation inputs get the same real-shape synthetic aquery dump the live
commands materialize, at the same `.attune/` path. The corpus itself is
hash-frozen manifested data (`attune/test/policy/corpus/policy-corpus.json`)
and its bodies are inert strings that are never executed.
`//test/policy:smuggle_law_test` covers the benign no-over-refusal laws,
`//test/policy:build_input_law_test` covers the declared build-input scan
laws (coverage, non-compilation actions, malformed-dump fail-closed), and
`//test/policy:pin_law_test` covers the named pins and the dependency-size
delta bound.

## Public commands and pins

The public short commands (from the checkout root or the attune workspace)
all run the source-policy gate first, with a checkout-specific Bazel output
base so concurrent checkouts never share Bazel server state:

```sh
nix run .#lint       # policy gate, then buildifier --mode=check --lint=warn,
                     # nixfmt --check, and the root/nested .bazelversion pins
nix run .#typecheck  # policy gate, then the typecheck plan maps changed and
                     # new authored Flix files onto their declared
                     # compilation targets, which are built (and run, for
                     # test targets) with the pinned compiler — before any
                     # commit; files no declared target compiles were
                     # standalone-checked by the gate
nix run .#test       # policy gate, then the full nested suite
                     # (bazel test //...)
```

Named pins and deltas, enforced by `nix run .#lint` (shell) and
`//test/policy:pin_law_test` (Flix, live):

- the root and attune `.bazelversion` pin Bazel `8.6.0` exactly;
- the attune `MODULE.bazel` pins the Flix `0.76.1` compiler jar by digest,
  asserted exact;
- the declared Maven artifact count (9 at the M1 freeze) never grows past
  its frozen bound — the lock artifacts themselves are hash-frozen in the
  generated manifest, so a dependency change without an explicit
  regeneration fails the gate on content;
- both flake locks pin a full-length Nixpkgs revision.

The cheap policy/compiler gate runs before any commit: the documented flow
is classify, standalone-check, and typecheck the working tree first, and
only then commit. No documented or recorded flow treats a commit as the way
to reach green.

## Feature-branch CI bootstrap

`.github/workflows/source-policy.yml` records one reviewed trusted scanner
revision, compiles the gate binary from THAT revision's own tree and pinned
Nix environment (no prebuilt scanner artifact is trusted from anywhere
else, and the program that judges the policy phase is not compiled from the
very bytes it judges), materializes the proposed-graph aquery dump from the
proposed tree, and runs the trusted scanner with its declared checkout-root
binding pointed at the proposed tree — the proposed bytes are data to it.
It then runs `nix run .#lint`, `nix run .#typecheck`, and the scanner's own
law suite (corpus, pins, declared-source, build-input laws and the live
nested-workspace audit). The scanner source delta between the recorded
revision and each push is printed for review with native tool reporting
only — `sha256sum -c` over the pinned scanner digests and `git diff --stat`
over the scanner sources — with no embedded interpreter in the workflow; the
trusted scanner's own drift finding remains the verdict. The recorded
revision is
named inside the workflow file, which itself ships in the proposed tree:
nothing in CI is administrative protection, and a proposal that edits the
workflow, the recorded revision, or the manifests is visible only as a
reviewable diff and run log at the operator checkpoint. Advancing the
recorded revision to a reviewed proposal is that same operator checkpoint.
A workflow's YAML presence never marks enforcement PASS: real outcomes are
recorded from actual runs only, and a run that cannot happen is escalated
as BLOCKED. Protected remote enforcement (branch protection, required
checks) remains an operator checkpoint after authorized publication.

## Bootstrap trust limits

The bootstrap that froze these manifests is itself ordinary, auditable code,
and the gate trusts it only to these limits:

- Debt content identity is anchored in the M0 baseline evidence
  (`migration/baseline-manifest.json`, 4,648 captured digests); the debt
  manifest pins that evidence file's own digest, and the gate recomputes it
  on every run, so a tampered evidence file or a silently renewed debt hash
  fails closed. Post-election files (none in the debt set) were hashed live.
- The manifests are trusted configuration, read as data. Nothing classifies
  the manifests against themselves; editing them is an explicit, reviewable
  provenance change, and the schema laws still check every entry they add.
  The detector's own trusted-configuration exemption
  (`src/Attune/Frozen/Smuggle.flix`) is digest-anchored: the debt manifest's
  `scannerDigests` records the detector file's SHA-256 at the trusted
  revision, and the exemption only applies while the live bytes still hash
  to the recorded digest — a detector edit without an explicit manifest
  re-anchor loses its exemption and is scanned like any other carrier (a
  `scanner-digest-drift` finding when a recorded digest no longer matches).
  The three manifest JSON files cannot pin their own digests without
  self-reference; they stay exempt as schema-validated data.
- The walk's prune set mirrors the repository's own ignore files exactly
  (VCS metadata, agent state, dependency trees, Bazel/Next.js build outputs,
  Zed targets and grammar checkouts, generated `next-env.d.ts` and
  `tsconfig.tsbuildinfo`, `result*` symlinks). There is no generic hidden-name
  or extension rule. Pruning cannot hide tracked content: every Git-tracked
  path is still reconciled against the walk, and a pruned tracked file fails
  as missing.
- Protected paths (credentials, `.env*`, key material, preserved bundles)
  are reported present and are never read, hashed, printed, or exported.
  Presence alone is a finding: a protected path inside the checkout fails
  the gate (`protected-present`, exit `1`), and gitignoring it does not
  change that — the walk's prune set mirrors the ignore files for build
  outputs, not for secret material, so secrets must live outside the
  checkout.
- The freeze is a snapshot: new authored Flix/Nix/Starlark/Markdown source is
  admitted by the declared authored rules; everything else must be manifested
  or the gate fails. Debt may only shrink, and only through explicit
  retirement records.

## Recorded batch retirement repair

The elected base commit (`d268c9b2`) ships
`attune/experiments/native_patterns/search/BUILD.bazel` loading
`scale_batches.bzl`, `quality_batches.bzl` and `novelty_batches.bzl`, which
the base itself does not contain (they are the M0 baseline's excluded
generated campaign graphs). The M1 default-gates feature repaired this
without regenerating the gigantic campaign graphs and without dropping the
historical public tests: the three loads now resolve to recorded no-op
retirement stubs (`scale_targets`/`quality_targets`/`novelty_targets` are
empty macros whose file docstrings record the retirement and the
regeneration recipe), so the declared population loads and the full nested
suite executes. The M1 policy feature then classified the exact preserved
evidence paths in the frozen data manifest and made the live audit admit
them only after digest verification (`attune/AGENTS.md`): report failures;
never suppress them.

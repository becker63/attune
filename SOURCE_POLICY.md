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
- `policy/data-manifest.json` — 4,075 non-debt, non-authored paths, each
  classified into a named class with provenance, reason, owner and milestone
  (preserved evidence archive, captured data, science tables, migration
  evidence, operation reports, public key material, license texts,
  site/example content, published reports, test fixtures, one preserved
  campaign capture, authored configuration, the hash-frozen adversarial
  corpus, and the website's Flix-language documentation fragments).
- `policy/generated-manifest.json` — 14 dependency lock/pin artifacts, each
  naming its producer, the pinned tool that regenerates it, and the mapping
  to the manifest it pins.

## The safe CLI

From the checkout root or the attune workspace, with the pinned developer
shell:

```sh
bazel run //policy:source_policy
```

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
- **Pinned Flix compiler, standalone mode.** A `.flix` file outside the Git
  index is compiled by no declared Bazel target, so it must compile
  standalone with the pinned compiler (`flix check`, parse-and-resolution
  only, no main ever runs) with zero errors. This closes the retained
  historical escape (Nim source named `.flix`): any compiler rejection is a
  finding. Indexed files are exempt because their declared targets already
  compile them, and manifested data fragments are exempt because they are
  accounted content.
- **Pinned Nix parser.** Every `.nix` file is validated with
  `nix-instantiate --parse` (syntax only; nothing is evaluated, so untrusted
  Nix never runs).
- **Declared build-input scan.** When an `aquery.json` binding (a
  `bazel aquery --output=jsonproto` dump) is provided, it is parsed strictly
  as data and every declared build input must belong to the inventoried
  population; inputs outside it (alias, re-export, or undeclared generation
  seams) fail. Without a dump the leg reports `not-run` honestly instead of
  pretending it checked anything.

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
a retirement record, a retirement that reappears, an unknown or unreadable
source, a walked file Git does not admit, a tracked file missing from the
worktree, or an incomplete accountability record.

The same check runs as a Bazel test (`//test/policy:checkout_source_policy_test`,
uncached and local, so every `bazel test` re-reads the current tree), and the
pure laws behind it run as `//test/policy:frozen_debt_law_test` on synthetic
manifests (25 laws: hash identity, renewal refusal, smuggling, classification,
monotonicity, retirement, symlink, protected-never-read, unreadable,
schema, walker-finding composition, relabel laundering, and the
executable-extension provenance rule).

The retained adversarial corpus (the 25-case historical audit corpus plus
the approved embedding/renaming/generator/download/eval/nested-repo/alias/
re-export/fixture/vendor classes and the benign systemd/package seam
control, 33 cases) runs as `//test/policy:adversarial_corpus_test`: each
case is materialized into a disposable synthetic Git checkout and judged by
the live scanner, with the pure content detector asserted independently on
every smuggle-shaped case body. The corpus itself is hash-frozen manifested
data (`attune/test/policy/corpus/policy-corpus.json`) and its bodies are
inert strings that are never executed. `//test/policy:smuggle_law_test`
covers the benign no-over-refusal laws and
`//test/policy:build_input_law_test` covers the declared build-input scan.

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
- The walk's prune set mirrors the repository's own ignore files exactly
  (VCS metadata, agent state, dependency trees, Bazel/Next.js build outputs,
  Zed targets and grammar checkouts, generated `next-env.d.ts` and
  `tsconfig.tsbuildinfo`, `result*` symlinks). There is no generic hidden-name
  or extension rule. Pruning cannot hide tracked content: every Git-tracked
  path is still reconciled against the walk, and a pruned tracked file fails
  as missing.
- Protected paths (credentials, `.env*`, key material, preserved bundles)
  are reported present and are never read, hashed, printed, or exported.
- The freeze is a snapshot: new authored Flix/Nix/Starlark/Markdown source is
  admitted by the declared authored rules; everything else must be manifested
  or the gate fails. Debt may only shrink, and only through explicit
  retirement records.

## Known pre-existing failure

The elected base commit (`d268c9b2`) ships
`attune/experiments/native_patterns/search/BUILD.bazel` loading
`scale_batches.bzl`, `quality_batches.bzl` and `novelty_batches.bzl`, which
the base itself does not contain (they are the M0 baseline's excluded
generated graphs). Any build that loads the declared source population
therefore fails analysis until the M1 default-gates feature repairs or
retires those loads. This is preserved, not suppressed.

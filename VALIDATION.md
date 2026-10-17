# Validation ledger — M0 initial state

Status: M0 initialization of the acceptance ledger required by the 2026-10-16
specification (§16). Every original acceptance ID starts **NOT RUN** at this revision, or
carries a **BLOCKED** note where a prerequisite is already known to require human/operator
action. No PASS is claimed for any original ID. A prior-commit or prior-environment PASS
certifies nothing for a new revision; historical observations are marked historical.

- Checkout: `/home/becker/projects/attune-flix-consolidation`, branch
  `migration/flix-consolidation-20261016`, elected base
  `d268c9b2b236e229fdcec352c9116dbb7f8c801d`.
- Pinned environment (for all rows): aarch64 Asahi Linux (8 CPU / 15 GiB), Nix 2.34.8,
  Bazel 8.6.0 via bazelisk 1.29.0 (`USE_BAZEL_VERSION=8.6.0`, `--lockfile_mode=error`,
  `--jobs=1`, dedicated output base `~/.cache/attune-flix-consolidation-bazel`), JDK 25,
  Flix 0.76.1 (jar SHA-256 `b2ed2b7f49902e2dfe1b4f10e23d9a5cb085461e7e8c64909ca2b3abfa566e74`),
  SCC 3.7.0 (`/nix/store/cmvwgbkgz26da9rfqwvayzwkgfagqlvi-scc-3.7.0/bin/scc`).
- Status semantics: exactly one of PASS / FAIL / BLOCKED / NOT RUN per ID, with command,
  input digests, artifact, timestamp, negative control, and limitations recorded when a
  status is set. BLOCKED is never narrated as success; ledger completeness is its own
  gate and is not downgraded by constituent BLOCKED rows.
- Distinct gates: a future "source-policy freeze gate PASS" (allowlist enforced, frozen
  hashes intact, count non-increasing, smuggling refused) is different from the "full
  strict-language signoff", which stays **BLOCKED** while any forbidden maintained
  first-party source remains (see `LANGUAGE_BOUNDARIES.md` for the enumerated debt).

## Original acceptance IDs (all 19, initial statuses)

| ID | Requirement (short) | Status at M0 | Notes and known prerequisites |
|---|---|---|---|
| SRC-01 | Authored-source allowlist + frozen path/hash debt enforced | NOT RUN | The named public entry points (`nix run .#lint/#typecheck/#test`) do not exist at the elected base; creating them is M1 acceptance evidence. No scanner exists yet; the scanner bootstrap must be pinned and compiled independently of the data it judges. |
| SRC-02 | Anti-smuggling adversarial tests (strings, renames, symlinks, generated, index/untracked) | NOT RUN | Requires the M1 policy CLI plus the retained adversarial corpus; known prior disguised-Flix escape (24/25 at one historical checkpoint) must be repaired to 25/25. |
| SRC-03 | Java interop direct-use evidence and accountable shim inventory | NOT RUN | `JAVA_SEAMS.md` seeded at M0 (inventory + policy, zero proposed seams); spikes are M2 work. |
| SRC-04 | Every historical foreign-source responsibility accounted, no fake reclassification | NOT RUN | M0 produced the initial per-path ledgers (`RESPONSIBILITIES.md`, `LANGUAGE_BOUNDARIES.md`) with recorded ledger-vs-`git ls-files` cross-checks; the assertion itself is validated at M4/M7. |
| SCI-01 | Entire retained 96/85 study, real Flix candidates, exact multi-arm parity | NOT RUN | Requires M2/M3 (typed host, compact DAG, declared 445 inputs, historical producer rebuild). |
| SCI-02 | Metric fractions/missingness, cohort isolation, ranking ties, provenance | NOT RUN | M3. |
| SCI-03 | Jev/PUCT adaptive controller (budget/epoch/seed/STOP/drain/restart) | NOT RUN | M4. |
| SCI-04 | Branch-local ordered feedback; physical-vs-logical reuse | NOT RUN | M4. |
| BLD-01 | Stable declared Starlark DAG and hermetic Flix actions | NOT RUN | M3. |
| BLD-02 | Remote execution/cache correctness, receipt validation, invalidation | NOT RUN | M3; requires real BuildBuddy access through the protected credential helper. |
| ARC-01 | Immutable S3 objects, complete-last manifest, concurrent/interrupted behavior | NOT RUN | M5; disposable Garage at the declared x86 service pin (2.4.1) must actually run — readiness Garage 1.3.1 is a different environment and never substitutes. |
| ARC-02 | Independent restore, ClickHouse rebuild, historical bytes preserved | NOT RUN | M5. Known genuinely BLOCKED leg: no real off-cluster independent backup destination has been provided (operator checkpoint); the disposable legs remain testable. |
| NIX-01 | Verified safe installer under disposable x86 UEFI boot with negatives | NOT RUN | M6; QEMU 10.2.4/OVMF present, x86 acceptance under TCG. Physical-media legs are permanently operator checkpoints (no physical writes authorized). |
| NIX-02 | Persistent machine/SSH/age identities, DHCP-first enrollment controls | NOT RUN | M6. Real enrollment/identities are operator checkpoints; no identity may be invented. |
| NIX-03 | systemd/comin, root reset, service persistence/rollback, protected secrets | NOT RUN | M6. |
| NIX-04 | Native network/peer observer equivalence or candid bounded exception | NOT RUN | M6; thresholds come from the retained observer contract (90 s inclusive freshness et al.), never re-invented here. |
| NIX-05 | Graphical failure/recovery and headless SSH operability | NOT RUN | M6; disposable VM with software rendering. |
| DEL-01 | Like-for-like authored LOC and closure materially smaller; failures reported | NOT RUN | M0 re-measured the denominator (`SIZE_AND_CLOSURE.md`); targets assessed at M4/M7 with honest NOT MET semantics if missed. |
| DEL-02 | Exact status evidence, signed feature branch, permitted push outcome | NOT RUN | Signed commits begin at M0 (see verification below); the push and remote-CI observation are M7. Known genuinely BLOCKED prerequisite for the CI leg: remote CI/protection bootstrap is not established and no protection/admin settings may be edited — the CI outcome can only be observed after an authorized push, else recorded BLOCKED. |

## Baseline failures and gaps recorded at M0 (preserved, not excluded)

1. **Public gate load failure — FAIL (reproduced at the elected base).**
   Command: `services.yaml` `test` command (bazelisk 8.6.0, dedicated output base,
   `--lockfile_mode=error --jobs=1`, `test //...`) from `attune/`, 2026-10-16.
   Result: exit 1 — `error loading package 'experiments/native_patterns/search': cannot
   load '//experiments/native_patterns/search:novelty_batches.bzl': no such file`
   (the scale/quality/novelty batch `.bzl` products exist only as untracked files in the
   original dirty checkout and were intentionally not captured by the freeze; see
   `BASE_SELECTION.md`). Owner: M1 `m1-default-gates-and-ci-bootstrap`, which must repair
   it without importing huge generated graphs or excluding the failure. Log excerpt
   preserved in this file and `BASE_SELECTION.md`.
2. **Preserved evidence directory trips the existing live audit — known failure, kept
   visible.** `attune/notes/repository-through-time/` (frozen user evidence, including 7
   `.diff` checkpoint files) is reported by the existing uncached live audit as unowned
   user files. Classified truthfully as preserved immutable evidence in
   `LANGUAGE_BOUNDARIES.md`; no broad ignore, no deletion, no relabeling.
3. **Strict-language closure — BLOCKED by enumerated debt.** 157 maintained
   foreign-source files (Java/Rust+header+patch/Grit/TS/TSX/JS/MJS/HTML/CSS/SQL/shell/
   .scm, plus disclosed Ruby fixtures) are tracked at the elected base
   (`LANGUAGE_BOUNDARIES.md`). The strict four-language signoff cannot pass while they
   remain; freeze-gate PASS (once M1 exists) is a different, lesser gate.
4. **Real independent backup destination missing — BLOCKED prerequisite** for the ARC-02
   operator leg (restore to an independent off-cluster destination). Disposable-VM legs
   remain testable and required.
5. **Remote CI / branch protection — not established.** No CI PASS may be claimed from
   YAML, local tests, or hooks; the outcome is observed only after the authorized M7
   (or narrow M1) push to the owned branch, else recorded BLOCKED. No protection/admin
   writes are authorized.
6. **Landing `/` and native assets require the declared build;** real Next `/studio`
   rendered during readiness is page-only evidence, never full Studio parity (M7's
   VAL-WEB-001 does the real browser check).

## Verifications actually performed at M0 (evidence, not original-ID passes)

| Verification | Command (recorded) | Result | Timestamp (UTC) |
|---|---|---|---|
| Owned worktree clean at elected base | `git status --porcelain=v1 --branch`; `git diff --cached --stat` | Empty status; index = HEAD at `d268c9b2` | 2026-10-16T23:24Z |
| Protected-checkout before-capture (VAL-DEL-006 before leg) | Scoped `git --no-optional-locks status --porcelain` / `log -1` / `worktree list` per protected checkout | Archived: `mission/protected-checkouts-before.txt` (9 project checkouts + 2 experiment git checkouts + non-git campaign listing + cache existence) | 2026-10-16T23:24:37Z |
| Elected base identity | `git for-each-ref` | `refs/remotes/origin/migration/python-baseline-20261015` = `d268c9b2…` (independently preserved baseline) | 2026-10-16 |
| Python inventory | `git ls-files '*.py'` | 115 paths; area split 44/45/9/8/7/2 | 2026-10-16 |
| Ledger cross-check (negative control vs Git) | `jq -r '.files[].path' migration/python-coverage-ledger.json \| sort` vs `git ls-files '*.py' \| sort`; `sha256sum -c` over 115 ledger hashes | Identical sets; **115/115 hashes match** | 2026-10-16 |
| Extension census (all boundary classes) | `git ls-files` + pattern counts | 115 py, 16 java, 25 grit, 8 rs, 35 ts/tsx, 45 js/mjs, 8 html/css, 1 sql, 1 sh, 3 scm, 13 rb, 1 h, 1 patch | 2026-10-16 |
| SCC reproducibility | `git ls-files -z \| xargs -0 scc … -f csv` twice; `diff run1 run2` | Byte-identical outputs | 2026-10-16 |
| SCC Python validation | SCC over the 115 `.py` files | 8,656 lines (matches ledger physical exactly); SCC Code 7,957 vs ledger substantive 7,818 (definitional, documented) | 2026-10-16 |
| Baseline public gate | `services.yaml` test command | **FAIL (exit 1)**, missing `novelty_batches.bzl` load — preserved, owned by M1 | 2026-10-16 |
| Full strict-language signoff | — | **BLOCKED** with enumerated debt (row 3 above) | 2026-10-16 |

## Limitations of this M0 ledger

- No Flix compile, Bazel test, Nix VM, archive, or browser verification has been run at
  this revision beyond the recorded public-gate reproduction; readiness-era observations
  (saved-answer graph tests, BuildBuddy invocation, Garage/ClickHouse round-trips) are
  historical and certify nothing for this branch's revisions.
- The protected-checkout after-capture (VAL-DEL-006) is archived as
  `mission/protected-checkouts-after.txt` with the delivery comparison record
  `mission/protected-checkouts-comparison.txt`: **all protected checkouts unchanged**
  (the owned branch's own HEAD advance `d268c9b2` → `4dc4969e` in `git worktree list` is
  the only intended difference).
- Sub-statuses inside each original ID (e.g., which legs of NIX-01 are operator
  checkpoints) are recorded when each milestone sets the ID's final status.

## M1 record (2026-10-17): sole unsigned-commit exception and its signed successor

**Honest verification result for the published commit
`b93b48665fc2ea2fdba02fbad6ef7f9c3d4ba67b` ("Close the source-policy smuggling
gaps with corpus and content checks"): this commit is UNSIGNED.** Observed
2026-10-17 on `migration/flix-consolidation-20261016`:

- `git cat-file commit b93b4866…` shows **zero `gpgsig` header lines**
  (tree `d7a093c3…`, parent `d7a8a241…`);
- `git verify-commit b93b4866…` exits **1** (nothing to verify);
- `git log --show-signature -1 b93b4866…` shows no signature block (`%G?` = `N`),
  while the other five M1 implementation commits (`d7a8a241`, `f3d145e4`,
  `40a59c7d`, `03dc21ae`, `30aa201a`) carry SSH signatures that verify
  `Good "SHA256:phv7My3cq7rnlVeAS81TTjL2JcGDTzTwX9uFFYjSKjA"` under the scoped
  public allowed-signers file.

The commit is already published on the owned branch; history rewriting and
force pushes are forbidden, so it can never be retroactively signed. The user
explicitly approved the sole exception on 2026-10-17: **"Accept documented
exception with signed successor attestation."** The exception covers that one
named commit only — it grants no other unsigned commit, no source-language
exception, no history rewrite, and no force push.

**Independent scrutiny reference:** the M1 scrutiny round1 record
(`validation/M1-policy/scrutiny/synthesis.json` in the mission archive) re-verified
the unsigned status directly (`git cat-file commit b93b4866` → 0 gpgsig lines;
the five other M1 commits verify Good against the approved fingerprint) and
rejected the reviewer generalization that "every" branch commit was unsigned,
confirming exactly one unsigned commit.

**Signed successor attestation:** the next signed commit on this branch (this
feature's own commit, which carries this record in its message) attests that it
was made after reviewing the original commit by its full SHA
`b93b48665fc2ea2fdba02fbad6ef7f9c3d4ba67b`, that the original is and remains
unsigned, and that its publication is covered solely by the user-approved
exception above. No statement anywhere claims the original commit's signature
passed or that it was signed; delivery (M7) must verify this exception evidence
rather than report the original signature as verified.

## M1 record (2026-10-17): manifest-presence repair (scrutiny round1 blocking fix)

The M1 scrutiny round1 confirmed one blocking bypass in `Frozen.verify`: a
manifested path (debt, data, or generated) deleted in a commit — with no
manifest entry removal and no retirement record — vanished from every Git
population while its manifest entry remained, producing zero findings forever
(the "phantom entry"). Reproduced live on disposable Git repositories before
the fix and refused after:

- Red first: 5 new pure laws in `//test/policy:frozen_debt_law_test` and 3 new
  disposable-Git corpus cases (`committed-debt-removal`, `staged-data-deletion`,
  `committed-data-removal` in `//test/policy:adversarial_corpus_test`, 40 → 45
  cases) failed against the unfixed scanner — the committed and staged deletion
  bypass reproduced end-to-end, while the 2 new legitimate positives (staged
  data re-anchor, staged debt retirement with recorded identity) passed both
  before and after.
- Fix: one presence law in `Attune.Frozen.verify` — every non-retired
  manifested path (272 debt + 4,123 data + 14 generated entries at this
  revision) must remain present in the scanned population (tracked ∪ untracked
  ∪ walk), else a `missing-frozen` finding. Removal goes through the explicit,
  reviewable manifest change: a recorded retirement for debt, or the entry's
  removal from the data/generated manifest. Retired paths must stay absent
  (revival remains the revival law's finding). No new framework, no broad
  exemption; all historical failures and the current manifests are preserved
  unchanged (entry counts 272/4,123/14, baseline debt count 272).
- The informational Python heredoc in `.github/workflows/source-policy.yml`
  (embedded interpreter in authored configuration, added in 03dc21ae) is
  removed: the trusted-revision digest pins are now checked and printed with
  `sha256sum -c` (`jq` field extraction only), the source delta with
  `git diff --stat` — native tool reporting, no interpreter or controller. The
  workflow file and the corpus JSON are hash-frozen authored
  configuration/corpus data; both were re-anchored in the data manifest in the
  same reviewed change (the legitimate re-anchor flow the presence law keeps
  accepting).
- `SOURCE_POLICY.md` now states protected-path presence semantics (presence
  alone fails the gate; gitignoring does not help) and the presence-law exit
  reasons; `attune/AGENTS.md` Development lists the cheap public gates
  (`nix run .#lint`, `nix run .#typecheck`, `nix run .#test`) with the
  before-every-commit rule.
- `TRUSTED_SCANNER_REVISION` in the workflow stays at the reviewed
  `40a59c7d05cb05fd233b0f8a74486f29a6d019eb`; this push's scanner-source delta
  is printed by CI for review, and advancing the pin remains the operator
  checkpoint. No protection/admin settings were touched.

Narrow results (this revision, aarch64 Asahi, pinned environment): `//test/policy:frozen_debt_law_test`
33/33 laws; `//test/policy:adversarial_corpus_test` 45/45 cases (red before the
fix: 5 law + 3 corpus failures, then green). Full public gates recorded below
after the final run; the remote CI run for the authorized push of this commit
is recorded from the actual observed run in the feature handoff, never inferred.

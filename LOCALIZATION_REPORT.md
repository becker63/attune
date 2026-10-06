# Localization performance report

**Status:** PARTIAL (audit, repair and post-repair verification published; final
rankings still materializing under the live invocation)

**Generated:** 2026-10-06T20:30:00Z (generation 3; supersedes generation 2)

**Source:** Git `8fd3ba083cdb3cff1daea2583e45fe05a6817ca8` (branch `main`) with an
active, uncommitted dirty working tree — 9 modified tracked files plus untracked
`attune/platform/build/world_archives.bzl`, `attune/test/localization/`,
`attune/test/study/manifest/catalog/archives.tsv` and the preserved pre-existing
`attune/platform/zed/grammars/`. The localization study code itself is entirely
uncommitted. Input digests (sha256, read at generation time):

| File | State | sha256 |
|---|---|---|
| `attune/test/localization/localization.bzl` | untracked | `53fc3943be44d2d8a8e5c9a1789d56a1a0660e9f05d43094c3fda65795c02f47` |
| `attune/test/localization/LocalizationStages.flix` | untracked | `614f1e995fc1f86f75aa63892dc6d614b198505ed07f9c49ab1d03f7afe2fcc1` |
| `attune/test/localization/LocalizationLaw.flix` | untracked | `5b3bf50d535cbfa31cfc5476185ff4e8f75ceb97ef32133a47f6c999b242af81` |
| `attune/test/localization/LocalizationRankingLaw.flix` | untracked | `e5ec0ff85aa3126282a4251dfd0058cae6d80ddc29858112542d97d7f7b697dd` |
| `attune/test/localization/LocalizationEncodingLaw.flix` | untracked (new) | `2742090d1dc150e770a0cd06fa7f2ed8c82c83699aacb6bd12e457a570007429` |
| `attune/test/localization/BUILD.bazel` | untracked | `94b90bf5d7c57beaa783d2150a70486c0f79bd5eaf8d7de01d6892c78f60d63f` |
| `attune/src/Attune/Study.flix` | dirty | `817edf715933fe0e7661f2fae4d6e032efc761641fc5138b1d48ffb9aed29f8b` |
| `attune/src/Attune/Theory.flix` | dirty | `84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c` |
| `attune/platform/tools/boundary/NativeLaunch.java` | dirty (repaired) | `2d6ef98f86a6dab78132eea0e794e9364cf78ff91509fc8beef67b6c673042be` |
| `attune/platform/build/native.bzl` | dirty (repaired) | `223c6e4da085b54b7a3b7def3d9b78a66bc691d02e017794ba48e4508aebb116` |
| `attune/platform/build/world_archives.bzl` | untracked | `62b914c9387cee3702898819904130ad4583ce0896abaca6a50ca5e2e6691045` |
| `attune/test/study/manifest/catalog/archives.tsv` | untracked | `bbbef16a6a1c9373b1ac6e1a8e28cf4d42295bbd71999a586ebb814ab0690fe0` |
| `attune/test/study/manifest/catalog/panel_public.tsv` | committed | `8c9d853fecc1fbc7527b87068b37bdcce2170c451eceed5ad3758336cbef877b` |
| `attune/test/study/manifest/localization/coverage.tsv` | committed | `33597f9ad1072f2b72df1c6a0e17c195e52710fefd5635c7ed622332015be20a` |

**Invocations:** `986f5302-884a-49a6-8636-7b957e578cd0` (pre-fix, audited and
interrupted) and `1606f3a4-3382-4e96-8b09-a1cc039babde` (post-fix, live).

## Population and availability

Frozen panel `attune-panel-2026-10-06`
(`attune/test/study/manifest/catalog/panel_public.tsv`; freeze id also pinned in
`src/Attune/Study.flix`):

| Quantity | Value |
|---|---|
| Groups | 24 (14 development / 5 calibration / 5 final) |
| Worlds | 92 exact worlds |
| Tasks | 96 (4 per group: 56 development / 20 calibration / 20 final) |
| Catalog selection pool | 8,342 JS/TS catalog candidates (panel construction pool only; the localization ranking population is each task's full clean-world file inventory and varies per task) |
| Tasks with eligible gold | 93 (dev 54, cal 20, final 19) |
| Unsupported tasks | 2: `solid__community-server-1040` (development), `stoplightio__spectral-1059` (final) |
| Empty-gold tasks | 1: `projectevergreen__greenwood-1085` (development) |
| Eligible gold paths | 230 (dev 163, cal 32, final 35) across 425 patch entries |

Per-task case classification is admitted from
`attune/test/study/manifest/localization/label_*.tsv` (one file per task) and
summarized in `attune/test/study/manifest/localization/coverage.tsv`. All 96
evaluator label artifacts exist on disk, including the 20 final-split tasks;
existence is distinct from consumption.

Materialized state at 20:15Z under the live post-fix invocation
`1606f3a4-…`:

| Stage | Complete | Total | Note |
|---|---|---|---|
| `world_extract_<world>` | 88 | 92 | every `sveltejs/kit` world now passes; 4 large worlds still executing |
| `theory_world_<world>` | 88 | 92 | follows its world |
| `rank_variants_<task>` | 92 | 96 | the 4 missing are the worlds below |
| `select_policy` | 0 | 1 | needs all 56 development variant trees |
| `rank_<task>` (final arm rankings) | 0 | 96 | blocked on `select_policy` |
| Score denominator (finalized rankings) | 0 of 96 | — | — |
| All-eligible denominator (once frozen) | 93 gold tasks | — | — |

The four worlds still executing are `w34`, `w35`
(`obsidian-tasks-group/obsidian-tasks`, development), `w41`
(`jlongster/prettier`, development) and `w84`. Two of them are **development**
worlds, so their completion gates `select_policy` and therefore all 96 final
rankings. No immutable finalized ranking directory exists yet, so every
performance metric below is **not yet measurable** — this is availability, not
zero performance.

## The w20/w22 UTF-8 portability defect: audit and repair

### Observed failure (pre-fix, invocation `986f5302-…`)

Two actions failed, and only two, out of 2,993:

```
ERROR: … Materializing declared study stage //test/localization:world_extract_w20 failed: (Exit 1)
ERROR: … Materializing declared study stage //test/localization:world_extract_w22 failed: (Exit 1)
```

Both are `sveltejs/kit` worlds (w20 = task t21 `sveltejs__kit-3562`, w22 = task
t24 `sveltejs__kit-4140`). The recorded diagnostic is
`java.nio.file.InvalidPathException: Malformed input or input contains unmappable
characters: …/routes/encoded/??.svelte`, raised at `NativeLaunch.stage`
(`attune/platform/tools/boundary/NativeLaunch.java:432`) inside `Path.of`, in the
launcher's own JVM, before any inner process starts. The `??` are ASCII
replacement characters introduced by the exception's own display; the archive
and the input manifest retain the original UTF-8 bytes (`反应.svelte`,
`苗条.svelte`). Every other stage continued under `--keep_going`.

### Root cause, measured

A JVM derives its filesystem encoding `sun.jnu.encoding` from the process locale.
Measured with the pinned JDK 25 runtime and the host's real locale set:

| Process locale | `sun.jnu.encoding` | `file.encoding` | `Path.of("反应.svelte")` |
|---|---|---|---|
| empty environment | `ANSI_X3.4-1968` | `UTF-8` | `InvalidPathException` |
| `LANG=C` | `ANSI_X3.4-1968` | `UTF-8` | `InvalidPathException` |
| `LANG=C.UTF-8` | `UTF-8` | `UTF-8` | resolves |
| `LANG=C.utf8` | `UTF-8` | `UTF-8` | resolves |
| `LANG=C` + `LC_ALL=C.UTF-8` | `UTF-8` | `UTF-8` | resolves |
| `LANG=C` + `-Dsun.jnu.encoding=UTF-8` | `ANSI_X3.4-1968` | `UTF-8` | `InvalidPathException` |

Two facts follow. First, the JVM command-line property is **not** a usable repair:
on JDK 25 `-Dsun.jnu.encoding` is overwritten by native initialization, so only
the process locale decides the filesystem encoding. Second, the action ran with
no UTF-8 locale: Bazel's strict action environment does not name one, and the
launcher's inner step explicitly set `LANG=C`. The same defect therefore existed
on both sides of the mechanical boundary — the parent resolving the declared
world manifest and the inner step reading the declared world bytes.

A third fact matters for honesty: the Flix filesystem layer catches
`InvalidPathException` and returns `Err(InvalidPath)`, and the extraction's
`readText` maps a failed read to the empty string. So had only the parent been
repaired, the inner step would have silently read an empty file for each
non-ASCII path and the stage would still have "passed". A silent partial world
was the real risk, not only the loud parent failure.

### Repair (smallest explicit locale boundary)

One locale boundary, named in two places, with nothing normalized, renamed or
excluded:

- `attune/platform/build/native.bzl` — a single `_LOCALE_ENV = {"LANG": "C.UTF-8"}`
  applied as the declared `env` of every action that runs the mechanical launcher
  (`AttuneStudyStage`, `AttuneNativeProducer`, `AttuneProcessReceipt`,
  `AttuneDrainProbe`, `AttuneSourceTree`) and as the `env` of the native test
  route, so the launcher's own JVM resolves declared paths under UTF-8.
- `attune/platform/tools/boundary/NativeLaunch.java` — the inner step's cleared
  environment now carries the same `LANG=C.UTF-8` (`LOCALE`), so the process that
  reads the declared world bytes resolves them under the identical encoding. The
  process-receipt boundary (`ProcessReceipts`) keeps its own separate environment
  and is deliberately untouched: its measurement identity is not altered.

`C.UTF-8` is provided by glibc itself from 2.35 on, so it needs no generated
locale archive and no locale package, and it changes no collation or
classification rule relative to `C`. The pinned execution platform image is
`gcr.io/flame-public/rbe-ubuntu22-04@sha256:0d84a80bb0fc36ba5381942adcf6493249594dcc9044845c617b78c9b621cae3`
(Ubuntu 22.04, glibc 2.35), so the locale is present in the pinned runtime; the
run itself is the proof, and it is recorded below.

### Recorded boundary evidence

The launcher now writes the boundary it actually ran under into the declared
`encodings` binding (`lang`, `sun.jnu.encoding`, `file.encoding`,
`native.encoding`), and the `world_extract` stage asserts, from the real action:

- the launcher's own JVM encoding is `UTF-8`;
- the inner JVM's `sun.jnu.encoding` is `UTF-8`;
- every declared non-ASCII source path was actually read (a failed read count of
  exactly zero), so a silent partial world fails the stage;
- the emitted `sources.tsv` inventory reads back byte-identical to the declared
  one, which exercises both the encode and the decode direction;
- `extract.tsv` now records the declared `non_ascii` source count per world.

### Separating regression (old-fail / new-pass)

`attune/test/localization/LocalizationEncodingLaw.flix` (target
`//test/localization:localization_encoding_law`) holds three corpus-free laws:
the JVM runs under the declared UTF-8 boundary; a non-ASCII name is not ASCII
while an ASCII name is; and a real non-ASCII path round-trips through the real
filesystem. Measured through the pinned Flix 0.76.1 native Tester:

| Boundary | Result |
|---|---|
| `LANG=C` (pre-fix inner boundary) | 1 passed, **2 failed** (`theJvmRunsUnderTheDeclaredUtf8LocaleBoundary`, `aNonAsciiPathRoundTripsThroughTheRealFilesystem`) |
| `LANG=C.UTF-8` (declared boundary) | 3 passed, 0 failed |

### Post-repair verification on the real remote path

Under the live post-fix invocation `1606f3a4-…` the previously failing worlds
materialized. `extract.tsv` for each, read from the real action outputs:

```
extract  w20  declared 1549  sources 341  non_ascii 2  facts 1966  declarations 450  candidates 72  refusals 4847  coverage Partial
extract  w21  declared 1555  sources 343  non_ascii 2  facts 1972  declarations 451  candidates 72  refusals 4858  coverage Partial
extract  w22  declared 1753  sources 384  non_ascii 2  facts 2318  declarations 566  candidates 72  refusals 5473  coverage Partial
```

`w21` (`sveltejs__kit-3563`) never failed, so it is the unaffected control: it
reports the same `non_ascii 2` population and passes identically.

Byte-level preservation of the two original paths, end to end, from the real
archive through the Bazel-generated world manifest into the extraction:

| Path | Real archive directory entry | Generated world manifest | Required codepoints |
|---|---|---|---|
| `反应.svelte` | `e5 8f 8d e5 ba 94` | `e5 8f 8d e5 ba 94` | U+53CD U+5E94 |
| `苗条.svelte` | `e8 8b 97 e6 9d a1` | `e8 8b 97 e6 9d a1` | U+82D7 U+6761 |

No normalization, no renaming, no exclusion: the bytes written by the archive
are the bytes the manifest declares and the bytes the stage reads.

## Measured execution cost

`world_extract_*` is the dominant and critical-path stage family. Measured
per-action remote time from the live logs, and reproduced locally by driving
`Attune.Repository.analyze` directly over each world's real extracted bytes:

| World | Declared files | Sources | Largest source | Local `analyze` |
|---|---|---|---|---|
| `w70` (small) | 15 | 14 | small | 3.0s |
| `w1` (large) | 750 | 710 | ~100 KB | ~486s (remote) |
| `w10` (pathological) | 606 | 276 | 325 KB `StructureDefinitionExporter.test.ts` | 1,174.4s |
| `w10`, largest file alone | 1 | 1 | 325 KB | 360.6s (0 declarations, 0 imports, 0 calls, 4,106 refusals) |
| `w41` (`prettier`) | 1,813 | — | — | still running (>3,600s) |

The single-file measurement is the sharpest: one 325 KB TypeScript file costs
360s of `analyze` while producing **zero** declarations, imports and calls and
4,106 refusals. That rules out the Flix-side declaration scans as the dominant
cost and localizes it to the pinned native Grit parse of specific large
TypeScript sources. It is a pre-existing property of the pinned engine and the
extraction design, not a consequence of the locale repair, and it is the
mechanism behind the head-of-line blocking: with `--jobs=8`, four such worlds
occupy the entire worker pool and the remaining 100+ downstream actions wait.
This is reported as a measured cost finding, not repaired: bounding it would
change which declared sources are analyzed, which is a scientific-policy change
this feature is not authorized to make.

## Frozen method and development selection

- **Prior:** `deterministic-lexical-token-prior-v1`, complete candidate budget,
  ties broken `score-descending-path-ascending`.
- **Anchor policies:** `anchors-exact-name-v1` and `anchors-path-segment-v1`.
- **Selection criterion:** `development-gold-in-top-k-then-declared-order` with
  top-k = 10, evaluated only over the 56 development tasks' variant rankings and
  development label artifacts.
- **Four measured arms** (`LocalizationArm`, frozen order): `P` lexical prior
  only; `P+A` adds issue/clean-source anchors; `P+A+F` adds earned
  Repository-imports adjacency; `P+A+D` cumulatively adds materialized Theory
  witnesses atop Repository facts.
- **Freeze record** written by every `rank_*` stage: prior identity, tie rule,
  complete-population budget, policy family, selected policy, criterion and top-k,
  selection split (`development`), labels consumed before freeze (`development`),
  `final-labels-consumed=false`, and each arm's declared input families.
- **Firewall (source-level closure):** the declared inputs of `rank_variants_*`
  are the world facts, the theory witnesses and the projected issue text; the
  declared inputs of `rank_*` add only the `select_policy` tree. No label artifact
  is a declared input of any ranking stage, and `select_policy` names only the 56
  development labels, one file at a time. Every `rank_*` stage additionally
  asserts that no emitted ranking cell names a forbidden evaluator key
  (`label`, `patch`, `test_patch`, `interface`, `FAIL_TO_PASS`, `PASS_TO_PASS`,
  `gold`). Execution-level confirmation of this closure (aquery/BEP over the real
  actions) remains pending and is not claimed here.

## Performance

0 of 96 immutable final rank trees exist, so no report ranking metric is
measurable yet. The table records availability only.

| Arm | Evidence families | Hit@1 | Hit@5 | Hit@10 | Recall@1 | Recall@5 | Recall@10 | MRR@10 | Coverage |
|---|---|---|---|---|---|---|---|---|---|
| P | lexical prior | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 0/96 |
| P+A | + anchors | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 0/96 |
| P+A+F | + Repository facts | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 0/96 |
| P+A+D | + Theory witnesses | n/m | n/m | n/m | n/m | n/m | n/m | n/m | 0/96 |

(n/m = not yet measurable.) Task-level micro aggregation and group-equal macro
aggregation over the 24 groups, plus arm deltas, are pending the frozen rankings.
Scoring a partial ranking set as if it were final is not done here.

## Live execution audit

### Invocation `986f5302-884a-49a6-8636-7b957e578cd0` (pre-fix, closed)

`--config=remote --jobs=8 --keep_going`, pid 104579, output base
`/home/becker/.cache/attune-v2-bootstrap-bazel`.

- **PASS:** 2,884 of 2,993 actions at interruption; 1,605 processes
  (987 remote cache hit, 466 internal, 152 remote); `issue_text` projected all
  96 tasks from 32,079 catalog rows in 251 bounded batches; 49 world extractions
  and 49 theory worlds materialized before the failure set.
- **FAIL, genuine (2 actions):** `world_extract_w20` and `world_extract_w22`,
  both `sveltejs/kit`, with the UTF-8 `InvalidPathException` above. This is the
  defect that was repaired.
- **FAIL, environmental (38 actions):** `Exit 34 UNAUTHENTICATED`. The
  BuildBuddy credential helper resolved through the Nix store was garbage
  collected mid-run, so the client lost remote credentials and every subsequent
  remote action failed. This is an infrastructure failure of the invocation, not
  a property of the corpus, the repair or the study code. The invocation was
  interrupted rather than left to burn through `--keep_going`; the credential
  helper was rebuilt by re-entering `nix develop` and reappeared at the identical
  store path.
- **Preserved pre-fix evidence:** build log, `command.log` and the gzipped
  profile are archived under
  `~/.factory/missions/2bd36de6-899d-4370-b4a6-aa26d5160aa0/library/evidence/`
  so that follow-up commands could not overwrite them.
- **Long pole:** `world_extract_w35` (`obsidian-tasks-group/obsidian-tasks`)
  reported 3,664s of remote time at the snapshot, far beyond the other worlds.

### Invocation `1606f3a4-3382-4e96-8b09-a1cc039babde` (post-fix, live)

`--config=remote --jobs=8 --keep_going`, 498 targets, log
`/tmp/remote_build_fix.log`.

- **PASS:** 0 `ERROR:` lines at 20:15Z; progress `[1,174 / 1,283]`; 4 actions
  running. All 88 completed world extractions carry the new format, including
  `w20`, `w21` and `w22`.
- **Blast radius of the repair:** `NativeLaunch.java` is a declared input of
  every action that runs the launcher, so the repair invalidated the whole
  localization surface and the post-fix invocation re-executed it rather than
  reusing pre-fix results. This is the expected and honest invalidation category;
  the exact per-category reuse counts (remote cache hit / local action cache /
  re-executed) will be read from the closing build summary and BEP, and are not
  claimed here.
- **Blocked work:** `select_policy` and all 96 `rank_<task>` actions are waiting
  on the four remaining worlds, two of which are development worlds. This is
  `--keep_going` failure isolation working as designed: the development-policy
  fan-in legitimately blocks the downstream rankings instead of letting them
  proceed on an incomplete development population.
- **Evidence paths:** `/tmp/remote_build_fix.log`,
  `/home/becker/.cache/attune-v2-bootstrap-bazel/command.log`,
  `https://app.buildbuddy.io/invocation/1606f3a4-3382-4e96-8b09-a1cc039babde`.

## What this means so far

- **Measured facts:** the 96-task / 93-gold-eligible denominator is frozen in the
  panel and coverage manifests; the UTF-8 defect was a locale boundary, not data
  corruption, and its root cause is reproducible in six measured locale
  configurations; the repair is one explicit locale boundary applied to both the
  parent and the inner process; the separating regression fails under the `C`
  locale and passes under the declared boundary; the two previously failing kit
  worlds now extract on the real remote path with the exact original filename
  bytes preserved; `world_extract_*` is the critical-path family and is dominated
  by the pinned native parse of a few large TypeScript files; no final rank tree
  exists yet.
- **Plausible interpretation:** the kit test app intentionally ships
  encoded-route fixtures, so the boundary was exercised by a real, legitimate
  part of the pinned corpus rather than by a malformed input; the same boundary
  is now named for every launcher action, so no other stage can silently
  mis-handle a non-ASCII declared path; the head-of-line blocking is a cost
  property of the pinned engine rather than a defect introduced here.
- **Unsupported claims:** any statement about lexical versus structural arm
  accuracy, any ranking-quality or delta comparison, any per-policy hit count,
  any reading of "0/96 finalized" as zero performance, any claim that the
  evaluator-label firewall has been confirmed at execution level rather than by
  source closure, and any claim that the post-fix invocation has completed.

## Update history

- **2026-10-06T17:22:44Z — generation 1, INTERIM.** Published from invocation
  `986f5302-…` while the run was live at `[2,696 / 2,993]`. Denominator frozen at
  96 tasks (93 gold-eligible); final rankings complete 0/96.
- **2026-10-06T17:24:24Z — correction, still INTERIM.** Case classification,
  label existence, world count, catalog-pool labelling, `rank_variants_*`
  timings, the `??` display characters, the failure location and the firewall
  status corrected; denominators unchanged.
- **2026-10-06T18:15:00Z — generation 2, PARTIAL.** Adds the live-audit result
  for `world_extract_w20`/`world_extract_w22`, the measured root cause, the
  two-place locale repair, the recorded boundary evidence, the separating
  old-fail/new-pass regression, and the measured materialized-state snapshot.
  Denominators unchanged at 96 tasks / 93 gold-eligible.
- **2026-10-06T20:30:00Z — generation 3, PARTIAL.** Adds the close-out of the
  pre-fix invocation (including the 38 environmental `UNAUTHENTICATED` failures
  and the preserved evidence), the post-repair verification of `w20`/`w21`/`w22`
  with byte-level path preservation, the measured execution-cost pathology of
  `world_extract_*`, the post-fix invocation's blast radius and blocked work, and
  refreshed input digests. Denominators unchanged at 96 tasks / 93
  gold-eligible; final rankings still 0/96 and not estimated. Single report;
  later updates revise this file in place.

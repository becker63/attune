# Attune — Flix/Bazel Consolidation, Strict Source Policy, and Minimal NixOS Bootstrap

**Droid mission specification · 16 October 2026 · User-directed architectural replacement**

> **Mission result:** a **smaller, more comprehensible, reproducible Attune** whose application and scientific behavior is authored primarily in **Flix**, whose declarative action graph is **Bazel/Starlark**, and whose machines are provisioned by **ordinary NixOS**. Reuse mature JVM, Bazel, Linux, and S3 substrates. Do not replace working substrates with Attune-specific analogues.
>
> **This document is the authority for the new mission.** Its explicit decisions supersede the prior Nim/Nix-consolidation mission, its previous three-language policy (Nix + embedded Nim + Flix + Starlark), and any instruction in older handoffs to continue that implementation unchanged. Prior handoffs remain authoritative *evidence of verified behavior, tests, safety invariants, and preserved work*, not of the new architecture.

## 0. Executive directive to Droid

Implement, rather than merely propose, the architecture described here. The agent may select the **easiest safe source checkout** after comparative reconnaissance. In particular, a checkpoint *before* the Nim migration may be a better base than the Nim-consolidation worktree. Conversely, the Nim work may contain uniquely valuable safety contracts, immutable-fixture wiring, microVM integrations, or compiler/toolchain repairs that should be selectively transplanted as tests or narrow mechanisms. **Do not preserve the Nim architecture because of sunk cost.**

Execute an aggressive migration and simplification, but do not misrepresent source sizes, erase evidence, edit expected answers to get tests green, or silently weaken product functionality. **Early, continuously enforced lint/source-policy gates are a first milestone**, not a final cleanup activity. **Packetization is explicitly out of scope**; it belongs to its own science experiment. No alternative packet feedback framework is requested or authorized.

The intended primary authored implementation extensions are:

- `*.flix`: domain modeling, repository/agent science, controllers, typed protocols, JVM interop handlers, validated outputs, terminal diagnostics where useful.
- `*.bzl`, `BUILD`, `BUILD.bazel`, `MODULE.bazel` and normal Bazel config: declarative build topology, rules, toolchains, hermetic action interfaces.
- `*.nix`: reproducible dev/release environment, NixOS services/images/persistence, and *minimal* machine-specific configuration.
- **Occasional `*.java`**: only an independently justified irreducible compiler/JVM/FFM/ABI boundary that cannot cleanly be expressed by direct Flix-to-Java calls.

Other authored executable source is **legacy debt**, not a new accepted source language. Pure data, documentary material, lockfiles, fixtures, licensed vendor artifacts, and actual non-code assets are distinguishable and need not be deleted. Never pretend that executable TS, Rust, Python, embedded shell, Grit programs, or SQL implementation has stopped being source code just because it was renamed `.nix`, embedded as a string, moved to `fixtures`, or emitted by a cosmetic generator. The full strict end-state is a goal with real closure gates; if a required web/native surface cannot meet it without regression, the mission must report **BLOCKED** for that surface, preserve its current functionality, and explain the smallest honest exception. No broad exception is granted by this specification.

**No Pekko or actor runtime. No Nim/Nix embedded-language system. No bespoke scheduler or workflow interpreter. No separate science DSL. No new graph database or Datahike requirement.** Datahike may be investigated as a rebuildable index only if a demonstrated historical query cannot be handled adequately with the existing S3 archive and ordinary reductions.

### Success means all of these, together

1. A complete retained study runs through Flix + Bazel, including real Flix candidate evaluation, accurate case-level outputs, metrics and honest historical parity.
2. The adaptive search controller runs in Flix, preserving budgets, optional Jev priors, ordered feedback, interruption, recovery, and differences between physical reuse and scientific consumption.
3. A real scientific archive path writes validated, immutable artifacts and manifests to S3-compatible Garage, with rebuildable analytical projections and verified recovery.
4. Three ThinkCentre configurations remain reproducible and safely installable; everyday operation uses existing NixOS/systemd/comin/Linux software rather than a bespoke privileged daemon.
5. Early source-policy gates reject new unauthorized implementation languages and smuggling; baseline exceptions are frozen, exhaustively accountable, and monotonically retired.
6. Maintained **authored code, glue layers, dependencies and operational concepts shrink materially**, measured honestly by equivalent responsibility. No functionality is removed only to win a line-count comparison.
7. The branch is safely committed, validated, documented, and pushed **only to a feature branch**, not merged/deployed.

## 1. Inputs and historical facts to preserve

Start with the provided Repomix repository snapshot and prior Droid Factory transcript, then inspect the actual local Git worktrees and source at execution time. The attachments are a snapshot, **not proof of current HEAD**.

Read at least these real source locations if present in the elected checkout or its references:

- `FACTORY_HANDOFF.md`, repository and `attune/AGENTS.md`, `README.md`, `docs/architecture/{overview,build,evolution,studio}.mdx`.
- `attune/src/Attune/{Effects,Jvm,Study,Theory,Repository,Policy,Artifacts,Isolation,Agent}.flix` and the existing search experiments (`Search`, `CadenceAdvance`, `CadenceBudget`, `Language`, `Kernel`, `Rank`, `Payload`, etc.).
- `attune/platform/build/{native,grit_repository}.bzl`, `attune/MODULE.bazel`, `attune/flake.nix`, `attune/experiments/native_patterns/search/{assemble,scale,cadence}.py`, their `.bzl` batch products and immutable inputs.
- `infra/{README,OPERATIONS,VALIDATION,RECONNAISSANCE}.md`, `infra/hosts.nix`, `infra/{installer,disk,flake}.nix`, `infra/installer/{guard,bootnext}.py`, `infra/modules/*.nix`, `infra/ingest/*.py`, `infra/tools/*.py`, dashboards and tests.
- The old migration's `migration/{ARCHITECTURE,PARITY,SOURCE-BOUNDARIES,SOURCE-POLICY}.md`, `python-coverage-ledger.json`, `dependency-graph.json`, `test-census.json`, `baseline-manifest.json`, `source-format-ledger.json`, and any later separately verified records.
- The old mission's validation assertions, handoffs, tested contracts and frozen fixtures, **as observational references, not an architectural to-do list**.

Historical checkpoints to cross-check against Git and actual fixtures (not to blindly extrapolate):

| Item | Prior observed status | What it means for this mission |
|---|---|---|
| Original Python application layer | 115 checked-in files, 8,656 physical / 7,818 substantive lines; all 115 still present at that handoff | Full ledger of responsibilities must be addressed, not mechanically translated |
| Previous Nix/Nim tracked layer | About 129 Nix files / 15,239 physical lines including embedded Nim, tests and wrappers at an earlier checkpoint | A warning about architectural expansion, **not** comparable directly to Python-only lines |
| Prior source-policy scanner | 299 legacy source exceptions and a demonstrated disguised-Flix acceptance gap (24/25 adversarial cases at one checkpoint) | Freeze debt; repair early; test policy evasions |
| Retained localization study | 96 tasks, 85 eligible, 22 eligible repository groups; genuine P / P+A / P+A+F / P+A+D arms | Preserve its actual protocol; never call the P token baseline BM25 |
| Retained input identities | 445 manifest-selected inputs checked; 85 reference payload identities checked | Reuse independent frozen evidence and selected immutable inputs |
| Retained P baseline | 112 summary rows reported exact in a later mission step | A partial success, **not** proof of all four arms or whole-study evaluation |
| Real Flix candidate evaluation | Pending/ongoing when previous mission was cancelled | A new mission must establish it end-to-end |
| Nix/Nim observer | Real network/peer tests, native aarch64 Firecracker guest, 12 public Bazel observation tests reported passing | Preserve behavior/invariants, not necessarily the Nim implementation |
| Installer ISO | x86_64 UEFI QEMU installation/reboot verified under the old Python guard | Guard is a safety-critical reference; physical installs not verified |
| Native Parquet | Reported integrated 31/34; separate expanded candidate 38/40 | Do not mistake a prototype for a qualified archive replacement |
| Desktop | NixOS configuration evaluation passed; full graphical boot/failure behavior incomplete | Preserve the pinned desktop and real acceptance requirement |

A later handoff corrected an important TSV parsing error: the retained `tasks.tsv` is described as having **96 data rows and no header**, not 95 data rows after skipping a header. The stated protocol split was **56/20/20 total** and **50/20/15 eligible**; re-read real protocol and inspect source fixtures before relying on those counts. Preserve descending score / ascending path ranking ties, exact denominators, micro vs repository-macro summaries, undefined metric status, and all task-level outcomes. Never conflate the distinct later 47-task structural-search cohort with the 85-task localization study.

These numbers serve as audit points. Current Git and actual executable results supersede them *only for their tested scope*. No paid inference is required to reproduce frozen scientific records.

## 2. Checkout election — let the agent choose the easiest route

**Permission:** Droid may choose which existing **read-only reference** checkout/revision is the starting base, provided the implementation is performed in a **new, isolated, clean feature worktree**. It may synthesize a branch from a pre-Nim ancestor and cherry-pick genuinely useful later commits. It must not rewrite original checkouts.

### Required comparison before writing implementation

Inspect, without modifying, at least:

- The original user checkout (historically `/home/becker/projects/attune`, containing dirty scientific work and untracked overlays).
- The old Nim integration worktree (`/home/becker/projects/attune-nim-consolidation`, `migration/nix-nim-consolidation`) and its relevant ancestors.
- The independently preserved Python baseline, reported under `origin/migration/python-baseline-20261015` in the prior handoff.
- Any clearly identified pre-Nim scientific checkpoint or simplified Flix library refactor, including the archive of completed studies when reachable.

For each candidate, produce a short evidence table with: Git revision; cleanliness; reproducible Flix/Bazel status; full science available; original Python controllers available; active user changes at risk; relative migration work; native/installer parity retained elsewhere; release/web parity; cache/toolchain compatibility; and estimated added/removed authored implementation code. The historical branch path from the handoff is a **hint, not a guaranteed current branch name**.

Choose the checkout minimizing **total verified migration and deletion work**, not merely one closest to the previous mission. Prefer a pre-Nim Flix/Python/Bazel source when the Nim branch contains large amounts of net-new machinery that must be removed; selectively carry validated fixtures, independent contracts, critical bug fixes, protected closure/toolchain pins, and system integration improvements from the Nim work.

Document the choice (`BASE_SELECTION.md`) with the chosen commit SHA, alternatives, and specifically salvaged tests/fixes. A candidate with a prettier source count but missing frozen science or broken web is not automatically easier.

**Hard safety rules:**

- `git status`, `git worktree list`, `git log`, and dependency inspection first. Do not run `git reset --hard`, `git clean`, broad `git add .`, `nix store gc`, shared-cache clean, or cleanup of user overlays.
- Do not touch active campaigns or work owned by a running agent. Do not alter stored evidence in another worktree; use declared and verified copies in the new worktree's owned locations.
- Check free disk before heavy builds; prior mission used **at least 10 GiB** as a minimum headroom floor. Prefer narrow, ownership/liveness-verified cleanup, never broad GC.
- On aarch64 Asahi, use native KVM for supported arm64 guests; x86 guest acceptance uses QEMU TCG, not nonexistent x86 KVM. Avoid unnecessary x86 rebuilds. Serialize heavyweight Nix/Bazel/VM tests and give Bazel one owner and a checkout-specific output base.
- Preserve remote credentials, signed Git identities, and test credentials by protected path rather than printing, copying into a store derivation, command argument, log, or repository.
- Prior user authorization permits eventual **signed commits and a feature-branch push**. It does not permit merging `main`, publishing the website, live cluster enrollment, physical installation, or production deployment.

## 3. Target architecture and the negative space

```text
                  Flix — primary program / science
      typed World, Program, Trial, Round, Receipt, Metric, Failure
                   |                  ^
         plan next round             verified outputs/feedback
                   v                  |
              Bazel / Starlark / BuildBuddy
       declared inputs -> shard -> execute Flix -> reduce -> seal
                   |                  |
           immutable outputs ----> local verified spool
                                      |
                         S3-compatible Garage
                     content-addressed objects,
                      sealed manifests, backups
                                      |
                         rebuildable projection
                       ClickHouse / optional index

       NixOS / systemd / comin are **outside** the science loop:
     image, install, identity, services, persistence, safe updates.
```

**Owners:**

- Flix owns semantic meaning, exact type-safe identities, Datalog programs, search mutation/canonicalization, PUCT, Jev guidance interpretation, fairness/feedback policy, budgets, invalidation decisions, recovery semantics, case metrics, and scientific reports. Ordinary effects + direct JVM calls handle IO and transport.
- Bazel/Starlark owns declared *intra-round* dependencies, sharding, tools/toolchains, hermetic action inputs/outputs, local/remote cache identity, action execution, cross-target aggregation, and repeatability. BuildBuddy is a remote execution/cache service, not the scientific archive.
- S3/Garage and immutable manifests own retained evidence. Local state must be crash-safe and reconstructable; ClickHouse is explicitly a replaceable projection. Datahike is **not a mandatory persistence or orchestration service**.
- NixOS owns desired machine state, offline installer packaging, roles, service accounts, persistent mounts, firewall, secrets, identity, and rollback. systemd manages processes/timers; comin reconciles approved changes. Nix does not implement the scientific controller.

### Do not invent

No alternative scheduler, actor runtime (Pekko/Akka), CPS library, general workflow engine, app-wide event sourcing framework, generated science DSL, cross-language AST compiler, separate network graph database, Nim embedded code compiler, task queue replacing Bazel, custom S3/Parquet format, custom node service supervisor, or mandatory Datahike service.

A **single process** Flix controller can manage transitions between Bazel invocations. Do not force all logic into Starlark: Bazel loading/analysis cannot inspect the results of current actions to add new targets in the same build. The adaptive boundary is *between builds*. Conversely, don't ask Flix to reimplement Bazel's scheduler or cache.

## 4. Aggressive source-language policy: implement immediately

This is a **source provenance and functionality policy**, not a filename beautification exercise. It must be the first executable gate and remain active at every subsequent milestone.

### 4.1 Authored source classes

| Class | Policy | Accounting |
|---|---|---|
| `.flix` | Allowed as science/application code | Handwritten, generated (distinct), and tests separately |
| `.bzl`, `BUILD`, `.bazel`, `MODULE.bazel` | Allowed as declarative Starlark/build language | Count implementation macros/rules, not just BUILD boilerplate |
| `.nix` | Allowed for environment, NixOS modules, packages and small boundary shell commands | Count inline executable strings and generated sources *truthfully* |
| `.java` | **Restricted exception** with accountable owner/need/budget | Handwritten, generated, test/FFM support separated |
| `.py`, `.rs`, `.ts`, `.tsx`, `.js`, `.mjs`, `.sh`, `.sql`, `.grit`, `.scm` and others containing first-party executable logic | **Forbidden for new authored implementation**; known old sources frozen as debt until replaced | Report each actual source language; never reclassify programs as inert assets |
| Documentation, immutable corpus/evidence, fixture source fed as parser input, locks, configs, images/fonts/binary assets | Allowed when genuinely non-executable product code | Explicitly classified with owner/provenance; no executable payloads hidden here |
| HTML/CSS/JavaScript needed for the real website | **Existing implementation debt where authored**; preserve behavior until a real compatible migration | Cannot silently waive just because browser needs these extensions |
| Pinned third-party source/vendor dependencies | Allowed as **external** deps (not an authored source loophole) | Exact revision/hash/license and patches disclosed; retained modified forks count as maintained source |

The intended final active first-party implementation extension set is exactly **Flix, Nix, Starlark/Bazel, and tightly justified Java**. If historical product surfaces (especially the website, Grit grammars and native Rust ABI) cannot genuinely be ported under that rule without expanding code or deleting functionality, report the specific unclosed exceptions and **fail the full source-policy signoff**. Do not silently narrow the policy to exclude an inconvenient directory; do not delete an important surface to manufacture success. The agent may recommend the smallest defensible permanent exception for explicit owner approval, but **none is pre-approved here**.

### 4.2 Freeze-and-shrink baseline debt

At M1, inventory both **Git-tracked index files and eligible untracked files**, respecting protected/sensitive paths and avoiding reading secrets. Build an exact baseline exception manifest keyed by: `path`, `blob_sha256` or Git object ID, language/class, responsibility, intended replacement, verification oracle, reason for temporary preservation, and owning milestone.

- No new unauthorized source paths, and **no arbitrary edits** to frozen legacy paths without a corresponding approved migration of that file's responsibility.
- Freeze existing foreign-source contents by identity. When a replacement reaches parity, retire the exception and remove or archive the superseded implementation in a *non-executable, immutable reference* outside the active checkout as appropriate.
- The exception count is **monotonic non-increasing**. A revived legacy path, newly introduced forbidden implementation, changed frozen hash, broad opaque glob, or unknown source is an immediate gate failure.
- Do not count generated code as authored code, but keep it inspectable with its producer, actual extension, output digest, declared inputs, and build-context mapping. If the generator merely hides non-allowed authored code, the gate fails.
- Run checks over *actual build inputs* as well as filenames, including symlinks, staged files, undeclared generated sources, dependency aliases, and re-exported executable content. Report unknown or unreadable cases, rather than ignoring them.
- Source policy should preserve the old scanner's **trusted-base/index/untracked** checks. Repair the known adversarial escape where source containing Flix was disguised or relabeled; design additional tests for benign and malicious embeddings.

### 4.3 Anti-smuggling requirements

Reject attempts to pass source restrictions by: string-literal `.py`/`.nim`/`.rs` programs embedded in Nix, Flix, Java or JSON; multiline shell applications hidden in `writeText`; dynamic code downloads/eval; renamed extensions; source produced by unaccounted generators; `git` submodules or repos without pins; symlink escape; or moving implementation into fixtures/tests/vendor folders.

Nix necessarily includes small service commands and installation scripts. **Allow minimal, reviewed shell glue** for systemd and immutable package construction only; count its logical source lines, prohibit new algorithmic state machines, and require a seam justification for any substantial scripted block. Do not ban a necessary safe installer command merely to achieve zero shell syntax. No new general shell controller.

### 4.4 Three-tier lint gates

**Cheap, before expensive work (each change / each commit):**

- Source-policy allowlist + frozen-debt hashes + untracked/index/symlink scan.
- Nix evaluation/lint, Starlark/Bazel loading, Flix compile/type/effect checks and Java compile only where changed.
- Formatting and dependency/supply-chain pin checks; no secrets, no unowned source, no undeclared mutable inputs.
- No ambiguous IDs as plain interchangeably typed strings in newly authored scientific APIs; errors and missingness explicit; no `unsafe`/unchecked Java escape outside approved bridge.
- Source size and dependency-closure delta shown automatically. A new helper/dsl/framework must justify deleted responsibility and failure mode.

**Medium, per feature:** typed contract/negative compile tests; frozen scientific fixture tests; local Bazel execution with exact inputs; source-policy adversarial corpus; direct Flix/JVM binding compile checks; cache-replay checks.

**Heavy, per affected milestone:** actual study/action parity; BuildBuddy remote/cache tests; S3 archive/restore; real disposable NixOS/Firecracker/x86 UEFI boots and service/installer integration.

All gates must be named Bazel or Nix checks callable from a single short documented command in the pinned development environment; **policy checks are wired into the default public CI/test gate from M1**. Local git hooks are optional convenience only and not authoritative. No CI/protection PASS claim without actual remote CI and policy evaluation.

## 5. Explicit simplification and size controls

The purpose is **net deletion**, not migrating 115 Python scripts to 115 Flix files. Compare equivalent functions and count all first-party authored executable code, tests, bridge code, generated scaffolding, toolchain glue, configuration, foreign patches, and dependencies **separately**. A source-language ban is not a license to hide maintenance cost in Nix or a generated text blob.

### Target envelopes (goals with real review gates, not permission to cheat)

- **Zero new** standalone Python/Nim/Rust/TS/JS science and infrastructure implementation files.
- **Zero new** Java stubs by default. Any new Java file over **25 substantive lines** requires an explicit, recorded direct-Flix impossibility/complexity demonstration and owner review. An actively maintained hand-written Java seam over **100 substantive lines** triggers a stop-and-simplify review. These are review triggers, not claims that 25/100 are platform capabilities.
- Aspire to an **application Java seam at or below the best previously measured compact integration**, while accounting for separately unavoidable Grit/TeaVM/bootstrap mechanics. One previous small-library refactor recorded **316 substantive lines of Java integration**, but that is *not* a complete-system cap or a like-for-like baseline.
- The **new Flix controller and Bazel glue combined** should materially undershoot the equivalent original Python orchestration plus batch-generation code. Target at least **30% reduction in comparable maintained controller+build glue** before fully retiring the old controllers; report and address any regression. This is a user-selected engineering target, not an externally established performance result.
- Target at least **25% net reduction** in the complete set of *same-responsibility authored implementation* between chosen reference baseline and final branch; count retained legacy code until actually retired. If the target is missed, final signoff is **NOT MET** with a responsibility-by-responsibility explanation. Do not delete fixtures, tests, valuable diagnostics, web UI, or destructive-safety checks to meet it.
- Prefer **one conceptual implementation** of each thing. One typed scientific protocol, one evaluator, one action identity path, one archival manifest schema, one deployment source of truth. Do not duplicate logic in Java, SQL, Nix or Starlark.
- Keep a narrow root layout and progressive disclosure. Avoid proliferation of top-level `runtime`, `engine`, `core`, `platform`, `services`, `common`, etc. directories or layering frameworks.

Track physical lines and substantive lines using a published, reproducible method (e.g. pinned SCC or equivalent), not a homemade counter that accidentally discounts embedded logic. Report compiled/tested closure sizes, action inputs, JVM transitive Maven count, process RSS/startup where measured, and no metrics guessed from source lines.

## 6. Flix architecture: typed values first, transport second

### 6.1 Refactor existing states, not wrap them in strings

Inspect the actual `Search.State`, `Search.Event`, `Language.Program`, `Attune.World`, `Study.Ratio`, `Study.LocalizationMetric`, and artifact types. Replace opaque positional tuples where they impede maintenance with **small named records/ADTs and nominal identities** while preserving semantics.

A conceptual model (names are provisional; do **not** copy as though it compiles on pinned Flix):

```text
TrialId           != ProgramId != WorldId != ActionDigest != ArtifactDigest
Trial             { id, protocol, seedPolicy, branch, checkpoint }
Program           = actual Language.Program + canonical identity
Round             { trial, candidates, cohort, declaredInputs, releaseOrder }
CaseEvidence      { world, program, action, artifact, exactMetrics, status }
RoundEvidence     = verified set of complete CaseEvidence + hashes + negatives
Feedback          { trial, ordered programs, evidence references, admitted flags }
Next              = Evaluate(Round) | RequestPrior(PriorRequest) | Finished
Failure           = InvalidInput | Unavailable | PolicyRefusal | ExecutionFailure | ...
```

Do not use `Proposed(String,String,String)` / `Evaluated(String,String,String)`, ambiguous `Map[String, Json]`, or string-state protocols where the compiler can express the invariant. **Typed identities are distinct from proof of validity**: validate an artifact digest, world, program normalization, requested action, and metric before promoting a receipt to verified evidence.

Construct as few custom effects as possible. Prefer native Flix library effects/process/HTTP/filesystem functions. Separate pure policy from effect handlers, and keep optional replay handlers with frozen typed results. Do not add a general event system, effect interpreter or opaque dynamic dispatcher.

### 6.2 Flix ↔ Java: maximize inference, minimize glue

The **default** implementation of a JVM operation is a direct Flix `import`, Java constructor/method call, or Flix-supplied implementation of a Java interface. The existing `Attune.Jvm` LangChain4j embedding handler (roughly 31 lines in the supplied snapshot) is the style reference: Flix owns identity, typechecking and policy; Java library supplies transport.

For each prospective JVM library (JDK standard API, JDBC/DuckDB, S3 client, CLI/terminal library, metrics, optional OSHI), perform the following *in order*:

1. Check what the **pinned Flix compiler** and standard library can do directly. The packed workspace pinned Flix **0.76.1**; modern Flix documentation sometimes describes features added in **0.77+**, so do not silently require newer syntax without choosing, pinning and verifying a compiler upgrade.
2. Write a small compiling Flix-only integration spike that calls the real Java API, covers construction/overloads/generic erasure/boxing/exceptions, and verifies typed inputs/outputs.
3. If the Java API cannot be used cleanly, first see whether a different mature JVM library or narrower API avoids the problem.
4. Only then create the **smallest Java ABI shim possible**: ideally method-level adaptations, static conversion or native-memory lifetime ownership. Do not write application logic, SDK wrappers with duplicated methods, or an alternate Java scientific controller.
5. Require an explicit `JAVA_SEAMS.md` entry: library and pinned coordinate, why direct Flix failed/was materially worse, Java methods/LOC, alternatives evaluated, compile + runtime evidence, security/resource ownership, and deletion plan. Test that the shim does only the described boundary.
6. Generated `jextract`/FFM source, if truly necessary, must be labelled generated with pinned header/tool/toolchain identity. Handwritten lifetimes and arena ownership stay minimal and separately verified. Do not introduce Panama to replace `ip`/systemd functionality already available natively without observed need.

Use Java exceptions in an explicitly bounded handler, convert into Flix error values, and never silently return success/empty data on failure. Prefer immutable Java values at the seam; contain `null`, mutable collections, JNI/FFM memory and untyped JDBC results in the narrowest possible boundary. Never interpret process exit code 0 as proof that a scientific result is correct.

Investigate **least dependency** rather than largest ecosystem: JDK standard library before new Maven APIs; Flix standard effects before Java; pinned DuckDB JDBC where relational reductions/Parquet truly simplify; a stable S3 SDK or tested CLI for archive transport; no huge platform framework for a one-call operation. Compare closure/input size and direct interop readability before admitting dependencies.

Do not introduce a general Java microservice, Spring runtime, Pekko actor system, Camel routing platform, or a second Flix runtime/server merely to do local process coordination.

### 6.3 Scientific invariants

Retain exact scoring, macro/micro aggregation, typed missingness, deterministic seeds and explicit nonrandom arms, program normalization and canonical identity, training/dev/held isolation, ranking tie policy, provenance, and failure reasons. Do not serialize arbitrary Flix continuations/closures as checkpoints. Version durable schemas as explicit typed records.

## 7. Bazel-first execution and consolidation

### 7.1 Two planes, not two schedulers

**Decision plane — Flix process:** determine next candidate sets, optional prior requests, budgets and permitted feedback; seal a round declaration; call Bazel; verify recorded completion; advance.

**Execution plane — Bazel:** run every deterministic prepared cell as a declared action with declared compiler/runtime/inputs, choose local/remote worker/cache, merge case outputs, calculate Flix-owned metrics, package validated results and sealed reports.

Bazel remains an executable **static graph per invocation**. Do not pretend a `.bzl` macro can read the freshly executed action's output and invent further targets during the same build. To avoid generated `.bzl` explosion: prefer stable predeclared shard topology and a small fixed number of typed action variants; when adaptive targets truly change, generate a small package or manifest *before loading the next Bazel graph*. Generated source is owned, hashed, reproducible and inspected by policy.

### 7.2 Starlark design

Build a minimal compositional vocabulary rather than a DSL framework:

- One well-tested Flix artifact action rule (or retain/refactor the existing `flix_action`).
- One small `experiment_round` macro that declares prepare/predict/merge/evaluate/summary/seal action topology with explicit stable inputs and outputs.
- One action-input manifest rule for named typed inputs and one export/receipt mechanism. Reuse existing native/boundary/toolchain rules instead of duplicating them.
- Starlark holds **no scientific formulas, metric definitions, train/holdout selection, PUCT policy or Java business logic**.
- Protect against graph overgeneration, global cache invalidation and enormous monotonically growing `.bzl` code. Never ask Python to emit tens of thousands of `flix_action(...)` lines as the new permanent architecture.

A schematic `BUILD.bazel` could read:

```starlark
load("//platform/build:science.bzl", "experiment_round")

experiment_round(
    name = "localization_round",
    candidates = ":candidates.json",  # fully declared immutable per round
    worlds = ["//corpus:world_a", "//corpus:world_b"],
    shard_size = 8,
)
```

This is **architecture pseudocode**, not a claim that Starlark can discover how many programs are in candidates.json. A real macro must declare a finite action structure based on load-time-known attributes, and the actions then read their declared data files.

### 7.3 Physical and logical reuse

Preserve separate ledgers for:

- request identity / program identity;
- equivalent proven computation class (when Flix can prove equivalence, not inferred solely from coincidental metrics);
- actual physical execution, remote cache hit and action receipt;
- branch-local pending evaluation and **ordered release of feedback**;
- unavailable, partial, failed or stale evaluation.

Never teach one branch from another branch's results unless the consuming branch itself had the corresponding program pending and its protocol permits reuse. Cached action success is not scientific authorization. Recover incomplete action sets conservatively, deduplicate valid receipts, and do not charge a cache hit as new physical execution.

### 7.4 Runtime recovery

Round declaration + input digests + branch state + budget reservations must be durable **before** launching new external work. On a restart, reconcile existing Bazel action completion and output seals, replay/refetch exact cached work, keep unverified/incomplete work pending, and release feedback **once in that branch's recorded order**.

A controller restart must not duplicate a paid Jev call or silently discount an unknown provider charge. Budget reservations survive crashes; reconcile only from a verified usage receipt or an independently established zero-attempt failure.

Use BEP and other supported Bazel action metadata, but **do not treat a generic BEP stream as an exhaustive ledger of every successful action**, or remote CAS availability as infinite retention. Independently verify actual output artifacts. Persist complete experiment evidence to the S3 archive.

## 8. Required end-to-end scientific migration

### 8.1 First complete consumer: retained localization study

Run the exact selected historical study end-to-end on the new path, including its actual four arms (P / P+A / P+A+F / P+A+D), 96-task inventory, 85 eligible tasks across 22 groups, case-level results, all exact metric definitions, exclusions, ranking ties, actual Flix candidate evaluation, and independent oracle comparison.

Test both case-level rank/content differences and aggregated results, including Hit@1 and MRR@10. The old Python reference remains **independently executable** until entire caller parity passes; merely reading saved reference summary files is not a replacement for the historical producer. Rebuild the pinned historical producer where required, rather than referencing missing absolute binaries. The selected 445 inputs must be genuine declared immutable build inputs, not ambient live experiment paths or an accidental entire 5+ GiB campaign import.

No new paid inference to obtain known old results. Do not modify frozen fixture expectations or the data cohort to get an exact match.

### 8.2 Adaptive Jev/PUCT controller

Move the *policy* of `cadence.py`/`scale.py` into Flix, reusing current Flix search/score modules. Preserve:

- Candidate/branch/round identities, initial controls, canonical program construction and mutation families.
- Seeds, branch-level feedback, Jev prior epochs at the true completion thresholds, and uniform fallback if guidance is unavailable.
- Physical execution sharing, computation-core reuse and exact-cache distinctions.
- Budget reservation/reconciliation/unknown usage handling; paid calls only when separately authorized in a live campaign.
- Ordered feedback release despite asynchronous completions, pending sets, STOP/drain/straggler and interruption semantics.
- Recovery of partial results without inventing successful evaluations, masking errors, or losing diagnostic evidence.
- Cohort isolation and reproducible reports distinguishing physical vs logical action reuse and elapsed/wall costs.

The new Flix controller must perform a **real live local/no-paid round** with pinned result fixtures and the same protocol semantics, not simply parse an already finished summary. Compare against archived controller traces and independent replay oracles. Keep original Python as reference until equivalent entire workflows are verified; then retire by responsibility, not filenames.

### 8.3 Controller consolidation beyond one experiment

The source ledger reported **44 search Python files, 45 experiment tools, 7 ingest, 2 installer, 8 tests and 9 operations** (115 total). Treat these as responsibilities to reconcile, not mandatory source-to-source translations. Many reports, plots, graph generators and test helpers can be collapsed into Flix typed transformations and Bazel reduction targets or eliminated as superseded prototypes **only with evidence**.

Produce a `RESPONSIBILITIES.md` table with each original path → owner / moved functionality / old caller inventory / independent parity / deletion disposition. All 115 must be accounted for. Don't confuse helper parity with complete application replacement. Historical execution remains possible through a frozen old checkout plus sealed inputs.

## 9. Scientific archival model: S3 remains authoritative

Re-use the existing Garage/S3 architecture. The first science-side integration should *not* require Datahike, XTDB, ClickHouse, or a live cluster for its deterministic evaluation path. Remote execution and scientific evidence storage are different capabilities.

### 9.1 Required record relationships

Separate immutable objects for: source/corpus/protocol manifests, typed program/world/arm/branch identities, declared Bazel action inputs, physical action/execution/cache receipts, Flix case evidence, branch-local feedback admission, exact metric reductions, complete study run manifests, and optional exported Parquet tables.

Never put mutable search state or gold labels into prediction action inputs. Prediction and evaluation must have separate declared access to held labels. Exports and projections must retain `unavailable` status and exact fractions rather than silently casting missingness to zero or rounding away denominators.

### 9.2 Safe publication

1. Verify local source bytes/digests, declared provenance and scientific schemas.
2. Write content-addressed immutable artifacts to a local owned spool/checkpoint, with durable atomic file operations or equivalent transaction semantics.
3. Upload artifacts to an S3-compatible endpoint with bounded retries/streaming. Never log credentials.
4. Check existing-object conflict and independently read back/hash new objects. Preserve encoder/schema identity; do not silently replace old sealed bytes if newer tooling emits different Parquet/JSON.
5. **Only after all referenced objects verify**, publish a complete immutable manifest. If S3 conditional-create semantics are used, test that **Garage actually supports the relevant behavior**; otherwise use a verified serial/single-writer strategy and conflict checks. Do not assert a distributed transaction that S3 does not provide.
6. Interrupted ingestion resumes without reclassifying partial output as complete. Bounded checkpoint retention is separate from immutable archive retention.
7. Restore a sample from an independent destination and reconstruct the ClickHouse projections from sealed objects. Garage replication alone is not backup.

Investigate DuckDB JDBC for typed scientific reductions and Parquet writing (under real schema, Unicode, float and null parity). Prefer direct Flix/JVM calls and pinned external libraries. Use a tested S3 client/CLI with minimal closure; no general-purpose Java transport wrapper unless needed.

A Datahike branchable index is a **post-parity experiment** only. If admitted, it is a rebuildable projection of immutable S3 manifests and branch decisions and never an authority on cache validity, filesystem availability, or scientific meaning.

## 10. ThinkCentre bootstrap: native seams and minimum Nix

### 10.1 No bespoke permanent node agent by default

The new system should rely on **NixOS, systemd, comin, OpenSSH/age/SOPS, Garage, standard Linux commands, and node exporter**. A custom node process must justify a behavior unavailable from those substrates. A small unprivileged **Flix CLI/TUI for diagnostics** is a legitimate optional consumer, but **not** the bootstrap authority or unattended privileged root daemon.

Preserve three intended host roles from the prior handoff:

| Host | After verified enrollment |
|---|---|
| `attune-a` | Garage, Grafana, node exporter, comin |
| `attune-b` | Garage, ClickHouse, node exporter, comin |
| `attune-c` | Garage, VictoriaMetrics/vmalert/Alertmanager, scientific archival ingestion and optional independent backup, node exporter, comin |

IP values previously proposed under `10.77.0.0/24` are **not observed LAN facts**. Begin with DHCP and SSH. Do not assume a disk serial, machine ID, Garage RPC ID, storage capacity, age recipient, or backup location until observed/authenticated/enrolled.

### 10.2 Offline installer: most important safety boundary

Keep the verified Python installer guard **temporarily** as a visibly accounted, frozen safety exception rather than rushing a Flix/JVM port. It already runs in a disposable x86 UEFI QEMU installation/reboot acceptance path. The allowed final-language target does **not** authorize rewriting a destructive guard without parity.

Preserve each refusal and proof exactly:

- Host-specific intended installer environment and authorization marker; marker alone is not blanket destructive authority.
- Exactly one eligible internal `nvme*n*` namespace, capacity **240,000,000,000–270,000,000,000 bytes**, correct disk/transport, not removable/read-only.
- No mounted target/child, existing partition/filesystem/signature, active disk or installer media; existing Attune/partial installation is protected.
- Blank path requires **read-only verification of the *entire* namespace as zero-filled**, not only first/last bytes, absence of `wipefs` signatures or guessed emptiness.
- Optional verified serial pin; a truly blank eligible single drive must **not** require a preknown serial.
- For nonempty *non-Attune* media, signed replacement claim bound to target, capacity, installer SSH identity, boot ID, disk fingerprint and short expiry, with named signature namespace and verified public operator identity; no generic wipe flag.
- Previously installed state/USB reappearance must refuse reinstallation. Failed or partially installed disk requires separate deliberate recovery; no auto-wipe.
- Disko/`nixos-install` execute only **after** policy has authorized target. No service starts an installer later in normal operation.
- All destructive/identity gates exercised on disposable file-backed disks under real x86 UEFI QEMU, including negative controls. **No physical write without a separate explicit operator checkpoint.**

Do not invoke a self-contained Flix JVM in the installer merely to satisfy extension counts. A narrow Flix port may be assessed only once it demonstrates **equal or smaller maintenance/runtime cost** and independent real safety parity, including recovery from partial installs. If not, expose the remaining exception honestly as a blocking strict-language issue, and preserve safety.

### 10.3 First boot and persistent identity

Use the existing NixOS flake and pinned desktop module. System boots into an enrollment-only mode with working DHCP, key-only SSH and recovery access, without Garage secrets or cluster assumptions. Persistent machine-id, SSH host identity, age recipient, Nix store/generations and comin history must survive Btrfs root reset. Data, archive and service state persist separately; impermanence roots reset as intended.

The historical desktop was imported from the user's pinned laptop flake with Hyprland/UWSM/Alacritty; preserve real graphical autologin, locked local password, SSH keys, no passwordless sudo, failure fallback and headless operation. **Never expose diagnostics/cluster operation only through the GUI.**

### 10.4 Discovery and enrollment

Evaluate whether to retain the tiny existing UDP `attune_discover_v1` hint protocol or replace it with Avahi/mdns + standard commands. Do not invest in native libmnl, a new Daemon or Flix JVM residency just for LAN advertisements if a native utility suffices.

Public discovery responses are always **UNVERIFIED hints**, never disk/install/membership authorization. Before enrollment verify public machine identities through authenticated pinned SSH or physical console. Record SOPS age recipient, SSH fingerprint and exact machine identity; obtain real Garage IDs and measured free capacity before any layout assignment. Any invalid/missing identity must block secret-dependent services and membership changes.

Garage layout modifications remain explicit operator-controlled, with existing safe initial-layout/refusal/recovery checks; comin does not become a quorum coordinator.

### 10.5 Native observer equivalence, not language novelty

The Nim node observer proved meaningful behaviors: netlink link/address/route events, freshness boundaries, peer appearance/disappearance, restart reconstruction, handle release and actual microVM behavior. We may remove the custom Nim program **only if a smaller implementation preserves required externally observable behavior**.

Test in order:

1. `ip monitor` (netlink subscriptions) plus explicit snapshots/reconciliation; `ip -j`, `networkctl`, procfs/sysfs, systemd D-Bus/CLI as appropriate.
2. Avahi tools and `systemctl`/`journalctl`/node exporter for peer and service facts.
3. A minimal unprivileged Flix diagnostic program calling those tools or JVM standard/process APIs, if a coherent operator UI is useful.
4. **Only if an actual capability gap survives testing**, investigate direct Flix-to-OSHI/JDK or `jextract`-generated Panama FFM bindings to `libmnl`, with a *tiny Java ownership seam* and pinned headers/libs. No default FFM rewrite.

Preserve original inclusive freshness behavior at **90-second and related exact thresholds** where required. Missing, stale, unverified, failed or no-claim observations are distinct. Event loss must trigger snapshot reconciliation; neither peer discovery nor a passing health report authorizes enrollment or disk actions.

Commands currently represented by the node tool — status, doctor, dashboard, peers, network, identity, watch, enrollment and maintenance-check — must be individually inventoried. Some should collapse into **native commands**, not be recreated one-for-one in another framework. Retire old behavior only after real output/negative parity.

### 10.6 Machine management and archive services

Retain original roles, Garage 3-replica layout semantics, ClickHouse projection, VictoriaMetrics/Grafana dashboards, comin signature verification/confirmation, SOPS encrypted credentials, Btrfs filesystem semantics, protected service directories and systemd timers.

A service startup/rollback test must exercise actual preserved data and correct user/DynamicUser/StateDirectory ownership. Never put secrets into Nix store or application logs. Roll one Garage node at a time after approved enrollment and verify quorum/rejoin; a comin branch switch by itself is not proof of cluster-safe rollout.

Keep independent backup and restore. Three copies inside Garage are not independent backup.

### 10.7 Nix's narrow job

Use Nix for *declarative configuration and reproducibility*, not scientific business logic. Prefer upstream NixOS modules and standard services. Keep the stable appliance flake independent of application experiments; derive immutable Flix/Bazel artifacts through a declared, portable packaging boundary. The offline installer must not require BuildBuddy, Garage, or Internet access at boot/install time.

Possible release seam: Bazel builds a pinned Flix JAR/distribution, Nix packages a digest-verified release with a pinned JVM or tested small `jlink` image, systemd runs only declared commands. Do not assume GraalVM Native Image works with Flix Datalog/virtual threads, and do not introduce it without end-to-end tests.

## 11. Browser and other irreducible language boundaries

This migration *must* account for the web and native seams instead of declaring victory because the scientific core passes.

Prior source-format inventory identified maintained Java, Rust/header/patch, Grit programs, TS/TSX, JS/MJS, HTML/CSS, tree-sitter queries, shell replay and SQL. In the prior handoff counts were roughly **15 maintained Java, 9 Rust/header/patch, 24 Grit, 35 TS/TSX, 43 JS/MJS, 8 HTML/CSS, 3 tree-sitter query, 1 shell replay and 1 scientific SQL**. Check actual current Git rather than treating these as exact newest counts.

For each boundary:

- **Java:** consolidate tiny direct JVM bridge, compiler bootstrap, pinned `Grit` FFM ownership and browser ABI where unavoidable. Handwritten Java must not contain scientific policy.
- **Grit/native extraction:** preserve actual parser/query correctness, supported language coverage, source-qualified witnesses, error statuses, runtime performance and pinned native/WASM ABI. If removing maintained Rust/Grit sources requires a verified pinned upstream dependency, prove it exists and reproduces exact behavior; a cosmetically vendored fork is not external independence.
- **Browser/website:** preserve working Studio, source/graph UI, exact runtime semantics and native-to-browser parity. Prior experiments report TeaVM browser Flix works for bounded paths but browser Datalog was unavailable in that toolchain. Do not assert a Flix-only browser port without a real browser/interop test. Existing TS/JS/CSS presentation is **debt** until replaced or explicitly approved, not a loophole.
- **SQL, shell, tree-sitter:** reuse real database/build/service semantics, pin and preserve source location and grammar tests; no arbitrary text wrapping to satisfy extension counts.
- **Generated code:** a producer with explicit typed source and real semantics is acceptable; a string that simply copies old code into a fake allowed file is not. Count generated maintenance machinery and source assets transparently.

Produce one `LANGUAGE_BOUNDARIES.md` ledger: each maintained source entry, why it exists, replacement chosen, exact parity gate, LOC and closure accounting, disposition. Include out-of-scope third-party pinned sources distinctly. The strict language target is not green until all unauthorized maintained first-party source is actually retired (or an explicit owner-approved exception is separately documented). **Block instead of deleting web functionality, extraction language support, or scientific methods.**

## 12. Acceptance strategy: prove behavior, not framework construction

### 12.1 Scientific gate (fully executable)

- Entire selected localization protocol executes with real Flix evaluator (not just saved summary reduction).
- Per-case and per-repository results, candidate identities, rankings, exact fractions and missing statuses match verified baseline for all selected arms.
- Development/holdout split isolation and wrong-label adversarial controls catch leakage.
- Identical declared input yields identical logical outputs; intentionally mutated input or changed rule invalidates correct Bazel action cache.
- All saved result/replay paths are genuinely read-only; no paid reacquisition.
- Jev/PUCT controller passes deterministic step/epoch/seed/fallback/budget laws, real no-paid end-to-end round, restart/resume and STOP/drain.
- Exactly-once branch feedback under retries and out-of-order remote completion; physical reuse may exceed logical feedback without conflation.
- Independent Python reference remains intact until full-caller parity. No expected-answer edits to obtain PASS.

### 12.2 Source/interop gate

- Source-policy scanner refuses new foreign authored source, altered legacy debt, hidden code in fixtures/strings, symlink escapes, unknown tracked/untracked source and fake generated files.
- Every `.java` shim has direct-Flix alternative evidence and a minimality ledger; Flix compile-check tests actual typed interop in pinned runtime; no hidden core algorithms in Java.
- Flix pure logic compiles without having to load unrestricted JVM APIs; isolate narrow IO/JVM effects where possible. Check whether the pinned compiler has dependency security contexts before relying on newer documentation.
- Every new transitive dependency is pinned, licensed, reproducible, and justified by removed behavior; no eager downloads inside Bazel hermetic actions.
- Source-format/migration inventory is complete, including the website and native support; any unclosed strict-language exception is a reported blocker.

### 12.3 S3/archive gate

- Source bytes verified before publication; artifacts uploaded with correct digest/content identities; writer refuses conflicting objects and incompatible schema.
- Partial/interrupted writes do not create a complete manifest; two replays converge without duplicate logical records.
- Actual disposable Garage integration verifies chosen S3 methods (including any conditional write assumption), readback/hash, credentials, failure/retry and recovery.
- Saved historical objects remain unchanged after encoder upgrades; new encoding is versioned.
- ClickHouse can be rebuilt and report tables agree with sealed manifests; off-cluster independent backup and restore are checked or explicitly BLOCKED pending real destination.

### 12.4 Native/NixOS gate

- Minimal NixOS system, actual x86 UEFI installer boot/reboot in QEMU, blank/dangerous/partial/replacement negative cases, reboot without reinstallation, persisted machine identity.
- Actual network event monitor, peer discovery withdrawal and lost-event reconciliation in disposable Linux VM/namespace; freshness boundary correctness.
- Headless SSH operation, comin signature/confirmation/rollback, SOPS runtime secret isolation, protected persistence and data directories, mounted service lifecycle, Garage quorum/rejoin where safe and disposable.
- Graphical desktop startup/failure fallback, real pinned desktop module and Alacritty diagnostics if kept; not inferred from Nix evaluation alone.
- No physical disk mutation, production membership changes or real deployment without an explicit human action.

### 12.5 Truthful statuses

For each gate and each original functionality, report exactly **PASS / FAIL / BLOCKED / NOT RUN** with command, pinned environment, artifact path, input hash, timestamp, negative-control evidence and limitation. A previous success belongs only to the code and environment actually tested. Do not use passing unit fixtures to claim a real archive, GUI, native event, or full corpus acceptance.

## 13. Milestones, dependency ordering and stopping rules

The previous mission had 66 features. This mission should favor **coherent verified vertical slices**, not reconstitute that sprawling feature list under new names. Workers may parallelize independent read-only research and local pure tests; serialize heavy shared builds and mutations.

| Milestone | Required outcome and exit condition |
|---|---|
| **M0 — Elect base, preserve evidence** | Compare all feasible bases; new clean worktree; chosen SHA documented; 115-file responsibility baseline, language/source inventory, evidence hashes and initial build report. No user checkout mutation. |
| **M1 — Source policy + cheap gates first** | Frozen baseline debt; strict allowlist; adversarial anti-smuggling, index/untracked/symlink, formatting, pinned build/Flix compiler checks; CI/default Bazel gate wired. New forbidden files fail immediately. |
| **M2 — Flix/JVM typed host proof** | One real round planner+runner+consumer in Flix on frozen fixture; no Python in new runtime path; direct Java calls demonstrated; named types, errors, replay effect handlers and small seam inventory. |
| **M3 — Compact Starlark experiment DAG** | One complete selected 85-task study with all arms, actual Flix candidate evaluation, exact independent parity, minimal generated `.bzl` and stable cache/remote behavior. |
| **M4 — Adaptive controller and full Python ledger** | Jev/PUCT controller lifecycle/recovery/budget tests; remove superseded Python by responsibility with independent oracle parity; 115-path inventory reconciled. |
| **M5 — S3 archive + science reductions** | Immutable multi-artifact publication in disposable Garage; schema/Parquet/reports; dedupe/restore; ClickHouse rebuild; historical data untouched. |
| **M6 — Minimal ThinkCentre bootstrap** | Proven NixOS/installer/enrollment/service/identity/backup behavior; native observer replaced only where equivalent; optional small Flix diagnostics; actual disposable boots and safety negatives. |
| **M7 — Remaining source boundaries + delivery** | Java/Grit/native/web/SQL/shell/query inventories reconciled; genuine strict-policy closure or explicit BLOCKED reasons; executable docs, reproducibility, dependency/LOC reports; signed feature-branch commit/push. |

### Continuous gates

After each feature: source policy → narrow compile/type checks → independent tests relevant to changed responsibility → update signed evidence/size ledger. At milestone transitions, run the common public Bazel test suite and impacted Nix checks. Existing failing gates remain failed, not excluded.

### Stop-and-review triggers (no invented study phase)

- A proposed architecture adds a new general-purpose framework/scheduler/DSL or a third authored application language.
- The first end-to-end Flix study is larger or harder to understand than its baseline and no responsibility has been deleted.
- Java shim is growing past a narrow ABI concern; direct Flix APIs, JDK, or alternate library not tested.
- Source-policy debt grows, or implementation is being laundered through Nix/string generation.
- An invariant cannot be preserved without unsafe installer behavior, unverified metrics, weakened archives, leaked labels, or deleted web functionality.
- Remote cache identity worsens unexpectedly or a broad source input invalidates unrelated targets.
- Disk headroom drops under the protected floor, builds begin harming active experiments, or a worker tries broad GC/cleanup.

A stop-and-review does **not** mean asking permission for every ordinary implementation step. Make a reasoned attempt to simplify, and report the specific unresolved engineering conflict when a true architecture change or unsafe action would be necessary.

## 14. Operational and collaboration rules

- The agent has authorization to perform this implementation **now** in a new feature worktree. Avoid a separate months-long feasibility phase or vague proposal-only output. At each stage deliver executable code, real tests, and compact evidence.
- External web/doc lookup is authorized for current Flix/JVM/Bazel/Nix/library APIs, but no dependency upgrade solely because documentation is newer. All new pins must be reproducible.
- All worker/specialist outputs are subject to one source-policy/language decision, one canonical design and independent acceptance. Do not let worker subprojects silently introduce new frameworks.
- Do not use packetization, token-packet feedback loops or source-map packet orchestration as a productivity mechanism in this mission. Preserve old packet science as immutable historical evidence if relevant; don't add new packet mechanics.
- Avoid paid LLM/provider requests unless the user separately authorizes a fresh science campaign; use frozen inference receipts and isolated fakes.
- Never modify GitHub protections/admin settings without explicit authorized access. A green local source-policy test is not evidence of active remote branch protection.
- Do not merge or deploy to production `main`, publish live website, wipe disks, enroll nodes, rotate operational credentials, or change Garage membership. Those are human/operator checkpoints.
- Preserve existing credentials and private material without copying or inspecting their contents; use pinned hermetic tooling to avoid secret leakage in action inputs.
- Use signed commits with explicit path staging and verify the actual branch/report. A feature-branch push is within the prior handoff authorization; if Git credentials or protected remote access block it, report BLOCKED, not success.
- Include short, current READMEs and diagrams; don't generate thousands of pages of framework-specific worker instructions. Prefer runnable example and strict gate output.

## 15. Required final delivery

Produce the following **inside the new mission branch**, then summarize with evidence:

1. `BASE_SELECTION.md`: compared candidate checkout SHAs, elected baseline and why, salvaged changes from Nim branch, protection of dirty original worktrees.
2. `ARCHITECTURE.md`: actual compact Flix–Bazel–S3–NixOS graph; authoritative types/effects and external seams; no invented scheduler.
3. `SOURCE_POLICY.md` + executable policy scanner/gates + `LANGUAGE_BOUNDARIES.md`: frozen initial debt, all changes/retirements, final live exceptions, negative tests, per-extension provenance.
4. `RESPONSIBILITIES.md`: account for all 115 old Python responsibilities and all maintained nonallowed source boundaries; independent parity of retired flows.
5. A compiled Flix scientific controller and compact Bazel/Starlark macros with one complete retained localization run, plus real no-paid adaptive controller run and replay tests.
6. Exact scientific artifact schemas, S3/Garage publication/restore commands, receipts, complete manifests, and independent checks; no silent rewriting of historical evidence.
7. Reproducible NixOS ThinkCentre configurations, safe installer, identities/enrollment handoff, service persistence, node observations/diagnostics and real disposable acceptance.
8. `SIZE_AND_CLOSURE.md`: per-responsibility before/after substantive+physical LOC; handwritten/generated/test/dependency split; Java seam LOC; language count; JVM/Maven/Bazel closure size; recorded cache/repro/performance measurements only where observed; net difference against like-for-like baseline.
9. `VALIDATION.md`: actual commands/results with PASS/FAIL/BLOCKED/NOT RUN, fixture ids/digests, excluded data, negative controls, unsupported cases and restoration limitations.
10. Reviewed signed feature-branch commits and remote push status; no claims of deployment/merge/physical operations.

### Mandatory final narrative

Report in this order:

- Which base checkout was chosen, the exact SHA, and why that route was simpler.
- What was **deleted** (code, frameworks, scripts, services, abstraction layers) and what external substrate replaced it.
- What new Flix/Starlark/Java/Nix authored code exists and why each boundary earns its complexity.
- Exact validated scientific and bootstrap outcomes, including unresolved gaps.
- Net code/closure changes with comparable denominators; source policy closure and honest exceptions.
- Required operator checkpoints before real hardware deployment, membership changes or production activation.

**Definition of success: not “the project only has four filename suffixes,” but “the small set of allowed source languages now owns less code, with more behavior delegated to trustworthy, well-tested substrates.”** The extension rule is a hard guardrail against regressions, never a reason to hide source or destroy functionality.

## 16. Acceptance identifiers for an auditable run

Droid should assign tested artifacts and statuses to these concise independent requirements. The exact test-target names may differ by elected checkout, but **none of the requirements may disappear**:

| ID | Requirement |
|---|---|
| `SRC-01` | New authored source extension allowlist and frozen baseline path/hash debt enforced |
| `SRC-02` | Anti-smuggling/adversarial tests over strings, renames, symlinks, generated code, Git index and untracked paths |
| `SRC-03` | Java interop direct-use evidence and accountable minimal shim inventory |
| `SRC-04` | Every historical foreign-source responsibility accounted for, no fake reclassification |
| `SCI-01` | Entire retained 96/85 study, real Flix candidates and exact case-level multi-arm parity |
| `SCI-02` | Metric fraction/missingness, cohort isolation, ranking ties and historical provenance |
| `SCI-03` | Jev/PUCT adaptive Flix controller including exact budget/epoch/seed/STOP/drain/restart |
| `SCI-04` | Branch-local ordered feedback and physical-vs-logical computation reuse semantics |
| `BLD-01` | Correctly declared stable Starlark DAG and hermetic Flix actions |
| `BLD-02` | Remote execution/cache correctness, independent output/receipt validation, changed-input invalidation |
| `ARC-01` | Immutable S3 objects, complete-last manifest, verified concurrent/interrupted behavior |
| `ARC-02` | Independent restore and reconstruction of ClickHouse projections; historical bytes preserved |
| `NIX-01` | Verified safe installer under disposable x86 UEFI boot, blank/nonempty/partial/replacement negatives |
| `NIX-02` | Persistent machine/SSH/age identities, DHCP/unverified discovery, authenticated enrollment controls |
| `NIX-03` | systemd/comin, NixOS root reset, service persistence/rollback, protected secrets |
| `NIX-04` | Native network/peer observer equivalent or a candidly retained bounded exception |
| `NIX-05` | Graphical failure/recovery and headless SSH operability on disposable appliance |
| `DEL-01` | Like-for-like authored LOC and closure materially smaller; failures reported |
| `DEL-02` | Exact status evidence, signed feature branch and permitted push outcome |

All statuses start `NOT RUN` (or `BLOCKED` if a prerequisite genuinely cannot be satisfied). Do not claim success from prereq evidence from another commit alone.

## 17. Official reference links for implementation checks

These are implementation references, not authorization to change the pins without testing:

- Flix JVM interop: <https://doc.flix.dev/interoperability.html>
- Flix dependency/security contexts (verify applicability to selected compiler): <https://doc.flix.dev/trusting-dependencies.html>
- Flix Maven dependencies: <https://doc.flix.dev/using-dependencies.html>
- Bazel Starlark macros and rules: <https://bazel.build/extending/macros>
- Bazel remote execution design: <https://bazel.build/docs/remote-execution>
- Bazel Build Event Protocol: <https://bazel.build/remote/bep>
- comin official repo: <https://github.com/nlewo/comin>
- OpenJDK Foreign Function & Memory API, *only if necessary*: <https://docs.oracle.com/en/java/javase/22/core/foreign-function-and-memory-api.html>
- `jextract`, *only if necessary*: <https://github.com/openjdk/jextract>
- S3 immutable conditional write behavior (verify Garage support before use): <https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html>

## 18. First action when this spec is handed to Droid

1. Read this entire specification, then `FACTORY_HANDOFF.md` as evidence, and current Git/worktree state.
2. Verify no old mission or active experiment process is being modified. Preserve existing caches/evidence.
3. Choose the easiest safe source baseline using Section 2. Report chosen SHA and competing options in `BASE_SELECTION.md`; create a new owned worktree.
4. Implement the **early strict source-policy gate** before rewriting application logic. Fail on new foreign implementation and existing adversarial escapes; establish frozen debt ledger.
5. Build the smallest full vertical science round: Flix typed controller → compact Starlark action graph → actual Flix candidate evaluation → verified case evidence → S3-independent local manifest; run exact reference comparison.
6. Consolidate remaining science controllers; integrate S3; simplify ThinkCentre bootstrap with native utilities and safe NixOS; handle web/native source-boundary debt honestly.
7. Produce measurable deletion, exhaustive parity/negative evidence, signed commits, and a feature-branch handoff. No production deployment.

**Never confuse “preserve the old tests” with “preserve the old implementation.” The point of this mission is to keep hard-earned correctness while deleting the machinery that no longer earns its cost.**

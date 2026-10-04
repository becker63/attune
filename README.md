# Attune v2 bootstrap

An independently buildable Attune v2 bootstrap: its own pinned Bazel, Flix,
Java and Nix plumbing, a small shared nominal envelope, and an authentic native
Flix test spine that runs inside a real network-denied namespace. This
repository has no dependency on the read-only `attuneflix/` reference checkout,
on the mission archive, or on any credential.

## What runs today

The public gate is `bazel test //...` through `services.yaml`:

```
services.yaml: test
```

| Surface | Target | Status |
| --- | --- | --- |
| Public gate | `bazel test //...` | passes (7 tests) |
| Shared envelope laws | `//test/spine:envelope_test` | passes; four native `@Test` laws over world, File/Symbol, frontier and atom identity |
| Isolation boundary | `//test/spine:isolation_test` | passes; eight native `@Test` laws over the recorded kernel and environment facts, including a rejected unisolated host record and a missing-record fail-closed case |
| Nominal compiler negative | `//test/spine:nominal_negative_test` | passes; the pinned compiler rejects the File/Symbol mix with `Unable to unify the types`, with no `main` |
| Manual false assertion | `//test/spine:false_assertion_test` | tagged `manual`, so excluded from `//...`; fails with a real native assertion failure when run directly |
| Honest counting laws | `//test/policy:count_law_test` | passes; eight native laws over comment-only, trailing-comment, comment-like-string and Starlark-docstring counting |
| Named policy cases | `//test/policy:policy_cases_test` | passes; fourteen authored cases, defined in Flix, each reaching its exact verdict and rule |
| Declared-source policy | `//test/policy:declared_source_policy_test` | passes; the Flix policy accepts exactly the declared authored population |
| Live workspace audit | `//test/policy:workspace_audit_test` | passes; a normal, local, uncached test that re-reads the live root on every invocation |
| Fresh parent projection | `services.yaml: projection_test` | builds and tests from a tracked-file projection with no child, secret or archive |

## How a fixture reaches a verdict

1. **Native tests are the only entrypoint.** Every first-party executable check
   is a Flix `@Test` declaration in an explicit, declared file list. There is no
   authored `main`, no per-case application, no custom test engine, no central
   registry, no synthesized `flix.toml` project and no fat JAR.
2. **Explicit files, authentic engine.** `build/native.bzl` compiles exactly the
   named Flix sources with the pinned 0.76.1 compiler and runs the compiler's own
   native test engine (`flix test <files>`). Flix resolves a project only from a
   `flix.toml` in the working directory, and the launcher runs in an empty
   working directory, so no project resolution and no Bootstrap/Coursier
   dependency resolution can occur.
3. **Run inside the declared namespace.** The engine runs under
   `unshare --user --map-root-user --net` with a cleared, allowlisted
   environment (`HOME`, `LANG`, `PATH`, plus the JDK's own `LD_LIBRARY_PATH`).
   No compiler, dependency resolver or fallback runs outside the boundary.
4. **Record real kernel evidence.** Before the engine starts, a probe records the
   run and host network-namespace inodes, the effective uid, the interface list,
   the routing table, a denied outbound socket connect and the environment keys.
   The Flix-owned `Attune.Isolation` assertions decide whether that record is the
   declared boundary; a missing record fails closed.
5. **Keep negative verdicts honest.** `native_flix_reject_test` runs the pinned
   compiler's `check` on an intentionally invalid fixture and fails unless the
   compiler rejects it with the expected diagnostic and no `main` exists.

## The shared nominal envelope

`src/Attune/Envelope.flix` owns the one vocabulary every later surface shares:

- `World`, and the two disjoint nominal entity types `FileId` and `SymbolId`;
- the six directed atoms `Defines`, `DefinedIn`, `Imports`, `ImportedBy`,
  `Calls`, `Callers` with their declared source and target domains;
- `Frontier`, a complete finite set that carries its world and its domain.

Identity is nominal and exact. A `FileId` cannot inhabit a `Frontier.Symbols`,
so the pinned compiler rejects the mix; a different world or a different
element set is a different frontier even when the printed names match.

## Isolation model

- The declared tool is the pinned util-linux `unshare` and its runtime closure,
  resolved from the Nix developer shell by `build/unshare_repository.bzl` (no
  readiness cache path is hardcoded).
- The isolated runtime receives a fresh allowlisted environment and no
  application secret.
- Observed evidence inside the boundary: a distinct network namespace from the
  invoking process, `uid=0`, the `lo` interface only, no default route and a
  denied outbound socket connect. `Attune.Isolation` owns those assertions, and
  the isolation fixture also asserts that an unisolated host record and a missing
  record are both rejected.

## Policy: one Flix evaluator, two surfaces

`src/Attune/Policy.flix` owns classification, inventory decisions, exclusions,
secret and size decisions, honest counting, report formatting and the verdict.
It has no entry point; the native test fixtures read it and assert its verdict.
The only Java is the small mechanical boundary in `tools/boundary/`, which
prepares a metadata manifest (path, measured kind, byte size, link target, never
content) and launches the pinned engine.

- **Declared-source check (hermetic).** `//test/policy:declared_source_policy_test`
  runs the evaluator over exactly the declared inputs. It rejects forbidden
  executable suffixes, embedded shell actions, raw HTTP substituted for the
  approved SDK, reference or unowned source, production dependencies on
  test-only proposals, missing required documents and undocumented public
  modules.
- **Live workspace audit (read-only, uncached).** `//test/policy:workspace_audit_test`
  is a normal test in the public gate, not an extra run verb. It is tagged
  `local` and `no-cache`, and the gate sets `--cache_test_results=no`, so every
  `bazel test //...` re-reads the current tree. A forbidden file added after a
  green run, an orphaned source, a BUILD entry escaping its package and a
  symbolic link leaving the workspace are all detected on the next invocation.
  It records `.env` as metadata only and never reads it, and it never reads the
  preserved `repomix-output.xml` user-work bundle.

The same evaluator counts code, comment, documentation and blank lines
separately per role and language, and prints the whole table on every run.
`DESIGN.md` records the source map, the pins and licenses, and the measured
counts.

## BuildBuddy

`--config=buildbuddy` enables the existing BuildBuddy remote cache and BES.
Authentication is supplied by the narrow credential helper in `flake.nix`,
which reads the ignored workspace `.env` or the `BUILDBUDDY_API_KEY` environment
variable internally. The key never enters a declared action input, the CAS, a
process argument or a log. The ordinary `bazel test //...` gate does not use
BuildBuddy, so it never requires a credential.

## Layout

```
build/native.bzl            native Flix test rules over explicit declared files
build/workspace_root.bzl    the live workspace root, for the local audit test
build/unshare_repository.bzl declared pinned unshare tool and closure
tools/boundary/             minimal mechanical Java: manifest, probe, launcher
src/Attune/Envelope.flix    shared nominal world/File/Symbol/frontier/atom envelope
src/Attune/Policy.flix      compact source, dependency, comment and LOC policy
src/Attune/Isolation.flix   Flix-owned isolation assertions
test/spine/                 envelope, isolation, false-assertion and compiler-negative fixtures
test/policy/                counting laws, named cases, declared check and live audit
PROVENANCE.md               pins, origins and licenses
AGENTS.md                   repository policy for agents
DESIGN.md                   source map, pins and measured counts
```

## Deferred

This bootstrap establishes only the build spine, the shared envelope and the
policy surface. Not yet implemented, and deliberately out of scope here:

- the retained native Grit frontends and Ruby dispatcher arm;
- the canonical ASCII tree writer, route/proof/view projections;
- the typed LangChain4j and Arrow Parquet seams;
- the test-only proposals P01-P10 and their independent reviews;
- any topology selection, cache ownership, real dataset or model experiment.

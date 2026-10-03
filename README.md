# Attune v2 bootstrap

An independently buildable Attune v2 bootstrap: its own pinned Bazel, Flix,
Java and Nix plumbing, a small shared nominal envelope, and a compiled Flix
fixture that runs as a standalone JVM inside a real network-denied namespace.
This repository has no dependency on the read-only `attuneflix/` reference
checkout, on the mission archive, or on any credential.

## What runs today

The public gate is `bazel test //...` through `services.yaml`:

```
services.yaml: test
```

| Surface | Target | Status |
| --- | --- | --- |
| Public gate | `bazel test //...` | passes (2 tests) |
| Compiled Flix fixture | `//test/spine:positive_test` | passes in the isolated namespace |
| Nominal compiler negative | `//test/spine:nominal_negative_test` | passes; the pinned compiler rejected `test/spine/nominal_negative/Main.flix` |
| Manual false assertion | `//test/spine:false_assertion_test` | excluded from `//...`; fails with exit 3 when run directly |
| Fresh parent projection | `services.yaml: projection_test` | builds and tests from a tracked-file projection with no child, secret or archive |

## How a fixture reaches a verdict

1. **Compile in a prerequisite action.** `build/flix.bzl` `flix_fatjar` writes a
   generated Flix project and runs the pinned compiler with `build-fatjar` via
   `ctx.actions.run` and a minimal Java launcher (`tools/spine/FlixTool.java`),
   because Flix resolves its project from the working directory.
2. **Run compiled, not interpreted.** `isolated_jvm_test` launches the resulting
   fat JAR with `unshare --user --map-root-user --net -- java -jar ...`. No
   compiler, dependency resolver or fallback runs in the namespace.
3. **Record real kernel evidence.** Before the fixture runs, a probe records the
   namespace inodes, interfaces, routing table and a denied socket connect from
   inside the same boundary. The test fails closed if isolation cannot be
   established.
4. **Keep negative verdicts honest.** `flix_reject` compiles an intentionally
   invalid fixture and fails unless the pinned compiler rejects it with the
   expected diagnostic; `recorded_verdict_test` accepts the recorded rejection,
   so the ordinary suite stays green while the rejection is real.

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
- The isolated runtime receives a fresh allowlisted environment
  (`HOME`, `LANG`, `PATH`, plus the JDK's own `LD_LIBRARY_PATH`) and no
  application secret.
- Observed evidence for the positive fixture: distinct network namespace,
  `uid=0`, interfaces `lo` only, no default route, socket connect denied.

## BuildBuddy

`--config=buildbuddy` enables the existing BuildBuddy remote cache and BES.
Authentication is supplied by the narrow credential helper in `flake.nix`,
which reads the ignored workspace `.env` or the `BUILDBUDDY_API_KEY` environment
variable internally. The key never enters a declared action input, the CAS, a
process argument or a log. The ordinary `bazel test //...` gate does not use
BuildBuddy, so it never requires a credential.

## Layout

```
build/flix.bzl              Flix rules and the isolated JVM test macro
build/unshare_repository.bzl declared pinned unshare tool and closure
tools/spine/FlixTool.java   minimal Java compiler-process boundary
tools/spine/IsolatedRun.java isolated runtime boundary and evidence checks
src/Attune/Envelope.flix    shared nominal world/File/Symbol/frontier/atom envelope
test/spine/                 positive, false-assertion and compiler-negative fixtures
PROVENANCE.md               pins, origins and licenses
```

## Deferred

This bootstrap establishes only the build spine and the shared envelope. Not
yet implemented, and deliberately out of scope here:

- the retained native Grit frontends and Ruby dispatcher arm;
- the canonical ASCII tree writer, route/proof/view projections;
- the typed LangChain4j and Arrow Parquet seams;
- the test-only proposals P01-P10 and their independent reviews;
- any topology selection, cache ownership, real dataset or model experiment.

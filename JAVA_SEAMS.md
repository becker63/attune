# Java seams — existing inventory and admission policy

Status: M0 seed. **No new Java is proposed by this mission's M0 work, and none is admitted
by this document.** The policy below is binding for every later milestone; the inventory
records the 16 Java files tracked at the elected base `d268c9b2b236e229fdcec352c9116dbb7f8c801d`
as existing frozen debt (counted separately, never waived).

## Admission policy (from the 2026-10-16 specification — binding)

1. **Direct Flix first.** The default implementation of any JVM operation is a direct
   pinned-Flix `import` (Flix 0.76.1, jar SHA-256
   `b2ed2b7f49902e2dfe1b4f10e23d9a5cb085461e7e8c64909ca2b3abfa566e74`), JDK standard
   library call, or Flix stdlib effect — demonstrated with a small compiling spike that
   covers construction/overloads/erasure/boxing/exceptions before any shim exists.
2. **Before Java lands, a `JAVA_SEAMS.md` entry must already record:** pinned library
   coordinate; why direct Flix failed or was materially worse (backed by the actually
   attempted, compiling spike — a claimed impossibility without an attempted spike fails
   the gate); alternatives evaluated; Java methods/LOC; compile + runtime evidence;
   security/resource ownership; and a deletion plan.
3. **Review triggers:** new Java over **25 substantive lines** requires the recorded
   demonstration **and owner review**; over **100 substantive lines** triggers
   stop-and-simplify. These are review triggers, not platform capabilities.
4. **No** Java application/science/SDK-wrapper layer; no algorithm moved into glue to
   meet a Flix budget. Existing compiler/Grit/TeaVM/bootstrap seams are counted
   separately and are not exceptions.
5. Generated `jextract`/FFM source, if ever truly necessary, is labelled generated with
   pinned header/tool/toolchain identity. No default FFM rewrite.

## Existing Java inventory at the elected base (measured)

Pinned SCC 3.7.0, `--no-cocomo --no-complexity --by-file` (raw output
`mission/scc-by-file-java.csv`). "Code" is SCC's substantive measure. Class total:
16 files, 1,009 physical, 770 code.

| Path | Role (observed from location/content) | Lines | Code |
|---|---|---:|---:|
| `attune/experiments/native_patterns/legacy/AttuneGrit.java` | Legacy Grit integration retained with the experiment archive | 127 | 86 |
| `attune/platform/browser/Browser.java` | TeaVM browser entry surface | 19 | 16 |
| `attune/platform/browser/CompileFlix.java` | Browser compile bootstrap for Flix output | 43 | 40 |
| `attune/platform/browser/CompileWasm.java` | Browser/WASM compile bootstrap | 40 | 37 |
| `attune/platform/browser/Port.java` | Browser port boundary constant/ shim | 9 | 7 |
| `attune/platform/browser/TConcurrentLinkedQueue.java` | Typed queue shim for browser runtime | 21 | 13 |
| `attune/platform/tools/boundary/Manifest.java` | Declared-path manifest boundary tool | 48 | 42 |
| `attune/platform/tools/boundary/NativeLaunch.java` | Native subprocess launch/watchdog boundary | 158 | 140 |
| `attune/platform/tools/boundary/NativeTester.java` | Native test harness boundary | 73 | 63 |
| `attune/platform/tools/grit/AttuneGritNative.java` | Grit native extraction boundary | 134 | 99 |
| `attune/platform/tools/inference/AttuneDecisions.java` | Inference decision transport interface | 47 | 12 |
| `attune/platform/tools/inference/ChoiceTransport.java` | Choice transport seam | 22 | 18 |
| `attune/platform/tools/inference/OpenRouterDecisions.java` | Provider transport implementation | 181 | 132 |
| `attune/test/browser/GritProbe.java` | Browser Grit probe test | 15 | 14 |
| `attune/test/grit/GritFixtures.java` | Grit fixture loader test support | 59 | 38 |
| `web/site/sources/atlas-lookup.java` | Website source sample asset | 13 | 13 |

Role notes are from file location and the checkout's own documentation (`attune/AGENTS.md`):
"Java owns only native memory, compiler bootstrapping, declared paths, process isolation,
and the narrow browser ABI." Per-file content review and any disposition (keep as frozen
debt vs. replace with direct Flix calls) belongs to M2/M7 seam reconciliation — not
claimed here.

## Proposed seams

None at M0. When a milestone proposes a seam, this file gains an entry **before** the
Java lands, with the policy-§2 fields; the entry count here and the exception discipline
of `LANGUAGE_BOUNDARIES.md` stay monotonic (never a silent growth path).

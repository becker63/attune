# Final Validation Sweep Sidecar Handoff

Agent:
- final-validation-sweep-sidecar

Wave:
- Phase 8 final validation inventory sidecar

Ownership:
- Owned and wrote only this handoff file:
  `openspec/changes/standardize-effect-package-contracts/agent-handoffs/final-validation-sweep-sidecar.md`.
- Did not edit source code, `tasks.md`, framework files, package manifests, or generated files.
- Treated all pre-existing worktree changes as concurrent agent work.

Changed:
- Added this validation handoff packet only.
- Inspected active project/package command surfaces, `.attune/cache` ignore
  state, framework import-boundary/no-report policy wiring, report-file clues,
  contract source/typecheck presence, and lightweight validation gates.

Generated:
- None.

Validated:
- `rg -n '"executor"\s*:\s*"nx:run-commands"|nx:run-commands' --glob 'project.json' --glob '!node_modules' --glob '!dist' --glob '!tmp' .`
  - Result: no matches in active `project.json` command surfaces.
- `rg -n '"scripts"\s*:' --glob 'package.json' --glob '!node_modules' --glob '!dist' --glob '!tmp' .`
  - Result: no matches in active `package.json` surfaces.
- `jq -r 'select(.targets != null) | .name as $project | .targets | to_entries[] | select(.value.executor == "nx:run-commands") | "\($project):\(.key)"' project.json $(rg --files packages framework -g 'project.json' -g '!node_modules' -g '!**/workspace/**')`
  - Result: no output.
- `jq -r 'select(.scripts != null) | .name // input_filename' package.json $(rg --files packages framework -g 'package.json' -g '!node_modules' -g '!**/workspace/**')`
  - Result: no output.
- `jq -r 'select(.targets != null) | .name as $project | .targets | to_entries[] | [(.value.executor // "<inferred>"), $project, .key] | @tsv' project.json $(rg --files packages framework -g 'project.json' -g '!node_modules' -g '!**/workspace/**') | sort | sed -n '1,220p'`
  - Result: active target surface is `@attune/nx:package-check`,
    `@attune/nx:generated`, or `@attune/nx:toolchain`.
- `rg -n '^\.attune/cache|\.attune/cache' .gitignore .git/info/exclude --glob '!node_modules'`
  - Result: `.gitignore` includes `.attune/cache/`,
    `.attune/cache/protocol.sqlite`, and `.attune/cache/protocol/`.
- `git check-ignore -v .attune/cache/protocol.sqlite .attune/cache/protocol/report.json .attune/cache/architecture-summary.md`
  - Result: all three paths are ignored; the broad `.attune/` rule also covers
    them.
- `rg -n '@attune/framework-(runtime|sqlite|language-service|nx)(/internal)?|ProtocolStore|drizzle-orm' packages --glob 'src/**/*.ts' --glob 'test/**/*.ts' --glob '!node_modules' --glob '!**/workspace/**'`
  - Result: no matches for product-package imports of private framework
    runtime/sqlite/language-service/nx internals, `ProtocolStore`, or
    `drizzle-orm`.
- `rg -n 'checkFrameworkImportBoundary|framework-import-boundary|attune/framework-import-boundary|checkFrameworkNoReportPolicy|framework-no-report|no-checked-in-protocol-report|framework-final-ratchet|package-local scripts|nx:run-commands' packages/attune-architecture framework project.json packages --glob '!node_modules' --glob '!dist'`
  - Result: framework policy CLI wires import-boundary and no-report helpers;
    remaining `nx:run-commands` references are policy/test fixtures or
    diagnostics, not active target executors.
- `rg --files -g '!node_modules' -g '!dist' -g '!.git' | rg -i '(protocol[-_ ]?delta|protocol[-_ ]?report|obligation[-_ ]?report|evidence[-_ ]?summary|architecture[-_ ]?summary|linear[-_ ]?summary|github[-_ ]?summary|cloud[-_ ]?agent[-_ ]?report)'`
  - Result: no checked-in report files matched the current no-report
    signatures.
- `rg --files docs openspec packages framework -g '!node_modules' -g '!**/agent-handoffs/**' | rg -i 'run[-_ ]?report|report\.md|summary\.md|evidence[-_ ]?report|fuzzer[-_ ]?run'`
  - Result: `docs/joern-effect-fuzzer-run-report.md` remains as a historical
    run-report document.
- `rg --files packages framework -g 'attune.package.ts' -g '!node_modules' -g '!**/workspace/**' | sort`
  - Result: all 11 active packages expose `src/attune.package.ts`.
- `rg --files packages framework -g 'attune.package.typecheck.ts' -g '!node_modules' -g '!**/workspace/**' | sort`
  - Result: all 11 active packages expose `src/attune.package.typecheck.ts`.
- `openspec validate standardize-effect-package-contracts --type change`
  - Result: passed. Output: `Change 'standardize-effect-package-contracts' is valid`.
- `nx run workspace:framework-policy-check`
  - Result: passed.
- `nx run workspace:package-contracts-check`
  - Result: passed.
  - Subtarget result: `workspace:source-bom-check` passed with 11 registered
    Source BOM shards.
  - Subtarget result: `workspace:shape-conformance` passed with 50 shapes,
    11 projects, 16 generated, 33 migrate, and 1 manual.
  - Subtarget result: `workspace:framework-policy-check` passed.
- `git diff --check`
  - Result: failed due trailing whitespace outside this sidecar ownership:
    `docs/attuned/Attune Discovery v0 Technical spec.md:2` and line 3.

Not run:
- `nx run workspace:policy-fast`.
- `nx run workspace:policy-proof-pressure`.
- Package-wide build/typecheck/test targets outside
  `workspace:package-contracts-check`.
- Any generation, sync, materialization, mutation, fuzz, Joern, container,
  Alchemy, Arion, or provider/resource command.

Contract status:
- Current active package contracts are present for all 11 active packages.
- Current active package compile-only typecheck modules are present for all 11
  active packages.
- Current active `project.json` and `package.json` command surfaces have no
  `nx:run-commands` executors and no package-local `scripts` entries.
- `.attune/cache` and protocol cache paths are ignored.
- Framework import-boundary/no-report/final-ratchet policy wiring is present
  and the focused framework policy gate passes.
- `workspace:package-contracts-check` passes in this worktree.

Residual migration debt:
- `git diff --check` is red from trailing whitespace in
  `docs/attuned/Attune Discovery v0 Technical spec.md` lines 2-3.
- `packages/attune-architecture/src/framework-policy-cli.ts` still contains
  temporary command-surface debt allowlists for package roots and root targets,
  even though current manifests no longer expose `package.json` scripts or
  `nx:run-commands`.
- `packages/attune-pi-agent/src/attune.package.ts` still has a
  `attune-pi-agent/raw-command-surfaces` waiver whose reason says package
  scripts and project `run-commands` remain; that waiver text appears stale
  against the current command-surface inventory.
- Root `project.json` still retains `workspace:policy-architecture` as an
  internal compatibility aggregate. It is typed with `@attune/nx:toolchain`,
  but final public-surface cleanup may still want to remove or further
  quarantine it.
- `docs/joern-effect-fuzzer-run-report.md` remains a checked-in historical run
  report. Current no-report signatures did not flag it, but final policy should
  decide whether historical proof/fuzzer run reports are explicitly allowed,
  archived, or rejected.
- Shape conformance still reports 33 `migrate` shapes and 1 `manual` shape,
  with future generator candidates listed by the gate.
- Several OpenSpec tasks remain unchecked in the live `tasks.md`, especially
  final ratchet/cleanup, generated test breadth, runtime checks inside
  `workspace:package-contracts-check`, type-guidance completeness, and residual
  materialization/cache cleanup.

Blocked by:
- No blocker for this sidecar handoff.
- Final green handoff is blocked by the trailing-whitespace diff check and by
  coordinator decisions on stale command-surface allowlists/waivers and
  historical run-report policy.

Next agent:
- Cleanup/ratchet agent should fix the docs trailing whitespace, remove or
  tighten now-stale command-surface debt allowlists, refresh stale package
  waiver text, and decide the fate of `workspace:policy-architecture` plus
  historical run-report docs.
- After that cleanup, rerun:
  - `git diff --check`
  - `openspec validate standardize-effect-package-contracts --type change`
  - `nx run workspace:package-contracts-check`
  - Optionally `nx run workspace:policy-fast` once concurrent edits settle.

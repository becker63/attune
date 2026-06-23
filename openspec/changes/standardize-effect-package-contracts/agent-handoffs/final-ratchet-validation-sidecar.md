# Final Ratchet Validation Sidecar Handoff

Agent:
- final-ratchet-validation-sidecar

Wave:
- Phase 8 final ratchet validation sidecar

Ownership:
- Owned and wrote only this handoff file:
  `openspec/changes/standardize-effect-package-contracts/agent-handoffs/final-ratchet-validation-sidecar.md`.
- Did not edit source code, generated files, package manifests, docs, or
  `openspec/changes/standardize-effect-package-contracts/tasks.md`.
- Treated all pre-existing worktree changes as concurrent coordinator/worker
  edits.

Changed:
- Added this validation handoff packet only.

Validated:
- `git status --short`
  - Result: dirty concurrent worktree with many existing modified files and
    untracked handoffs; no source edits were made by this sidecar.
- `rg -n 'nx:run-commands|"executor"\s*:\s*"nx:run-commands"' --glob 'project.json' --glob '!node_modules' --glob '!dist' --glob '!tmp' .`
  - Result: no matches in active `project.json` command surfaces.
- `jq -r 'select(.targets != null) | .name as $project | .targets | to_entries[] | select(.value.executor == "nx:run-commands") | "\($project):\(.key)"' project.json packages/*/project.json framework/*/project.json`
  - Result: no output.
- `rg -n '"scripts"\s*:' --glob 'package.json' --glob '!node_modules' --glob '!dist' --glob '!tmp' .`
  - Result: no matches in active `package.json` surfaces.
- `jq -r 'select(.scripts != null) | .name // input_filename' package.json packages/*/package.json framework/*/package.json`
  - Result: no output.
- `jq -r 'select(.targets != null) | .name as $project | .targets | to_entries[] | [(.value.executor // "<inferred>"), $project, .key] | @tsv' project.json packages/*/project.json framework/*/project.json | sort`
  - Result: active targets are backed by `@attune/nx:package-check`,
    `@attune/nx:generated`, or `@attune/nx:toolchain`; no
    `nx:run-commands` executor and no `workspace:policy-architecture` target.
- `rg -n 'policy-architecture' project.json nx.json package.json packages/*/project.json framework/*/project.json --glob '!node_modules'`
  - Result: no active workspace/project/package target references.
- `rg -n 'workspace:policy-architecture|policy-architecture' docs AGENTS.md README.md project.json nx.json package.json packages framework --glob '!node_modules' --glob '!dist' --glob '!tmp'`
  - Result: no public docs or active config guidance found. Matches are limited
    to `attune-architecture` policy implementation and negative test fixtures
    that reject stale `workspace:policy-architecture` guidance/config.
- `rg -n 'workspace:policy-architecture|policy-architecture' --glob '!node_modules' --glob '!dist' --glob '!tmp' --glob '!openspec/changes/standardize-effect-package-contracts/agent-handoffs/**' .`
  - Result: additional historical references remain in completed/active
    OpenSpec artifacts, notably `openspec/changes/enforce-nix-agent-policy-gates`
    and the active change text describing the rejection rule. No live target was
    found.
- `rg -n '@attune/framework-(runtime|sqlite|language-service|nx)' packages --glob '**/src/**/*.ts' --glob '**/test/**/*.ts' --glob '!node_modules' --glob '!**/workspace/**'`
  - Result: no product-source private framework imports. Matches are
    `attune-architecture` policy code/negative fixtures and `attune-nx` test
    strings that name framework Nx generated target ids.
- `rg -n '@attune/framework-.*internal' packages --glob '**/src/**/*.ts' --glob '**/test/**/*.ts' --glob '!node_modules' --glob '!**/workspace/**'`
  - Result: no product-source private internal imports. Matches are policy
    code/negative fixtures.
- `rg -n 'ProtocolStore|drizzle-orm' packages --glob '**/src/**/*.ts' --glob '**/test/**/*.ts' --glob '!node_modules' --glob '!**/workspace/**'`
  - Result: no product-source `ProtocolStore` import. `drizzle-orm/pg-core`
    appears in `packages/attuned-discovery/src/memory/schema.ts`, which is a
    memory/persistence boundary; remaining matches are policy code/negative
    fixtures.
- `rg --files -g '!node_modules' -g '!dist' -g '!.git' | rg -i '(protocol[-_ ]?delta|protocol[-_ ]?report|obligation[-_ ]?report|evidence[-_ ]?summary|architecture[-_ ]?summary|linear[-_ ]?summary|github[-_ ]?summary|cloud[-_ ]?agent[-_ ]?report)'`
  - Result: no checked-in files matched the current protocol/report policy
    signatures.
- `git ls-files | rg -i '(protocol[-_ ]?delta|protocol[-_ ]?report|obligation[-_ ]?report|evidence[-_ ]?summary|architecture[-_ ]?summary|linear[-_ ]?summary|github[-_ ]?summary|cloud[-_ ]?agent[-_ ]?report)'`
  - Result: no tracked files matched the current protocol/report policy
    signatures.
- `rg --files docs openspec packages framework -g '!node_modules' -g '!**/agent-handoffs/**' | rg -i 'run[-_ ]?report|report\.md|summary\.md|evidence[-_ ]?report|fuzzer[-_ ]?run'`
  - Result: `docs/joern-effect-fuzzer-run-report.md` remains as a checked-in
    historical fuzzer run-report document. It is outside the protocol-report
    signatures above and did not fail the policy gate.
- `rg -n '^\.attune/cache|\.attune/cache' .gitignore .git/info/exclude`
  - Result: `.gitignore` includes `.attune/cache/`,
    `.attune/cache/protocol.sqlite`, and `.attune/cache/protocol/`.
- `git check-ignore -v .attune/cache/protocol.sqlite .attune/cache/protocol/report.json .attune/cache/architecture-summary.md`
  - Result: all sampled `.attune/cache` paths are ignored.
- `git ls-files .attune`
  - Result: no tracked `.attune` files.
- `git ls-files | rg '^\.attune/cache'`
  - Result: no tracked `.attune/cache` files.
- `openspec list`
  - Result: `standardize-effect-package-contracts` is active at 119/151 tasks;
    `enforce-nix-agent-policy-gates` is listed complete but unarchived.
- `openspec validate standardize-effect-package-contracts --type change --strict`
  - Result: passed. Output: `Change 'standardize-effect-package-contracts' is valid`.
- `nx run workspace:framework-policy-check --skipNxCache`
  - Result: passed. Executor summary status `passed`; underlying
    `toolchain:architecture:framework-policy` process exited 0.
- `nx run workspace:package-contracts-check --skipNxCache`
  - Result: passed.
  - Subtarget `workspace:source-bom-check` passed with 11 Source BOM shards.
  - Subtarget `workspace:shape-conformance` passed with 50 shapes, 11 projects,
    16 generated, 33 migrate, and 1 manual.
  - Subtarget `workspace:framework-policy-check` passed.
- `git diff --check`
  - Result: passed with no whitespace errors.

Not run:
- `nx run workspace:policy-fast`.
- `nx run workspace:policy-proof-pressure`.
- Broad package build/typecheck/test targets outside the requested
  `workspace:package-contracts-check` aggregate.
- Any generation, sync, materialization, mutation, fuzz, Joern, container,
  Alchemy, Arion, or provider/resource command.

Risks:
- Active configs are clean, but stale migration waiver text remains in
  `packages/joern-effect/src/attune.package.ts` and
  `packages/attune-pi-agent/src/attune.package.ts` claiming package scripts,
  codex wrappers, or `project.json run-commands` remain. The current policy
  gates pass, so this is stale explanatory debt rather than an active command
  surface.
- Completed but unarchived OpenSpec change
  `openspec/changes/enforce-nix-agent-policy-gates` still describes
  `workspace:policy-architecture` as part of its historical design. Current
  docs/config scans and policy gates do not treat that as active public
  guidance, but a stricter "all unarchived OpenSpec text" ratchet would need a
  coordinator decision.
- `docs/joern-effect-fuzzer-run-report.md` remains tracked as a historical
  fuzzer run report. It is not a protocol report by the current signatures and
  does not fail the framework policy gate, but final report policy may still
  want an explicit allow/archive/remove decision.
- Shape conformance still reports 33 `migrate` shapes and 1 `manual` shape;
  this is accepted by the current gate but remains generator expansion debt.

Follow-ups:
- Refresh or remove stale command-surface waiver text in `joern-effect` and
  `attune-pi-agent` now that active package scripts and `nx:run-commands`
  targets are gone.
- Decide whether completed-but-unarchived historical OpenSpec changes should be
  scanned as current public guidance before archive.
- Decide whether the historical Joern fuzzer run report is intentionally
  allowed, should move to cache/CI artifacts, or should be archived outside the
  core workflow.
- Keep using `nx run workspace:framework-policy-check --skipNxCache` and
  `nx run workspace:package-contracts-check --skipNxCache` as the focused final
  ratchet confirmation after coordinator cleanup.

# Repository policy for agents

The approved scope lives in the mission documents. This file is the short
repository-side policy an agent must follow while changing this tree.

## Boundaries

- `attuneflix/` is a read-only reference checkout, not parent source. Never
  import it, symlink it, read it into an action or admit it to Nix or the CAS.
- `.factory/` holds agent tooling definitions for this mission. It is not project
  source: never admit it to Nix, Bazel, the CAS or the source policy.
- `ATTUNE_V2_BOOTSTRAP_MISSION_ALL_IN_ONE.md` is external mission input. It is
  never parent implementation, a declared action input or a packaged asset.
- `.env` is the local credential file. Never read, hash, copy or print it; never
  pass a credential into an action input, argument, log or the store. Only the
  narrow BuildBuddy credential helper in `flake.nix` may read it, internally.
- No application provider, MCP or live model call. No scientific data.
- One Bazel owner at a time. The output base is outside the workspace
  (`services.yaml`); never run `bazel clean` or touch global caches.
- JVM dependencies are pinned: `MODULE.bazel` declares the exact Maven
  coordinates and `maven_install.json` pins every transitive artifact by
  SHA-256. Never resolve an unpinned coordinate at test time, and never let the
  resolver run outside the declared install.

## Source policy

The compact policy in `src/Attune/Policy.flix` is the executable statement of
these rules; `bazel test //...` enforces it.

- Authored source lives under `src/`, `test/`, `tools/` and `build/`.
- First-party execution is Flix, minimal Java and Starlark only. Authentic
  native Flix `@Test` declarations over an explicit declared file list are the
  only first-party executable entrypoint. Authored `main` functions, per-case
  application mains, custom test engines, central registries and fat JARs are
  forbidden, as are shell scripts, shell actions, `run_shell`, shell genrules
  and Python runners.
- Java keeps only the unavoidable mechanics (filesystem metadata, process
  launch, runfiles resolution). Policy, classification, inventory and exclusion
  decisions, secret and size decisions, verdict and report formatting, isolation
  assertions and fixture cases live in Flix.
- Production source (`src/`) must not substitute a raw HTTP client for an
  approved SDK, and must never depend on a test-only proposal module.
- The only admitted foreign families are inherited pinned support, the one
  approved native Ruby arm, future test-only proposal/query source, maintained
  Grit queries, Ruby source-as-data fixtures and the carried Zed editor assets
  whose pinned Flix grammar revision the Grit integration reuses.
- Every public Flix module carries a `///` comment. The core documents listed in
  `DESIGN.md` must exist.

## Declared population

A Bazel glob cannot cross a package boundary, so each package that carries
authored source exports a `policy_files` filegroup and `//:policy_sources`
aggregates them. A new package that adds authored source must add its filegroup
to `//:policy_sources`; otherwise its source would be silently unowned. The
separate local audit (`//test/policy:workspace_audit_test`) walks the live tree
and catches source that no BUILD file admits. It runs as a normal test inside
`bazel test //...`; the gate re-executes its tests
(`test --cache_test_results=no`), so the audit re-reads the current tree on
every invocation and never replays a stale verdict.

## Internal delegation

One level of existing Task/CLI source-only delegation is allowed inside an
integration session, per the mission's parallel-work guidance:

- the integration owner alone edits shared files, builds and commits;
- children own disjoint source files, get explicit Flash/high routing, and have
  source-only tool allowlists with no Execute, build, Git or MCP tools;
- children never spawn grandchildren;
- prove the CLI routing resolves before any fan-out, and never substitute the
  CLI default model silently;
- launch nothing without measured headroom (the host currently has well under
  the ~1 GiB a single lightweight child needs alongside Bazel), so sequential
  work is the honest default here.

The `droid exec` option names above are verified against its installed help;
the exact Flash model id is not, because the help lists no model ids and the
default model is a different tier. Until a metadata-only routing probe confirms
the requested model actually resolves, treat fan-out as unproven and stay
sequential rather than substituting the default.

## Counting

`DESIGN.md` records the current counts. Comment-only changes must not move the
code count; a trailing comment or a comment-like string still counts as code; a
recognised Starlark docstring and markdown prose are documentation, and an
apostrophe in prose must never silence the lines after it. Budgets are reported,
and changing a gate means editing the declared constant in
`src/Attune/Policy.flix`, never golfing code or dropping tests.

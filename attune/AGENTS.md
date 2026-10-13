# Working on Attune

The library module is in `attune/`; the root Bazel graph also builds `web/`.
The library remains independently buildable. Start with `src/Attune/Effects.flix`
and `example/BUILD.bazel`.

## Preserve work and evidence

- Preserve existing uncommitted and untracked work. Never use `git reset --hard`,
  clear shared caches, or delete user files to pass a gate.
- A sibling `attuneflix/` is a separate, read-only reference. Never add it, VCS
  metadata, agent state, personal bundles, or private configuration to action inputs.
- Never read, hash, print, copy, or commit credentials. The existing narrow
  credential helper alone may resolve its configured fields internally.
- Do not push, publish, or run paid inference without authorization. Historical
  acquisition permission does not authorize new calls. Frozen evidence stays
  immutable; new local measurements get separate outputs and provenance.
- Preserve predictions, observations, replays, and fixtures as distinct things.
  Evaluation labels never enter prediction inputs. Oracles remain evaluator-only.

## Development

```sh
nix run          # saved-answer example, no provider
nix run .#test   # current library, native integration, and source checks
```

Both commands work from the checkout root or this workspace, using the pinned
Nix environment and `$HOME/.cache/attune-v2-bootstrap-bazel`. One Bazel owner at a
time. Initial dependency downloads are separate from isolated test execution.

BuildBuddy is opt-in with `--config=remote`. Keep its pinned arm64 platform,
`dockerNetwork=off`, and disabled local fallback. Host isolation tests use the
pinned user/network namespace and remain `no-remote`. An effect handler does not
create a Bazel action: stages must declare their inputs and outputs explicitly.
Dynamically discovered requests need a later scheduling round. No Flix concurrency.

Keep the Flix compiler, JVM, Grit grammars, and Maven dependencies pinned. Flix and
Starlark extraction are required so Attune can examine its own implementation.

## Ownership and style

Flix owns identities, relations, effects, agent decisions, admission, failures,
cache validity, and evaluation. Use small functions, enums, pattern matching,
`Result`, native Datalog, and direct JVM calls. Explain advanced features where
they first appear. Prefer ordinary values over descriptor languages or registries.

Java owns only native memory, compiler bootstrapping, declared paths, process
isolation, and the narrow browser ABI. `platform/browser/` exports actual Flix
classes through TeaVM; it must never substitute Java or TypeScript algorithms.
Browser Flix calls are serial; Studio Grit extraction uses fixed-program native
subprocesses built by Bazel. Their source-only input, credential-free environment,
output bounds and watchdog are required. A subprocess is not a security sandbox.
Browser Datalog remains unavailable. Bazel owns dependencies and scheduling;
BuildBuddy supplies remote workers and caches. Do not move algorithms into glue
to meet a Flix budget.

There is no DSH/Cordis/Typert runtime or presentation renderer. Historical campaign
implementations remain in Git history. Tests assert semantics, compiler rejection,
replay identity, source permissions, exact ranges, and real isolation.

Register each source package's `policy_files` in `//:policy_sources`. Use explicit
inputs for retained evidence and editor assets; broad globs must not admit user
research or grammar checkouts. `Policy.flix` checks path metadata without opening
source contents. The uncached live audit reports unowned user files, including
preserved `notes/repository-through-time/`. Report failures; never suppress them.

## Size discipline

Stretch budgets: about 1,000 implementation lines of Flix, 200 first-party Java,
and 3,000 total including build machinery. Count authored code without comments
or blanks; report tests, generated files, dependencies, and the website separately.
Count maintained native patches and embedded build logic as implementation.

Prioritize fewer concepts, boundaries, adapters, representations, and files.
Do not minify, hide logic in fixtures, or build a counting framework. Explain any
remaining excess with file-level evidence in `notes/design.md`.

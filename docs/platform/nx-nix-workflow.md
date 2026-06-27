# Nx And Nix Workflow

Attune uses Nx as the public task surface and Nix as the reproducible toolchain
substrate. Agents and humans should name Nx targets in reports and docs. Nix
provides the pinned tools those targets use.

## Public Workflow

Use these commands first:

```bash
nx run workspace:attune-check
nx run workspace:attune-repair
nx run workspace:policy-fast
nx run <project>:typecheck
nx run <project>:test
```

Use `workspace:tool-versions` when a task needs to show the toolchain pins:

```bash
nx run workspace:tool-versions
```

That target prints the pinned Node, pnpm, Joern, and Joern CPG versions from
`nix/lib/versions.nix` and `package.json`, plus observed local command versions
when available. If observed local tools differ from the Nix pins, enter the dev
shell before treating the local shell as validation evidence.

## No Buck2 Path

Buck2 is not an active Attune workflow. Active package roots, root workflow
configs, and Nx targets must not add `BUCK`, `.buckconfig`, `buck-out`, or
Buck/Buck2 command strings. Historical copies under `imports/**` may retain old
build-system material as migration source only.

Reintroducing Buck or Buck2 requires a new OpenSpec change. The ordinary guard
for this is:

```bash
nx run workspace:arch:scan
```

## Nix Directory Layout

Add future Nix material in the smallest matching location:

- `nix/lib/`: shared constants such as tool versions, paths, environment
  variable names, and reusable shell snippets.
- `nix/toolchains/`: pinned CLI/tool closures such as Node, pnpm, OpenSpec,
  Joern, CocoIndex, and Kubernetes tools.
- `nix/modules/`: reusable runtime modules, including tmpfs-backed property
  stores and platform service modules.
- `nix/containers/`: nix2container image definitions for reproducible
  container execution.
- `nix/compose/`: Arion compose definitions that run containerized Nx targets.
- `nix/pkgs/`: packaged third-party tools that need lockfiles or custom
  derivations.
- `nix/hosts/`: host and cluster NixOS material for human-reviewed platform
  bootstrap work.

Do not place package-private shell workflows in package roots. If a package
needs a new repeated action, add or extend an Nx target/generator and put the
Nix support under the matching `nix/` directory.

## Joern Property Modes

`joern-effect-properties` has three property execution modes:

| Mode | Target | Runtime | Use |
| --- | --- | --- | --- |
| Cheap property | `nx run joern-effect-properties:property` | Nix-provisioned local toolchain through the typed worker-fuzz executor | Commit-tier package evidence that does not require a container boundary. |
| Joern-gated local tmpfs | `nx run joern-effect-properties:property-joern` | Local Nix dev shell with `JOERN_EFFECT_TEST_TMPDIR` normally pointing at `/dev/shm` | Real Joern evidence when the host has Joern tools and writable tmpfs. |
| Container tmpfs | `nx run joern-effect-properties:property-joern:container` | Arion + Nix image with `/dev/shm`, `/work`, and `/tmp` tmpfs mounts | Reproducible heavy proof pressure when Docker/Arion are available. |

Fuzzer container variants route through the same Arion runtime:

```bash
nx run joern-effect-properties:fuzz:container
nx run joern-effect-properties:fuzz:nightly:container
nx run joern-effect-properties:fuzz:dsl-four-hour:container
```

Container targets are external or heavy resource-tier checks. Run them only
when the task asks for proof pressure or when a human has approved the runtime
cost. Record exact target output and leave bulky evidence under
`.attune/cache`, CI artifacts, telemetry, or container logs rather than checked
in reports.

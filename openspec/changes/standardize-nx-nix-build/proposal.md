## Why

The unified Attune repo needs one boring, reproducible build spine before the application and `joern-effect` migration can move safely. The previous Buck2 direction added build-system complexity before the product architecture had settled; we are standardizing on Nx for workspace orchestration and code generation, with Nix providing the reproducible toolchain and developer environment.

## What Changes

- **BREAKING**: Remove Buck2 as a supported build/test/codegen path for the Attune monorepo.
- Introduce Nx as the only repo task orchestrator for packages, generated code, checks, tests, and agent-facing workflows.
- Introduce Nix as the only supported way to provision the shared toolchain, including Node, package manager, Joern, OpenSpec, Nx, and other required CLIs.
- Migrate `joern-effect` to Nx-owned code generation for generated Joern schemas, traversal DSL, template registries, property-test fixtures, documentation, and public package outputs.
- Add an active root `docs/` area and promote the `attuned` architecture docs into it as the project canon.
- Preserve the memory-backed FastCheck/e2e property harness for `joern-effect`, with Nx as the target interface and Nix/arion/nix2container as the reproducible runtime substrate.
- Require generated code to be reproducible from checked-in specs/schemas/templates and Nx targets, not manually edited artifacts.
- Preserve the Attune architectural canon from `attuned`: Effect owns runtime boundaries, Effect EventLog/Telemetry primitives provide the event model, Joern proves through known templates, and generated surfaces remain descriptive.
- Do not create active standalone `eventing` or `fork` packages for this migration; keep prior work in `imports/` only as source material.

## Capabilities

### New Capabilities

- `workspace-build-orchestration`: Defines the monorepo build model where Nx owns targets, dependency graph orchestration, affected runs, generation workflows, and package-level commands.
- `reproducible-nix-toolchain`: Defines the Nix-managed development and CI toolchain used to run Nx, Joern, OpenSpec, code generation, tests, and checks consistently.
- `joern-effect-nx-codegen`: Defines the `joern-effect` generation contract: inputs, Nx generators/targets, generated outputs, reproducibility guarantees, and validation checks.
- `joern-effect-property-harness`: Defines the property-test and e2e harness contract for generated repos, memory-backed temp stores, Joern-gated runs, and FastCheck integration.

### Modified Capabilities

None.

## Impact

- Affects root workspace configuration, package layout, developer setup, CI shape, code generation, and all package task definitions.
- Affects `joern-effect` most directly: generation moves behind Nx targets and must be reproducible through Nix-provisioned tools.
- Removes Buck2 files, scripts, documentation, and task assumptions from the supported path.
- Establishes a foundation for later Attune Discovery packages, Effect-native event logging/telemetry, property testing, and OpenSpec-driven implementation.

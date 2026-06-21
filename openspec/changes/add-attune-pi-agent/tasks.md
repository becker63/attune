## 1. Planning

- [x] 1.1 Create OpenSpec proposal, design, and capability requirements for the Pi agent v0 slice.

## 2. Package and schemas

- [x] 2.1 Add private `packages/attune-pi-agent` package, Nx project, tsconfig, and package manifest.
- [x] 2.2 Define Effect Schema-backed implementation spec, obligations, evidence matrix, run event, and permission profile models.
- [x] 2.3 Add ATT-50 implementation spec and static run evidence fixtures.

## 3. Behavior

- [x] 3.1 Implement deterministic evidence matrix rendering and `/attune-evidence` command function.
- [x] 3.2 Implement deny-first permission normalization/classification logic.
- [x] 3.3 Implement deterministic spec and permission-policy generator helpers.
- [x] 3.4 Implement `/attune-spec` interrogated spec drafting.
- [x] 3.5 Implement Pi conversational adapter for `/attune-spec`.
- [x] 3.6 Implement actual Pi extension registration for `/attune-spec`.

## 4. Tests and docs

- [x] 4.1 Add schema decode and invalid fixture rejection tests.
- [x] 4.2 Add evidence matrix rendering and generator determinism tests.
- [x] 4.3 Add property tests for permission normalization/evidence stability.
- [x] 4.4 Add mutation target configuration for permission/evidence logic.
- [x] 4.5 Document the spec -> falsification -> evidence loop.
- [x] 4.6 Add tests and docs for the spec interview loop.
- [x] 4.7 Add tests and docs for the Pi conversational adapter.
- [x] 4.8 Add tests and docs for the Pi extension command surface.

## 5. Integration and validation

- [x] 5.1 Register the package in workspace TypeScript/Nx conventions and ignore `.attune-runs/`.
- [x] 5.2 Run targeted typecheck and tests for `attune-pi-agent`.
- [x] 5.3 Expose the Pi extension entrypoint through package metadata and build outputs.

Agent: atom-implementation-policy-agent
Wave: Phase 4 tooling / atom-reactivity policy
Ownership: packages/attune-architecture policy CLI/modules/tests; OpenSpec task 4.3 handoff
Changed:
- Added `packages/attune-architecture/src/framework-atom-implementation-policy.ts` with source-positioned diagnostics for atom durable writes, EventLog appends, provider/resource actions, external service calls, scheduler/resource lifecycle, and hidden mutable state.
- Wired the new atom implementation policy into `checkFrameworkPolicyWorkspace` under the existing `atom-graph` policy slice and exported it from `packages/attune-architecture/src/index.ts`.
- Added focused framework policy CLI fixtures covering unsafe atom compute, safe recomputable atom reads, and ignored fixture/generator-template paths.
- Marked OpenSpec task 4.3 complete.
Generated:
- None.
Validated:
- `nx run attune-architecture:typecheck`
- `nx run attune-architecture:test -- --run framework-policy-cli`
- `nx run workspace:framework-policy-check`
- `nx run workspace:package-contracts-check`
Not run:
- Full workspace test suite; this slice only changed the architecture policy package and ran focused policy plus composed workspace checks.
Contract status:
- Atom implementation policy now participates in framework policy checks and package-contract composed checks through the existing Nx targets.
Residual migration debt:
- The scanner is intentionally path/source based for current atom implementation files and ignores fixture/generated/generator-template paths. A future framework DSL/source-extraction pass can replace these heuristics with symbol-aware atom compute boundaries.
- The working tree contains unrelated concurrent changes in framework runtime/testing/protocol, attune-nx executors, root `project.json`, and task status lines that this agent did not author or revert.
Blocked by:
- None.
Next agent:
- Atom graph conformance or final-ratchet validation agent should review whether richer static DSL extraction should broaden atom implementation discovery beyond atom-named source files.

# Implementation Tasks

The previous checklist implemented a broader event-sourced research kernel and
is superseded. Completion marks from that design do not carry forward. The
tasks below implement only the Effect MCP capability boundary.

## 1. Establish the reduced boundary

- [x] 1.1 Capture a fresh `scc` baseline for all TypeScript in `joern-effect`, `attune-mcp`, and the property package, including generated code, tests, scripts, and configuration.
- [x] 1.2 Map existing modules to `keep`, `simplify`, or `delete` using the authority table in `design.md`, and allocate the complete 10,000-line target before implementation.
- [x] 1.3 Preserve the existing `joern-effect` API, AgentFS remount-origin patch and native contract, low-level process/cancellation discoveries, Nix packaging, and real fixtures as the maximal reference.
- [x] 1.4 Remove the public and internal run-envelope state machine, owner token/epoch model, terminal claiming, abandoned-owner reconciliation, and audit reconciliation.
- [x] 1.5 Remove the Attune semantic provenance graph, reference-target validation, cross-snapshot interpretation, and repeated per-tool correlation documents.
- [x] 1.6 Remove AgentFS tool-audit mirroring as an Attune execution authority.
- [x] 1.7 Remove public `joern_reindex`, tool-specific promotion workflows, and server-side promotion eligibility policies.
- [x] 1.8 Remove dirty/untracked tool-visible snapshot manifests in favor of clean Git commit identity.
- [x] 1.9 Remove the extensible property adapter/service registry and cross-tool IPC fabric; retain only a fixed native property-runner boundary.
- [x] 1.10 Confirm no implementation or dependency for ActiveGraph, Python, Pydantic generation, model training, or an agent loop remains in this change.

## 2. Define the mechanical contracts

- [x] 2.1 Define branded Effect schemas for `InvestigationId`, `InvocationId`, full Git commits, artifact URIs, digests, and contained repository-relative paths.
- [x] 2.2 Define bounded `FreeFormReference { ref, note? }` without target lookup or a role enum.
- [x] 2.3 Define `ArtifactReference` with URI, media type, SHA-256, byte count, and completeness.
- [x] 2.4 Define `AttuneReceipt` with mechanical identity, toolchain and input digests, terminal status, typed failure, timestamps, and artifact references.
- [x] 2.5 Define typed failures for identities, stale/dirty snapshots, paths, AgentFS, invocation conflict/incompleteness, native processes, limits, cancellation, promotion, and finalization.
- [x] 2.6 Define Effect tool contracts for the eight public operations in `design.md`.
- [x] 2.7 Emit deterministic `contracts/attune-tools.schema.json` and `contracts/attune-tools.sha256`.
- [x] 2.8 Add a check that fails when Effect schemas and checked-in contract artifacts differ.

## 3. Implement the append-only invocation boundary

- [x] 3.1 Canonicalize accepted requests and compute stable input digests.
- [x] 3.2 Resolve `/artifacts/<tool>/<invocation-id>/` with invocation identity scoped by investigation, tool, and caller identifier.
- [x] 3.3 Persist a canonical accepted request, exact references, and native input files before executing a tool.
- [x] 3.4 Add one simple OS lock per invocation key around lookup, first acceptance, execution, and receipt publication, with no owner or reconciliation model.
- [x] 3.5 Implement receipt lookup before current-state preconditions so completed same-digest retries return without re-execution, including after finalization.
- [x] 3.6 Reject different-digest requests with `InvocationConflict` and request-without-receipt retries with `InvocationIncomplete`.
- [x] 3.7 Publish one immutable discriminated terminal `receipt.json` after controlled completion, make response delivery best-effort after caller cancellation, and keep pre-acceptance failures in the MCP failure channel.
- [x] 3.8 Implement bounded MCP summaries while hashing and retaining complete output artifacts.
- [x] 3.9 Mark every limited output prefix `complete: false` and return a typed limit failure.
- [x] 3.10 Add an authoritative bounded bootstrap receipt location for materialization, copying identical request/receipt bytes into the capsule before successful bootstrap publication without reverse reconciliation.

## 4. Materialize exact investigations

- [x] 4.1 Implement remote normalization and exact revision peeling to a full Git commit using the selected narrow Git backend.
- [x] 4.2 Reject resolved commits containing Gitlink entries because submodules are unsupported in V0.
- [x] 4.3 Materialize and validate an immutable clean base without updating it in place.
- [x] 4.4 Create one AgentFS database and merged workspace per investigation.
- [x] 4.5 Expose stable contained `/repo` and `/artifacts` namespaces.
- [x] 4.6 Create the attached `attune/<investigation-id>` branch at the resolved commit.
- [x] 4.7 Resume an investigation only over its recorded, validated base.
- [x] 4.8 Implement `repository_checkpoint` with `require-clean` and a `commit` policy that stages all current non-ignored changes.
- [x] 4.9 Require exact clean Git commits and isolated commit checkouts for every native analysis operation.
- [x] 4.10 Implement mechanical finalization with a small investigation-wide shared/exclusive activity gate that waits for accepted work, rejects every later new invocation, and preserves resources plus exact completed-invocation retries.

## 5. Implement the shared native-process adapter

- [x] 5.1 Implement one small Effect-scoped process runner using explicit executable and argument arrays without shell interpolation.
- [x] 5.2 Stream stdout and stderr to invocation artifacts while maintaining bounded response tails.
- [x] 5.3 Record executable/toolchain identity, exit status, and timing as mechanical evidence.
- [x] 5.4 Propagate MCP cancellation and timeout to the owned process tree and run finalizers.
- [x] 5.5 Provide a read-only exact-commit checkout plus private writable work directory when a tool requires scratch space.
- [x] 5.6 Keep trusted-local V0 limits explicit without claiming a hostile-code security sandbox.

## 6. Add thin native tool adapters

- [x] 6.1 Implement `joern_query` over `joern-effect` with raw CPGQL, exact commit/import identity, native evidence, and bounded results.
- [x] 6.2 Keep typed `joern-effect` query execution as an internal TypeScript API and test its decoder path.
- [x] 6.3 Prevent incompatible CPG reuse and expose no public reindex or general session-registry framework.
- [x] 6.4 Implement `maude_run` for exact native module and command bytes through the shared process adapter.
- [x] 6.5 Accept a native synchronous or asynchronous fast-check property as the TypeScript module's default export, with no Attune property DSL.
- [x] 6.6 Implement `property_run` with pinned Node, Effect, and fast-check using `fc.check`.
- [x] 6.7 Retain JSON-safe scalar run details, native report text, seed/path/counts, safely serializable counterexample JSON or native stringification, and model/scheduler coordinates when available.
- [x] 6.8 Implement `ast_grep_run` test, scan, and apply in isolated exact-commit checkouts, publishing only a revalidated apply patch into the investigation branch.
- [x] 6.9 Retain ast-grep rule/config/test bytes, findings, patch, and changed-file list without auto-commit or a prior-test semantic gate.
- [x] 6.10 Verify none of the four adapters interprets opaque references or claims semantic conformance.

## 7. Implement generic promotion and resources

- [x] 7.1 Implement `artifact_promote` for one retained artifact URI and one contained repository-relative destination.
- [x] 7.2 Revalidate investigation identity, expected clean commit, source identity, destination containment, Git-administrative exclusion, Git-ignore status, and non-finalized state immediately before copying.
- [x] 7.3 Retain the promotion patch and leave repository changes uncommitted.
- [x] 7.4 Expose read-only investigation metadata and receipt resources.
- [x] 7.5 Expose contained, regular-file artifact resources with bounded inline reads and metadata-only `ResourceTooLarge` results; add no range, streaming, listing, or search framework.
- [x] 7.6 Expose the checked-in contract bundle and digest as a read-only resource.
- [x] 7.7 Do not add list/query APIs that reconstruct a research graph or semantic catalog.

## 8. Assemble the MCP application

- [x] 8.1 Assemble the eight Effect tools into one toolkit using the repository-pinned Effect 4 API.
- [x] 8.2 Map MCP read-only, destructive, idempotent, and open-world hints to the actual mechanical behavior.
- [x] 8.3 Start one local stdio server with protocol output reserved on stdout and logs on stderr.
- [x] 8.4 Keep one bounded application layer for investigation resolution, locks, AgentFS access, tool adapters, and resources.
- [x] 8.5 Add an MCP schema/list/call smoke test using a client independent of any particular agent harness.
- [x] 8.6 Document how a future ActiveGraph pack consumes the frozen schema and receipts without making ActiveGraph a V0 dependency.

## 9. Pin the executable environment

- [x] 9.1 Pin compatible TypeScript dependencies in pnpm and the AgentFS plus narrow Git CLI backend in Nix.
- [x] 9.2 Expose pinned Joern, Maude, Node/Effect/fast-check, and ast-grep closures.
- [x] 9.3 Expose `attune-mcp` and one `attune-lab` environment for both supported Linux systems.
- [x] 9.4 Compute one build/startup-injected flake-lock and toolchain digest and record it without traversing Nix closures per invocation.
- [x] 9.5 Add native smoke checks for AgentFS copy-up/whiteout/remount, Joern query, Maude execution, fast-check shrinking/replay, and ast-grep test/scan/apply.
- [x] 9.6 Validate native `aarch64-linux` behavior and `x86_64-linux` package/check construction.

## 10. Prove the boundary end to end

- [x] 10.1 Create a local fixture repository with multiple commits, a Joern-observable pattern, a Maude theory, a falsifiable property, and an ast-grep rule.
- [x] 10.2 Materialize an exact fixture commit and prove the immutable base does not change.
- [x] 10.3 Execute Joern, Maude, property, and ast-grep invocations and inspect canonical accepted requests, exact native inputs, references, outputs, snapshots, and receipts.
- [x] 10.4 Issue concurrent duplicates and a later completed retry and prove exactly one subprocess runs.
- [x] 10.5 Prove conflicting and incomplete invocation identifiers fail without replay.
- [x] 10.6 Promote one selected native artifact, checkpoint it into Git, restart the server, and prove resume.
- [x] 10.7 Race finalization with an accepted analysis invocation, prove finalization waits for its terminal receipt and rejects every later new invocation, and prove resources plus exact completed retries remain available.
- [x] 10.8 Prove opaque unknown references and missing semantic relationships do not block mechanical execution.
- [x] 10.9 Run strict OpenSpec validation, monorepo checks, MCP contract checks, and `nix flake check`.
- [x] 10.10 Add an automated `scc` check over the complete V0 TypeScript tree, including `joern-effect` and generated code; report the 10,000-line target and fail at 15,000 with no package exclusion.

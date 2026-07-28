## 1. Standardize the cross-language contract

- [x] 1.1 Replace the intermediate Effect document bundle with one deduplicated, valid JSON Schema 2020-12 compound document containing stable tool and resource mappings.
- [x] 1.2 Add contract tests that resolve every local `$ref`, verify all eight tool input/result/failure mappings, and retain explicitly unconstrained fields.
- [x] 1.3 Recompute and validate the served contract digest instead of trusting an unrelated digest file.
- [x] 1.4 Regenerate the checked-in contract and digest and verify the live MCP input schemas remain compatible with the frozen definitions.

## 2. Add generated Python contract projections

- [x] 2.1 Create one Python 3.12 uv project with exact ActiveGraph, Pydantic, MCP SDK, generator, type-checker, formatter, and test dependencies.
- [x] 2.2 Add deterministic Pydantic v2 generation from the standard contract, including the expected digest module and a regenerate-to-temporary-tree drift mode.
- [x] 2.3 Generate and check in the initial strict request, result, receipt, failure, artifact, and resource models without timestamps or duplicated definitions.
- [x] 2.4 Add Python conformance tests for aliases, extra-field rejection, literals, receipt variants, nullable/optional behavior, unconstrained Joern summaries, and representative typed failures.

## 3. Implement the ActiveGraph capability bridge

- [x] 3.1 Implement one persistent host-native stdio MCP client with initialization, contract-resource handshake, synchronous call facade, and explicit child/session cleanup.
- [x] 3.2 Add typed transport, contract-mismatch, and pre-acceptance capability failures while returning accepted terminal receipt results as generated models.
- [x] 3.3 Implement versioned durable invocation identity from explicit run identity, ActiveGraph event/behavior/frame context, canonical arguments, tool name, and contract digest.
- [x] 3.4 Add one generic `typed_tool` adapter, eight explicit nondeterministic ActiveGraph wrappers, and a digest-versioned infrastructure pack with no object or relation ontology.
- [x] 3.5 Add focused tests for stable/distinct invocation IDs, typed wrapper registration, recorded-response declarations, session reuse, mismatch rejection, and cleanup.

## 4. Integrate the build systems

- [x] 4.1 Add Nx targets for Python generation drift, formatting, linting, static typing, tests, build, and pack smoke checks with a one-way dependency on the Effect contract check.
- [x] 4.2 Add uv2nix, pyproject-nix, and Python build-system flake inputs and build the runtime/check environments from the exact uv lock.
- [x] 4.3 Expose `attune-activegraph`, include it in `attune-lab` and the dev shell, and add a host-native MCP handshake check without a VM.
- [x] 4.4 Document local generation, checks, run identity configuration, host execution, contract mismatch behavior, and the no-IR boundary.

## 5. Validate the completed boundary

- [x] 5.1 Run strict OpenSpec validation and generated-contract drift checks.
- [x] 5.2 Run the focused and workspace TypeScript type, test, build, stdio, and schema checks.
- [x] 5.3 Run locked Python generation, formatting, linting, static typing, unit tests, wheel build, pack discovery, and host-native MCP integration.
- [x] 5.4 Evaluate or build the new Nix outputs and checks, record handwritten/generated LOC separately, and confirm no VM is used by the ActiveGraph bridge.

## Why

Attune now has a small Effect MCP capability service and a deterministic
contract artifact, but a Python research harness cannot yet consume that
artifact as standard JSON Schema or call the service through a statically
useful ActiveGraph boundary. The next step is a minimal generated-client seam
that keeps Effect authoritative while allowing ActiveGraph to own discretionary
research.

## What Changes

- Replace the current intermediate Effect JSON-Schema document bundle with one
  generator-ready JSON Schema 2020-12 compound document and an exact digest,
  still derived solely from the Effect tool schemas.
- Generate checked-in Pydantic v2 request, result, receipt, failure, and resource
  models from that document using a pinned build-time generator.
- Add one small Python package containing:
  - a persistent stdio MCP client for the host-native `attune-mcp` process;
  - eight explicit, typed capability methods and ActiveGraph tool wrappers;
  - one narrow generic adapter that restores static input/output coupling around
    ActiveGraph's non-generic tool decorator;
  - an ActiveGraph infrastructure pack with no research ontology.
- Compare the generated client's expected contract digest with the live
  `attune://contracts` resource before an ActiveGraph run.
- Derive caller-stable Attune invocation identifiers from durable ActiveGraph
  run/event context, canonical arguments, tool identity, and contract digest.
- Record Attune-backed ActiveGraph tools as nondeterministic external calls so
  ActiveGraph replay consumes recorded responses rather than re-executing the
  service.
- Add uv, Nx, and Nix checks for schema validity, generated-code drift, Python
  typing, pack loading, receipt decoding, and host-native client/server
  compatibility.
- Keep Markdown, opaque references, hypotheses, semantic object types, and
  relation meanings under agent and future pack discretion. This change does
  not generate an ontology or shared IR.

## Capabilities

### New Capabilities

- `cross-language-contracts`: Export a standard, deterministic Effect-derived
  JSON Schema contract and generate exact Pydantic projections with drift and
  compatibility checks.
- `activegraph-capability-bridge`: Expose Attune MCP operations as typed,
  replay-safe ActiveGraph tools through one persistent host-native client
  session.

### Modified Capabilities

None.

## Impact

- Adds a single uv-managed Python project and pins ActiveGraph, Pydantic,
  datamodel-code-generator, the Python MCP SDK, and the Python type/test tools.
- Changes the structure, but not the Effect authority, tool names, or wire
  payloads, of `contracts/attune-tools.schema.json`.
- Adds small Nx targets for Python generation, type checking, tests, and pack
  smoke checks.
- Extends the Nix closure with a host-native Python/ActiveGraph application and
  adds it to `attune-lab`; real investigations continue to run on the host.
- Targets fewer than 1,000 handwritten Python production lines and fewer than
  1,000 handwritten Python test/build lines. Generated models are measured
  separately and must not hide duplicated schema output.

# attune-activegraph

This package is the typed Python projection of Attune's Effect MCP capability
boundary. Its `attune_effect_tools` pack gives ActiveGraph eight mechanical
tools and defines no investigation semantics, object types, relations,
behaviors, prompts, or documentation workflow.

The authority chain is deliberately one way:

```text
Effect Schema
  -> contracts/attune-tools.schema.json
  -> generated Pydantic models
  -> eight handwritten ActiveGraph wrappers
  -> one persistent host-native MCP session
```

The server's `attune://contracts` resource is checked against the digest built
into this package before the first call. A mismatch fails before an
investigation operation is sent.

## Contract generation

Python 3.12 and every dependency are pinned by `.python-version`,
`pyproject.toml`, and `uv.lock`.

```sh
uv sync --locked
uv run python scripts/generate_contract_models.py generate
uv run python scripts/generate_contract_models.py check
```

`generate` consumes the checked-in Draft 2020-12 compound schema and writes
`generated/models.py` plus the expected digest module. `check` regenerates into
a temporary directory and compares exact bytes, so it never repairs drift
silently. Do not hand-edit generated files and do not generate production
models dynamically from `tools/list`.

## ActiveGraph use

The distribution exposes the `attune_effect_tools` ActiveGraph pack. Its
version includes the contract-digest prefix, and all tools are declared
nondeterministic to ActiveGraph so replay uses its recorded response.

Configure a stable run identity before a live call:

```sh
export ATTUNE_ACTIVEGRAPH_RUN_ID=my-durable-activegraph-run
export ATTUNE_MCP_COMMAND=attune-mcp
```

`ATTUNE_MCP_ARGS` may contain a JSON array of arguments and
`ATTUNE_MCP_CWD` may select a working directory. Arguments are passed directly;
the bridge never invokes a shell. The default pack is safe to import without
these variables and starts the server lazily on its first call.

Each wrapper replaces the input's placeholder `invocationId` with an `ag1:`
identifier derived from the configured run identity, ActiveGraph event,
behavior/frame context, tool name, canonical arguments, and contract digest.
This lets a retry recover the same Effect receipt after a client-side crash.
ActiveGraph's attempt-scoped idempotency key is not used as durable identity.

Callers embedding the bridge should close `AttuneMcpClient` explicitly or use
it as a context manager. One client owns one MCP session and one child process;
subsequent calls reuse both.

## Checks

```sh
uv run ruff format --check .
uv run ruff check .
uv run basedpyright
uv run pytest
uv build
uv run attune-activegraph-smoke
```

The smoke is host-native. It performs the contract handshake and validates one
typed `UnknownInvestigation` failure; it does not use a VM, mount AgentFS, or
run Joern. Nx connects these checks to the authoritative TypeScript schema
check, while Nix consumes the same `uv.lock` for the packaged environment.

Effect remains responsible for repositories, AgentFS, subprocesses, receipts,
artifacts, cancellation, and cleanup. ActiveGraph remains free to interpret
gaps and maintain semantic trajectories using whatever objects, relations, and
Markdown a research pack finds useful.

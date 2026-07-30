# attune-guide

`attune-guide` is the private source package for Attune's long-form technical
publication. It owns the hero curriculum; the thesis, model, ActiveGraph, and
artifact-layout chapters; the native retryable-payment investigation packet;
and the seven-fence compiler-checked tool transcript.

The package reexports the six public `attune-mcp` names only so TSDoc
references resolve to their canonical production declarations. It is not a
runtime facade or a supported API. The documentation reader takes public
declaration order independently from `attune-mcp/src/index.ts`.

The packet regression executes the documented fast-check falsifier with its
pinned seed and replay path. Runtime behavior, schemas, and generic tool tests
remain in `attune-mcp`.

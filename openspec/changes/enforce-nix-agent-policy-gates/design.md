# Design

## Nx public policy gates

Nx should expose the supported policy validation entrypoints. Nix may pin and run
those entrypoints in pre-commit or flake checks, but humans and agents should see
Nx target names as the public API.

Policy rules should initially be deterministic repository scanners. They can
later move into `packages/attune-architecture-lint` once the rule vocabulary and
exceptions are known.

## Attune Source BOM

The Source BOM is line-oriented JSON stored near package source, with shards such
as `source.bom.jsonl`. Each record describes a generated or repeated source
shape:

- `schema`: stable schema identifier.
- `capability`: OpenSpec capability or package capability that owns the shape.
- `generator`: Nx generator or sync generator that produced the shape.
- `path`: repository-relative generated or managed file path.
- `owner`: human-facing owner or package boundary.
- `description`: short reason the source shape exists.

Nx generators should use shared helpers rather than hand-writing BOM text.

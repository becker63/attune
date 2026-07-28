# attune-docs

`attune-docs` builds the `attune-mcp` API reference directly from its TypeScript
source and fresh declaration output. There is no parallel prose model: package,
symbol, and member TSDoc are the documentation.

The reference follows the public source order:

```ts
Attune;
Investigation;
AttuneReceipt;
AttuneToolkit;
InvestigationLifecycleError;
AttuneToolFailure;
```

The package page is the site root. Each public symbol and member then gets its
own page, exact source links, and a page-specific Shiki + Twoslash example with
type hovers. Independent experiment publications remain available beside the
reference.

## Build and check

Run commands from the workspace root:

```sh
pnpm --filter attune-docs run audit
pnpm --filter attune-docs run manifest
pnpm --filter attune-docs run build
pnpm --filter attune-docs run typecheck
pnpm --filter attune-docs run test
pnpm --filter attune-docs run test:e2e
```

`audit`, `manifest`, and `build` first rebuild the current `attune-mcp`
declaration closure. Extraction stops if TypeScript validation fails, and the
manifest binds both the source digest and the exact `dist/index.d.mts` digest.
`build` writes the static site to `dist/`.

Use another output directory or Pages base path when needed:

```sh
pnpm --filter attune-docs run build -- \
  --output /tmp/attune-reference \
  --base-path /attune/
```

`DOCS_SOURCE_REF` selects the immutable GitHub source-link revision.
`DOCS_SITE_URL` sets the canonical site URL. A dirty local source tree is
labelled `local:<sha>:<digest>` so previews remain useful; a published build can
set `DOCS_SOURCE_COMMIT=<40-character-sha>`, which must match the source ref.

## Source contract

Write public documentation where the type is defined:

````ts
/**
 * Materialize an investigation from one request.
 *
 * @param request - The request to inspect.
 * @returns An investigation with a stable identifier.
 * @throws {@link AttuneToolFailure} when a required tool fails.
 * @example
 * ```ts
 * import { Attune } from "attune-mcp";
 *
 * declare const attune: Attune;
 * attune.materialize({ prompt: "Trace the request" });
 * ```
 */
````

The extractor keeps complete `@example` programs, including multi-file
`@filename` sections and cut directives. Every recorded TSDoc, declaration,
implementation, relation, and example span includes half-open byte offsets, a
digest of those exact bytes, line coordinates, and an immutable GitHub link.

`docs-policy.json` closes the public surface and enforces its source order.
`schema/api-manifest.schema.json` closes the emitted manifest. Run
`pnpm --filter attune-docs run experiments:verify` to validate the preserved
experiment publications independently.

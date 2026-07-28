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
own page, exact source links, and source-authored Shiki + Twoslash examples with
type hovers. The manifest does not synthesize missing examples: package TSDoc
owns at least three programs, every symbol owns at least two, and every member
owns at least two. Independent experiment publications remain available beside
the reference.

Every emitted document uses one ordered story: narrative, shape, examples,
related types, and source. Every heading is anchored by a real public type or
member expression. Callable pages show each input and output separately with
its exact source type, immutable annotation link, referenced declarations, and
a compact checked Twoslash lens. These generated contract lenses supplement,
but never count as, source-owned examples.

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

## Editorial contract

Write the whole learning path where the public type is defined. Start with the
promise made to a caller, place it in the investigation lifecycle, and name the
evidence or authority it carries. Use `@remarks` for the reason behind a rule,
not an implementation tour. Give every root concept and member a
multi-paragraph narrative that links the type before it and the type after it.
Document every type parameter, parameter, return, recoverable failure, public
method, and public property; describe the caller decision and guarantee rather
than merely restating the annotation.

Keep the vocabulary closed around the six root exports above. Infer requests
and results from `Attune` methods instead of publishing another layer of aliases.
Every export and public member owns at least two titled, executable examples.
Examples use the real declaration bundle, hide supporting setup with Twoslash
cuts, and leave the smallest useful typed expression visible.

The manifest records each symbol's usable public type expression, every
parameter's exact declaration and span, and every return annotation directly
from the TypeScript AST rather than recovering them from rendered signatures.
Keep annotations explicit enough to read: public type references link to their
API page and immutable declaration, while private aliases link only to source.
For generic methods, instantiate a representative operation before applying
`Parameters` or `ReturnType`; an uninstantiated generic projection can erase
the correlation the page is meant to teach.

For example:

````ts
/**
 * Materializes an exact repository revision and issues its initial proof.
 *
 * @remarks
 * This is the only transition that creates an investigation identity.
 *
 * @param input - The unchanged materialization wire request.
 * @returns A materialized proof, or the terminal rejected result.
 * @throws `AttuneToolFailure` when the invocation cannot be accepted.
 *
 * @example Infer the request from the service
 * ```ts
 * import type { Attune } from "attune-mcp";
 * declare const attune: Attune;
 * declare const input: Parameters<Attune["materialize"]>[0];
 * // ---cut-before---
 * const attempt = attune.materialize(input);
 * ```
 */
````

The extractor keeps complete `@example` programs, including multi-file
`@filename` sections, intentional `@errors`, emitted-file selections, and cut
directives. It rejects validation-bypass directives. Every recorded TSDoc,
declaration, implementation, relation, and example span includes half-open byte
offsets, a digest of those exact bytes, line coordinates, and an immutable
GitHub link.

Strict examples reject `@noCheck`, `@noErrorValidation`, `@noErrors`, and
`@noErrorsCutted`; use an explicit `@errors` assertion to teach an intentional
illegal program.

`docs-policy.json` closes the public surface and enforces its source order.
`schema/api-manifest.schema.json` closes the emitted manifest. Run
`pnpm --filter attune-docs run experiments:verify` to validate the preserved
experiment publications independently.

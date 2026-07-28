# attune-docs

This package compiles Attune's documentation into a fully static GitHub Pages
artifact. The lower layer is mechanical: `ts-morph` loads the supported
`attune-mcp` entry with the repository TypeScript configuration and emits
stable symbols, signatures, TSDoc, source locations, members, registry-owned
lifecycle relations, and content-addressed facts. The upper layer validates
evidence-cited narrative drafts and renders onboarding Markdown and HTML.
The workspace TypeScript 7 compiler validates the source project before
extraction; the manifest records both that compiler and ts-morph's embedded
analysis-compiler version.

The public build also maps the whole repository: `joern-effect`, `attune-mcp`,
the Python ActiveGraph bridge, generated contracts, Nix, OpenSpec, and this
documentation compiler.

## Commands

```sh
pnpm --filter attune-docs manifest
pnpm --filter attune-docs run audit
pnpm --filter attune-docs guides:approve --reviewer "name" --decision-id "review-123" --decision-time "2026-07-27T00:00:00Z" --all
pnpm --filter attune-docs guides:validate
DOCS_BASE_PATH=/attune/ pnpm --filter attune-docs build
pnpm --filter attune-docs typecheck
pnpm --filter attune-docs test
```

`build` writes `dist/`, including `.nojekyll`, `404.html`, the versioned API
manifest, search index, source schemas, four guide pages in HTML and Markdown,
evidence manifests, trace pages, and one page per supported API export. All
internal URLs honor `DOCS_BASE_PATH`; the default is `/attune/`.

Approval is an explicit reviewer action, not a build side effect. The prose
model receives `schema/prose-draft.schema.json`, which deliberately has no
review field. `guides:approve` writes separate, approved-only artifacts under
`content/approvals/`; deterministic materialization joins those artifacts to
the grounded prose. Build and CI never create, refresh, or silently recompute
an approval. A cited fact or structured draft change makes the old approval
unpublishable, while an unrelated fact change does not force every guide
through review again.

The default manifest revision is the SHA-256 digest of the checked MCP source,
so an approval can bind the exact type bytes without becoming self-referential
when its approval file is committed. `DOCS_SOURCE_REF` independently selects
the GitHub source-link ref; Pages passes `github.sha` so links remain exact
without changing review identity. `DOCS_SOURCE_REVISION` is reserved for an
explicit external revision override. `DOCS_TRACE_EXPORT_DIR` points at optional,
deterministic ActiveGraph `TraceExport` JSON files. If it is unset, the builder
uses the checked-in representative trace fixture when present and labels it as
an example rather than the page's publication trace. Files supplied through
`DOCS_TRACE_EXPORT_DIR` are publication records and must bind the exact guide,
source revision, semantic manifest digest, approval/validation chain, and
rendered HTML digest or the build fails. Public node ids are re-hashed from a
strict per-type redacted field projection, edge ids are re-hashed from their
endpoints, and unexpected trace fields are rejected rather than republished.
An unchanged draft may carry an earlier human decision across unrelated
source/manifest changes only through an explicit ActiveGraph approval
carry-forward record linking both drafts and the still-latest decision. A
direct decision on the current draft, later rejection, validation failure, or
invalidation takes precedence.

## Documentation policy

`docs-policy.json` deliberately targets lifecycle capabilities, the Toolkit and
closed operation registry, and public recoverable errors instead of requiring
comments on every helper. `ATTUNE_OPERATIONS` is authoritative for lifecycle
transitions. TSDoc relations improve hovers and navigation but cannot make the
machine audit pass.

TypeDoc remains the preferred future reference renderer. Run
`pnpm --filter attune-docs probe:typedoc` to repeat the compatibility probe;
the current 0.28.20 release is not compatible with TypeScript 7. The manifest
keeps that renderer choice replaceable.

See [workflow/prose-agent.md](workflow/prose-agent.md) for the structured-output
and review boundary.

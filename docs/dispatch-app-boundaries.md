# Attune FoldKit app boundary

The product FoldKit UI is the only FoldKit app in this workspace.

Use `packages/attune-foldkit` for WorkbenchSnapshot review, motifs, evidence
packets, findings, codebase discovery flows, human promotion workflows, the
constrained FoldKit MDX page grammar, and the Vite web boot.

The package name is `@attune/foldkit-ui` and the Nx project is
`attune-foldkit`.

## Removed Dispatch surface

The former private Dispatch operator packages were removed from this project:

- `packages/dispatch-schema`
- `packages/dispatch-core`
- `packages/dispatch-foldkit`
- `packages/dispatch-web`

Do not add Dispatch pages, feeds, or `dispatch-*` packages back into the
product app as incidental monitoring UI. If a separate private operator app is
needed later, create it as its own reviewed change with a separate runtime and
package boundary.

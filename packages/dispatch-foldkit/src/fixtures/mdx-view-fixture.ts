import { compileFoldkitMdx } from "@attune/dispatch-core"

import type { FoldkitMdxViewFixture } from "../fixture-types.js"

export const workbenchMdxSource = `---
title: FoldKit typed fixture route
---

# FoldKit typed fixture route

Typed fixtures append semantic DiscoveryEvent facts before FoldKit reads an atom-derived snapshot.

<PageHeader eyebrow="Workbench" title="Atom-derived fixture" />
<StatStrip label="Appended events" value="6" />
<DispatchRiver source="workbenchAtomFixture" />
<ActionBar primary="Promote rule" secondary="View trace" />
`

export const mdxViewFixture = {
  fixtureId: "foldkit-mdx-view-fixture",
  sourcePath: "fixtures/workbench-atom-fixture.mdx",
  page: compileFoldkitMdx(
    workbenchMdxSource,
    "fixtures/workbench-atom-fixture.mdx",
  ),
  expectedText: [
    "FoldKit typed fixture route",
    "Typed fixtures append semantic DiscoveryEvent facts before FoldKit reads an atom-derived snapshot.",
    "Atom-derived fixture",
  ],
  expectedComponents: ["PageHeader", "StatStrip", "DispatchRiver", "ActionBar"],
} satisfies FoldkitMdxViewFixture

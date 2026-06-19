import { compileFoldkitMdx } from "@attune/dispatch-core"

import type { FoldkitMtxViewFixture } from "../fixture-types.js"

export const workbenchMtxSource = `---
title: FoldKit typed fixture route
---

# FoldKit typed fixture route

Typed fixtures append semantic DiscoveryEvent facts before FoldKit reads an atom-derived snapshot.

<PageHeader eyebrow="Workbench" title="Atom-derived fixture" />
<StatStrip label="Appended events" value="6" />
<DispatchRiver source="workbenchAtomFixture" />
<ActionBar primary="Promote rule" secondary="View trace" />
`

export const mtxViewFixture = {
  fixtureId: "foldkit-mtx-view-fixture",
  sourcePath: "fixtures/workbench-atom-fixture.mtx",
  page: compileFoldkitMdx(workbenchMtxSource, "fixtures/workbench-atom-fixture.mtx"),
  expectedText: [
    "FoldKit typed fixture route",
    "Typed fixtures append semantic DiscoveryEvent facts before FoldKit reads an atom-derived snapshot.",
    "Atom-derived fixture",
  ],
  expectedComponents: ["PageHeader", "StatStrip", "DispatchRiver", "ActionBar"],
} satisfies FoldkitMtxViewFixture

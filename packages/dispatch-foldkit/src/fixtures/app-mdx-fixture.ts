import { compileFoldkitMdx } from "@attune/dispatch-core"
import type { DispatchRoute } from "@attune/dispatch-schema"

import { appliedWorkbenchAtomFixture } from "./workbench-atom-fixture.js"

export type FoldkitAppPageFixture = Readonly<{
  readonly route: DispatchRoute
  readonly sourcePath: string
  readonly source: string
}>

const summary = appliedWorkbenchAtomFixture.runSummary
const snapshot = appliedWorkbenchAtomFixture.snapshot
const hypothesis = snapshot.decisionPacket.hypotheses[0]
const firstAnchor = snapshot.decisionPacket.anchors[0]
const firstEvidence = snapshot.decisionPacket.evidence[0]

export const foldkitAppPageFixtures = [
  {
    route: "dispatch",
    sourcePath: "fixtures/dispatch.mdx",
    source: `---
route: dispatch
title: Attune Dispatch
description: Live operator river from fixture data.
---

<PageHeader eyebrow="Dispatch" title="Attune Dispatch" subtitle="A calm event river for autonomous Attune work, validation, safety gates, and human actions." />
<StatStrip items={["5 items", "1 review", "1 safety", "0 failures"]} />
<FilterTabs />
<DispatchRiver source="fixture-current-rollout" />
<Button label="Workbench" route="workbench" />
<Button label="Discover" route="discover" />
<Button label="Findings" route="findings" />
<ActionBar note="Linear remains the ledger. Dispatch is the readable monitoring surface." actions={["Open review feed", "Open safety feed"]} />

Event river
Codex app-server startup remains human-reviewed
<Badge label="/feeds/dispatch.xml" />
<Badge label="/feeds/safety.xml" />
`,
  },
  {
    route: "workbench",
    sourcePath: "fixtures/workbench.mdx",
    source: `---
route: workbench
title: Workbench
description: Atom-derived fixture workbench.
---

<PageHeader eyebrow="Workbench" title="${hypothesis?.title ?? "Atom-derived fixture"}" subtitle="${hypothesis?.summary ?? "FoldKit reads an atom-derived snapshot."}" />
<StatStrip items={["${summary.appendedEventCount} appended events", "${snapshot.version} snapshot version", "${firstEvidence?.durationMs ?? 0} ms", "${snapshot.reviewQueue.length} reviews"]} />
<OptimizationPacket runId="${snapshot.runId}" status="${summary.status}" action="${summary.bestNextAction}" />
<PatternDossier title="${firstAnchor?.title ?? "Typed WorkbenchSnapshot"}" evidence="${firstEvidence?.summary ?? "Evidence pending"}" />
<ExamplePair positive="Looks like" negative="Does not look like" />
<ActionBar primary="Promote rule" command="promote" secondary="View findings" secondaryRoute="findings" />

Atom-derived snapshot
FoldKit consumes typed WorkbenchSnapshot packets
<SectionLabel label="Deterministic rule" />
<SectionLabel label="Why it matters" />
<SectionLabel label="Revise with intent" />
<Badge label="Copy YAML" />
<Badge label="Promote rule" />
`,
  },
  {
    route: "discover",
    sourcePath: "fixtures/discover.mdx",
    source: `---
route: discover
title: Discover
description: Candidate semantic patterns.
---

<PageHeader eyebrow="Discover" title="12 possible patterns in bulletproof-react" subtitle="Attune scanned the repository and grouped patterns by readiness." />
<PatternList />
<Button label="Open workbench" route="workbench" />

Ready to inspect
Supporting examples
<Badge label="Possible deterministic shape" />
<Badge label="Known risk" />
<Badge label="All patterns" />
`,
  },
  {
    route: "findings",
    sourcePath: "fixtures/findings.mdx",
    source: `---
route: findings
title: Findings
description: Review matched evidence.
---

<PageHeader eyebrow="Findings" title="Review what this candidate matched" subtitle="Confirm true positives and weed out noise before promoting the rule." />
<FuzzerFinding path="src/components/Card.tsx" />
<ActionBar primary="True positive" secondary="False positive" />

Why it matched
Deterministic selector
Review decision
True positive
False positive
`,
  },
  {
    route: "lineage",
    sourcePath: "fixtures/lineage.mdx",
    source: `---
route: lineage
title: Lineage
description: Candidate lineage.
---

<PageHeader eyebrow="Lineage" title="Candidate lineage" subtitle="Track how examples, selectors, and evidence changed before promotion." />
<MetaGrid items={["anchors", "hypotheses", "evidence"]} />
`,
  },
  {
    route: "exports",
    sourcePath: "fixtures/exports.mdx",
    source: `---
route: exports
title: Exports
description: Export promoted rule packet.
---

<PageHeader eyebrow="Exports" title="Export promoted rule packet" subtitle="Ship ast-grep rules, prompts, examples, and review evidence as one artifact." />
<CodePanel language="yaml" />
`,
  },
  {
    route: "settings",
    sourcePath: "fixtures/settings.mdx",
    source: `---
route: settings
title: Settings
description: Workspace settings.
---

<PageHeader eyebrow="Settings" title="Workspace settings" subtitle="Keep scan paths, model routing, and promotion thresholds explicit." />
<SafetyGate />
`,
  },
] satisfies ReadonlyArray<FoldkitAppPageFixture>

export const foldkitAppPages = foldkitAppPageFixtures.map((page) =>
  compileFoldkitMdx(page.source, page.sourcePath),
)

export const pageForRoute = (route: DispatchRoute) =>
  foldkitAppPages.find((page) => page.route === route) ?? foldkitAppPages[0]!

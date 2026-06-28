import { Schema as S } from "effect"

export const ActivitySeverity = S.Literals([
  "info",
  "success",
  "warning",
  "blocked",
  "failure",
  "safety",
])
export type ActivitySeverity = typeof ActivitySeverity.Type

export const ActivityKind = S.Literals([
  "linear",
  "agent",
  "github",
  "validation",
  "safety",
  "review",
  "work",
  "run.analysis",
  "optimization_packet",
  "fuzzer",
])
export type ActivityKind = typeof ActivityKind.Type

export const ActivityRisk = S.Literals([
  "low",
  "medium",
  "high",
  "safety-critical",
])
export type ActivityRisk = typeof ActivityRisk.Type

export const ActivitySourceMode = S.Literals(["fixture", "live"])
export type ActivitySourceMode = typeof ActivitySourceMode.Type

export const ActivityRefKind = S.Literals([
  "linear",
  "github",
  "artifact",
  "spec",
  "automation",
])
export type ActivityRefKind = typeof ActivityRefKind.Type

export const ActivityRef = S.Struct({
  kind: ActivityRefKind,
  label: S.String,
  href: S.String,
})
export type ActivityRef = typeof ActivityRef.Type

export const ActivityItem = S.Struct({
  id: S.String,
  threadId: S.String,
  occurredAt: S.String,
  severity: ActivitySeverity,
  kind: ActivityKind,
  title: S.String,
  summary: S.String,
  body: S.String,
  risk: ActivityRisk,
  requiresHuman: S.Boolean,
  agent: S.String,
  refs: S.Array(ActivityRef),
  tags: S.Array(S.String),
  sourceMode: ActivitySourceMode,
})
export type ActivityItem = typeof ActivityItem.Type

export const WorkThreadStatus = S.Literals([
  "active",
  "blocked",
  "needs-review",
  "failed",
  "completed",
])
export type WorkThreadStatus = typeof WorkThreadStatus.Type

export const WorkThread = S.Struct({
  id: S.String,
  title: S.String,
  status: WorkThreadStatus,
  requiresHuman: S.Boolean,
  lastOccurredAt: S.String,
  items: S.Array(ActivityItem),
})
export type WorkThread = typeof WorkThread.Type

export const AttuneRoute = S.Literals([
  "discover",
  "workbench",
  "findings",
  "lineage",
  "exports",
  "settings",
])
export type AttuneRoute = typeof AttuneRoute.Type

export const ActivityFilter = S.Literals([
  "all",
  "review",
  "safety",
  "failed",
])
export type ActivityFilter = typeof ActivityFilter.Type

export const FoldkitMdxComponentName = S.Literals([
  "PageShell",
  "PageHeader",
  "Section",
  "SectionLabel",
  "StatStrip",
  "CodePanel",
  "CodeView",
  "FilterTabs",
  "SearchInput",
  "IconTile",
  "MetaGrid",
  "List",
  "ListRow",
  "Pagination",
  "Button",
  "Badge",
  "Dot",
  "OptionCard",
  "ActionBar",
  "KeyHint",
  "Sidebar",
  "ActivityList",
  "ThreadSummary",
  "SafetyGate",
  "FuzzerFinding",
  "LinearIssue",
  "AgentRun",
  "OptimizationPacket",
  "ExamplePair",
  "PatternDossier",
  "PatternList",
  "AnchorList",
  "HypothesisList",
  "EvidenceList",
  "ReviewQueue",
  "RouteTrace",
  "RunSummaryPanel",
  "SceneGraph",
  "ExportPacket",
  "SettingsPanel",
])
export type FoldkitMdxComponentName = typeof FoldkitMdxComponentName.Type

export const FoldkitMdxPropValue = S.Union([
  S.String,
  S.Number,
  S.Boolean,
  S.Array(S.String),
])
export type FoldkitMdxPropValue = typeof FoldkitMdxPropValue.Type

export const FoldkitMdxProp = S.Struct({
  name: S.String,
  value: FoldkitMdxPropValue,
})
export type FoldkitMdxProp = typeof FoldkitMdxProp.Type

export const FoldkitMdxText = S.Struct({
  _tag: S.Literal("Text"),
  value: S.String,
})
export type FoldkitMdxText = typeof FoldkitMdxText.Type

export const FoldkitMdxHeading = S.Struct({
  _tag: S.Literal("Heading"),
  level: S.Number,
  text: S.String,
})
export type FoldkitMdxHeading = typeof FoldkitMdxHeading.Type

export const FoldkitMdxParagraph = S.Struct({
  _tag: S.Literal("Paragraph"),
  text: S.String,
})
export type FoldkitMdxParagraph = typeof FoldkitMdxParagraph.Type

export const FoldkitMdxCode = S.Struct({
  _tag: S.Literal("Code"),
  language: S.String,
  code: S.String,
})
export type FoldkitMdxCode = typeof FoldkitMdxCode.Type

export const FoldkitMdxComponent = S.Struct({
  _tag: S.Literal("Component"),
  name: FoldkitMdxComponentName,
  props: S.Array(FoldkitMdxProp),
  textChildren: S.Array(S.String),
})
export type FoldkitMdxComponent = typeof FoldkitMdxComponent.Type

export const FoldkitMdxBlock = S.Union([
  FoldkitMdxHeading,
  FoldkitMdxParagraph,
  FoldkitMdxCode,
  FoldkitMdxComponent,
])
export type FoldkitMdxBlock = typeof FoldkitMdxBlock.Type

export const FoldkitPageFrontmatter = S.Struct({
  route: AttuneRoute,
  title: S.String,
  description: S.String,
})
export type FoldkitPageFrontmatter = typeof FoldkitPageFrontmatter.Type

export const FoldkitDocument = S.Struct({
  id: S.String,
  sourcePath: S.String,
  frontmatter: FoldkitPageFrontmatter,
  blocks: S.Array(FoldkitMdxBlock),
  references: S.Array(ActivityRef),
  componentRegistryVersion: S.String,
})
export type FoldkitDocument = typeof FoldkitDocument.Type

export const FoldkitPage = S.Struct({
  id: S.String,
  route: AttuneRoute,
  title: S.String,
  description: S.String,
  document: FoldkitDocument,
})
export type FoldkitPage = typeof FoldkitPage.Type

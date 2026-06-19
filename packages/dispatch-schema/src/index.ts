import { Schema as S } from "effect"

export const DispatchSeverity = S.Literals([
  "info",
  "success",
  "warning",
  "blocked",
  "failure",
  "safety",
])
export type DispatchSeverity = typeof DispatchSeverity.Type

export const DispatchKind = S.Literals([
  "linear",
  "agent",
  "github",
  "validation",
  "safety",
  "review",
  "work",
  "run.analysis",
  "optimization_packet",
  "daily.digest",
  "fuzzer",
])
export type DispatchKind = typeof DispatchKind.Type

export const DispatchRisk = S.Literals([
  "low",
  "medium",
  "high",
  "safety-critical",
])
export type DispatchRisk = typeof DispatchRisk.Type

export const DispatchSourceMode = S.Literals(["fixture", "live"])
export type DispatchSourceMode = typeof DispatchSourceMode.Type

export const DispatchRefKind = S.Literals([
  "linear",
  "github",
  "artifact",
  "feed",
  "spec",
  "automation",
])
export type DispatchRefKind = typeof DispatchRefKind.Type

export const DispatchRef = S.Struct({
  kind: DispatchRefKind,
  label: S.String,
  href: S.String,
})
export type DispatchRef = typeof DispatchRef.Type

export const DispatchItem = S.Struct({
  id: S.String,
  threadId: S.String,
  occurredAt: S.String,
  severity: DispatchSeverity,
  kind: DispatchKind,
  title: S.String,
  summary: S.String,
  body: S.String,
  risk: DispatchRisk,
  requiresHuman: S.Boolean,
  agent: S.String,
  refs: S.Array(DispatchRef),
  tags: S.Array(S.String),
  sourceMode: DispatchSourceMode,
})
export type DispatchItem = typeof DispatchItem.Type

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
  items: S.Array(DispatchItem),
})
export type WorkThread = typeof WorkThread.Type

export const DispatchDigestWindow = S.Literals(["today", "week"])
export type DispatchDigestWindow = typeof DispatchDigestWindow.Type

export const DispatchDigest = S.Struct({
  id: S.String,
  window: DispatchDigestWindow,
  generatedAt: S.String,
  title: S.String,
  summary: S.String,
  items: S.Array(DispatchItem),
  humanActions: S.Array(DispatchItem),
})
export type DispatchDigest = typeof DispatchDigest.Type

export const DispatchRoute = S.Literals([
  "dispatch",
  "thread",
  "digest-today",
  "digest-week",
  "safety",
  "discover",
  "workbench",
  "findings",
  "lineage",
  "exports",
  "settings",
])
export type DispatchRoute = typeof DispatchRoute.Type

export const DispatchFilter = S.Literals([
  "all",
  "review",
  "safety",
  "failed",
])
export type DispatchFilter = typeof DispatchFilter.Type

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
  "DispatchRiver",
  "ThreadSummary",
  "SafetyGate",
  "FuzzerFinding",
  "LinearIssue",
  "AgentRun",
  "OptimizationPacket",
  "ExamplePair",
  "PatternDossier",
  "PatternList",
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

export const DispatchMdxFrontmatter = S.Struct({
  route: DispatchRoute,
  title: S.String,
  description: S.String,
})
export type DispatchMdxFrontmatter = typeof DispatchMdxFrontmatter.Type

export const DispatchMdxDocument = S.Struct({
  id: S.String,
  sourcePath: S.String,
  frontmatter: DispatchMdxFrontmatter,
  blocks: S.Array(FoldkitMdxBlock),
  references: S.Array(DispatchRef),
  componentRegistryVersion: S.String,
})
export type DispatchMdxDocument = typeof DispatchMdxDocument.Type

export const DispatchMdxPage = S.Struct({
  id: S.String,
  route: DispatchRoute,
  title: S.String,
  description: S.String,
  document: DispatchMdxDocument,
})
export type DispatchMdxPage = typeof DispatchMdxPage.Type

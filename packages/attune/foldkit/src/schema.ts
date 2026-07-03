import {
  RecipeReceiptSchema,
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

export const FoldKitProjectId = "attune-foldkit" as const
export const FoldKitPackageRoot = "packages/attune/foldkit" as const
export const FoldKitSourceRoot = "packages/attune/foldkit/src" as const
export const FoldKitTypecheckTarget = "attune-foldkit:typecheck" as const
export const FoldKitTestTarget = "attune-foldkit:test" as const

export const FoldKitSchemaCatalogRecipeId =
  "attune-foldkit.schema-catalog" as const
export const FoldKitActivityRecipeId =
  "attune-foldkit.activity-projection" as const
export const FoldKitReceiptReportRecipeId =
  "attune-foldkit.recipe-receipts-report" as const
export const FoldKitFixtureTypesRecipeId =
  "attune-foldkit.fixture-type-contracts" as const
export const FoldKitWorkbenchAtomFixtureRecipeId =
  "attune-foldkit.workbench-atom-fixture" as const
export const FoldKitMdxViewFixtureRecipeId =
  "attune-foldkit.mdx-view-fixture" as const
export const FoldKitAppMdxFixtureRecipeId =
  "attune-foldkit.app-mdx-fixture" as const
export const FoldKitAppSiteFixtureRecipeId =
  "attune-foldkit.app-site-fixture" as const
export const FoldKitFixtureRouteRecipeId =
  "attune-foldkit.fixture-route-runtime" as const
export const FoldKitFixtureCommandRecipeId =
  "attune-foldkit.fixture-command-surface" as const
export const FoldKitMessageRecipeId =
  "attune-foldkit.message-contracts" as const
export const FoldKitModelRecipeId = "attune-foldkit.model-contract" as const
export const FoldKitUpdateRecipeId = "attune-foldkit.update-loop" as const
export const FoldKitViewRecipeId = "attune-foldkit.view-renderer" as const
export const FoldKitMainRecipeId = "attune-foldkit.program-init" as const
export const FoldKitEntryRecipeId = "attune-foldkit.browser-entrypoint" as const
export const FoldKitIndexRecipeId = "attune-foldkit.public-api-barrel" as const
export const FoldKitConfigRecipeId =
  "attune-foldkit.config-surface" as const
export const FoldKitAssetRecipeId = "attune-foldkit.asset-surface" as const
export const FoldKitTestSuiteRecipeId =
  "attune-foldkit.test-and-fixture-suite" as const

export const FoldKitSourceAddress = S.Struct({
  packageRoot: S.Literal(FoldKitPackageRoot),
  recipeId: S.String,
})
export type FoldKitSourceAddress = typeof FoldKitSourceAddress.Type

export const FoldKitSourceReport = S.Struct({
  packageRoot: S.Literal(FoldKitPackageRoot),
  recipeId: S.String,
  surface: S.String,
  exportedSymbols: S.Array(S.String),
  usesEffectHandler: S.Boolean,
})
export type FoldKitSourceReport = typeof FoldKitSourceReport.Type

export const foldKitSourceReport = (
  input: Readonly<{
    readonly recipeId: string
    readonly sourcePath: string
    readonly surface: string
    readonly exportedSymbols: ReadonlyArray<string>
  }>,
): FoldKitSourceReport => ({
  packageRoot: FoldKitPackageRoot,
  recipeId: input.recipeId,
  surface: input.surface,
  exportedSymbols: [...input.exportedSymbols],
  usesEffectHandler: true,
})

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

export const RecipeReceiptReportInput = S.Struct({
  receipts: S.Array(RecipeReceiptSchema),
  activity: S.Array(ActivityItem),
  threads: S.Array(WorkThread),
})
export type RecipeReceiptReportInput = typeof RecipeReceiptReportInput.Type

export const FoldKitRecipeReport = S.Struct({
  page: FoldkitPage,
  receipts: S.Array(RecipeReceiptSchema),
  threads: S.Array(WorkThread),
})
export type FoldKitRecipeReport = typeof FoldKitRecipeReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitPackageSourceResource = defineAlchemyResource({
  id: "attune-foldkit.package-source",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    FoldKitSchemaCatalogRecipeId,
    FoldKitActivityRecipeId,
    FoldKitReceiptReportRecipeId,
    FoldKitFixtureTypesRecipeId,
    FoldKitWorkbenchAtomFixtureRecipeId,
    FoldKitMdxViewFixtureRecipeId,
    FoldKitAppMdxFixtureRecipeId,
    FoldKitAppSiteFixtureRecipeId,
    FoldKitFixtureRouteRecipeId,
    FoldKitFixtureCommandRecipeId,
    FoldKitMessageRecipeId,
    FoldKitModelRecipeId,
    FoldKitUpdateRecipeId,
    FoldKitViewRecipeId,
    FoldKitMainRecipeId,
    FoldKitEntryRecipeId,
    FoldKitIndexRecipeId,
    FoldKitConfigRecipeId,
    FoldKitAssetRecipeId,
    FoldKitTestSuiteRecipeId,
  ],
  addressSchema: FoldKitSourceAddress,
  stateSchema: S.Struct({
    packageId: S.Literal(FoldKitProjectId),
    sourceRoot: S.Literal(FoldKitSourceRoot),
  }),
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitSchemaCatalogResource = defineAlchemyResource({
  id: "attune-foldkit.schema-catalog.report",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: FoldKitSchemaCatalogRecipeId,
  producedBy: [FoldKitSchemaCatalogRecipeId],
  consumedBy: [FoldKitActivityRecipeId, FoldKitReceiptReportRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const foldKitSchemaCatalog = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitSchemaCatalogRecipeId,
    sourcePath: "packages/attune/foldkit/src/schema.ts",
    surface: "FoldKit schema catalog and shared recipe expression contracts",
    exportedSymbols: [
      "ActivityItem",
      "WorkThread",
      "FoldkitPage",
      "FoldKitSourceAddress",
      "FoldKitSourceReport",
    ],
  })

export const FoldKitSchemaCatalogHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.schema-catalog.handler",
  recipeId: FoldKitSchemaCatalogRecipeId,
  sourcePath: "packages/attune/foldkit/src/schema.ts",
  exportName: "foldKitSchemaCatalog",
  handler: () => Effect.succeed(foldKitSchemaCatalog()),
  emitsReceipts: ["attune-foldkit.schema-catalog.report"],
})

export const FoldKitSchemaCatalogDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitSchemaCatalogRecipeId,
  toRecipeId: FoldKitActivityRecipeId,
  resource: FoldKitSchemaCatalogResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
})

export const FoldKitSchemaCatalogRecipe = defineSchemaRecipe({
  id: FoldKitSchemaCatalogRecipeId,
  projectId: FoldKitProjectId,
  title: "Expose FoldKit schema and recipe-expression contracts",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTypecheckTarget,
  allowedFiles: ["packages/attune/foldkit/src/schema.ts"],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [FoldKitPackageSourceResource],
    outputResources: [FoldKitSchemaCatalogResource],
  },
  handler: FoldKitSchemaCatalogHandler,
  alchemyDag: [FoldKitSchemaCatalogDagEdge],
})

export const FoldKitSchemaRecipes = [FoldKitSchemaCatalogRecipe] as const

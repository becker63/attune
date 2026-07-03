import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import type {
  DiscoveryEvent,
  ReportEvent,
  WorkbenchSnapshot,
} from "@attune/attuned-discovery"
import type {
  ActivityItem,
  FoldkitPage,
  AttuneRoute,
} from "./schema.js"
import {
  FoldKitFixtureTypesRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  FoldKitWorkbenchAtomFixtureRecipeId,
  foldKitSourceReport,
} from "./schema.js"

export type FoldkitWorkbenchFixtureStep = Readonly<{
  readonly stepId: string
  readonly title: string
  readonly events: ReadonlyArray<DiscoveryEvent>
}>

export type FoldkitWorkbenchFixture = Readonly<{
  readonly fixtureId: string
  readonly runId: string
  readonly title: string
  readonly steps: ReadonlyArray<FoldkitWorkbenchFixtureStep>
  readonly reportEvents: ReadonlyArray<ReportEvent>
}>

export type FoldkitMdxViewFixture = Readonly<{
  readonly fixtureId: string
  readonly sourcePath: string
  readonly page: FoldkitPage
  readonly expectedText: ReadonlyArray<string>
  readonly expectedComponents: ReadonlyArray<string>
}>

export type FoldkitSiteSurfaceFixture = Readonly<{
  readonly surfaceId: string
  readonly route: AttuneRoute
  readonly sourcePath: string
  readonly expectedText: ReadonlyArray<string>
}>

export type FoldkitSiteFixture = Readonly<{
  readonly fixtureId: string
  readonly scenarioId: string
  readonly runId: string
  readonly routes: ReadonlyArray<AttuneRoute>
  readonly items: ReadonlyArray<ActivityItem>
  readonly surfaces: ReadonlyArray<FoldkitSiteSurfaceFixture>
}>

export type AppliedWorkbenchFixture = Readonly<{
  readonly fixture: FoldkitWorkbenchFixture
  readonly appendedEvents: ReadonlyArray<DiscoveryEvent>
  readonly trace: ReadonlyArray<string>
  readonly snapshot: WorkbenchSnapshot
  readonly runSummary: Readonly<{
    readonly runId: string
    readonly status: string
    readonly appendedEventCount: number
    readonly snapshotVersion: number
    readonly bestNextAction: string
  }>
}>

export const FoldKitFixtureTypesSourcePath =
  "packages/attune/foldkit/src/fixture-types.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitFixtureTypesResource = defineAlchemyResource({
  id: "attune-foldkit.fixture-type-contracts.report",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: FoldKitFixtureTypesRecipeId,
  producedBy: [FoldKitFixtureTypesRecipeId],
  consumedBy: [FoldKitWorkbenchAtomFixtureRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const describeFoldKitFixtureTypes = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitFixtureTypesRecipeId,
    sourcePath: FoldKitFixtureTypesSourcePath,
    surface:
      "Typed FoldKit fixture contracts for MDX, site surfaces, and atom snapshots",
    exportedSymbols: [
      "FoldkitWorkbenchFixture",
      "FoldkitMdxViewFixture",
      "FoldkitSiteFixture",
      "AppliedWorkbenchFixture",
    ],
  })

export const FoldKitFixtureTypesHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.fixture-type-contracts.handler",
  recipeId: FoldKitFixtureTypesRecipeId,
  sourcePath: FoldKitFixtureTypesSourcePath,
  exportName: "describeFoldKitFixtureTypes",
  handler: () => Effect.succeed(describeFoldKitFixtureTypes()),
  emitsReceipts: ["attune-foldkit.fixture-type-contracts.report"],
})

export const FoldKitFixtureTypesDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitFixtureTypesRecipeId,
  toRecipeId: FoldKitWorkbenchAtomFixtureRecipeId,
  resource: FoldKitFixtureTypesResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
})

export const FoldKitFixtureTypesRecipe = defineSchemaRecipe({
  id: FoldKitFixtureTypesRecipeId,
  projectId: FoldKitProjectId,
  title: "Expose FoldKit fixture type contracts",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTypecheckTarget,
  allowedFiles: [FoldKitFixtureTypesSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [FoldKitPackageSourceResource],
    outputResources: [FoldKitFixtureTypesResource],
  },
  handler: FoldKitFixtureTypesHandler,
  alchemyDag: [FoldKitFixtureTypesDagEdge],
})

export const FoldKitFixtureTypesRecipes = [FoldKitFixtureTypesRecipe] as const

import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"
import type { Runtime } from "foldkit"

import { StartFixtureRun } from "./fixture-commands.js"
import { FoldKitFixtureCommandResource } from "./fixture-commands.js"
import { initialFixtureRouteModel } from "./fixture-route.js"
import {
  attuneFoldkitSiteFixture,
  sitePageForRoute,
} from "./fixtures/app-site-fixture.js"
import { FoldKitAppSiteFixtureResource } from "./fixtures/app-site-fixture.js"
import type { Message } from "./message.js"
import { Model } from "./model.js"
import { FoldKitModelResource } from "./model.js"
import {
  FoldKitEntryRecipeId,
  FoldKitMainRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "./schema.js"
import { FoldKitViewResource } from "./view.js"

export const init: Runtime.ProgramInit<Model, Message> = () => [
  Model.make({
    route: "workbench",
    filter: "all",
    selectedThreadId: "",
    selectedRunId: attuneFoldkitSiteFixture.runId,
    selectedHypothesisId: "",
    selectedEvidenceId: "",
    pendingCommand: "",
    items: [...attuneFoldkitSiteFixture.items],
    page: sitePageForRoute("workbench"),
    serverSnapshot: null,
    fixtureRoute: initialFixtureRouteModel(),
  }),
  [StartFixtureRun()],
]

export const FoldKitMainSourcePath =
  "packages/attune/foldkit/src/main.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitMainResource = defineAlchemyResource({
  id: "attune-foldkit.program-init.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: FoldKitMainRecipeId,
  producedBy: [FoldKitMainRecipeId],
  consumedBy: [FoldKitEntryRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const describeFoldKitProgramInit = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitMainRecipeId,
    sourcePath: FoldKitMainSourcePath,
    surface: "FoldKit runtime init that seeds model state and fixture commands",
    exportedSymbols: ["init"],
  })

export const FoldKitMainHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.program-init.handler",
  recipeId: FoldKitMainRecipeId,
  sourcePath: FoldKitMainSourcePath,
  exportName: "describeFoldKitProgramInit",
  handler: () => Effect.succeed(describeFoldKitProgramInit()),
  emitsReceipts: ["attune-foldkit.program-init.report"],
})

export const FoldKitMainDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitMainRecipeId,
  toRecipeId: FoldKitEntryRecipeId,
  resource: FoldKitMainResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitMainRecipe = defineProjectionRecipe({
  id: FoldKitMainRecipeId,
  projectId: FoldKitProjectId,
  title: "Initialize FoldKit program state",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [FoldKitMainSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitAppSiteFixtureResource,
      FoldKitFixtureCommandResource,
      FoldKitModelResource,
      FoldKitViewResource,
    ],
    outputResources: [FoldKitMainResource],
  },
  handler: FoldKitMainHandler,
  alchemyDag: [FoldKitMainDagEdge],
})

export const FoldKitMainRecipes = [FoldKitMainRecipe] as const

import {
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import { init } from "./main.js"
import { Message } from "./message.js"
import { Model } from "./model.js"
import {
  FoldKitEntryRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "./schema.js"
import { update } from "./update.js"
import { view } from "./view.js"
import { FoldKitAssetResource } from "./asset-recipes.js"
import { FoldKitMainResource } from "./main.js"

export const runFoldKitBrowserRuntime = (
  container: HTMLElement | null = globalThis.document?.getElementById("root") ?? null,
): Promise<void> =>
  import("foldkit").then(({ Runtime }) => {
    const program = Runtime.makeProgram({
      Model,
      init,
      update,
      view,
      container,
      devTools: {
        Message,
      },
    })

    Runtime.run(program)
  })

const foldKitBrowserRoot = globalThis.document?.getElementById("root") ?? null

if (foldKitBrowserRoot !== null) {
  void runFoldKitBrowserRuntime(foldKitBrowserRoot)
}

export const FoldKitEntrySourcePath =
  "packages/attune/foldkit/src/entry.ts" as const

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitEntryResource = defineAlchemyResource({
  id: "attune-foldkit.browser-entrypoint.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: FoldKitEntryRecipeId,
  producedBy: [FoldKitEntryRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
})

export const describeFoldKitBrowserEntrypoint = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitEntryRecipeId,
    sourcePath: FoldKitEntrySourcePath,
    surface: "Browser entrypoint that mounts the FoldKit runtime program",
    exportedSymbols: ["runFoldKitBrowserRuntime"],
  })

export const FoldKitEntryHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.browser-entrypoint.handler",
  recipeId: FoldKitEntryRecipeId,
  sourcePath: FoldKitEntrySourcePath,
  exportName: "describeFoldKitBrowserEntrypoint",
  handler: () => Effect.succeed(describeFoldKitBrowserEntrypoint()),
  emitsReceipts: ["attune-foldkit.browser-entrypoint.report"],
})

export const FoldKitEntryRecipe = defineInvocationRecipe({
  id: FoldKitEntryRecipeId,
  projectId: FoldKitProjectId,
  title: "Mount the FoldKit browser runtime",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [FoldKitEntrySourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitAssetResource,
      FoldKitMainResource,
    ],
    outputResources: [FoldKitEntryResource],
  },
  handler: FoldKitEntryHandler,
})

export const FoldKitEntryRecipes = [FoldKitEntryRecipe] as const

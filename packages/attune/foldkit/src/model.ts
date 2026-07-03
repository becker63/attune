import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol";
import { Effect, Schema as S } from "effect";

import { WorkbenchSnapshot } from "@attune/attuned-discovery";
import {
  ActivityFilter,
  ActivityItem,
  FoldkitPage,
  AttuneRoute,
  FoldKitModelRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  FoldKitUpdateRecipeId,
  foldKitSourceReport,
} from "./schema.js";

import { FixtureRouteModel } from "./fixture-route.js";
import { FoldKitFixtureRouteResource } from "./fixture-route.js";

export const Model = S.Struct({
  route: AttuneRoute,
  filter: ActivityFilter,
  selectedThreadId: S.String,
  selectedRunId: S.String,
  selectedHypothesisId: S.String,
  selectedEvidenceId: S.String,
  pendingCommand: S.String,
  items: S.Array(ActivityItem),
  page: FoldkitPage,
  serverSnapshot: S.NullOr(WorkbenchSnapshot),
  fixtureRoute: FixtureRouteModel,
});
export type Model = typeof Model.Type;

export const FoldKitModelSourcePath =
  "packages/attune/foldkit/src/model.ts" as const;

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitModelResource = defineAlchemyResource({
  id: "attune-foldkit.model-contract.report",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: FoldKitModelRecipeId,
  producedBy: [FoldKitModelRecipeId],
  consumedBy: [FoldKitUpdateRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
});

export const describeFoldKitModel = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitModelRecipeId,
    sourcePath: FoldKitModelSourcePath,
    surface: "FoldKit model schema that joins route, page, activity, and fixture state",
    exportedSymbols: ["Model"],
  });

export const FoldKitModelHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.model-contract.handler",
  recipeId: FoldKitModelRecipeId,
  sourcePath: FoldKitModelSourcePath,
  exportName: "describeFoldKitModel",
  handler: () => Effect.succeed(describeFoldKitModel()),
  emitsReceipts: ["attune-foldkit.model-contract.report"],
});

export const FoldKitModelDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitModelRecipeId,
  toRecipeId: FoldKitUpdateRecipeId,
  resource: FoldKitModelResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
});

export const FoldKitModelRecipe = defineSchemaRecipe({
  id: FoldKitModelRecipeId,
  projectId: FoldKitProjectId,
  title: "Expose FoldKit application model contract",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTypecheckTarget,
  allowedFiles: [FoldKitModelSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitFixtureRouteResource,
    ],
    outputResources: [FoldKitModelResource],
  },
  handler: FoldKitModelHandler,
  alchemyDag: [FoldKitModelDagEdge],
});

export const FoldKitModelRecipes = [FoldKitModelRecipe] as const;

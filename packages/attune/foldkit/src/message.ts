import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol";
import { Effect, Schema as S } from "effect";
import { m } from "foldkit/message";

import { WorkbenchSnapshot } from "@attune/attuned-discovery";

import { FixtureStep, FixtureStepResult } from "./fixture-route.js";
import { ActivityFilter, AttuneRoute } from "./schema.js";
import {
  FoldKitMessageRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  FoldKitUpdateRecipeId,
  foldKitSourceReport,
} from "./schema.js";

export const SelectedRoute = m("SelectedRoute", { route: AttuneRoute });
export const SelectedFilter = m("SelectedFilter", { filter: ActivityFilter });
export const SelectedThread = m("SelectedThread", { threadId: S.String });
export const SelectedHypothesis = m("SelectedHypothesis", {
  hypothesisId: S.String,
});
export const SelectedEvidence = m("SelectedEvidence", {
  evidenceId: S.String,
});
export const RequestedPromotion = m("RequestedPromotion", {
  hypothesisId: S.String,
});
export const FixtureStartRequested = m("FixtureStartRequested");
export const FixtureStepRequested = m("FixtureStepRequested", {
  step: FixtureStep,
});
export const SelectedFixtureAnchor = m("SelectedFixtureAnchor", {
  anchorId: S.String,
});
export const FixtureStepApplied = m("FixtureStepApplied", {
  result: FixtureStepResult,
});
export const FixtureStepFailed = m("FixtureStepFailed", {
  step: FixtureStep,
  reason: S.String,
});
export const ServerSnapshotChanged = m("ServerSnapshotChanged", {
  snapshot: WorkbenchSnapshot,
});

export const Message = S.Union([
  SelectedRoute,
  SelectedFilter,
  SelectedThread,
  SelectedHypothesis,
  SelectedEvidence,
  RequestedPromotion,
  FixtureStartRequested,
  FixtureStepRequested,
  SelectedFixtureAnchor,
  FixtureStepApplied,
  FixtureStepFailed,
  ServerSnapshotChanged,
]);
export type Message = typeof Message.Type;

export const FoldKitMessageSourcePath =
  "packages/attune/foldkit/src/message.ts" as const;

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitMessageResource = defineAlchemyResource({
  id: "attune-foldkit.message-contracts.report",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: FoldKitMessageRecipeId,
  producedBy: [FoldKitMessageRecipeId],
  consumedBy: [FoldKitUpdateRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
});

export const describeFoldKitMessages = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitMessageRecipeId,
    sourcePath: FoldKitMessageSourcePath,
    surface: "FoldKit message union and fixture route event contracts",
    exportedSymbols: [
      "SelectedRoute",
      "SelectedFilter",
      "FixtureStepApplied",
      "FixtureStepFailed",
      "ServerSnapshotChanged",
      "Message",
    ],
  });

export const FoldKitMessageHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.message-contracts.handler",
  recipeId: FoldKitMessageRecipeId,
  sourcePath: FoldKitMessageSourcePath,
  exportName: "describeFoldKitMessages",
  handler: () => Effect.succeed(describeFoldKitMessages()),
  emitsReceipts: ["attune-foldkit.message-contracts.report"],
});

export const FoldKitMessageDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitMessageRecipeId,
  toRecipeId: FoldKitUpdateRecipeId,
  resource: FoldKitMessageResource,
  kind: "projects",
  modes: ["read", "project", "observe"],
});

export const FoldKitMessageRecipe = defineSchemaRecipe({
  id: FoldKitMessageRecipeId,
  projectId: FoldKitProjectId,
  title: "Expose FoldKit message contracts",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTypecheckTarget,
  allowedFiles: [FoldKitMessageSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [FoldKitPackageSourceResource],
    outputResources: [FoldKitMessageResource],
  },
  handler: FoldKitMessageHandler,
  alchemyDag: [FoldKitMessageDagEdge],
});

export const FoldKitMessageRecipes = [FoldKitMessageRecipe] as const;

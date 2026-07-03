import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol";
import { Effect, Schema as S } from "effect";
import { define as defineCommand, type Command } from "foldkit/command";

import { advanceFixtureStep, startFixtureRoute } from "./fixture-route.js";
import { FoldKitFixtureRouteResource } from "./fixture-route.js";
import {
  FixtureStepApplied,
  FixtureStepFailed,
  type Message,
} from "./message.js";
import { FixtureStep } from "./fixture-route.js";
import {
  FoldKitFixtureCommandRecipeId,
  FoldKitMessageRecipeId,
  FoldKitPackageSourceResource,
  FoldKitProjectId,
  FoldKitSourceAddress,
  FoldKitSourceReport,
  FoldKitTestTarget,
  FoldKitTypecheckTarget,
  foldKitSourceReport,
} from "./schema.js";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const StartFixtureRun = defineCommand(
  "StartFixtureRun",
  FixtureStepApplied,
  FixtureStepFailed,
)(
  Effect.promise(() => startFixtureRoute()).pipe(
    Effect.map((result) => FixtureStepApplied({ result })),
    Effect.catch((error: unknown) =>
      Effect.succeed(
        FixtureStepFailed({ step: "start", reason: errorMessage(error) }),
      ),
    ),
  ),
);

export const AdvanceFixtureStep = defineCommand(
  "AdvanceFixtureStep",
  { step: FixtureStep, selectedAnchorId: S.optional(S.String) },
  FixtureStepApplied,
  FixtureStepFailed,
)(({ step, selectedAnchorId }) =>
  Effect.promise(() =>
    step === "start"
      ? startFixtureRoute()
      : advanceFixtureStep(
          step,
          selectedAnchorId === undefined ? {} : { selectedAnchorId },
        ),
  ).pipe(
    Effect.map((result) => FixtureStepApplied({ result })),
    Effect.catch((error: unknown) =>
      Effect.succeed(FixtureStepFailed({ step, reason: errorMessage(error) })),
    ),
  ),
);

export type FixtureCommand = Command<Message>;

export const FoldKitFixtureCommandSourcePath =
  "packages/attune/foldkit/src/fixture-commands.ts" as const;

// @attune-packet-target generated-runtime-projection eligible
export const FoldKitFixtureCommandResource = defineAlchemyResource({
  id: "attune-foldkit.fixture-command-surface.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: FoldKitFixtureCommandRecipeId,
  producedBy: [FoldKitFixtureCommandRecipeId],
  consumedBy: [FoldKitMessageRecipeId],
  addressSchema: FoldKitSourceAddress,
  stateSchema: FoldKitSourceReport,
  modes: ["read", "project", "observe"],
});

export const describeFoldKitFixtureCommands = (): FoldKitSourceReport =>
  foldKitSourceReport({
    recipeId: FoldKitFixtureCommandRecipeId,
    sourcePath: FoldKitFixtureCommandSourcePath,
    surface: "FoldKit command constructors for fixture route execution",
    exportedSymbols: [
      "StartFixtureRun",
      "AdvanceFixtureStep",
      "FixtureCommand",
    ],
  });

export const FoldKitFixtureCommandHandler = defineRecipeHandler<
  FoldKitSourceAddress,
  FoldKitSourceReport
>({
  id: "attune-foldkit.fixture-command-surface.handler",
  recipeId: FoldKitFixtureCommandRecipeId,
  sourcePath: FoldKitFixtureCommandSourcePath,
  exportName: "describeFoldKitFixtureCommands",
  handler: () => Effect.succeed(describeFoldKitFixtureCommands()),
  emitsReceipts: ["attune-foldkit.fixture-command-surface.report"],
});

export const FoldKitFixtureCommandDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: FoldKitFixtureCommandRecipeId,
  toRecipeId: FoldKitMessageRecipeId,
  resource: FoldKitFixtureCommandResource,
  kind: "invokes",
  modes: ["read", "project", "observe"],
});

export const FoldKitFixtureCommandRecipe = defineInvocationRecipe({
  id: FoldKitFixtureCommandRecipeId,
  projectId: FoldKitProjectId,
  title: "Invoke FoldKit fixture route commands",
  inputSchema: FoldKitSourceAddress,
  outputSchema: FoldKitSourceReport,
  nxTarget: FoldKitTestTarget,
  allowedFiles: [FoldKitFixtureCommandSourcePath],
  validationEvidence: [FoldKitTypecheckTarget, FoldKitTestTarget],
  io: {
    inputSchema: FoldKitSourceAddress,
    outputSchema: FoldKitSourceReport,
    inputResources: [
      FoldKitPackageSourceResource,
      FoldKitFixtureRouteResource,
    ],
    outputResources: [FoldKitFixtureCommandResource],
  },
  handler: FoldKitFixtureCommandHandler,
  alchemyDag: [FoldKitFixtureCommandDagEdge],
});

export const FoldKitFixtureCommandRecipes = [
  FoldKitFixtureCommandRecipe,
] as const;

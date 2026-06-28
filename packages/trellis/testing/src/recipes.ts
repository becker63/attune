import { defineRecipe } from "@attune/framework-protocol"
import { Schema } from "effect"

export const FrameworkTestingHarnessInput = Schema.Struct({
  projectId: Schema.String,
  symbolIds: Schema.Array(Schema.String),
  runId: Schema.String,
})
export type FrameworkTestingHarnessInput = typeof FrameworkTestingHarnessInput.Type

export const FrameworkTestingObservationOutput = Schema.Struct({
  observationCount: Schema.Number,
  coveragePointCount: Schema.Number,
  replayMetadataCount: Schema.Number,
})
export type FrameworkTestingObservationOutput = typeof FrameworkTestingObservationOutput.Type

export const FrameworkTestingWorkerInput = Schema.Struct({
  projectId: Schema.String,
  propertyId: Schema.String,
  seed: Schema.Number,
  shardIndex: Schema.Number,
  shardTotal: Schema.Number,
})
export type FrameworkTestingWorkerInput = typeof FrameworkTestingWorkerInput.Type

export const FrameworkTestingWorkerOutput = Schema.Struct({
  workerId: Schema.String,
  randomSource: Schema.Literals(["worker", "inline"] as const),
  preservesShrinking: Schema.Boolean,
})
export type FrameworkTestingWorkerOutput = typeof FrameworkTestingWorkerOutput.Type

export const FrameworkTestingRecipes = [
  defineRecipe({
    id: "framework-testing.program-harness-observations",
    projectId: "framework-testing",
    title: "Produce program harness observations",
    inputSchema: FrameworkTestingHarnessInput,
    outputSchema: FrameworkTestingObservationOutput,
    nxTarget: "framework-testing:test",
    sourcePath: "packages/trellis/testing/src/recipes.ts",
    allowedFiles: ["packages/trellis/testing/**"],
    validationEvidence: ["framework-testing:test"],
  }),
  defineRecipe({
    id: "framework-testing.coverage-guided-rerun",
    projectId: "framework-testing",
    title: "Plan coverage-guided property reruns",
    inputSchema: FrameworkTestingHarnessInput,
    outputSchema: FrameworkTestingObservationOutput,
    dependencies: [{ recipeId: "framework-testing.program-harness-observations" }],
    nxTarget: "framework-testing:test",
    sourcePath: "packages/trellis/testing/src/recipes.ts",
    allowedFiles: ["packages/trellis/testing/**"],
    validationEvidence: ["framework-testing:test"],
  }),
  defineRecipe({
    id: "framework-testing.worker-replay-metadata",
    projectId: "framework-testing",
    title: "Normalize worker replay metadata",
    inputSchema: FrameworkTestingWorkerInput,
    outputSchema: FrameworkTestingWorkerOutput,
    nxTarget: "framework-testing:test",
    sourcePath: "packages/trellis/testing/src/recipes.ts",
    allowedFiles: ["packages/trellis/testing/**"],
    validationEvidence: ["framework-testing:test"],
  }),
] as const

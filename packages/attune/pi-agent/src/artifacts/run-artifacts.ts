import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"

export interface RunArtifactSet {
  readonly specJson?: string
  readonly planMarkdown?: string
  readonly statusMarkdown?: string
  readonly eventsJsonl?: string
  readonly evidenceMatrixMarkdown?: string
  readonly validationMarkdown?: string
  readonly mutationReportMarkdown?: string
  readonly propertyReportMarkdown?: string
  readonly snapshotReportMarkdown?: string
  readonly finalReviewMarkdown?: string
  readonly summaryMarkdown?: string
}

const runArtifactsRecipeId = "attune-pi-agent.run-artifacts"

export const RunArtifactSetSchema = Schema.Struct({
  specJson: Schema.optional(Schema.String),
  planMarkdown: Schema.optional(Schema.String),
  statusMarkdown: Schema.optional(Schema.String),
  eventsJsonl: Schema.optional(Schema.String),
  evidenceMatrixMarkdown: Schema.optional(Schema.String),
  validationMarkdown: Schema.optional(Schema.String),
  mutationReportMarkdown: Schema.optional(Schema.String),
  propertyReportMarkdown: Schema.optional(Schema.String),
  snapshotReportMarkdown: Schema.optional(Schema.String),
  finalReviewMarkdown: Schema.optional(Schema.String),
  summaryMarkdown: Schema.optional(Schema.String),
})

export const WriteRunArtifactsInput = Schema.Struct({
  runId: Schema.String,
  artifacts: RunArtifactSetSchema,
  root: Schema.optional(Schema.String),
})
export type WriteRunArtifactsInput = typeof WriteRunArtifactsInput.Type

export const WriteRunArtifactsOutput = Schema.Struct({
  directory: Schema.String,
  fileNames: Schema.Array(Schema.String),
})
export type WriteRunArtifactsOutput = typeof WriteRunArtifactsOutput.Type

export interface AttunePiRunArtifactStorageService {
  readonly write: (
    input: WriteRunArtifactsInput,
  ) => Effect.Effect<WriteRunArtifactsOutput>
}

export class AttunePiRunArtifactStorage extends Context.Service<
  AttunePiRunArtifactStorage,
  AttunePiRunArtifactStorageService
>()("attune-pi-agent/RunArtifactStorage") {}

export const runArtifactFileNames = {
  specJson: "spec.json",
  planMarkdown: "plan.md",
  statusMarkdown: "status.md",
  eventsJsonl: "events.jsonl",
  evidenceMatrixMarkdown: "evidence-matrix.md",
  validationMarkdown: "validation.md",
  mutationReportMarkdown: "mutation-report.md",
  propertyReportMarkdown: "property-report.md",
  snapshotReportMarkdown: "snapshot-report.md",
  finalReviewMarkdown: "final-review.md",
  summaryMarkdown: "summary.md",
} as const satisfies Record<keyof RunArtifactSet, string>

export const runArtifactDirectory = (
  runId: string,
  root = ".attune-runs",
): string => {
  assertSafeRunId(runId)
  return path.join(root, runId)
}

export const writeRunArtifacts = async (
  runId: string,
  artifacts: RunArtifactSet,
  root = ".attune-runs",
): Promise<string> => {
  const directory = runArtifactDirectory(runId, root)
  await mkdir(directory, { recursive: true })

  for (const [key, fileName] of Object.entries(runArtifactFileNames) as ReadonlyArray<
    [keyof RunArtifactSet, string]
  >) {
    const content = artifacts[key]
    if (content !== undefined) {
      await writeFile(path.join(directory, fileName), ensureTrailingNewline(content), "utf8")
    }
  }

  return directory
}

export const readRunArtifact = async (
  runId: string,
  key: keyof RunArtifactSet,
  root = ".attune-runs",
): Promise<string> =>
  readFile(path.join(runArtifactDirectory(runId, root), runArtifactFileNames[key]), "utf8")

const compactRunArtifactSet = (
  artifacts: typeof RunArtifactSetSchema.Type,
): RunArtifactSet =>
  Object.fromEntries(
    Object.entries(artifacts).filter((entry): entry is [keyof RunArtifactSet, string] =>
      entry[1] !== undefined
    ),
  ) as RunArtifactSet

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiRunArtifactDirectoryResource = defineAlchemyResource({
  id: "attune-pi-agent.run-artifacts.generated-directory",
  kind: "generated-directory",
  alchemyType: "attune:resource:GeneratedDirectory",
  ownerRecipeId: runArtifactsRecipeId,
  producedBy: [runArtifactsRecipeId],
  addressFields: ["runId", "root"],
  addressSchema: WriteRunArtifactsInput,
  stateSchema: WriteRunArtifactsOutput,
  modes: ["write", "project", "observe"],
  programmaticResourceExport: "AttunePiRunArtifactStorage",
})

export const AttunePiRunArtifactStorageLive = Layer.succeed(AttunePiRunArtifactStorage, {
  write: (input) =>
    Effect.promise(async () => {
      const artifacts = compactRunArtifactSet(input.artifacts)
      const directory = await writeRunArtifacts(
        input.runId,
        artifacts,
        input.root,
      )

      return {
        directory,
        fileNames: Object.entries(runArtifactFileNames)
          .filter(([key]) => artifacts[key as keyof RunArtifactSet] !== undefined)
          .map(([, fileName]) => fileName),
      }
    }),
})

export const AttunePiRunArtifactStorageLayer = defineRecipeLayer({
  id: "attune-pi-agent.run-artifacts.layer",
  sourcePath: "packages/attune/pi-agent/src/artifacts/run-artifacts.ts",
  exportName: "AttunePiRunArtifactStorageLive",
  layer: AttunePiRunArtifactStorageLive,
  provides: [{
    id: "attune-pi-agent.run-artifacts.storage",
    service: AttunePiRunArtifactStorage,
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiRunArtifactsRecipe = defineProjectionRecipe({
  id: "attune-pi-agent.run-artifacts",
  title: "Project Pi run evidence into local run artifact files",
  inputSchema: WriteRunArtifactsInput,
  outputSchema: WriteRunArtifactsOutput,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/artifacts/run-artifacts.ts",
    ".attune-runs/**",
  ],
  validationEvidence: ["attune-pi-agent:test"],
  io: {
    inputSchema: WriteRunArtifactsInput,
    outputSchema: WriteRunArtifactsOutput,
    inputResources: [AttunePiRunArtifactDirectoryResource],
    outputResources: [AttunePiRunArtifactDirectoryResource],
  },
  handler: defineRecipeHandler<
    WriteRunArtifactsInput,
    WriteRunArtifactsOutput,
    never,
    AttunePiRunArtifactStorage
  >({
    id: "attune-pi-agent.run-artifacts.handler",
    recipeId: runArtifactsRecipeId,
    sourcePath: "packages/attune/pi-agent/src/artifacts/run-artifacts.ts",
    exportName: "writeRunArtifacts",
    layer: AttunePiRunArtifactStorageLayer,
    emitsReceipts: ["attune-pi-agent.run-artifacts.projected"],
    handler: (input) =>
      Effect.gen(function* writePiRunArtifacts() {
        const storage = yield* AttunePiRunArtifactStorage
        return yield* storage.write(input)
      }),
  }),
})

export const AttunePiRunArtifactRecipes = [
  AttunePiRunArtifactsRecipe,
] as const

const assertSafeRunId = (runId: string): void => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(runId)) {
    throw new Error(`Unsafe run id: ${runId}`)
  }
}

const ensureTrailingNewline = (value: string): string =>
  value.endsWith("\n") ? value : `${value}\n`

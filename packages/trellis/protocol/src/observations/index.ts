import { Effect, Schema } from "effect"

import type {
  AnyRecipeDefinition,
  FrameworkProtocolRecipeHelpers,
} from "../recipes/index.js"

export type ProgramObservationKind =
  | "schema-decode"
  | "law-observed"
  | "property-run"
  | "atom-movement"
  | "reactivity-key"
  | "type-guidance"
  | "coverage-point"
  | "counterexample"
  | "weak-oracle"

export const ProgramObservationKinds = [
  "schema-decode",
  "law-observed",
  "property-run",
  "atom-movement",
  "reactivity-key",
  "type-guidance",
  "coverage-point",
  "counterexample",
  "weak-oracle",
] as const

export const ProgramObservationKindSchema = Schema.Literals(ProgramObservationKinds)

export interface ProgramObservation {
  readonly eventId: string
  readonly runId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly symbolId?: string
  readonly kind: ProgramObservationKind
  readonly observedAt: string
  readonly payload?: unknown
}

export const ProgramObservationSchema = Schema.Struct({
  eventId: Schema.String,
  runId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.optional(Schema.String),
  kind: ProgramObservationKindSchema,
  observedAt: Schema.String,
  payload: Schema.optional(Schema.Unknown),
})

export interface ProgramObservationRun {
  readonly runId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly tier: "commit" | "push" | "proof-pressure" | "nightly" | "debug"
  readonly status: "running" | "passed" | "failed" | "blocked"
  readonly startedAt: string
  readonly completedAt?: string
}

export const ProgramObservationRunSchema = Schema.Struct({
  runId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  tier: Schema.Literals(["commit", "push", "proof-pressure", "nightly", "debug"] as const),
  status: Schema.Literals(["running", "passed", "failed", "blocked"] as const),
  startedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
})

export interface ProgramArtifactRecord {
  readonly artifactId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly path: string
  readonly generatorId: string
  readonly expectedHash: string
  readonly actualHash?: string
  readonly status: "current" | "stale" | "missing"
}

export const ProgramArtifactRecordSchema = Schema.Struct({
  artifactId: Schema.String,
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  path: Schema.String,
  generatorId: Schema.String,
  expectedHash: Schema.String,
  actualHash: Schema.optional(Schema.String),
  status: Schema.Literals(["current", "stale", "missing"] as const),
})

export const ObservationsRecipeInput = Schema.Struct({
  sourcePath: Schema.String,
})
export type ObservationsRecipeInput = typeof ObservationsRecipeInput.Type

export const ObservationsRecipeOutput = Schema.Struct({
  sourcePath: Schema.String,
  observationKinds: Schema.Array(ProgramObservationKindSchema),
  artifactStatuses: Schema.Array(Schema.Literals(["current", "stale", "missing"] as const)),
})
export type ObservationsRecipeOutput = typeof ObservationsRecipeOutput.Type

export const summarizeObservationProtocol = (
  input: ObservationsRecipeInput,
): ObservationsRecipeOutput => ({
  sourcePath: input.sourcePath,
  observationKinds: [...ProgramObservationKinds],
  artifactStatuses: ["current", "stale", "missing"],
})

export const ObservationsRecipes = (
  helpers: FrameworkProtocolRecipeHelpers,
): readonly AnyRecipeDefinition[] => {
// @attune-packet-target generated-runtime-projection eligible
  const ObservationSource = helpers.defineAlchemyResource({
    id: "framework-protocol.observations.source",
    kind: "file",
    alchemyType: "attune:resource:ProtocolSourceFile",
    addressSchema: ObservationsRecipeInput,
    stateSchema: ObservationsRecipeInput,
    modes: ["read"],
    consumedBy: ["framework-protocol.observations.protocol"],
  })
// @attune-packet-target generated-runtime-projection eligible
  const ObservationStream = helpers.defineAlchemyResource({
    id: "framework-protocol.observations.stream",
    kind: "observation-stream",
    alchemyType: "attune:resource:ProgramObservationStream",
    addressSchema: ObservationsRecipeInput,
    stateSchema: ObservationsRecipeOutput,
    modes: ["observe", "read"],
    ownerRecipeId: "framework-protocol.observations.protocol",
    producedBy: ["framework-protocol.observations.protocol"],
  })
  const ObservationHandler = helpers.defineRecipeHandler<ObservationsRecipeInput, ObservationsRecipeOutput, never, never>({
    id: "framework-protocol.observations.protocol.handler",
    recipeId: "framework-protocol.observations.protocol",
    sourcePath: "packages/trellis/protocol/src/observations/index.ts",
    exportName: "summarizeObservationProtocol",
    emitsReceipts: ["observation.protocol-summary"],
    handler: (input) => Effect.succeed(summarizeObservationProtocol(input)),
  })
  const ObservationDagEdge = helpers.defineAlchemyRecipeDagEdge({
    fromRecipeId: "framework-protocol.observations.source",
    toRecipeId: "framework-protocol.observations.protocol",
    resource: "framework-protocol.observations.stream",
    kind: "observes",
    modes: ["read", "observe"],
  })

  return [
    helpers.defineObservationRecipe({
      id: "framework-protocol.observations.protocol",
      projectId: "framework-protocol",
      title: "Define program observation, run, and artifact receipt contracts",
      inputSchema: ObservationsRecipeInput,
      outputSchema: ObservationsRecipeOutput,
      io: {
        inputSchema: ObservationsRecipeInput,
        outputSchema: ObservationsRecipeOutput,
        inputResources: [ObservationSource],
        outputResources: [ObservationStream],
      },
      handler: ObservationHandler,
      alchemyDag: [ObservationDagEdge],
      nxTarget: "framework-protocol:test",
      observedFiles: ["packages/trellis/protocol/src/observations/index.ts"],
      allowedFiles: ["packages/trellis/protocol/src/observations/index.ts"],
      validationEvidence: ["framework-protocol:test", "framework-protocol:typecheck"],
    }),
  ] as const
}

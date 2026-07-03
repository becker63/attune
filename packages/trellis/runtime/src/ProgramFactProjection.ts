import { Context, Effect, Layer, Schema } from "effect"
import {
  deriveDiagnosticRequirements,
  diagnosticFromRepairFinding,
  requiredObservationKindsFor,
  ProgramArtifactRecordSchema,
  ProgramDiagnosticRequirementSchema,
  ProgramObservationRunSchema,
  ProgramObservationSchema,
  ProgramRepairFindingSchema,
  ProgramSchemaDescriptorSchema,
  defineAlchemyResource,
  defineDiagnosticRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type ProgramArtifactRecord,
  type ProgramRepairFinding,
  type ProgramSchemaDescriptor,
  type ProgramDiagnostic,
  type ProgramObservation,
  type ProgramObservationRun,
  type ProgramDiagnosticRequirement,
} from "@attune/framework-protocol"
import {
  CoverageObservationFeedbackSchema,
  DiagnosticWaiverStateSchema,
  ReplayObservationMetadataSchema,
  type CoverageObservationFeedback,
  type DiagnosticWaiverState,
  type ReplayObservationMetadata,
} from "./ProgramFactStore.js"

export const programFactProjectionRecipeId = "framework-runtime.program-fact-projection" as const
const programDiagnosticsRecipeId = "framework-runtime.program-diagnostics" as const
const programFactProjectionSourcePath =
  "packages/trellis/runtime/src/ProgramFactProjection.ts" as const

export const ProgramFactProjectionRecipeInput = Schema.Struct({
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  sourcePath: Schema.String,
  schemaDescriptors: Schema.optional(Schema.Array(ProgramSchemaDescriptorSchema)),
  diagnosticRequirements: Schema.optional(Schema.Array(ProgramDiagnosticRequirementSchema)),
  observationRuns: Schema.optional(Schema.Array(ProgramObservationRunSchema)),
  observations: Schema.optional(Schema.Array(ProgramObservationSchema)),
  artifacts: Schema.optional(Schema.Array(ProgramArtifactRecordSchema)),
  replayMetadata: Schema.optional(Schema.Array(ReplayObservationMetadataSchema)),
  waiverState: Schema.optional(Schema.Array(DiagnosticWaiverStateSchema)),
  coverageFeedback: Schema.optional(Schema.Array(CoverageObservationFeedbackSchema)),
  repairFindings: Schema.optional(Schema.Array(ProgramRepairFindingSchema)),
})

export const ProgramFactProjectionRecipeOutput = Schema.Array(ProgramRepairFindingSchema)

// @attune-packet-target generated-runtime-projection eligible
export const ProgramFactProjectionInputResource = defineAlchemyResource({
  id: "framework-runtime.program-fact-projection.input",
  kind: "observation-stream",
  alchemyType: "attune:resource:ProgramFactRuntimeSnapshot",
  ownerRecipeId: programFactProjectionRecipeId,
  consumedBy: [programFactProjectionRecipeId],
  addressFields: ["schemaDescriptorId", "projectId", "sourcePath"],
  addressSchema: ProgramFactProjectionRecipeInput as never,
  stateSchema: ProgramFactProjectionRecipeInput as never,
  modes: ["read", "observe"],
  programmaticResourceExport: "ProgramFactProjectionLive",
  programmaticBridgeSourcePath: programFactProjectionSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const ProgramFactProjectionFindingsResource = defineAlchemyResource({
  id: "framework-runtime.program-fact-projection.findings",
  kind: "report",
  alchemyType: "attune:resource:ProgramRepairFindings",
  ownerRecipeId: programFactProjectionRecipeId,
  producedBy: [programFactProjectionRecipeId],
  consumedBy: [programFactProjectionRecipeId, programDiagnosticsRecipeId],
  addressFields: ["schemaDescriptorId", "projectId", "sourcePath"],
  addressSchema: ProgramFactProjectionRecipeInput as never,
  stateSchema: ProgramFactProjectionRecipeOutput as never,
  modes: ["read", "observe", "project"],
  programmaticResourceExport: "ProgramFactProjectionLive",
  programmaticBridgeSourcePath: programFactProjectionSourcePath,
})

export interface ProgramFactRuntimeSnapshot {
  readonly schemaDescriptors: readonly ProgramSchemaDescriptor[]
  readonly diagnosticRequirements: readonly ProgramDiagnosticRequirement[]
  readonly observationRuns: readonly ProgramObservationRun[]
  readonly observations: readonly ProgramObservation[]
  readonly artifacts: readonly ProgramArtifactRecord[]
  readonly replayMetadata: readonly ReplayObservationMetadata[]
  readonly waiverState: readonly DiagnosticWaiverState[]
  readonly coverageFeedback: readonly CoverageObservationFeedback[]
  readonly repairFindings?: readonly ProgramRepairFinding[]
}

export interface ProgramFactProjectionInput extends Partial<ProgramFactRuntimeSnapshot> {
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly sourcePath: string
}

export interface ProgramFactProjectionApi {
  readonly deriveDiagnosticRequirements: (
    descriptor: ProgramSchemaDescriptor,
  ) => readonly ProgramDiagnosticRequirement[]
  readonly computeRepairFindings: (input: ProgramFactProjectionInput) => readonly ProgramRepairFinding[]
}

const observationKey = (event: ProgramObservation): string =>
  `${event.projectId}:${event.symbolId ?? "package"}:${event.kind}`

const coverageObservationKeys = (
  feedback: CoverageObservationFeedback,
): readonly string[] => {
  if (feedback.status !== "hit" && feedback.status !== "retained") return []

  const symbolId = feedback.symbolId ?? "package"
  const keyFor = (kind: string): string =>
    `${feedback.projectId}:${symbolId}:${kind}`

  switch (feedback.kind) {
    case "atom-graph":
      return [keyFor("atom-movement"), keyFor("reactivity-key")]
    case "law":
      return [keyFor("law-observed")]
    case "type-partition":
    case "schema-branch":
    case "transition":
    case "error-path":
    case "implementation":
      return [keyFor("coverage-point")]
    case "filter":
      return []
  }
}

export const projectionSnapshot = (
  input: ProgramFactProjectionInput,
): ProgramFactRuntimeSnapshot => {
  const schemaDescriptors = input.schemaDescriptors ?? []
  return {
    schemaDescriptors,
    diagnosticRequirements: input.diagnosticRequirements ?? schemaDescriptors.flatMap(deriveDiagnosticRequirements),
    observationRuns: input.observationRuns ?? [],
    observations: input.observations ?? [],
    artifacts: input.artifacts ?? [],
    replayMetadata: input.replayMetadata ?? [],
    waiverState: input.waiverState ?? [],
    coverageFeedback: input.coverageFeedback ?? [],
    ...(input.repairFindings === undefined ? {} : { repairFindings: input.repairFindings }),
  }
}

export const computeProgramFactFindings = (
  input: ProgramFactProjectionInput,
): readonly ProgramRepairFinding[] => {
  const snapshot = projectionSnapshot(input)
  const observed = new Set([
    ...snapshot.observations.map(observationKey),
    ...snapshot.coverageFeedback.flatMap(coverageObservationKeys),
  ])
  const missingObservations = snapshot.diagnosticRequirements.filter((diagnosticRequirement) => {
    if (isWaivedDiagnosticRequirement(diagnosticRequirement, snapshot.waiverState)) {
      return false
    }
    const expectedKinds = requiredObservationKindsFor(diagnosticRequirement.kind)
    if (expectedKinds.length === 0) {
      return false
    }
    const symbolId = diagnosticRequirement.symbolId ?? "package"
    return !expectedKinds.some((kind) =>
      observed.has(`${diagnosticRequirement.projectId}:${symbolId}:${kind}`),
    )
  })

  const staleArtifacts = snapshot.artifacts.filter((artifact) => !isCurrentArtifact(artifact))
  const waiverIssues = snapshot.waiverState.filter((waiver) => waiver.status !== "active")
  const replayFailures = snapshot.replayMetadata.filter((metadata) => metadata.status === "failed")
  const highRejectionFilters = snapshot.coverageFeedback.filter(isHighRejectionFilter)
  const weakOracleFindings = snapshot.coverageFeedback.filter(isWeakOracleCoverage)

  return [
    ...missingObservations.map((diagnosticRequirement) => {
      const finding: ProgramRepairFinding = {
        findingId: `finding:${diagnosticRequirement.diagnosticRequirementId}`,
        schemaDescriptorId: input.schemaDescriptorId,
        projectId: input.projectId,
        sourcePath: input.sourcePath,
        kind: "missing-observation",
        diagnosticRequirementId: diagnosticRequirement.diagnosticRequirementId,
        explanation: diagnosticRequirement.reason,
        repairActions: [{
          id: repairActionIdForDiagnosticRequirement(diagnosticRequirement),
          title: repairActionTitleForDiagnosticRequirement(diagnosticRequirement),
          kind: "nx-generator",
          target: `${input.projectId}:repair`,
          options: {
            projectId: input.projectId,
            repairKind: repairActionKindForDiagnosticRequirement(diagnosticRequirement),
            internalGenerator: repairActionTargetForDiagnosticRequirement(diagnosticRequirement),
            ...(diagnosticRequirement.symbolId === undefined ? {} : { symbolId: diagnosticRequirement.symbolId }),
          },
        }],
      }

      return {
        ...finding,
        ...(diagnosticRequirement.symbolId === undefined ? {} : { symbolId: diagnosticRequirement.symbolId }),
      }
    }),
    ...staleArtifacts.map((artifact) => ({
      findingId: `finding:${artifact.artifactId}`,
      schemaDescriptorId: input.schemaDescriptorId,
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      kind: "stale-generated-source" as const,
      explanation: generatedArtifactExplanation(artifact),
      repairActions: [{
        id: "refresh-artifact-materialization",
        title: "Refresh artifact materialization",
        kind: "nx-generator" as const,
        target: `${input.projectId}:repair`,
        options: {
          projectId: input.projectId,
          repairKind: "artifact-materialize",
          internalGenerator: "@attune/framework-nx:artifact-materialize",
        },
      }],
    })),
    ...waiverIssues.map((waiver) => ({
      findingId: `finding:${waiver.waiverId}`,
      schemaDescriptorId: input.schemaDescriptorId,
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      kind: "waiver-issue" as const,
      ...(waiver.symbolId === undefined ? {} : { symbolId: waiver.symbolId }),
      ...(waiver.targetDiagnosticRequirementId === undefined ? {} : { diagnosticRequirementId: waiver.targetDiagnosticRequirementId }),
      explanation: `Waiver ${waiver.waiverId} is ${waiver.status}: ${waiver.reason}`,
      repairActions: [{
        id: "refresh-waiver-state",
        title: "Review package waiver state",
        kind: "nx-check" as const,
        target: "workspace:check",
        options: {
          projectId: input.projectId,
          waiverId: waiver.waiverId,
        },
      }],
    })),
    ...replayFailures.map((metadata) => ({
      findingId: `finding:${metadata.replayId}`,
      schemaDescriptorId: input.schemaDescriptorId,
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      kind: "blocked-observation" as const,
      ...(metadata.symbolId === undefined ? {} : { symbolId: metadata.symbolId }),
      explanation: replayFailureExplanation(metadata),
      repairActions: [{
        id: "replay-counterexample",
        title: "Replay counterexample",
        kind: "nx-check" as const,
        target: "workspace:check",
        options: {
          projectId: input.projectId,
          internalTarget: "workspace:property-observations",
          replayId: metadata.replayId,
          runId: metadata.runId,
          seed: metadata.seed,
          ...(metadata.shrinkPath === undefined ? {} : { shrinkPath: metadata.shrinkPath }),
        },
      }],
    })),
    ...highRejectionFilters.map((feedback) => ({
      findingId: `finding:${feedback.coverageId}`,
      schemaDescriptorId: input.schemaDescriptorId,
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      kind: "high-rejection-filter" as const,
      ...(feedback.symbolId === undefined ? {} : { symbolId: feedback.symbolId }),
      explanation: highRejectionExplanation(feedback),
      repairActions: [{
        id: "repair-generator-filter",
        title: "Review generated filter or schema partition",
        kind: "nx-check" as const,
        target: "workspace:check",
        options: {
          projectId: input.projectId,
          internalTarget: "workspace:coverage-conformance",
          coverageId: feedback.coverageId,
          coveragePoint: feedback.coveragePoint,
        },
      }],
    })),
    ...weakOracleFindings.map((feedback) => ({
      findingId: `finding:${feedback.coverageId}`,
      schemaDescriptorId: input.schemaDescriptorId,
      projectId: input.projectId,
      sourcePath: input.sourcePath,
      kind: "weak-oracle" as const,
      ...(feedback.symbolId === undefined ? {} : { symbolId: feedback.symbolId }),
      explanation: `Implementation coverage reached ${feedback.coveragePoint}, but expected semantic graph movement or law observation was not recorded.`,
      repairActions: [{
        id: "strengthen-property-oracle",
        title: "Strengthen property oracle",
        kind: "nx-check" as const,
        target: "workspace:check",
        options: {
          projectId: input.projectId,
          internalTarget: "workspace:property-observations",
          coverageId: feedback.coverageId,
          coveragePoint: feedback.coveragePoint,
        },
      }],
    })),
  ]
}

const isWaivedDiagnosticRequirement = (
  diagnosticRequirement: ProgramDiagnosticRequirement,
  waivers: readonly DiagnosticWaiverState[],
): boolean =>
  waivers.some((waiver) =>
    waiver.status === "active" &&
    waiver.projectId === diagnosticRequirement.projectId &&
    (
      waiver.targetDiagnosticRequirementId === diagnosticRequirement.diagnosticRequirementId ||
      (
        waiver.targetDiagnosticRequirementId === undefined &&
        waiver.symbolId === diagnosticRequirement.symbolId &&
        waiver.category === diagnosticRequirement.kind
      )
    )
  )

const isCurrentArtifact = (artifact: ProgramArtifactRecord): boolean =>
  artifact.status === "current" &&
  (artifact.actualHash === undefined || artifact.actualHash === artifact.expectedHash)

const generatedArtifactExplanation = (
  artifact: ProgramArtifactRecord,
): string => {
  if (artifact.status === "missing") {
    return `Generated artifact ${artifact.path} is missing.`
  }
  if (artifact.actualHash !== undefined && artifact.actualHash !== artifact.expectedHash) {
    return `Generated artifact ${artifact.path} hash is stale: expected ${artifact.expectedHash}, got ${artifact.actualHash}.`
  }
  return `Generated artifact ${artifact.path} is ${artifact.status}.`
}

const replayFailureExplanation = (
  metadata: ReplayObservationMetadata,
): string => [
  `Replay metadata ${metadata.replayId} records a failed property case with seed ${metadata.seed}.`,
  ...(metadata.shrinkPath === undefined ? [] : [`shrink path ${metadata.shrinkPath}.`]),
  ...(metadata.generatedValueSummary === undefined ? [] : [`value ${metadata.generatedValueSummary}.`]),
].join(" ")

const isHighRejectionFilter = (
  feedback: CoverageObservationFeedback,
): boolean =>
  feedback.kind === "filter" &&
  (
    feedback.status === "filtered" ||
    (feedback.acceptanceRate !== undefined && feedback.acceptanceRate < 0.2) ||
    (feedback.rejectionCount !== undefined && feedback.rejectionCount >= 100)
  )

const highRejectionExplanation = (
  feedback: CoverageObservationFeedback,
): string => [
  `Generated filter ${feedback.filterId ?? feedback.coveragePoint} is distorting coverage search.`,
  ...(feedback.acceptanceRate === undefined ? [] : [`acceptance rate ${feedback.acceptanceRate}.`]),
  ...(feedback.rejectionCount === undefined ? [] : [`rejections ${feedback.rejectionCount}.`]),
].join(" ")

const isWeakOraclePayload = (payload: unknown): boolean =>
  typeof payload === "object" &&
  payload !== null &&
  "expectedGraphMovement" in payload &&
  (payload as { readonly expectedGraphMovement?: unknown }).expectedGraphMovement === true &&
  "observedGraphMovement" in payload &&
  (payload as { readonly observedGraphMovement?: unknown }).observedGraphMovement === false

const isWeakOracleCoverage = (
  feedback: CoverageObservationFeedback,
): boolean =>
  feedback.kind === "implementation" &&
  feedback.status === "hit" &&
  isWeakOraclePayload(feedback.payload)

const repairActionIdForDiagnosticRequirement = (diagnosticRequirement: ProgramDiagnosticRequirement): string => {
  switch (diagnosticRequirement.kind) {
    case "type-guidance":
      return "refresh-schema-observations"
    case "view-movement":
      return "generate-atom-projection-edge"
    default:
      return "generate-observation-scaffold"
  }
}

const repairActionTitleForDiagnosticRequirement = (diagnosticRequirement: ProgramDiagnosticRequirement): string => {
  switch (diagnosticRequirement.kind) {
    case "type-guidance":
      return "Refresh schema observations"
    case "view-movement":
      return "Generate missing atom projection edge"
    default:
      return "Generate observation scaffold"
  }
}

const repairActionKindForDiagnosticRequirement = (diagnosticRequirement: ProgramDiagnosticRequirement): string => {
  switch (diagnosticRequirement.kind) {
    case "type-guidance":
      return "schema-observations"
    case "view-movement":
      return "atom-projection-edge"
    default:
      return "observation-scaffold"
  }
}

const repairActionTargetForDiagnosticRequirement = (diagnosticRequirement: ProgramDiagnosticRequirement): string => {
  switch (diagnosticRequirement.kind) {
    case "type-guidance":
      return "@attune/framework-nx:schema-observations"
    case "view-movement":
      return "@attune/framework-nx:atom-projection-edge"
    default:
      return "@attune/framework-nx:observation-scaffold"
  }
}

export const diagnosticsForProgramFacts = (
  input: ProgramFactProjectionInput,
): readonly ProgramDiagnostic[] =>
  computeProgramFactFindings(input).map(diagnosticFromRepairFinding)

export const ProgramFactProjectionLiveValue: ProgramFactProjectionApi = {
  deriveDiagnosticRequirements: deriveDiagnosticRequirements,
  computeRepairFindings: computeProgramFactFindings,
}

export class ProgramFactProjection extends Context.Service<
  ProgramFactProjection,
  ProgramFactProjectionApi
>()("@attune/framework-runtime/ProgramFactProjection") {}

export const ProgramFactProjectionLive: Layer.Layer<ProgramFactProjection> = Layer.succeed(
  ProgramFactProjection,
  ProgramFactProjectionLiveValue,
)

export const ProgramFactProjectionLayer = defineRecipeLayer({
  id: "framework-runtime.program-fact-projection.layer",
  sourcePath: programFactProjectionSourcePath,
  exportName: "ProgramFactProjectionLive",
  layer: ProgramFactProjectionLive as never,
  provides: [{
    id: "framework-runtime.program-fact-projection.service",
    service: ProgramFactProjection as never,
  }],
})

export const projectProgramFactRepairFindings = (
  input: ProgramFactProjectionInput,
): Effect.Effect<readonly ProgramRepairFinding[], never, ProgramFactProjection> =>
  Effect.gen(function* projectProgramFactRepairFindingsBody() {
    const projection = yield* ProgramFactProjection
    return projection.computeRepairFindings(input)
  })

export const ProgramFactProjectionHandler = defineRecipeHandler<
  ProgramFactProjectionInput,
  readonly ProgramRepairFinding[],
  never,
  ProgramFactProjection
>({
  id: "framework-runtime.program-fact-projection.handler",
  recipeId: programFactProjectionRecipeId,
  sourcePath: programFactProjectionSourcePath,
  exportName: "projectProgramFactRepairFindings",
  layer: ProgramFactProjectionLayer,
  emitsReceipts: ["framework-runtime.program-fact-projection.findings.projected"],
  handler: (input) => projectProgramFactRepairFindings(input) as never,
})

export const ProgramFactProjectionRecipe = defineDiagnosticRecipe<
  ProgramFactProjectionInput,
  readonly ProgramRepairFinding[],
  never,
  ProgramFactProjection
>({
  id: programFactProjectionRecipeId,
  projectId: "framework-runtime",
  title: "Project program fact snapshots into repair findings",
  inputSchema: ProgramFactProjectionRecipeInput as never,
  outputSchema: ProgramFactProjectionRecipeOutput as never,
  observedFiles: [programFactProjectionSourcePath],
  allowedFiles: [programFactProjectionSourcePath],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  io: {
    inputSchema: ProgramFactProjectionRecipeInput as never,
    outputSchema: ProgramFactProjectionRecipeOutput as never,
    inputResources: [ProgramFactProjectionInputResource],
    outputResources: [ProgramFactProjectionFindingsResource],
  },
  handler: ProgramFactProjectionHandler,
  alchemyDag: [{
    fromRecipeId: programFactProjectionRecipeId,
    toRecipeId: programDiagnosticsRecipeId,
    resource: ProgramFactProjectionFindingsResource,
    kind: "diagnoses",
    modes: ["read", "observe", "project"],
  }],
})

export const ProgramFactProjectionRecipes = [
  ProgramFactProjectionRecipe,
] as const

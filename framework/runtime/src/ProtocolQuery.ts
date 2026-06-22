import { Context, Effect, Layer } from "effect"
import {
  requiredEvidenceKindsFor,
  type AttuneProtocolDelta,
  type AttuneProtocolDiagnostic,
} from "@attune/framework-protocol"

import {
  computeProtocolDeltas,
  diagnosticsForProtocol,
  type ProtocolProjectionApi,
  type ProtocolProjectionInput,
  type ProtocolRuntimeSnapshot,
} from "./ProtocolProjection.js"
import { ProtocolProjection } from "./ProtocolProjection.js"
import {
  decodeProtocolStoreSnapshot,
  mapStoreError,
  ProtocolQueryError,
  ProtocolStore,
  type ProtocolStoreApi,
} from "./ProtocolStore.js"

export interface PackageProtocolSummary {
  readonly packageId: string
  readonly protocolId: string
  readonly descriptorHash?: string
  readonly operationCount: number
  readonly obligationCount: number
  readonly evidenceCount: number
  readonly staleGeneratedArtifactCount: number
}

export interface ObligationExplanation {
  readonly obligationId: string
  readonly packageId: string
  readonly operationId?: string
  readonly reason: string
  readonly expectedEvidenceKinds: readonly string[]
}

export interface RepairPlan {
  readonly deltaId: string
  readonly packageId: string
  readonly actions: readonly AttuneProtocolDelta["repairActions"][number][]
}

export interface ProtocolQueryApi {
  readonly getPackageSummary: (
    packageId: string,
  ) => Effect.Effect<PackageProtocolSummary, ProtocolQueryError>
  readonly listDeltas: (
    packageId: string,
  ) => Effect.Effect<readonly AttuneProtocolDelta[], ProtocolQueryError>
  readonly getDiagnosticsForFile: (
    sourcePath: string,
  ) => Effect.Effect<readonly AttuneProtocolDiagnostic[], ProtocolQueryError>
  readonly explainObligation: (
    obligationId: string,
  ) => Effect.Effect<ObligationExplanation | undefined, ProtocolQueryError>
  readonly getRepairPlan: (
    deltaId: string,
  ) => Effect.Effect<RepairPlan | undefined, ProtocolQueryError>
}

export const getPackageSummary = (
  input: ProtocolProjectionInput,
): PackageProtocolSummary => {
  const snapshot = {
    descriptors: input.descriptors ?? [],
    obligations: input.obligations ?? [],
    evidence: input.evidence ?? [],
    generatedArtifacts: input.generatedArtifacts ?? [],
  }
  const descriptor = snapshot.descriptors.find((candidate) => candidate.packageId === input.packageId)
  return {
    packageId: input.packageId,
    protocolId: input.protocolId,
    ...(descriptor === undefined ? {} : { descriptorHash: descriptor.descriptorHash }),
    operationCount: descriptor?.operations.length ?? 0,
    obligationCount: snapshot.obligations.filter((obligation) => obligation.packageId === input.packageId).length,
    evidenceCount: snapshot.evidence.filter((event) => event.packageId === input.packageId).length,
    staleGeneratedArtifactCount: snapshot.generatedArtifacts.filter((artifact) =>
      artifact.packageId === input.packageId && artifact.status !== "current"
    ).length,
  }
}

export const explainObligation = (
  input: ProtocolProjectionInput,
  targetObligationId: string,
): ObligationExplanation | undefined => {
  const obligation = (input.obligations ?? []).find(
    (candidate) => candidate.obligationId === targetObligationId,
  )
  if (obligation === undefined) return undefined

  return {
    obligationId: obligation.obligationId,
    packageId: obligation.packageId,
    ...(obligation.operationId === undefined ? {} : { operationId: obligation.operationId }),
    reason: obligation.reason,
    expectedEvidenceKinds: requiredEvidenceKindsFor(obligation.kind),
  }
}

export const getRepairPlan = (
  input: ProtocolProjectionInput,
  deltaId: string,
): RepairPlan | undefined => {
  const delta = computeProtocolDeltas(input).find((candidate) => candidate.deltaId === deltaId)
  if (delta === undefined) return undefined

  return {
    deltaId: delta.deltaId,
    packageId: delta.packageId,
    actions: delta.repairActions,
  }
}

export const makeProtocolQuery = (
  store: ProtocolStoreApi,
  projection: ProtocolProjectionApi,
): ProtocolQueryApi => {
  const typedSnapshot = (): Effect.Effect<ProtocolRuntimeSnapshot, ProtocolQueryError> =>
    store.snapshot().pipe(
      Effect.catch((error) => Effect.fail(mapStoreError(error, "snapshot"))),
      Effect.flatMap(decodeProtocolStoreSnapshot),
    )

  const packageInput = (
    snapshot: ProtocolRuntimeSnapshot,
    packageId: string,
  ): ProtocolProjectionInput => {
    const descriptor = snapshot.descriptors.find((candidate) => candidate.packageId === packageId)
    const input: ProtocolProjectionInput = {
      protocolId: descriptor?.protocolId ?? `attune/package/${packageId}`,
      packageId,
      sourcePath: descriptor?.sourcePath ?? "unknown",
      descriptors: snapshot.descriptors.filter((candidate) => candidate.packageId === packageId),
      obligations: snapshot.obligations.filter((obligation) => obligation.packageId === packageId),
      evidence: snapshot.evidence.filter((event) => event.packageId === packageId),
      generatedArtifacts: snapshot.generatedArtifacts.filter((artifact) => artifact.packageId === packageId),
    }

    const deltas = snapshot.deltas?.filter((delta) => delta.packageId === packageId)
    return deltas === undefined ? input : { ...input, deltas }
  }

  const deltasForPackage = (
    snapshot: ProtocolRuntimeSnapshot,
    packageId: string,
  ): readonly AttuneProtocolDelta[] => {
    const storedDeltas = snapshot.deltas?.filter((delta) => delta.packageId === packageId) ?? []
    if (storedDeltas.length > 0) return storedDeltas

    return projection.computeDeltas(packageInput(snapshot, packageId))
  }

  return {
    getPackageSummary: (packageId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => getPackageSummary(packageInput(snapshot, packageId))),
      ),
    listDeltas: (packageId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => deltasForPackage(snapshot, packageId)),
      ),
    getDiagnosticsForFile: (sourcePath) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) =>
          snapshot.descriptors
            .filter((descriptor) => descriptor.sourcePath === sourcePath)
            .flatMap((descriptor) =>
              diagnosticsForProtocol({
                ...packageInput(snapshot, descriptor.packageId),
                sourcePath,
              })
            )
        ),
      ),
    explainObligation: (obligationId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => {
          const obligation = snapshot.obligations.find((candidate) => candidate.obligationId === obligationId)
          if (obligation === undefined) return undefined

          return {
            obligationId: obligation.obligationId,
            packageId: obligation.packageId,
            ...(obligation.operationId === undefined ? {} : { operationId: obligation.operationId }),
            reason: obligation.reason,
            expectedEvidenceKinds: requiredEvidenceKindsFor(obligation.kind),
          }
        }),
      ),
    getRepairPlan: (deltaId) =>
      typedSnapshot().pipe(
        Effect.map((snapshot) => {
          const delta = snapshot.deltas?.find((candidate) => candidate.deltaId === deltaId) ??
            snapshot.descriptors
              .flatMap((descriptor) => deltasForPackage(snapshot, descriptor.packageId))
              .find((candidate) => candidate.deltaId === deltaId)
          if (delta === undefined) return undefined

          return {
            deltaId: delta.deltaId,
            packageId: delta.packageId,
            actions: delta.repairActions,
          }
        }),
      ),
  }
}

export class ProtocolQuery extends Context.Service<
  ProtocolQuery,
  ProtocolQueryApi
>()("@attune/framework-runtime/ProtocolQuery") {}

export const ProtocolQueryLive: Layer.Layer<
  ProtocolQuery,
  never,
  ProtocolStore | ProtocolProjection
> = Layer.effect(
  ProtocolQuery,
  Effect.gen(function* makeProtocolQueryLayer() {
    const store = yield* ProtocolStore
    const projection = yield* ProtocolProjection
    return makeProtocolQuery(store, projection)
  }),
)

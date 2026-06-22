import { Context, Data, Effect, Layer, Schema } from "effect"
import {
  AttuneGeneratedArtifactRecordSchema,
  AttuneProtocolDeltaSchema,
  AttuneProtocolDescriptorSchema,
  AttuneProtocolDiagnosticSchema,
  AttuneProtocolEvidenceEventSchema,
  AttuneProtocolObligationSchema,
  type AttuneGeneratedArtifactRecord,
  type AttuneProtocolDelta,
  type AttuneProtocolDescriptor,
  type AttuneProtocolDiagnostic,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolObligation,
} from "@attune/framework-protocol"

import type { ProtocolRuntimeSnapshot } from "./ProtocolProjection.js"

export interface ProtocolStoreSnapshot {
  readonly descriptors: readonly unknown[]
  readonly obligations: readonly unknown[]
  readonly evidence: readonly unknown[]
  readonly generatedArtifacts: readonly unknown[]
  readonly deltas: readonly unknown[]
}

export interface ProtocolStoreApi {
  readonly putDescriptor: (
    descriptor: AttuneProtocolDescriptor,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly putObligations: (
    batch: readonly AttuneProtocolObligation[],
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly recordGeneratedArtifact: (
    record: AttuneGeneratedArtifactRecord,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly recordEvidence: (
    event: AttuneProtocolEvidenceEvent,
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly putDeltas: (
    deltas: readonly AttuneProtocolDelta[],
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly replaceDeltas: (
    packageId: string,
    deltas: readonly AttuneProtocolDelta[],
  ) => Effect.Effect<void, ProtocolStoreError>
  readonly snapshot: () => Effect.Effect<ProtocolStoreSnapshot, ProtocolStoreError>
}

export class ProtocolStoreError extends Data.TaggedError("ProtocolStoreError")<{
  readonly message: string
  readonly operation: string
  readonly cause?: unknown
}> {}

export class ProtocolQueryError extends Data.TaggedError("ProtocolQueryError")<{
  readonly message: string
  readonly operation: string
  readonly packageId?: string
  readonly sourcePath?: string
  readonly payload?: unknown
  readonly cause?: unknown
}> {}

export class ProtocolStore extends Context.Service<
  ProtocolStore,
  ProtocolStoreApi
>()("@attune/framework-runtime/ProtocolStore") {
  static fromApi(api: ProtocolStoreApi): Layer.Layer<ProtocolStore> {
    return Layer.succeed(ProtocolStore, api)
  }
}

export const makeInMemoryProtocolStore = (
  initial: Partial<ProtocolStoreSnapshot> = {},
): ProtocolStoreApi => {
  let descriptors: readonly unknown[] = initial.descriptors ?? []
  let obligations: readonly unknown[] = initial.obligations ?? []
  let evidence: readonly unknown[] = initial.evidence ?? []
  let generatedArtifacts: readonly unknown[] = initial.generatedArtifacts ?? []
  let deltas: readonly unknown[] = initial.deltas ?? []

  return {
    putDescriptor: (descriptor) =>
      Effect.sync(() => {
        descriptors = [
          ...descriptors.filter((candidate) =>
            !isProtocolDescriptorFor(candidate, descriptor.protocolId)
          ),
          descriptor,
        ]
      }),
    putObligations: (batch) =>
      Effect.sync(() => {
        const packageIds = new Set(batch.map((obligation) => obligation.packageId))
        obligations = [
          ...obligations.filter((candidate) =>
            !isProtocolObligationFor(candidate, packageIds)
          ),
          ...batch,
        ]
      }),
    recordGeneratedArtifact: (record) =>
      Effect.sync(() => {
        generatedArtifacts = [
          ...generatedArtifacts.filter((candidate) =>
            !isGeneratedArtifactFor(candidate, record.artifactId)
          ),
          record,
        ]
      }),
    recordEvidence: (event) =>
      Effect.sync(() => {
        evidence = [...evidence, event]
      }),
    putDeltas: (nextDeltas) =>
      Effect.sync(() => {
        const packageIds = new Set(nextDeltas.map((delta) => delta.packageId))
        deltas = [
          ...deltas.filter((candidate) => !isProtocolDeltaFor(candidate, packageIds)),
          ...nextDeltas,
        ]
      }),
    replaceDeltas: (packageId, nextDeltas) =>
      Effect.sync(() => {
        deltas = [
          ...deltas.filter((candidate) => !isProtocolDeltaFor(candidate, new Set([packageId]))),
          ...nextDeltas,
        ]
      }),
    snapshot: () =>
      Effect.succeed({
        descriptors,
        obligations,
        evidence,
        generatedArtifacts,
        deltas,
      }),
  }
}

export const InMemoryProtocolStoreLive = (
  initial?: Partial<ProtocolStoreSnapshot>,
): Layer.Layer<ProtocolStore> => ProtocolStore.fromApi(makeInMemoryProtocolStore(initial))

const isProtocolDescriptorFor = (value: unknown, protocolId: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "protocolId" in value &&
  value.protocolId === protocolId

const isProtocolObligationFor = (
  value: unknown,
  packageIds: ReadonlySet<string>,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  "packageId" in value &&
  typeof value.packageId === "string" &&
  packageIds.has(value.packageId)

const isGeneratedArtifactFor = (value: unknown, artifactId: string): boolean =>
  typeof value === "object" &&
  value !== null &&
  "artifactId" in value &&
  value.artifactId === artifactId

const isProtocolDeltaFor = (
  value: unknown,
  packageIds: ReadonlySet<string>,
): boolean =>
  typeof value === "object" &&
  value !== null &&
  "packageId" in value &&
  typeof value.packageId === "string" &&
  packageIds.has(value.packageId)

const decodeBatch = <A>(
  schema: unknown,
  values: readonly unknown[],
  operation: string,
): Effect.Effect<readonly A[], ProtocolQueryError> =>
  Effect.try({
    try: () =>
      values.map((value) =>
        Schema.decodeUnknownSync(schema as never)(value) as A
      ),
    catch: (cause) =>
      new ProtocolQueryError({
        message: `Protocol store returned an invalid ${operation} payload.`,
        operation,
        payload: values,
        cause,
      }),
  })

export const decodeProtocolStoreSnapshot = (
  snapshot: ProtocolStoreSnapshot,
): Effect.Effect<ProtocolRuntimeSnapshot, ProtocolQueryError> =>
  Effect.gen(function* decodeProtocolStoreSnapshotEffect() {
    const descriptors = yield* decodeBatch<AttuneProtocolDescriptor>(
      AttuneProtocolDescriptorSchema,
      snapshot.descriptors,
      "descriptors",
    )
    const obligations = yield* decodeBatch<AttuneProtocolObligation>(
      AttuneProtocolObligationSchema,
      snapshot.obligations,
      "obligations",
    )
    const evidence = yield* decodeBatch<AttuneProtocolEvidenceEvent>(
      AttuneProtocolEvidenceEventSchema,
      snapshot.evidence,
      "evidence",
    )
    const generatedArtifacts = yield* decodeBatch<AttuneGeneratedArtifactRecord>(
      AttuneGeneratedArtifactRecordSchema,
      snapshot.generatedArtifacts,
      "generatedArtifacts",
    )
    const deltas = yield* decodeBatch<AttuneProtocolDelta>(
      AttuneProtocolDeltaSchema,
      snapshot.deltas,
      "deltas",
    )

    return { descriptors, obligations, evidence, generatedArtifacts, deltas }
  })

export const diagnosticFromQueryError = (
  error: ProtocolQueryError,
  fallback: {
    readonly packageId: string
    readonly sourcePath: string
    readonly protocolId?: string
  },
): AttuneProtocolDiagnostic => {
  const diagnostic = {
    code: "attune/protocol/invalid-store-payload",
    severity: "error",
    packageId: error.packageId ?? fallback.packageId,
    sourcePath: error.sourcePath ?? fallback.sourcePath,
    explanation: error.message,
    suggestedActions: [{
      id: "refresh-protocol-materialization",
      title: "Refresh protocol materialization",
      kind: "nx-check",
      target: "workspace:package-contracts-check",
      options: { packageId: error.packageId ?? fallback.packageId },
    }],
    relatedEvidence: [],
    ...(fallback.protocolId === undefined ? {} : { protocolId: fallback.protocolId }),
  } satisfies AttuneProtocolDiagnostic

  return Schema.decodeUnknownSync(AttuneProtocolDiagnosticSchema)(diagnostic) as AttuneProtocolDiagnostic
}

export const mapStoreError = (
  error: ProtocolStoreError,
  operation: string,
): ProtocolQueryError =>
  new ProtocolQueryError({
    message: error.message,
    operation,
    cause: error,
  })

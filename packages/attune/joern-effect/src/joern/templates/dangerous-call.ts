import { Effect, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineObservationRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"

const joernObservationPacketRecipeId = "joern-effect.observation-packet"
const dangerousCallTemplateSourcePath = "packages/attune/joern-effect/src/joern/templates/dangerous-call.ts"

export const DangerousCallBindings = Schema.Struct({})
export type DangerousCallBindings = Schema.Schema.Type<typeof DangerousCallBindings>

export const DangerousCallEvidence = Schema.Struct({
  templateId: Schema.Literal("dangerous-call"),
  rows: Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
})
export type DangerousCallEvidence = Schema.Schema.Type<typeof DangerousCallEvidence>

export const JoernObservationPacket = Schema.Struct({
  templateId: Schema.String,
  evidence: DangerousCallEvidence,
  receiptId: Schema.optional(Schema.String),
})
export type JoernObservationPacket = typeof JoernObservationPacket.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernObservationPacketResource = defineAlchemyResource({
  id: "joern-effect.observation-packet.resource",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: joernObservationPacketRecipeId,
  producedBy: [joernObservationPacketRecipeId],
  consumedBy: [joernObservationPacketRecipeId],
  addressFields: ["templateId"],
  addressSchema: DangerousCallEvidence as never,
  stateSchema: JoernObservationPacket as never,
  modes: ["observe", "project", "check"],
})

export const dangerousCallTemplate = {
  id: "dangerous-call",
  bindings: DangerousCallBindings,
  evidence: DangerousCallEvidence,
  render: (_bindings: DangerousCallBindings): string => [
    "// TODO: render known Joern CPGQL for dangerous-call",
    "cpg",
  ].join("\n"),
} as const

export const normalizeDangerousCallObservation = (
  evidence: DangerousCallEvidence,
): Effect.Effect<JoernObservationPacket> =>
  Effect.succeed({
    templateId: evidence.templateId,
    evidence,
  })

export const JoernObservationPacketHandler = defineRecipeHandler<
  DangerousCallEvidence,
  JoernObservationPacket
>({
  id: "joern-effect.observation-packet.handler",
  recipeId: joernObservationPacketRecipeId,
  sourcePath: dangerousCallTemplateSourcePath,
  exportName: "normalizeDangerousCallObservation",
  emitsReceipts: ["joern.observation-packet.normalized"],
  handler: (input) => normalizeDangerousCallObservation(input) as never,
})

export const JoernObservationPacketRecipe = defineObservationRecipe({
  id: joernObservationPacketRecipeId,
  projectId: "joern-effect",
  title: "Normalize Joern proof output into observation packet",
  inputSchema: DangerousCallEvidence as never,
  outputSchema: JoernObservationPacket as never,
  dependencies: [{ recipeId: "joern-effect.proof-template" }],
  nxTarget: "joern-effect:test",
  allowedFiles: [dangerousCallTemplateSourcePath],
  validationEvidence: ["joern-effect:test"],
  io: {
    inputSchema: DangerousCallEvidence as never,
    outputSchema: JoernObservationPacket as never,
    inputResources: [JoernObservationPacketResource],
    outputResources: [JoernObservationPacketResource],
  },
  handler: JoernObservationPacketHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernObservationPacketRecipeId,
      toRecipeId: "joern-effect.proof-template",
      resource: JoernObservationPacketResource,
      kind: "observes",
      modes: ["observe", "project", "check"],
    }),
  ],
})

export const DangerousCallObservationRecipes = [JoernObservationPacketRecipe] as const

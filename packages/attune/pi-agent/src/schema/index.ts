import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { EvidenceFixture, EvidenceMatrix } from "./evidence.js"
import { ImplementationSpec } from "./implementation-spec.js"
import { MutationObligation } from "./mutation.js"
import { PermissionCheck, PermissionProfile } from "./permission-profile.js"
import { AttuneSpecConversationTurn } from "./pi-conversation.js"
import { PropertyObligation } from "./property-test.js"
import { RunEvent } from "./run-event.js"
import { SpecInterviewInput, SpecInterviewResult } from "./spec-interview.js"
import { PlannedTask } from "./task-plan.js"
import { TestObligation } from "./test-obligation.js"

export * from "./evidence.js"
export * from "./implementation-spec.js"
export * from "./mutation.js"
export * from "./permission-profile.js"
export * from "./pi-conversation.js"
export * from "./property-test.js"
export * from "./run-event.js"
export * from "./spec-interview.js"
export * from "./task-plan.js"
export * from "./test-obligation.js"

const schemaCatalogRecipeId = "attune-pi-agent.schema-catalog"
const implementationSpecRecipeId = "attune-pi-agent.implementation-spec"

export const PiSchemaCatalogInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/pi-agent"),
})

export const PiSchemaCatalogOutput = Schema.Struct({
  schemaNames: Schema.Array(Schema.String),
  commandSchemas: Schema.Array(Schema.String),
  evidenceSchemas: Schema.Array(Schema.String),
})
export type PiSchemaCatalogOutput = typeof PiSchemaCatalogOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiSchemaCatalogResource = defineAlchemyResource({
  id: "attune-pi-agent.schema-catalog.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: schemaCatalogRecipeId,
  consumedBy: [schemaCatalogRecipeId, implementationSpecRecipeId],
  producedBy: [schemaCatalogRecipeId],
  addressSchema: PiSchemaCatalogInput,
  stateSchema: PiSchemaCatalogOutput,
  modes: ["read", "project"],
})

export const piSchemaCatalog = (): PiSchemaCatalogOutput => ({
  schemaNames: [
    "EvidenceFixture",
    "EvidenceMatrix",
    "ImplementationSpec",
    "MutationObligation",
    "PermissionCheck",
    "PermissionProfile",
    "PropertyObligation",
    "RunEvent",
    "PlannedTask",
    "TestObligation",
  ],
  commandSchemas: [
    "SpecInterviewInput",
    "SpecInterviewResult",
    "AttuneSpecConversationTurn",
  ],
  evidenceSchemas: [
    "EvidenceFixture",
    "EvidenceMatrix",
    "PermissionCheck",
  ],
})

export const AttunePiSchemaCatalogRecipe = defineSchemaRecipe({
  id: "attune-pi-agent.schema-catalog",
  title: "Expose Pi schema catalog as typed recipe input metadata",
  inputSchema: PiSchemaCatalogInput,
  outputSchema: PiSchemaCatalogOutput,
  nxTarget: "attune-pi-agent:typecheck",
  allowedFiles: ["packages/attune/pi-agent/src/schema/**"],
  validationEvidence: ["attune-pi-agent:typecheck", "attune-pi-agent:test"],
  io: {
    inputSchema: PiSchemaCatalogInput,
    outputSchema: PiSchemaCatalogOutput,
    inputResources: [AttunePiSchemaCatalogResource],
    outputResources: [AttunePiSchemaCatalogResource],
  },
  handler: defineRecipeHandler<typeof PiSchemaCatalogInput.Type, PiSchemaCatalogOutput>({
    id: "attune-pi-agent.schema-catalog.handler",
    recipeId: schemaCatalogRecipeId,
    sourcePath: "packages/attune/pi-agent/src/schema/index.ts",
    exportName: "piSchemaCatalog",
    emitsReceipts: ["attune-pi-agent.schema-catalog.projected"],
    handler: () => Effect.succeed(piSchemaCatalog()),
  }),
  alchemyDag: [{
    fromRecipeId: schemaCatalogRecipeId,
    toRecipeId: implementationSpecRecipeId,
    resource: AttunePiSchemaCatalogResource,
    kind: "projects",
    modes: ["read", "project"],
  }],
})

export const AttunePiSchemaRecipes = [
  AttunePiSchemaCatalogRecipe,
] as const

export const AttunePiSchemaContractEvidence = {
  EvidenceFixture,
  EvidenceMatrix,
  ImplementationSpec,
  MutationObligation,
  PermissionCheck,
  PermissionProfile,
  PropertyObligation,
  RunEvent,
  SpecInterviewInput,
  SpecInterviewResult,
  AttuneSpecConversationTurn,
  PlannedTask,
  TestObligation,
} as const

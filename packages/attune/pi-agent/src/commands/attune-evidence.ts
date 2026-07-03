import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  AttunePiEvidenceFixtureResource,
  AttunePiEvidenceMatrixReportResource,
  buildEvidenceMatrix,
  renderEvidenceMatrixMarkdown,
} from "../artifacts/evidence-matrix.js"
import { EvidenceFixture, EvidenceMatrix } from "../schema/evidence.js"

export interface AttuneEvidenceResult {
  readonly matrix: EvidenceMatrix
  readonly markdown: string
}

const evidenceCommandRecipeId = "attune-pi-agent.attune-evidence-command"

export const AttuneEvidenceResultSchema = Schema.Struct({
  matrix: EvidenceMatrix,
  markdown: Schema.String,
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiEvidenceCommandResource = defineAlchemyResource({
  id: "attune-pi-agent.attune-evidence-command.workflow-target",
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: evidenceCommandRecipeId,
  consumedBy: [evidenceCommandRecipeId],
  producedBy: [evidenceCommandRecipeId],
  addressSchema: EvidenceFixture,
  stateSchema: AttuneEvidenceResultSchema,
  modes: ["invoke", "project", "observe"],
  programmaticResourceExport: "AttunePiEvidenceCommandResource",
})

export const attuneEvidence = (fixture: unknown): AttuneEvidenceResult => {
  const matrix = buildEvidenceMatrix(fixture)

  return {
    matrix,
    markdown: renderEvidenceMatrixMarkdown(matrix),
  }
}

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiEvidenceCommandRecipe = defineProjectionRecipe({
  id: "attune-pi-agent.attune-evidence-command",
  title: "Expose evidence matrix rendering as a Pi command projection",
  inputSchema: EvidenceFixture,
  outputSchema: AttuneEvidenceResultSchema,
  nxTarget: "attune-pi-agent:test",
  entrypoints: ["packages/attune/pi-agent/src/commands/index.ts"],
  allowedFiles: [
    "packages/attune/pi-agent/src/commands/attune-evidence.ts",
    "packages/attune/pi-agent/src/artifacts/evidence-matrix.ts",
    "packages/attune/pi-agent/src/schema/evidence.ts",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:typecheck"],
  io: {
    inputSchema: EvidenceFixture,
    outputSchema: AttuneEvidenceResultSchema,
    inputResources: [
      AttunePiEvidenceFixtureResource,
      AttunePiEvidenceCommandResource,
    ],
    outputResources: [
      AttunePiEvidenceMatrixReportResource,
      AttunePiEvidenceCommandResource,
    ],
  },
  handler: defineRecipeHandler<typeof EvidenceFixture.Type, typeof AttuneEvidenceResultSchema.Type>({
    id: "attune-pi-agent.attune-evidence-command.handler",
    recipeId: evidenceCommandRecipeId,
    sourcePath: "packages/attune/pi-agent/src/commands/attune-evidence.ts",
    exportName: "attuneEvidence",
    emitsReceipts: ["attune-pi-agent.evidence-command.projected"],
    handler: (fixture) => Effect.succeed(attuneEvidence(fixture)),
  }),
})

export const AttunePiEvidenceCommandRecipes = [
  AttunePiEvidenceCommandRecipe,
] as const

import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  EvidenceFixture,
  EvidenceMatrix,
  type EvidenceMatrixEntry,
  type EvidenceResult,
} from "../schema/evidence.js"

const evidenceMatrixRecipeId = "attune-pi-agent.evidence-matrix"
const runArtifactsRecipeId = "attune-pi-agent.run-artifacts"

export const AttunePiEvidenceMatrixProjection = Schema.Struct({
  matrix: EvidenceMatrix,
  markdown: Schema.String,
})
export type AttunePiEvidenceMatrixProjection =
  typeof AttunePiEvidenceMatrixProjection.Type

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiEvidenceFixtureResource = defineAlchemyResource({
  id: "attune-pi-agent.evidence-fixture.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: evidenceMatrixRecipeId,
  consumedBy: [evidenceMatrixRecipeId],
  addressSchema: Schema.Struct({
    fixtureId: Schema.String,
  }),
  stateSchema: EvidenceFixture,
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiEvidenceMatrixReportResource = defineAlchemyResource({
  id: "attune-pi-agent.evidence-matrix.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: evidenceMatrixRecipeId,
  producedBy: [evidenceMatrixRecipeId],
  consumedBy: [runArtifactsRecipeId],
  addressSchema: Schema.Struct({
    runId: Schema.String,
    specId: Schema.String,
  }),
  stateSchema: AttunePiEvidenceMatrixProjection,
  modes: ["project", "observe"],
})

const resultRank: Record<EvidenceResult, number> = {
  supported: 0,
  "known-constraint": 1,
  weak: 2,
  "needs-human-review": 3,
  failed: 4,
}

export const strongestEvidenceResult = (
  results: ReadonlyArray<EvidenceResult>,
): EvidenceResult => {
  let strongest: EvidenceResult = "supported"

  for (const result of results) {
    if (resultRank[result] > resultRank[strongest]) {
      strongest = result
    }
  }

  return strongest
}

export const buildEvidenceMatrix = (fixture: unknown): EvidenceMatrix => {
  const decoded = Schema.decodeUnknownSync(EvidenceFixture)(fixture)

  return Schema.decodeUnknownSync(EvidenceMatrix)({
    runId: decoded.runId,
    specId: decoded.specId,
    generatedAt: decoded.generatedAt,
    entries: [...decoded.claims].sort(compareEvidenceEntries),
  })
}

export const renderEvidenceMatrixMarkdown = (matrix: EvidenceMatrix): string => {
  const entries = [...matrix.entries].sort(compareEvidenceEntries)
  const rows = entries.map((entry) =>
    [
      entry.claim,
      entry.evidence.map((evidence) => `- ${evidence}`).join("<br>"),
      entry.verifier,
      entry.result,
      entry.residualRisk,
      entry.humanReviewRequired ? "yes" : "no",
    ].map(escapeMarkdownTableCell).join(" | "),
  )
  const overall = strongestEvidenceResult(entries.map((entry) => entry.result))

  return [
    "# Evidence Matrix",
    "",
    `Run: \`${matrix.runId}\``,
    `Spec: \`${matrix.specId}\``,
    `Generated: \`${matrix.generatedAt}\``,
    `Overall result: \`${overall}\``,
    "",
    "| Claim | Evidence | Verifier | Result | Residual Risk | Human Review |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
    "",
  ].join("\n")
}

export const compareEvidenceEntries = (
  left: EvidenceMatrixEntry,
  right: EvidenceMatrixEntry,
): number =>
  left.claim.localeCompare(right.claim, "en", { sensitivity: "base" })

const escapeMarkdownTableCell = (value: string): string =>
  value.replaceAll("|", "\\|").replace(/\r?\n/gu, "<br>")

export const projectEvidenceMatrix = (
  fixture: typeof EvidenceFixture.Type,
): AttunePiEvidenceMatrixProjection => {
  const matrix = buildEvidenceMatrix(fixture)

  return {
    matrix,
    markdown: renderEvidenceMatrixMarkdown(matrix),
  }
}

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiEvidenceMatrixRecipe = defineProjectionRecipe({
  id: "attune-pi-agent.evidence-matrix",
  title: "Render evidence matrices from Pi claims",
  inputSchema: EvidenceFixture,
  outputSchema: AttunePiEvidenceMatrixProjection,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/artifacts/index.ts",
    "packages/attune/pi-agent/src/artifacts/evidence-matrix.ts",
    "packages/attune/pi-agent/src/schema/evidence.ts",
  ],
  validationEvidence: ["attune-pi-agent:test"],
  io: {
    inputSchema: EvidenceFixture,
    outputSchema: AttunePiEvidenceMatrixProjection,
    inputResources: [AttunePiEvidenceFixtureResource],
    outputResources: [AttunePiEvidenceMatrixReportResource],
  },
  handler: defineRecipeHandler<typeof EvidenceFixture.Type, AttunePiEvidenceMatrixProjection>({
    id: "attune-pi-agent.evidence-matrix.handler",
    recipeId: evidenceMatrixRecipeId,
    sourcePath: "packages/attune/pi-agent/src/artifacts/evidence-matrix.ts",
    exportName: "projectEvidenceMatrix",
    emitsReceipts: ["attune-pi-agent.evidence-matrix.projected"],
    handler: (fixture) => Effect.succeed(projectEvidenceMatrix(fixture)),
  }),
  alchemyDag: [{
    fromRecipeId: evidenceMatrixRecipeId,
    toRecipeId: runArtifactsRecipeId,
    resource: AttunePiEvidenceMatrixReportResource,
    kind: "projects",
    modes: ["project", "write"],
  }],
})

export const AttunePiEvidenceMatrixRecipes = [
  AttunePiEvidenceMatrixRecipe,
] as const

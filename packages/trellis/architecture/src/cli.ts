#!/usr/bin/env node
import { fileURLToPath } from "node:url"

import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { formatDiagnostics, scanWorkspace } from "./index.js"

export const ArchitectureCliRecipeId = "attune-architecture.cli" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitectureCliSourcePath = "packages/trellis/architecture/src/cli.ts" as const

const ArchitectureCliInput = Schema.Struct({
  workspaceRoot: Schema.String,
})
type ArchitectureCliInput = typeof ArchitectureCliInput.Type

const ArchitectureCliOutput = Schema.Struct({
  invocationModel: Schema.Literal("RecipeInvocation"),
  diagnostics: Schema.Array(Schema.Struct({
    ruleId: Schema.String,
    severity: Schema.Literals(["error", "warning"] as const),
    filePath: Schema.String,
    message: Schema.String,
  })),
  exitCode: Schema.Number,
})
type ArchitectureCliOutput = typeof ArchitectureCliOutput.Type

export const runArchitecturePolicyCli = (
  workspaceRoot = process.cwd(),
): ArchitectureCliOutput => {
  const result = scanWorkspace({ workspaceRoot })
  if (result.diagnostics.length > 0) console.log(formatDiagnostics(result.diagnostics))
  return {
    invocationModel: "RecipeInvocation",
    diagnostics: [...result.diagnostics],
    exitCode: result.exitCode,
  }
}

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureCliWorkspaceResource = defineAlchemyResource({
  id: "attune-architecture.cli.workspace",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [ArchitectureCliRecipeId],
  addressSchema: ArchitectureCliInput,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/trellis/architecture/src"),
  }),
  modes: ["read", "invoke"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureCliReportResource = defineAlchemyResource({
  id: "attune-architecture.cli.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitectureCliRecipeId,
  producedBy: [ArchitectureCliRecipeId],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitectureCliInput,
  stateSchema: ArchitectureCliOutput,
  modes: ["project", "observe"],
})

export const ArchitectureCliHandler = defineRecipeHandler<ArchitectureCliInput, ArchitectureCliOutput>({
  id: "attune-architecture.cli.handler",
  recipeId: ArchitectureCliRecipeId,
  sourcePath: ArchitectureCliSourcePath,
  exportName: "runArchitecturePolicyCli",
  handler: (input) => Effect.sync(() => runArchitecturePolicyCli(input.workspaceRoot)),
  emitsReceipts: ["attune-architecture.cli.reported"],
})

export const ArchitectureCliDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitectureCliRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitectureCliReportResource,
  kind: "invokes",
  modes: ["invoke", "observe"],
})

export const ArchitectureCliRecipe = defineInvocationRecipe({
  id: ArchitectureCliRecipeId,
  projectId: "attune-architecture",
  title: "Expose architecture policy CLI entrypoint through recipe invocation",
  inputSchema: ArchitectureCliInput,
  outputSchema: ArchitectureCliOutput,
  nxTarget: "attune-architecture:test",
  entrypoints: [ArchitectureCliSourcePath],
  allowedFiles: [ArchitectureCliSourcePath],
  validationEvidence: ["attune-architecture:test"],
  io: {
    inputSchema: ArchitectureCliInput,
    outputSchema: ArchitectureCliOutput,
    inputResources: [ArchitectureCliWorkspaceResource],
    outputResources: [ArchitectureCliReportResource],
  },
  handler: ArchitectureCliHandler,
  alchemyDag: [ArchitectureCliDagEdge],
})

export const ArchitectureCliRecipes = [ArchitectureCliRecipe] as const

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runArchitecturePolicyCli(process.argv[2] ?? process.cwd())
  process.exitCode = result.exitCode
}

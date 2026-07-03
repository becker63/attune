import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"

export function runTypeScriptExtendedDiagnostics(): void {
  const packageTsconfigs = execFileSync("git", ["ls-files", "packages/*/tsconfig.json"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .sort()

  let failed = false

  for (const tsconfig of packageTsconfigs) {
    const packageDir = tsconfig.slice(0, -"/tsconfig.json".length)
    console.log(`\n== ${packageDir} ==`)
    try {
      const output = execFileSync(
        "pnpm",
        ["exec", "tsc", "--noEmit", "--extendedDiagnostics", "--project", "tsconfig.json"],
        { cwd: packageDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      )
      console.log(output.trim())
    } catch (error) {
      failed = true
      const output = processOutput(error)
      console.log(output.trim())
    }
  }

  if (failed) {
    process.exitCode = 1
  }
}

function processOutput(error: unknown): string {
  const processError = error as { readonly stdout?: unknown; readonly stderr?: unknown }
  return `${toOutput(processError.stdout)}${toOutput(processError.stderr)}`
}

function toOutput(value: unknown): string {
  return value === undefined || value === null ? "" : String(value)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTypeScriptExtendedDiagnostics()
}

export const ArchitectureTypeScriptDiagnosticsRecipeId =
  "attune-architecture.typescript-diagnostics" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitectureTypeScriptDiagnosticsSourcePath =
  "packages/trellis/architecture/src/internal/checks/TypeScriptExtendedDiagnosticsCli.ts" as const

const ArchitectureTypeScriptDiagnosticsInput = Schema.Struct({
  workspaceRoot: Schema.String,
  recipeId: Schema.String,
})
type ArchitectureTypeScriptDiagnosticsInput = typeof ArchitectureTypeScriptDiagnosticsInput.Type

const ArchitectureTypeScriptDiagnosticsOutput = Schema.Struct({
  scriptPath: Schema.String,
  invocationModel: Schema.Literal("RecipeInvocation"),
  validationTargetHandles: Schema.Array(Schema.String),
})
type ArchitectureTypeScriptDiagnosticsOutput = typeof ArchitectureTypeScriptDiagnosticsOutput.Type

export const projectTypeScriptDiagnosticsInvocation = (
  _input: ArchitectureTypeScriptDiagnosticsInput,
): ArchitectureTypeScriptDiagnosticsOutput => ({
  scriptPath: ArchitectureTypeScriptDiagnosticsSourcePath,
  invocationModel: "RecipeInvocation",
  validationTargetHandles: ["workspace:arch:types", "workspace:policy-fast"],
})

export const ArchitectureTypeScriptDiagnosticsRuntimeLayer = defineRecipeLayer({
  id: "attune-architecture.typescript-diagnostics.runtime.layer",
  sourcePath: ArchitectureTypeScriptDiagnosticsSourcePath,
  exportName: "runTypeScriptExtendedDiagnostics",
  layer: Layer.empty as never,
  provides: [{ id: "process", service: "node:child_process" }],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureTypeScriptDiagnosticsInputResource = defineAlchemyResource({
  id: "attune-architecture.typescript-diagnostics.input",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [ArchitectureTypeScriptDiagnosticsRecipeId],
  addressSchema: ArchitectureTypeScriptDiagnosticsInput,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/trellis/architecture/src"),
  }),
  modes: ["read", "check"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureTypeScriptDiagnosticsReportResource = defineAlchemyResource({
  id: "attune-architecture.typescript-diagnostics.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitectureTypeScriptDiagnosticsRecipeId,
  producedBy: [ArchitectureTypeScriptDiagnosticsRecipeId],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitectureTypeScriptDiagnosticsInput,
  stateSchema: ArchitectureTypeScriptDiagnosticsOutput,
  modes: ["project", "observe"],
})

export const ArchitectureTypeScriptDiagnosticsDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitectureTypeScriptDiagnosticsRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitectureTypeScriptDiagnosticsReportResource,
  kind: "invokes",
  modes: ["invoke", "observe"],
})

export const ArchitectureTypeScriptDiagnosticsRecipe = defineInvocationRecipe({
  id: "attune-architecture.typescript-diagnostics",
  projectId: "attune-architecture",
  title: "Collect TypeScript extended diagnostics as recipe evidence",
  inputSchema: ArchitectureTypeScriptDiagnosticsInput,
  outputSchema: ArchitectureTypeScriptDiagnosticsOutput,
  nxTarget: "workspace:arch:types",
  entrypoints: [ArchitectureTypeScriptDiagnosticsSourcePath],
  allowedFiles: [ArchitectureTypeScriptDiagnosticsSourcePath, "packages/**", "tsconfig.base.json"],
  validationEvidence: ["workspace:arch:types", "workspace:policy-fast"],
  io: {
    inputSchema: ArchitectureTypeScriptDiagnosticsInput,
    outputSchema: ArchitectureTypeScriptDiagnosticsOutput,
    inputResources: [ArchitectureTypeScriptDiagnosticsInputResource],
    outputResources: [ArchitectureTypeScriptDiagnosticsReportResource],
  },
  handler: defineRecipeHandler<ArchitectureTypeScriptDiagnosticsInput, ArchitectureTypeScriptDiagnosticsOutput>({
    id: "attune-architecture.typescript-diagnostics.handler",
    recipeId: ArchitectureTypeScriptDiagnosticsRecipeId,
    sourcePath: ArchitectureTypeScriptDiagnosticsSourcePath,
    exportName: "projectTypeScriptDiagnosticsInvocation",
    handler: (input) => Effect.succeed(projectTypeScriptDiagnosticsInvocation(input)),
    layer: ArchitectureTypeScriptDiagnosticsRuntimeLayer,
    emitsReceipts: ["attune-architecture.typescript-diagnostics.projected"],
  }),
  alchemyDag: [ArchitectureTypeScriptDiagnosticsDagEdge],
})

export const ArchitectureTypeScriptDiagnosticsRecipes = [
  ArchitectureTypeScriptDiagnosticsRecipe,
] as const

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"

const packagePrefix = "packages/"

type FileStats = {
  revisions: number
  churn: number
}

export function runChurnComplexityReport(): void {
  const root = process.cwd()
  const log = execFileSync(
    "git",
    ["log", "--since=1 year ago", "--numstat", "--format=commit:%H", "--", "packages"],
    { cwd: root, encoding: "utf8" },
  )

  const stats = new Map<string, FileStats>()

  for (const line of log.split("\n")) {
    if (!line || line.startsWith("commit:")) {
      continue
    }

    const [addedRaw, deletedRaw, file] = line.split("\t")
    if (file === undefined || !file.startsWith(packagePrefix)) {
      continue
    }

    const added = Number.parseInt(addedRaw ?? "", 10)
    const deleted = Number.parseInt(deletedRaw ?? "", 10)
    const churn = (Number.isFinite(added) ? added : 0) + (Number.isFinite(deleted) ? deleted : 0)
    const current = stats.get(file) ?? { revisions: 0, churn: 0 }
    current.revisions += 1
    current.churn += churn
    stats.set(file, current)
  }

  const rows = [...stats.entries()]
    .map(([file, stat]) => {
      const loc = codeLines(file)
      return {
        file,
        revisions: stat.revisions,
        churn: stat.churn,
        loc,
        score: stat.revisions * Math.log2(stat.churn + 1) * Math.log2(loc + 1),
      }
    })
    .filter((row) => row.loc > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)

  console.log("Hotspots by one-year churn x LOC")
  console.log("score\trevs\tchurn\tloc\tfile")
  for (const row of rows) {
    console.log(
      `${row.score.toFixed(1)}\t${row.revisions}\t${row.churn}\t${row.loc}\t${row.file}`,
    )
  }
}

function codeLines(file: string): number {
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("//"))
      .length
  } catch {
    return 0
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runChurnComplexityReport()
}

export const ArchitectureChurnComplexityRecipeId =
  "attune-architecture.churn-complexity" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitectureChurnComplexitySourcePath =
  "packages/trellis/architecture/src/internal/checks/ChurnComplexityCli.ts" as const

const ArchitectureChurnComplexityInput = Schema.Struct({
  workspaceRoot: Schema.String,
  recipeId: Schema.String,
})
type ArchitectureChurnComplexityInput = typeof ArchitectureChurnComplexityInput.Type

const ArchitectureChurnComplexityOutput = Schema.Struct({
  scriptPath: Schema.String,
  invocationModel: Schema.Literal("RecipeInvocation"),
  validationTargetHandles: Schema.Array(Schema.String),
})
type ArchitectureChurnComplexityOutput = typeof ArchitectureChurnComplexityOutput.Type

export const projectChurnComplexityInvocation = (
  _input: ArchitectureChurnComplexityInput,
): ArchitectureChurnComplexityOutput => ({
  scriptPath: ArchitectureChurnComplexitySourcePath,
  invocationModel: "RecipeInvocation",
  validationTargetHandles: ["workspace:arch:churn", "workspace:policy-fast"],
})

export const ArchitectureChurnComplexityRuntimeLayer = defineRecipeLayer({
  id: "attune-architecture.churn-complexity.runtime.layer",
  sourcePath: ArchitectureChurnComplexitySourcePath,
  exportName: "runChurnComplexityReport",
  layer: Layer.empty as never,
  provides: [
    { id: "filesystem", service: "node:fs" },
    { id: "process", service: "node:child_process" },
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureChurnComplexityInputResource = defineAlchemyResource({
  id: "attune-architecture.churn-complexity.input",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [ArchitectureChurnComplexityRecipeId],
  addressSchema: ArchitectureChurnComplexityInput,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/trellis/architecture/src"),
  }),
  modes: ["read", "check"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureChurnComplexityReportResource = defineAlchemyResource({
  id: "attune-architecture.churn-complexity.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitectureChurnComplexityRecipeId,
  producedBy: [ArchitectureChurnComplexityRecipeId],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitectureChurnComplexityInput,
  stateSchema: ArchitectureChurnComplexityOutput,
  modes: ["project", "observe"],
})

export const ArchitectureChurnComplexityDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitectureChurnComplexityRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitectureChurnComplexityReportResource,
  kind: "invokes",
  modes: ["invoke", "observe"],
})

export const ArchitectureChurnComplexityRecipe = defineInvocationRecipe({
  id: "attune-architecture.churn-complexity",
  projectId: "attune-architecture",
  title: "Summarize churn and complexity pressure as recipe evidence",
  inputSchema: ArchitectureChurnComplexityInput,
  outputSchema: ArchitectureChurnComplexityOutput,
  nxTarget: "workspace:arch:churn",
  entrypoints: [ArchitectureChurnComplexitySourcePath],
  allowedFiles: [ArchitectureChurnComplexitySourcePath, "packages/**"],
  validationEvidence: ["workspace:arch:churn", "workspace:policy-fast"],
  io: {
    inputSchema: ArchitectureChurnComplexityInput,
    outputSchema: ArchitectureChurnComplexityOutput,
    inputResources: [ArchitectureChurnComplexityInputResource],
    outputResources: [ArchitectureChurnComplexityReportResource],
  },
  handler: defineRecipeHandler<ArchitectureChurnComplexityInput, ArchitectureChurnComplexityOutput>({
    id: "attune-architecture.churn-complexity.handler",
    recipeId: ArchitectureChurnComplexityRecipeId,
    sourcePath: ArchitectureChurnComplexitySourcePath,
    exportName: "projectChurnComplexityInvocation",
    handler: (input) => Effect.succeed(projectChurnComplexityInvocation(input)),
    layer: ArchitectureChurnComplexityRuntimeLayer,
    emitsReceipts: ["attune-architecture.churn-complexity.projected"],
  }),
  alchemyDag: [ArchitectureChurnComplexityDagEdge],
})

export const ArchitectureChurnComplexityRecipes = [
  ArchitectureChurnComplexityRecipe,
] as const

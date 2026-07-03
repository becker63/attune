import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  defineToolchainRecipe,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"

export function runToolVersionsAudit(): void {
  const packageJson = readJson("package.json")
  const pinned = readNixAttrSet("nix/lib/versions.nix")
  const packageManager = String(packageJson["packageManager"] ?? "")
  const pnpmMatch = /^pnpm@(.+)$/u.exec(packageManager)

  if (pnpmMatch === null) {
    fail("package.json packageManager must be pnpm@<version>")
  } else if (pinned["pnpm"] !== undefined && pnpmMatch[1] !== pinned["pnpm"]) {
    fail(`package.json packageManager pins pnpm ${pnpmMatch[1]}, but nix/lib/versions.nix pins ${pinned["pnpm"]}`)
  }

  for (const [name, value] of Object.entries({
    joern: pinned["joern"],
    joernCpg: pinned["joernCpg"],
    node: pinned["node"],
    pnpm: pinned["pnpm"],
  })) {
    if (typeof value !== "string" || value.length === 0) {
      fail(`nix/lib/versions.nix must pin ${name}`)
    }
  }

  const report = {
    schemaVersion: 1,
    kind: "attune.tool-versions",
    pinned: {
      node: pinned["node"],
      pnpm: pinned["pnpm"],
      joern: pinned["joern"],
      joernCpg: pinned["joernCpg"],
      packageManager,
    },
    observed: {
      node: commandVersion("node"),
      pnpm: commandVersion("pnpm"),
      nx: commandVersion("pnpm", ["exec", "nx", "--version"]),
      openspec: commandVersion("openspec", ["--version"]),
      joern: commandVersion(process.env.JOERN_BINARY ?? "joern", ["--version"]),
    },
    sources: {
      packageManager: "package.json",
      pinnedVersions: "nix/lib/versions.nix",
      nixToolchains: [
        "nix/toolchains/node.nix",
        "nix/toolchains/pnpm.nix",
        "nix/toolchains/joern.nix",
        "nix/toolchains/openspec.nix",
      ],
    },
  }

  console.log(JSON.stringify(report, null, 2))
}

function fail(message: string): void {
  console.error(`Tool version check failed: ${message}`)
  process.exitCode = 1
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
}

function readNixAttrSet(path: string): Record<string, string> {
  if (!existsSync(path)) {
    fail(`missing ${path}`)
    return {}
  }

  const content = readFileSync(path, "utf8")
  return Object.fromEntries(
    [...content.matchAll(/^\s*([A-Za-z0-9_-]+)\s*=\s*"([^"]+)";/gmu)]
      .map((match) => [match[1] ?? "", match[2] ?? ""]),
  )
}

function commandVersion(command: string, args: readonly string[] = ["--version"]): Record<string, unknown> {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (result.error !== undefined) {
    return {
      status: "unavailable",
      reason: "code" in result.error ? result.error.code : result.error.message,
    }
  }

  const output = `${result.stdout}${result.stderr}`.trim()
  return {
    status: result.status === 0 ? "available" : "failed",
    exitCode: result.status,
    version: output.split(/\r?\n/u).find((line) => line.trim().length > 0) ?? "",
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runToolVersionsAudit()
}

export const ArchitectureToolVersionAuditRecipeId =
  "attune-architecture.tool-version-audit" as const
export const ArchitectureNixToolchainOwnershipRecipeId =
  "attune-architecture.workspace-nix-toolchain-ownership" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitectureToolVersionsSourcePath =
  "packages/trellis/architecture/src/internal/checks/ToolVersionsCli.ts" as const

const ArchitectureToolVersionAuditInput = Schema.Struct({
  workspaceRoot: Schema.String,
  recipeId: Schema.String,
})
type ArchitectureToolVersionAuditInput = typeof ArchitectureToolVersionAuditInput.Type

const ArchitectureToolVersionAuditOutput = Schema.Struct({
  scriptPath: Schema.String,
  invocationModel: Schema.Literal("RecipeInvocation"),
  validationTargetHandles: Schema.Array(Schema.String),
})
type ArchitectureToolVersionAuditOutput = typeof ArchitectureToolVersionAuditOutput.Type

export const projectToolVersionAuditInvocation = (
  input: ArchitectureToolVersionAuditInput,
): ArchitectureToolVersionAuditOutput => ({
  scriptPath: ArchitectureToolVersionsSourcePath,
  invocationModel: "RecipeInvocation",
  validationTargetHandles: [
    input.recipeId === ArchitectureNixToolchainOwnershipRecipeId
      ? "workspace:packetized-architecture-judge"
      : "workspace:tool-versions",
  ],
})

export const ArchitectureToolVersionsRuntimeLayer = defineRecipeLayer({
  id: "attune-architecture.tool-versions.runtime.layer",
  sourcePath: ArchitectureToolVersionsSourcePath,
  exportName: "runToolVersionsAudit",
  layer: Layer.empty as never,
  provides: [
    { id: "filesystem", service: "node:fs" },
    { id: "process", service: "node:child_process" },
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureToolVersionsWorkspaceResource = defineAlchemyResource({
  id: "attune-architecture.tool-versions.workspace",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    ArchitectureToolVersionAuditRecipeId,
    ArchitectureNixToolchainOwnershipRecipeId,
  ],
  addressSchema: ArchitectureToolVersionAuditInput,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/trellis/architecture/src"),
  }),
  modes: ["read", "check"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureToolVersionsReportResource = defineAlchemyResource({
  id: "attune-architecture.tool-versions.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitectureToolVersionAuditRecipeId,
  producedBy: [
    ArchitectureToolVersionAuditRecipeId,
    ArchitectureNixToolchainOwnershipRecipeId,
  ],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitectureToolVersionAuditInput,
  stateSchema: ArchitectureToolVersionAuditOutput,
  modes: ["project", "observe"],
})

const ArchitectureToolVersionAuditDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitectureToolVersionAuditRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitectureToolVersionsReportResource,
  kind: "invokes",
  modes: ["invoke", "observe"],
})

const ArchitectureNixToolchainOwnershipDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitectureNixToolchainOwnershipRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitectureToolVersionsReportResource,
  kind: "observes",
  modes: ["read", "observe"],
})

export const ArchitectureToolVersionAuditRecipe = defineInvocationRecipe({
  id: "attune-architecture.tool-version-audit",
  projectId: "attune-architecture",
  title: "Audit pinned tool versions through the architecture source pipeline",
  inputSchema: ArchitectureToolVersionAuditInput,
  outputSchema: ArchitectureToolVersionAuditOutput,
  nxTarget: "workspace:tool-versions",
  entrypoints: [ArchitectureToolVersionsSourcePath],
  allowedFiles: [ArchitectureToolVersionsSourcePath, "flake.nix", "package.json"],
  validationEvidence: ["workspace:tool-versions"],
  io: {
    inputSchema: ArchitectureToolVersionAuditInput,
    outputSchema: ArchitectureToolVersionAuditOutput,
    inputResources: [ArchitectureToolVersionsWorkspaceResource],
    outputResources: [ArchitectureToolVersionsReportResource],
  },
  handler: defineRecipeHandler<ArchitectureToolVersionAuditInput, ArchitectureToolVersionAuditOutput>({
    id: "attune-architecture.tool-version-audit.handler",
    recipeId: ArchitectureToolVersionAuditRecipeId,
    sourcePath: ArchitectureToolVersionsSourcePath,
    exportName: "projectToolVersionAuditInvocation",
    handler: (input) => Effect.succeed(projectToolVersionAuditInvocation(input)),
    layer: ArchitectureToolVersionsRuntimeLayer,
    emitsReceipts: ["attune-architecture.tool-version-audit.projected"],
  }),
  alchemyDag: [ArchitectureToolVersionAuditDagEdge],
})

export const ArchitectureNixToolchainOwnershipRecipe = defineToolchainRecipe({
  id: "attune-architecture.workspace-nix-toolchain-ownership",
  projectId: "attune-architecture",
  title: "Own Nix and reproducible toolchain surfaces for file accounting",
  inputSchema: ArchitectureToolVersionAuditInput,
  outputSchema: ArchitectureToolVersionAuditOutput,
  allowedFiles: ["flake.nix", "flake.lock", "arion-pkgs.nix", "nix/**"],
  observedFiles: ["flake.nix", "flake.lock", "arion-pkgs.nix", "nix/**"],
  validationEvidence: ["workspace:tool-versions", "workspace:packetized-architecture-judge"],
  io: {
    inputSchema: ArchitectureToolVersionAuditInput,
    outputSchema: ArchitectureToolVersionAuditOutput,
    inputResources: [ArchitectureToolVersionsWorkspaceResource],
    outputResources: [ArchitectureToolVersionsReportResource],
  },
  handler: defineRecipeHandler<ArchitectureToolVersionAuditInput, ArchitectureToolVersionAuditOutput>({
    id: "attune-architecture.workspace-nix-toolchain-ownership.handler",
    recipeId: ArchitectureNixToolchainOwnershipRecipeId,
    sourcePath: ArchitectureToolVersionsSourcePath,
    exportName: "projectToolVersionAuditInvocation",
    handler: (input) => Effect.succeed(projectToolVersionAuditInvocation(input)),
    layer: ArchitectureToolVersionsRuntimeLayer,
    emitsReceipts: ["attune-architecture.workspace-nix-toolchain-ownership.projected"],
  }),
  alchemyDag: [ArchitectureNixToolchainOwnershipDagEdge],
})

export const ArchitectureToolVersionsRecipes = [
  ArchitectureToolVersionAuditRecipe,
  ArchitectureNixToolchainOwnershipRecipe,
] as const

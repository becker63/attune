#!/usr/bin/env tsx
import * as fs from "node:fs"
import * as path from "node:path"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"

import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineRecipeLayer,
  defineRepairRecipe,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"

interface RepairProject {
  readonly project: string
  readonly projectRoot: string
}

type RepairKind =
  | "artifact-freshness"
  | "observations"
  | "property-observations"
  | "schema-observations"
  | "symbol-registry"

interface RepairAction {
  readonly kind: "create" | "move" | "update" | "delete" | "noop"
  readonly path: string
  readonly message: string
}

const repairProjects: readonly RepairProject[] = [
  { project: "attune-foldkit", projectRoot: "packages/attune/foldkit" },
  { project: "attune-pi-agent", projectRoot: "packages/attune/pi-agent" },
  { project: "attuned-discovery", projectRoot: "packages/attune/discovery" },
  { project: "cocoindex-effect", projectRoot: "packages/attune/cocoindex-effect" },
  { project: "home-deployment", projectRoot: "packages/canopy/home-deployment" },
  { project: "joern-effect", projectRoot: "packages/attune/joern-effect" },
  { project: "joern-effect-properties", projectRoot: "packages/attune/joern-effect-properties" },
  { project: "attune-architecture", projectRoot: "packages/trellis/architecture" },
  {
    project: "platform-alchemy-k8s",
    projectRoot: "packages/canopy/platform-alchemy-k8s",
  },
]

const workspaceRoot = process.env["ATTUNE_REPAIR_WORKSPACE_ROOT"] ?? process.cwd()
const args = process.argv.slice(2)
const requestedProject = readArg("--project")
const requestedKind = readRepairKind()
const dryRun = args.includes("--dry-run")

export function runRecipeRepairCli(): void {
  const selectedProjects = requestedProject === null
    ? repairProjects
    : repairProjects.filter((entry) => entry.project === requestedProject)

  if (requestedProject !== null && selectedProjects.length === 0) {
    console.error(`Attune repair has no known project metadata for ${requestedProject}.`)
    process.exit(1)
  }

  const actions = selectedProjects.flatMap((project) => repairProject(project))

  if (actions.length === 0) {
    console.log("Attune repair: no recipe-substrate cleanup actions were needed.")
  } else {
    console.log(`Attune repair: ${dryRun ? "planned" : "applied"} ${actions.length} recipe-substrate cleanup action(s).`)
    for (const action of actions) {
      console.log(`${action.kind.toUpperCase()} ${action.path} ${action.message}`)
    }
  }
}

function repairProject(
  project: RepairProject,
): readonly RepairAction[] {
  if (requestedKind !== null) return materializeRepairKind(project, requestedKind)

  return [
    ...removeProjectLocalGeneratedExport(project),
    ...removeProjectLocalGeneratedCompanions(project),
  ]
}

function materializeRepairKind(
  project: RepairProject,
  kind: RepairKind,
): readonly RepairAction[] {
  switch (kind) {
    case "symbol-registry":
      return materializeGeneratedText(
        `.attune/cache/generated/${project.project}/attune-symbol-registry.ts`,
        generatedSymbolRegistryContent(project),
        `${project.project} symbol registry projection`,
      )
    case "property-observations":
      return materializeGeneratedText(
        `.attune/cache/generated/${project.project}/attune-property-observations.ts`,
        generatedPropertyObservationsContent(project),
        `${project.project} property observation projection`,
      )
    case "schema-observations":
      return materializeGeneratedText(
        `.attune/cache/generated/${project.project}/attune-schema-observations.ts`,
        generatedSchemaObservationsContent(project),
        `${project.project} schema observation projection`,
      )
    case "observations":
      return [
        ...materializeGeneratedText(
          `.attune/cache/generated/${project.project}/attune-observation-scaffold.ts`,
          generatedObservationScaffoldContent(project),
          `${project.project} observation scaffold projection`,
        ),
        ...materializeGeneratedText(
          `.attune/cache/observations/${project.project}/observation-scaffold.json`,
          generatedObservationScaffoldJson(project),
          `${project.project} observation cache projection`,
        ),
      ]
    case "artifact-freshness":
      return [
        ...materializeGeneratedText(
          `.attune/cache/generated/${project.project}/artifact-freshness.json`,
          generatedFreshnessContent(project),
          `${project.project} artifact freshness projection`,
        ),
        ...removeProjectLocalGeneratedExport(project),
        ...removeProjectLocalGeneratedCompanions(project),
      ]
  }
}

function removeProjectLocalGeneratedExport(project: RepairProject): readonly RepairAction[] {
  const packageDeclarationPath = `${project.projectRoot}/src/attune.package.ts`
  const content = readText(packageDeclarationPath)
  if (content === null) return []

  const next = content.replace(/^export \* from "\.\/attune\.contract\.generated\.js"\r?\n/mu, "")
  if (next === content) return []

  writeText(packageDeclarationPath, next)
  return [{
    kind: "update",
    path: packageDeclarationPath,
    message: "removed project-local generated contract re-export",
  }]
}

function removeProjectLocalGeneratedCompanions(project: RepairProject): readonly RepairAction[] {
  return [
    deleteFileIfPresent(`${project.projectRoot}/src/attune.generated.ts`),
    deleteFileIfPresent(`${project.projectRoot}/src/attune.contract.generated.ts`),
    deleteFileIfPresent(`${project.projectRoot}/src/attune.package.typecheck.ts`),
  ].flat()
}

function deleteFileIfPresent(relativePath: string): readonly RepairAction[] {
  const filePath = absolute(relativePath)
  if (!fs.existsSync(filePath)) return []

  if (!dryRun) fs.rmSync(filePath)
  return [{
    kind: "delete",
    path: relativePath,
    message: "removed project-local generated artifact",
  }]
}

function materializeGeneratedText(
  relativePath: string,
  content: string,
  message: string,
): readonly RepairAction[] {
  const existing = readText(relativePath)
  if (existing === content) return []

  writeText(relativePath, content)
  return [{
    kind: existing === null ? "create" : "update",
    path: relativePath,
    message,
  }]
}

function generatedSymbolRegistryContent(project: RepairProject): string {
  return generatedTs(project, "symbol-registry", [
    `export const projectId = ${JSON.stringify(project.project)} as const`,
    `export const projectRoot = ${JSON.stringify(project.projectRoot)} as const`,
    "export const sourceDeclaration = \"src/attune.package.ts\" as const",
    `export const projectFactsSource = ${JSON.stringify(projectFactsPath(project))} as const`,
    `export const symbolRegistryProjection = ${JSON.stringify({
      generatedFrom: projectFactsPath(project),
      projectId: project.project,
      projection: "symbol-registry",
    }, null, 2)} as const`,
  ])
}

function generatedPropertyObservationsContent(project: RepairProject): string {
  return generatedTs(project, "property-observations", [
    `export const projectId = ${JSON.stringify(project.project)} as const`,
    `export const propertyObservationsProjection = ${JSON.stringify({
      generatedFrom: projectFactsPath(project),
      projectId: project.project,
      projection: "property-observations",
    }, null, 2)} as const`,
  ])
}

function generatedSchemaObservationsContent(project: RepairProject): string {
  return generatedTs(project, "schema-observations", [
    `export const projectId = ${JSON.stringify(project.project)} as const`,
    `export const schemaObservationsProjection = ${JSON.stringify({
      generatedFrom: projectFactsPath(project),
      projectId: project.project,
      projection: "schema-observations",
    }, null, 2)} as const`,
  ])
}

function generatedObservationScaffoldContent(project: RepairProject): string {
  return generatedTs(project, "observation-scaffold", [
    `export const projectId = ${JSON.stringify(project.project)} as const`,
    `export const ObservationScaffold = ${JSON.stringify({
      expectedEvents: ["property-run", "diagnostic-rule-observed", "atom-movement"],
      generatedFrom: projectFactsPath(project),
      projectId: project.project,
      projectRoot: project.projectRoot,
      projection: "observation-scaffold",
    }, null, 2)} as const`,
  ])
}

function generatedObservationScaffoldJson(project: RepairProject): string {
  return `${JSON.stringify({
    generatedBy: "recipe-repair",
    generatedFrom: projectFactsPath(project),
    projectId: project.project,
    projectRoot: project.projectRoot,
    projection: "observation-scaffold",
  }, null, 2)}\n`
}

function generatedFreshnessContent(project: RepairProject): string {
  const artifacts = [
    projectFactsPath(project),
    `${project.projectRoot}/src/attune.contract.generated.ts`,
    `${project.projectRoot}/src/attune.generated.ts`,
  ]
    .map((artifactPath) => {
      const content = readText(artifactPath)
      return content === null
        ? { path: artifactPath, status: "missing" as const }
        : { path: artifactPath, status: "present" as const, sha256: hashText(content) }
    })
    .filter((artifact) => artifact.status === "present")

  return `${JSON.stringify({
    generatedBy: "recipe-repair",
    projectId: project.project,
    projectRoot: project.projectRoot,
    projection: "artifact-freshness",
    artifacts,
  }, null, 2)}\n`
}

function generatedTs(
  project: RepairProject,
  projection: string,
  body: readonly string[],
): string {
  return [
    "/* @generated by workspace:repair. Do not edit directly. */",
    `/* Projection: ${projection}; Project: ${project.project}. */`,
    ...body,
    "",
  ].join("\n")
}

function readArg(name: string): string | null {
  const index = args.indexOf(name)
  if (index === -1) return null
  return args[index + 1] ?? null
}

function readRepairKind(): RepairKind | null {
  const kind = readArg("--kind")
  if (kind === null) return null
  if (
    kind === "artifact-freshness" ||
    kind === "observations" ||
    kind === "property-observations" ||
    kind === "schema-observations" ||
    kind === "symbol-registry"
  ) {
    return kind
  }

  console.error(`Unsupported Attune repair kind ${kind}.`)
  process.exit(1)
}

function projectFactsPath(project: RepairProject): string {
  return `${project.projectRoot}/src/attune.package.ts`
}

function readText(relativePath: string): string | null {
  const filePath = absolute(relativePath)
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null
}

function writeText(relativePath: string, content: string): void {
  if (dryRun) return
  const filePath = absolute(relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, "utf8")
}

function absolute(relativePath: string): string {
  return path.join(workspaceRoot, relativePath)
}

function hashText(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

export const ArchitectureRecipeRepairRecipeId =
  "attune-architecture.recipe-repair-cli" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitectureRecipeRepairSourcePath =
  "packages/trellis/architecture/src/recipe-repair-cli.ts" as const

const ArchitectureRecipeRepairInput = Schema.Struct({
  workspaceRoot: Schema.String,
  project: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.String),
  dryRun: Schema.optional(Schema.Boolean),
})
type ArchitectureRecipeRepairInput = typeof ArchitectureRecipeRepairInput.Type

const ArchitectureRecipeRepairOutput = Schema.Struct({
  scriptPath: Schema.String,
  invocationModel: Schema.Literal("RecipeInvocation"),
  validationTargetHandles: Schema.Array(Schema.String),
})
type ArchitectureRecipeRepairOutput = typeof ArchitectureRecipeRepairOutput.Type

export const projectRecipeRepairInvocation = (
  _input: ArchitectureRecipeRepairInput,
): ArchitectureRecipeRepairOutput => ({
  scriptPath: ArchitectureRecipeRepairSourcePath,
  invocationModel: "RecipeInvocation",
  validationTargetHandles: ["workspace:repair", "attune-architecture:test"],
})

export const ArchitectureRecipeRepairRuntimeLayer = defineRecipeLayer({
  id: "attune-architecture.recipe-repair.runtime.layer",
  sourcePath: ArchitectureRecipeRepairSourcePath,
  exportName: "runRecipeRepairCli",
  layer: Layer.empty as never,
  provides: [{ id: "filesystem", service: "node:fs" }],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureRecipeRepairInputResource = defineAlchemyResource({
  id: "attune-architecture.recipe-repair.input",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  consumedBy: [ArchitectureRecipeRepairRecipeId],
  addressSchema: ArchitectureRecipeRepairInput,
  stateSchema: ArchitectureRecipeRepairInput,
  modes: ["read", "plan"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureRecipeRepairReportResource = defineAlchemyResource({
  id: "attune-architecture.recipe-repair.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitectureRecipeRepairRecipeId,
  producedBy: [ArchitectureRecipeRepairRecipeId],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitectureRecipeRepairInput,
  stateSchema: ArchitectureRecipeRepairOutput,
  modes: ["project", "observe"],
})

export const ArchitectureRecipeRepairDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitectureRecipeRepairRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitectureRecipeRepairReportResource,
  kind: "repairs",
  modes: ["plan", "observe"],
})

export const ArchitectureRecipeRepairRecipe = defineRepairRecipe({
  id: "attune-architecture.recipe-repair-cli",
  projectId: "attune-architecture",
  title: "Expose architecture recipe repair CLI as a RepairRecipe surface",
  inputSchema: ArchitectureRecipeRepairInput,
  outputSchema: ArchitectureRecipeRepairOutput,
  nxTarget: "workspace:repair",
  affectedFiles: [ArchitectureRecipeRepairSourcePath],
  allowedFiles: [ArchitectureRecipeRepairSourcePath],
  validationEvidence: ["workspace:repair", "attune-architecture:test"],
  io: {
    inputSchema: ArchitectureRecipeRepairInput,
    outputSchema: ArchitectureRecipeRepairOutput,
    inputResources: [ArchitectureRecipeRepairInputResource],
    outputResources: [ArchitectureRecipeRepairReportResource],
  },
  handler: defineRecipeHandler<ArchitectureRecipeRepairInput, ArchitectureRecipeRepairOutput>({
    id: "attune-architecture.recipe-repair-cli.handler",
    recipeId: ArchitectureRecipeRepairRecipeId,
    sourcePath: ArchitectureRecipeRepairSourcePath,
    exportName: "projectRecipeRepairInvocation",
    handler: (input) => Effect.succeed(projectRecipeRepairInvocation(input)),
    layer: ArchitectureRecipeRepairRuntimeLayer,
    emitsReceipts: ["attune-architecture.recipe-repair-cli.projected"],
  }),
  alchemyDag: [ArchitectureRecipeRepairDagEdge],
})

export const ArchitectureRecipeRepairRecipes = [
  ArchitectureRecipeRepairRecipe,
] as const

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRecipeRepairCli()
}

#!/usr/bin/env tsx
import * as fs from "node:fs"
import * as path from "node:path"
import { createHash } from "node:crypto"

interface RepairProject {
  readonly project: string
  readonly projectRoot: string
}

type RepairKind =
  | "evidence"
  | "generated"
  | "properties"
  | "registry"
  | "type-guidance"

interface RepairAction {
  readonly kind: "create" | "move" | "update" | "delete" | "noop"
  readonly path: string
  readonly message: string
}

const repairProjects: readonly RepairProject[] = [
  { project: "attune-foldkit", projectRoot: "packages/attune-foldkit" },
  { project: "attune-nx", projectRoot: "packages/attune-nx" },
  { project: "attune-pi-agent", projectRoot: "packages/attune-pi-agent" },
  { project: "attuned-discovery", projectRoot: "packages/attuned-discovery" },
  { project: "cocoindex-effect", projectRoot: "packages/cocoindex-effect" },
  { project: "effect-oxlint-policy", projectRoot: "framework/oxlint-policy" },
  { project: "home-deployment", projectRoot: "packages/home-deployment" },
  { project: "joern-effect", projectRoot: "packages/joern-effect" },
  { project: "joern-effect-properties", projectRoot: "packages/joern-effect-properties" },
  { project: "attune-architecture", projectRoot: "framework/architecture" },
  {
    project: "platform-alchemy-k8s",
    projectRoot: "packages/platform-alchemy-k8s",
  },
]
const safeRelocationProjectIds = new Set([
  "attune-foldkit",
  "attune-architecture",
  "attune-nx",
  "attune-pi-agent",
  "attuned-discovery",
  "effect-oxlint-policy",
  "home-deployment",
  "platform-alchemy-k8s",
])

const workspaceRoot = process.env["ATTUNE_REPAIR_WORKSPACE_ROOT"] ?? process.cwd()
const args = process.argv.slice(2)
const requestedProject = readArg("--project")
const requestedKind = readRepairKind()
const dryRun = args.includes("--dry-run")

const selectedProjects = requestedProject === null
  ? repairProjects
  : repairProjects.filter((entry) => entry.project === requestedProject)

if (requestedProject !== null && selectedProjects.length === 0) {
  console.error(`Attune repair has no known project metadata for ${requestedProject}.`)
  process.exit(1)
}

const actions = selectedProjects.flatMap((project) => repairProject(project))

if (actions.length === 0) {
  console.log("Attune repair: no safe generated/package-surface relocation actions were needed.")
} else {
  console.log(`Attune repair: ${dryRun ? "planned" : "applied"} ${actions.length} safe relocation action(s).`)
  for (const action of actions) {
    console.log(`${action.kind.toUpperCase()} ${action.path} ${action.message}`)
  }
}

function repairProject(project: RepairProject): readonly RepairAction[] {
  if (requestedKind !== null) return materializeRepairKind(project, requestedKind)
  if (!safeRelocationProjectIds.has(project.project)) return []

  return [
    ...relocateGeneratedCompanions(project),
    ...removePackageLocalGeneratedExport(project),
    ...updateTypecheckAggregate(project),
    ...relocateSourceBom(project),
  ]
}

function materializeRepairKind(
  project: RepairProject,
  kind: RepairKind,
): readonly RepairAction[] {
  switch (kind) {
    case "registry":
      return materializeGeneratedText(
        `.attune/cache/generated/${project.project}/attune-operation-registry.ts`,
        generatedRegistryContent(project),
        `${project.project} operation registry projection`,
      )
    case "properties":
      return materializeGeneratedText(
        `.attune/cache/generated/${project.project}/attune-property-registry.ts`,
        generatedPropertyRegistryContent(project),
        `${project.project} property registry projection`,
      )
    case "type-guidance":
      return materializeGeneratedText(
        `.attune/cache/generated/${project.project}/attune-type-guidance.ts`,
        generatedTypeGuidanceContent(project),
        `${project.project} type-guidance projection`,
      )
    case "evidence":
      return [
        ...materializeGeneratedText(
          `.attune/cache/generated/${project.project}/attune-property-evidence.ts`,
          generatedEvidenceScaffoldContent(project),
          `${project.project} evidence scaffold projection`,
        ),
        ...materializeGeneratedText(
          `.attune/cache/evidence/${project.project}/evidence-scaffold.json`,
          generatedEvidenceScaffoldJson(project),
          `${project.project} evidence cache projection`,
        ),
      ]
    case "generated":
      return [
        ...materializeGeneratedText(
          `.attune/cache/generated/${project.project}/generated-freshness.json`,
          generatedFreshnessContent(project),
          `${project.project} generated freshness projection`,
        ),
        ...(safeRelocationProjectIds.has(project.project)
          ? [
            ...relocateGeneratedCompanions(project),
            ...removePackageLocalGeneratedExport(project),
            ...updateTypecheckAggregate(project),
            ...relocateSourceBom(project),
          ]
          : []),
      ]
  }
}

function relocateGeneratedCompanions(project: RepairProject): readonly RepairAction[] {
  const centralRoot = frameworkPackageContractRoot(project.project)
  return [
    moveFileIfPresent(
      `${project.projectRoot}/src/attune.generated.ts`,
      `${centralRoot}/attune.generated.ts`,
    ),
    moveFileIfPresent(
      `${project.projectRoot}/src/attune.contract.generated.ts`,
      `${centralRoot}/attune.contract.generated.ts`,
      (content) => rewritePackageLocalGeneratedContractImports(content, project),
    ),
  ].flat()
}

function removePackageLocalGeneratedExport(project: RepairProject): readonly RepairAction[] {
  const packageDeclarationPath = `${project.projectRoot}/src/attune.package.ts`
  const content = readText(packageDeclarationPath)
  if (content === null) return []

  const next = content.replace(/^export \* from "\.\/attune\.contract\.generated\.js"\r?\n/mu, "")
  if (next === content) return []

  writeText(packageDeclarationPath, next)
  return [{
    kind: "update",
    path: packageDeclarationPath,
    message: "removed package-local generated contract re-export",
  }]
}

function updateTypecheckAggregate(project: RepairProject): readonly RepairAction[] {
  const aggregatePath = "framework/architecture/src/generated/package-contracts.typecheck.generated.ts"
  const content = readText(aggregatePath)
  if (content === null) return []

  const localImportPath = `../../../../${project.projectRoot}/src/attune.package.js`
  const centralImportPath = `./package-contracts/${project.project}/attune.contract.generated.js`
  if (!content.includes(localImportPath)) return []

  const next = content.replaceAll(localImportPath, centralImportPath)
  writeText(aggregatePath, next)
  return [{
    kind: "update",
    path: aggregatePath,
    message: `uses framework-owned generated contract for ${project.project}`,
  }]
}

function relocateSourceBom(project: RepairProject): readonly RepairAction[] {
  const legacyShard = `${project.projectRoot}/attune.source-bom.json`
  const frameworkShard = `framework/architecture/src/generated/source-bom/${project.project}.json`
  const actions: RepairAction[] = []

  actions.push(...moveFileIfPresent(legacyShard, frameworkShard))
  actions.push(...rewriteJsonFile("attune.source-bom.index.json", (value) =>
    replaceSourceBomShard(value, legacyShard, frameworkShard)
  ))
  actions.push(...rewriteJsonFile("attune.generator-shapes.json", (value) =>
    replaceSourceBomShard(value, legacyShard, frameworkShard)
  ))

  return actions
}

function moveFileIfPresent(
  from: string,
  to: string,
  transform: (content: string) => string = (content) => content,
): readonly RepairAction[] {
  const source = absolute(from)
  if (!fs.existsSync(source)) return []

  const content = transform(fs.readFileSync(source, "utf8"))
  const destination = absolute(to)
  const destinationContent = fs.existsSync(destination)
    ? fs.readFileSync(destination, "utf8")
    : null

  if (destinationContent !== null && destinationContent !== content) {
    throw new Error(
      `Refusing to overwrite existing framework-owned materialization ${to}; ` +
        `compare it with ${from} and rerun after resolving the mismatch.`,
    )
  }

  if (destinationContent !== content) {
    writeText(to, content)
  }

  if (!dryRun) fs.rmSync(source)

  return [{
    kind: "move",
    path: `${from} -> ${to}`,
    message: destinationContent === content
      ? "removed duplicate package-local materialization"
      : "moved package-local materialization into framework-owned projection",
  }]
}

function rewriteJsonFile(
  relativePath: string,
  rewrite: (value: unknown) => unknown,
): readonly RepairAction[] {
  const content = readText(relativePath)
  if (content === null) return []

  const nextValue = rewrite(JSON.parse(content) as unknown)
  const next = `${JSON.stringify(nextValue, null, 2)}\n`
  if (next === content) return []

  writeText(relativePath, next)
  return [{
    kind: "update",
    path: relativePath,
    message: "updated framework-owned relocation metadata",
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

function generatedRegistryContent(project: RepairProject): string {
  return generatedTs(project, "operation-registry", [
    `export const packageId = ${JSON.stringify(project.project)} as const`,
    `export const packageRoot = ${JSON.stringify(project.projectRoot)} as const`,
    "export const sourceDeclaration = \"src/attune.package.ts\" as const",
    `export const generatedContract = ${JSON.stringify(generatedContractPath(project))} as const`,
    `export const operationRegistryProjection = ${JSON.stringify({
      generatedFrom: generatedContractPath(project),
      packageId: project.project,
      projection: "operation-registry",
    }, null, 2)} as const`,
  ])
}

function generatedPropertyRegistryContent(project: RepairProject): string {
  return generatedTs(project, "property-registry", [
    `export const packageId = ${JSON.stringify(project.project)} as const`,
    `export const propertyRegistryProjection = ${JSON.stringify({
      generatedFrom: generatedContractPath(project),
      packageId: project.project,
      projection: "property-registry",
    }, null, 2)} as const`,
  ])
}

function generatedTypeGuidanceContent(project: RepairProject): string {
  return generatedTs(project, "type-guidance", [
    `export const packageId = ${JSON.stringify(project.project)} as const`,
    `export const typeGuidanceProjection = ${JSON.stringify({
      generatedFrom: generatedContractPath(project),
      packageId: project.project,
      projection: "type-guidance",
    }, null, 2)} as const`,
  ])
}

function generatedEvidenceScaffoldContent(project: RepairProject): string {
  return generatedTs(project, "property-evidence", [
    `export const packageId = ${JSON.stringify(project.project)} as const`,
    `export const PropertyEvidenceScaffold = ${JSON.stringify({
      expectedEvents: ["property-run", "law-observed", "atom-movement"],
      generatedFrom: generatedContractPath(project),
      packageId: project.project,
      packageRoot: project.projectRoot,
      projection: "property-evidence",
    }, null, 2)} as const`,
  ])
}

function generatedEvidenceScaffoldJson(project: RepairProject): string {
  return `${JSON.stringify({
    generatedBy: "attune-repair",
    generatedFrom: generatedContractPath(project),
    packageId: project.project,
    packageRoot: project.projectRoot,
    projection: "evidence-scaffold",
  }, null, 2)}\n`
}

function generatedFreshnessContent(project: RepairProject): string {
  const artifacts = [
    generatedContractPath(project),
    `${frameworkPackageContractRoot(project.project)}/attune.generated.ts`,
    `framework/architecture/src/generated/source-bom/${project.project}.json`,
    `${project.projectRoot}/src/attune.contract.generated.ts`,
    `${project.projectRoot}/src/attune.generated.ts`,
    `${project.projectRoot}/attune.source-bom.json`,
  ]
    .map((artifactPath) => {
      const content = readText(artifactPath)
      return content === null
        ? { path: artifactPath, status: "missing" as const }
        : { path: artifactPath, status: "present" as const, sha256: hashText(content) }
    })
    .filter((artifact) => artifact.status === "present")

  return `${JSON.stringify({
    generatedBy: "attune-repair",
    packageId: project.project,
    packageRoot: project.projectRoot,
    projection: "generated-freshness",
    artifacts,
  }, null, 2)}\n`
}

function generatedTs(
  project: RepairProject,
  projection: string,
  body: readonly string[],
): string {
  return [
    "/* @generated by workspace:attune-repair. Do not edit directly. */",
    `/* Projection: ${projection}; Package: ${project.project}. */`,
    ...body,
    "",
  ].join("\n")
}

function replaceSourceBomShard(
  value: unknown,
  legacyShard: string,
  frameworkShard: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => replaceSourceBomShard(entry, legacyShard, frameworkShard))
  }

  if (value === null || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (
        typeof entry === "string" &&
        entry === legacyShard &&
        (key === "shard" || key === "sourceBomShard")
      ) {
        return [key, frameworkShard]
      }

      return [key, replaceSourceBomShard(entry, legacyShard, frameworkShard)]
    }),
  )
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
    kind === "evidence" ||
    kind === "generated" ||
    kind === "properties" ||
    kind === "registry" ||
    kind === "type-guidance"
  ) {
    return kind
  }

  console.error(`Unsupported Attune repair kind ${kind}.`)
  process.exit(1)
}

function frameworkPackageContractRoot(project: string): string {
  return `framework/architecture/src/generated/package-contracts/${project}`
}

function rewritePackageLocalGeneratedContractImports(
  content: string,
  project: RepairProject,
): string {
  const sourcePrefix = path.posix.relative(
    frameworkPackageContractRoot(project.project),
    `${project.projectRoot}/src`,
  )

  return content.replace(
    /from "\.\/(?!attune\.generated\.js)([^"]+)"/gu,
    (_match, importedPath: string) => `from "${sourcePrefix}/${importedPath}"`,
  )
}

function generatedContractPath(project: RepairProject): string {
  return `${frameworkPackageContractRoot(project.project)}/attune.contract.generated.ts`
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

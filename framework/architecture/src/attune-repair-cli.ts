#!/usr/bin/env tsx
import * as fs from "node:fs"
import * as path from "node:path"

interface RepairProject {
  readonly project: string
  readonly projectRoot: string
}

interface RepairAction {
  readonly kind: "move" | "update" | "delete" | "noop"
  readonly path: string
  readonly message: string
}

const safeRelocationProjects: readonly RepairProject[] = [
  {
    project: "platform-alchemy-k8s",
    projectRoot: "packages/platform-alchemy-k8s",
  },
]

const workspaceRoot = process.env["ATTUNE_REPAIR_WORKSPACE_ROOT"] ?? process.cwd()
const args = process.argv.slice(2)
const requestedProject = readArg("--project")
const dryRun = args.includes("--dry-run")

const selectedProjects = requestedProject === null
  ? safeRelocationProjects
  : safeRelocationProjects.filter((entry) => entry.project === requestedProject)

if (requestedProject !== null && selectedProjects.length === 0) {
  console.error(`Attune repair has no safe generated-relocation plan for project ${requestedProject}.`)
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
  return [
    ...relocateGeneratedCompanions(project),
    ...removePackageLocalGeneratedExport(project),
    ...updateTypecheckAggregate(project),
    ...relocateSourceBom(project),
  ]
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

function moveFileIfPresent(from: string, to: string): readonly RepairAction[] {
  const source = absolute(from)
  if (!fs.existsSync(source)) return []

  const content = fs.readFileSync(source, "utf8")
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

function frameworkPackageContractRoot(project: string): string {
  return `framework/architecture/src/generated/package-contracts/${project}`
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

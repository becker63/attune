#!/usr/bin/env tsx
import * as fs from "node:fs"
import * as path from "node:path"
import { createHash } from "node:crypto"
import { Effect } from "effect"
import { repairPlanFromProgramIndexRow, type AttuneRepairPlan } from "@attune/framework-nx"
import {
  createSqliteProgramIndex,
  defaultProgramIndexPath,
  type ProgramIndexViewRow,
} from "@attune/framework-sqlite"

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
const requestedDiagnostic = readArg("--diagnostic")
const dryRun = args.includes("--dry-run")
const programIndexPath =
  readArg("--index-path") ??
  process.env["ATTUNE_REPAIR_PROGRAM_INDEX_PATH"] ??
  absolute(defaultProgramIndexPath)

const selectedProjects = requestedProject === null
  ? repairProjects
  : repairProjects.filter((entry) => entry.project === requestedProject)

if (requestedProject !== null && selectedProjects.length === 0) {
  console.error(`Attune repair has no known project metadata for ${requestedProject}.`)
  process.exit(1)
}

const indexedRepairPlans = requestedKind === null ? readIndexedRepairPlans() : []
if (indexedRepairPlans.length > 0) printIndexedRepairSummary(indexedRepairPlans)

const actions = selectedProjects.flatMap((project) => repairProject(project, indexedRepairPlans))

if (actions.length === 0) {
  console.log("Attune repair: no safe artifact or project-surface relocation actions were needed.")
} else {
  console.log(`Attune repair: ${dryRun ? "planned" : "applied"} ${actions.length} safe relocation action(s).`)
  for (const action of actions) {
    console.log(`${action.kind.toUpperCase()} ${action.path} ${action.message}`)
  }
}

interface IndexedRepairPlan {
  readonly row: ProgramIndexViewRow
  readonly plan: AttuneRepairPlan | undefined
}

function repairProject(
  project: RepairProject,
  indexedPlans: readonly IndexedRepairPlan[],
): readonly RepairAction[] {
  if (requestedKind !== null) return materializeRepairKind(project, requestedKind)
  if (indexedPlans.length > 0) return materializeIndexedSafeRepairs(project, indexedPlans)
  if (!safeRelocationProjectIds.has(project.project)) return []

  return [
    ...removeProjectLocalGeneratedExport(project),
    ...removeProjectLocalGeneratedCompanions(project),
    ...relocateSourceBom(project),
  ]
}

function readIndexedRepairPlans(): readonly IndexedRepairPlan[] {
  if (!fs.existsSync(programIndexPath)) return []

  const index = createSqliteProgramIndex({ path: programIndexPath })
  try {
    const rows = Effect.runSync(index.listRepairableDiagnostics({
      ...(requestedProject === null ? {} : { projectId: requestedProject }),
      ...(requestedDiagnostic === null ? {} : { diagnosticId: requestedDiagnostic }),
    }))
    return rows.map((row) => ({
      row,
      plan: repairPlanFromProgramIndexRow(row),
    }))
  } catch (error) {
    console.error(
      `Attune repair: program-index repair rows unavailable from ${programIndexPath}: ${errorMessage(error)}`,
    )
    return []
  } finally {
    Effect.runSync(index.close())
  }
}

function printIndexedRepairSummary(indexedPlans: readonly IndexedRepairPlan[]): void {
  const plans = indexedPlans.map((entry) => entry.plan).filter((plan): plan is AttuneRepairPlan => plan !== undefined)
  const safe = plans.filter((plan) => plan.safety === "safe").length
  const needsReview = plans.filter((plan) => plan.safety === "needs-review").length
  const manualOnly = plans.filter((plan) => plan.safety === "manual-only").length
  const blocked = plans.filter((plan) => plan.safety === "safe" && repairKindForIndexedPlan(plan) === null).length

  console.log(
    `Program index repair rows: ${indexedPlans.length} total ` +
      `(${safe} safe, ${needsReview} needs-review, ${manualOnly} manual-only, ${blocked} blocked).`,
  )

  for (const entry of indexedPlans) {
    if (entry.plan === undefined) {
      console.log("BLOCKED unknown diagnostic row missing repair plan metadata")
      continue
    }
    const status = indexedPlanStatus(entry.plan)
    const validation = entry.plan.validateAfter?.join(",") ?? "none"
    console.log(
      `${status} ${entry.plan.target} ${entry.plan.diagnosticId} ` +
        `${entry.plan.repairKind} route=${entry.plan.route ?? "none"} validate=${validation} ` +
        `${indexedPlanReason(entry.plan)}`,
    )
  }
}

function materializeIndexedSafeRepairs(
  project: RepairProject,
  indexedPlans: readonly IndexedRepairPlan[],
): readonly RepairAction[] {
  const materializerKinds = new Set<RepairKind>()
  for (const entry of indexedPlans) {
    if (entry.plan === undefined || entry.plan.safety !== "safe") continue
    if (!targetsRepairProject(entry.plan, project)) continue
    const kind = repairKindForIndexedPlan(entry.plan)
    if (kind !== null) materializerKinds.add(kind)
  }

  return [...materializerKinds].flatMap((kind) => materializeRepairKind(project, kind))
}

function targetsRepairProject(plan: AttuneRepairPlan, project: RepairProject): boolean {
  return plan.target === `${project.project}:attune-repair` ||
    (plan.target === "workspace:attune-repair" && requestedProject === project.project)
}

function indexedPlanStatus(plan: AttuneRepairPlan): string {
  if (plan.safety === "safe" && repairKindForIndexedPlan(plan) === null) return "BLOCKED"
  return plan.safety.toUpperCase()
}

function indexedPlanReason(plan: AttuneRepairPlan): string {
  if (plan.safety === "safe" && repairKindForIndexedPlan(plan) === null) {
    return "no automatic materializer route is available"
  }
  if (plan.safety === "needs-review") return "review required before execution"
  if (plan.safety === "manual-only") return "manual action required"
  return "safe automatic route"
}

function repairKindForIndexedPlan(plan: AttuneRepairPlan): RepairKind | null {
  switch (plan.route) {
    case "attune-repair-cli:symbol-registry":
      return "symbol-registry"
    case "attune-repair-cli:property-observations":
      return "property-observations"
    case "attune-repair-cli:schema-observations":
      return "schema-observations"
    case "attune-repair-cli:observations":
      return "observations"
    case "attune-repair-cli:artifact-freshness":
      return "artifact-freshness"
    default:
      break
  }

  switch (plan.repairKind) {
    case "symbol-registry":
      return "symbol-registry"
    case "property-observations":
      return "property-observations"
    case "schema-observations":
      return "schema-observations"
    case "observation-scaffold":
      return "observations"
    case "artifact-freshness":
      return "artifact-freshness"
    default:
      return null
  }
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
        ...(safeRelocationProjectIds.has(project.project)
          ? [
            ...removeProjectLocalGeneratedExport(project),
            ...removeProjectLocalGeneratedCompanions(project),
            ...relocateSourceBom(project),
          ]
          : []),
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

function deleteFileIfPresent(relativePath: string): readonly RepairAction[] {
  const filePath = absolute(relativePath)
  if (!fs.existsSync(filePath)) return []

  if (!dryRun) fs.rmSync(filePath)
  return [{
    kind: "delete",
    path: relativePath,
    message: "removed project-local generated compatibility artifact",
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
    generatedBy: "attune-repair",
    generatedFrom: projectFactsPath(project),
    projectId: project.project,
    projectRoot: project.projectRoot,
    projection: "observation-scaffold",
  }, null, 2)}\n`
}

function generatedFreshnessContent(project: RepairProject): string {
  const artifacts = [
    projectFactsPath(project),
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
    "/* @generated by workspace:attune-repair. Do not edit directly. */",
    `/* Projection: ${projection}; Project: ${project.project}. */`,
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

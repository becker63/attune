#!/usr/bin/env tsx
import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
  defaultPacketPrivacyPolicy,
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineJudgeRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  judgeMigration,
  PacketMigrationJudgeRefs,
  selectedTargetOracleFor,
  type FileAccountingOracleResult,
  type MigrationJudgeInput,
  type Packet,
  type RecipeExpressionOracleResult,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"
import {
  analyzeFileAccounting,
  isFileAccountingPacketFamily,
} from "../../../../language-service/src/file-accounting.js"
import { loadProjectScope } from "../../../../language-service/src/project-loader.js"
import {
  analyzeSourceExpression,
  isSourceExpressionPacketFamily,
} from "../../../../language-service/src/source-expression.js"

interface CommandRun {
  readonly label: string
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly durationMs: number
  readonly timedOut: boolean
}

interface TypeScriptDiagnosticSweep {
  readonly diagnosticCount: number
  readonly projectCount: number
  readonly projectDiagnostics: readonly {
    readonly project: string
    readonly diagnosticCount: number
  }[]
  readonly failedProjects: readonly string[]
  readonly timedOutProjects: readonly string[]
  readonly malformedProjects: readonly string[]
}

interface PacketizedArchitectureJudgeOutput extends FileAccountingOracleResult {
  readonly validation: {
    readonly repositoryInventory: "passed" | "failed"
    readonly fileAccountingOracle: "passed" | "failed"
    readonly sourceExpressionOracle: "passed" | "failed"
    readonly packetOracle: "passed" | "failed"
    readonly projectAwareTypeScriptSweep: "passed" | "failed"
    readonly packetProtocolTests: "passed" | "failed"
    readonly languageServicePacketTests: "passed" | "failed"
    readonly promotionGate: "passed" | "failed"
  }
  readonly sourceSnapshotId: string
  readonly inventoryHash: string
  readonly recipeExpression: RecipeExpressionOracleResult
  readonly expressionHash: string
  readonly judgmentId: string
  readonly judgmentStatus: string
  readonly promotionStatus: "allowed" | "blocked"
  readonly validationDetails: {
    readonly durationMs: number
    readonly projectAwareTypeScript: TypeScriptDiagnosticSweep
    readonly commandRuns: readonly ReturnType<typeof commandRunSummary>[]
  }
}

const workspaceRoot = findWorkspaceRoot(process.cwd())

const main = async (): Promise<void> => {
  const startedAt = Date.now()
  const trackedFiles = gitTrackedFiles()
  progress("repository inventory", "started")
  const loaded = loadProjectScope({ workspace: ".", cwd: workspaceRoot })
  progress("repository inventory", `passed (${trackedFiles.length} tracked files)`)

  const packetOracleRun = runCommand("recipe-only packet oracle", [
    "exec",
    "tsx",
    "packages/trellis/language-service/src/cli.ts",
    "packets",
    "--workspace",
    ".",
    "--source",
    "trellis",
    "--profile",
    "recipe-only-source",
    "--format",
    "json",
  ], { timeoutMs: 60_000 })
  const packetOracle = parseJson<{
    readonly packetCount: number
    readonly packets: readonly {
      readonly packetId: string
      readonly corePacket: Packet
      readonly ruleName: string
      readonly code: string
    }[]
  }>(packetOracleRun, "recipe-only packet oracle")

  progress("file-accounting oracle", "started")
  const fileAccounting = analyzeFileAccounting(loaded, {
    packetCount: packetOracle.packets.filter((packet) => isFileAccountingPacketFamily(packet.code)).length,
    missingJudgments: 0,
  })
  progress("file-accounting oracle", `passed (${fileAccounting.oracle.unaccountedFiles} unaccounted files)`)

  progress("source-expression oracle", "started")
  const sourceExpression = analyzeSourceExpression(loaded, {
    packetCount: packetOracle.packets.filter((packet) => isSourceExpressionPacketFamily(packet.code)).length,
    missingJudgments: 0,
  })
  progress("source-expression oracle", `passed (${sourceExpression.oracle.packetCount} packets)`)

  const typeScriptSweep = await projectAwareTypeScriptDiagnosticSweep()
  const projectAwareTypeScriptDiagnostics = typeScriptSweep.diagnosticCount
  const packetProtocolTests = runCommand("packet protocol tests", [
    "exec",
    "nx",
    "run",
    "framework-protocol:test",
    "--output-style=static",
  ], { timeoutMs: 30_000 })
  const languageServicePacketTests = runCommand("language-service packet tests", [
    "--dir",
    "packages/trellis/language-service",
    "exec",
    "vitest",
    "run",
    "test/trellis-ls-cli.test.ts",
    "-t",
    "projects deterministic Effect diagnostic packets|projects Trellis architecture diagnostics|judges Trellis architecture packets|broad source-tree ownership|tracked generated code|ambiguous focused recipe",
    "--pool=forks",
    "--maxWorkers=1",
    "--minWorkers=1",
  ], { timeoutMs: 30_000 })

  const baseOracle = fileAccounting.oracle
  const oracle: FileAccountingOracleResult = {
    ...baseOracle,
    trackedFiles: trackedFiles.length,
    packetCount: packetOracle.packetCount,
    projectAwareTypeScriptDiagnostics,
    missingJudgments: 0,
    promotionAllowed: baseOracle.classifiedFiles === trackedFiles.length &&
      baseOracle.accountedFiles === trackedFiles.length &&
      baseOracle.unaccountedFiles === 0 &&
      baseOracle.ambiguousFiles === 0 &&
      baseOracle.unownedSourceFiles === 0 &&
      baseOracle.unownedTestFiles === 0 &&
      baseOracle.unownedGeneratedFiles === 0 &&
      baseOracle.unownedConfigFiles === 0 &&
      baseOracle.unownedDocs === 0 &&
      baseOracle.unownedNixFiles === 0 &&
      baseOracle.unownedSqlFiles === 0 &&
      baseOracle.unownedOpenSpecFiles === 0 &&
      baseOracle.trackedGeneratedCodeFiles === 0 &&
      baseOracle.trackedGeneratedArtifactFiles === 0 &&
      baseOracle.orphanWorkflowTargets === 0 &&
      baseOracle.liveScriptSurfaces === 0 &&
      baseOracle.generatedOutputsWithoutProjectionOwnership === 0 &&
      baseOracle.genericRecipesNeedingSpecialization === 0 &&
      packetOracle.packetCount === 0 &&
      projectAwareTypeScriptDiagnostics === 0,
  }
  const recipeExpression: RecipeExpressionOracleResult = {
    ...sourceExpression.oracle,
    packetCount: packetOracle.packets.filter((packet) => isSourceExpressionPacketFamily(packet.code)).length,
    missingJudgments: 0,
    promotionAllowed: sourceExpression.oracle.unexpressedSourceFiles === 0 &&
      sourceExpression.oracle.stringOnlyIoRecipes === 0 &&
      sourceExpression.oracle.recipesMissingAlchemyResourceIo === 0 &&
      sourceExpression.oracle.recipesMissingTypedHandlers === 0 &&
      sourceExpression.oracle.handlersNotEffectBacked === 0 &&
      sourceExpression.oracle.sideEffectsOutsideEffectRequirements === 0 &&
      sourceExpression.oracle.projectionOutputsWithoutTypedAlchemyResources === 0 &&
      sourceExpression.oracle.managedRecipesWithoutMutatingAlchemyLifecycle === 0 &&
      sourceExpression.oracle.alchemyResourcesWithoutRecipeOwner === 0 &&
      sourceExpression.oracle.managedRecipesMissingLifecycleHandlers === 0 &&
      sourceExpression.oracle.adaptersNotInvokingRecipes === 0 &&
      sourceExpression.oracle.pureModulesUnreachableFromRecipe === 0 &&
      sourceExpression.oracle.sourceFilesMissingLocalRecipes === 0 &&
      sourceExpression.oracle.sourceFilesMissingLocalHandlers === 0 &&
      sourceExpression.oracle.sourceFilesMissingRecipeModules === 0 &&
      sourceExpression.oracle.aggregateRecipesOwningSourceFiles === 0 &&
      sourceExpression.oracle.packageCatalogsMissingLocalModules === 0 &&
      sourceExpression.oracle.recipeHandlersNotFileLocal === 0 &&
      sourceExpression.oracle.recipeHandlersNotDagBound === 0 &&
      sourceExpression.oracle.recipesNotInAlchemyDag === 0 &&
      sourceExpression.oracle.recipeDependenciesNotAlchemyDag === 0 &&
      sourceExpression.oracle.alchemyDagEdgesMissingResources === 0 &&
      sourceExpression.oracle.alchemyResourcesNotProgrammatic === 0 &&
      sourceExpression.oracle.nestedRecipesMissingTypedContracts === 0 &&
      sourceExpression.oracle.recipeDagCycles === 0 &&
      sourceExpression.oracle.stringIdsNotInferred === 0 &&
      sourceExpression.oracle.semanticGroupingStringsUsedAsAuthority === 0 &&
      packetOracle.packets.filter((packet) => isSourceExpressionPacketFamily(packet.code)).length === 0,
  }

  const selectedTargetOracles = packetOracle.packets.map((packet) =>
    selectedTargetOracleFor({
      packet: packet.corePacket,
      remainingTargetIds: packet.corePacket.targets.map((target) => target.id),
    })
  )
  const judgeInput: MigrationJudgeInput = {
    judge: PacketMigrationJudgeRefs.fileAccountingMigration,
    baselineSourceSnapshotId: fileAccounting.snapshot.sourceSnapshotId,
    candidateSourceSnapshotId: fileAccounting.snapshot.sourceSnapshotId,
    packetIds: packetOracle.packets.map((packet) => packet.packetId),
    ruleIds: [...new Set(packetOracle.packets.map((packet) => packet.ruleName))],
    selectedTargetOracles,
    languageServiceDiagnosticCount: packetOracle.packetCount + projectAwareTypeScriptDiagnostics,
    fileAccounting: oracle,
    sourceExpression: recipeExpression,
    receiptIds: [
      `file-accounting:${fileAccounting.snapshot.inventoryHash}`,
      `source-expression:${sourceExpression.snapshot.expressionHash}`,
      `packet-oracle:${packetOracle.packetCount}`,
      `typescript-sweep:${projectAwareTypeScriptDiagnostics}`,
      `project-aware-typescript-configs:${typeScriptSweep.projectCount}`,
    ],
    behaviorEvidence: oracle.packetCount === 0 &&
        recipeExpression.packetCount === 0 &&
        oracle.projectAwareTypeScriptDiagnostics === 0
      ? ["packet oracle, source-expression oracle, and project-aware TypeScript sweep are clean"]
      : [],
    equivalenceEvidence: oracle.packetCount === 0 && recipeExpression.packetCount === 0
      ? ["whole-repo file-accounting and source-expression oracles are clean"]
      : [],
    privacy: defaultPacketPrivacyPolicy(),
  }
  const judgment = judgeMigration(judgeInput)
  const testsPassed = packetProtocolTests.exitCode === 0 && languageServicePacketTests.exitCode === 0
  const typeScriptSweepPassed = projectAwareTypeScriptDiagnostics === 0 &&
    typeScriptSweep.failedProjects.length === 0 &&
    typeScriptSweep.timedOutProjects.length === 0 &&
    typeScriptSweep.malformedProjects.length === 0
  const promotionPassed = judgment.promotionAllowed &&
    oracle.promotionAllowed &&
    recipeExpression.promotionAllowed &&
    testsPassed &&
    typeScriptSweepPassed

  const output: PacketizedArchitectureJudgeOutput = {
    ...oracle,
    validation: {
      repositoryInventory: trackedFiles.length > 0 ? "passed" : "failed",
      fileAccountingOracle: baseOracle.promotionAllowed ? "passed" : "failed",
      sourceExpressionOracle: recipeExpression.promotionAllowed ? "passed" : "failed",
      packetOracle: packetOracleRun.exitCode === 0 && packetOracle.packetCount === 0 ? "passed" : "failed",
      projectAwareTypeScriptSweep: typeScriptSweepPassed ? "passed" : "failed",
      packetProtocolTests: packetProtocolTests.exitCode === 0 ? "passed" : "failed",
      languageServicePacketTests: languageServicePacketTests.exitCode === 0 ? "passed" : "failed",
      promotionGate: promotionPassed ? "passed" : "failed",
    },
    sourceSnapshotId: fileAccounting.snapshot.sourceSnapshotId,
    inventoryHash: fileAccounting.snapshot.inventoryHash,
    recipeExpression,
    expressionHash: sourceExpression.snapshot.expressionHash,
    judgmentId: judgment.judgmentId,
    judgmentStatus: judgment.status,
    promotionStatus: promotionPassed ? "allowed" : "blocked",
    validationDetails: {
      durationMs: Date.now() - startedAt,
      projectAwareTypeScript: typeScriptSweep,
      commandRuns: [
        commandRunSummary(packetOracleRun),
        commandRunSummary(packetProtocolTests),
        commandRunSummary(languageServicePacketTests),
      ],
    },
  }

  await writeStdout(`${JSON.stringify(output, null, 2)}\n`)
  process.exitCode = promotionPassed ? 0 : 1
}

const runCommand = (
  label: string,
  args: readonly string[],
  options: { readonly timeoutMs?: number } = {},
): CommandRun => {
  progress(label, "started")
  const startedAt = Date.now()
  const result = childProcess.spawnSync("pnpm", args, {
    cwd: workspaceRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
    timeout: options.timeoutMs ?? 60_000,
    env: commandEnvironment(),
  })
  const run = {
    label,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    durationMs: Date.now() - startedAt,
    timedOut: result.error?.name === "TimeoutError" || result.signal === "SIGTERM",
  }
  progress(label, `${run.exitCode === 0 ? "passed" : "failed"} (${run.durationMs}ms)`)
  return run
}

const parseJson = <A>(run: CommandRun, label: string): A => {
  try {
    return JSON.parse(run.stdout) as A
  } catch (error) {
    throw new Error(`${label} did not emit parseable JSON (exit ${run.exitCode}): ${String(error)}\n${run.stderr}`)
  }
}

const runCommandAsync = (
  label: string,
  args: readonly string[],
  options: { readonly timeoutMs?: number } = {},
): Promise<CommandRun> => {
  progress(label, "started")
  const startedAt = Date.now()
  return new Promise((resolve) => {
    const child = childProcess.execFile(
      "pnpm",
      [...args],
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 16,
        timeout: options.timeoutMs ?? 30_000,
        env: commandEnvironment(),
      },
      (error, stdout, stderr) => {
        const exitCode = typeof (error as { readonly code?: unknown } | null)?.code === "number"
          ? (error as { readonly code: number }).code
          : error === null
          ? 0
          : 1
        const timedOut = (error as { readonly killed?: boolean; readonly signal?: unknown } | null)?.killed === true ||
          (error as { readonly signal?: unknown } | null)?.signal === "SIGTERM"
        const run: CommandRun = {
          label,
          exitCode,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
          timedOut,
        }
        progress(label, `${run.exitCode === 0 ? "passed" : "failed"} (${run.durationMs}ms)`)
        resolve(run)
      },
    )
    child.on("error", (error) => {
      const run: CommandRun = {
        label,
        exitCode: 1,
        stdout: "",
        stderr: String(error),
        durationMs: Date.now() - startedAt,
        timedOut: false,
      }
      progress(label, `failed (${run.durationMs}ms)`)
      resolve(run)
    })
  })
}

const projectAwareTypeScriptDiagnosticSweep = async (): Promise<TypeScriptDiagnosticSweep> => {
  const projects = tsconfigPaths()
  const concurrency = Math.max(
    1,
    Math.min(2, Number.parseInt(process.env.ATTUNE_PACKETIZED_JUDGE_TS_CONCURRENCY ?? "2", 10) || 1),
  )
  let nextProject = 0
  let diagnosticCount = 0
  const failedProjects: string[] = []
  const timedOutProjects: string[] = []
  const malformedProjects: string[] = []
  const projectDiagnostics: {
    project: string
    diagnosticCount: number
  }[] = []

  progress("project-aware TypeScript sweep", `started (${projects.length} configs, concurrency ${concurrency})`)
  const runNext = async (): Promise<void> => {
    while (nextProject < projects.length) {
      const tsconfig = projects[nextProject]
      nextProject += 1
      if (tsconfig === undefined) continue
      const run = await runCommandAsync(`typescript diagnostics ${tsconfig}`, [
        "exec",
        "tsx",
        "packages/trellis/language-service/src/cli.ts",
        "diagnostics",
        "--project",
        tsconfig,
        "--source",
        "typescript",
        "--format",
        "json",
      ], { timeoutMs: 30_000 })
      if (run.timedOut) {
        timedOutProjects.push(tsconfig)
        projectDiagnostics.push({ project: tsconfig, diagnosticCount: 1 })
        diagnosticCount += 1
        continue
      }
      if (run.exitCode !== 0) {
        failedProjects.push(tsconfig)
        projectDiagnostics.push({ project: tsconfig, diagnosticCount: 1 })
        diagnosticCount += 1
        continue
      }
      try {
        const output = JSON.parse(run.stdout) as { readonly diagnostics?: readonly unknown[] }
        const projectDiagnosticCount = output.diagnostics?.length ?? 1
        projectDiagnostics.push({ project: tsconfig, diagnosticCount: projectDiagnosticCount })
        diagnosticCount += projectDiagnosticCount
      } catch {
        malformedProjects.push(tsconfig)
        projectDiagnostics.push({ project: tsconfig, diagnosticCount: 1 })
        diagnosticCount += 1
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, projects.length) }, () => runNext()))
  progress("project-aware TypeScript sweep", `${diagnosticCount === 0 ? "passed" : "failed"} (${diagnosticCount} diagnostics)`)
  return {
    diagnosticCount,
    projectCount: projects.length,
    projectDiagnostics: projectDiagnostics
      .filter((project) => project.diagnosticCount > 0)
      .sort((left, right) => left.project.localeCompare(right.project)),
    failedProjects,
    timedOutProjects,
    malformedProjects,
  }
}

const commandEnvironment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CI: "1",
    NO_COLOR: "1",
    NX_DAEMON: "false",
  }
  delete env.FORCE_COLOR
  return env
}

const commandRunSummary = (run: CommandRun) => ({
  label: run.label,
  exitCode: run.exitCode,
  durationMs: run.durationMs,
  timedOut: run.timedOut,
})

const progress = (label: string, status: string): void => {
  process.stderr.write(`[packetized-architecture-judge] ${label}: ${status}\n`)
}

const tsconfigPaths = (): readonly string[] =>
  findFiles(path.join(workspaceRoot, "packages"))
    .map((file) => path.relative(workspaceRoot, file).replaceAll(path.sep, "/"))
    .filter((file) => /(^|\/)tsconfig(?:\.[^/]+)?\.json$/u.test(file))
    .sort()

const gitTrackedFiles = (): readonly string[] =>
  childProcess.execFileSync("git", ["ls-files"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/u)
    .filter(Boolean)
    .sort()

const writeStdout = (text: string): Promise<void> =>
  new Promise((resolve, reject) => {
    process.stdout.write(text, (error) => {
      if (error !== undefined && error !== null) {
        reject(error)
        return
      }
      resolve()
    })
  })

function findWorkspaceRoot(start: string): string {
  let current = path.resolve(start)
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "nx.json")) || fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current
    }
    current = path.dirname(current)
  }
  return path.resolve(start)
}

const findFiles = (root: string): readonly string[] => {
  if (!fs.existsSync(root)) return []
  const files: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if ([".attune", ".git", ".nx", "dist", "node_modules"].includes(entry.name)) continue
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(fullPath)
      } else {
        files.push(fullPath)
      }
    }
  }
  visit(root)
  return files
}

export const ArchitecturePacketizedJudgeInvocationRecipeId =
  "attune-architecture.packetized-architecture-judge-invocation" as const
export const ArchitecturePacketizedJudgeRecipeId =
  "attune-architecture.packetized-architecture-judge" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitecturePacketizedJudgeSourcePath =
  "packages/trellis/architecture/src/internal/checks/PacketizedArchitectureJudgeCli.ts" as const

const ArchitecturePacketizedJudgeInput = Schema.Struct({
  workspaceRoot: Schema.String,
  recipeId: Schema.String,
})
type ArchitecturePacketizedJudgeInput = typeof ArchitecturePacketizedJudgeInput.Type

const ArchitecturePacketizedJudgeOutput = Schema.Struct({
  scriptPath: Schema.String,
  invocationModel: Schema.Literal("RecipeInvocation"),
  validationTargetHandles: Schema.Array(Schema.String),
})
type ArchitecturePacketizedJudgeOutput = typeof ArchitecturePacketizedJudgeOutput.Type

export const projectPacketizedArchitectureJudgeInvocation = (
  _input: ArchitecturePacketizedJudgeInput,
): ArchitecturePacketizedJudgeOutput => ({
  scriptPath: ArchitecturePacketizedJudgeSourcePath,
  invocationModel: "RecipeInvocation",
  validationTargetHandles: ["workspace:packetized-architecture-judge"],
})

export const ArchitecturePacketizedJudgeRuntimeLayer = defineRecipeLayer({
  id: "attune-architecture.packetized-architecture-judge.runtime.layer",
  sourcePath: ArchitecturePacketizedJudgeSourcePath,
  exportName: "main",
  layer: Layer.empty as never,
  provides: [
    { id: "filesystem", service: "node:fs" },
    { id: "process", service: "node:child_process" },
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitecturePacketizedJudgeInputResource = defineAlchemyResource({
  id: "attune-architecture.packetized-architecture-judge.input",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    ArchitecturePacketizedJudgeInvocationRecipeId,
    ArchitecturePacketizedJudgeRecipeId,
  ],
  addressSchema: ArchitecturePacketizedJudgeInput,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/trellis/architecture/src"),
  }),
  modes: ["read", "check"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitecturePacketizedJudgeReportResource = defineAlchemyResource({
  id: "attune-architecture.packetized-architecture-judge.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitecturePacketizedJudgeRecipeId,
  producedBy: [
    ArchitecturePacketizedJudgeInvocationRecipeId,
    ArchitecturePacketizedJudgeRecipeId,
  ],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitecturePacketizedJudgeInput,
  stateSchema: ArchitecturePacketizedJudgeOutput,
  modes: ["project", "observe"],
})

const ArchitecturePacketizedJudgeInvocationDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitecturePacketizedJudgeInvocationRecipeId,
  toRecipeId: ArchitecturePacketizedJudgeRecipeId,
  resource: ArchitecturePacketizedJudgeReportResource,
  kind: "invokes",
  modes: ["invoke", "observe"],
})

const ArchitecturePacketizedJudgeDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitecturePacketizedJudgeRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitecturePacketizedJudgeReportResource,
  kind: "judges",
  modes: ["check", "observe"],
})

export const ArchitecturePacketizedJudgeInvocationRecipe = defineInvocationRecipe({
  id: "attune-architecture.packetized-architecture-judge-invocation",
  projectId: "attune-architecture",
  title: "Expose whole-repo packetized architecture judge as a typed workspace target",
  inputSchema: ArchitecturePacketizedJudgeInput,
  outputSchema: ArchitecturePacketizedJudgeOutput,
  nxTarget: "workspace:packetized-architecture-judge",
  entrypoints: [ArchitecturePacketizedJudgeSourcePath],
  allowedFiles: [ArchitecturePacketizedJudgeSourcePath, "project.json"],
  validationEvidence: ["workspace:packetized-architecture-judge"],
  publicTargets: [{
    kind: "check",
    target: "workspace:packetized-architecture-judge",
    evidenceRequirements: ["nx run workspace:packetized-architecture-judge"],
  }],
  io: {
    inputSchema: ArchitecturePacketizedJudgeInput,
    outputSchema: ArchitecturePacketizedJudgeOutput,
    inputResources: [ArchitecturePacketizedJudgeInputResource],
    outputResources: [ArchitecturePacketizedJudgeReportResource],
  },
  handler: defineRecipeHandler<ArchitecturePacketizedJudgeInput, ArchitecturePacketizedJudgeOutput>({
    id: "attune-architecture.packetized-architecture-judge-invocation.handler",
    recipeId: ArchitecturePacketizedJudgeInvocationRecipeId,
    sourcePath: ArchitecturePacketizedJudgeSourcePath,
    exportName: "projectPacketizedArchitectureJudgeInvocation",
    handler: (input) => Effect.succeed(projectPacketizedArchitectureJudgeInvocation(input)),
    layer: ArchitecturePacketizedJudgeRuntimeLayer,
    emitsReceipts: ["attune-architecture.packetized-architecture-judge-invocation.projected"],
  }),
  alchemyDag: [ArchitecturePacketizedJudgeInvocationDagEdge],
})

export const ArchitecturePacketizedJudgeRecipe = defineJudgeRecipe({
  id: "attune-architecture.packetized-architecture-judge",
  projectId: "attune-architecture",
  title: "Judge whole-repo file accounting for packetized recipe invocation migration",
  inputSchema: ArchitecturePacketizedJudgeInput,
  outputSchema: ArchitecturePacketizedJudgeOutput,
  nxTarget: "workspace:packetized-architecture-judge",
  observedFiles: [
    "project.json",
    "packages/trellis/protocol/src/packets/index.ts",
    "packages/trellis/language-service/src/file-accounting.ts",
    "packages/trellis/language-service/src/cli-core.ts",
    "packages/trellis/language-service/src/cli.ts",
    "packages/trellis/language-service/src/contracts.ts",
    "openspec/changes/packetized-recipe-invocation-architecture/**",
  ],
  allowedFiles: [
    ArchitecturePacketizedJudgeSourcePath,
    "packages/trellis/protocol/src/packets/index.ts",
    "packages/trellis/language-service/src/file-accounting.ts",
    "packages/trellis/language-service/src/cli-core.ts",
    "packages/trellis/language-service/src/cli.ts",
    "packages/trellis/language-service/src/contracts.ts",
    "openspec/changes/packetized-recipe-invocation-architecture/**",
  ],
  validationEvidence: ["workspace:packetized-architecture-judge"],
  io: {
    inputSchema: ArchitecturePacketizedJudgeInput,
    outputSchema: ArchitecturePacketizedJudgeOutput,
    inputResources: [ArchitecturePacketizedJudgeInputResource],
    outputResources: [ArchitecturePacketizedJudgeReportResource],
  },
  handler: defineRecipeHandler<ArchitecturePacketizedJudgeInput, ArchitecturePacketizedJudgeOutput>({
    id: "attune-architecture.packetized-architecture-judge.handler",
    recipeId: ArchitecturePacketizedJudgeRecipeId,
    sourcePath: ArchitecturePacketizedJudgeSourcePath,
    exportName: "projectPacketizedArchitectureJudgeInvocation",
    handler: (input) => Effect.succeed(projectPacketizedArchitectureJudgeInvocation(input)),
    layer: ArchitecturePacketizedJudgeRuntimeLayer,
    emitsReceipts: ["attune-architecture.packetized-architecture-judge.judged"],
  }),
  alchemyDag: [ArchitecturePacketizedJudgeDagEdge],
})

export const ArchitecturePacketizedJudgeRecipes = [
  ArchitecturePacketizedJudgeInvocationRecipe,
  ArchitecturePacketizedJudgeRecipe,
] as const

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main()
}

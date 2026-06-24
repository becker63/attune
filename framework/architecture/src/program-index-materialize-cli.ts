#!/usr/bin/env node
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { materializeNxProjectGraphIntoProgramIndex } from "@attune/framework-nx"
import {
  createSqliteProgramIndex,
  defaultProgramIndexPath,
  type ProgramIndexApi,
} from "@attune/framework-sqlite"
import {
  materializeCompatibilityRows,
  materializeProgramSourceIndex,
} from "@attune/framework-runtime"
import { Effect } from "effect"

export interface ProgramIndexMaterializeOptions {
  readonly workspaceRoot?: string
  readonly indexPath?: string
  readonly project?: string
  readonly now?: string
  readonly preferCached?: boolean
}

export interface ProgramIndexMaterializeResult {
  readonly kind: "attune.program-index.materialize"
  readonly indexPath: string
  readonly project: string | null
  readonly projects: number
  readonly targets: number
  readonly sourceFiles: number
  readonly symbols: number
  readonly schemaDescriptors: number
  readonly edges: number
  readonly artifacts: number
  readonly observations: number
  readonly diagnostics: number
  readonly repairs: number
}

export const materializeWorkspaceProgramIndex = async (
  options: ProgramIndexMaterializeOptions = {},
): Promise<ProgramIndexMaterializeResult> => {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd())
  const previousCwd = process.cwd()
  const indexPath = options.indexPath ?? defaultProgramIndexPath
  const now = options.now ?? new Date().toISOString()
  let index: ProgramIndexApi | undefined

  process.chdir(workspaceRoot)
  try {
    index = createSqliteProgramIndex({ path: indexPath })
    await Effect.runPromise(index.initialize())
    const graphRows = await Effect.runPromise(
      materializeNxProjectGraphIntoProgramIndex(index, {
        preferCached: options.preferCached ?? true,
        now,
      }),
    )

    for (const project of graphRows.projects) {
      if (options.project !== undefined && project.id !== options.project) continue
      if (!isAttuneProject(workspaceRoot, project.root)) continue

      const sourceFiles = collectTypeScriptSourceFiles(
        workspaceRoot,
        project.sourceRoot ?? `${project.root}/src`,
      )
      if (sourceFiles.length > 0) {
        await Effect.runPromise(
          materializeProgramSourceIndex(index, {
            projectId: project.id,
            sourceFiles,
            now,
          }),
        )
      }

      const compatibilityPaths = existingCompatibilityArtifactPaths(
        workspaceRoot,
        project.id,
        project.root,
      )
      if (compatibilityPaths.length > 0) {
        await materializeCompatibilityArtifacts(index, {
          projectId: project.id,
          root: project.root,
          paths: compatibilityPaths,
          now,
        })
      }
    }

    const reportArtifacts = checkedInReportArtifactPaths(workspaceRoot)
    if (reportArtifacts.length > 0) {
      await materializeCompatibilityArtifacts(index, {
        projectId: "workspace",
        root: ".",
        paths: reportArtifacts,
        now,
      })
    }

    const health = await Effect.runPromise(index.health())
    return {
      kind: "attune.program-index.materialize",
      indexPath: health.path,
      project: options.project ?? null,
      projects: health.rowCounts.projects,
      targets: health.rowCounts.targets,
      sourceFiles: health.rowCounts.sourceFiles,
      symbols: health.rowCounts.symbols,
      schemaDescriptors: health.rowCounts.schemaDescriptors,
      edges: health.rowCounts.edges,
      artifacts: health.rowCounts.artifacts,
      observations: health.rowCounts.observations,
      diagnostics: health.rowCounts.diagnostics,
      repairs: health.rowCounts.repairs,
    }
  } finally {
    if (index !== undefined) {
      await Effect.runPromise(index.close()).catch(() => undefined)
    }
    process.chdir(previousCwd)
  }
}

export const runProgramIndexMaterializeCli = async (
  argv: readonly string[] = process.argv,
  writeLine: (line: string) => void = console.log,
  writeError: (line: string) => void = console.error,
): Promise<number> => {
  const options = parseProgramIndexMaterializeArgs(argv.slice(2))
  try {
    const result = await materializeWorkspaceProgramIndex(options)
    writeLine(`ATTUNE_PROGRAM_INDEX_SUMMARY ${JSON.stringify(result)}`)
    return 0
  } catch (error) {
    writeError(error instanceof Error ? error.message : String(error))
    return 1
  }
}

const parseProgramIndexMaterializeArgs = (
  args: readonly string[],
): ProgramIndexMaterializeOptions => {
  let workspaceRoot: string | undefined
  let indexPath: string | undefined
  let project: string | undefined
  let preferCached: boolean | undefined

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === undefined) continue

    if (arg === "--index-path") {
      indexPath = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith("--index-path=")) {
      indexPath = arg.slice("--index-path=".length)
      continue
    }
    if (arg === "--project") {
      project = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith("--project=")) {
      project = arg.slice("--project=".length)
      continue
    }
    if (arg === "--prefer-cached=false") {
      preferCached = false
      continue
    }
    if (!arg.startsWith("--") && workspaceRoot === undefined) {
      workspaceRoot = arg
    }
  }

  return {
    ...(workspaceRoot === undefined ? {} : { workspaceRoot }),
    ...(indexPath === undefined ? {} : { indexPath }),
    ...(project === undefined ? {} : { project }),
    ...(preferCached === undefined ? {} : { preferCached }),
  }
}

const isAttuneProject = (workspaceRoot: string, projectRoot: string): boolean =>
  fs.existsSync(path.join(workspaceRoot, projectRoot, "src", "attune.package.ts"))

const collectTypeScriptSourceFiles = (
  workspaceRoot: string,
  sourceRoot: string,
): readonly string[] => {
  const absoluteSourceRoot = path.join(workspaceRoot, sourceRoot)
  if (!fs.existsSync(absoluteSourceRoot)) return []

  const out: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === "dist" || entry.name === "node_modules") continue
        visit(absolutePath)
        continue
      }
      if (!entry.isFile() || !/\.[cm]?tsx?$/u.test(entry.name)) continue
      out.push(path.relative(workspaceRoot, absolutePath).replaceAll(path.sep, "/"))
    }
  }

  visit(absoluteSourceRoot)
  return out.sort()
}

const existingCompatibilityArtifactPaths = (
  workspaceRoot: string,
  projectId: string,
  projectRoot: string,
): readonly string[] => {
  const candidates = [
    `${projectRoot}/src/attune.package.ts`,
    `${projectRoot}/src/attune.contract.generated.ts`,
    `${projectRoot}/src/attune.generated.ts`,
    `${projectRoot}/src/attune.package.typecheck.ts`,
    `${projectRoot}/attune.source-bom.json`,
    `.attune/cache/source-bom/${projectId}.json`,
    `framework/architecture/src/generated/source-bom/${projectId}.json`,
    `framework/architecture/src/generated/package-contracts/${projectId}/attune.generated.ts`,
    `framework/architecture/src/generated/package-contracts/${projectId}/attune.contract.generated.ts`,
    "framework/architecture/src/generated/package-contracts.typecheck.generated.ts",
  ]

  return candidates
    .filter((candidate) => fs.existsSync(path.join(workspaceRoot, candidate)))
    .sort()
}

const checkedInReportArtifactPaths = (workspaceRoot: string): readonly string[] => {
  const out: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignoredReportDirectories.has(entry.name)) continue
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath)
        continue
      }
      if (!entry.isFile()) continue
      const relativePath = path.relative(workspaceRoot, absolutePath).replaceAll(path.sep, "/")
      if (isCheckedInReportArtifactPath(relativePath)) out.push(relativePath)
    }
  }

  visit(workspaceRoot)
  return out.sort()
}

const ignoredReportDirectories = new Set([
  ".git",
  ".nx",
  "coverage",
  "dist",
  "node_modules",
  "tmp",
  "temp",
])

const isCheckedInReportArtifactPath = (path: string): boolean =>
  /(^|\/)(reports?|artifacts?|agent-output|protocol-output)(\/|$)|\b(protocol[-_. ]?delta|obligation[-_. ]?(report|summary|status)|evidence[-_. ]?(summary|report|status)|architecture[-_. ]?(summary|report|status)|cloud[-_. ]?agent[-_. ]?(summary|report|status)|(fuzz|fuzzer|property|proof|run)[-_. ]?(report|summary|status)|(report|summary|status)[-_. ]?(fuzz|fuzzer|property|proof|run))\b/iu.test(path)

const materializeCompatibilityArtifacts = async (
  index: ProgramIndexApi,
  input: {
    readonly projectId: string
    readonly root: string
    readonly paths: readonly string[]
    readonly now: string
  },
): Promise<void> => {
  const contentByPath = Object.fromEntries(
    input.paths.map((artifactPath) => [
      artifactPath,
      fs.readFileSync(artifactPath, "utf8"),
    ]),
  )
  await Effect.runPromise(
    materializeCompatibilityRows(index, {
      projectId: input.projectId,
      root: input.root,
      paths: input.paths,
      contentByPath,
      now: input.now,
    }),
  )
}

const isDirectRun = (): boolean => {
  const invokedPath = process.argv[1]
  return invokedPath !== undefined && path.resolve(invokedPath) === fileURLToPath(import.meta.url)
}

if (isDirectRun()) {
  runProgramIndexMaterializeCli().then((exitCode) => {
    process.exitCode = exitCode
  })
}

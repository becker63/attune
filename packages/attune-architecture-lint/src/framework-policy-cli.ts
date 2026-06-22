#!/usr/bin/env node
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
  checkFrameworkImportBoundary,
  type FrameworkImportBoundaryDiagnostic,
  type FrameworkImportBoundaryFile,
} from "./framework-import-boundary.js"
import {
  checkFrameworkNoReportPolicy,
  type FrameworkNoReportDiagnostic,
  type FrameworkNoReportFile,
} from "./framework-no-report-policy.js"

interface WorkspaceFile {
  readonly path: string
  readonly content: string
}

export interface FrameworkPolicyWorkspaceResult {
  readonly importDiagnostics: readonly FrameworkImportBoundaryDiagnostic[]
  readonly noReportDiagnostics: readonly FrameworkNoReportDiagnostic[]
  readonly outputLines: readonly string[]
  readonly exitCode: number
}

const sourceFilePattern = /\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/u
const reportFilePattern = /\.(json|jsonc|md|mdx|txt)$/u
const ignoredDirs = new Set([
  ".git",
  ".nx",
  "coverage",
  "dist",
  "node_modules",
  "tmp",
  "temp",
])

const reportPathPattern =
  /(^|\/)(reports?|artifacts?|agent-output|protocol-output|\.attune\/protocol)(\/|$)|\b(protocol[-_. ]?delta|delta[-_. ]?report|obligation[-_. ]?(report|summary|status)|evidence[-_. ]?(summary|report|status)|architecture[-_. ]?(summary|report|status)|cloud[-_. ]?agent[-_. ]?(summary|report|status)|github[-_. ]?(summary|report|status)|linear[-_. ]?(summary|report|status))\b/iu

export const checkFrameworkPolicyWorkspace = (root: string): FrameworkPolicyWorkspaceResult => {
  const workspaceRoot = path.resolve(root)
  const files = collectFiles(workspaceRoot)

  const importResultRaw = checkFrameworkImportBoundary({
    files: files
      .filter((file) => sourceFilePattern.test(file.path))
      .map((file): FrameworkImportBoundaryFile => ({ path: file.path, content: file.content })),
  })
  const importDiagnostics = importResultRaw.diagnostics.filter(
    (diagnostic) => !isTemporaryFrameworkPolicyWaiver(diagnostic.filePath, diagnostic.importSource),
  )

  const noReportResult = checkFrameworkNoReportPolicy({
    files: files
      .filter(isProtocolReportCandidate)
      .map((file): FrameworkNoReportFile => ({ path: file.path, content: file.content })),
  })

  const outputLines = [
    ...importDiagnostics.map(formatImportDiagnostic),
    ...noReportResult.diagnostics.map(formatNoReportDiagnostic),
  ]

  return {
    importDiagnostics,
    noReportDiagnostics: noReportResult.diagnostics,
    outputLines,
    exitCode: outputLines.length > 0 ? 1 : 0,
  }
}

export const runFrameworkPolicyCli = (
  argv: readonly string[] = process.argv,
  writeLine: (line: string) => void = console.log,
): number => {
  const workspaceRoot = path.resolve(argv[2] ?? process.cwd())
  const result = checkFrameworkPolicyWorkspace(workspaceRoot)

  for (const line of result.outputLines) {
    writeLine(line)
  }

  return result.exitCode
}

if (isCliEntryPoint(import.meta.url, process.argv[1])) {
  process.exitCode = runFrameworkPolicyCli()
}

function collectFiles(root: string): readonly WorkspaceFile[] {
  const out: WorkspaceFile[] = []

  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoredDirs.has(entry.name)) continue

      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath)
        continue
      }

      if (!entry.isFile()) continue
      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/")
      if (!sourceFilePattern.test(relativePath) && !reportFilePattern.test(relativePath)) continue

      out.push({
        path: relativePath,
        content: fs.readFileSync(absolutePath, "utf8"),
      })
    }
  }

  visit(root)
  return out
}

function isProtocolReportCandidate(file: WorkspaceFile): boolean {
  const normalizedPath = file.path.replaceAll("\\", "/")
  if (normalizedPath.startsWith(".attune/cache/") || normalizedPath.startsWith(".nx/cache/")) {
    return true
  }

  return reportFilePattern.test(normalizedPath) && reportPathPattern.test(normalizedPath)
}

function isTemporaryFrameworkPolicyWaiver(filePath: string, importSource: string): boolean {
  return (
    filePath === "packages/attune-architecture-lint/src/framework-import-boundary.ts" ||
    (
      filePath === "packages/attuned-discovery/src/memory/schema.ts" &&
      importSource === "drizzle-orm/pg-core"
    )
  )
}

function formatImportDiagnostic(diagnostic: FrameworkImportBoundaryDiagnostic): string {
  return [
    "ERROR",
    diagnostic.ruleId,
    diagnostic.code,
    diagnostic.filePath,
    diagnostic.message,
  ].join(" ")
}

function formatNoReportDiagnostic(diagnostic: FrameworkNoReportDiagnostic): string {
  return [
    "ERROR",
    diagnostic.ruleId,
    diagnostic.category,
    diagnostic.filePath,
    diagnostic.message,
  ].join(" ")
}

function isCliEntryPoint(moduleUrl: string, entryPoint: string | undefined): boolean {
  return entryPoint !== undefined && path.resolve(fileURLToPath(moduleUrl)) === path.resolve(entryPoint)
}

import * as fs from "node:fs"

import type { TrellisLsDiagnostic, TrellisLsTextEdit } from "../contracts.js"
import { stableTrellisLsId } from "../ids.js"
import { relativeToWorkspace } from "../project-loader.js"

export interface UpstreamEffectFixCandidate {
  readonly fixId: string
  readonly diagnosticId: string
  readonly title: string
  readonly preview: string
  readonly edits: readonly TrellisLsTextEdit[]
}

export interface UpstreamEffectDiagnosticResult {
  readonly diagnostics: readonly TrellisLsDiagnostic[]
  readonly fixes: readonly UpstreamEffectFixCandidate[]
}

export const upstreamEffectSource = {
  repository: "https://github.com/Effect-TS/language-service",
  commit: "df50dfce9ab8b299f6d21c35c231bcc12cbca4ee",
  packageVersion: "0.86.2",
} as const

export const collectUpstreamEffectDiagnostics = (input: {
  readonly workspaceRoot: string
  readonly fileNames: readonly string[]
}): UpstreamEffectDiagnosticResult => {
  const diagnostics: TrellisLsDiagnostic[] = []
  const fixes: UpstreamEffectFixCandidate[] = []

  for (const fileName of input.fileNames) {
    if (!fs.existsSync(fileName)) continue
    const text = fs.readFileSync(fileName, "utf8")
    const lineStarts = computeLineStarts(text)
    const lines = text.split(/\r?\n/u)
    lines.forEach((line, index) => {
      const match = /^(\s*)Effect\.(?!gen\b)([A-Za-z]\w*)\s*\(/u.exec(line)
      if (match === null) return
      const previousSignificantLine = [...lines.slice(0, index)]
        .reverse()
        .find((candidate) => candidate.trim() !== "")
      if (previousSignificantLine?.trimEnd().endsWith("=>") === true) {
        return
      }
      const method = match[2] ?? "unknown"
      if (
        method === "runPromise" ||
        method === "runSync" ||
        method === "map" ||
        method === "flatMap" ||
        method === "catch" ||
        method === "catchAll"
      ) {
        return
      }
      if (line.trimEnd().endsWith(",")) return

      const start = (lineStarts[index] ?? 0) + (match[1]?.length ?? 0)
      const end = start + line.trimStart().length
      const relativeFile = relativeToWorkspace(input.workspaceRoot, fileName)
      const id = stableTrellisLsId("diag", [
        "effect",
        "effect/floatingEffect",
        relativeFile,
        start,
        end,
        line.trim(),
      ])
      const fixId = stableTrellisLsId("fix", [
        id,
        "text-edit",
        "effect/floatingEffect/void",
        relativeFile,
        start,
      ])

      diagnostics.push({
        id,
        source: "effect",
        code: "effect/floatingEffect",
        severity: "warning",
        message: "Effect expression is not returned, yielded, awaited, or explicitly discarded.",
        file: relativeFile,
        span: {
          start,
          end,
          startLine: index + 1,
          startColumn: (match[1]?.length ?? 0) + 1,
          endLine: index + 1,
          endColumn: line.length + 1,
        },
        repairIds: [fixId],
        tags: ["effect", "upstream-effect", "quickfix"],
      })
      fixes.push({
        fixId,
        diagnosticId: id,
        title: "Mark floating Effect as intentionally discarded",
        preview: "Adds `void ` before the Effect expression.",
        edits: [{
          file: fileName,
          start,
          end: start,
          newText: "void ",
        }],
      })
    })
  }

  return { diagnostics, fixes }
}

const computeLineStarts = (text: string): readonly number[] => {
  const starts = [0]
  for (let index = 0; index < text.length; index++) {
    if (text[index] === "\n") starts.push(index + 1)
  }
  return starts
}

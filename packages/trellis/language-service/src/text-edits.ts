import * as fs from "node:fs"
import * as path from "node:path"

import type { TrellisLsTextEdit } from "./contracts.js"

export const applyTextEditsToText = (
  text: string,
  edits: readonly Omit<TrellisLsTextEdit, "file">[],
): string => {
  const sorted = [...edits].sort((left, right) => right.start - left.start)
  return sorted.reduce(
    (current, edit) =>
      `${current.slice(0, edit.start)}${edit.newText}${current.slice(edit.end)}`,
    text,
  )
}

export const applyTextEditsToFiles = (
  edits: readonly TrellisLsTextEdit[],
): void => {
  const byFile = new Map<string, TrellisLsTextEdit[]>()
  for (const edit of edits) {
    byFile.set(edit.file, [...(byFile.get(edit.file) ?? []), edit])
  }

  for (const [file, fileEdits] of byFile) {
    const before = fs.readFileSync(file, "utf8")
    const after = applyTextEditsToText(before, fileEdits)
    fs.writeFileSync(file, after)
  }
}

export const unifiedDiffForEdits = (
  workspaceRoot: string,
  edits: readonly TrellisLsTextEdit[],
): string => {
  const byFile = new Map<string, TrellisLsTextEdit[]>()
  for (const edit of edits) {
    byFile.set(edit.file, [...(byFile.get(edit.file) ?? []), edit])
  }

  return [...byFile.entries()]
    .map(([file, fileEdits]) => {
      const before = fs.readFileSync(file, "utf8")
      const after = applyTextEditsToText(before, fileEdits)
      const relative = path.relative(workspaceRoot, file)
      return [
        `--- a/${relative}`,
        `+++ b/${relative}`,
        "@@",
        ...prefixLines("-", before),
        ...prefixLines("+", after),
      ].join("\n")
    })
    .join("\n")
}

const prefixLines = (prefix: string, text: string): readonly string[] =>
  text.split(/\r?\n/u).map((line) => `${prefix}${line}`)

import * as fs from "node:fs"
import * as path from "node:path"

import { Effect, Layer } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"

import type { TrellisLsTextEdit } from "./contracts.js"
import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceApplyOutput,
  LanguageServiceApplyResource,
  LanguageServiceFixesResource,
  LanguageServiceProjectionInput,
} from "./contracts.js"

export const LanguageServiceTextEditsSourcePath = "packages/trellis/language-service/src/text-edits.ts" as const

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
  for (const edit of uniqueTextEdits(edits)) {
    byFile.set(edit.file, [...(byFile.get(edit.file) ?? []), edit])
  }

  for (const [file, fileEdits] of byFile) {
    const before = fs.readFileSync(file, "utf8")
    const after = applyTextEditsToText(before, fileEdits)
    fs.writeFileSync(file, after)
  }
}

export const deleteFilesFromWorkspace = (
  files: readonly string[],
): void => {
  for (const file of [...new Set(files)]) {
    if (fs.existsSync(file)) {
      fs.rmSync(file)
    }
  }
}

export const unifiedDiffForEdits = (
  workspaceRoot: string,
  edits: readonly TrellisLsTextEdit[],
): string => {
  const byFile = new Map<string, TrellisLsTextEdit[]>()
  for (const edit of uniqueTextEdits(edits)) {
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

export const unifiedDiffForFileDeletes = (
  workspaceRoot: string,
  files: readonly string[],
): string =>
  [...new Set(files)]
    .filter((file) => fs.existsSync(file))
    .map((file) => {
      const before = fs.readFileSync(file, "utf8")
      const relative = path.relative(workspaceRoot, file)
      return [
        `--- a/${relative}`,
        "+++ /dev/null",
        "@@",
        ...prefixLines("-", before),
      ].join("\n")
    })
    .join("\n")

export const unifiedDiffForWorkspaceChanges = (
  workspaceRoot: string,
  input: {
    readonly edits?: readonly TrellisLsTextEdit[]
    readonly deleteFiles?: readonly string[]
  },
): string =>
  [
    input.edits === undefined || input.edits.length === 0
      ? ""
      : unifiedDiffForEdits(workspaceRoot, input.edits),
    input.deleteFiles === undefined || input.deleteFiles.length === 0
      ? ""
      : unifiedDiffForFileDeletes(workspaceRoot, input.deleteFiles),
  ].filter((part) => part.length > 0).join("\n")

const prefixLines = (prefix: string, text: string): readonly string[] =>
  text.split(/\r?\n/u).map((line) => `${prefix}${line}`)

const uniqueTextEdits = (
  edits: readonly TrellisLsTextEdit[],
): readonly TrellisLsTextEdit[] =>
  [
    ...new Map(edits.map((edit) => [
      [edit.file, edit.start, edit.end, edit.newText].join("\0"),
      edit,
    ])).values(),
  ]

const languageServiceTextEditsLayer = defineRecipeLayer({
  id: "trellis-language-service.text-edits.layer",
  sourcePath: LanguageServiceTextEditsSourcePath,
  exportName: "languageServiceTextEditsLayer",
  layer: Layer.empty as never,
  provides: [{
    id: "trellis-language-service.text-edits-filesystem",
    service: "Effect.Platform.FileSystem",
  }],
})

const languageServiceApplyResultHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceApplyOutput
>({
  id: "trellis-language-service.apply-result-json-projection.handler",
  recipeId: "trellis-language-service.apply-result-json-projection",
  sourcePath: LanguageServiceTextEditsSourcePath,
  exportName: "applyTextEditsToFiles",
  layer: languageServiceTextEditsLayer,
  handler: () =>
    Effect.succeed({
      applied: false,
      refused: false,
      affectedFileCount: 0,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceApplyResultDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.repair-plan",
  toRecipeId: "trellis-language-service.apply-result-json-projection",
  resource: LanguageServiceApplyResource,
  kind: "projects",
  modes: ["project"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceApplyResultRecipe = defineProjectionRecipe({
  id: "trellis-language-service.apply-result-json-projection",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Preview or apply one safe Trellis language-service fix",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceApplyOutput,
  allowedFiles: [LanguageServiceTextEditsSourcePath],
  outputs: ["TrellisLsApplyOutput"],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceApplyOutput,
    inputResources: [LanguageServiceFixesResource],
    outputResources: [LanguageServiceApplyResource],
  },
  handler: languageServiceApplyResultHandler,
  alchemyDag: [languageServiceApplyResultDag],
})

export const LanguageServiceTextEditRecipes = [LanguageServiceApplyResultRecipe] as const

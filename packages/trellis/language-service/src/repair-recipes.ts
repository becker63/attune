import * as fs from "node:fs"
import * as path from "node:path"

import type {
  ProgramRepairAction,
  RecipeRepair,
} from "@attune/framework-protocol"

import type {
  TrellisLsDiagnostic,
  TrellisLsFix,
  TrellisLsTextEdit,
} from "./contracts.js"
import { stableTrellisLsId } from "./ids.js"
import { type LoadedProject } from "./project-loader.js"

export const collectTrellisFixes = (
  loaded: LoadedProject,
  diagnostics: readonly TrellisLsDiagnostic[],
): readonly TrellisLsFix[] =>
  diagnostics.flatMap((diagnostic): readonly TrellisLsFix[] => {
    if (diagnostic.code === "trellis/package-local-script-reintroduced") {
      const fixId = stableTrellisLsId("fix", [
        diagnostic.id,
        "nx-repair",
        "workspace:repair",
        diagnostic.file ?? "",
      ])
      return [{
        fixId,
        diagnosticId: diagnostic.id,
        kind: "nx-repair",
        title: "Route script cleanup through workspace repair",
        safe: true,
        requiresReview: false,
        affectedFiles: diagnostic.file === undefined ? [] : [diagnostic.file],
        preview: "Runs the public workspace repair target that owns no-compat cleanup.",
        canApply: true,
        command: {
          run: "nx run workspace:repair",
        },
      }]
    }

    if (diagnostic.code === "trellis/raw-pg-outside-runtime") {
      return [manualFix(
        diagnostic,
        "Route database access through the framework runtime boundary",
        [
          "Replace raw Postgres usage with RecipeReceiptStore or a typed runtime adapter.",
          `Recheck with ${recommendedDiagnosticsCommand(loaded)}.`,
        ].join(" "),
      )]
    }

    if (
      diagnostic.code === "trellis/generated-artifact-missing-owner" ||
      diagnostic.code === "trellis/generated-artifact-stale"
    ) {
      return [manualFix(
        diagnostic,
        "Refresh generated artifact through its ProjectionRecipe",
        "Attach the artifact to a ProjectionRecipe or run the owning public repair target; do not hand-edit generated output as source truth.",
      )]
    }

    if (
      diagnostic.code === "trellis/orphan-public-nx-target" ||
      diagnostic.code === "trellis/target-missing-recipe-invocation"
    ) {
      const fixId = stableTrellisLsId("fix", [
        diagnostic.id,
        "nx-repair",
        "workspace:repair",
        diagnostic.file ?? "",
      ])
      return [{
        fixId,
        diagnosticId: diagnostic.id,
        kind: "nx-repair",
        title: "Route Nx target ownership through workspace repair",
        safe: true,
        requiresReview: false,
        affectedFiles: diagnostic.file === undefined ? [] : [diagnostic.file],
        preview: "Runs the public workspace repair target to refresh target recipe/projection ownership metadata.",
        canApply: true,
        command: {
          run: "nx run workspace:repair",
        },
      }]
    }

    if (
      diagnostic.code === "trellis/managed-recipe-missing-substrate" ||
      diagnostic.code === "trellis/managed-recipe-missing-observation" ||
      diagnostic.code === "trellis/destructive-lifecycle-missing-review-gate" ||
      diagnostic.code === "trellis/alchemy-provenance-missing"
    ) {
      return [manualFix(
        diagnostic,
        "Review ManagedRecipe lifecycle metadata",
        "Add Alchemy lifecycle substrate, observation metadata, drift repair/no-repair rationale, and human review gates before applying lifecycle repairs.",
      )]
    }

    if (
      diagnostic.code === "trellis/private-ledger-without-recipe-linkage" ||
      diagnostic.code === "trellis/operation-missing-receipt"
    ) {
      return [manualFix(
        diagnostic,
        "Route durable operation state through the recipe receipt spine",
        "Replace private ledger writes with RecipeReceiptStore/RecipeObservation linkage or a typed runtime adapter.",
      )]
    }

    if (
      diagnostic.code === "trellis/tend-session-missing-recipe-id" ||
      diagnostic.code === "trellis/tend-command-missing-observation-id" ||
      diagnostic.code === "trellis/tend-report-not-derived-from-receipts"
    ) {
      return [manualFix(
        diagnostic,
        "Link Tend state to recipe receipts and observations",
        "Add recipe/run/receipt/observation identity where the Tend schema already supports it, or route reports from receipt/token facts.",
      )]
    }

    if (diagnostic.code === "trellis/authored-attune-package-file") {
      const file = diagnostic.file === undefined
        ? undefined
        : path.resolve(loaded.workspaceRoot, diagnostic.file)
      if (
        file !== undefined &&
        diagnostic.file === "packages/trellis/language-service/src/attune.package.ts" &&
        fs.existsSync(path.resolve(loaded.workspaceRoot, "packages/trellis/language-service/src/recipes.ts"))
      ) {
        return [deleteFileByTextEditFix(
          diagnostic,
          file,
          "Delete migrated language-service attune.package.ts",
          "Deletes legacy package facts after equivalent recipe package metadata exists in src/recipes.ts.",
        )]
      }
      return [manualFix(
        diagnostic,
        "Migrate attune.package.ts into recipe package metadata",
        "Create equivalent defineRecipePackage metadata before deleting this legacy authored package facts file.",
      )]
    }

    if (diagnostic.code === "trellis/source-file-unowned-by-recipe") {
      return [manualFix(
        diagnostic,
        "Attach source file to a Recipe-family declaration",
        "Add the file to allowedFiles, entrypoints, outputs, observedFiles, affectedFiles, or an ownership group in the package recipe declaration.",
      )]
    }

    if (diagnostic.code === "trellis/workflow-not-invocation-recipe") {
      return [manualFix(
        diagnostic,
        "Scaffold an InvocationRecipe for workflow entrypoint",
        "Add or extend defineInvocationRecipe metadata before wiring this workflow as public package behavior.",
      )]
    }

    if (diagnostic.code === "trellis/generated-output-not-projection-recipe") {
      return [manualFix(
        diagnostic,
        "Scaffold a ProjectionRecipe for generated output",
        "Add or extend defineProjectionRecipe metadata and route generated output through a recipe/generator repair path.",
      )]
    }

    if (diagnostic.code === "trellis/diagnostic-logic-not-diagnostic-recipe") {
      return [manualFix(
        diagnostic,
        "Convert diagnostic helper into a DiagnosticRecipe",
        "Move diagnostic ownership into defineDiagnosticRecipe metadata and call it from the CLI recipe pipeline.",
      )]
    }

    if (diagnostic.code === "trellis/repair-logic-not-repair-recipe") {
      return [manualFix(
        diagnostic,
        "Convert repair helper into a RepairRecipe",
        "Move repair planning ownership into defineRepairRecipe metadata and call it from the CLI recipe pipeline.",
      )]
    }

    if (diagnostic.code === "trellis/observation-not-observation-recipe") {
      return [manualFix(
        diagnostic,
        "Convert observation emission into an ObservationRecipe",
        "Move command summary and evidence recording ownership into defineObservationRecipe metadata.",
      )]
    }

    if (diagnostic.code === "trellis/source-uses-legacy-abstraction") {
      return [manualFix(
        diagnostic,
        "Replace legacy ProjectFacts abstraction with recipe package metadata",
        "Move package identity, ownership, runtime roots, diagnostics, repairs, projections, observations, and invocations into recipes.ts.",
      )]
    }

    return []
  })

export const trellisFixFromProgramRepairAction = (input: {
  readonly diagnosticId: string
  readonly action: ProgramRepairAction
  readonly affectedFiles?: readonly string[]
  readonly workspaceRoot?: string
}): TrellisLsFix => {
  const affectedFiles = [...(input.affectedFiles ?? [])]
  const sourceEdit = textEditFromProgramRepairAction(input.action, input.workspaceRoot)
  if (sourceEdit !== undefined && !sourceEditTouchesGeneratedFile(sourceEdit.file)) {
    const fixId = stableTrellisLsId("fix", [
      input.diagnosticId,
      "program-repair-action",
      input.action.id,
      sourceEdit.file,
      sourceEdit.start,
      sourceEdit.end,
      sourceEdit.newText,
    ])
    return {
      fixId,
      diagnosticId: input.diagnosticId,
      kind: "text-edit",
      title: input.action.title,
      safe: true,
      requiresReview: false,
      affectedFiles: [sourceEdit.file],
      preview: `Applies source edit from ProgramRepairAction ${input.action.id}.`,
      canApply: true,
      edits: [sourceEdit],
    }
  }

  const nxCommand = publicNxCommandFromTarget(input.action.target)
  if (nxCommand !== undefined) {
    return {
      fixId: stableTrellisLsId("fix", [
        input.diagnosticId,
        "program-repair-action",
        input.action.id,
        "nx-repair",
        nxCommand,
      ]),
      diagnosticId: input.diagnosticId,
      kind: "nx-repair",
      title: input.action.title,
      safe: true,
      requiresReview: false,
      affectedFiles,
      preview: `Runs public repair surface ${nxCommand}.`,
      canApply: true,
      command: { run: nxCommand },
    }
  }

  return manualFix(
    {
      id: input.diagnosticId,
      code: "trellis/program-repair-action-review-required",
    },
    input.action.title,
    `Review ProgramRepairAction ${input.action.id} before applying.`,
  )
}

export const trellisFixFromRecipeRepair = (input: {
  readonly diagnosticId: string
  readonly repair: RecipeRepair
}): TrellisLsFix => {
  const affectedFiles = [...input.repair.allowedFiles]
  const nxCommand = publicNxCommandFromTarget(input.repair.nxTarget)
  if (input.repair.kind === "nx-target" && nxCommand !== undefined) {
    return {
      fixId: stableTrellisLsId("fix", [
        input.diagnosticId,
        "recipe-repair",
        input.repair.repairId,
        "nx-repair",
        nxCommand,
      ]),
      diagnosticId: input.diagnosticId,
      kind: "nx-repair",
      title: input.repair.title,
      safe: input.repair.risk === "safe",
      requiresReview: input.repair.risk !== "safe",
      affectedFiles,
      preview: `Runs public recipe repair target ${nxCommand}.`,
      canApply: input.repair.risk === "safe",
      command: { run: nxCommand },
    }
  }

  if (input.repair.kind === "source-edit") {
    const edit = textEditFromUnknownPayload(input.repair.payload)
    const unsafeGeneratedEdit = edit !== undefined && sourceEditTouchesGeneratedFile(edit.file)
    if (edit !== undefined && input.repair.risk === "safe" && !unsafeGeneratedEdit) {
      return {
        fixId: stableTrellisLsId("fix", [
          input.diagnosticId,
          "recipe-repair",
          input.repair.repairId,
          "text-edit",
          edit.file,
          edit.start,
          edit.end,
          edit.newText,
        ]),
        diagnosticId: input.diagnosticId,
        kind: "text-edit",
        title: input.repair.title,
        safe: true,
        requiresReview: false,
        affectedFiles: [edit.file],
        preview: `Applies source edit from RecipeRepair ${input.repair.repairId}.`,
        canApply: true,
        edits: [edit],
      }
    }
  }

  return {
    ...manualFix(
      {
        id: input.diagnosticId,
        code: "trellis/recipe-repair-review-required",
      },
      input.repair.title,
      `Review RecipeRepair ${input.repair.repairId} before applying.`,
    ),
    affectedFiles,
  }
}

const deleteFileByTextEditFix = (
  diagnostic: TrellisLsDiagnostic,
  file: string,
  title: string,
  preview: string,
): TrellisLsFix => ({
  fixId: stableTrellisLsId("fix", [diagnostic.id, "text-edit", "delete-file", diagnostic.file ?? ""]),
  diagnosticId: diagnostic.id,
  kind: "text-edit",
  title,
  safe: true,
  requiresReview: false,
  affectedFiles: diagnostic.file === undefined ? [] : [diagnostic.file],
  preview,
  canApply: true,
  edits: [{
    file,
    start: 0,
    end: fs.readFileSync(file, "utf8").length,
    newText: "",
  }],
})

const manualFix = (
  diagnostic: Pick<TrellisLsDiagnostic, "id" | "file" | "code">,
  title: string,
  preview: string,
): TrellisLsFix => ({
  fixId: stableTrellisLsId("fix", [
    diagnostic.id,
    "manual",
    title,
    diagnostic.file ?? "",
  ]),
  diagnosticId: diagnostic.id,
  kind: "manual",
  title,
  safe: false,
  requiresReview: true,
  affectedFiles: diagnostic.file === undefined ? [] : [diagnostic.file],
  preview,
  canApply: false,
})

const publicNxCommandFromTarget = (target: string | undefined): string | undefined => {
  if (target === undefined) return undefined
  if (!/^(workspace:[a-z-]*(?:repair|check)|[A-Za-z0-9_-]+:repair)$/u.test(target)) {
    return undefined
  }
  return `nx run ${target}`
}

const textEditFromProgramRepairAction = (
  action: ProgramRepairAction,
  workspaceRoot: string | undefined,
): TrellisLsTextEdit | undefined => {
  if (action.kind !== "source-edit") return undefined
  return textEditFromUnknownPayload(action.options, workspaceRoot)
}

const textEditFromUnknownPayload = (
  payload: unknown,
  workspaceRoot?: string,
): TrellisLsTextEdit | undefined => {
  if (payload === null || typeof payload !== "object") return undefined
  const record = payload as Record<string, unknown>
  const file = typeof record.file === "string"
    ? record.file
    : typeof record.sourcePath === "string"
    ? record.sourcePath
    : typeof record.target === "string"
    ? record.target
    : undefined
  const start = typeof record.start === "number" ? record.start : undefined
  const end = typeof record.end === "number" ? record.end : undefined
  const newText = typeof record.newText === "string" ? record.newText : undefined
  if (file === undefined || start === undefined || end === undefined || newText === undefined) {
    return undefined
  }
  return {
    file: workspaceRoot === undefined ? file : path.resolve(workspaceRoot, file),
    start,
    end,
    newText,
  }
}

const sourceEditTouchesGeneratedFile = (file: string): boolean =>
  /(^|\/)(generated|__generated__|\.attune\/generated|dist)(\/|$)/u.test(file.replaceAll(path.sep, "/")) ||
  /\.generated\.[cm]?[jt]sx?$/u.test(file)

const recommendedDiagnosticsCommand = (loaded: LoadedProject): string => {
  if (loaded.projectPath !== undefined) {
    return `trellis-ls diagnostics --project ${path.relative(loaded.workspaceRoot, loaded.projectPath).replaceAll(path.sep, "/")} --format json`
  }
  if (loaded.filePath !== undefined) {
    return `trellis-ls diagnostics --file ${path.relative(loaded.workspaceRoot, loaded.filePath).replaceAll(path.sep, "/")} --format json`
  }
  return "trellis-ls diagnostics --workspace . --format json"
}

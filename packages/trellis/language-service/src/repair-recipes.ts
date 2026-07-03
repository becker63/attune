import * as fs from "node:fs"
import * as path from "node:path"

import { Effect, Layer } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineRecipeHandler,
  defineRecipeLayer,
  defineRepairRecipe,
  type ProgramRepairAction,
  type RecipeRepair,
} from "@attune/framework-protocol"

import type {
  TrellisLsDiagnostic,
  TrellisLsFix,
  TrellisLsTextEdit,
} from "./contracts.js"
import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceDiagnosticsResource,
  LanguageServiceFixesResource,
  LanguageServiceProjectionInput,
} from "./contracts.js"
import { stableTrellisLsId } from "./ids.js"
import { type LoadedProject } from "./project-loader.js"

export const LanguageServiceRepairRecipesSourcePath = "packages/trellis/language-service/src/repair-recipes.ts" as const

export const collectTrellisFixes = (
  loaded: LoadedProject,
  diagnostics: readonly TrellisLsDiagnostic[],
): readonly TrellisLsFix[] =>
  diagnostics.flatMap((diagnostic): readonly TrellisLsFix[] => {
    if (diagnostic.code === "trellis/package-local-script-reintroduced") {
      const file = diagnostic.file === undefined
        ? undefined
        : path.resolve(loaded.workspaceRoot, diagnostic.file)
      return file === undefined || !fs.existsSync(file)
        ? []
        : [deleteFileWorkspaceEditFix(
          diagnostic,
          file,
          "Delete package-local script shim",
          "Deletes the package-local script file so public workflow routing stays owned by recipe/Nx packet surfaces.",
        )]
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
      const fix = nxTargetOwnershipTextEditFix(loaded, diagnostic)
      return fix === undefined ? [manualFix(
        diagnostic,
        "Attach Nx target ownership metadata",
        "Add metadata.attune.recipeId and projectionId to the public target, or mark it internal with an owned public parent.",
      )] : [fix]
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
      diagnostic.code === "trellis/tend-report-not-derived-from-receipts" ||
      diagnostic.code === "trellis/tend-owned-packet-ontology" ||
      diagnostic.code === "trellis/tend-owned-judge-ontology" ||
      diagnostic.code === "trellis/tend-packet-helper-semantics"
    ) {
      return [manualFix(
        diagnostic,
        "Route Tend packet state through framework protocol receipts",
        "Import packet, judge, and receipt semantics from @attune/framework-protocol or Trellis handlers; Tend may keep orchestration projections but must not define packet ontology.",
      )]
    }

    if (diagnostic.code === "trellis/authored-attune-package-file") {
      const file = diagnostic.file === undefined
        ? undefined
        : path.resolve(loaded.workspaceRoot, diagnostic.file)
      if (
        file !== undefined &&
        fs.existsSync(path.join(path.dirname(file), "recipes.ts"))
      ) {
        return [deleteFileByTextEditFix(
          diagnostic,
          file,
          "Delete migrated attune.package.ts",
          "Deletes legacy package facts after equivalent recipe package metadata exists in neighboring src/recipes.ts.",
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
        "Replace legacy LegacyPackageFacts abstraction with recipe package metadata",
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
): TrellisLsFix => deleteFileWorkspaceEditFix(diagnostic, file, title, preview)

const deleteFileWorkspaceEditFix = (
  diagnostic: TrellisLsDiagnostic,
  file: string,
  title: string,
  preview: string,
): TrellisLsFix => ({
  fixId: stableTrellisLsId("fix", [diagnostic.id, "workspace-edit", "delete-file", diagnostic.file ?? ""]),
  diagnosticId: diagnostic.id,
  kind: "workspace-edit",
  title,
  safe: true,
  requiresReview: false,
  affectedFiles: diagnostic.file === undefined ? [] : [diagnostic.file],
  preview,
  canApply: true,
  deleteFiles: [file],
})

const nxTargetOwnershipTextEditFix = (
  loaded: LoadedProject,
  diagnostic: TrellisLsDiagnostic,
): TrellisLsFix | undefined => {
  if (diagnostic.file === undefined) return undefined
  const file = path.resolve(loaded.workspaceRoot, diagnostic.file)
  if (!fs.existsSync(file)) return undefined
  const target = /Public Nx target (?<projectId>[^:\s]+):(?<targetName>[^\s]+)/u.exec(diagnostic.message)
  const projectJson = readJsonObject(file)
  const projectId = typeof projectJson["name"] === "string"
    ? projectJson["name"]
    : target?.groups?.projectId
  const targetName = target?.groups?.targetName?.replace(/[.,]$/u, "")
  if (projectId === undefined || targetName === undefined) return undefined
  const targets = recordValue(projectJson["targets"])
  if (targets === undefined || recordValue(targets[targetName]) === undefined) return undefined
  const updatedTargets = Object.fromEntries(Object.entries(targets).map(([name, value]) => {
    const targetRecord = recordValue(value)
    if (targetRecord === undefined || !isConventionalPublicNxTarget(name)) return [name, value]
    return [name, nxTargetWithOwnership({
      projectId,
      targetName: name,
      targetRecord,
    })]
  }))
  const updatedProjectJson = {
    ...projectJson,
    targets: updatedTargets,
  }
  const before = fs.readFileSync(file, "utf8")
  const after = `${JSON.stringify(updatedProjectJson, null, 2)}\n`
  return {
    fixId: stableTrellisLsId("fix", [
      diagnostic.id,
      "text-edit",
      "nx-target-ownership",
      diagnostic.file,
      targetName,
      projectId,
    ]),
    diagnosticId: diagnostic.id,
    kind: "text-edit",
    title: "Attach Nx target recipe/projection ownership",
    safe: true,
    requiresReview: false,
    affectedFiles: [diagnostic.file],
    preview: `Adds recipe/projection ownership metadata for ${projectId}:${targetName}.`,
    canApply: true,
    edits: [{
      file,
      start: 0,
      end: before.length,
      newText: after,
    }],
  }
}

const nxTargetWithOwnership = (input: {
  readonly projectId: string
  readonly targetName: string
  readonly targetRecord: Record<string, unknown>
}): Record<string, unknown> => {
  const metadata = recordValue(input.targetRecord["metadata"]) ?? {}
  const attune = recordValue(metadata["attune"]) ?? {}
  return {
    ...input.targetRecord,
    metadata: {
      ...metadata,
      attune: {
        ...attune,
        tier: typeof attune["tier"] === "string" ? attune["tier"] : "public",
        surface: typeof attune["surface"] === "string" ? attune["surface"] : input.targetName,
        action: typeof attune["action"] === "string" ? attune["action"] : nxTargetAction(input.targetName),
        recipeId: typeof attune["recipeId"] === "string"
          ? attune["recipeId"]
          : `${input.projectId}.${input.targetName}`,
        projectionId: typeof attune["projectionId"] === "string"
          ? attune["projectionId"]
          : "framework.projection.nx-target",
      },
    },
  }
}

const readJsonObject = (file: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

const recordValue = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined

const conventionalPublicNxTargetNames = new Set([
  "check",
  "repair",
  "generate",
  "fuzz",
  "proof",
  "plan",
  "apply",
  "destroy",
  "migrate",
  "validate-sql",
  "generate-types",
])

const isConventionalPublicNxTarget = (targetName: string): boolean =>
  conventionalPublicNxTargetNames.has(targetName)

const nxTargetAction = (targetName: string): string => {
  if (/repair/u.test(targetName)) return "repair"
  if (/check|typecheck|test|validate/u.test(targetName)) return "check"
  if (/generate/u.test(targetName)) return "generate"
  if (/build/u.test(targetName)) return "build"
  return targetName
}

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

const languageServiceRepairLayer = defineRecipeLayer({
  id: "trellis-language-service.repair.layer",
  sourcePath: LanguageServiceRepairRecipesSourcePath,
  exportName: "languageServiceRepairLayer",
  layer: Layer.empty as never,
  provides: [{
    id: "trellis-language-service.repair-filesystem",
    service: "Effect.Platform.FileSystem",
  }],
})

const languageServiceUpstreamFixesHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.upstream-effect-fixes.handler",
  recipeId: "trellis-language-service.upstream-effect-fixes",
  sourcePath: LanguageServiceRepairRecipesSourcePath,
  exportName: "collectTrellisFixes",
  layer: languageServiceRepairLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceRepairPlanHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.repair-plan.handler",
  recipeId: "trellis-language-service.repair-plan",
  sourcePath: LanguageServiceRepairRecipesSourcePath,
  exportName: "trellisFixFromRecipeRepair",
  layer: languageServiceRepairLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceUpstreamFixesDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.upstream-effect-diagnostics",
  toRecipeId: "trellis-language-service.upstream-effect-fixes",
  resource: LanguageServiceFixesResource,
  kind: "repairs",
  modes: ["project", "read"],
})

const languageServiceRepairPlanDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.upstream-effect-fixes",
  toRecipeId: "trellis-language-service.repair-plan",
  resource: LanguageServiceFixesResource,
  kind: "repairs",
  modes: ["project", "read"],
})

const languageServiceDiagnosticRepairPlanDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.recipe-fact-diagnostics",
  toRecipeId: "trellis-language-service.repair-plan",
  resource: LanguageServiceDiagnosticsResource,
  kind: "repairs",
  modes: ["read"],
})

export const LanguageServiceUpstreamFixesRecipe = defineRepairRecipe({
  id: "trellis-language-service.upstream-effect-fixes",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Normalize upstream Effect quickfixes for Trellis CLI output",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceRepairRecipesSourcePath,
  allowedFiles: [LanguageServiceRepairRecipesSourcePath],
  affectedFiles: [LanguageServiceRepairRecipesSourcePath],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceDiagnosticsResource],
    outputResources: [LanguageServiceFixesResource],
  },
  handler: languageServiceUpstreamFixesHandler,
  alchemyDag: [languageServiceUpstreamFixesDag],
})

export const LanguageServiceRepairPlanRecipe = defineRepairRecipe({
  id: "trellis-language-service.repair-plan",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Project diagnostics into safe Trellis language-service repair plans",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceRepairRecipesSourcePath,
  allowedFiles: [LanguageServiceRepairRecipesSourcePath],
  affectedFiles: [LanguageServiceRepairRecipesSourcePath],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceDiagnosticsResource, LanguageServiceFixesResource],
    outputResources: [LanguageServiceFixesResource],
  },
  handler: languageServiceRepairPlanHandler,
  alchemyDag: [
    languageServiceRepairPlanDag,
    languageServiceDiagnosticRepairPlanDag,
  ],
})

export const LanguageServiceRepairRecipes = [
  LanguageServiceUpstreamFixesRecipe,
  LanguageServiceRepairPlanRecipe,
] as const

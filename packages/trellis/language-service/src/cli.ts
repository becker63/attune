#!/usr/bin/env tsx
import { fileURLToPath } from "node:url"

import { Effect, Layer } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineInvocationRecipe,
  defineObservationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  recipeObservationId,
  type RecipeObservation,
} from "@attune/framework-protocol"
import {
  createMeasurementObservationSink,
  measurementStoreConfigFromEnv,
} from "@attune/framework-runtime"
import {
  runApplyCommand,
  runCheckCommand,
  runDiagnosticsCommand,
  runFastPathCommand,
  runFileAccountingCommand,
  runFixesCommand,
  runJudgeCommand,
  runPacketsCommand,
  runSourceExpressionCommand,
  type ApplyOptions,
  type CheckOptions,
  type CommandResult,
  type DiagnosticsOptions,
  type FastPathOptions,
  type FileAccountingOptions,
  type FixesOptions,
  type JudgeOptions,
  type PacketsOptions,
  type SourceExpressionOptions,
} from "./cli-core.js"
import type {
  TrellisLsApplyOutput,
  TrellisLsApplyMode,
  TrellisLsCheckOutput,
  TrellisLsCommand,
  TrellisLsDiagnosticSource,
  TrellisLsDiagnosticsOutput,
  TrellisLsEvidenceMode,
  TrellisLsFailOn,
  TrellisLsFastPathMode,
  TrellisLsFastPathOutput,
  TrellisLsFileAccountingOutput,
  TrellisLsFixesOutput,
  TrellisLsFormat,
  TrellisLsJudgeOutput,
  TrellisLsPacketsOutput,
  TrellisLsProfile,
  TrellisLsSourceExpressionOutput,
} from "./contracts.js"
import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceCommandResource,
  LanguageServiceProjectionInput,
  LanguageServiceReceiptResource,
  LanguageServiceWorkspaceResource,
} from "./contracts.js"

export const LanguageServiceCliSourcePath = "packages/trellis/language-service/src/cli.ts" as const

type ParsedFlags = Readonly<Record<string, string | boolean>>
type TrellisLsCliOutput =
  | TrellisLsDiagnosticsOutput
  | TrellisLsFixesOutput
  | TrellisLsApplyOutput
  | TrellisLsCheckOutput
  | TrellisLsPacketsOutput
  | TrellisLsFileAccountingOutput
  | TrellisLsSourceExpressionOutput
  | TrellisLsJudgeOutput
  | TrellisLsFastPathOutput

const languageServiceCliLayer = defineRecipeLayer({
  id: "trellis-language-service.cli.layer",
  sourcePath: LanguageServiceCliSourcePath,
  exportName: "languageServiceCliLayer",
  layer: Layer.empty as never,
  provides: [{
    id: "trellis-language-service.cli-process",
    service: "Effect.Platform.CommandExecutor",
  }],
})

const languageServiceCliInvocationHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.cli-invocation-surfaces.handler",
  recipeId: "trellis-language-service.cli-invocation-surfaces",
  sourcePath: LanguageServiceCliSourcePath,
  exportName: "main",
  layer: languageServiceCliLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceReceiptObservationHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.receipt-observation-recording.handler",
  recipeId: "trellis-language-service.receipt-observation-recording",
  sourcePath: LanguageServiceCliSourcePath,
  exportName: "trellisLsCliObservation",
  layer: languageServiceCliLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceCliInvocationDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.source-surface",
  toRecipeId: "trellis-language-service.cli-invocation-surfaces",
  resource: LanguageServiceCommandResource,
  kind: "invokes",
  modes: ["invoke", "read"],
})

const languageServiceReceiptObservationDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.cli-invocation-surfaces",
  toRecipeId: "trellis-language-service.receipt-observation-recording",
  resource: LanguageServiceReceiptResource,
  kind: "observes",
  modes: ["observe", "read"],
})

export const LanguageServiceCliInvocationRecipe = defineInvocationRecipe({
  id: "trellis-language-service.cli-invocation-surfaces",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Expose trellis-ls diagnostics, fixes, apply, check, packet, oracle, and judge invocation surfaces",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceCliSourcePath,
  allowedFiles: [LanguageServiceCliSourcePath],
  entrypoints: [
    LanguageServiceCliSourcePath,
    "packages/trellis/language-service/src/cli-core.ts",
  ],
  affectedFiles: [LanguageServiceCliSourcePath],
  publicTargets: [
    {
      kind: "check",
      target: "framework-language-service:check",
      evidenceRequirements: ["pnpm exec nx run framework-language-service:check --output-style=static"],
    },
    {
      kind: "repair",
      target: "framework-language-service:repair",
      evidenceRequirements: ["pnpm exec nx run framework-language-service:repair --output-style=static"],
    },
  ],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceWorkspaceResource],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceCliInvocationHandler,
  alchemyDag: [languageServiceCliInvocationDag],
})

export const LanguageServiceReceiptObservationRecipe = defineObservationRecipe({
  id: "trellis-language-service.receipt-observation-recording",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Record Trellis language-service command summaries through RecipeObservation",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceCliSourcePath,
  allowedFiles: [LanguageServiceCliSourcePath],
  observedFiles: [LanguageServiceCliSourcePath],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceCommandResource],
    outputResources: [LanguageServiceReceiptResource],
  },
  handler: languageServiceReceiptObservationHandler,
  alchemyDag: [languageServiceReceiptObservationDag],
})

export const LanguageServiceCliRecipes = [
  LanguageServiceCliInvocationRecipe,
  LanguageServiceReceiptObservationRecipe,
] as const

const main = async (): Promise<void> => {
  const [command, ...rest] = process.argv.slice(2)
  if (command === undefined || command === "--help" || command === "-h") {
    writeHelp()
    process.exit(0)
  }

  try {
    switch (command) {
      case "diagnostics":
      case "diags": {
        await writeResult(runDiagnosticsCommand(diagnosticsOptions(parseFlags(rest))))
        return
      }
      case "fixes":
      case "codefixes": {
        await writeResult(runFixesCommand(fixesOptions(parseFlags(rest))))
        return
      }
      case "packets": {
        await writeResult(runPacketsCommand(packetsOptions(parseFlags(rest))))
        return
      }
      case "file-accounting": {
        await writeResult(runFileAccountingCommand(fileAccountingOptions(parseFlags(rest))))
        return
      }
      case "source-expression": {
        await writeResult(runSourceExpressionCommand(sourceExpressionOptions(parseFlags(rest))))
        return
      }
      case "judge": {
        await writeResult(runJudgeCommand(judgeOptions(parseFlags(rest))))
        return
      }
      case "apply":
      case "apply-codefix": {
        await writeResult(runApplyCommand(applyOptions(parseFlags(rest))))
        return
      }
      case "check": {
        await writeResult(runCheckCommand(checkOptions(parseFlags(rest))))
        return
      }
      case "fastpath":
      case "packet-fastpath": {
        await writeResult(runFastPathCommand(fastPathOptions(parseFlags(rest))))
        return
      }
      default:
        throw new CliInputError(`Unknown command: ${command}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(2)
  }
}

const writeResult = async <Output extends TrellisLsCliOutput>(
  result: CommandResult<Output>,
): Promise<void> => {
  const output = await emitConfiguredObservation(result.output)
  await writeOutput(output, output.metadata.format)
  process.exitCode = result.exitCode
}

const emitConfiguredObservation = async <Output extends TrellisLsCliOutput>(
  output: Output,
): Promise<Output> => {
  const config = measurementStoreConfigFromEnv()
  if (config.mode === "disabled" || config.mode === "export-only") return output

  let sink: Awaited<ReturnType<typeof createMeasurementObservationSink>> | undefined
  try {
    sink = await createMeasurementObservationSink(config)
    if (sink.store === undefined) return output
    await Effect.runPromise(sink.store.registerRecipe(LanguageServiceReceiptObservationRecipe))
    const outputWithEvidence = withEvidenceMode(output, config.mode === "in-memory" ? "in-memory" : "durable")
    const observation = trellisLsCliObservation(outputWithEvidence)
    await Effect.runPromise(sink.store.recordObservation(observation))
    return withCliObservationId(outputWithEvidence, observation.observationId)
  } catch (error) {
    if (process.env.ATTUNE_TRELLIS_LS_STORE_REQUIRED === "1") {
      throw error
    }
    return output
  } finally {
    await sink?.close()
  }
}

const withEvidenceMode = <Output extends TrellisLsCliOutput>(
  output: Output,
  evidenceMode: TrellisLsEvidenceMode,
): Output => ({
  ...output,
  metadata: {
    ...output.metadata,
    evidenceMode,
  },
})

const withCliObservationId = <Output extends TrellisLsCliOutput>(
  output: Output,
  observationId: string,
): Output =>
  output.command === "fastpath"
    ? {
      ...output,
      observationIds: [...output.observationIds, observationId],
    } as Output
    : output

const trellisLsCliObservation = (
  output: TrellisLsCliOutput,
): RecipeObservation => {
  const observedAt = new Date().toISOString()
  const observationKind = observationKindFor(output.command)
  const measurementSessionId = process.env.ATTUNE_MEASUREMENT_SESSION_ID
  const scope = output.project ?? output.file ?? output.workspace ?? output.workspaceRoot
  return {
    observationId: recipeObservationId(
      LanguageServiceReceiptObservationRecipe.id,
      `${observationKind}:${measurementSessionId ?? "global"}:${scope}`,
      observedAt,
    ),
    recipeId: LanguageServiceReceiptObservationRecipe.id,
    observationKind,
    observedAt,
    source: `trellis-ls ${output.command}`,
    payload: {
      schemaVersion: 1,
      ...(measurementSessionId === undefined ? {} : { measurementSessionId }),
      command: output.command,
      workspaceRoot: output.workspaceRoot,
      ...(output.project === undefined ? {} : { project: output.project }),
      ...(output.file === undefined ? {} : { file: output.file }),
      ...(output.workspace === undefined ? {} : { workspace: output.workspace }),
      summary: summaryForOutput(output),
      diagnosticCodes: diagnosticCodesForOutput(output),
      diagnosticIds: diagnosticIdsForOutput(output),
      fixIds: fixIdsForOutput(output),
      affectedFileCount: "affectedFiles" in output ? output.affectedFiles.length : 0,
      rawOutputStored: false,
    },
  }
}

const observationKindFor = (command: TrellisLsCommand): string => {
  switch (command) {
    case "diagnostics":
      return "trellis-language-service.diagnostic-run-summary"
    case "fixes":
      return "trellis-language-service.fix-list-summary"
    case "apply":
      return "trellis-language-service.apply-result-summary"
    case "check":
      return "trellis-language-service.check-run-summary"
    case "packets":
      return "trellis-language-service.packet-queue-summary"
    case "file-accounting":
      return "trellis-language-service.file-accounting-summary"
    case "source-expression":
      return "trellis-language-service.source-expression-summary"
    case "judge":
      return "trellis-language-service.packet-judge-summary"
    case "fastpath":
      return "trellis-language-service.effect-packet-fastpath-summary"
  }
}

const summaryForOutput = (
  output: TrellisLsCliOutput,
): Record<string, number | boolean | string | undefined> => {
  if ("summary" in output) return output.summary
  if ("oracle" in output) return output.oracle
  if ("applied" in output) {
    return {
      applied: output.applied,
      refused: output.refused,
      affectedFileCount: output.affectedFiles.length,
    }
  }
  return {}
}

const diagnosticCodesForOutput = (output: TrellisLsCliOutput): readonly string[] =>
  "diagnostics" in output
    ? [...new Set(output.diagnostics.map((diagnostic) => diagnostic.code))]
    : []

const diagnosticIdsForOutput = (output: TrellisLsCliOutput): readonly string[] =>
  "diagnostics" in output
    ? output.diagnostics.map((diagnostic) => diagnostic.id)
    : []

const fixIdsForOutput = (output: TrellisLsCliOutput): readonly string[] =>
  "fixes" in output && Array.isArray(output.fixes)
    ? output.fixes.map((fix) => fix.fixId)
    : "fixId" in output && output.fixId !== undefined ? [output.fixId] : []

const parseFlags = (args: readonly string[]): ParsedFlags => {
  const flags: Record<string, string | boolean> = {}
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === undefined || !arg.startsWith("--")) {
      throw new CliInputError(`Unexpected argument: ${arg ?? ""}`)
    }
    const name = arg.slice(2)
    const next = args[index + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[name] = true
    } else {
      flags[name] = next
      index++
    }
  }
  return flags
}

const diagnosticsOptions = (flags: ParsedFlags): DiagnosticsOptions => ({
  ...scopeOptions(flags),
  format: formatFlag(flags),
  ...optionalStringField("source", sourceFlag(flags)),
  failOn: failOnFlag(flags, "none"),
  includeFixes: booleanFlag(flags, "include-fixes"),
  includeRecipeFacts: booleanFlag(flags, "include-recipe-facts"),
  ...optionalStringField("profile", profileFlag(flags)),
})

const fixesOptions = (flags: ParsedFlags): FixesOptions => ({
  ...scopeOptions(flags),
  format: formatFlag(flags),
  ...optionalStringField("diagnosticId", stringFlag(flags, "diagnostic-id")),
  ...optionalStringField("packetId", stringFlag(flags, "packet-id")),
  safeOnly: booleanFlag(flags, "safe-only"),
  includeManual: booleanFlag(flags, "include-manual"),
  ...optionalStringField("profile", profileFlag(flags)),
})

const applyOptions = (flags: ParsedFlags): ApplyOptions => {
  const fixId = stringFlag(flags, "fix-id")
  const packetId = stringFlag(flags, "packet-id")
  if (fixId === undefined && packetId === undefined) {
    throw new CliInputError("Missing required --fix-id or --packet-id")
  }
  return {
    ...scopeOptions(flags),
    format: formatFlag(flags),
    ...optionalStringField("fixId", fixId),
    ...optionalStringField("packetId", packetId),
    mode: applyModeFlag(flags),
    safeOnly: booleanFlag(flags, "safe-only"),
    recheck: booleanFlag(flags, "recheck"),
    ...optionalStringField("profile", profileFlag(flags)),
  }
}

const checkOptions = (flags: ParsedFlags): CheckOptions => ({
  ...scopeOptions(flags),
  format: formatFlag(flags),
  ...optionalStringField("packetId", stringFlag(flags, "packet-id")),
  ...optionalStringField("failOn", checkFailOnFlag(flags)),
  ...optionalStringField("profile", profileFlag(flags)),
})

const packetsOptions = (flags: ParsedFlags): PacketsOptions => ({
  ...scopeOptions(flags),
  format: formatFlag(flags),
  ...optionalStringField("source", packetSourceFlag(flags)),
  ...optionalStringField("profile", profileFlag(flags)),
})

const fileAccountingOptions = (flags: ParsedFlags): FileAccountingOptions => ({
  ...scopeOptions(flags),
  format: formatFlag(flags),
  profile: "recipe-only-source",
})

const sourceExpressionOptions = (flags: ParsedFlags): SourceExpressionOptions => ({
  ...scopeOptions(flags),
  format: formatFlag(flags),
  profile: "recipe-only-source",
})

const judgeOptions = (flags: ParsedFlags): JudgeOptions => ({
  ...scopeOptions(flags),
  format: formatFlag(flags),
  ...optionalStringField("source", packetSourceFlag(flags)),
  ...optionalStringField("packetId", stringFlag(flags, "packet-id")),
  ...optionalStringField("profile", profileFlag(flags)),
})

const fastPathOptions = (flags: ParsedFlags): FastPathOptions => {
  const packetId = stringFlag(flags, "packet-id")
  if (packetId === undefined) {
    throw new CliInputError("Missing required --packet-id")
  }
  return {
    ...scopeOptions(flags),
    format: formatFlag(flags),
    packetId,
    mode: fastPathModeFlag(flags),
    ...optionalStringField("source", packetSourceFlag(flags)),
    ...optionalStringField("targetId", stringFlag(flags, "target-id")),
    ...optionalStringField("ruleName", stringFlag(flags, "rule-name")),
    ...optionalStringField("sourcePath", stringFlag(flags, "source-path")),
    ...optionalStringField("profile", profileFlag(flags)),
  }
}

const scopeOptions = (flags: ParsedFlags): {
  readonly project?: string
  readonly file?: string
  readonly workspace?: string
} => ({
  ...optionalStringField("project", stringFlag(flags, "project")),
  ...optionalStringField("file", stringFlag(flags, "file")),
  ...optionalStringField("workspace", stringFlag(flags, "workspace")),
})

const optionalStringField = <Key extends string, Value extends string>(
  key: Key,
  value: Value | undefined,
): Record<Key, Value> | Record<string, never> =>
  value === undefined ? {} : { [key]: value } as Record<Key, Value>

const stringFlag = (flags: ParsedFlags, name: string): string | undefined => {
  const value = flags[name]
  return typeof value === "string" ? value : undefined
}

const booleanFlag = (flags: ParsedFlags, name: string): boolean =>
  flags[name] === true || flags[name] === "true"

const formatFlag = (flags: ParsedFlags): TrellisLsFormat => {
  const value = stringFlag(flags, "format") ?? "json"
  if (value === "json" || value === "text") return value
  throw new CliInputError(`Invalid --format: ${value}`)
}

const sourceFlag = (flags: ParsedFlags): DiagnosticsOptions["source"] => {
  const value = stringFlag(flags, "source") ?? "all"
  if (
    value === "all" ||
    value === "effect" ||
    value === "trellis" ||
    value === "typescript"
  ) {
    return value as TrellisLsDiagnosticSource | "all"
  }
  throw new CliInputError(`Invalid --source: ${value}`)
}

const packetSourceFlag = (flags: ParsedFlags): "effect" | "trellis" => {
  const value = stringFlag(flags, "source") ?? "effect"
  if (value === "effect" || value === "trellis") return value
  throw new CliInputError(`Invalid --source for packets: ${value}`)
}

const failOnFlag = (
  flags: ParsedFlags,
  fallback: TrellisLsFailOn,
): TrellisLsFailOn => {
  const value = stringFlag(flags, "fail-on") ?? fallback
  if (value === "error" || value === "warning" || value === "none") return value
  throw new CliInputError(`Invalid --fail-on: ${value}`)
}

const checkFailOnFlag = (
  flags: ParsedFlags,
): CheckOptions["failOn"] => {
  const value = stringFlag(flags, "fail-on") ?? "error"
  if (value === "error" || value === "warning") return value
  throw new CliInputError(`Invalid --fail-on for check: ${value}`)
}

const applyModeFlag = (flags: ParsedFlags): TrellisLsApplyMode => {
  const value = stringFlag(flags, "mode") ?? "diff"
  if (value === "diff" || value === "write") return value
  throw new CliInputError(`Invalid --mode: ${value}`)
}

const fastPathModeFlag = (flags: ParsedFlags): TrellisLsFastPathMode => {
  const value = stringFlag(flags, "mode") ?? "preview"
  if (value === "preview" || value === "write") return value
  throw new CliInputError(`Invalid --mode for fastpath: ${value}`)
}

const profileFlag = (flags: ParsedFlags): TrellisLsProfile | undefined => {
  const value = stringFlag(flags, "profile")
  if (value === undefined) return undefined
  if (
    value === "default" ||
    value === "recipe-only-source" ||
    value === "effect-correctness" ||
    value === "effect-autofix-safe" ||
    value === "effect-style-autofix" ||
    value === "effect-native-inventory" ||
    value === "effect-full-inventory"
  ) return value
  throw new CliInputError(`Invalid --profile: ${value}`)
}

const writeOutput = async (output: unknown, format: TrellisLsFormat): Promise<void> => {
  if (format === "json") {
    await writeStdout(`${JSON.stringify(output, null, 2)}\n`)
    return
  }
  await writeStdout(renderText(output))
}

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

const renderText = (output: unknown): string => {
  if (typeof output !== "object" || output === null) return `${String(output)}\n`
  if ("diagnostics" in output && Array.isArray(output.diagnostics)) {
    return output.diagnostics.map((diagnostic) => {
      const item = diagnostic as { readonly code?: string; readonly message?: string; readonly file?: string }
      return `${item.file ?? "<workspace>"} ${item.code ?? "diagnostic"} ${item.message ?? ""}`
    }).join("\n") + "\n"
  }
  if ("fixes" in output && Array.isArray(output.fixes)) {
    return output.fixes.map((fix) => {
      const item = fix as { readonly fixId?: string; readonly title?: string; readonly kind?: string }
      return `${item.fixId ?? "fix"} ${item.kind ?? "fix"} ${item.title ?? ""}`
    }).join("\n") + "\n"
  }
  if ("packets" in output && Array.isArray(output.packets)) {
    return output.packets.map((packet) => {
      const item = packet as {
        readonly packetId?: string
        readonly code?: string
        readonly diagnosticCount?: number
        readonly safeFixCount?: number
      }
      return `${item.packetId ?? "packet"} ${item.code ?? "effect"} diagnostics=${item.diagnosticCount ?? 0} safeFixes=${item.safeFixCount ?? 0}`
    }).join("\n") + "\n"
  }
  if ("oracle" in output) {
    const item = output as {
      readonly oracle?: {
        readonly trackedFiles?: number
        readonly accountedFiles?: number
        readonly unaccountedFiles?: number
        readonly sourceFiles?: number
        readonly expressedSourceFiles?: number
        readonly unexpressedSourceFiles?: number
        readonly packetCount?: number
        readonly promotionAllowed?: boolean
      }
    }
    if (item.oracle?.sourceFiles !== undefined) {
      return `source=${item.oracle.sourceFiles} expressed=${item.oracle.expressedSourceFiles ?? 0} unexpressed=${item.oracle.unexpressedSourceFiles ?? 0} packets=${item.oracle.packetCount ?? 0} promotionAllowed=${item.oracle.promotionAllowed ?? false}\n`
    }
    return `tracked=${item.oracle?.trackedFiles ?? 0} accounted=${item.oracle?.accountedFiles ?? 0} unaccounted=${item.oracle?.unaccountedFiles ?? 0} packets=${item.oracle?.packetCount ?? 0} promotionAllowed=${item.oracle?.promotionAllowed ?? false}\n`
  }
  if ("packetId" in output && "validationStatus" in output && "applied" in output) {
    const item = output as {
      readonly packetId?: string
      readonly mode?: string
      readonly applied?: boolean
      readonly refused?: boolean
      readonly validationStatus?: string
      readonly safeFixCount?: number
      readonly affectedFileCount?: number
    }
    return `${item.packetId ?? "packet"} mode=${item.mode ?? "preview"} applied=${item.applied ?? false} refused=${item.refused ?? false} validation=${item.validationStatus ?? "not-measured"} safeFixes=${item.safeFixCount ?? 0} files=${item.affectedFileCount ?? 0}\n`
  }
  return `${JSON.stringify(output, null, 2)}\n`
}

const writeHelp = (): void => {
  process.stdout.write([
    "trellis-ls diagnostics --project <tsconfig> --format json",
    "trellis-ls diagnostics --workspace . --profile recipe-only-source --format json",
    "trellis-ls fixes --project <tsconfig> [--diagnostic-id <id>] --format json",
    "trellis-ls packets --project <tsconfig> --source effect --profile effect-autofix-safe --format json",
    "trellis-ls file-accounting --workspace . --format json",
    "trellis-ls source-expression --workspace . --format json",
    "trellis-ls judge --project <tsconfig> --source effect|trellis [--packet-id <id>] --format json",
    "trellis-ls fixes --project <tsconfig> --packet-id <id> --format json",
    "trellis-ls apply --project <tsconfig> --fix-id <id> --mode diff|write --format json",
    "trellis-ls apply --project <tsconfig> --packet-id <id> --mode diff|write --format json",
    "trellis-ls fastpath --project <tsconfig> --source effect|trellis --packet-id <id> --mode preview|write --format json",
    "trellis-ls check --project <tsconfig> --format json",
    "trellis-ls check --project <tsconfig> --packet-id <id> --format json",
    "",
  ].join("\n"))
}

class CliInputError extends Error {}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main()
}

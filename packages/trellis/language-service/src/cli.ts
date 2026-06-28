#!/usr/bin/env tsx
import { Effect, Schema } from "effect"
import {
  defineRecipe,
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
  runFixesCommand,
  type ApplyOptions,
  type CheckOptions,
  type CommandResult,
  type DiagnosticsOptions,
  type FixesOptions,
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
  TrellisLsFixesOutput,
  TrellisLsFormat,
  TrellisLsProfile,
} from "./contracts.js"

type ParsedFlags = Readonly<Record<string, string | boolean>>
type TrellisLsCliOutput =
  | TrellisLsDiagnosticsOutput
  | TrellisLsFixesOutput
  | TrellisLsApplyOutput
  | TrellisLsCheckOutput

const trellisLsCliObservationRecipe = defineRecipe({
  id: "trellis-language-service.cli-observation-sink",
  projectId: "framework-language-service",
  title: "Emit Trellis language-service command summaries to the framework observation store",
  inputSchema: Schema.Unknown,
  outputSchema: Schema.Unknown,
  sourcePath: "packages/trellis/language-service/src/cli.ts",
  allowedFiles: ["packages/trellis/language-service/**"],
  validationEvidence: ["framework-language-service:test"],
})

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
      case "apply":
      case "apply-codefix": {
        await writeResult(runApplyCommand(applyOptions(parseFlags(rest))))
        return
      }
      case "check": {
        await writeResult(runCheckCommand(checkOptions(parseFlags(rest))))
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
): Promise<never> => {
  const output = await emitConfiguredObservation(result.output)
  writeOutput(output, output.metadata.format)
  process.exit(result.exitCode)
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
    await Effect.runPromise(sink.store.registerRecipe(trellisLsCliObservationRecipe))
    await Effect.runPromise(sink.store.recordObservation(trellisLsCliObservation(output)))
    return withEvidenceMode(output, config.mode === "in-memory" ? "in-memory" : "durable")
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

const trellisLsCliObservation = (
  output: TrellisLsCliOutput,
): RecipeObservation => {
  const observedAt = new Date().toISOString()
  const observationKind = observationKindFor(output.command)
  const measurementSessionId = process.env.ATTUNE_MEASUREMENT_SESSION_ID
  const scope = output.project ?? output.file ?? output.workspace ?? output.workspaceRoot
  return {
    observationId: recipeObservationId(
      trellisLsCliObservationRecipe.id,
      `${observationKind}:${measurementSessionId ?? "global"}:${scope}`,
      observedAt,
    ),
    recipeId: trellisLsCliObservationRecipe.id,
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
  }
}

const summaryForOutput = (
  output: TrellisLsCliOutput,
): Record<string, number | boolean | string | undefined> => {
  if ("summary" in output) return output.summary
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
    : "fixId" in output ? [output.fixId] : []

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
  safeOnly: booleanFlag(flags, "safe-only"),
  includeManual: booleanFlag(flags, "include-manual"),
})

const applyOptions = (flags: ParsedFlags): ApplyOptions => {
  const fixId = stringFlag(flags, "fix-id")
  if (fixId === undefined) throw new CliInputError("Missing required --fix-id")
  return {
    ...scopeOptions(flags),
    format: formatFlag(flags),
    fixId,
    mode: applyModeFlag(flags),
    safeOnly: booleanFlag(flags, "safe-only"),
    recheck: booleanFlag(flags, "recheck"),
  }
}

const checkOptions = (flags: ParsedFlags): CheckOptions => ({
  ...scopeOptions(flags),
  format: formatFlag(flags),
  ...optionalStringField("failOn", checkFailOnFlag(flags)),
  ...optionalStringField("profile", profileFlag(flags)),
})

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

const profileFlag = (flags: ParsedFlags): TrellisLsProfile | undefined => {
  const value = stringFlag(flags, "profile")
  if (value === undefined) return undefined
  if (value === "default" || value === "recipe-only-source") return value
  throw new CliInputError(`Invalid --profile: ${value}`)
}

const writeOutput = (output: unknown, format: TrellisLsFormat): void => {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
    return
  }
  process.stdout.write(renderText(output))
}

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
  return `${JSON.stringify(output, null, 2)}\n`
}

const writeHelp = (): void => {
  process.stdout.write([
    "trellis-ls diagnostics --project <tsconfig> --format json",
    "trellis-ls diagnostics --workspace . --profile recipe-only-source --format json",
    "trellis-ls fixes --project <tsconfig> [--diagnostic-id <id>] --format json",
    "trellis-ls apply --project <tsconfig> --fix-id <id> --mode diff|write --format json",
    "trellis-ls check --project <tsconfig> --format json",
    "",
  ].join("\n"))
}

class CliInputError extends Error {}

void main()

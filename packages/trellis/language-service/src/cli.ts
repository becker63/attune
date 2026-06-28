#!/usr/bin/env tsx
import {
  runApplyCommand,
  runCheckCommand,
  runDiagnosticsCommand,
  runFixesCommand,
  type ApplyOptions,
  type CheckOptions,
  type DiagnosticsOptions,
  type FixesOptions,
} from "./cli-core.js"
import type {
  TrellisLsApplyMode,
  TrellisLsDiagnosticSource,
  TrellisLsFailOn,
  TrellisLsFormat,
  TrellisLsProfile,
} from "./contracts.js"

type ParsedFlags = Readonly<Record<string, string | boolean>>

const main = (): void => {
  const [command, ...rest] = process.argv.slice(2)
  if (command === undefined || command === "--help" || command === "-h") {
    writeHelp()
    process.exit(0)
  }

  try {
    switch (command) {
      case "diagnostics":
      case "diags": {
        const result = runDiagnosticsCommand(diagnosticsOptions(parseFlags(rest)))
        writeOutput(result.output, result.output.metadata.format)
        process.exit(result.exitCode)
      }
      case "fixes":
      case "codefixes": {
        const result = runFixesCommand(fixesOptions(parseFlags(rest)))
        writeOutput(result.output, result.output.metadata.format)
        process.exit(result.exitCode)
      }
      case "apply":
      case "apply-codefix": {
        const result = runApplyCommand(applyOptions(parseFlags(rest)))
        writeOutput(result.output, result.output.metadata.format)
        process.exit(result.exitCode)
      }
      case "check": {
        const result = runCheckCommand(checkOptions(parseFlags(rest)))
        writeOutput(result.output, result.output.metadata.format)
        process.exit(result.exitCode)
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

main()

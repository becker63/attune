#!/usr/bin/env tsx
import {
  assertJsonFormat,
  assertOutputFormat,
  decodeOpenCodeSessionFile,
  observeCommandWithStoreEmission,
  renderJson,
  renderSessionSummaryMarkdown,
  runDoctor,
  summarizeOpenCodeSessionFile,
  createAttuneOpenCodeFingerprint,
} from "./cli-core.js"
import { writeMeasurementReports } from "./measurement.js"

type ParsedFlags = Readonly<Record<string, string | boolean>>

const main = async (): Promise<void> => {
  const [command, ...rest] = process.argv.slice(2)
  if (command === undefined || command === "--help" || command === "-h") {
    writeHelp()
    process.exit(0)
  }

  try {
    switch (command) {
      case "fingerprint": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        process.stdout.write(renderJson(createAttuneOpenCodeFingerprint({ harness: "tend-opencode-tools" })))
        process.exit(0)
      }
      case "doctor": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        process.stdout.write(renderJson(runDoctor({ harness: "tend-opencode-tools" })))
        process.exit(0)
      }
      case "decode": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        process.stdout.write(renderJson(decodeOpenCodeSessionFile(requiredFile(flags))))
        process.exit(0)
      }
      case "summarize": {
        const flags = parseFlags(rest)
        const format = assertOutputFormat(stringFlag(flags, "format"))
        const summary = summarizeOpenCodeSessionFile(requiredFile(flags))
        process.stdout.write(format === "json" ? renderJson(summary) : renderSessionSummaryMarkdown(summary))
        process.exit(0)
      }
      case "observe": {
        const { flags, command: observedCommand } = parseObserve(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const output = await observeCommandWithStoreEmission({ command: observedCommand })
        process.stdout.write(renderJson(output))
        process.exit(output.storeEmission.status === "failed" ? 1 : 0)
      }
      case "measurement-report": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const reportsDir = stringFlag(flags, "reports-dir")
        const measurementSessionId = stringFlag(flags, "session-id")
        const exportOnly = booleanFlag(flags, "export-only")
        const dryRun = booleanFlag(flags, "dry-run")
        const output = await writeMeasurementReports({
          ...(reportsDir === undefined ? {} : { reportsDir }),
          ...(measurementSessionId === undefined ? {} : { measurementSessionId }),
          ...(exportOnly ? { exportOnly } : {}),
          ...(dryRun ? { dryRun } : {}),
        })
        process.stdout.write(renderJson(output))
        process.exit(output.storeEmission.status === "failed" ? 1 : 0)
      }
      default:
        throw new Error(`Unknown command: ${command}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(2)
  }
}

const parseObserve = (
  args: readonly string[],
): { readonly flags: ParsedFlags; readonly command: readonly string[] } => {
  const separator = args.indexOf("--")
  if (separator < 0) throw new Error("Missing -- before observed command")
  return {
    flags: parseFlags(args.slice(0, separator)),
    command: args.slice(separator + 1),
  }
}

const parseFlags = (args: readonly string[]): ParsedFlags => {
  const flags: Record<string, string | boolean> = {}
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === undefined || !arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg ?? ""}`)
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

const stringFlag = (flags: ParsedFlags, name: string): string | undefined => {
  const value = flags[name]
  return typeof value === "string" ? value : undefined
}

const booleanFlag = (flags: ParsedFlags, name: string): boolean =>
  flags[name] === true

const requiredFile = (flags: ParsedFlags): string => {
  const file = stringFlag(flags, "file")
  if (file === undefined || file.length === 0) throw new Error("Missing required --file")
  return file
}

const writeHelp = (): void => {
  process.stdout.write([
    "tend-opencode-tools",
    "",
    "Commands:",
    "  fingerprint --format json",
    "  doctor --format json",
    "  decode --file <path> --format json",
    "  summarize --file <path> --format markdown|json",
    "  observe --format json -- <command...>",
    "  measurement-report --format json [--reports-dir reports/tend-opencode-codex-measurement] [--export-only|--dry-run]",
    "",
  ].join("\n"))
}

void main()

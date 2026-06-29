#!/usr/bin/env tsx
import * as childProcess from "node:child_process"

import {
  assertJsonFormat,
  assertMeasurementPhase,
  createOpenCodeDelegationEnv,
  createAttuneOpenCodeFingerprint,
  observeCommandWithStoreEmission,
  renderJson,
  runDoctor,
  runHarnessSelfTest,
} from "./cli-core.js"
import { writeMeasurementReports } from "./measurement.js"

type ParsedFlags = Readonly<Record<string, string | boolean>>

const main = async (): Promise<void> => {
  const [command, ...rest] = process.argv.slice(2)
  if (command === undefined) delegateToUpstream([])

  try {
    switch (command) {
      case "attune-help":
      case "tend-help":
      case "harness-help":
        writeHelp()
        process.exit(0)
      case "fingerprint": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        process.stdout.write(renderJson(createAttuneOpenCodeFingerprint({ harness: "tend-opencode" })))
        process.exit(0)
      }
      case "doctor": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        process.stdout.write(renderJson(runDoctor({ harness: "tend-opencode" })))
        process.exit(0)
      }
      case "run-harness-test": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const output = runHarnessSelfTest({ harness: "tend-opencode" })
        process.stdout.write(renderJson(output))
        process.exit(output.passed ? 0 : 1)
      }
      case "observe": {
        const { flags, command: observedCommand } = parseObserve(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const measurementPhase = assertMeasurementPhase(stringFlag(flags, "phase"))
        const output = await observeCommandWithStoreEmission({
          command: observedCommand,
          ...(measurementPhase === undefined ? {} : { measurementPhase }),
        })
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
        delegateToUpstream(process.argv.slice(2))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(2)
  }
}

const delegateToUpstream = (args: readonly string[]): never => {
  const upstream = process.env.ATTUNE_OPENCODE_UPSTREAM_PATH
  if (upstream === undefined || upstream.length === 0) {
    process.stderr.write("ATTUNE_OPENCODE_UPSTREAM_PATH is not configured.\n")
    process.exit(127)
  }
  const result = childProcess.spawnSync(upstream, [...args], {
    stdio: "inherit",
    env: createOpenCodeDelegationEnv(process.env),
  })
  if (result.error !== undefined) {
    process.stderr.write(`${result.error.message}\n`)
    process.exit(127)
  }
  process.exit(typeof result.status === "number" ? result.status : 1)
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

const stringFlag = (flags: ParsedFlags, name: string): string | undefined => {
  const value = flags[name]
  return typeof value === "string" ? value : undefined
}

const booleanFlag = (flags: ParsedFlags, name: string): boolean =>
  flags[name] === true

const writeHelp = (): void => {
  process.stdout.write([
    "tend-opencode",
    "",
    "Commands:",
    "  fingerprint --format json",
    "  doctor --format json",
    "  run-harness-test --format json",
    "  observe --format json [--phase baseline|treatment] -- <command...>",
    "  measurement-report --format json [--reports-dir reports/tend-opencode-codex-measurement] [--export-only|--dry-run]",
    "  tend-help",
    "  attune-help",
    "",
    "All other arguments delegate to the pinned upstream OpenCode runtime.",
    "",
  ].join("\n"))
}

void main()

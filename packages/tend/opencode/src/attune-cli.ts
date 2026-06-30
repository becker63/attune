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
import {
  runRecipeOnlyWorktreeBenchmark,
  type BenchmarkEvidenceTier,
  type BenchmarkLoopKind,
  type RecipeOnlyBenchmarkAction,
  type RecipeOnlyBenchmarkMode,
  type RecipeOnlyBenchmarkOptions,
} from "./benchmark.js"
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
        const measurementSessionId = stringFlag(flags, "session-id")
        const output = await observeCommandWithStoreEmission({
          command: observedCommand,
          ...(measurementPhase === undefined ? {} : { measurementPhase }),
          ...(measurementSessionId === undefined ? {} : { measurementSessionId }),
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
      case "benchmark": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const output = await runRecipeOnlyWorktreeBenchmark(benchmarkOptionsFromFlags(flags))
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

const benchmarkAction = (value: string | undefined): RecipeOnlyBenchmarkAction | undefined => {
  if (
    value === undefined
    || value === "plan"
    || value === "setup"
    || value === "judge"
    || value === "ingest"
    || value === "report"
    || value === "run"
    || value === "status"
  ) return value
  throw new Error(`Invalid benchmark --action: ${value}`)
}

const benchmarkModeFlag = (value: string | undefined): RecipeOnlyBenchmarkMode | undefined => {
  if (
    value === undefined
    || value === "live"
    || value === "dry-run"
    || value === "export-only"
  ) return value
  throw new Error(`Invalid benchmark --mode: ${value}`)
}

const benchmarkLoopKindFlag = (value: string | undefined): BenchmarkLoopKind | undefined => {
  if (
    value === undefined
    || value === "quick-turn"
    || value === "pair-turn"
    || value === "full-ab"
    || value === "audit"
  ) return value
  throw new Error(`Invalid benchmark --loop-kind: ${value}`)
}

const benchmarkEvidenceTierFlag = (value: string | undefined): BenchmarkEvidenceTier | undefined => {
  if (
    value === undefined
    || value === "exploratory"
    || value === "candidate"
    || value === "promotion-eligible"
  ) return value
  throw new Error(`Invalid benchmark --evidence-tier: ${value}`)
}

const benchmarkOptionsFromFlags = (flags: ParsedFlags): RecipeOnlyBenchmarkOptions => {
  const action = benchmarkAction(stringFlag(flags, "action"))
  const mode = benchmarkModeFlag(stringFlag(flags, "mode"))
  const loopKind = benchmarkLoopKindFlag(stringFlag(flags, "loop-kind"))
  const evidenceTier = benchmarkEvidenceTierFlag(stringFlag(flags, "evidence-tier"))
  const runId = stringFlag(flags, "run-id")
  const sessionId = stringFlag(flags, "session-id")
  const reportsDir = stringFlag(flags, "reports-dir")
  const codexHome = stringFlag(flags, "codex-home")
  const promptVariant = stringFlag(flags, "prompt-variant")
  const hypothesis = stringFlag(flags, "hypothesis")
  const opencodeTrellisThreadId = stringFlag(flags, "opencode-trellis-thread-id")
  const codexTrellisThreadId = stringFlag(flags, "codex-trellis-thread-id")
  const opencodeBlindThreadId = stringFlag(flags, "opencode-blind-thread-id")
  const codexBlindThreadId = stringFlag(flags, "codex-blind-thread-id")
  const opencodeEffectPacketsThreadId = stringFlag(flags, "opencode-effect-packets-thread-id")
  const codexEffectPacketsThreadId = stringFlag(flags, "codex-effect-packets-thread-id")
  const opencodeRawEffectThreadId = stringFlag(flags, "opencode-raw-effect-thread-id")
  const codexRawEffectThreadId = stringFlag(flags, "codex-raw-effect-thread-id")
  const opencodeTrellisRolloutPath = stringFlag(flags, "opencode-trellis-rollout")
  const codexTrellisRolloutPath = stringFlag(flags, "codex-trellis-rollout")
  const opencodeBlindRolloutPath = stringFlag(flags, "opencode-blind-rollout")
  const codexBlindRolloutPath = stringFlag(flags, "codex-blind-rollout")
  const opencodeEffectPacketsRolloutPath = stringFlag(flags, "opencode-effect-packets-rollout")
  const codexEffectPacketsRolloutPath = stringFlag(flags, "codex-effect-packets-rollout")
  const opencodeRawEffectRolloutPath = stringFlag(flags, "opencode-raw-effect-rollout")
  const codexRawEffectRolloutPath = stringFlag(flags, "codex-raw-effect-rollout")
  const controlThreadId = stringFlag(flags, "control-thread-id")
  const treatmentThreadId = stringFlag(flags, "treatment-thread-id")
  const controlRolloutPath = stringFlag(flags, "control-rollout")
  const treatmentRolloutPath = stringFlag(flags, "treatment-rollout")
  const timeoutMs = numberFlag(flags, "timeout-ms")
  return {
    ...(action === undefined ? {} : { action }),
    ...(mode === undefined ? {} : { mode }),
    ...(loopKind === undefined ? {} : { loopKind }),
    ...(evidenceTier === undefined ? {} : { evidenceTier }),
    ...(runId === undefined ? {} : { benchmarkRunId: runId }),
    ...(sessionId === undefined ? {} : { measurementSessionId: sessionId }),
    ...(reportsDir === undefined ? {} : { reportsDir }),
    ...(codexHome === undefined ? {} : { codexHome }),
    ...(promptVariant === undefined ? {} : { promptVariant }),
    ...(hypothesis === undefined ? {} : { hypothesis }),
    ...(opencodeTrellisThreadId === undefined ? {} : { opencodeTrellisThreadId }),
    ...(codexTrellisThreadId === undefined ? {} : { codexTrellisThreadId }),
    ...(opencodeBlindThreadId === undefined ? {} : { opencodeBlindThreadId }),
    ...(codexBlindThreadId === undefined ? {} : { codexBlindThreadId }),
    ...(opencodeEffectPacketsThreadId === undefined ? {} : { opencodeEffectPacketsThreadId }),
    ...(codexEffectPacketsThreadId === undefined ? {} : { codexEffectPacketsThreadId }),
    ...(opencodeRawEffectThreadId === undefined ? {} : { opencodeRawEffectThreadId }),
    ...(codexRawEffectThreadId === undefined ? {} : { codexRawEffectThreadId }),
    ...(opencodeTrellisRolloutPath === undefined ? {} : { opencodeTrellisRolloutPath }),
    ...(codexTrellisRolloutPath === undefined ? {} : { codexTrellisRolloutPath }),
    ...(opencodeBlindRolloutPath === undefined ? {} : { opencodeBlindRolloutPath }),
    ...(codexBlindRolloutPath === undefined ? {} : { codexBlindRolloutPath }),
    ...(opencodeEffectPacketsRolloutPath === undefined ? {} : { opencodeEffectPacketsRolloutPath }),
    ...(codexEffectPacketsRolloutPath === undefined ? {} : { codexEffectPacketsRolloutPath }),
    ...(opencodeRawEffectRolloutPath === undefined ? {} : { opencodeRawEffectRolloutPath }),
    ...(codexRawEffectRolloutPath === undefined ? {} : { codexRawEffectRolloutPath }),
    ...(controlThreadId === undefined ? {} : { controlThreadId }),
    ...(treatmentThreadId === undefined ? {} : { treatmentThreadId }),
    ...(controlRolloutPath === undefined ? {} : { controlRolloutPath }),
    ...(treatmentRolloutPath === undefined ? {} : { treatmentRolloutPath }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(booleanFlag(flags, "dry-run") ? { dryRun: true } : {}),
    ...(booleanFlag(flags, "export-only") ? { exportOnly: true } : {}),
    ...(booleanFlag(flags, "remove-worktrees") ? { keepWorktrees: false } : {}),
  }
}

const numberFlag = (flags: ParsedFlags, name: string): number | undefined => {
  const value = stringFlag(flags, name)
  if (value === undefined) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --${name}: ${value}`)
  return parsed
}

const writeHelp = (): void => {
  process.stdout.write([
    "tend-opencode",
    "",
    "Commands:",
    "  fingerprint --format json",
    "  doctor --format json",
    "  run-harness-test --format json",
    "  observe --format json [--session-id <id>] [--phase baseline|treatment] -- <command...>",
    "  measurement-report --format json [--reports-dir reports/tend-opencode-codex-measurement] [--export-only|--dry-run]",
    "  benchmark --format json --action plan|setup|judge|ingest|report|run|status [--loop-kind quick-turn|pair-turn|full-ab|audit] [--evidence-tier exploratory|candidate|promotion-eligible] [--run-id <id>] [--timeout-ms <ms>] [--opencode-effect-packets-thread-id <id>] [--codex-effect-packets-thread-id <id>] [--opencode-raw-effect-thread-id <id>] [--codex-raw-effect-thread-id <id>] [--export-only|--dry-run]",
    "  tend-help",
    "  attune-help",
    "",
    "All other arguments delegate to the pinned upstream OpenCode runtime.",
    "",
  ].join("\n"))
}

void main()

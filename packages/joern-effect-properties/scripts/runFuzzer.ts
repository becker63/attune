import process from "node:process"
import { Effect } from "effect"
import { configForPreset, runFuzzer } from "../src/fuzz/index.js"
import type { FuzzPreset as FuzzPresetType } from "../src/fuzz/index.js"

type CliOptions = Readonly<Record<string, string>>

const cliOptions = (args: readonly string[]): CliOptions =>
  Object.fromEntries(
    args.flatMap((arg, index): readonly [string, string][] => {
      if (!arg.startsWith("--")) {
        return []
      }
      const [key, inlineValue] = arg.slice(2).split("=", 2)
      if (!key) {
        return []
      }
      return [[key, inlineValue ?? args[index + 1] ?? "true"]]
    }),
  )

const numberOption = (options: CliOptions, key: string, fallback: number): number => {
  const raw = options[key]
  if (raw === undefined) {
    return fallback
  }
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const booleanOption = (options: CliOptions, key: string, fallback: boolean): boolean => {
  const raw = options[key]
  if (raw === undefined) {
    return fallback
  }
  return raw !== "0" && raw !== "false"
}

const presetFromOptions = (options: CliOptions): FuzzPresetType => {
  const raw = options.preset ?? options.mode ?? "smoke"
  const presets: readonly FuzzPresetType[] = ["smoke", "workbench", "nightly", "campaign"]
  return presets.includes(raw as FuzzPresetType) ? raw as FuzzPresetType : "smoke"
}

const options = cliOptions(process.argv.slice(2))
const preset = presetFromOptions(options)
const summary = await Effect.runPromise(runFuzzer(configForPreset(preset, {
  ...(options.batches === undefined ? {} : { batchCount: numberOption(options, "batches", 1) }),
  ...(options.cases === undefined ? {} : { caseCount: numberOption(options, "cases", 25) }),
  ...(options["joern-shard-size"] === undefined ? {} : { joernShardSize: numberOption(options, "joern-shard-size", Number.MAX_SAFE_INTEGER) }),
  ...(options["max-mutators"] === undefined ? {} : { maxMutators: numberOption(options, "max-mutators", 4) }),
  ...(options["query-budget"] === undefined ? {} : { queryBudget: numberOption(options, "query-budget", 0) }),
  ...(options["query-feedback"] === undefined ? {} : { queryFeedback: booleanOption(options, "query-feedback", true) }),
  seed: numberOption(options, "seed", 1337),
  target: `joern-effect-properties:fuzz:${preset}`,
}), {
  localEvents: booleanOption(options, "local-events", false),
  ...(options["run-id"] === undefined ? {} : { runId: options["run-id"] }),
  workerCount: numberOption(options, "workers", 2),
}))

console.log(JSON.stringify(summary, null, 2))

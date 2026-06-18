import type { FuzzerRunConfig, FuzzPreset, JoernExecutionMode } from "../domain/model.js"

export type FuzzPresetConfig = Readonly<{
  readonly batchCount: number
  readonly caseCount: number
  readonly joernMode: JoernExecutionMode
  readonly joernShardSize: number
  readonly maxMutators: number
  readonly mode: FuzzPreset
  readonly queryBudget: number
  readonly queryFeedback: boolean
}>

export const fuzzPresetConfigs: Readonly<Record<FuzzPreset, FuzzPresetConfig>> = {
  smoke: {
    batchCount: 1,
    caseCount: 25,
    joernMode: "none",
    joernShardSize: Number.MAX_SAFE_INTEGER,
    maxMutators: 4,
    mode: "smoke",
    queryBudget: 0,
    queryFeedback: false,
  },
  workbench: {
    batchCount: 1,
    caseCount: 40,
    joernMode: "query",
    joernShardSize: Number.MAX_SAFE_INTEGER,
    maxMutators: 5,
    mode: "workbench",
    queryBudget: 25,
    queryFeedback: true,
  },
  nightly: {
    batchCount: 120,
    caseCount: 80,
    joernMode: "query",
    joernShardSize: 40,
    maxMutators: 8,
    mode: "nightly",
    queryBudget: 75,
    queryFeedback: true,
  },
  campaign: {
    batchCount: 160,
    caseCount: 100,
    joernMode: "query",
    joernShardSize: 40,
    maxMutators: 10,
    mode: "campaign",
    queryBudget: 120,
    queryFeedback: true,
  },
}

export const configForPreset = (
  preset: FuzzPreset,
  input: Partial<FuzzerRunConfig> & Readonly<{ readonly seed?: number; readonly target?: string }> = {},
): FuzzerRunConfig => {
  const base = fuzzPresetConfigs[preset]
  return {
    batchCount: input.batchCount ?? base.batchCount,
    caseCount: input.caseCount ?? base.caseCount,
    joernMode: input.joernMode ?? base.joernMode,
    joernShardSize: input.joernShardSize ?? base.joernShardSize,
    maxMutators: input.maxMutators ?? base.maxMutators,
    mode: preset,
    queryBudget: input.queryBudget ?? base.queryBudget,
    queryFeedback: input.queryFeedback ?? base.queryFeedback,
    seed: input.seed ?? 1337,
    target: input.target ?? `joern-effect-properties:fuzz:${preset}`,
  }
}

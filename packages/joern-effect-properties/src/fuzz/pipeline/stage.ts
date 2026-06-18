import type { Effect } from "effect"

export type FuzzStageId =
  | "load-corpus"
  | "plan-cases"
  | "apply-mutations"
  | "admit-projects"
  | "allocate-workspace"
  | "import-cpg"
  | "plan-queries"
  | "execute-queries"
  | "collect-evidence"
  | "emit-telemetry"

export type FuzzStage<I, O, E = unknown, R = never> = Readonly<{
  readonly id: FuzzStageId
  readonly title: string
  readonly run: (input: I) => Effect.Effect<O, E, R>
}>

export type FuzzStageDefinition = Readonly<{
  readonly id: FuzzStageId
  readonly title: string
  readonly description: string
}>

import type { Arbitrary } from "fast-check"

export type PhaseName = "pure" | "bridge" | "harness" | "edge"

export type LawDefinition = Readonly<{
  readonly name: string
  readonly description?: string
  readonly kind: "schema" | "algebra" | "contract" | "harness" | "adapter" | "e2e"
  readonly subject?: string
}>

export type PhaseContract = Readonly<{
  readonly phase: PhaseName
  readonly schemas?: Readonly<Record<string, unknown>>
  readonly arbitraries?: Readonly<Record<string, Arbitrary<unknown>>>
  readonly laws?: readonly LawDefinition[]
  readonly ports?: Readonly<Record<string, unknown>>
  readonly adapterContracts?: Readonly<
    Record<
      string,
      Readonly<{
        readonly input: unknown
        readonly output: unknown
        readonly error?: unknown
      }>
    >
  >
  readonly forbidden?: readonly string[]
}>

export const definePhaseContract = <A extends PhaseContract>(contract: A): A => contract

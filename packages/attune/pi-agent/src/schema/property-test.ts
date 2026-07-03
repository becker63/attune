import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

export const CounterexamplePolicy = S.Struct({
  persistMinimizedCounterexamples: S.Boolean,
  addRegressionFixturesWhenAccepted: S.Boolean,
  classifyFailureAsDesignOrImplementation: S.Boolean,
  requireExplanationBeforeDiscard: S.Boolean,
})
export type CounterexamplePolicy = typeof CounterexamplePolicy.Type

export const PropertyObligation = S.Struct({
  id: S.String,
  propertyName: S.String,
  targetPackage: S.String,
  generatorInputs: S.Array(S.String),
  invariant: S.String,
  counterexamplePolicy: CounterexamplePolicy,
  fixturePolicy: S.String,
  commands: S.Array(S.String),
  seedLoggingRequired: S.Boolean,
})
export type PropertyObligation = typeof PropertyObligation.Type

export const PropertyFailureClassification = S.Literals([
  "implementation-bug",
  "dsl-semantic-constraint",
  "fixture-gap",
  "generator-bug",
  "needs-human-review",
])
export type PropertyFailureClassification = typeof PropertyFailureClassification.Type

export const PropertyCounterexample = S.Struct({
  propertyName: S.String,
  seed: S.String,
  path: S.String,
  minimizedValue: S.String,
  classification: PropertyFailureClassification,
  persistedFixturePath: S.NullOr(S.String),
})
export type PropertyCounterexample = typeof PropertyCounterexample.Type

export const propertyTestSchemaModule = (): readonly string[] => [
  "CounterexamplePolicy",
  "PropertyObligation",
  "PropertyFailureClassification",
  "PropertyCounterexample",
]

export const AttunePiPropertyTestSchemaHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.schema.property-test.handler",
  recipeId: "attune-pi-agent.schema-catalog",
  sourcePath: "packages/attune/pi-agent/src/schema/property-test.ts",
  exportName: "propertyTestSchemaModule",
  emitsReceipts: ["attune-pi-agent.schema.property-test.projected"],
  handler: () => Effect.succeed(propertyTestSchemaModule()),
})

export const AttunePiPropertyTestSchemaRecipeModule = [
  AttunePiPropertyTestSchemaHandler,
] as const

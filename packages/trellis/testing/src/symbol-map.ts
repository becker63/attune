import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import {
  FrameworkTestingProjectId,
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  FrameworkTestingTestTarget,
  FrameworkTestingTypecheckTarget,
  frameworkTestingSourceSummary,
} from "./recipe-contracts.js"

export type SymbolId = string

export type SymbolTuple = readonly {
  readonly id: string
}[]

export type SymbolTupleIds<Symbols extends SymbolTuple> =
  Symbols[number]["id"]

export type SymbolMapEntry = (...args: readonly never[]) => unknown

export type SymbolHandlerRegistry<Handlers extends Readonly<Record<string, unknown>>> = Readonly<{
  readonly projectId: string
  readonly symbolIds: readonly (keyof Handlers & string)[]
  readonly handlers: Handlers
}>

export type MissingSymbolIds<
  ExpectedSymbolIds extends string,
  SymbolMap extends Readonly<Record<string, unknown>>,
> = Exclude<ExpectedSymbolIds, keyof SymbolMap & string>

export type ExtraSymbolIds<
  ExpectedSymbolIds extends string,
  SymbolMap extends Readonly<Record<string, unknown>>,
> = Exclude<keyof SymbolMap & string, ExpectedSymbolIds>

export type ExactSymbolMapStatus<
  ExpectedSymbolIds extends string,
  SymbolMap extends Readonly<Record<string, unknown>>,
> = MissingSymbolIds<ExpectedSymbolIds, SymbolMap> extends never
  ? ExtraSymbolIds<ExpectedSymbolIds, SymbolMap> extends never
    ? true
    : false
  : false

export type ExactSymbolMapDiagnostic<
  ExpectedSymbolIds extends string,
  SymbolMap extends Readonly<Record<string, unknown>>,
  MapKind extends string,
> = Readonly<{
  readonly __attuneDiagnostic: "exact-symbol-map"
  readonly mapKind: MapKind
  readonly missing: MissingSymbolIds<ExpectedSymbolIds, SymbolMap>
  readonly extra: ExtraSymbolIds<ExpectedSymbolIds, SymbolMap>
}>

export type AssertExactSymbolMap<
  ExpectedSymbolIds extends string,
  SymbolMap extends Readonly<Record<string, unknown>>,
  MapKind extends string = "symbol-map",
> = ExactSymbolMapStatus<ExpectedSymbolIds, SymbolMap> extends true
  ? SymbolMap
  : ExactSymbolMapDiagnostic<ExpectedSymbolIds, SymbolMap, MapKind>

export type ExactSymbolMapCoverage = Readonly<{
  readonly ok: boolean
  readonly expected: readonly string[]
  readonly actual: readonly string[]
  readonly missing: readonly string[]
  readonly extra: readonly string[]
}>

const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const sortedUnique = (values: Iterable<string>): readonly string[] =>
  [...new Set(values)].sort(compareText)

export const symbolIdsFromTuple = <const Symbols extends SymbolTuple>(
  symbols: Symbols,
): readonly SymbolTupleIds<Symbols>[] =>
  sortedUnique(symbols.map((symbol) => symbol.id)) as readonly SymbolTupleIds<Symbols>[]

export const exactSymbolMapCoverage = (
  expectedSymbolIds: readonly string[],
  symbolMap: Readonly<Record<string, unknown>>,
): ExactSymbolMapCoverage => {
  const expected = sortedUnique(expectedSymbolIds)
  const actual = sortedUnique(Object.keys(symbolMap))
  const expectedSet = new Set(expected)
  const actualSet = new Set(actual)
  const missing = expected.filter((symbolId) => !actualSet.has(symbolId))
  const extra = actual.filter((symbolId) => !expectedSet.has(symbolId))

  return {
    actual,
    expected,
    extra,
    missing,
    ok: missing.length === 0 && extra.length === 0,
  }
}

export class SymbolMapCoverageError extends Error {
  constructor(
    readonly projectId: string,
    readonly mapKind: string,
    readonly coverage: ExactSymbolMapCoverage,
  ) {
    super(
      [
        `Project ${projectId} has incomplete ${mapKind}.`,
        coverage.missing.length === 0 ? "" : `Missing: ${coverage.missing.join(", ")}`,
        coverage.extra.length === 0 ? "" : `Extra: ${coverage.extra.join(", ")}`,
      ].filter(Boolean).join(" "),
    )
    this.name = "SymbolMapCoverageError"
  }
}

export const assertExactSymbolMapCoverage = (
  projectId: string,
  mapKind: string,
  expectedSymbolIds: readonly string[],
  symbolMap: Readonly<Record<string, unknown>>,
): ExactSymbolMapCoverage => {
  const coverage = exactSymbolMapCoverage(expectedSymbolIds, symbolMap)
  if (!coverage.ok) {
    throw new SymbolMapCoverageError(projectId, mapKind, coverage)
  }
  return coverage
}

export const defineExactSymbolMap = <
  const SymbolIds extends readonly string[],
  const SymbolMap extends Readonly<Record<SymbolIds[number], unknown>>,
>(
  input: Readonly<{
    readonly projectId: string
    readonly mapKind: string
    readonly symbolIds: SymbolIds
    readonly map: SymbolMap
  }>,
): SymbolMap => {
  assertExactSymbolMapCoverage(
    input.projectId,
    input.mapKind,
    input.symbolIds,
    input.map,
  )
  return input.map
}

export const defineSymbolHandlerRegistry = <
  const Handlers extends Readonly<Record<string, unknown>>,
>(
  registry: Readonly<{
    readonly projectId: string
    readonly symbolIds?: readonly (keyof Handlers & string)[]
    readonly handlers: Handlers
  }>,
): SymbolHandlerRegistry<Handlers> => {
  const symbolIds = registry.symbolIds ?? sortedUnique(Object.keys(registry.handlers))
  assertExactSymbolMapCoverage(
    registry.projectId,
    "symbol-map",
    symbolIds,
    registry.handlers,
  )

  return {
    handlers: registry.handlers,
    projectId: registry.projectId,
    symbolIds,
  }
}

export const symbolHandlerRegistryCoverage = (
  registry: SymbolHandlerRegistry<Readonly<Record<string, unknown>>>,
): ExactSymbolMapCoverage =>
  exactSymbolMapCoverage(registry.symbolIds, registry.handlers)

export const symbolHandler = <
  Handlers extends Readonly<Record<string, unknown>>,
  Symbol extends keyof Handlers & string,
>(
  registry: SymbolHandlerRegistry<Handlers>,
  symbolId: Symbol,
): Handlers[Symbol] => registry.handlers[symbolId]

export const FrameworkTestingSymbolMapRecipeId = "framework-testing.symbol-map" as const
export const FrameworkTestingSymbolMapSourcePath = "packages/trellis/testing/src/symbol-map.ts" as const

export const describeFrameworkTestingSymbolMap = (
  input: FrameworkTestingSourceRecipeInput,
): FrameworkTestingSourceRecipeOutput =>
  frameworkTestingSourceSummary(input, "symbol-map", {
    observationCount: input.symbolIds.length,
  })

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingSymbolMapSourceResource = defineAlchemyResource({
  id: "framework-testing.symbol-map.source",
  kind: "file",
  alchemyType: "attune:resource:FrameworkTestingSymbolMapSource",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeInput,
  modes: ["read"],
  consumedBy: [FrameworkTestingSymbolMapRecipeId],
})

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingSymbolMapReportResource = defineAlchemyResource({
  id: "framework-testing.symbol-map.report",
  kind: "report",
  alchemyType: "attune:resource:FrameworkTestingSymbolMapReport",
  addressSchema: FrameworkTestingSourceRecipeInput,
  stateSchema: FrameworkTestingSourceRecipeOutput,
  modes: ["project", "read"],
  ownerRecipeId: FrameworkTestingSymbolMapRecipeId,
  producedBy: [FrameworkTestingSymbolMapRecipeId],
})

export const FrameworkTestingSymbolMapHandler = defineRecipeHandler<
  FrameworkTestingSourceRecipeInput,
  FrameworkTestingSourceRecipeOutput,
  never,
  never
>({
  id: "framework-testing.symbol-map.handler",
  recipeId: FrameworkTestingSymbolMapRecipeId,
  sourcePath: FrameworkTestingSymbolMapSourcePath,
  exportName: "describeFrameworkTestingSymbolMap",
  emitsReceipts: ["framework-testing.symbol-map.report"],
  handler: (input) => Effect.succeed(describeFrameworkTestingSymbolMap(input)),
})

export const FrameworkTestingSymbolMapDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "framework-testing.symbol-map.source",
  toRecipeId: FrameworkTestingSymbolMapRecipeId,
  resource: FrameworkTestingSymbolMapReportResource,
  kind: "projects",
  modes: ["read", "project"],
  validationTargets: [FrameworkTestingTestTarget],
})

export const FrameworkTestingSymbolMapRecipes = [
// @attune-packet-target generated-runtime-projection eligible
  defineProjectionRecipe({
    id: FrameworkTestingSymbolMapRecipeId,
    projectId: FrameworkTestingProjectId,
    title: "Own exact symbol map coverage helpers",
    inputSchema: FrameworkTestingSourceRecipeInput,
    outputSchema: FrameworkTestingSourceRecipeOutput,
    io: {
      inputSchema: FrameworkTestingSourceRecipeInput,
      outputSchema: FrameworkTestingSourceRecipeOutput,
      inputResources: [FrameworkTestingSymbolMapSourceResource],
      outputResources: [FrameworkTestingSymbolMapReportResource],
    },
    handler: FrameworkTestingSymbolMapHandler,
    alchemyDag: [FrameworkTestingSymbolMapDagEdge],
    nxTarget: FrameworkTestingTestTarget,
    allowedFiles: [FrameworkTestingSymbolMapSourcePath],
    validationEvidence: [FrameworkTestingTestTarget, FrameworkTestingTypecheckTarget],
  }),
] as const

export type OperationId = string

export type OperationMapEntry = (...args: readonly never[]) => unknown

export type OperationRegistry<Handlers extends Readonly<Record<string, unknown>>> = Readonly<{
  readonly packageId: string
  readonly protocolId?: string
  readonly operationIds: readonly (keyof Handlers & string)[]
  readonly handlers: Handlers
}>

export type MissingOperationIds<
  ExpectedOperationIds extends string,
  OperationMap extends Readonly<Record<string, unknown>>,
> = Exclude<ExpectedOperationIds, keyof OperationMap & string>

export type ExtraOperationIds<
  ExpectedOperationIds extends string,
  OperationMap extends Readonly<Record<string, unknown>>,
> = Exclude<keyof OperationMap & string, ExpectedOperationIds>

export type ExactOperationMapStatus<
  ExpectedOperationIds extends string,
  OperationMap extends Readonly<Record<string, unknown>>,
> = MissingOperationIds<ExpectedOperationIds, OperationMap> extends never
  ? ExtraOperationIds<ExpectedOperationIds, OperationMap> extends never
    ? true
    : false
  : false

export type ExactOperationMapDiagnostic<
  ExpectedOperationIds extends string,
  OperationMap extends Readonly<Record<string, unknown>>,
  MapKind extends string,
> = Readonly<{
  readonly __attuneDiagnostic: "exact-operation-map"
  readonly mapKind: MapKind
  readonly missing: MissingOperationIds<ExpectedOperationIds, OperationMap>
  readonly extra: ExtraOperationIds<ExpectedOperationIds, OperationMap>
}>

export type AssertExactOperationMap<
  ExpectedOperationIds extends string,
  OperationMap extends Readonly<Record<string, unknown>>,
  MapKind extends string = "operation-map",
> = ExactOperationMapStatus<ExpectedOperationIds, OperationMap> extends true
  ? OperationMap
  : ExactOperationMapDiagnostic<ExpectedOperationIds, OperationMap, MapKind>

export type ExactOperationMapCoverage = Readonly<{
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

export const exactOperationMapCoverage = (
  expectedOperationIds: readonly string[],
  operationMap: Readonly<Record<string, unknown>>,
): ExactOperationMapCoverage => {
  const expected = sortedUnique(expectedOperationIds)
  const actual = sortedUnique(Object.keys(operationMap))
  const expectedSet = new Set(expected)
  const actualSet = new Set(actual)
  const missing = expected.filter((operationId) => !actualSet.has(operationId))
  const extra = actual.filter((operationId) => !expectedSet.has(operationId))

  return {
    actual,
    expected,
    extra,
    missing,
    ok: missing.length === 0 && extra.length === 0,
  }
}

export class OperationMapCoverageError extends Error {
  constructor(
    readonly packageId: string,
    readonly mapKind: string,
    readonly coverage: ExactOperationMapCoverage,
  ) {
    super(
      [
        `Package ${packageId} has incomplete ${mapKind}.`,
        coverage.missing.length === 0 ? "" : `Missing: ${coverage.missing.join(", ")}`,
        coverage.extra.length === 0 ? "" : `Extra: ${coverage.extra.join(", ")}`,
      ].filter(Boolean).join(" "),
    )
    this.name = "OperationMapCoverageError"
  }
}

export const assertExactOperationMapCoverage = (
  packageId: string,
  mapKind: string,
  expectedOperationIds: readonly string[],
  operationMap: Readonly<Record<string, unknown>>,
): ExactOperationMapCoverage => {
  const coverage = exactOperationMapCoverage(expectedOperationIds, operationMap)
  if (!coverage.ok) {
    throw new OperationMapCoverageError(packageId, mapKind, coverage)
  }
  return coverage
}

export const defineOperationRegistry = <
  const Handlers extends Readonly<Record<string, unknown>>,
>(
  registry: Readonly<{
    readonly packageId: string
    readonly protocolId?: string
    readonly operationIds?: readonly (keyof Handlers & string)[]
    readonly handlers: Handlers
  }>,
): OperationRegistry<Handlers> => {
  const operationIds = registry.operationIds ?? sortedUnique(Object.keys(registry.handlers))
  assertExactOperationMapCoverage(
    registry.packageId,
    "operation-registry",
    operationIds,
    registry.handlers,
  )

  return {
    handlers: registry.handlers,
    operationIds,
    packageId: registry.packageId,
    ...(registry.protocolId === undefined ? {} : { protocolId: registry.protocolId }),
  }
}

export const operationRegistryCoverage = (
  registry: OperationRegistry<Readonly<Record<string, unknown>>>,
): ExactOperationMapCoverage =>
  exactOperationMapCoverage(registry.operationIds, registry.handlers)

export const operationHandler = <
  Handlers extends Readonly<Record<string, unknown>>,
  Operation extends keyof Handlers & string,
>(
  registry: OperationRegistry<Handlers>,
  operationId: Operation,
): Handlers[Operation] => registry.handlers[operationId]

import { Data } from "effect"
import type { FuzzCase, FuzzExpectation, ProjectFile } from "../domain/model.js"

export type QueryObservationSummary = Readonly<{
  readonly codes: readonly string[]
  readonly fullNames: readonly string[]
  readonly names: readonly string[]
}>

export type ExpectationQueryResult = Readonly<{
  readonly fingerprint: string
  readonly kind: string
  readonly name: string
  readonly observations: QueryObservationSummary
  readonly rowCount: number
}>

export type FuzzExpectationFailure = Readonly<{
  readonly caseId: string
  readonly expectation: FuzzExpectation
  readonly reason: string
}>

export class FuzzExpectationMismatchError extends Data.TaggedError("FuzzExpectationMismatchError")<{
  readonly failures: readonly FuzzExpectationFailure[]
}> {
  override get message(): string {
    const preview = this.failures
      .slice(0, 5)
      .map((failure) =>
        `${failure.caseId}:${failure.expectation.kind}:${failure.expectation.value} ${failure.reason}`
      )
      .join("; ")
    return `Fuzz expectation mismatch (${this.failures.length}): ${preview}`
  }
}

const identifierPattern = "[A-Za-z_$][A-Za-z0-9_$]*"
const keywords = new Set([
  "await",
  "catch",
  "const",
  "export",
  "for",
  "function",
  "if",
  "import",
  "new",
  "return",
  "switch",
  "while",
])

const expectationPrefixes = /^(async_boundary|decode|destructured|flow|handler|module_split|normalize|optional|propFlow|sink|source|wrapped)/iu
const signalLiteralPattern = /(api[_-]?key|password|secret|sink|source|token)/iu

const unique = (values: readonly string[]): readonly string[] =>
  [...new Set(values.filter((value) => value.trim().length > 0))]

const matches = (source: string, pattern: RegExp): readonly string[] =>
  [...source.matchAll(pattern)].map((match) => match[1] ?? "")

const methodNamesFor = (source: string): readonly string[] =>
  unique([
    ...matches(source, new RegExp(`\\bfunction\\s+(${identifierPattern})\\s*\\(`, "gu")),
    ...matches(source, new RegExp(`\\b(?:const|let|var)\\s+(${identifierPattern})\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|${identifierPattern})\\s*=>`, "gu")),
  ]).filter((name) => expectationPrefixes.test(name))

const callNamesFor = (source: string): readonly string[] =>
  unique([...source.matchAll(new RegExp(`\\b(${identifierPattern})\\s*\\(`, "gu"))]
    .flatMap((match) => {
      const name = match[1] ?? ""
      const before = source.slice(Math.max(0, match.index - 20), match.index)
      return /\bfunction\s+$/u.test(before) ? [] : [name]
    }))
    .filter((name) => !keywords.has(name))
    .filter((name) => expectationPrefixes.test(name))

const identifierNamesFor = (source: string): readonly string[] =>
  unique(matches(source, new RegExp(`\\b(?:const|let|var)\\s+(${identifierPattern})\\b`, "gu")))
    .filter((name) => expectationPrefixes.test(name))

const literalSignalsFor = (source: string): readonly string[] =>
  unique([
    ...matches(source, /"([^"]+)"/gu),
    ...matches(source, /'([^']+)'/gu),
    ...matches(source, /`([^`]+)`/gu),
  ]).filter((value) => signalLiteralPattern.test(value))

const expectation = (
  file: ProjectFile,
  kind: FuzzExpectation["kind"],
  value: string,
): FuzzExpectation => ({
  description: `${kind} ${value} should be visible to Joern from ${file.path}`,
  kind,
  sourcePath: file.path,
  value,
})

export const deriveExpectationsForFile = (
  file: ProjectFile,
): readonly FuzzExpectation[] =>
  [
    ...methodNamesFor(file.source).map((name) => expectation(file, "method-name", name)),
    ...callNamesFor(file.source).map((name) => expectation(file, "call-name", name)),
    ...identifierNamesFor(file.source).map((name) => expectation(file, "identifier-name", name)),
    ...literalSignalsFor(file.source).map((literal) => expectation(file, "literal-code-contains", literal)),
  ]

const stringField = (row: unknown, field: string): string | undefined => {
  if (typeof row !== "object" || row === null || !(field in row)) {
    return undefined
  }
  const value = (row as Record<string, unknown>)[field]
  return typeof value === "string" ? value : undefined
}

const limit = (values: readonly string[]): readonly string[] => unique(values).slice(0, 200)

export const summarizeQueryRows = (
  rows: readonly unknown[],
): QueryObservationSummary => ({
  codes: limit(rows.flatMap((row) => stringField(row, "code") ?? [])),
  fullNames: limit(rows.flatMap((row) => stringField(row, "fullName") ?? stringField(row, "method") ?? [])),
  names: limit(rows.flatMap((row) => stringField(row, "name") ?? [])),
})

const containsValue = (values: readonly string[], expected: string): boolean =>
  values.some((value) => value === expected || value.includes(expected))

const expectationMatched = (
  expected: FuzzExpectation,
  results: readonly ExpectationQueryResult[],
): boolean => {
  if (expected.kind === "call-name") {
    return results.some((result) =>
      result.fingerprint.includes("call") &&
      (
        containsValue(result.observations.names, expected.value) ||
        containsValue(result.observations.codes, `${expected.value}(`)
      )
    )
  }
  if (expected.kind === "identifier-name") {
    return results.some((result) =>
      result.fingerprint.includes("identifier") &&
      containsValue(result.observations.names, expected.value)
    )
  }
  if (expected.kind === "literal-code-contains") {
    return results.some((result) =>
      result.fingerprint.includes("literal") &&
      containsValue(result.observations.codes, expected.value)
    )
  }
  if (expected.kind === "method-name") {
    return results.some((result) =>
      result.fingerprint.includes("method") &&
      (
        containsValue(result.observations.names, expected.value) ||
        containsValue(result.observations.fullNames, expected.value)
      )
    )
  }
  return results.some((result) =>
    result.fingerprint.includes("type-decl") &&
    (
      containsValue(result.observations.names, expected.value) ||
      containsValue(result.observations.fullNames, expected.value)
    )
  )
}

export const checkFuzzExpectations = (
  cases: readonly FuzzCase[],
  results: readonly ExpectationQueryResult[],
): readonly FuzzExpectationFailure[] =>
  cases.flatMap((fuzzCase) =>
    (fuzzCase.expectations ?? []).flatMap((item) =>
      expectationMatched(item, results)
        ? []
        : [{
          caseId: fuzzCase.caseId,
          expectation: item,
          reason: "No executed query observed the planted semantic fact.",
        }]
    )
  )

export const assertFuzzExpectations = (
  cases: readonly FuzzCase[],
  results: readonly ExpectationQueryResult[],
): void => {
  const failures = checkFuzzExpectations(cases, results)
  if (failures.length > 0) {
    throw new FuzzExpectationMismatchError({ failures })
  }
}

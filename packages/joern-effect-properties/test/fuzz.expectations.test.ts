import { describe, expect, it } from "vitest"
import type { ProjectFile } from "../src/fuzz/index.js"
import {
  FuzzExpectationMismatchError,
  assertFuzzExpectations,
  checkFuzzExpectations,
  deriveExpectationsForFile,
  summarizeQueryRows,
} from "../src/fuzz/index.js"

const sourceFile = {
  path: "src/view.tsx",
  role: "component",
  source: [
    "declare function sink(value: unknown): unknown",
    "function source_marker(input: { readonly token: string }) {",
    "  return input.token",
    "}",
    "export function handler(input: { readonly token: string }) {",
    "  const token = source_marker(input)",
    "  return sink(token)",
    "}",
  ].join("\n"),
  syntaxFlavor: "tsx",
  tags: ["tsx", "expectation-bearing"],
} satisfies ProjectFile

describe("fuzz expectation-bearing cases", () => {
  it("derives planted call, method, identifier, and literal expectations from generated files", () => {
    const expectations = deriveExpectationsForFile(sourceFile)
    const tuples = expectations.map((item) => `${item.kind}:${item.value}`)

    expect(tuples).toEqual(expect.arrayContaining([
      "method-name:sink",
      "method-name:source_marker",
      "method-name:handler",
      "call-name:source_marker",
      "call-name:sink",
    ]))
  })

  it("matches expectations against query observation summaries", () => {
    const expectations = deriveExpectationsForFile(sourceFile)
    const queryResults = [
      {
        fingerprint: "call-name-any-to-rows-code-dispatch-method-name-type",
        kind: "rows",
        name: "call inventory",
        observations: summarizeQueryRows([
          { code: "sink(token)", name: "sink" },
          { code: "source_marker(input)", name: "source_marker" },
        ]),
        rowCount: 2,
      },
      {
        fingerprint: "method-name-any-to-rows-file-full-name-name-signature",
        kind: "rows",
        name: "method inventory",
        observations: summarizeQueryRows([
          { fullName: "handler", name: "handler" },
          { fullName: "source_marker", name: "source_marker" },
        ]),
        rowCount: 2,
      },
      {
        fingerprint: "identifier-name-any-to-rows-code-name-type",
        kind: "rows",
        name: "identifier inventory",
        observations: summarizeQueryRows([
          { code: "sink", name: "sink" },
          { code: "source_marker", name: "source_marker" },
        ]),
        rowCount: 2,
      },
    ]

    expect(checkFuzzExpectations([
      {
        caseId: "expectation-case",
        expectations,
        mutators: [],
        seed: {
          id: "expectation-seed",
          origin: "curated",
          source: sourceFile.source,
          syntaxFlavor: "tsx",
          title: "Expectation seed",
        },
        source: sourceFile.source,
        sourcePath: sourceFile.path,
        syntaxFlavor: "tsx",
      },
    ], queryResults)).toEqual([])
  })

  it("turns missing planted facts into structured oracle failures", () => {
    const expectations = deriveExpectationsForFile(sourceFile)
    const run = () => assertFuzzExpectations([
      {
        caseId: "expectation-case",
        expectations,
        mutators: [],
        seed: {
          id: "expectation-seed",
          origin: "curated",
          source: sourceFile.source,
          syntaxFlavor: "tsx",
          title: "Expectation seed",
        },
        source: sourceFile.source,
        sourcePath: sourceFile.path,
        syntaxFlavor: "tsx",
      },
    ], [])

    expect(run).toThrow(FuzzExpectationMismatchError)
  })
})

import { Schema } from "effect"
import fc from "fast-check"

import {
  PackageBoundaryValidationError,
  checkPackageBoundaryProperty,
  providedArbitrarySlot,
  replaySeedFromEvidence,
  schemaArbitrarySlot,
} from "../src/packageBoundaryProperty.js"

describe("package boundary property runtime", () => {
  it("returns successful structured evidence for a package operation", async () => {
    const evidence = await checkPackageBoundaryProperty({
      arbitrary: providedArbitrarySlot(
        fc.integer({ max: 2, min: 0 }),
        "small integers from generated harness",
      ),
      lawIds: ["schema.decode", "query.deterministic"],
      numRuns: 5,
      operation: (input) => ({ doubled: input * 2 }),
      operationId: "double",
      packageId: "joern-effect-properties",
      seed: 42,
      validateOutput: (output, context) => {
        expect(context.packageId).toBe("joern-effect-properties")
        expect(output.doubled % 2).toBe(0)
      },
    })

    expect(evidence.status).toBe("passed")
    expect(evidence.arbitrarySource.kind).toBe("provided")
    expect(evidence.lawIds).toStrictEqual(["schema.decode", "query.deterministic"])
    expect(evidence.run).toMatchObject({
      completedRuns: 5,
      requestedRuns: 5,
      seed: 42,
      skippedRuns: 0,
    })
    expect(evidence.validation.outputSuccesses).toBe(5)
    expect(evidence.records.map((record) => record.type)).toContain("package-boundary.property.completed")
  })

  it("derives arbitraries from Effect Schema and records the schema source", async () => {
    const InputSchema = Schema.Struct({
      kind: Schema.Literal("schema-derived"),
    })

    const evidence = await checkPackageBoundaryProperty({
      arbitrary: schemaArbitrarySlot(InputSchema, {
        description: "contract operation input",
        schemaId: "SchemaDerivedInput",
      }),
      lawIds: ["schema.decode"],
      numRuns: 3,
      operation: (input) => input,
      operationId: "schema-operation",
      packageId: "schema-package",
      seed: 20260621,
      validateOutput: (output) => {
        expect(output.kind).toBe("schema-derived")
      },
    })

    expect(evidence.status).toBe("passed")
    expect(evidence.arbitrarySource).toStrictEqual({
      description: "contract operation input",
      kind: "effect-schema",
      schemaId: "SchemaDerivedInput",
    })
    expect(evidence.validation.outputSuccesses).toBe(3)
  })

  it("returns failure evidence with counterexample metadata", async () => {
    const evidence = await checkPackageBoundaryProperty({
      arbitrary: providedArbitrarySlot(fc.constant(7), "known failing value"),
      lawIds: ["schema.decode"],
      numRuns: 1,
      operation: (input) => ({ value: input }),
      operationId: "reject-seven",
      packageId: "counterexample-package",
      seed: 99,
      validateOutput: () => false,
    })

    expect(evidence.status).toBe("failed")
    expect(evidence.counterexample).toMatchObject({
      errorMessage: "validateOutput returned false",
      errorName: "PackageBoundaryValidationError",
      generatedValueSummary: "7",
      shrinkCount: 0,
    })
    expect(evidence.records.map((record) => record.type)).toContain("package-boundary.case.failed")
    expect(evidence.records.map((record) => record.type)).toContain("package-boundary.property.failed")
  })

  it("records deterministic seed and run metadata", async () => {
    const run = async () => {
      const seen: number[] = []
      const evidence = await checkPackageBoundaryProperty({
        arbitrary: providedArbitrarySlot(fc.integer({ max: 20, min: 0 }), "deterministic integers"),
        lawIds: ["query.deterministic"],
        numRuns: 6,
        operation: (input) => {
          seen.push(input)
          return input
        },
        operationId: "deterministic-sequence",
        packageId: "deterministic-package",
        seed: 1234,
      })
      return { evidence, seen }
    }

    const first = await run()
    const second = await run()

    expect(first.seen).toStrictEqual(second.seen)
    expect(first.evidence.run).toMatchObject({
      completedRuns: 6,
      requestedRuns: 6,
      seed: 1234,
    })
    expect(first.evidence.run.replay).toMatchObject({
      numRuns: 6,
      operationId: "deterministic-sequence",
      packageId: "deterministic-package",
      randomSource: "main-thread",
      seed: 1234,
    })
  })

  it("accepts operation errors only through the typed error validation hook", async () => {
    const evidence = await checkPackageBoundaryProperty({
      arbitrary: providedArbitrarySlot(fc.constant("bad-input"), "typed failure input"),
      lawIds: ["schema.decode", "typed-error.decode"],
      numRuns: 1,
      operation: () => {
        throw new RangeError("expected typed failure")
      },
      operationId: "typed-failure",
      packageId: "typed-error-package",
      seed: 77,
      validateError: (error, context) => {
        expect(context.operationId).toBe("typed-failure")
        expect(error).toBeInstanceOf(RangeError)
      },
    })

    expect(evidence.status).toBe("passed")
    expect(evidence.validation).toStrictEqual({
      errorSuccesses: 1,
      outputSuccesses: 0,
    })
    expect(evidence.records.map((record) => record.type)).toContain("package-boundary.case.error-validated")
  })

  it("exposes a replay seed shape for failed runs", async () => {
    const evidence = await checkPackageBoundaryProperty({
      arbitrary: providedArbitrarySlot(fc.constant({ value: "replay-me" }), "replay value"),
      lawIds: ["schema.decode"],
      numRuns: 1,
      operation: () => {
        throw new PackageBoundaryValidationError("forced replay failure", {
          reason: "test",
        })
      },
      operationId: "replay-operation",
      packageId: "replay-package",
      seed: 314159,
    })

    const replay = replaySeedFromEvidence(evidence)

    expect(evidence.status).toBe("failed")
    expect(replay).toMatchObject({
      lawIds: ["schema.decode"],
      numRuns: 1,
      operationId: "replay-operation",
      packageId: "replay-package",
      randomSource: "main-thread",
      seed: 314159,
    })
    expect("path" in replay).toBe(true)
    expect(evidence.counterexample?.generatedValueSummary).toBe("{\"value\":\"replay-me\"}")
  })
})

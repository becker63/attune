import { describe, expect, expectTypeOf, it } from "vitest"
import { Schema } from "effect"

import { decodePackageContract } from "@attune/framework-protocol"
import {
  JoernSharedEvidenceSummary,
  JoernTypedTargetIntent,
  PackageContract,
  PackageEvidenceShapes,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTargetIntents,
  PackageTypeGuidance,
  PackageViews,
  generatedSchemaCoverageOperation,
  generatedTraversalDslOperation,
  joernRuntimeQueryOperation,
  joernTemplateBoundaryOperation,
  queryEvidenceViewOperation,
  type JoernEffectOperationId,
} from "../src/attune.package.js"

type OperationIds<Contract> =
  Contract extends { readonly operations: readonly (infer Operation)[] }
    ? Operation extends { readonly id: infer Id extends string } ? Id : never
    : never

const requiredOperationIds = [
  "joern-runtime-query",
  "cpg-program-builder",
  "generated-traversal-dsl",
  "joern-template-boundary",
  "query-evidence-view",
  "generated-schema-coverage",
] as const

describe("joern-effect package contract", () => {
  it("declares the Joern runtime and DSL proof package boundary", () => {
    expect(PackageContract.packageId).toBe("joern-effect")
    expect(PackageContract.packageKind).toBe("joern-runtime-and-dsl")
    expect(PackageContract.sourceRoot).toBe("packages/joern-effect/src")
    expect(PackageContract.services).toEqual([
      "joern-effect/Joern",
      "joern-effect/CpgProgramBuilder",
    ])
    expect(PackageContract.operations.map((operation) => operation.id)).toEqual(
      [...requiredOperationIds],
    )

    expectTypeOf<JoernEffectOperationId>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()
    expectTypeOf<OperationIds<typeof PackageContract>>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()

    const decoded = decodePackageContract(PackageContract)
    expect(decoded.operations.map((operation) => operation.kind)).toEqual([
      "command",
      "query",
      "generator",
      "joern-template",
      "atom-family",
      "atom-family",
    ])
  })

  it("records package-level Reactivity and atoms for proof evidence views", () => {
    expect(PackageViews.reactivityKeys).toEqual(expect.arrayContaining([
      "joern-effect.runtime.query.changed",
      "joern-effect.traversal-dsl.generated",
      "joern-effect.template-registry.changed",
      "joern-effect.query-evidence.changed",
      "joern-effect.generated-schema-coverage.changed",
    ]))
    expect(PackageViews.atoms).toEqual(expect.arrayContaining([
      "templateRegistryAtom",
      "queryEvidenceAtom",
      "generatedSchemaCoverageAtom",
    ]))
    expect(joernRuntimeQueryOperation.views?.atoms).toContain(
      "queryEvidenceAtom",
    )
    expect(joernTemplateBoundaryOperation.views?.atoms).toContain(
      "templateRegistryAtom",
    )
    expect(generatedSchemaCoverageOperation.views?.reactivityKeys).toContain(
      "joern-effect.generated-schema-coverage.changed",
    )
    expect(queryEvidenceViewOperation.atom).toMatchObject({
      family: "query-evidence",
    })
  })

  it("keeps exact handlers, properties, layers, and type guidance aligned", () => {
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...requiredOperationIds])
    expect(Object.keys(PackageProperties)).toEqual([...requiredOperationIds])
    expect(PackageLayer.provides).toEqual(PackageContract.providedServices)
    expect(PackageTestLayer.provides).toEqual(expect.arrayContaining([
      ...PackageContract.providedServices,
      ...PackageContract.requiredServices,
    ]))
    expect(Object.keys(PackageTypeGuidance.operations)).toEqual([
      ...requiredOperationIds,
    ])
  })

  it("tracks generator/template metadata and migration waivers", () => {
    expect(generatedTraversalDslOperation.generator).toMatchObject({
      name: "joern-effect:emit-generated",
      output: "src/pure/generated",
    })
    expect(joernTemplateBoundaryOperation.joern).toMatchObject({
      registry: "TemplateRegistry.generated.ts",
    })
    expect(PackageContract.waivers?.map((waiver) => waiver.id)).toEqual(
      expect.arrayContaining([
        "joern-effect/context-tag-services",
        "joern-effect/process-runtime-boundary",
        "joern-effect/template-registry-generation-gap",
        "joern-effect/typed-executor-migration",
      ]),
    )
  })

  it("declares shared evidence summaries and typed target intents for Joern toolchain surfaces", () => {
    const operationIds = new Set(requiredOperationIds)
    const decodeEvidence = Schema.decodeUnknownSync(JoernSharedEvidenceSummary)
    const decodeTarget = Schema.decodeUnknownSync(JoernTypedTargetIntent)

    expect(Object.keys(PackageEvidenceShapes)).toEqual([...requiredOperationIds])
    for (const [operationId, evidence] of Object.entries(PackageEvidenceShapes)) {
      expect(operationIds.has(operationId as (typeof requiredOperationIds)[number])).toBe(true)
      expect(decodeEvidence(evidence)).toMatchObject({
        operationId,
      })
      expect(evidence.protocolEvidenceKinds).toEqual(expect.arrayContaining([
        expect.stringMatching(/property-run|atom-movement|coverage-point|reactivity-key|law-observed/),
      ]))
    }

    expect(PackageTargetIntents.map((target) => target.targetName)).toEqual([
      "test",
      "emit-generated",
      "extract-cpg-schema",
    ])
    for (const target of PackageTargetIntents) {
      expect(decodeTarget(target)).toMatchObject({
        commandSurfaceWaiverId: "joern-effect/typed-executor-migration",
      })
      expect(target.operationIds.every((operationId) => operationIds.has(operationId))).toBe(true)
    }
    expect(PackageTargetIntents.find((target) => target.targetName === "extract-cpg-schema"))
      ?.toMatchObject({
        intendedExecutor: "attune:toolchain",
        resourceTier: "proof-pressure",
        typedOptions: {
          toolchain: "joern",
        },
      })
  })

  it("exposes type-guidance partitions for generated proof audits", () => {
    const partitions = Object.fromEntries(
      Object.entries(PackageTypeGuidance.operations).map(
        ([operationId, operation]) => [
          operationId,
          [
            ...(operation.partitions ?? []),
            ...(operation.inputPartitions ?? []),
            ...(operation.outputPartitions ?? []),
            ...(operation.errorPartitions ?? []),
            ...(operation.lawPartitions ?? []),
            ...(operation.viewPartitions ?? []),
          ].map((partition) => (partition as { readonly id: string }).id),
        ],
      ),
    )

    expect(partitions["generated-traversal-dsl"]).toEqual(
      expect.arrayContaining([
        "generator.deterministic-output",
        "generatedSchemaCoverageAtom.moves",
        "generated-traversal-dsl.generated-files",
      ]),
    )
    expect(partitions["joern-template-boundary"]).toEqual(
      expect.arrayContaining([
        "joern.template-schema",
        "templateRegistryAtom.moves",
      ]),
    )
    expect(
      PackageTypeGuidance.operations["joern-runtime-query"]!.filters,
    ).toContainEqual(
      expect.objectContaining({
        id: "joern-runtime-query.fixture-transport",
        kind: "operation-precondition",
      }),
    )
  })
})

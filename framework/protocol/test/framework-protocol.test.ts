import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"
import {
  DiagnosticRuleDescriptorSchema,
  inferDiagnosticRuleIds,
  inferDiagnosticRules,
  isDiagnosticRuleAllowedForSymbol,
  missingMetadataForSymbol,
} from "../src/diagnostic-rules/index.js"
import {
  AttuneProtocolWaiverSchema,
  baseAtom,
  definePackageViewGraph,
  deriveDiagnosticRequirements,
  deriveSymbolProjectionEdges,
  deriveSymbolRegistry,
  diagnoseAvoidableStringReferences,
  derivedAtom,
  schemaDescriptorFromProjectFacts,
  diagnosticFromRepairFinding,
  extractProtocolSourceSummary,
  hashProgramValue,
  packageViewAtom,
  schemaDescriptorIdForProject,
  reactivityKey,
  roundtripSourceReference,
  touchedViewsFromReferences,
  diagnoseProtocolWaivers,
  waiverDeltasFromFindings,
} from "../src/index.js"
import {
  assertExactHandlers,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  type InputOf,
  type SymbolIds,
  type OutputOf,
} from "../src/project-facts/index.js"

describe("@attune/framework-protocol", () => {
  it("keeps package authoring on the public framework facade", () => {
    const PackageViews = definePackageViews({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)

    const contract = definePackageContract({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        defineOperation({
          id: "demo-projection",
          kind: "projection",
          input: "demo-input-schema" as never,
          output: "demo-output-schema" as never,
        }),
      ],
    } as const)

    expect(contract.packageId).toBe("demo")
    expect(contract.operations[0]?.kind).toBe("projection")
    expect(schemaDescriptorIdForProject(contract.packageId)).toBe("attune/project/demo")
  })

  it("exposes compile-only contract conformance helpers through the public framework facade", () => {
    const LookupInput = Schema.Struct({ id: Schema.String })
    const LookupOutput = Schema.Struct({ value: Schema.String })
    const PackageViews = definePackageViews({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)
    const contract = definePackageContract({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        defineOperation({
          id: "lookup",
          kind: "query",
          input: LookupInput,
          output: LookupOutput,
          views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
          laws: ["schema.decode"] as const,
        }),
      ],
    } as const)
    const handlers = {
      lookup: () => ({ value: "ok" }),
    } as const
    const properties = {
      lookup: () => true,
    } as const
    const typeGuidance = defineTypeGuidance(contract, {
      operations: {
        lookup: {
          lawPartitions: [{ id: "schema.decode", kind: "law", from: "explicit-law" }],
          viewPartitions: [{ id: "demo.changed", kind: "reactivity-key", from: "touches.reactivity-key" }],
        },
      },
    } as const)

    expect(assertPackageContract(contract)).toBe(true)
    expect(assertExactHandlers(contract, handlers)).toBe(true)
    expect(assertPropertyHarnesses(contract, properties)).toBe(true)
    expect(assertTypeGuidanceComplete(contract, typeGuidance)).toBe(true)
    expectTypeOf<SymbolIds<typeof contract>>().toEqualTypeOf<"lookup">()
    expectTypeOf<InputOf<typeof contract, "lookup">>().toEqualTypeOf<{ readonly id: string }>()
    expectTypeOf<OutputOf<typeof contract, "lookup">>().toEqualTypeOf<{ readonly value: string }>()
  })

  it("infers framework-owned diagnostic rules from operation kind and metadata", () => {
    const operation = {
      id: "nixos-anywhere-install",
      kind: "resource-provider",
      schemas: {
        input: "InstallInput",
        output: "InstallEvidence",
        error: "InstallError",
      },
      resource: {
        observes: true,
        observationSchema: "InstalledHostObservation",
        desiredStateSchema: "DesiredHost",
        currentProofSchema: "CurrentDiskProof",
        approvalSchema: "DestructiveApproval",
        destructive: true,
      },
      touches: {
        reactivityKeys: ["host-readiness", "destructive-approval"],
        atoms: ["hostReadinessAtom", "providerGateAtom"],
      },
    } as const

    expect(inferDiagnosticRuleIds(operation)).toEqual([
      "schema.decode",
      "schema.encode",
      "schema.error-decode",
      "side-effect.declared-boundary",
      "resource.observe-before-apply",
      "view.reactivity-key-moves",
      "view.atom-moves",
      "resource.observed-idempotence",
      "resource.current-destructive-proof",
      "resource.destructive-approval",
      "resource.no-repeat-destructive",
    ])
    expect(missingMetadataForSymbol(operation)).toEqual([])
    expect(isDiagnosticRuleAllowedForSymbol("resource.destructive-approval", operation)).toBe(true)
    expect(Schema.decodeUnknownSync(DiagnosticRuleDescriptorSchema)(inferDiagnosticRules(operation)[0])).toMatchObject({
      id: "schema.decode",
      source: "shared-kernel",
    })
  })

  it("keeps project-specific diagnostic rule extensions explicit", () => {
    const operation = {
      id: "effect-service-generator",
      kind: "generator",
      generator: {
        optionsSchema: "GeneratorOptions",
        virtualTreeSchema: "Tree",
        outputSchema: "GeneratedFiles",
        provenanceSchema: "GeneratorProvenance",
      },
      views: {
        packageViews: ["generatedFileDiffAtom"],
      },
      customDiagnosticRules: [{
        id: "generator.provenance-recorded",
        family: "generator-provenance",
        severity: "required",
        operationKinds: ["generator"],
        description: "Generated file provenance is recorded in the project-specific ledger.",
        source: "custom-extension",
        metadata: { owner: "@attune/nx:effect-service" },
      }],
    } as const

    expect(inferDiagnosticRuleIds(operation)).toEqual([
      "schema.decode",
      "schema.encode",
      "determinism.same-input-same-output",
      "side-effect.virtual-tree-only",
      "generator.options-decode",
      "generator.deterministic-output",
      "generator.provenance-recorded",
      "generator.no-untracked-output",
      "view.package-view-moves",
      "generator.provenance-recorded",
    ])
    expect(inferDiagnosticRules(operation).at(-1)).toMatchObject({
      source: "custom-extension",
      metadata: { owner: "@attune/nx:effect-service" },
    })
  })

  it("projects protocol deltas into framework diagnostics", () => {
    const diagnostic = diagnosticFromRepairFinding({
      findingId: "finding-1",
      schemaDescriptorId: "attune/project/demo",
      projectId: "demo",
      kind: "missing-observation",
      sourcePath: "packages/demo/src/attune.package.ts",
      explanation: "missing generated observations",
      repairActions: [{
        id: "generate-observations",
        title: "Generate property observations scaffold",
        kind: "nx-generator",
        target: "@attune/framework-nx:protocol-observations",
      }],
    })

    expect(diagnostic.code).toBe("attune/program-facts/missing-observation")
    expect(diagnostic.suggestedActions[0]?.title).toContain("observations")
  })

  it("derives stable descriptor hashes and diagnosticRequirements from project factss", () => {
    const PackageViews = definePackageViews({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)
    const contract = definePackageContract({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        defineOperation({
          id: "demo-projection",
          kind: "projection",
          input: "demo-input-schema" as never,
          output: "demo-output-schema" as never,
          laws: ["projection.deterministic-replay"],
          views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
        }),
      ],
    } as const)

    const descriptor = schemaDescriptorFromProjectFacts({
      sourcePath: "packages/demo/src/attune.package.ts",
      contract,
    })
    expect(descriptor.descriptorHash).toBe(hashProgramValue({
      schemaDescriptorId: "attune/project/demo",
      projectId: "demo",
      packageKind: "core-discovery-runtime",
      sourcePath: "packages/demo/src/attune.package.ts",
      views: PackageViews,
      services: [],
      operations: [{
        id: "demo-projection",
        kind: "projection",
        views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
        laws: ["projection.deterministic-replay"],
        inputSchema: "demo-input-schema",
        outputSchema: "demo-output-schema",
      }],
      waivers: [],
      coverageExpectations: [],
    }))
    expect(deriveDiagnosticRequirements(descriptor).map((obligation) => obligation.kind)).toEqual([
      "handler",
      "property",
      "law",
      "view-movement",
      "type-guidance",
      "generated-artifact",
    ])
  })

  it("decodes local waiver metadata and projects waiver findings into protocol deltas", () => {
    const waiver = Schema.decodeUnknownSync(AttuneProtocolWaiverSchema)({
      id: "demo/temporary-generator-bridge",
      category: "temporary-migration-adapter",
      owner: "framework-protocol-test",
      reason: "The generated registry bridge is still being replaced by framework/nx.",
      expiresOn: "2026-06-21",
    })

    const findings = diagnoseProtocolWaivers({
      projectId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      today: "2026-06-22",
      waivers: [waiver],
    })
    expect(findings).toEqual([expect.objectContaining({
      code: "attune/program-facts/waiver/expired-temporary",
      severity: "error",
      waiverId: "demo/temporary-generator-bridge",
    })])

    expect(waiverDeltasFromFindings({
      schemaDescriptorId: "attune/project/demo",
      findings,
    })).toEqual([expect.objectContaining({
      kind: "waiver-issue",
      projectId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
    })])
  })

  it("derives stable ids from source declarations while preserving explicit overrides", () => {
    const changed = reactivityKey({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "projectionChanged",
    }, { projectId: "demo" })
    const overridden = packageViewAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      exportName: "WorkbenchSnapshot",
      symbolName: "workbenchSnapshotAtom",
    }, {
      projectId: "demo",
      explicitId: "demo.view.workbench-snapshot",
    })

    expect(changed.id).toBe("demo.reactivity.projection-changed")
    expect(overridden.id).toBe("demo.view.workbench-snapshot")
    expect(roundtripSourceReference(overridden)).toEqual(overridden)
  })

  it("derives operation-to-view graph edges from Reactivity and atom declarations", () => {
    const changed = reactivityKey({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "projectionChanged",
    }, { projectId: "demo" })
    const readModel = baseAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "discoveryReadModel",
    }, { projectId: "demo" })
    const packet = derivedAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "decisionPacket",
    }, { projectId: "demo" })
    const snapshot = packageViewAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "workbenchSnapshot",
    }, { projectId: "demo" })

    const operation = defineOperation({
      id: "event-replay-projection",
      kind: "projection",
      input: "events" as never,
      output: "snapshot" as never,
      views: touchedViewsFromReferences({
        reactivityKeys: [changed],
        atoms: [snapshot],
      }),
    })
    const graph = definePackageViewGraph({
      reactivityKeys: [changed.id],
      baseAtoms: [{ id: readModel.id, refreshesOn: [changed.id] }],
      derivedAtoms: [{ id: packet.id, reads: [readModel.id] }],
      packageViewAtoms: [{ id: snapshot.id, reads: [packet.id] }],
    } as const)

    expect(deriveSymbolProjectionEdges(operation, graph)).toEqual([{
      symbolId: "event-replay-projection",
      reactivityKey: changed.id,
      baseAtom: readModel.id,
      derivedAtoms: [packet.id],
      packageViewAtoms: [snapshot.id],
    }])
  })

  it("derives exact symbol registries and rejects duplicate ids", () => {
    const symbol = defineOperation({
      id: "demo-projection",
      kind: "projection",
      input: "demo-input-schema" as never,
      output: "demo-output-schema" as never,
    })

    expect(deriveSymbolRegistry([symbol] as const)["demo-projection"]).toBe(symbol)
    expect(() => deriveSymbolRegistry([symbol, symbol] as const)).toThrow(
      /Duplicate Attune symbol ids/,
    )
  })

  it("diagnoses raw references that are not backed by source declarations", () => {
    const changed = reactivityKey({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "projectionChanged",
    }, { projectId: "demo" })

    expect(diagnoseAvoidableStringReferences([
      changed.id,
      "demo.raw-string",
    ], [changed])).toEqual([{
      code: "attune/program-facts/avoidable-string-reference",
      reference: "demo.raw-string",
      message: "Reference demo.raw-string is not backed by a source declaration.",
      suggestedAction: "Replace the raw string with a framework source reference or add an explicit id override.",
    }])
  })

  it("extracts protocol source declarations, ranges, imports, and type text", () => {
    const fixtureDir = mkdtempSync(join(tmpdir(), "attune-protocol-source-"))
    const fixturePath = join(fixtureDir, "attune.package.ts")

    writeFileSync(fixturePath, [
      "import { Schema } from \"effect\"",
      "import { packageViewAtom, projection, reactivityKey } from \"@attune/framework-protocol\"",
      "",
      "export const Snapshot = Schema.Struct({ value: Schema.String })",
      "export const projectionChanged = reactivityKey({",
      "  sourcePath: \"fixture/attune.package.ts\",",
      "  symbolName: \"projectionChanged\",",
      "})",
      "export const workbenchSnapshot = packageViewAtom({",
      "  sourcePath: \"fixture/attune.package.ts\",",
      "  symbolName: \"workbenchSnapshot\",",
      "})",
      "export const eventReplayProjection = projection({",
      "  id: \"event-replay-projection\",",
      "  input: Snapshot,",
      "  output: Snapshot,",
      "  views: { reactivityKeys: [projectionChanged.id], atoms: [\"demo.view.workbench-snapshot\"] },",
      "})",
    ].join("\n"))

    try {
      const summary = extractProtocolSourceSummary({
        sourceFiles: [fixturePath],
        projectId: "demo",
      })

      expect(summary.sourceFiles).toEqual([fixturePath])
      expect(summary.imports.map((sourceImport) => [
        sourceImport.importedName,
        sourceImport.localName,
        sourceImport.moduleSpecifier,
      ])).toContainEqual(["projection", "projection", "@attune/framework-protocol"])

      const declarations = new Map(
        summary.declarations.map((declaration) => [
          declaration.declaration.exportName,
          declaration,
        ]),
      )
      expect(declarations.get("projectionChanged")).toMatchObject({
        kind: "reactivity-key",
        id: "demo.reactivity.projection-changed",
        declaration: {
          sourcePath: fixturePath,
          symbolName: "projectionChanged",
          range: {
            start: { line: 5, character: 1 },
          },
        },
      })
      expect(declarations.get("workbenchSnapshot")?.id).toBe(
        "demo.view.workbench-snapshot",
      )
      expect(declarations.get("eventReplayProjection")).toMatchObject({
        kind: "operation",
        id: "event-replay-projection",
      })
      expect(declarations.get("eventReplayProjection")?.typeText).toEqual(
        expect.any(String),
      )
      expect(declarations.get("eventReplayProjection")?.imports.map((sourceImport) =>
        sourceImport.localName
      )).toEqual(expect.arrayContaining(["projection"]))
      expect(summary.diagnostics).toEqual(expect.arrayContaining([{
        code: "attune/program-facts/avoidable-string-reference",
        reference: "demo.view.workbench-snapshot",
        message: "Reference demo.view.workbench-snapshot has a source declaration and should use its source reference.",
        suggestedAction: "Replace the raw string with the exported framework source reference.",
      }]))
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true })
    }
  })
})

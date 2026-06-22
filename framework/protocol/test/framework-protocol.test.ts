import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  baseAtom,
  definePackageViewGraph,
  deriveProtocolObligations,
  deriveOperationRegistry,
  deriveOperationToViewEdges,
  diagnoseAvoidableStringReferences,
  defineAttunePackage,
  derivedAtom,
  descriptorFromPackageContract,
  diagnosticFromDelta,
  extractProtocolSourceSummary,
  hashProtocolValue,
  packageViewAtom,
  projection,
  protocolIdForPackage,
  reactivityKey,
  roundtripSourceReference,
  touchedViewsFromReferences,
  views,
} from "../src/index.js"

describe("@attune/framework-protocol", () => {
  it("keeps package authoring on the public framework facade", () => {
    const PackageViews = views({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)

    const contract = defineAttunePackage({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        projection({
          id: "demo-projection",
          input: "demo-input-schema" as never,
          output: "demo-output-schema" as never,
        }),
      ],
    } as const)

    expect(contract.packageId).toBe("demo")
    expect(contract.operations[0]?.kind).toBe("projection")
    expect(protocolIdForPackage(contract.packageId)).toBe("attune/package/demo")
  })

  it("projects protocol deltas into framework diagnostics", () => {
    const diagnostic = diagnosticFromDelta({
      deltaId: "delta-1",
      protocolId: "attune/package/demo",
      packageId: "demo",
      kind: "missing-obligation",
      sourcePath: "packages/demo/src/attune.package.ts",
      explanation: "missing generated evidence",
      repairActions: [{
        id: "generate-evidence",
        title: "Generate property evidence scaffold",
        kind: "nx-generator",
        target: "@attune/framework-nx:protocol-evidence",
      }],
    })

    expect(diagnostic.code).toBe("attune/protocol/missing-obligation")
    expect(diagnostic.suggestedActions[0]?.title).toContain("evidence")
  })

  it("derives stable descriptor hashes and obligations from package contracts", () => {
    const PackageViews = views({
      reactivityKeys: ["demo.changed"],
      atoms: ["demoAtom"],
    } as const)
    const contract = defineAttunePackage({
      packageId: "demo",
      packageKind: "core-discovery-runtime",
      views: PackageViews,
      operations: [
        projection({
          id: "demo-projection",
          input: "demo-input-schema" as never,
          output: "demo-output-schema" as never,
          laws: ["projection.deterministic-replay"],
          views: { reactivityKeys: ["demo.changed"], atoms: ["demoAtom"] },
        }),
      ],
    } as const)

    const descriptor = descriptorFromPackageContract({
      sourcePath: "packages/demo/src/attune.package.ts",
      contract,
    })
    expect(descriptor.descriptorHash).toBe(hashProtocolValue({
      protocolId: "attune/package/demo",
      packageId: "demo",
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
    }))
    expect(deriveProtocolObligations(descriptor).map((obligation) => obligation.kind)).toEqual([
      "handler",
      "property",
      "law",
      "view-movement",
      "type-guidance",
      "generated-artifact",
    ])
  })

  it("derives stable ids from source declarations while preserving explicit overrides", () => {
    const changed = reactivityKey({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "projectionChanged",
    }, { packageId: "demo" })
    const overridden = packageViewAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      exportName: "WorkbenchSnapshot",
      symbolName: "workbenchSnapshotAtom",
    }, {
      packageId: "demo",
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
    }, { packageId: "demo" })
    const readModel = baseAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "discoveryReadModel",
    }, { packageId: "demo" })
    const packet = derivedAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "decisionPacket",
    }, { packageId: "demo" })
    const snapshot = packageViewAtom({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "workbenchSnapshot",
    }, { packageId: "demo" })

    const operation = projection({
      id: "event-replay-projection",
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

    expect(deriveOperationToViewEdges(operation, graph)).toEqual([{
      operationId: "event-replay-projection",
      reactivityKey: changed.id,
      baseAtom: readModel.id,
      derivedAtoms: [packet.id],
      packageViewAtoms: [snapshot.id],
    }])
  })

  it("derives exact operation registries and rejects duplicate ids", () => {
    const operation = projection({
      id: "demo-projection",
      input: "demo-input-schema" as never,
      output: "demo-output-schema" as never,
    })

    expect(deriveOperationRegistry([operation] as const)["demo-projection"]).toBe(operation)
    expect(() => deriveOperationRegistry([operation, operation] as const)).toThrow(
      /Duplicate Attune operation ids/,
    )
  })

  it("diagnoses raw references that are not backed by source declarations", () => {
    const changed = reactivityKey({
      sourcePath: "packages/demo/src/attune.package.ts",
      symbolName: "projectionChanged",
    }, { packageId: "demo" })

    expect(diagnoseAvoidableStringReferences([
      changed.id,
      "demo.raw-string",
    ], [changed])).toEqual([{
      code: "attune/protocol/avoidable-string-reference",
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
        packageId: "demo",
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
        code: "attune/protocol/avoidable-string-reference",
        reference: "demo.view.workbench-snapshot",
        message: "Reference demo.view.workbench-snapshot has a source declaration and should use its source reference.",
        suggestedAction: "Replace the raw string with the exported framework source reference.",
      }]))
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true })
    }
  })
})

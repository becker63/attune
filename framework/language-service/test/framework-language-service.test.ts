import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  InMemoryProtocolStoreLive,
  ProtocolDiagnostics,
  ProtocolDiagnosticsLive,
  ProtocolProjectionLive,
  ProtocolQuery,
  ProtocolQueryLive,
  ProtocolRuntime,
  ProtocolRuntimeLive,
  ProtocolStore,
  type ProtocolStoreSnapshot,
} from "@attune/framework-runtime"
import {
  codeActionsForDiagnostic,
  diagnosticCodeLens,
  isDirectGeneratedFileWriteAction,
  projectLanguageServiceViewFromRuntime,
  sourceRangeIndexFromFixtures,
  sourceRangeKey,
} from "../src/index.js"

const sourcePath = "packages/demo/src/attune.package.ts"
const generatedPath = "packages/demo/src/generated/operation-registry.ts"
const protocolId = "attune/package/demo"

const demoDescriptor = {
  protocolId,
  packageId: "demo",
  packageKind: "policy-plugin",
  descriptorHash: "demo-hash",
  sourcePath,
  views: {
    reactivityKeys: ["demo.changed"],
    atoms: ["demoView"],
  },
  services: [],
  operations: [{
    id: "project",
    kind: "projection",
    views: {
      reactivityKeys: ["demo.changed"],
      atoms: ["demoView"],
    },
    laws: ["projection.deterministic-replay"],
    inputSchema: "ProjectInput",
    outputSchema: "ProjectOutput",
  }],
  waivers: [],
  coverageExpectations: [],
} as const

const provideRuntime = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | ProtocolRuntime
    | ProtocolQuery
    | ProtocolDiagnostics
    | ProtocolStore
  >,
  initial?: Partial<ProtocolStoreSnapshot>,
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(ProtocolDiagnosticsLive),
    Effect.provide(ProtocolQueryLive),
    Effect.provide(ProtocolRuntimeLive),
    Effect.provide(ProtocolProjectionLive),
    Effect.provide(InMemoryProtocolStoreLive(initial)),
  ) as Effect.Effect<A, E, never>

const runtimeView = (
  initial?: Partial<ProtocolStoreSnapshot>,
) =>
  Effect.runPromise(
    provideRuntime(Effect.gen(function* languageServiceFixture() {
      const runtime = yield* ProtocolRuntime
      const query = yield* ProtocolQuery
      const diagnostics = yield* ProtocolDiagnostics

      yield* runtime.materializeDescriptor(demoDescriptor)
      yield* runtime.recordGeneratedArtifact({
        artifactId: "demo:registry",
        protocolId,
        packageId: "demo",
        path: generatedPath,
        generatorId: "@attune/framework-nx:operation-registry",
        expectedHash: "expected",
        actualHash: "actual",
        status: "stale",
      })

      return yield* projectLanguageServiceViewFromRuntime(
        { diagnostics, query },
        {
          sourcePath,
          packageId: "demo",
          protocolId,
          sourceRanges: sourceRangeIndexFromFixtures(
            [{
              sourcePath,
              text: [
                "export const PackageContract = defineAttunePackage({",
                "  packageId: \"demo\",",
                "  operations: [projectOperation],",
                "})",
              ].join("\n"),
            }],
            [{
              key: sourceRangeKey({
                sourcePath,
                packageId: "demo",
                operationId: "project",
                obligationId: "demo:project:property",
                code: "attune/protocol/missing-obligation",
              }),
              sourcePath,
              declarationRange: {
                start: { line: 2, character: 15 },
                end: { line: 2, character: 31 },
              },
            }],
          ),
        },
      )
    }), initial),
  )

describe("@attune/framework-language-service", () => {
  it("turns runtime diagnostics into editor actions without mutating files", () => {
    const diagnostic = {
      code: "attune/protocol/missing-obligation",
      severity: "error" as const,
      packageId: "demo",
      sourcePath,
      explanation: "missing evidence",
      suggestedActions: [{
        id: "generate",
        title: "Generate property evidence scaffold",
        kind: "nx-generator" as const,
        target: "demo:attune-repair",
        options: {
          internalGenerator: "@attune/framework-nx:protocol-evidence",
        },
      }],
      relatedEvidence: [],
    }

    expect(codeActionsForDiagnostic(diagnostic)[0]?.action.kind).toBe("nx-generator")
    expect(diagnosticCodeLens(diagnostic).title).toBe("1 suggested actions for missing obligations")
  })

  it("maps source declaration fixtures to diagnostic ranges", async () => {
    const view = await runtimeView()
    const propertyDiagnostic = view.diagnostics.find((diagnostic) =>
      diagnostic.obligationId === "demo:project:property"
    )

    expect(propertyDiagnostic?.range).toEqual({ start: 89, end: 105 })
  })

  it("projects invalid runtime store payloads into displayable diagnostics", async () => {
    const view = await Effect.runPromise(
      provideRuntime(Effect.gen(function* invalidPayloadFixture() {
        const query = yield* ProtocolQuery
        const diagnostics = yield* ProtocolDiagnostics
        return yield* projectLanguageServiceViewFromRuntime(
          { diagnostics, query },
          { sourcePath, packageId: "demo", protocolId },
        )
      }), {
        descriptors: [{
          protocolId,
          packageId: "demo",
          sourcePath,
          descriptorHash: "bad",
        }],
      }),
    )

    expect(view.diagnostics[0]).toMatchObject({
      code: "attune/protocol/invalid-store-payload",
      displayMessage: expect.stringContaining("Invalid protocol store payload"),
    })
    expect(view.quickInfo[0]?.text).toContain("invalid-store-payload")
    expect(view.codeActions[Object.keys(view.codeActions)[0] ?? ""]?.[0]?.action).toMatchObject({
      kind: "nx-check",
      target: "workspace:attune-check",
    })
  })

  it("surfaces stale generated source as an Nx repair instead of a file edit", async () => {
    const view = await runtimeView()
    const stale = view.diagnostics.find((diagnostic) =>
      diagnostic.code === "attune/protocol/stale-generated-source"
    )

    expect(stale?.sourcePath).toBe(generatedPath)
    expect(stale?.suggestedActions[0]).toMatchObject({
      id: "refresh-protocol-materialization",
      kind: "nx-generator",
      target: "demo:attune-repair",
      options: {
        internalGenerator: "@attune/framework-nx:protocol-materialize",
      },
    })
    expect(
      Object.values(view.codeActions).flat().some((action) => action.action.kind === "source-edit"),
    ).toBe(false)
    expect(view.codeLenses.map((lens) => lens.title)).toContain("stale generated source")
  })

  it("includes missing evidence, atom graph edge, and type-guidance repair actions", async () => {
    const view = await runtimeView()
    const actions = Object.values(view.codeActions).flat().map((entry) => entry.action)

    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "generate-protocol-evidence",
        target: "demo:attune-repair",
        options: expect.objectContaining({
          internalGenerator: "@attune/framework-nx:protocol-evidence",
        }),
      }),
      expect.objectContaining({
        id: "generate-atom-view-edge",
        target: "demo:attune-repair",
        options: expect.objectContaining({
          internalGenerator: "@attune/framework-nx:atom-view-edge",
        }),
      }),
      expect.objectContaining({
        id: "refresh-type-guidance",
        target: "demo:attune-repair",
        options: expect.objectContaining({
          internalGenerator: "@attune/framework-nx:type-guidance",
        }),
      }),
    ]))
  })

  it("adds quick info and code lenses from runtime query summaries", async () => {
    const view = await runtimeView()

    expect(view.quickInfo.some((info) =>
      info.text.includes("expected evidence: property-run") &&
      info.text.includes("evidence: 0/6 obligations observed") &&
      info.text.includes("coverage feedback: 0") &&
      info.text.includes("waivers: 0 active, 0 issues")
    )).toBe(true)
    expect(view.codeLenses.map((lens) => lens.title)).toEqual(expect.arrayContaining([
      "4 missing obligations",
      "evidence: 0/6 obligations observed",
    ]))
  })

  it("projects replay, waiver, coverage, and weak-oracle findings from runtime deltas", async () => {
    const view = await Effect.runPromise(
      provideRuntime(Effect.gen(function* propertyEvidenceProjectionFixture() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery
        const diagnostics = yield* ProtocolDiagnostics

        yield* runtime.materializeDescriptor(demoDescriptor)
        yield* runtime.recordEvidenceRun({
          runId: "run-1",
          protocolId,
          packageId: "demo",
          tier: "commit",
          status: "failed",
          startedAt: "2026-06-22T00:00:00.000Z",
          completedAt: "2026-06-22T00:00:02.000Z",
        })
        yield* runtime.recordReplayMetadata({
          replayId: "demo:project:replay",
          runId: "run-1",
          protocolId,
          packageId: "demo",
          operationId: "project",
          propertyId: "demo.project.property",
          seed: 42,
          shrinkPath: "0:1",
          generatedValueSummary: "{ event: 'changed' }",
          status: "failed",
          recordedAt: "2026-06-22T00:00:01.500Z",
        })
        yield* runtime.recordWaiverState({
          waiverId: "demo:expired-waiver",
          protocolId,
          packageId: "demo",
          category: "property",
          status: "expired",
          operationId: "project",
          owner: "framework",
          reason: "temporary waiver expired",
          expiresAt: "2026-06-01",
          recordedAt: "2026-06-22T00:00:01.500Z",
        })
        yield* runtime.recordCoverageFeedback({
          coverageId: "demo:project:filter",
          protocolId,
          packageId: "demo",
          operationId: "project",
          kind: "filter",
          status: "filtered",
          coveragePoint: "ProjectInput.valid-event",
          filterId: "project-valid-event-filter",
          rejectionCount: 250,
          acceptanceRate: 0.05,
          recordedAt: "2026-06-22T00:00:01.500Z",
        })
        yield* runtime.recordCoverageFeedback({
          coverageId: "demo:project:weak-oracle",
          protocolId,
          packageId: "demo",
          operationId: "project",
          kind: "implementation",
          status: "hit",
          coveragePoint: "packages/demo/src/project.ts:17",
          recordedAt: "2026-06-22T00:00:01.500Z",
          payload: {
            expectedGraphMovement: true,
            observedGraphMovement: false,
          },
        })

        return yield* projectLanguageServiceViewFromRuntime(
          { diagnostics, query },
          { sourcePath, packageId: "demo", protocolId },
        )
      })),
    )

    expect(view.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "attune/protocol/blocked-obligation",
      "attune/protocol/waiver-issue",
      "attune/protocol/high-rejection-filter",
      "attune/protocol/weak-oracle",
    ]))
    expect(view.quickInfo.some((info) =>
      info.text.includes("replay metadata: 1") &&
      info.text.includes("coverage feedback: 2") &&
      info.text.includes("waivers: 0 active, 1 issues")
    )).toBe(true)
    expect(Object.values(view.codeActions).flat().map((entry) => entry.action.target)).toEqual(
      expect.arrayContaining([
        "workspace:attune-check",
      ]),
    )
  })

  it("filters direct generated-file source edits from code actions", () => {
    const diagnostic = {
      code: "attune/protocol/stale-generated-source",
      severity: "error" as const,
      packageId: "demo",
      sourcePath: generatedPath,
      explanation: "generated output is stale",
      suggestedActions: [{
        id: "rewrite-generated-file",
        title: "Rewrite generated file",
        kind: "source-edit" as const,
        target: generatedPath,
      }],
      relatedEvidence: [],
    }

    expect(isDirectGeneratedFileWriteAction(diagnostic, diagnostic.suggestedActions[0]!)).toBe(true)
    expect(codeActionsForDiagnostic(diagnostic)).toEqual([])
  })
})

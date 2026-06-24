import { Effect } from "effect"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  hashProtocolValue,
  type AttuneProtocolDescriptor,
  type AttuneProtocolEvidenceEvent,
  type AttuneProtocolEvidenceRun,
  type AttuneGeneratedArtifactRecord,
} from "@attune/framework-protocol"
import {
  InMemoryProtocolStoreLive,
  compatibilityRowsFromCurrentPackageContracts,
  consumeProgramIndexInvalidations,
  ProtocolDiagnostics,
  ProtocolDiagnosticsLive,
  ProgramIndexDiagnosticsLive,
  ProtocolProjectionLive,
  ProtocolQuery,
  ProtocolQueryLive,
  ProtocolRuntime,
  ProtocolRuntimeLive,
  ProtocolStore,
  diagnosticsForFileAtom,
  materializeCompatibilityRows,
  materializeProgramSourceIndex,
  programIndexDiagnosticsForFile,
  programSourceIndexRows,
  projectIndexAtom,
  reactivityEventsFromInvalidations,
  repairPlansAtom,
  SqliteRuntimeProtocolStoreLive,
  sourceFileSymbolsAtom,
  staleArtifactsAtom,
  workspaceHealthAtom,
  computeProtocolDeltas,
  diagnosticsForProtocol,
  explainObligation,
  getPackageSummary,
  getRepairPlan,
  type ProtocolCoverageFeedback,
  type ProtocolReplayMetadata,
  type ProtocolStoreSnapshot,
  type ProtocolWaiverState,
} from "../src/index.js"
import { createInMemoryProgramIndex, ProgramIndex, type ProgramIndexApi } from "@attune/framework-sqlite"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

const demoDescriptor = {
  protocolId: "attune/package/demo",
  packageId: "demo",
  packageKind: "policy-plugin",
  descriptorHash: "demo-hash",
  sourcePath: "packages/demo/src/attune.package.ts",
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

const demoEvidenceRun: AttuneProtocolEvidenceRun = {
  runId: "run-1",
  protocolId: "attune/package/demo",
  packageId: "demo",
  tier: "commit",
  status: "failed",
  startedAt: "2026-06-22T00:00:00.000Z",
  completedAt: "2026-06-22T00:00:02.000Z",
}

const demoPropertyEvidence: AttuneProtocolEvidenceEvent = {
  eventId: "demo:project:property-run",
  runId: "run-1",
  protocolId: "attune/package/demo",
  packageId: "demo",
  operationId: "project",
  kind: "property-run",
  observedAt: "2026-06-22T00:00:01.000Z",
}

const demoReplayMetadata: ProtocolReplayMetadata = {
  replayId: "demo:project:replay",
  runId: "run-1",
  protocolId: "attune/package/demo",
  packageId: "demo",
  operationId: "project",
  propertyId: "demo.project.property",
  seed: 42,
  shrinkPath: "0:1",
  generatedValueSummary: "{ event: 'changed' }",
  status: "failed",
  recordedAt: "2026-06-22T00:00:01.500Z",
}

const demoActiveWaiver: ProtocolWaiverState = {
  waiverId: "demo:project:law-waiver",
  protocolId: "attune/package/demo",
  packageId: "demo",
  category: "law",
  status: "active",
  targetObligationId: "demo:project:law:projection.deterministic-replay",
  operationId: "project",
  owner: "framework",
  reason: "projection replay law is temporarily migrated",
  reviewAt: "2026-07-22",
  recordedAt: "2026-06-22T00:00:01.500Z",
}

const demoExpiredWaiver: ProtocolWaiverState = {
  ...demoActiveWaiver,
  waiverId: "demo:project:expired-waiver",
  status: "expired",
  reason: "temporary waiver review date passed",
  expiresAt: "2026-06-01",
}

const demoAtomCoverage: ProtocolCoverageFeedback = {
  coverageId: "demo:project:atom-coverage",
  protocolId: "attune/package/demo",
  packageId: "demo",
  operationId: "project",
  kind: "atom-graph",
  status: "hit",
  coveragePoint: "demo.changed->demoView",
  seed: 42,
  workerId: "worker-1",
  shardId: "shard-1",
  recordedAt: "2026-06-22T00:00:01.500Z",
}

const demoTypeCoverage: ProtocolCoverageFeedback = {
  coverageId: "demo:type-guidance:coverage",
  protocolId: "attune/package/demo",
  packageId: "demo",
  kind: "type-partition",
  status: "hit",
  coveragePoint: "ProjectInput.variant.default",
  seed: 42,
  recordedAt: "2026-06-22T00:00:01.500Z",
}

const demoFilterFeedback: ProtocolCoverageFeedback = {
  coverageId: "demo:project:high-rejection-filter",
  protocolId: "attune/package/demo",
  packageId: "demo",
  operationId: "project",
  kind: "filter",
  status: "filtered",
  coveragePoint: "ProjectInput.valid-event",
  filterId: "project-valid-event-filter",
  rejectionCount: 250,
  acceptanceRate: 0.05,
  recordedAt: "2026-06-22T00:00:01.500Z",
}

const demoWeakOracleFeedback: ProtocolCoverageFeedback = {
  coverageId: "demo:project:weak-oracle",
  protocolId: "attune/package/demo",
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
}

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

const provideSqliteRuntime = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | ProtocolRuntime
    | ProtocolQuery
    | ProtocolDiagnostics
    | ProtocolStore
  >,
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(ProtocolDiagnosticsLive),
    Effect.provide(ProtocolQueryLive),
    Effect.provide(ProtocolRuntimeLive),
    Effect.provide(ProtocolProjectionLive),
    Effect.provide(SqliteRuntimeProtocolStoreLive({ path: ":memory:" })),
  ) as Effect.Effect<A, E, never>

const provideProgramIndexDiagnosticsRuntime = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | ProtocolRuntime
    | ProtocolQuery
    | ProtocolDiagnostics
    | ProtocolStore
    | ProgramIndex
  >,
  programIndex: ProgramIndexApi,
  initial?: Partial<ProtocolStoreSnapshot>,
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(ProgramIndexDiagnosticsLive),
    Effect.provide(ProgramIndex.fromService(programIndex)),
    Effect.provide(ProtocolQueryLive),
    Effect.provide(ProtocolRuntimeLive),
    Effect.provide(ProtocolProjectionLive),
    Effect.provide(InMemoryProtocolStoreLive(initial)),
  ) as Effect.Effect<A, E, never>

describe("@attune/framework-runtime", () => {
  it("turns missing evidence and stale generated source into private deltas", () => {
    const deltas = computeProtocolDeltas({
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:property",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "property",
        reason: "projection operation requires property evidence",
      }],
      generatedArtifacts: [{
        artifactId: "demo:registry",
        protocolId: "attune/package/demo",
        packageId: "demo",
        path: "packages/demo/src/generated/operation-registry.ts",
        generatorId: "@attune/framework-nx:operation-registry",
        expectedHash: "expected",
        actualHash: "actual",
        status: "stale",
      }],
    })

    expect(deltas.map((delta) => delta.kind)).toEqual([
      "missing-obligation",
      "stale-generated-source",
    ])
  })

  it("indexes TypeScript/Effect source facts into program-index rows", () => {
    const fixtureDir = mkdtempSync(join(tmpdir(), "attune-program-index-"))
    const fixturePath = join(fixtureDir, "attune.package.ts")
    writeFileSync(fixturePath, [
      "import { Schema } from \"effect\"",
      "import { packageViewAtom, projection, reactivityKey } from \"@attune/framework-protocol\"",
      "",
      "export const helperValue = 42",
      "export const Snapshot = Schema.Struct({ value: Schema.String }).pipe(Schema.filter(() => true))",
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
      "  views: { reactivityKeys: [projectionChanged.id], atoms: [workbenchSnapshot.id] },",
      "})",
    ].join("\n"))

    try {
      const rows = programSourceIndexRows({
        projectId: "demo",
        sourceFiles: [fixturePath],
        now: "2026-06-23T00:00:00.000Z",
      })

      expect(rows.sourceFiles).toHaveLength(1)
      expect(rows.symbols.map((symbol) => [symbol.exportName, symbol.kind])).toEqual(expect.arrayContaining([
        ["helperValue", "exported-symbol"],
        ["Snapshot", "schema"],
        ["projectionChanged", "reactivity-key"],
        ["workbenchSnapshot", "package-view-atom"],
        ["eventReplayProjection", "operation"],
      ]))
      expect(rows.schemaDescriptors[0]).toMatchObject({
        symbolId: "demo:Snapshot",
        serializationStatus: "partial",
        nonSerializableFeaturesJson: "[\"filter\"]",
      })
      expect(rows.diagnostics[0]).toMatchObject({
        code: "attune/program-index/schema-non-serializable",
        severity: "warning",
        message: expect.stringContaining("schema_descriptor fact"),
      })
      expect(rows.repairs[0]).toMatchObject({
        safety: "safe",
        nxTarget: "demo:attune-repair",
        route: "workspace:program-index-materialize",
        validationAfterTargetsJson: "[\"demo:attune-check\",\"demo:typecheck\"]",
      })
      expect(rows.edges.map((edge) => edge.kind)).toContain("identifier-reference")
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true })
    }
  })

  it("derives read-only program atoms and protocol diagnostics from program-index facts", () => {
    const fixtureDir = mkdtempSync(join(tmpdir(), "attune-program-index-"))
    const fixturePath = join(fixtureDir, "attune.package.ts")
    writeFileSync(fixturePath, [
      "import { Schema } from \"effect\"",
      "export const Snapshot = Schema.Struct({ value: Schema.String }).pipe(Schema.filter(() => true))",
    ].join("\n"))

    try {
      const index = createInMemoryProgramIndex()
      Effect.runSync(index.putProjects([{
        id: "demo",
        root: "packages/demo",
        sourceRoot: "packages/demo/src",
        projectType: "library",
        hash: "demo",
        updatedAt: "2026-06-23T00:00:00.000Z",
      }]))
      Effect.runSync(materializeProgramSourceIndex(index, {
        projectId: "demo",
        sourceFiles: [fixturePath],
        now: "2026-06-23T00:00:00.000Z",
      }))
      Effect.runSync(materializeCompatibilityRows(index, {
        projectId: "demo",
        root: "packages/demo",
        now: "2026-06-23T00:00:00.000Z",
        paths: [
          "packages/demo/src/attune.package.ts",
          "packages/demo/src/attune.generated.ts",
          "packages/demo/attune.source-bom.json",
        ],
        contentByPath: {
          "packages/demo/src/attune.package.ts": "source",
          "packages/demo/src/attune.generated.ts": "generated",
          "packages/demo/attune.source-bom.json": "{}",
        },
      }))

      const symbols = Effect.runSync(sourceFileSymbolsAtom(fixturePath).read(index))
      expect(symbols[0]).toMatchObject({ symbol_id: "demo:Snapshot", kind: "schema" })
      expect(Effect.runSync(diagnosticsForFileAtom(fixturePath).read(index))[0]).toMatchObject({
        code: "attune/program-index/schema-non-serializable",
      })
      expect(Effect.runSync(repairPlansAtom("demo").read(index))[0]).toMatchObject({
        safety: "safe",
      })
      expect(Effect.runSync(staleArtifactsAtom("demo").read(index))).toEqual([])
      expect(Effect.runSync(projectIndexAtom("demo").read(index)).project).toMatchObject({
        id: "demo",
      })
      expect(Effect.runSync(workspaceHealthAtom().read(index))[0]).toMatchObject({
        projectId: "demo",
        symbolCount: 1,
        diagnosticCount: 4,
        safeRepairCount: 1,
      })
      expect(Effect.runSync(programIndexDiagnosticsForFile(index, fixturePath))[0]).toMatchObject({
        code: "attune/program-index/schema-non-serializable",
        packageId: "demo",
        sourcePath: fixturePath,
      })

      const invalidations = Effect.runSync(index.listInvalidations({ unconsumed: true }))
      expect(reactivityEventsFromInvalidations(invalidations).map((event) => event.reactivityKey)).toEqual(
        expect.arrayContaining(["attune.program.schema.schema:demo:Snapshot"]),
      )
      expect(Effect.runSync(consumeProgramIndexInvalidations(index)).length).toBeGreaterThan(0)
      expect(Effect.runSync(index.listInvalidations({ unconsumed: true }))).toEqual([])
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true })
    }
  })

  it("prefers program-index diagnostics and repair rows when indexed facts exist", async () => {
    const index = createInMemoryProgramIndex()
    await Effect.runPromise(Effect.gen(function* seedIndexedDiagnostic() {
      yield* index.putProjects([{
        id: "demo",
        root: "packages/demo",
        sourceRoot: "packages/demo/src",
        projectType: "library",
        hash: "demo",
        updatedAt: "2026-06-23T00:00:00.000Z",
      }])
      yield* index.putSourceFiles([{
        id: "file:demo",
        projectId: "demo",
        path: demoDescriptor.sourcePath,
        hash: "source",
        updatedAt: "2026-06-23T00:00:00.000Z",
      }])
      yield* index.putDiagnostics([{
        id: "diagnostic:demo:schema",
        projectId: "demo",
        sourceFileId: "file:demo",
        rangeJson: JSON.stringify({ start: 10, end: 24 }),
        code: "attune/program-index/schema-non-serializable",
        severity: "warning",
        message: "schema_descriptor fact is partial for demo:Snapshot.",
        causeJson: JSON.stringify({
          fact: "schema_descriptor",
          symbolId: "demo:Snapshot",
          status: "partial",
        }),
      }])
      yield* index.putRepairs([{
        id: "repair:diagnostic:demo:schema",
        diagnosticId: "diagnostic:demo:schema",
        safety: "safe",
        nxTarget: "demo:attune-repair",
        repairKind: "schema-descriptor-refresh",
        route: "workspace:program-index-materialize",
        payloadJson: JSON.stringify({
          artifact: "schema_descriptor",
          sourceFile: demoDescriptor.sourcePath,
        }),
        validationAfterTargetsJson: JSON.stringify([
          "demo:attune-check",
          "demo:typecheck",
        ]),
        createdAt: "2026-06-23T00:00:00.000Z",
      }])
    }))

    const projected = await Effect.runPromise(
      provideProgramIndexDiagnosticsRuntime(
        Effect.gen(function* indexedProtocolDiagnostics() {
          const diagnostics = yield* ProtocolDiagnostics
          return yield* diagnostics.diagnosticsForFile(
            demoDescriptor.sourcePath,
            { packageId: "demo", protocolId: demoDescriptor.protocolId },
          )
        }),
        index,
        { descriptors: [demoDescriptor] },
      ),
    )

    expect(projected).toHaveLength(1)
    expect(projected[0]).toMatchObject({
      code: "attune/program-index/schema-non-serializable",
      severity: "warning",
      packageId: "demo",
      sourcePath: demoDescriptor.sourcePath,
      range: { start: 10, end: 24 },
      explanation: "schema_descriptor fact is partial for demo:Snapshot.",
      cause: {
        fact: "schema_descriptor",
        symbolId: "demo:Snapshot",
        status: "partial",
      },
      suggestedActions: [{
        id: "repair:diagnostic:demo:schema",
        kind: "nx-generator",
        target: "demo:attune-repair",
        options: expect.objectContaining({
          source: "program-index",
          diagnosticId: "diagnostic:demo:schema",
          safety: "safe",
          repairKind: "schema-descriptor-refresh",
          route: "workspace:program-index-materialize",
          validationAfterTargets: [
            "demo:attune-check",
            "demo:typecheck",
          ],
        }),
      }],
      relatedEvidence: ["program-index:cause"],
    })
  })

  it("falls back to compatibility diagnostics when the program index has no file rows", async () => {
    const projected = await Effect.runPromise(
      provideProgramIndexDiagnosticsRuntime(
        Effect.gen(function* indexedDiagnosticsFallback() {
          const runtime = yield* ProtocolRuntime
          const diagnostics = yield* ProtocolDiagnostics
          yield* runtime.materializeDescriptor(demoDescriptor)
          return yield* diagnostics.diagnosticsForFile(
            demoDescriptor.sourcePath,
            { packageId: "demo", protocolId: demoDescriptor.protocolId },
          )
        }),
        createInMemoryProgramIndex(),
      ),
    )

    expect(projected.map((diagnostic) => diagnostic.code)).toContain(
      "attune/protocol/missing-obligation",
    )
  })

  it("adapts generated companions and Source BOM files as compatibility input rows", () => {
    const rows = compatibilityRowsFromCurrentPackageContracts({
      projectId: "demo",
      root: "packages/demo",
      now: "2026-06-23T00:00:00.000Z",
      paths: [
        "packages/demo/src/attune.package.ts",
        "packages/demo/src/attune.contract.generated.ts",
        "packages/demo/src/attune.generated.ts",
        "packages/demo/attune.source-bom.json",
        "framework/architecture/src/generated/package-contracts.typecheck.generated.ts",
      ],
      contentByPath: {
        "packages/demo/src/attune.package.ts": "source",
        "packages/demo/src/attune.contract.generated.ts": "contract",
        "packages/demo/src/attune.generated.ts": "generated",
        "packages/demo/attune.source-bom.json": "{}",
        "framework/architecture/src/generated/package-contracts.typecheck.generated.ts": "types",
      },
    })

    expect(rows.artifacts.map((artifact) => artifact.kind)).toEqual([
      "attune-package-source",
      "generated-contract-companion",
      "generated-protocol-companion",
      "source-ownership-compatibility",
      "package-contract-typecheck-aggregate",
    ])
    expect(rows.sourceFiles.map((sourceFile) => sourceFile.path)).toEqual([
      "packages/demo/src/attune.package.ts",
      "packages/demo/src/attune.contract.generated.ts",
      "packages/demo/src/attune.generated.ts",
      "packages/demo/attune.source-bom.json",
      "framework/architecture/src/generated/package-contracts.typecheck.generated.ts",
    ])
    expect(rows.observations).toHaveLength(5)
    expect(rows.observations.map((observation) =>
      JSON.parse(observation.payloadJson ?? "{}").compatibilitySource
    )).toEqual([
      "generated-companion-compat",
      "generated-companion-compat",
      "source-bom-compat",
      "package-contract-compat",
      "source-bom-compat",
    ])
    expect(rows.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "attune/program-index/package-local-companion",
      "attune/program-index/package-local-companion",
      "attune/program-index/package-local-companion",
      "attune/program-index/source-bom-compatibility",
    ])
    expect(rows.repairs.map((repair) => [
      repair.safety,
      repair.repairKind,
      repair.route,
      repair.validationAfterTargetsJson,
    ])).toEqual([
      ["needs-review", "generated-companion-relocation", "attune-repair-cli:generated", "[\"demo:attune-check\",\"demo:typecheck\"]"],
      ["needs-review", "generated-companion-relocation", "attune-repair-cli:generated", "[\"demo:attune-check\",\"demo:typecheck\"]"],
      ["needs-review", "generated-companion-relocation", "attune-repair-cli:generated", "[\"demo:attune-check\",\"demo:typecheck\"]"],
      ["needs-review", "source-ownership-projection", "attune-repair-cli:generated", "[\"workspace:attune-check\"]"],
    ])
  })

  it("materializes missing and checked-in report artifacts as mechanical diagnostics", () => {
    const rows = compatibilityRowsFromCurrentPackageContracts({
      projectId: "demo",
      root: "packages/demo",
      now: "2026-06-23T00:00:00.000Z",
      paths: [
        "packages/demo/src/attune.package.ts",
        "packages/demo/src/attune.generated.ts",
        "packages/demo/src/artifacts/evidence-matrix.ts",
        "reports/protocol-delta-report.json",
      ],
      contentByPath: {
        "packages/demo/src/attune.package.ts": "source",
        "packages/demo/src/artifacts/evidence-matrix.ts": "export const sourceArtifactHelper = true\n",
        "reports/protocol-delta-report.json": "{}",
      },
    })

    expect(rows.artifacts.map((artifact) => [artifact.path, artifact.status])).toEqual([
      ["packages/demo/src/attune.package.ts", "current"],
      ["packages/demo/src/attune.generated.ts", "missing"],
      ["packages/demo/src/artifacts/evidence-matrix.ts", "current"],
      ["reports/protocol-delta-report.json", "current"],
    ])
    expect(rows.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "attune/program-index/artifact-missing",
      "attune/program-index/package-local-companion",
      "attune/program-index/checked-in-report-artifact",
    ])
    expect(rows.repairs.map((repair) => [
      repair.safety,
      repair.repairKind,
      repair.nxTarget,
      repair.route,
    ])).toEqual([
      ["safe", "artifact-refresh", "demo:attune-repair", "attune-repair-cli:generated"],
      ["needs-review", "generated-companion-relocation", "demo:attune-repair", "attune-repair-cli:generated"],
      ["manual-only", "checked-in-report-removal", "workspace:attune-repair", "manual:remove-checked-in-report"],
    ])
  })

  it("classifies missing Source BOM compatibility as review-gated source ownership repair", () => {
    const rows = compatibilityRowsFromCurrentPackageContracts({
      projectId: "demo",
      root: "packages/demo",
      now: "2026-06-23T00:00:00.000Z",
      paths: [
        "packages/demo/attune.source-bom.json",
      ],
      contentByPath: {},
    })

    expect(rows.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "attune/program-index/artifact-missing",
      "attune/program-index/package-local-companion",
      "attune/program-index/source-bom-compatibility-missing",
      "attune/program-index/source-bom-compatibility",
    ])
    expect(rows.repairs.map((repair) => [
      repair.safety,
      repair.repairKind,
      repair.nxTarget,
      repair.route,
    ])).toEqual([
      ["safe", "artifact-refresh", "demo:attune-repair", "attune-repair-cli:generated"],
      ["needs-review", "generated-companion-relocation", "demo:attune-repair", "attune-repair-cli:generated"],
      ["needs-review", "source-ownership-projection", "workspace:attune-repair", "attune-repair-cli:generated"],
      ["needs-review", "source-ownership-projection", "workspace:attune-repair", "attune-repair-cli:generated"],
    ])
  })

  it("classifies Ring A effect-oxlint-policy diagnostic parity", () => {
    const artifactPaths = [
      "framework/oxlint-policy/src/attune.package.ts",
      "framework/architecture/src/generated/source-bom/effect-oxlint-policy.json",
      "framework/architecture/src/generated/package-contracts/effect-oxlint-policy/attune.generated.ts",
      "framework/architecture/src/generated/package-contracts/effect-oxlint-policy/attune.contract.generated.ts",
      "framework/architecture/src/generated/package-contracts.typecheck.generated.ts",
    ] as const
    const missingFixturePaths = artifactPaths.filter((artifactPath) =>
      !existsSync(resolve(repositoryRoot, artifactPath))
    )

    expect(missingFixturePaths).toEqual([])

    const rows = compatibilityRowsFromCurrentPackageContracts({
      projectId: "effect-oxlint-policy",
      root: "framework/oxlint-policy",
      now: "2026-06-24T00:00:00.000Z",
      paths: artifactPaths,
      contentByPath: Object.fromEntries(
        artifactPaths.map((artifactPath) => [
          artifactPath,
          readFileSync(resolve(repositoryRoot, artifactPath), "utf8"),
        ]),
      ),
    })
    const parity = classifyDiagnosticParity({
      programIndexCodes: rows.diagnostics.map((diagnostic) => diagnostic.code),
      compatibilityCodes: [],
    })

    expect(rows.artifacts.map((artifact) => [artifact.path, artifact.status])).toEqual(
      expect.arrayContaining(artifactPaths.map((artifactPath) => [artifactPath, "current"])),
    )
    expect(rows.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        exportName: "no-raw-process-env",
        kind: "compatibility-operation-id",
      }),
      expect.objectContaining({
        exportName: "UnsafeEnvProcessAccessInput",
        kind: "compatibility-schema-symbol",
      }),
      expect.objectContaining({
        exportName: "PackageContract",
        kind: "compatibility-contract-symbol",
      }),
    ]))
    expect(rows.schemaDescriptors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: "input",
        serializationStatus: "serializable",
      }),
      expect.objectContaining({
        role: "output",
        serializationStatus: "serializable",
      }),
      expect.objectContaining({
        role: "error",
        serializationStatus: "serializable",
      }),
    ]))
    expect(rows.edges.map((edge) => edge.kind)).toEqual(expect.arrayContaining([
      "declares-symbol",
      "input-schema",
      "output-schema",
      "error-schema",
      "symbol-alias",
      "touches-atom",
      "touches-reactivity-key",
    ]))
    expect(rows.observations.map((observation) =>
      JSON.parse(observation.payloadJson ?? "{}").compatibilitySource
    )).toEqual(expect.arrayContaining([
      "package-contract-compat",
      "generated-companion-compat",
      "source-bom-compat",
      "type-guidance-compat",
    ]))
    expect(rows.artifacts.some((artifact) =>
      artifact.kind === "source-ownership-pattern" &&
      artifact.path === "framework/oxlint-policy/src/**"
    )).toBe(true)
    expect(rows.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([])
    expect(parity).toEqual({
      parityCodes: [],
      programIndexOnlyCodes: [],
      compatibilityOnlyCodes: [],
      mismatches: [],
    })
  })

  it("projects Ring A attuned-discovery operation ids as symbols and schema edges", () => {
    const artifactPaths = [
      "packages/attuned-discovery/src/attune.package.ts",
      "framework/architecture/src/generated/source-bom/attuned-discovery.json",
      "framework/architecture/src/generated/package-contracts/attuned-discovery/attune.generated.ts",
      "framework/architecture/src/generated/package-contracts/attuned-discovery/attune.contract.generated.ts",
    ] as const
    const missingFixturePaths = artifactPaths.filter((artifactPath) =>
      !existsSync(resolve(repositoryRoot, artifactPath))
    )

    expect(missingFixturePaths).toEqual([])

    const rows = compatibilityRowsFromCurrentPackageContracts({
      projectId: "attuned-discovery",
      root: "packages/attuned-discovery",
      now: "2026-06-24T00:00:00.000Z",
      paths: artifactPaths,
      contentByPath: Object.fromEntries(
        artifactPaths.map((artifactPath) => [
          artifactPath,
          readFileSync(resolve(repositoryRoot, artifactPath), "utf8"),
        ]),
      ),
    })
    const operationSymbols = rows.symbols.filter((symbol) =>
      symbol.kind === "compatibility-operation-id"
    )

    expect(operationSymbols.map((symbol) => symbol.exportName)).toEqual(expect.arrayContaining([
      "discovery-events-facade",
      "discovery-event-log-append",
      "event-replay-projection",
      "read-model-query",
      "reactivity-key-map",
      "base-atom-family",
      "derived-workbench-atom-family",
      "domain-event-codecs",
    ]))
    expect(rows.edges.map((edge) => edge.kind)).toEqual(expect.arrayContaining([
      "declares-symbol",
      "input-schema",
      "output-schema",
      "error-schema",
    ]))
    expect(rows.observations.map((observation) =>
      JSON.parse(observation.payloadJson ?? "{}").compatibilitySource
    )).toEqual(expect.arrayContaining([
      "source-bom-compat",
      "type-guidance-compat",
      "generated-companion-compat",
    ]))
    expect(rows.diagnostics).toEqual([])
  })

  it("projects deltas as framework diagnostics", () => {
    const diagnostics = diagnosticsForProtocol({
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:law",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "law",
        reason: "law evidence missing",
      }],
      generatedArtifacts: [],
    })

    expect(diagnostics[0]?.code).toBe("attune/protocol/missing-obligation")
  })

  it("computes deltas from evidence, waiver state, coverage feedback, and replay metadata", () => {
    const deltas = computeProtocolDeltas({
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      obligations: [{
        obligationId: "demo:project:property",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "property",
        reason: "property evidence required",
      }, {
        obligationId: "demo:project:view-movement",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "view-movement",
        reason: "atom graph evidence required",
      }, {
        obligationId: "demo:type-guidance",
        protocolId: "attune/package/demo",
        packageId: "demo",
        kind: "type-guidance",
        reason: "type guidance coverage required",
      }, {
        obligationId: "demo:project:law:projection.deterministic-replay",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "law",
        reason: "law evidence required",
      }],
      evidence: [demoPropertyEvidence],
      waiverState: [demoActiveWaiver, demoExpiredWaiver],
      coverageFeedback: [
        demoAtomCoverage,
        demoTypeCoverage,
        demoFilterFeedback,
        demoWeakOracleFeedback,
      ],
      replayMetadata: [demoReplayMetadata],
      generatedArtifacts: [{
        artifactId: "demo:registry",
        protocolId: "attune/package/demo",
        packageId: "demo",
        path: "packages/demo/src/generated/operation-registry.ts",
        generatorId: "@attune/framework-nx:operation-registry",
        expectedHash: "expected",
        actualHash: "actual",
        status: "current",
      }],
    })

    expect(deltas.map((delta) => delta.kind)).toEqual(expect.arrayContaining([
      "stale-generated-source",
      "waiver-issue",
      "blocked-obligation",
      "high-rejection-filter",
      "weak-oracle",
    ]))
    expect(deltas.some((delta) => delta.kind === "missing-obligation")).toBe(false)
    expect(deltas.find((delta) => delta.kind === "blocked-obligation")?.repairActions[0]).toMatchObject({
      id: "replay-counterexample",
      options: expect.objectContaining({ seed: 42, shrinkPath: "0:1" }),
    })
  })

  it("provisions ProtocolRuntime/Query/Diagnostics through Effect layers", async () => {
    const result = await Effect.runPromise(
      provideRuntime(Effect.gen(function* protocolRuntimeProvisioning() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery
        const diagnostics = yield* ProtocolDiagnostics

        const receipt = yield* runtime.materializeDescriptor(demoDescriptor)
        yield* runtime.recordGeneratedArtifact({
          artifactId: "demo:registry",
          protocolId: "attune/package/demo",
          packageId: "demo",
          path: "packages/demo/src/generated/operation-registry.ts",
          generatorId: "@attune/framework-nx:operation-registry",
          expectedHash: "expected",
          actualHash: "actual",
          status: "stale",
        })

        const summary = yield* query.getPackageSummary("demo")
        const deltas = yield* query.listDeltas("demo")
        const projected = yield* diagnostics.diagnosticsForFile(
          "packages/demo/src/attune.package.ts",
          { packageId: "demo", protocolId: "attune/package/demo" },
        )

        return { receipt, summary, deltas, projected }
      })),
    )

    expect(result.receipt).toMatchObject({
      packageId: "demo",
      descriptorHash: "demo-hash",
    })
    expect(result.summary).toMatchObject({
      packageId: "demo",
      operationCount: 1,
      obligationCount: 6,
      staleGeneratedArtifactCount: 1,
    })
    expect(result.deltas.map((delta) => delta.kind)).toEqual(
      expect.arrayContaining(["missing-obligation", "stale-generated-source"]),
    )
    expect(result.projected.map((diagnostic) => diagnostic.code)).toContain(
      "attune/protocol/missing-obligation",
    )
  })

  it("records and reads property evidence cache state through runtime/query services", async () => {
    const result = await Effect.runPromise(
      provideRuntime(Effect.gen(function* propertyEvidenceRuntimeState() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery
        const diagnostics = yield* ProtocolDiagnostics

        yield* runtime.materializeDescriptor(demoDescriptor)
        yield* runtime.recordEvidenceRun(demoEvidenceRun)
        yield* runtime.recordEvidence(demoPropertyEvidence)
        yield* runtime.recordReplayMetadata(demoReplayMetadata)
        yield* runtime.recordWaiverState(demoActiveWaiver)
        yield* runtime.recordCoverageFeedback(demoAtomCoverage)
        yield* runtime.recordCoverageFeedback(demoTypeCoverage)
        yield* runtime.recordCoverageFeedback(demoFilterFeedback)

        const summary = yield* query.getPackageSummary("demo")
        const state = yield* query.getPackageEvidenceState("demo")
        const deltas = yield* query.listDeltas("demo")
        const projected = yield* diagnostics.diagnosticsForFile(
          "packages/demo/src/attune.package.ts",
          { packageId: "demo", protocolId: "attune/package/demo" },
        )

        return { summary, state, deltas, projected }
      })),
    )

    expect(result.summary).toMatchObject({
      evidenceRunCount: 1,
      evidenceCount: 1,
      replayMetadataCount: 1,
      coverageFeedbackCount: 3,
      activeWaiverCount: 1,
      waiverIssueCount: 0,
    })
    expect(result.state).toMatchObject({
      evidenceRuns: [demoEvidenceRun],
      evidence: [demoPropertyEvidence],
      replayMetadata: [demoReplayMetadata],
      waiverState: [demoActiveWaiver],
    })
    expect(result.state.coverageFeedback.map((feedback) => feedback.coverageId)).toEqual([
      "demo:project:atom-coverage",
      "demo:type-guidance:coverage",
      "demo:project:high-rejection-filter",
    ])
    expect(result.deltas.map((delta) => delta.kind)).toEqual(expect.arrayContaining([
      "blocked-obligation",
      "high-rejection-filter",
    ]))
    expect(result.deltas.some((delta) =>
      delta.obligationId === "demo:project:law:projection.deterministic-replay"
    )).toBe(false)
    expect(result.projected.map((diagnostic) => diagnostic.code)).toContain(
      "attune/protocol/high-rejection-filter",
    )
  })

  it("keeps evidence cache output out of checked-in report artifacts", async () => {
    const result = await Effect.runPromise(
      provideRuntime(Effect.gen(function* noReportOutputForEvidenceState() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery

        yield* runtime.materializeDescriptor(demoDescriptor)
        yield* runtime.recordEvidenceRun(demoEvidenceRun)
        yield* runtime.recordEvidence(demoPropertyEvidence)
        yield* runtime.recordReplayMetadata(demoReplayMetadata)
        yield* runtime.recordCoverageFeedback(demoFilterFeedback)

        const state = yield* query.getPackageEvidenceState("demo")
        const deltas = yield* query.listDeltas("demo")

        return { state, deltas }
      })),
    )

    expect(result.state.generatedArtifacts).toEqual([])
    expect(result.state.replayMetadata).toEqual([demoReplayMetadata])
    expect(result.state.coverageFeedback).toEqual([demoFilterFeedback])
    expect(result.deltas.flatMap((delta) => delta.repairActions)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "source-edit",
        }),
      ]),
    )
    expect(result.deltas.map((delta) => delta.sourcePath)).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/report|summary/u),
      ]),
    )
  })

  it("explains obligations and repair plans without exposing store rows", async () => {
    const result = await Effect.runPromise(
      provideRuntime(Effect.gen(function* protocolQueryExplanations() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery

        yield* runtime.materializeDescriptor(demoDescriptor)

        const explanation = yield* query.explainObligation("demo:project:view-movement")
        const repairPlan = yield* query.getRepairPlan("delta:demo:project:view-movement")

        return { explanation, repairPlan }
      })),
    )

    expect(result.explanation?.expectedEvidenceKinds).toContain("atom-movement")
    expect(result.repairPlan?.actions[0]).toMatchObject({
      target: "demo:attune-repair",
      options: expect.objectContaining({
        internalGenerator: "@attune/framework-nx:atom-view-edge",
      }),
    })
  })

  it("keeps pure query helpers available for focused projections", () => {
    const input = {
      protocolId: "attune/package/demo",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
      evidence: [],
      obligations: [{
        obligationId: "demo:project:view-movement",
        protocolId: "attune/package/demo",
        packageId: "demo",
        operationId: "project",
        kind: "view-movement" as const,
        reason: "view movement evidence missing",
      }],
      generatedArtifacts: [],
    }

    expect(getPackageSummary(input)).toMatchObject({
      packageId: "demo",
      obligationCount: 1,
      evidenceCount: 0,
    })
    expect(explainObligation(input, "demo:project:view-movement")?.expectedEvidenceKinds).toContain(
      "atom-movement",
    )
    expect(getRepairPlan(input, "delta:demo:project:view-movement")?.actions[0]).toMatchObject({
      target: "demo:attune-repair",
      options: expect.objectContaining({
        internalGenerator: "@attune/framework-nx:atom-view-edge",
      }),
    })
  })

  it("projects invalid stored payloads as diagnostics", async () => {
    const diagnostics = await Effect.runPromise(
      provideRuntime(Effect.gen(function* invalidPayloadDiagnostics() {
        const service = yield* ProtocolDiagnostics
        return yield* service.diagnosticsForFile(
          "packages/demo/src/attune.package.ts",
          { packageId: "demo", protocolId: "attune/package/demo" },
        )
      }), {
          descriptors: [{
            protocolId: "attune/package/demo",
            packageId: "demo",
            sourcePath: "packages/demo/src/attune.package.ts",
            descriptorHash: "bad",
          }],
        }),
    )

    expect(diagnostics[0]).toMatchObject({
      code: "attune/protocol/invalid-store-payload",
      packageId: "demo",
      sourcePath: "packages/demo/src/attune.package.ts",
    })
  })

  it("adapts sqlite ProtocolStoreApi into runtime materialization and diagnostics", async () => {
    const descriptor = descriptorWithHash({
      protocolId: "attune/package/sqlite-demo",
      packageId: "sqlite-demo",
      packageKind: "core-discovery-runtime",
      sourcePath: "packages/sqlite-demo/src/attune.package.ts",
      views: {
        reactivityKeys: ["sqlite-demo.changed"],
        atoms: ["sqlite-demo.view"],
      },
      services: ["SqliteDemoService"],
      operations: [{
        id: "operation",
        kind: "command",
        views: {
          reactivityKeys: ["sqlite-demo.changed"],
          atoms: ["sqlite-demo.view"],
        },
        laws: ["command.view-movement"],
        inputSchema: "Struct",
        outputSchema: "Void",
      }],
      waivers: [],
      coverageExpectations: [],
    })
    const staleArtifact: AttuneGeneratedArtifactRecord = {
      artifactId: "sqlite-demo:registry",
      protocolId: descriptor.protocolId,
      packageId: descriptor.packageId,
      path: "packages/sqlite-demo/src/generated/operation-registry.ts",
      generatorId: "@attune/framework-nx:operation-registry",
      expectedHash: "expected",
      actualHash: "actual",
      status: "stale",
    }
    const propertyEvidence: AttuneProtocolEvidenceEvent = {
      eventId: "sqlite-demo:operation:property-run",
      runId: "run-1",
      protocolId: descriptor.protocolId,
      packageId: descriptor.packageId,
      operationId: "operation",
      kind: "property-run",
      observedAt: "2026-06-22T00:00:00.000Z",
    }

    const result = await Effect.runPromise(
      provideSqliteRuntime(Effect.gen(function* sqliteRuntimeAdapter() {
        const runtime = yield* ProtocolRuntime
        const query = yield* ProtocolQuery
        const diagnostics = yield* ProtocolDiagnostics

        const receipt = yield* runtime.materializeDescriptor(descriptor)
        yield* runtime.recordGeneratedArtifact(staleArtifact)
        yield* runtime.recordEvidenceRun({
          runId: "run-1",
          protocolId: descriptor.protocolId,
          packageId: descriptor.packageId,
          tier: "commit",
          status: "passed",
          startedAt: "2026-06-22T00:00:00.000Z",
          completedAt: "2026-06-22T00:00:02.000Z",
        })
        yield* runtime.recordEvidence(propertyEvidence)
        yield* runtime.recordCoverageFeedback({
          coverageId: "sqlite-demo:operation:atom-coverage",
          protocolId: descriptor.protocolId,
          packageId: descriptor.packageId,
          operationId: "operation",
          kind: "atom-graph",
          status: "hit",
          coveragePoint: "sqlite-demo.changed->sqlite-demo.view",
          recordedAt: "2026-06-22T00:00:01.000Z",
        })
        yield* runtime.refreshDeltas(descriptor.packageId)

        const summary = yield* query.getPackageSummary(descriptor.packageId)
        const evidenceState = yield* query.getPackageEvidenceState(descriptor.packageId)
        const deltas = yield* query.listDeltas(descriptor.packageId)
        const projected = yield* diagnostics.diagnosticsForFile(
          descriptor.sourcePath,
          { packageId: descriptor.packageId, protocolId: descriptor.protocolId },
        )

        return { receipt, summary, evidenceState, deltas, projected }
      })),
    )

    expect(result.receipt).toMatchObject({
      packageId: "sqlite-demo",
      descriptorHash: descriptor.descriptorHash,
      obligationCount: 6,
    })
    expect(result.summary).toMatchObject({
      operationCount: 1,
      obligationCount: 6,
      evidenceRunCount: 1,
      evidenceCount: 1,
      coverageFeedbackCount: 1,
      staleGeneratedArtifactCount: 1,
    })
    expect(result.evidenceState.evidenceRuns).toHaveLength(1)
    expect(result.evidenceState.coverageFeedback).toHaveLength(1)
    expect(result.deltas.map((delta) => delta.kind)).toEqual(
      expect.arrayContaining(["missing-obligation", "stale-generated-source"]),
    )
    expect(result.deltas.some((delta) =>
      delta.obligationId === "sqlite-demo:operation:property"
    )).toBe(false)
    expect(result.projected.map((diagnostic) => diagnostic.code)).toContain(
      "attune/protocol/stale-generated-source",
    )
  })
})

const descriptorWithHash = (
  descriptor: Omit<AttuneProtocolDescriptor, "descriptorHash">,
): AttuneProtocolDescriptor => ({
  ...descriptor,
  descriptorHash: hashProtocolValue(descriptor),
})

const classifyDiagnosticParity = (input: {
  readonly programIndexCodes: readonly string[]
  readonly compatibilityCodes: readonly string[]
  readonly allowedProgramIndexOnlyCodes?: readonly string[]
}): {
  readonly parityCodes: readonly string[]
  readonly programIndexOnlyCodes: readonly string[]
  readonly compatibilityOnlyCodes: readonly string[]
  readonly mismatches: readonly string[]
} => {
  const programIndexCodes = uniqueSorted(input.programIndexCodes)
  const compatibilityCodes = uniqueSorted(input.compatibilityCodes)
  const allowedProgramIndexOnlyCodes = new Set(input.allowedProgramIndexOnlyCodes ?? [])
  const compatibilityCodeSet = new Set(compatibilityCodes)
  const programIndexCodeSet = new Set(programIndexCodes)
  const parityCodes = programIndexCodes.filter((code) => compatibilityCodeSet.has(code))
  const programIndexOnlyCodes = programIndexCodes.filter((code) => !compatibilityCodeSet.has(code))
  const compatibilityOnlyCodes = compatibilityCodes.filter((code) => !programIndexCodeSet.has(code))

  return {
    parityCodes,
    programIndexOnlyCodes,
    compatibilityOnlyCodes,
    mismatches: [
      ...programIndexOnlyCodes.filter((code) => !allowedProgramIndexOnlyCodes.has(code)),
      ...compatibilityOnlyCodes,
    ],
  }
}

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].sort()

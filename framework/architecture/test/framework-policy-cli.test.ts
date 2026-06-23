import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import {
  checkFrameworkPolicyWorkspace,
  runFrameworkPolicyCli,
} from "../src/framework-policy-cli.js"

const repoRoot = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)))
const tempRoots: string[] = []
const staleArchitecturePackagePath = ["attune-architecture", "lint"].join("-")

describe("framework policy CLI", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { force: true, recursive: true })
    }
  })

  it("rejects product imports of private framework runtime and store internals", () => {
    const workspaceRoot = makeWorkspace({
      "packages/product/src/sqlite.ts": importFrom("{ createProtocolStore }", "@attune/framework-sqlite"),
      "packages/product/src/runtime.ts": importFrom("{ materialize }", "@attune/framework-runtime/internal"),
      "packages/product/src/language.ts": importFrom("{ diagnostics }", "@attune/framework-language-service"),
      "packages/product/src/drizzle.ts": importFrom("{ pgTable }", "drizzle-orm/pg-core"),
      "packages/product/src/store.ts": importFrom("{ ProtocolStore }", "../../../framework/sqlite/src/ProtocolStore"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.importDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "framework-sqlite-import",
        filePath: "packages/product/src/sqlite.ts",
      }),
      expect.objectContaining({
        code: "framework-runtime-internal-import",
        filePath: "packages/product/src/runtime.ts",
      }),
      expect.objectContaining({
        code: "framework-language-service-import",
        filePath: "packages/product/src/language.ts",
      }),
      expect.objectContaining({
        code: "raw-drizzle-table-import",
        filePath: "packages/product/src/drizzle.ts",
      }),
      expect.objectContaining({
        code: "protocol-store-internal-import",
        filePath: "packages/product/src/store.ts",
      }),
    ]))
  })

  it("rejects checked-in protocol, evidence, architecture, and agent report artifacts", () => {
    const workspaceRoot = makeWorkspace({
      "reports/protocol-delta-report.json": JSON.stringify({
        protocolDeltas: [{ deltaId: "delta-1", packageId: "product" }],
      }),
      "reports/package-obligation-summary.md": [
        "# Package Obligation Summary",
        "",
        "- obligationId: product:operation",
      ].join("\n"),
      "artifacts/property-evidence-summary.json": JSON.stringify({
        evidenceSummary: { packageId: "product", missing: 1 },
      }),
      "docs/architecture-summary.md": [
        "# Architecture Summary Report",
        "",
        "Protocol diagnostics are projected through Nx output.",
      ].join("\n"),
      "agent-output/github-protocol-report.md": [
        "# GitHub Protocol Report",
        "",
        "Status copied from framework diagnostics.",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.noReportDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "protocol-delta-report" }),
      expect.objectContaining({ category: "obligation-report" }),
      expect.objectContaining({ category: "evidence-summary-report" }),
      expect.objectContaining({ category: "architecture-summary-report" }),
      expect.objectContaining({ category: "agent-protocol-report" }),
    ]))
  })

  it("classifies historical fuzzer run reports without allowing new checked-in run reports", () => {
    const workspaceRoot = makeWorkspace({
      "docs/joern-effect-fuzzer-run-report.md": [
        "# Joern Effect Fuzzer Run Report",
        "",
        "Historical migration note only. This file is not protocol source truth or",
        "package-contract evidence; future protocol/evidence run reports should be",
        "emitted through framework diagnostics, Nx output, CI artifacts, stdout, or",
        "gitignored local cache.",
      ].join("\n"),
      "docs/new-fuzzer-run-report.md": [
        "# New Fuzzer Run Report",
        "",
        "Accepted cases, rejected cases, counterexamples, and missing observations.",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.noReportDiagnostics).toContainEqual(expect.objectContaining({
      category: "evidence-summary-report",
      filePath: "docs/new-fuzzer-run-report.md",
    }))
    expect(result.noReportDiagnostics).not.toContainEqual(expect.objectContaining({
      filePath: "docs/joern-effect-fuzzer-run-report.md",
    }))
  })

  it("rejects missing package contracts, package view graphs, and property evidence markers after migration", () => {
    const workspaceRoot = makeWorkspace({
      "packages/no-contract/package.json": JSON.stringify({ name: "@attune/no-contract" }),
      "packages/no-views/package.json": JSON.stringify({ name: "@attune/no-views" }),
      "packages/no-views/src/attune.package.ts": [
        "export const PackageContract = definePackageContract({",
        "  packageId: \"no-views\",",
        "  waivers: [] as const,",
        "})",
      ].join("\n"),
      "packages/no-evidence/package.json": JSON.stringify({ name: "@attune/no-evidence" }),
      "packages/no-evidence/src/attune.package.ts": [
        "export const PackageViews = definePackageViews({",
        "  reactivityKeys: [\"no-evidence.changed\"],",
        "  atoms: [\"noEvidenceAtom\"],",
        "})",
        "export const PackageContract = definePackageContract({",
        "  packageId: \"no-evidence\",",
        "  views: PackageViews,",
        "  waivers: [] as const,",
        "})",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing-package-contract",
        filePath: "packages/no-contract/package.json",
      }),
      expect.objectContaining({
        code: "missing-package-view-graph",
        filePath: "packages/no-views/src/attune.package.ts",
      }),
      expect.objectContaining({
        code: "missing-property-evidence-harness",
        filePath: "packages/no-evidence/src/attune.package.ts",
      }),
      expect.objectContaining({
        code: "missing-coverage-conformance",
        filePath: "packages/no-evidence/src/attune.package.ts",
      }),
    ]))
  })

  it("rejects mutating package operations that do not touch Reactivity keys or atoms", () => {
    const workspaceRoot = makeWorkspace({
      "packages/no-operation-touch/package.json": JSON.stringify({ name: "@attune/no-operation-touch" }),
      "packages/no-operation-touch/src/attune.package.ts": packageContractSource({
        packageId: "no-operation-touch",
        viewsBody: [
          "  reactivityKeys: [\"operation.changed\"],",
          "  atoms: [\"operationAtom\"],",
        ],
        operationsBody: [
          "export const MutatingOperation = defineOperation({",
          "  id: \"write-operation\",",
          "  kind: \"command\",",
          "  input: CommandInput,",
          "  output: CommandOutput,",
          "  laws: [],",
          "} as const)",
        ],
        operationIds: ["MutatingOperation"],
      }),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "operation-missing-reactivity-touch",
        filePath: "packages/no-operation-touch/src/attune.package.ts",
      }),
    ]))
  })

  it("rejects dead Reactivity keys and unobserved operation-to-view movement when graph metadata is detectable", () => {
    const workspaceRoot = makeWorkspace({
      "packages/dead-key/package.json": JSON.stringify({ name: "@attune/dead-key" }),
      "packages/dead-key/src/attune.package.ts": packageContractSource({
        packageId: "dead-key",
        viewsBody: [
          "  reactivityKeys: [\"used.changed\", \"dead.changed\"],",
          "  atoms: [\"readModelAtom\", \"summaryAtom\", \"packageViewAtom\"],",
          "  baseAtoms: [{ id: \"readModelAtom\", refreshesOn: [\"used.changed\"] }],",
          "  derivedAtoms: [{ id: \"summaryAtom\", reads: [\"readModelAtom\"] }],",
          "  packageViewAtoms: [{ id: \"packageViewAtom\", reads: [\"summaryAtom\"] }],",
        ],
        operationsBody: [
          "export const DeadWriteOperation = defineOperation({",
          "  id: \"dead-write\",",
          "  kind: \"projection\",",
          "  input: CommandInput,",
          "  output: CommandOutput,",
          "  views: touches(PackageViews, {",
          "    reactivityKeys: [\"dead.changed\"],",
          "    atoms: [\"packageViewAtom\"],",
          "  } as const),",
          "  laws: [],",
          "} as const)",
        ],
        operationIds: ["DeadWriteOperation"],
      }),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "dead-reactivity-key",
        filePath: "packages/dead-key/src/attune.package.ts",
      }),
      expect.objectContaining({
        code: "unobserved-operation-reactivity-key",
        filePath: "packages/dead-key/src/attune.package.ts",
      }),
    ]))
  })

  it("rejects derived atoms that subscribe directly to Reactivity keys without durable-read metadata", () => {
    const workspaceRoot = makeWorkspace({
      "packages/derived-subscription/package.json": JSON.stringify({ name: "@attune/derived-subscription" }),
      "packages/derived-subscription/src/attune.package.ts": packageContractSource({
        packageId: "derived-subscription",
        viewsBody: [
          "  reactivityKeys: [\"source.changed\"],",
          "  atoms: [\"sourceAtom\", \"derivedAtom\", \"packageViewAtom\"],",
          "  baseAtoms: [{ id: \"sourceAtom\", refreshesOn: [\"source.changed\"] }],",
          "  derivedAtoms: [{ id: \"derivedAtom\", reads: [\"sourceAtom\"] }],",
          "  packageViewAtoms: [{ id: \"packageViewAtom\", reads: [\"derivedAtom\"] }],",
        ],
        operationsBody: [
          "export const DerivedAtomOperation = defineOperation({",
          "  id: \"derived-atom\",",
          "  kind: \"atom-family\",",
          "  input: CommandInput,",
          "  output: CommandOutput,",
          "  views: touches(PackageViews, {",
          "    reactivityKeys: [\"source.changed\"],",
          "    atoms: [\"derivedAtom\"],",
          "  } as const),",
          "  laws: [],",
          "  atom: {",
          "    derivedAtoms: [\"derivedAtom\"],",
          "    subscribesTo: [\"source.changed\"],",
          "  } as const,",
          "} as const)",
        ],
        operationIds: ["DerivedAtomOperation"],
      }),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "derived-atom-direct-reactivity-subscription",
        filePath: "packages/derived-subscription/src/attune.package.ts",
      }),
    ]))
  })

  it("rejects mutation, provider, scheduler, external, and mutable state work hidden inside atom implementations", () => {
    const workspaceRoot = makeWorkspace({
      "packages/unsafe-atoms/package.json": JSON.stringify({ name: "@attune/unsafe-atoms" }),
      "packages/unsafe-atoms/src/attune.package.ts": packageContractSource({
        packageId: "unsafe-atoms",
        viewsBody: [
          "  reactivityKeys: [\"unsafe.changed\"],",
          "  atoms: [\"unsafeAtom\"],",
          "  baseAtoms: [{ id: \"unsafeAtom\", refreshesOn: [\"unsafe.changed\"] }],",
          "  packageViewAtoms: [{ id: \"unsafeAtom\", reads: [\"unsafeAtom\"] }],",
        ],
        operationsBody: [],
        operationIds: [],
      }),
      "packages/unsafe-atoms/src/atoms/workbench.package-view-atom.ts": [
        "import { Effect } from \"effect\"",
        "export const workbenchPackageViewAtom = {",
        "  read: async ({ eventLog, projectionStore, provider }) => {",
        "    let cachedSnapshot",
        "    await eventLog.append({ type: \"FactRecorded\" })",
        "    await projectionStore.write(\"fact\", {})",
        "    await provider.apply({ kind: \"bucket\" })",
        "    await fetch(\"https://example.invalid/status\")",
        "    Effect.fork(Effect.never)",
        "    return cachedSnapshot",
        "  },",
        "}",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.atomImplementationDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "atom-hidden-mutable-state",
        filePath: "packages/unsafe-atoms/src/atoms/workbench.package-view-atom.ts",
        line: 4,
      }),
      expect.objectContaining({
        code: "atom-eventlog-mutation",
        filePath: "packages/unsafe-atoms/src/atoms/workbench.package-view-atom.ts",
        line: 5,
      }),
      expect.objectContaining({
        code: "atom-durable-write",
        filePath: "packages/unsafe-atoms/src/atoms/workbench.package-view-atom.ts",
        line: 6,
      }),
      expect.objectContaining({
        code: "atom-provider-action",
        filePath: "packages/unsafe-atoms/src/atoms/workbench.package-view-atom.ts",
        line: 7,
      }),
      expect.objectContaining({
        code: "atom-external-service-call",
        filePath: "packages/unsafe-atoms/src/atoms/workbench.package-view-atom.ts",
        line: 8,
      }),
      expect.objectContaining({
        code: "atom-scheduler-resource-lifecycle",
        filePath: "packages/unsafe-atoms/src/atoms/workbench.package-view-atom.ts",
        line: 9,
      }),
    ]))
    expect(result.outputLines).toEqual(expect.arrayContaining([
      expect.stringContaining(
        "attune/atom-implementation-boundary atom-eventlog-mutation packages/unsafe-atoms/src/atoms/workbench.package-view-atom.ts:5:",
      ),
    ]))
  })

  it("accepts recomputable atom reads and ignores fixture or generator templates", () => {
    const workspaceRoot = makeWorkspace({
      "packages/pure-atoms/package.json": JSON.stringify({ name: "@attune/pure-atoms" }),
      "packages/pure-atoms/src/attune.package.ts": packageContractSource({
        packageId: "pure-atoms",
        viewsBody: [
          "  reactivityKeys: [\"pure.changed\"],",
          "  atoms: [\"sourceAtom\", \"summaryAtom\"],",
          "  baseAtoms: [{ id: \"sourceAtom\", refreshesOn: [\"pure.changed\"] }],",
          "  packageViewAtoms: [{ id: \"summaryAtom\", reads: [\"sourceAtom\"] }],",
        ],
        operationsBody: [],
        operationIds: [],
      }),
      "packages/pure-atoms/src/atoms/workbench.package-view-atom.ts": [
        "export const workbenchPackageViewAtom = (sourceAtom) => ({",
        "  id: \"summaryAtom\",",
        "  read: () => ({",
        "    status: sourceAtom.read().status,",
        "    evidenceCount: sourceAtom.read().evidence.length,",
        "  }),",
        "})",
      ].join("\n"),
      "packages/pure-atoms/src/fixtures/unsafe-atom-fixture.ts": [
        "let fixtureState = 0",
        "export const fixtureAtom = () => fetch(\"https://example.invalid\")",
      ].join("\n"),
      "packages/pure-atoms/src/generators/atom-view/generator.ts": [
        "export const atomTemplate = `let generatedState = 0`",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(0)
    expect(result.atomImplementationDiagnostics).toEqual([])
    expect(result.outputLines).toEqual([])
  })

  it("accepts coherent operation to Reactivity key to base atom to derived atom to package view movement", () => {
    const workspaceRoot = makeWorkspace({
      "packages/coherent-views/package.json": JSON.stringify({ name: "@attune/coherent-views" }),
      "packages/coherent-views/src/attune.package.ts": packageContractSource({
        packageId: "coherent-views",
        viewsBody: [
          "  reactivityKeys: [\"coherent.changed\"],",
          "  atoms: [\"readModelAtom\", \"summaryAtom\", \"packageViewAtom\"],",
          "  baseAtoms: [{ id: \"readModelAtom\", refreshesOn: [\"coherent.changed\"] }],",
          "  derivedAtoms: [{ id: \"summaryAtom\", reads: [\"readModelAtom\"] }],",
          "  packageViewAtoms: [{ id: \"packageViewAtom\", reads: [\"summaryAtom\"] }],",
        ],
        operationsBody: [
          "export const ProjectionOperation = defineOperation({",
          "  id: \"project-coherent-view\",",
          "  kind: \"projection\",",
          "  input: CommandInput,",
          "  output: CommandOutput,",
          "  views: touches(PackageViews, {",
          "    reactivityKeys: [\"coherent.changed\"],",
          "    atoms: [\"readModelAtom\"],",
          "  } as const),",
          "  laws: [],",
          "} as const)",
        ],
        operationIds: ["ProjectionOperation"],
      }),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(0)
    expect(result.outputLines).toEqual([])
  })

  it("rejects package-local scripts and arbitrary nx run-commands once outside the TODO migration-debt allowlist", () => {
    const workspaceRoot = makeWorkspace({
      "packages/new-product/package.json": JSON.stringify({
        name: "@attune/new-product",
        scripts: {
          test: "vitest run",
        },
      }),
      "packages/new-product/project.json": JSON.stringify({
        name: "new-product",
        root: "packages/new-product",
        targets: {
          test: {
            executor: "nx:run-commands",
            options: {
              command: "pnpm exec vitest run",
            },
          },
        },
      }),
      "packages/new-product/src/attune.package.ts": [
        "export const PackageViews = definePackageViews({",
        "  reactivityKeys: [\"new-product.changed\"],",
        "  atoms: [\"newProductAtom\"],",
        "})",
        "export const PackageContract = definePackageContract({",
        "  packageId: \"new-product\",",
        "  views: PackageViews,",
        "  waivers: [{ category: \"temporary-command-surface\", owner: \"fixture\", reason: \"fixture\", review: \"fixture\" }],",
        "})",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "package-local-scripts",
        filePath: "packages/new-product/package.json",
      }),
      expect.objectContaining({
        code: "arbitrary-run-commands",
        filePath: "packages/new-product/project.json",
      }),
    ]))
  })

  it("rejects stale architecture-lint final-surface references, stale policy target guidance, and expired migration waivers", () => {
    const workspaceRoot = makeWorkspace({
      "docs/final-framework-surface.md": [
        "# Final Framework Surface",
        "",
        `Use ${staleArchitecturePackagePath} as the final architecture package.`,
      ].join("\n"),
      "docs/stale-policy-target.md": "Run workspace:policy-architecture before opening a PR.",
      "packages/expired-waiver/package.json": JSON.stringify({ name: "@attune/expired-waiver" }),
      "packages/expired-waiver/src/attune.package.ts": [
        "export const PackageViews = definePackageViews({",
        "  reactivityKeys: [\"expired-waiver.changed\"],",
        "  atoms: [\"expiredWaiverAtom\"],",
        "})",
        "export const PackageContract = definePackageContract({",
        "  packageId: \"expired-waiver\",",
        "  views: PackageViews,",
        "  waivers: [{ category: \"temporary-migration-adapter\", owner: \"fixture\", reason: \"fixture\", expiresOn: \"2026-06-21\" }],",
        "})",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "stale-architecture-lint-reference",
        filePath: "docs/final-framework-surface.md",
      }),
      expect.objectContaining({
        code: "stale-policy-architecture-guidance",
        filePath: "docs/stale-policy-target.md",
      }),
      expect.objectContaining({
        code: "expired-migration-waiver",
        filePath: "packages/expired-waiver/src/attune.package.ts",
      }),
    ]))
  })

  it("rejects residual package contract policy failures after typed and Schema checks", () => {
    const workspaceRoot = makeWorkspace({
      "packages/residual-contract/package.json": JSON.stringify({ name: "@attune/residual-contract" }),
      "packages/residual-contract/src/attune.package.ts": packageContractSource({
        packageId: "residual-contract",
        viewsBody: [
          "  reactivityKeys: [\"residual.changed\"],",
          "  atoms: [\"residualAtom\"],",
        ],
        operationsBody: [
          "export const BadLawOperation = defineOperation({",
          "  id: \"duplicate-id\",",
          "  kind: \"query\",",
          "  input: CommandInput,",
          "  output: CommandOutput,",
          "  views: touches(PackageViews, {",
          "    reactivityKeys: [\"missing.changed\"],",
          "    atoms: [\"missingAtom\"],",
          "  } as const),",
          "  laws: [\"schema.decode\", \"not.real\", \"resource.observed-idempotence\"],",
          "  metadata: { hiddenConfiguration: true },",
          "} as const)",
          "export const DuplicateOperation = defineOperation({",
          "  id: \"duplicate-id\",",
          "  kind: \"query\",",
          "  input: CommandInput,",
          "  output: CommandOutput,",
          "  views: touches(PackageViews, {",
          "    reactivityKeys: [\"residual.changed\"],",
          "    atoms: [\"residualAtom\"],",
          "  } as const),",
          "  laws: [\"schema.decode\"],",
          "} as const)",
          "export const MigrationAlias = { migrationOnlyAlias: true }",
        ],
        operationIds: ["BadLawOperation", "DuplicateOperation"],
      }),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot, { checks: ["policy-surface"] })

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "duplicate-operation-id",
        filePath: "packages/residual-contract/src/attune.package.ts",
      }),
      expect.objectContaining({
        code: "invalid-law-id",
        filePath: "packages/residual-contract/src/attune.package.ts",
        message: expect.stringContaining("not.real"),
      }),
      expect.objectContaining({
        code: "invalid-law-id",
        filePath: "packages/residual-contract/src/attune.package.ts",
        message: expect.stringContaining("resource.observed-idempotence"),
      }),
      expect.objectContaining({
        code: "invalid-view-reference",
        filePath: "packages/residual-contract/src/attune.package.ts",
        message: expect.stringContaining("missing.changed"),
      }),
      expect.objectContaining({
        code: "invalid-view-reference",
        filePath: "packages/residual-contract/src/attune.package.ts",
        message: expect.stringContaining("missingAtom"),
      }),
      expect.objectContaining({
        code: "hidden-configuration-without-waiver",
        filePath: "packages/residual-contract/src/attune.package.ts",
      }),
      expect.objectContaining({
        code: "migration-only-alias",
        filePath: "packages/residual-contract/src/attune.package.ts",
      }),
    ]))
  })

  it("rejects stale generated files and manual derived ledger truth markers", () => {
    const workspaceRoot = makeWorkspace({
      "packages/generated-drift/package.json": JSON.stringify({ name: "@attune/generated-drift" }),
      "packages/generated-drift/src/attune.package.ts": packageContractSource({
        packageId: "generated-drift",
        viewsBody: [
          "  reactivityKeys: [\"generated-drift.changed\"],",
          "  atoms: [\"generatedDriftAtom\"],",
        ],
        operationsBody: [],
        operationIds: [],
      }),
      "packages/generated-drift/src/generated/stale.generated.ts": [
        "// @generated by @attune/nx",
        "export const staleGenerated = true",
      ].join("\n"),
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        manualProtocolTruth: true,
      }),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot, { checks: ["policy-surface"] })

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "stale-generated-file",
        filePath: "packages/generated-drift/src/generated/stale.generated.ts",
      }),
      expect.objectContaining({
        code: "manual-derived-truth",
        filePath: "attune.source-bom.index.json",
      }),
    ]))
  })

  it("rejects workerized targets that omit static worker metadata", () => {
    const workspaceRoot = makeWorkspace({
      "packages/worker-policy/package.json": JSON.stringify({ name: "@attune/worker-policy" }),
      "packages/worker-policy/project.json": JSON.stringify({
        name: "worker-policy",
        root: "packages/worker-policy",
        targets: {
          "worker-property": {
            executor: "attune:toolchain",
            options: {
              tool: "worker-fuzz",
              timeoutSeconds: 120,
              workerBudget: {
                maxWorkers: 2,
                seedRange: { start: 1, end: 100 },
              },
            },
          },
          "worker-property-complete": {
            executor: "attune:toolchain",
            options: {
              tool: "worker-fuzz",
              timeoutSeconds: 120,
              workerBudget: {
                maxWorkers: 2,
                seedRange: { start: 1, end: 100 },
                shardCount: 2,
                shardIndex: 0,
              },
            },
            metadata: {
              attune: {
                worker: {
                  isolationLevel: "file",
                  randomSource: "main-thread",
                },
              },
            },
          },
        },
      }),
      "packages/worker-policy/src/attune.package.ts": packageContractSource({
        packageId: "worker-policy",
        viewsBody: [
          "  reactivityKeys: [\"worker-policy.changed\"],",
          "  atoms: [\"workerPolicyAtom\"],",
        ],
        operationsBody: [],
        operationIds: [],
      }),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot, { checks: ["property-evidence"] })

    expect(result.exitCode).toBe(1)
    expect(result.ratchetDiagnostics).toEqual([
      expect.objectContaining({
        code: "worker-target-metadata",
        filePath: "packages/worker-policy/project.json",
        message: expect.stringContaining("isolation level"),
      }),
    ])
  })

  it("supports focused CLI policy slices", () => {
    const workspaceRoot = makeWorkspace({
      "packages/no-coverage/package.json": JSON.stringify({ name: "@attune/no-coverage" }),
      "packages/no-coverage/src/attune.package.ts": [
        "export const PackageViews = definePackageViews({",
        "  reactivityKeys: [\"no-coverage.changed\"],",
        "  atoms: [\"noCoverageAtom\"],",
        "})",
        "export const PackageContract = definePackageContract({",
        "  packageId: \"no-coverage\",",
        "  views: PackageViews,",
        "  waivers: [] as const,",
        "})",
      ].join("\n"),
    })
    const outputLines: string[] = []

    const exitCode = runFrameworkPolicyCli([
      "node",
      "framework-policy-cli.ts",
      "--only",
      "coverage-conformance",
      workspaceRoot,
    ], (line) => {
      outputLines.push(line)
    })

    expect(exitCode).toBe(1)
    expect(outputLines).toEqual([
      expect.stringContaining("missing-coverage-conformance"),
    ])
    expect(outputLines).not.toEqual([
      expect.stringContaining("missing-property-evidence-harness"),
    ])
  })

  it("allows local cache artifacts and legitimate generated source", () => {
    const workspaceRoot = makeWorkspace({
      ".attune/cache/protocol/protocol-delta-report.json": JSON.stringify({
        protocolDeltas: [{ deltaId: "delta-1", packageId: "product" }],
      }),
      ".attune/cache/protocol/property-evidence-summary.md": [
        "# Property Evidence Summary",
        "",
        "Ephemeral cache output.",
      ].join("\n"),
      "packages/product/src/generated/evidence/protocol-evidence.generated.ts": [
        importFrom("{ makeEvidenceHarness }", "@attune/framework-testing"),
        "export const evidenceSummary = \"projected through framework runtime/cache\"",
      ].join("\n"),
      "packages/product/src/attune.package.typecheck.ts": [
        importFrom("{ defineAttunePackage }", "@attune/framework-protocol"),
        "export const generatedTypecheck = \"ProtocolDelta diagnostics are not report truth\"",
      ].join("\n"),
    })

    const result = checkFrameworkPolicyWorkspace(workspaceRoot)

    expect(result.exitCode).toBe(0)
    expect(result.outputLines).toEqual([])
  })

  it("formats CLI diagnostics and returns a failing exit code", () => {
    const workspaceRoot = makeWorkspace({
      "packages/product/src/runtime.ts": importFrom("{ materialize }", "@attune/framework-runtime/internal"),
    })
    const outputLines: string[] = []

    const exitCode = runFrameworkPolicyCli(["node", "framework-policy-cli.ts", workspaceRoot], (line) => {
      outputLines.push(line)
    })

    expect(exitCode).toBe(1)
    expect(outputLines).toEqual([
      expect.stringContaining("ERROR attune/framework-import-boundary framework-runtime-internal-import packages/product/src/runtime.ts"),
    ])
  })

  it("passes against the actual repository scan", () => {
    const result = checkFrameworkPolicyWorkspace(repoRoot)

    expect(result.exitCode).toBe(0)
    expect(result.outputLines).toEqual([])
  }, 60_000)
})

function makeWorkspace(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "attune-framework-policy-"))
  tempRoots.push(root)

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath)
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, `${content}\n`, "utf8")
  }

  return root
}

function importFrom(imports: string, source: string): string {
  return ["import ", imports, " from ", JSON.stringify(source)].join("")
}

function packageContractSource(input: {
  readonly packageId: string
  readonly viewsBody: readonly string[]
  readonly operationsBody: readonly string[]
  readonly operationIds: readonly string[]
}): string {
  return [
    "const CommandInput = {}",
    "const CommandOutput = {}",
    "const definePackageViews = (views) => views",
    "const definePackageContract = (contract) => contract",
    "const defineOperation = (operation) => operation",
    "const defineTypeGuidance = (guidance) => guidance",
    "const touches = (_views, touched) => touched",
    "export const PackageViews = definePackageViews({",
    ...input.viewsBody,
    "} as const)",
    ...input.operationsBody,
    "export const PackageContract = definePackageContract({",
    `  packageId: "${input.packageId}",`,
    "  packageKind: \"core-discovery-runtime\",",
    "  views: PackageViews,",
    `  operations: [${input.operationIds.join(", ")}] as const,`,
    "  waivers: [] as const,",
    "} as const)",
    "export const PackageTypeGuidance = defineTypeGuidance({ operations: {} })",
  ].join("\n")
}

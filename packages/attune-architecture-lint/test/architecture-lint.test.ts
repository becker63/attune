import { describe, expect, it } from "vitest"
import { Effect } from "effect"

import {
  ArchitectureLintFileSystem,
  scanArchitecture,
  type ArchitectureLintFileSystemService,
} from "../src/index.js"

const makeMemoryFileSystem = (files: Readonly<Record<string, string>>): ArchitectureLintFileSystemService => ({
  readText: (path) => Effect.succeed(files[path] ?? ""),
  exists: (path) => Effect.succeed(Object.hasOwn(files, path)),
  listFiles: (path) =>
    Effect.succeed(
      Object.keys(files).filter((file) => file.startsWith(`${path}/`)),
    ),
})

const runScan = (files: Readonly<Record<string, string>>) =>
  Effect.runPromise(
    scanArchitecture({ root: "/repo" }).pipe(
      Effect.provideService(ArchitectureLintFileSystem, makeMemoryFileSystem(files)),
    ),
  )

const generatorCoverageFiles = {
  "/repo/packages/attune-nx/package.json": JSON.stringify({ name: "@attune/nx" }),
  "/repo/packages/attune-nx/project.json": JSON.stringify({ targets: {} }),
  "/repo/packages/attune-nx/generators.json": JSON.stringify({
    generators: {
      "effect-service": {},
      "k8s-resource": {},
      "sync-effect-layers": {},
      "sync-k8s-resources": {},
    },
  }),
} as const

describe("attune architecture lint", () => {
  it("rejects local helper lifecycle surfaces in Alchemy packages", async () => {
    const report = await runScan({
      "/repo/packages/home-deployment/package.json": JSON.stringify({
        name: "@attune/home-deployment",
        dependencies: { alchemy: "^0.93.12", effect: "4.0.0-beta.78" },
        bin: { "attune-home": "./dist/cli.js" },
      }),
      "/repo/packages/home-deployment/project.json": JSON.stringify({
        targets: { deploy: {}, lint: {} },
      }),
      "/repo/packages/home-deployment/src/cli.ts": "export {}",
      ...generatorCoverageFiles,
    })

    expect(report.findings.map((finding) => finding.ruleId)).toContain("attune/no-local-lifecycle-helper")
  })

  it("accepts native Alchemy plus Effect Schema provider boundaries", async () => {
    const report = await runScan({
      "/repo/packages/home-deployment/package.json": JSON.stringify({
        name: "@attune/home-deployment",
        dependencies: { alchemy: "^0.93.12", effect: "4.0.0-beta.78" },
      }),
      "/repo/packages/home-deployment/project.json": JSON.stringify({
        targets: { build: {}, lint: {} },
      }),
      "/repo/packages/home-deployment/src/providers.ts": [
        'import { Context, Schema } from "effect"',
        "export const ProviderOutput = Schema.Struct({ id: Schema.String })",
        "export interface NixProvider {}",
        "export class NixProviderService extends Context.Service<NixProviderService, NixProvider>()(\"NixProviderService\") {}",
      ].join("\n"),
      "/repo/packages/home-deployment/src/alchemy.ts": [
        'import { Resource } from "alchemy"',
        'import type { ProviderTransitionResult } from "./providers.js"',
        "export const DeploymentResource = Resource(\"attune:test\", async function () {",
        "  return this.create({ provider: \"test\", transition: undefined as ProviderTransitionResult | undefined })",
        "})",
      ].join("\n"),
      "/repo/packages/home-deployment/attune.source-bom.json": JSON.stringify({
        project: "home-deployment",
        entries: [{
          id: "home-deployment-provider",
          kind: "effect-service",
          generator: "@attune/nx:effect-service",
          ownedFiles: [
            "src/providers.ts",
            "src/alchemy.ts",
          ],
        }],
      }),
      ...generatorCoverageFiles,
    })

    expect(report.findings).toEqual([])
  })

  it("scans root metadata, project metadata, and Markdown for undeclared workflows", async () => {
    const report = await runScan({
      "/repo/package.json": JSON.stringify({
        scripts: {
          check: "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run workspace:policy-fast",
        },
      }),
      "/repo/project.json": JSON.stringify({
        targets: {
          "policy-fast": {
            options: { command: "node scripts/policy-fast.mjs" },
          },
        },
      }),
      "/repo/docs/cloud.md": "Run node_modules/.bin/nx graph when the local shell is already prepared.",
      ...generatorCoverageFiles,
    })

    const findings = report.findings.filter((finding) => finding.ruleId === "attune/no-undeclared-workflow-surface")
    expect(findings.map((finding) => finding.path)).toEqual([
      "package.json",
      "package.json",
      "project.json",
      "docs/cloud.md",
    ])
  })

  it("allows explicitly waived historical workflow text", async () => {
    const report = await runScan({
      "/repo/docs/historical.md": "Historical imported note: corepack pnpm install was used before Nix.",
      "/repo/attune.policy-waivers.json": JSON.stringify({
        waivers: [{
          id: "historical-corepack-note",
          ruleId: "attune/no-undeclared-workflow-surface",
          owner: "platform",
          reason: "Imported historical text retained during migration.",
          created: "2026-06-21",
          expires: "2999-01-01",
          paths: ["docs/historical.md"],
          followUp: "Remove when historical migration notes are archived.",
        }],
      }),
      ...generatorCoverageFiles,
    })

    expect(report.findings.filter((finding) => finding.ruleId === "attune/no-undeclared-workflow-surface")).toEqual([])
  })

  it("reports repeated source shapes without Source BOM ownership in warning mode", async () => {
    const report = await runScan({
      "/repo/packages/attuned-discovery/package.json": JSON.stringify({
        name: "@attune/attuned-discovery",
        dependencies: { effect: "4.0.0-beta.78" },
      }),
      "/repo/packages/attuned-discovery/project.json": JSON.stringify({ targets: { test: {} } }),
      "/repo/packages/attuned-discovery/src/services/DiscoveryEvents.ts": [
        'import { Context, Schema } from "effect"',
        "export const DiscoveryEvent = Schema.Struct({ id: Schema.String })",
        "export class DiscoveryEvents extends Context.Service<DiscoveryEvents, {}>(\"DiscoveryEvents\") {}",
      ].join("\n"),
      ...generatorCoverageFiles,
    })

    expect(report.findings).toContainEqual(expect.objectContaining({
      ruleId: "attune/source-bom-ownership",
      severity: "warning",
      path: "packages/attuned-discovery/src/services/DiscoveryEvents.ts",
    }))
  })

  it("accepts Source BOM entries and Source BOM waivers for repeated source shapes", async () => {
    const report = await runScan({
      "/repo/packages/attuned-discovery/package.json": JSON.stringify({
        name: "@attune/attuned-discovery",
        dependencies: { effect: "4.0.0-beta.78" },
      }),
      "/repo/packages/attuned-discovery/project.json": JSON.stringify({ targets: { test: {} } }),
      "/repo/packages/attuned-discovery/src/services/DiscoveryEvents.ts": [
        'import { Context, Schema } from "effect"',
        "export const DiscoveryEvent = Schema.Struct({ id: Schema.String })",
        "export class DiscoveryEvents extends Context.Service<DiscoveryEvents, {}>(\"DiscoveryEvents\") {}",
      ].join("\n"),
      "/repo/packages/attuned-discovery/src/services/HistoricalEvents.ts": [
        'import { Context, Schema } from "effect"',
        "export const HistoricalEvent = Schema.Struct({ id: Schema.String })",
        "export class HistoricalEvents extends Context.Service<HistoricalEvents, {}>(\"HistoricalEvents\") {}",
      ].join("\n"),
      "/repo/packages/attuned-discovery/attune.source-bom.json": JSON.stringify({
        project: "attuned-discovery",
        entries: [{
          id: "discovery-events",
          kind: "effect-service",
          generator: "@attune/nx:effect-service",
          ownedFiles: ["src/services/DiscoveryEvents.ts"],
        }],
        waivers: [{
          id: "historical-events-migration",
          ruleId: "attune/source-bom-ownership",
          owner: "discovery",
          reason: "Historical service awaits generator backfill.",
          created: "2026-06-21",
          expires: "2999-01-01",
          paths: ["packages/attuned-discovery/src/services/HistoricalEvents.ts"],
          followUp: "Backfill Source BOM after generator migration.",
        }],
      }),
      ...generatorCoverageFiles,
    })

    expect(report.findings.filter((finding) => finding.ruleId === "attune/source-bom-ownership")).toEqual([])
  })
})

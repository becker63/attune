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
    })

    expect(report.findings).toEqual([])
  })
})

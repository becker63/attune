import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { Effect, Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  createInMemoryRecipeReceiptStore,
  InMemoryProgramFactStoreLive,
  ProgramDiagnostics,
  ProgramDiagnosticsLive,
  ProgramFactProjectionLive,
  ProgramFactQuery,
  ProgramFactQueryLive,
  ProgramFactRuntime,
  ProgramFactRuntimeLive,
  ProgramFactStore,
  type ProgramFactStoreSnapshot,
} from "@attune/framework-runtime"

import {
  collectTrellisDiagnostics,
  collectTrellisFixes,
  runApplyCommand,
  runCheckCommand,
  runDiagnosticsCommand,
  runFixesCommand,
  trellisFixFromProgramRepairAction,
  trellisFixFromRecipeRepair,
  TrellisLsApplyOutputSchema,
  TrellisLsCheckOutputSchema,
  TrellisLsDiagnosticsOutputSchema,
  TrellisLsFixesOutputSchema,
  upstreamEffectSource,
} from "../src/index.js"
import type { LoadedProject } from "../src/project-loader.js"

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)

const makeFixture = (): {
  readonly root: string
  readonly project: string
  readonly file: string
} => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.symlinkSync(path.join(packageRoot, "node_modules"), path.join(root, "node_modules"), "dir")
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  const file = path.join(root, "src", "floating.ts")
  fs.writeFileSync(file, [
    "import { Effect } from \"effect\"",
    "",
    "export const demo = () => {",
    "  Effect.succeed(1)",
    "}",
    "",
  ].join("\n"))
  const project = path.join(root, "tsconfig.json")
  fs.writeFileSync(project, JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      target: "ES2023",
      strict: true,
      skipLibCheck: true,
    },
    include: ["src/**/*.ts"],
  }, null, 2))

  return { root, project, file }
}

const makeScriptFixture = (): {
  readonly root: string
  readonly project: string
} => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-script-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "scripts"), { recursive: true })
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  fs.writeFileSync(path.join(root, "packages", "demo", "scripts", "legacy.ts"), "export {}\n")
  fs.writeFileSync(path.join(root, "src", "index.ts"), "export {}\n")
  const project = path.join(root, "tsconfig.json")
  fs.writeFileSync(project, JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      target: "ES2023",
      strict: true,
      skipLibCheck: true,
    },
    include: ["src/**/*.ts"],
  }, null, 2))
  return { root, project }
}

const makeRawPostgresFixture = (): {
  readonly root: string
  readonly project: string
} => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-pg-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  fs.writeFileSync(path.join(root, "src", "db.ts"), "import pg from \"pg\"\nexport const client = pg\n")
  const project = path.join(root, "tsconfig.json")
  fs.writeFileSync(project, JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      target: "ES2023",
      strict: true,
      skipLibCheck: true,
    },
    include: ["src/**/*.ts"],
  }, null, 2))
  return { root, project }
}

const makeRecipeOnlyFixture = (): {
  readonly root: string
  readonly attunePackage: string
} => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-recipe-only-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "packages", "trellis", "language-service", "src"), { recursive: true })
  const attunePackage = path.join(root, "packages", "trellis", "language-service", "src", "attune.package.ts")
  fs.writeFileSync(attunePackage, [
    "const defineAttuneProjectFacts = (value: unknown) => value",
    "export const ProjectRuntimeRoots = {}",
    "export const ProjectFacts = defineAttuneProjectFacts({ id: \"framework-language-service\" })",
    "",
  ].join("\n"))
  fs.writeFileSync(
    path.join(root, "packages", "trellis", "language-service", "src", "recipes.ts"),
    "export const FrameworkLanguageServiceRecipePackage = {}\n",
  )
  fs.writeFileSync(
    path.join(root, "packages", "trellis", "language-service", "src", "cli.ts"),
    "export {}\n",
  )
  return { root, attunePackage }
}

const makeRecipeOwnershipFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-ownership-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  const cli = path.join(root, "src", "cli.ts")
  const diagnostics = path.join(root, "src", "diagnostic-recipes.ts")
  const unowned = path.join(root, "src", "unowned.ts")
  fs.writeFileSync(cli, "export const run = () => undefined\n")
  fs.writeFileSync(diagnostics, "export const collect = () => []\n")
  fs.writeFileSync(unowned, "export const value = 1\n")
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [cli, diagnostics, unowned],
  }
}

const makeTrellisArchitectureDiagnosticsFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-architecture-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src", "generated"), { recursive: true })
  fs.mkdirSync(path.join(root, "packages", "tend", "core", "src"), { recursive: true })
  fs.writeFileSync(path.join(root, "packages", "demo", "project.json"), JSON.stringify({
    name: "demo",
    targets: {
      check: {
        metadata: {
          attune: {
            tier: "public",
            surface: "check",
          },
        },
      },
    },
  }, null, 2))
  const generated = path.join(root, "packages", "demo", "src", "generated", "widget.ts")
  const managed = path.join(root, "packages", "demo", "src", "managed.ts")
  const ledger = path.join(root, "packages", "demo", "src", "ledger.ts")
  const tend = path.join(root, "packages", "tend", "core", "src", "session.ts")
  fs.writeFileSync(generated, [
    "// @generated-hash expected=abc actual=def",
    "export const widget = 1",
    "",
  ].join("\n"))
  fs.writeFileSync(managed, [
    "const defineManagedRecipe = (recipe: unknown) => recipe",
    "export const resource = defineManagedRecipe({",
    "  id: \"demo.resource\",",
    "  lifecycle: [\"apply\"],",
    "})",
    "",
  ].join("\n"))
  fs.writeFileSync(ledger, [
    "// private ledger without recipe linkage",
    "const privateLedger: unknown[] = []",
    "export const appendOperation = (value: unknown) => privateLedger.push(value)",
    "",
  ].join("\n"))
  fs.writeFileSync(tend, [
    "export const session = { id: \"s1\" }",
    "export const command = { id: \"c1\" }",
    "export const report = { id: \"r1\" }",
    "",
  ].join("\n"))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [generated, managed, ledger, tend],
  }
}

const normalizeForSnapshot = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (_key, rawValue: unknown) => {
    if (typeof rawValue !== "string") return rawValue
    return rawValue
      .replace(/\/tmp\/trellis-ls-[^"/\s]+/gu, "<workspace>")
      .replace(/diag_[A-Za-z0-9_-]+/gu, "diag_snapshot")
      .replace(/fix_[A-Za-z0-9_-]+/gu, "fix_snapshot")
  }))

const collectSourceFiles = (root: string): readonly string[] => {
  const files: string[] = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath))
    } else if (/\.[cm]?ts$/u.test(entry.name)) {
      files.push(entryPath)
    }
  }
  return files
}

const provideProgramFactRuntime = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | ProgramFactRuntime
    | ProgramFactQuery
    | ProgramDiagnostics
    | ProgramFactStore
  >,
  initial?: Partial<ProgramFactStoreSnapshot>,
): Effect.Effect<A, E, never> =>
  effect.pipe(
    Effect.provide(ProgramDiagnosticsLive),
    Effect.provide(ProgramFactQueryLive),
    Effect.provide(ProgramFactRuntimeLive),
    Effect.provide(ProgramFactProjectionLive),
    Effect.provide(InMemoryProgramFactStoreLive(initial)),
  ) as Effect.Effect<A, E, never>

const demoProgramFactDescriptor = {
  schemaDescriptorId: "attune/project/demo",
  projectId: "demo",
  packageKind: "policy-plugin",
  descriptorHash: "demo-hash",
  sourcePath: "packages/demo/src/recipes.ts",
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

describe("trellis-ls CLI core", () => {
  it("records the upstream Effect language-service boundary", () => {
    expect(upstreamEffectSource).toMatchObject({
      repository: "https://github.com/Effect-TS/language-service",
      commit: "df50dfce9ab8b299f6d21c35c231bcc12cbca4ee",
      packageVersion: "0.86.2",
      copiedSourceRoot: "src/upstream-effect/vendor",
      adaptedEntryPoint: "LSP.getSemanticDiagnosticsWithCodeFixes",
    })
    expect(fs.existsSync(path.join(packageRoot, "src", "upstream-effect", "vendor", "core", "LSP.ts"))).toBe(true)
    expect(fs.existsSync(
      path.join(packageRoot, "src", "upstream-effect", "vendor", "cli", "diagnostics.ts"),
    )).toBe(true)
    expect(fs.existsSync(
      path.join(packageRoot, "src", "upstream-effect", "vendor", "diagnostics", "floatingEffect.ts"),
    )).toBe(true)
  })

  it("exposes help for canonical CLI commands", () => {
    const result = childProcess.spawnSync(
      "pnpm",
      ["exec", "tsx", "src/cli.ts", "--help"],
      {
        cwd: packageRoot,
        encoding: "utf8",
      },
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain("trellis-ls diagnostics")
    expect(result.stdout).toContain("trellis-ls fixes")
    expect(result.stdout).toContain("trellis-ls apply")
    expect(result.stdout).toContain("trellis-ls check")
    expect(result.stdout).not.toContain("trellis-ls patch")
  })

  it("wires the executable CLI to the configured framework observation sink", () => {
    const fixture = makeFixture()
    const result = childProcess.spawnSync(
      "pnpm",
      ["exec", "tsx", "src/cli.ts", "diagnostics", "--project", fixture.project, "--format", "json"],
      {
        cwd: packageRoot,
        env: {
          ...process.env,
          ATTUNE_RECIPE_STORE_MODE: "in-memory",
          ATTUNE_MEASUREMENT_SESSION_ID: "measurement:trellis-ls-cli-test",
        },
        encoding: "utf8",
      },
    )

    expect(result.status).toBe(0)
    const output = Schema.decodeUnknownSync(TrellisLsDiagnosticsOutputSchema)(JSON.parse(result.stdout))
    expect(output.metadata.evidenceMode).toBe("in-memory")
  })

  it("returns schema-decodable diagnostics JSON", () => {
    const fixture = makeFixture()
    const result = runDiagnosticsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      format: "json",
    })

    expect(result.exitCode).toBe(0)
    const decoded = Schema.decodeUnknownSync(TrellisLsDiagnosticsOutputSchema)(result.output)
    expect(decoded.diagnostics).toHaveLength(1)
    expect(decoded.diagnostics[0]).toMatchObject({
      source: "effect",
      code: "effect/floatingEffect",
      file: "src/floating.ts",
    })
    expect(decoded.diagnostics[0]?.repairIds).toHaveLength(1)
  })

  it("returns fixes for a diagnostic and for project scope", () => {
    const fixture = makeFixture()
    const diagnostics = runDiagnosticsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      format: "json",
    }).output
    const diagnosticId = diagnostics.diagnostics[0]!.id

    const targeted = Schema.decodeUnknownSync(TrellisLsFixesOutputSchema)(
      runFixesCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        diagnosticId,
        format: "json",
      }).output,
    )
    const projectWide = Schema.decodeUnknownSync(TrellisLsFixesOutputSchema)(
      runFixesCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        format: "json",
      }).output,
    )

    expect(targeted.fixes).toHaveLength(1)
    expect(projectWide.fixes).toHaveLength(1)
    expect(targeted.fixes[0]).toMatchObject({
      diagnosticId,
      kind: "text-edit",
      safe: true,
      requiresReview: false,
      canApply: true,
    })
  })

  it("previews a fix in diff mode without writing", () => {
    const fixture = makeFixture()
    const before = fs.readFileSync(fixture.file, "utf8")
    const fixId = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      format: "json",
    }).output.fixes[0]!.fixId

    const output = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(
      runApplyCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        fixId,
        mode: "diff",
        format: "json",
      }).output,
    )

    expect(output.applied).toBe(false)
    expect(output.refused).toBe(false)
    expect(output.diff).toContain("+  void Effect.succeed(1)")
    expect(fs.readFileSync(fixture.file, "utf8")).toBe(before)
  })

  it("applies a safe text edit in write mode", () => {
    const fixture = makeFixture()
    const fixId = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      format: "json",
    }).output.fixes[0]!.fixId

    const result = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      fixId,
      mode: "write",
      format: "json",
      recheck: true,
    })
    const output = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(result.output)

    expect(result.exitCode).toBe(0)
    expect(output.applied).toBe(true)
    expect(output.recheck?.diagnostics.filter((diagnostic) =>
      diagnostic.code === "effect/floatingEffect"
    )).toHaveLength(0)
    expect(fs.readFileSync(fixture.file, "utf8")).toContain("void Effect.succeed(1)")
  })

  it("refuses stale or missing fixes without writing", () => {
    const fixture = makeFixture()
    const before = fs.readFileSync(fixture.file, "utf8")
    const result = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      fixId: "fix_missing",
      mode: "write",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(result.output)

    expect(result.exitCode).toBe(1)
    expect(output.refused).toBe(true)
    expect(output.refusal?.code).toBe("trellis-ls/fix-not-found")
    expect(fs.readFileSync(fixture.file, "utf8")).toBe(before)
  })

  it("returns schema-decodable check output", () => {
    const fixture = makeFixture()
    const result = runCheckCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      format: "json",
      failOn: "warning",
    })
    const output = Schema.decodeUnknownSync(TrellisLsCheckOutputSchema)(result.output)

    expect(result.exitCode).toBe(1)
    expect(output.blocking).toBe(true)
    expect(output.diagnosticCodes).toContain("effect/floatingEffect")
  })

  it("serializes public Nx repair fixes for no-compat script diagnostics", () => {
    const fixture = makeScriptFixture()
    const fixes = Schema.decodeUnknownSync(TrellisLsFixesOutputSchema)(
      runFixesCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        format: "json",
      }).output,
    )

    expect(fixes.fixes).toContainEqual(expect.objectContaining({
      kind: "nx-repair",
      safe: true,
      requiresReview: false,
      command: {
        run: "nx run workspace:repair",
      },
    }))
  })

  it("refuses manual raw Postgres boundary fixes", () => {
    const fixture = makeRawPostgresFixture()
    const fix = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      includeManual: true,
      format: "json",
    }).output.fixes.find((candidate) => candidate.kind === "manual")

    expect(fix).toBeDefined()
    const result = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      fixId: fix!.fixId,
      mode: "write",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(result.output)

    expect(result.exitCode).toBe(1)
    expect(output.refused).toBe(true)
    expect(output.refusal?.code).toBe("trellis-ls/unsafe-fix")
  })

  it("enables the recipe-only source migration profile through diagnostics and fixes", () => {
    const fixture = makeRecipeOnlyFixture()
    const diagnostics = runDiagnosticsCommand({
      cwd: fixture.root,
      workspace: ".",
      profile: "recipe-only-source",
      format: "json",
    }).output
    const authoredDiagnostic = diagnostics.diagnostics.find((diagnostic) =>
      diagnostic.code === "trellis/authored-attune-package-file"
    )

    expect(diagnostics.metadata.profile).toBe("recipe-only-source")
    expect(authoredDiagnostic).toMatchObject({
      file: "packages/trellis/language-service/src/attune.package.ts",
      severity: "error",
    })
    expect(diagnostics.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "trellis/source-uses-legacy-abstraction",
    )

    const fixes = runFixesCommand({
      cwd: fixture.root,
      workspace: ".",
      profile: "recipe-only-source",
      diagnosticId: authoredDiagnostic!.id,
      includeManual: true,
      format: "json",
    }).output
    expect(fixes.fixes[0]).toMatchObject({
      kind: "text-edit",
      safe: true,
      requiresReview: false,
      canApply: true,
      title: "Delete migrated language-service attune.package.ts",
    })

    const before = fs.readFileSync(fixture.attunePackage, "utf8")
    const diff = runApplyCommand({
      cwd: fixture.root,
      workspace: ".",
      profile: "recipe-only-source",
      fixId: fixes.fixes[0]!.fixId,
      mode: "diff",
      format: "json",
    }).output

    expect(diff.applied).toBe(false)
    expect(diff.refused).toBe(false)
    expect(diff.diff).toContain("-export const ProjectFacts")
    expect(fs.readFileSync(fixture.attunePackage, "utf8")).toBe(before)
  })

  it("diagnoses recipe-only ownership and emits preview-first migration fixes", () => {
    const loaded = makeRecipeOwnershipFixture()
    const diagnostics = collectTrellisDiagnostics(loaded, {
      profile: "recipe-only-source",
      recipePackages: [{
        packageId: "demo",
        kind: "framework-language-service",
        sourceRoot: "src",
        recipes: [],
        ownership: [{
          id: "known-files",
          files: ["src/cli.ts", "src/diagnostic-recipes.ts"],
          recipeIds: [],
        }],
      }],
    })
    const codes = diagnostics.map((diagnostic) => diagnostic.code)

    expect(codes).toContain("trellis/workflow-not-invocation-recipe")
    expect(codes).toContain("trellis/diagnostic-logic-not-diagnostic-recipe")
    expect(codes).toContain("trellis/source-file-unowned-by-recipe")

    const fixes = collectTrellisFixes(loaded, diagnostics)
    expect(fixes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "manual",
        title: "Scaffold an InvocationRecipe for workflow entrypoint",
        requiresReview: true,
      }),
      expect.objectContaining({
        kind: "manual",
        title: "Convert diagnostic helper into a DiagnosticRecipe",
        requiresReview: true,
      }),
      expect.objectContaining({
        kind: "manual",
        title: "Attach source file to a Recipe-family declaration",
        requiresReview: true,
      }),
    ]))
  })

  it("exposes oxlint-era architecture invariants as Trellis diagnostic recipes", () => {
    const loaded = makeTrellisArchitectureDiagnosticsFixture()
    const diagnostics = collectTrellisDiagnostics(loaded, { recipePackages: [] })
    const codes = diagnostics.map((diagnostic) => diagnostic.code)

    expect(codes).toEqual(expect.arrayContaining([
      "trellis/generated-artifact-missing-owner",
      "trellis/generated-artifact-stale",
      "trellis/orphan-public-nx-target",
      "trellis/target-missing-recipe-invocation",
      "trellis/managed-recipe-missing-substrate",
      "trellis/managed-recipe-missing-observation",
      "trellis/destructive-lifecycle-missing-review-gate",
      "trellis/alchemy-provenance-missing",
      "trellis/private-ledger-without-recipe-linkage",
      "trellis/operation-missing-receipt",
      "trellis/tend-session-missing-recipe-id",
      "trellis/tend-command-missing-observation-id",
      "trellis/tend-report-not-derived-from-receipts",
    ]))

    const fixes = collectTrellisFixes(loaded, diagnostics)
    expect(fixes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "manual",
        title: "Refresh generated artifact through its ProjectionRecipe",
        requiresReview: true,
      }),
      expect.objectContaining({
        kind: "nx-repair",
        title: "Route Nx target ownership through workspace repair",
        safe: true,
        command: { run: "nx run workspace:repair" },
      }),
      expect.objectContaining({
        kind: "manual",
        title: "Review ManagedRecipe lifecycle metadata",
        requiresReview: true,
      }),
      expect.objectContaining({
        kind: "manual",
        title: "Route durable operation state through the recipe receipt spine",
        requiresReview: true,
      }),
      expect.objectContaining({
        kind: "manual",
        title: "Link Tend state to recipe receipts and observations",
        requiresReview: true,
      }),
    ]))
  })

  it("normalizes ProgramFactRuntime query diagnostics into Trellis diagnostics", async () => {
    const loaded = makeTrellisArchitectureDiagnosticsFixture()
    const programDiagnostics = await Effect.runPromise(
      provideProgramFactRuntime(Effect.gen(function* programFactDiagnosticsFixture() {
        const runtime = yield* ProgramFactRuntime
        const diagnostics = yield* ProgramDiagnostics

        yield* runtime.materializeSchemaDescriptor(demoProgramFactDescriptor)
        yield* runtime.recordArtifact({
          artifactId: "demo:widget",
          schemaDescriptorId: "attune/project/demo",
          projectId: "demo",
          path: "packages/demo/src/generated/widget.ts",
          generatorId: "@attune/framework-nx:widget",
          expectedHash: "expected",
          actualHash: "actual",
          status: "stale",
        })

        return diagnostics
      })),
    )
    const diagnostics = collectTrellisDiagnostics(loaded, {
      programDiagnostics,
      programFactSourcePaths: ["packages/demo/src/recipes.ts"],
      programFactProjectionInputs: [{
        schemaDescriptorId: "attune/project/demo",
        projectId: "demo",
        sourcePath: "packages/demo/src/recipes.ts",
        observations: [],
        diagnosticRequirements: [{
          diagnosticRequirementId: "demo:project:property",
          schemaDescriptorId: "attune/project/demo",
          projectId: "demo",
          symbolId: "project",
          kind: "property",
          reason: "projection operation requires property observations",
        }],
        artifacts: [{
          artifactId: "demo:widget",
          schemaDescriptorId: "attune/project/demo",
          projectId: "demo",
          path: "packages/demo/src/generated/widget.ts",
          generatorId: "@attune/framework-nx:widget",
          expectedHash: "expected",
          actualHash: "actual",
          status: "stale",
        }],
      }],
    })
    const codes = diagnostics.map((diagnostic) => diagnostic.code)

    expect(codes).toEqual(expect.arrayContaining([
      "trellis/operation-missing-observation",
      "trellis/generated-artifact-stale",
    ]))
    expect(diagnostics.find((diagnostic) =>
      diagnostic.file === "packages/demo/src/recipes.ts"
    )?.tags).toContain("program-facts")
  })

  it("uses ProjectionRegistry Nx facts to suppress orphan target diagnostics", () => {
    const loaded = makeTrellisArchitectureDiagnosticsFixture()
    const unprojected = collectTrellisDiagnostics(loaded, {
      recipePackages: [],
      nxTargetProjections: [],
    })
    const projected = collectTrellisDiagnostics(loaded, {
      recipePackages: [],
      nxTargetProjections: [{
        projectionId: "framework.projection.nx-target",
        recipeId: "demo.check",
        projectId: "demo",
        targetName: "check",
        target: "demo:check",
        tier: "public",
        surface: "check",
        action: "check",
        evidence: [],
        metadata: {
          attune: {
            recipeId: "demo.check",
            projectionId: "framework.projection.nx-target",
            tier: "public",
            surface: "check",
            action: "check",
            evidence: [],
          },
        },
      }],
    })

    expect(unprojected.map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining([
      "trellis/orphan-public-nx-target",
      "trellis/target-missing-recipe-invocation",
    ]))
    expect(projected.filter((diagnostic) =>
      diagnostic.code === "trellis/orphan-public-nx-target" ||
      diagnostic.code === "trellis/target-missing-recipe-invocation"
    )).toHaveLength(0)
  })

  it("records command observations through the configured receipt store", () => {
    const fixture = makeFixture()
    const store = createInMemoryRecipeReceiptStore()
    const diagnostics = runDiagnosticsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      format: "json",
      receiptStore: store,
    }).output
    const fixes = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      format: "json",
      receiptStore: store,
    }).output
    const diff = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      fixId: fixes.fixes[0]!.fixId,
      mode: "diff",
      format: "json",
      receiptStore: store,
    }).output
    const applied = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      fixId: fixes.fixes[0]!.fixId,
      mode: "write",
      format: "json",
      receiptStore: store,
    }).output
    const check = runCheckCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      format: "json",
      receiptStore: store,
    }).output

    const snapshot = Effect.runSync(store.snapshot())
    const kinds = snapshot.observations.map((observation) => observation.observationKind)

    expect(diagnostics.metadata.evidenceMode).toBe("in-memory")
    expect(diff.applied).toBe(false)
    expect(applied.applied).toBe(true)
    expect(check.metadata.evidenceMode).toBe("in-memory")
    expect(kinds).toEqual(expect.arrayContaining([
      "trellis-language-service.diagnostic-run-summary",
      "trellis-language-service.fix-list-summary",
      "trellis-language-service.upstream-quickfix-application",
      "trellis-language-service.check-summary",
    ]))
    expect(kinds.filter((kind) => kind === "trellis-language-service.apply-diff-summary")).toHaveLength(0)
  })

  it("normalizes protocol repair actions and recipe repairs into Trellis fixes", () => {
    const nxFix = trellisFixFromProgramRepairAction({
      diagnosticId: "diag_program",
      affectedFiles: ["packages/demo/src/index.ts"],
      action: {
        id: "repair-demo",
        title: "Repair demo",
        kind: "nx-check",
        target: "demo:repair",
      },
    })
    const internalGenerator = trellisFixFromProgramRepairAction({
      diagnosticId: "diag_program_generator",
      action: {
        id: "internal-generator",
        title: "Run internal generator",
        kind: "nx-generator",
        options: {
          internalGenerator: "@attune/nx:private-generator",
        },
      },
    })
    const generatedSourceEdit = trellisFixFromRecipeRepair({
      diagnosticId: "diag_generated",
      repair: {
        repairId: "recipe-repair:generated",
        recipeId: "demo.emit-generated",
        title: "Rewrite generated output",
        kind: "source-edit",
        allowedFiles: ["packages/demo/src/generated/widget.ts"],
        risk: "safe",
        evidenceRequirements: [],
        payload: {
          file: "packages/demo/src/generated/widget.ts",
          start: 0,
          end: 0,
          newText: "// generated\n",
        },
      },
    })
    const sourceEdit = trellisFixFromRecipeRepair({
      diagnosticId: "diag_source",
      repair: {
        repairId: "recipe-repair:source",
        recipeId: "demo.repair-source",
        title: "Patch source",
        kind: "source-edit",
        allowedFiles: ["packages/demo/src/index.ts"],
        risk: "safe",
        evidenceRequirements: [],
        payload: {
          file: "packages/demo/src/index.ts",
          start: 0,
          end: 0,
          newText: "export {}\n",
        },
      },
    })

    expect(nxFix).toMatchObject({
      kind: "nx-repair",
      safe: true,
      requiresReview: false,
      command: { run: "nx run demo:repair" },
    })
    expect(internalGenerator).toMatchObject({
      kind: "manual",
      safe: false,
      requiresReview: true,
      canApply: false,
    })
    expect(generatedSourceEdit).toMatchObject({
      kind: "manual",
      safe: false,
      requiresReview: true,
    })
    expect(sourceEdit).toMatchObject({
      kind: "text-edit",
      safe: true,
      canApply: true,
      edits: [{
        file: "packages/demo/src/index.ts",
        start: 0,
        end: 0,
        newText: "export {}\n",
      }],
    })
  })

  it("keeps representative JSON output stable", () => {
    const fixture = makeFixture()
    const diagnostics = runDiagnosticsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      includeFixes: true,
      format: "json",
    }).output
    const fixes = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      format: "json",
    }).output
    const apply = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      fixId: fixes.fixes[0]!.fixId,
      mode: "diff",
      format: "json",
    }).output
    const check = runCheckCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      failOn: "warning",
      format: "json",
    }).output

    expect(normalizeForSnapshot({
      diagnostics,
      fixes,
      apply,
      check,
    })).toMatchInlineSnapshot(`
      {
        "apply": {
          "affectedFiles": [
            "src/floating.ts",
          ],
          "applied": false,
          "command": "apply",
          "diff": "--- a/src/floating.ts
      +++ b/src/floating.ts
      @@
      -import { Effect } from "effect"
      -
      -export const demo = () => {
      -  Effect.succeed(1)
      -}
      -
      +import { Effect } from "effect"
      +
      +export const demo = () => {
      +  void Effect.succeed(1)
      +}
      +",
          "fixId": "fix_snapshot",
          "followup": {
            "recommendedCommand": "trellis-ls diagnostics --project tsconfig.json --format json",
          },
          "metadata": {
            "command": "apply",
            "evidenceMode": "disabled",
            "format": "json",
            "project": "tsconfig.json",
            "workspaceRoot": "<workspace>",
          },
          "mode": "diff",
          "project": "tsconfig.json",
          "refused": false,
          "schemaVersion": 1,
          "workspaceRoot": "<workspace>",
        },
        "check": {
          "blocking": true,
          "command": "check",
          "diagnosticCodes": [
            "effect/floatingEffect",
          ],
          "metadata": {
            "command": "check",
            "evidenceMode": "disabled",
            "failOn": "warning",
            "format": "json",
            "project": "tsconfig.json",
            "workspaceRoot": "<workspace>",
          },
          "project": "tsconfig.json",
          "schemaVersion": 1,
          "summary": {
            "errorCount": 0,
            "messageCount": 0,
            "suggestionCount": 0,
            "warningCount": 1,
          },
          "workspaceRoot": "<workspace>",
        },
        "diagnostics": {
          "command": "diagnostics",
          "diagnostics": [
            {
              "code": "effect/floatingEffect",
              "file": "src/floating.ts",
              "id": "diag_snapshot",
              "message": "Effect expression is not returned, yielded, awaited, or explicitly discarded.",
              "repairIds": [
                "fix_snapshot",
              ],
              "severity": "warning",
              "source": "effect",
              "span": {
                "end": 80,
                "endColumn": 20,
                "endLine": 4,
                "start": 63,
                "startColumn": 3,
                "startLine": 4,
              },
              "tags": [
                "effect",
                "upstream-effect",
                "LSP.getSemanticDiagnosticsWithCodeFixes",
                "quickfix",
              ],
            },
          ],
          "fixes": [
            {
              "affectedFiles": [
                "src/floating.ts",
              ],
              "canApply": true,
              "diagnosticId": "diag_snapshot",
              "edits": [
                {
                  "end": 63,
                  "file": "<workspace>/src/floating.ts",
                  "newText": "void ",
                  "start": 63,
                },
              ],
              "fixId": "fix_snapshot",
              "kind": "text-edit",
              "preview": "Adds \`void \` before the Effect expression.",
              "requiresReview": false,
              "safe": true,
              "title": "Mark floating Effect as intentionally discarded",
            },
          ],
          "metadata": {
            "command": "diagnostics",
            "evidenceMode": "disabled",
            "format": "json",
            "project": "tsconfig.json",
            "source": "effect",
            "workspaceRoot": "<workspace>",
          },
          "project": "tsconfig.json",
          "schemaVersion": 1,
          "summary": {
            "errorCount": 0,
            "messageCount": 0,
            "suggestionCount": 0,
            "warningCount": 1,
          },
          "workspaceRoot": "<workspace>",
        },
        "fixes": {
          "command": "fixes",
          "fixes": [
            {
              "affectedFiles": [
                "src/floating.ts",
              ],
              "canApply": true,
              "diagnosticId": "diag_snapshot",
              "edits": [
                {
                  "end": 63,
                  "file": "<workspace>/src/floating.ts",
                  "newText": "void ",
                  "start": 63,
                },
              ],
              "fixId": "fix_snapshot",
              "kind": "text-edit",
              "preview": "Adds \`void \` before the Effect expression.",
              "requiresReview": false,
              "safe": true,
              "title": "Mark floating Effect as intentionally discarded",
            },
          ],
          "metadata": {
            "command": "fixes",
            "evidenceMode": "disabled",
            "format": "json",
            "project": "tsconfig.json",
            "workspaceRoot": "<workspace>",
          },
          "project": "tsconfig.json",
          "schemaVersion": 1,
          "workspaceRoot": "<workspace>",
        },
      }
    `)
  })

  it("does not import upstream distribution internals or create a private ledger", () => {
    const sourceFiles = collectSourceFiles(path.join(packageRoot, "src"))
    const sourceText = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n")

    expect(sourceText).not.toContain("@effect/language-service/dist")
    expect(sourceText).not.toMatch(/CREATE\s+SCHEMA\s+(?:language_service|trellis_language_service)/iu)
    expect(sourceText).not.toContain("language_service_ledger")
  })
})

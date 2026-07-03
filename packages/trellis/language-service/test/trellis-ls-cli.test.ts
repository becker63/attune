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
  runFastPathCommand,
  runFixesCommand,
  runJudgeCommand,
  runPacketsCommand,
  trellisFixFromProgramRepairAction,
  trellisFixFromRecipeRepair,
  TrellisLsPacketsOutputSchema,
  TrellisLsApplyOutputSchema,
  TrellisLsCheckOutputSchema,
  TrellisLsDiagnosticsOutputSchema,
  TrellisLsFastPathOutputSchema,
  TrellisLsFixesOutputSchema,
  TrellisLsJudgeOutputSchema,
  collectUpstreamEffectDiagnosticInventory,
  upstreamEffectSource,
} from "../src/index.js"
import { analyzeFileAccounting } from "../src/file-accounting.js"
import { analyzeSourceExpression } from "../src/source-expression.js"
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

const makeEffectProfilesFixture = (): {
  readonly root: string
  readonly project: string
  readonly file: string
} => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-effect-profiles-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.symlinkSync(path.join(packageRoot, "node_modules"), path.join(root, "node_modules"), "dir")
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  const file = path.join(root, "src", "effect-rules.ts")
  fs.writeFileSync(file, [
    "import { Effect } from \"effect\"",
    "import { pipe } from \"effect/Function\"",
    "",
    "declare const process: { env: { PORT?: string } }",
    "",
    "export const demo = () => {",
    "  Effect.succeed(1)",
    "  return Effect.succeed(undefined)",
    "}",
    "",
    "export const styled = pipe(1)",
    "console.log(\"preview\")",
    "export const now = Date.now()",
    "export const port = process.env.PORT",
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
  readonly scriptFile: string
} => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-script-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "scripts"), { recursive: true })
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  const scriptFile = path.join(root, "packages", "demo", "scripts", "legacy.ts")
  fs.writeFileSync(scriptFile, "export {}\n")
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
  return { root, project, scriptFile }
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
    "const defineAttuneLegacyPackageFacts = (value: unknown) => value",
    "export const LegacyPackageRuntimeRoots = {}",
    "export const LegacyPackageFacts = defineAttuneLegacyPackageFacts({ id: \"framework-language-service\" })",
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

const makeBroadFileAccountingFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-file-accounting-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true })
  fs.mkdirSync(path.join(root, "packages", "demo", "src", "feature"), { recursive: true })
  const recipes = path.join(root, "packages", "demo", "src", "recipes.ts")
  const cli = path.join(root, "packages", "demo", "src", "cli.ts")
  const regular = path.join(root, "packages", "demo", "src", "regular.ts")
  const focused = path.join(root, "packages", "demo", "src", "feature", "owned.ts")
  fs.writeFileSync(cli, "export const run = () => undefined\n")
  fs.writeFileSync(regular, "export const value = 1\n")
  fs.writeFileSync(focused, "export const owned = 1\n")
  fs.writeFileSync(recipes, [
    "const defineRecipe = (recipe: unknown) => recipe",
    "const defineRecipePackage = (recipePackage: unknown) => recipePackage",
    "export const DemoRecipes = [",
    "  defineRecipe({",
    "    id: \"demo.generic\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    allowedFiles: [\"packages/demo/src/**\"],",
    "  }),",
    "  defineRecipe({",
    "    id: \"demo.feature\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    allowedFiles: [\"packages/demo/src/feature/**\"],",
    "  }),",
    "]",
    "export const DemoRecipePackage = defineRecipePackage({",
    "  packageId: \"demo\",",
    "  sourceRoot: \"packages/demo/src\",",
    "  recipes: DemoRecipes,",
    "  ownership: [{",
    "    id: \"broad-source\",",
    "    files: [\"packages/demo/src/**\"],",
    "    recipeIds: [\"demo.generic\"],",
    "  }],",
    "})",
    "",
  ].join("\n"))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [recipes, cli, regular, focused],
  }
}

const makeGeneratedFileAccountingFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-generated-accounting-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src", "generated"), { recursive: true })
  const recipes = path.join(root, "packages", "demo", "src", "recipes.ts")
  const generated = path.join(root, "packages", "demo", "src", "generated", "widget.ts")
  fs.writeFileSync(generated, [
    "// @generated by recipe demo.generate-widget",
    "export const widget = 1",
    "",
  ].join("\n"))
  fs.writeFileSync(recipes, [
    "const defineProjectionRecipe = (recipe: unknown) => recipe",
    "const defineRecipePackage = (recipePackage: unknown) => recipePackage",
    "export const DemoRecipes = [",
    "  defineProjectionRecipe({",
    "    id: \"demo.generate-widget\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    outputs: [\"packages/demo/src/generated/widget.ts\"],",
    "  }),",
    "]",
    "export const DemoRecipePackage = defineRecipePackage({",
    "  packageId: \"demo\",",
    "  sourceRoot: \"packages/demo/src\",",
    "  recipes: DemoRecipes,",
    "})",
    "",
  ].join("\n"))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [recipes, generated],
  }
}

const makeDeletedTrackedFileAccountingFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-deleted-tracked-accounting-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true })
  const recipes = path.join(root, "packages", "demo", "src", "recipes.ts")
  const deleted = path.join(root, "packages", "demo", "src", "deleted.ts")
  fs.writeFileSync(recipes, "export const DemoRecipes = []\n")
  fs.writeFileSync(deleted, "export const deleted = 1\n")
  childProcess.execFileSync("git", ["init"], { cwd: root, stdio: "ignore" })
  childProcess.execFileSync("git", [
    "add",
    "packages/demo/src/recipes.ts",
    "packages/demo/src/deleted.ts",
  ], { cwd: root, stdio: "ignore" })
  fs.unlinkSync(deleted)
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [recipes],
  }
}

const makeAmbiguousFileAccountingFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-ambiguous-accounting-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src", "feature"), { recursive: true })
  const recipes = path.join(root, "packages", "demo", "src", "recipes.ts")
  const owned = path.join(root, "packages", "demo", "src", "feature", "owned.ts")
  fs.writeFileSync(owned, "export const owned = 1\n")
  fs.writeFileSync(recipes, [
    "const defineRecipe = (recipe: unknown) => recipe",
    "const defineRecipePackage = (recipePackage: unknown) => recipePackage",
    "export const DemoRecipes = [",
    "  defineRecipe({",
    "    id: \"demo.feature-a\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    allowedFiles: [\"packages/demo/src/feature/*.ts\"],",
    "  }),",
    "  defineRecipe({",
    "    id: \"demo.feature-b\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    allowedFiles: [\"packages/demo/src/feature/owned.*\"],",
    "  }),",
    "]",
    "export const DemoRecipePackage = defineRecipePackage({",
    "  packageId: \"demo\",",
    "  sourceRoot: \"packages/demo/src\",",
    "  recipes: DemoRecipes,",
    "})",
    "",
  ].join("\n"))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [recipes, owned],
  }
}

const makeWorkspaceRoleFileAccountingFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-workspace-role-accounting-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true })
  fs.mkdirSync(path.join(root, "docs"), { recursive: true })
  fs.mkdirSync(path.join(root, "openspec", "changes", "demo"), { recursive: true })
  fs.mkdirSync(path.join(root, "nix"), { recursive: true })
  const recipes = path.join(root, "packages", "demo", "src", "recipes.ts")
  const doc = path.join(root, "docs", "README.md")
  const spec = path.join(root, "openspec", "changes", "demo", "proposal.md")
  const nix = path.join(root, "nix", "demo.nix")
  fs.writeFileSync(doc, "# Demo\n")
  fs.writeFileSync(spec, "# Proposal\n")
  fs.writeFileSync(nix, "{ pkgs }: pkgs.hello\n")
  fs.writeFileSync(recipes, [
    "const defineDocumentationRecipe = (recipe: unknown) => recipe",
    "const defineOpenSpecChangeRecipe = (recipe: unknown) => recipe",
    "const defineToolchainRecipe = (recipe: unknown) => recipe",
    "const defineRecipePackage = (recipePackage: unknown) => recipePackage",
    "export const DemoRecipes = [",
    "  defineDocumentationRecipe({",
    "    id: \"demo.docs\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    allowedFiles: [\"docs/**\"],",
    "  }),",
    "  defineOpenSpecChangeRecipe({",
    "    id: \"demo.openspec\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    allowedFiles: [\"openspec/**\"],",
    "  }),",
    "  defineToolchainRecipe({",
    "    id: \"demo.nix\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    allowedFiles: [\"nix/**\"],",
    "  }),",
    "]",
    "export const DemoRecipePackage = defineRecipePackage({",
    "  packageId: \"demo\",",
    "  sourceRoot: \"packages/demo/src\",",
    "  recipes: DemoRecipes,",
    "})",
    "",
  ].join("\n"))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [recipes, doc, spec, nix],
  }
}

const makeSourceExpressionFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-source-expression-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true })
  const recipes = path.join(root, "packages", "demo", "src", "recipes.ts")
  const pure = path.join(root, "packages", "demo", "src", "pure.ts")
  const sideEffect = path.join(root, "packages", "demo", "src", "side-effect.ts")
  const orphanPure = path.join(root, "packages", "demo", "src", "orphan-pure.ts")
  fs.writeFileSync(pure, "export const render = () => ({ generatedFiles: [], contentHash: \"hash\" })\n")
  fs.writeFileSync(sideEffect, "import * as fs from \"node:fs\"\nexport const read = () => fs.readFileSync(\"demo\", \"utf8\")\n")
  fs.writeFileSync(orphanPure, "export const value = 1\n")
  fs.writeFileSync(recipes, [
    "import { Effect, Layer, Schema } from \"effect\"",
    "import { render } from \"./pure.js\"",
    "const defineRecipe = (recipe: unknown) => recipe",
    "const defineProjectionRecipe = (recipe: unknown) => recipe",
    "const defineAlchemyResource = (resource: unknown) => resource",
    "const defineRecipeHandler = (handler: unknown) => handler",
    "const defineRecipeLayer = (layer: unknown) => layer",
    "const PackageRoot = defineAlchemyResource({",
    "  id: \"demo.package-root\",",
    "  kind: \"directory\",",
    "  alchemyType: \"attune:resource:Directory\",",
    "  modes: [\"read\"],",
    "  consumedBy: [\"demo.typed\"],",
    "})",
    "const Generated = defineAlchemyResource({",
    "  id: \"demo.generated\",",
    "  kind: \"generated-directory\",",
    "  alchemyType: \"attune:resource:GeneratedDirectory\",",
    "  modes: [\"project\", \"read\"],",
    "  producedBy: [\"demo.typed\"],",
    "})",
    "const DemoLayer = defineRecipeLayer({",
    "  id: \"demo.layer\",",
    "  sourcePath: \"packages/demo/src/recipes.ts\",",
    "  exportName: \"DemoLayer\",",
    "  layer: Layer.empty,",
    "  provides: [],",
    "})",
    "export const stringOnly = defineRecipe({",
    "  id: \"demo.string-only\",",
    "  inputSchema: Schema.String,",
    "  outputSchema: Schema.String,",
    "  allowedFiles: [\"packages/demo/src/orphan-pure.ts\"],",
    "})",
    "export const typed = defineProjectionRecipe({",
    "  id: \"demo.typed\",",
    "  inputSchema: Schema.String,",
    "  outputSchema: Schema.Struct({ generatedFiles: Schema.Array(Schema.String), contentHash: Schema.String }),",
    "  io: {",
    "    inputSchema: Schema.String,",
    "    outputSchema: Schema.Struct({ generatedFiles: Schema.Array(Schema.String), contentHash: Schema.String }),",
    "    inputResources: [PackageRoot],",
    "    outputResources: [Generated],",
    "  },",
    "  handler: defineRecipeHandler({",
    "    id: \"demo.typed.handler\",",
    "    recipeId: \"demo.typed\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    exportName: \"typedHandler\",",
    "    layer: DemoLayer,",
    "    handler: () => Effect.succeed(render()),",
    "  }),",
    "})",
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
    include: ["packages/**/*.ts"],
  }, null, 2))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [recipes, pure, sideEffect, orphanPure],
  }
}

const makeUntrackedGeneratedSourceExpressionFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-source-expression-generated-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src", "generated"), { recursive: true })
  const source = path.join(root, "packages", "demo", "src", "index.ts")
  const generated = path.join(root, "packages", "demo", "src", "generated", "widget.ts")
  fs.writeFileSync(source, "export const value = 1\n")
  fs.writeFileSync(generated, [
    "// @generated by recipe demo.generated-widget",
    "import { Effect } from \"effect\"",
    "export const generatedWidget = Effect.succeed(1)",
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
      noEmit: true,
    },
    include: ["packages/**/*.ts"],
  }, null, 2))
  childProcess.execFileSync("git", ["init"], { cwd: root, stdio: "ignore" })
  childProcess.execFileSync("git", ["add", "package.json", "pnpm-workspace.yaml", "tsconfig.json", "packages/demo/src/index.ts"], {
    cwd: root,
    stdio: "ignore",
  })
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [source, generated],
  }
}

const makeAggregateOnlyLocalRecipeFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-local-expression-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true })
  const recipes = path.join(root, "packages", "demo", "src", "recipes.ts")
  const worker = path.join(root, "packages", "demo", "src", "worker.ts")
  fs.writeFileSync(worker, [
    "export interface WorkerInput { readonly value: string }",
    "export interface WorkerOutput { readonly value: string }",
    "export const renderWorker = (input: WorkerInput): WorkerOutput => ({",
    "  value: input.value.toUpperCase(),",
    "})",
    "",
  ].join("\n"))
  fs.writeFileSync(recipes, [
    "import { Effect, Schema } from \"effect\"",
    "import { renderWorker } from \"./worker.js\"",
    "const defineProjectionRecipe = (recipe: unknown) => recipe",
    "const defineAlchemyResource = (resource: unknown) => resource",
    "const defineRecipeHandler = (handler: unknown) => handler",
    "const WorkerInput = Schema.Struct({ value: Schema.String })",
    "const WorkerOutput = Schema.Struct({ value: Schema.String })",
    "const Request = defineAlchemyResource({",
    "  id: \"demo.request\",",
    "  kind: \"configuration\",",
    "  alchemyType: \"attune:resource:Configuration\",",
    "  modes: [\"read\"],",
    "  consumedBy: [\"demo.source\"],",
    "})",
    "const Intermediate = defineAlchemyResource({",
    "  id: \"demo.intermediate\",",
    "  kind: \"report\",",
    "  alchemyType: \"attune:resource:Report\",",
    "  modes: [\"project\", \"read\"],",
    "  producedBy: [\"demo.source\"],",
    "  consumedBy: [\"demo.worker\"],",
    "})",
    "const Result = defineAlchemyResource({",
    "  id: \"demo.result\",",
    "  kind: \"report\",",
    "  alchemyType: \"attune:resource:Report\",",
    "  modes: [\"project\", \"read\"],",
    "  producedBy: [\"demo.worker\"],",
    "})",
    "export const sourceRecipe = defineProjectionRecipe({",
    "  id: \"demo.source\",",
    "  inputSchema: WorkerInput,",
    "  outputSchema: WorkerOutput,",
    "  sourcePath: \"packages/demo/src/recipes.ts\",",
    "  io: {",
    "    inputSchema: WorkerInput,",
    "    outputSchema: WorkerOutput,",
    "    inputResources: [Request],",
    "    outputResources: [Intermediate],",
    "  },",
    "  handler: defineRecipeHandler({",
    "    id: \"demo.source.handler\",",
    "    recipeId: \"demo.source\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    exportName: \"sourceRecipe\",",
    "    handler: (input: typeof WorkerInput.Type) => Effect.succeed(renderWorker(input)),",
    "  }),",
    "  alchemyDag: [{",
    "    fromRecipeId: \"demo.source\",",
    "    toRecipeId: \"demo.worker\",",
    "    resource: Intermediate,",
    "    kind: \"projects\",",
    "    modes: [\"project\"],",
    "    validationTargets: [\"demo:test\"],",
    "  }],",
    "})",
    "export const workerRecipe = defineProjectionRecipe({",
    "  id: \"demo.worker\",",
    "  inputSchema: WorkerInput,",
    "  outputSchema: WorkerOutput,",
    "  sourcePath: \"packages/demo/src/recipes.ts\",",
    "  io: {",
    "    inputSchema: WorkerInput,",
    "    outputSchema: WorkerOutput,",
    "    inputResources: [Intermediate],",
    "    outputResources: [Result],",
    "  },",
    "  handler: defineRecipeHandler({",
    "    id: \"demo.worker.handler\",",
    "    recipeId: \"demo.worker\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    exportName: \"workerRecipe\",",
    "    handler: (input: typeof WorkerInput.Type) => Effect.succeed(renderWorker(input)),",
    "  }),",
    "})",
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
      noEmit: true,
    },
    include: ["packages/**/*.ts"],
  }, null, 2))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [recipes, worker],
  }
}

const makeNestedRecipeDagFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-nested-dag-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true })
  const recipes = path.join(root, "packages", "demo", "src", "recipes.ts")
  fs.writeFileSync(recipes, [
    "import { Effect, Schema } from \"effect\"",
    "const defineManagedRecipe = (recipe: unknown) => recipe",
    "const defineProjectionRecipe = (recipe: unknown) => recipe",
    "const defineAlchemyResource = (resource: unknown) => resource",
    "const defineRecipeHandler = (handler: unknown) => handler",
    "const DemoInput = Schema.Struct({ value: Schema.String })",
    "const DemoOutput = Schema.Struct({ value: Schema.String })",
    "const MissingFlow = { id: \"demo.missing-flow\" }",
    "const Flow = defineAlchemyResource({",
    "  id: \"demo.flow\",",
    "  kind: \"report\",",
    "  alchemyType: \"attune:resource:Report\",",
    "  ownerRecipeId: \"demo.parent\",",
    "  producedBy: [\"demo.parent\"],",
    "  consumedBy: [\"demo.cycle\"],",
    "  addressSchema: DemoInput,",
    "  stateSchema: DemoOutput,",
    "  modes: [\"project\", \"read\"],",
    "})",
    "const StaticKubernetes = defineAlchemyResource({",
    "  id: \"demo.static-kubernetes\",",
    "  kind: \"kubernetes-object-set\",",
    "  alchemyType: \"attune:resource:KubernetesObjectSet\",",
    "  ownerRecipeId: \"demo.managed\",",
    "  producedBy: [\"demo.managed\"],",
    "  consumedBy: [\"demo.managed\"],",
    "  addressSchema: DemoInput,",
    "  stateSchema: DemoOutput,",
    "  modes: [\"read\", \"write\"],",
    "})",
    "export const parentRecipe = defineProjectionRecipe({",
    "  id: \"demo.parent\",",
    "  capability: \"manual-dag-group\",",
    "  inputSchema: DemoInput,",
    "  outputSchema: DemoOutput,",
    "  sourcePath: \"packages/demo/src/recipes.ts\",",
    "  dependencies: [{ recipeId: \"demo.child\" }],",
    "  io: {",
    "    inputSchema: DemoInput,",
    "    outputSchema: DemoOutput,",
    "    inputResources: [Flow],",
    "    outputResources: [Flow],",
    "  },",
    "  handler: defineRecipeHandler({",
    "    id: \"demo.parent.handler\",",
    "    recipeId: \"demo.parent\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    exportName: \"parentRecipe\",",
    "    handler: () => Effect.succeed({ value: \"parent\" }),",
    "  }),",
    "  alchemyDag: [{",
    "    fromRecipeId: \"demo.parent\",",
    "    toRecipeId: \"demo.cycle\",",
    "    resource: Flow,",
    "    kind: \"projects\",",
    "    modes: [\"project\"],",
    "  }, {",
    "    fromRecipeId: \"demo.cycle\",",
    "    toRecipeId: \"demo.parent\",",
    "    resource: Flow,",
    "    kind: \"observes\",",
    "    modes: [\"observe\"],",
    "  }, {",
    "    fromRecipeId: \"demo.parent\",",
    "    toRecipeId: \"demo.untyped\",",
    "    resource: MissingFlow,",
    "    kind: \"validates\",",
    "    modes: [\"check\"],",
    "  }],",
    "})",
    "export const childRecipe = defineProjectionRecipe({",
    "  id: \"demo.child\",",
    "  inputSchema: DemoInput,",
    "  outputSchema: DemoOutput,",
    "  sourcePath: \"packages/demo/src/recipes.ts\",",
    "  io: {",
    "    inputSchema: DemoInput,",
    "    outputSchema: DemoOutput,",
    "    inputResources: [Flow],",
    "    outputResources: [Flow],",
    "  },",
    "  handler: defineRecipeHandler({",
    "    id: \"demo.child.handler\",",
    "    recipeId: \"demo.child\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    exportName: \"childRecipe\",",
    "    handler: () => Effect.succeed({ value: \"child\" }),",
    "  }),",
    "})",
    "export const cycleRecipe = defineProjectionRecipe({",
    "  id: \"demo.cycle\",",
    "  inputSchema: DemoInput,",
    "  outputSchema: DemoOutput,",
    "  sourcePath: \"packages/demo/src/recipes.ts\",",
    "  io: {",
    "    inputSchema: DemoInput,",
    "    outputSchema: DemoOutput,",
    "    inputResources: [Flow],",
    "    outputResources: [Flow],",
    "  },",
    "  handler: defineRecipeHandler({",
    "    id: \"demo.cycle.handler\",",
    "    recipeId: \"demo.cycle\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    exportName: \"cycleRecipe\",",
    "    handler: () => Effect.succeed({ value: \"cycle\" }),",
    "  }),",
    "})",
    "export const managedRecipe = defineManagedRecipe({",
    "  id: \"demo.managed\",",
    "  inputSchema: DemoInput,",
    "  outputSchema: DemoOutput,",
    "  sourcePath: \"packages/demo/src/recipes.ts\",",
    "  io: {",
    "    inputSchema: DemoInput,",
    "    outputSchema: DemoOutput,",
    "    inputResources: [StaticKubernetes],",
    "    outputResources: [StaticKubernetes],",
    "  },",
    "  alchemy: { resource: StaticKubernetes },",
    "  lifecycle: { read: () => Effect.succeed({ value: \"managed\" }) },",
    "  handler: defineRecipeHandler({",
    "    id: \"demo.managed.handler\",",
    "    recipeId: \"demo.managed\",",
    "    sourcePath: \"packages/demo/src/recipes.ts\",",
    "    exportName: \"managedRecipe\",",
    "    handler: () => Effect.succeed({ value: \"managed\" }),",
    "  }),",
    "})",
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
      noEmit: true,
    },
    include: ["packages/**/*.ts"],
  }, null, 2))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [recipes],
  }
}

const makeImportedRecipeIdDagFixture = (): LoadedProject => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-ls-imported-dag-"))
  fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages: []\n")
  fs.writeFileSync(path.join(root, "package.json"), "{\"type\":\"module\"}\n")
  fs.mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true })
  const parent = path.join(root, "packages", "demo", "src", "parent.ts")
  const child = path.join(root, "packages", "demo", "src", "child.ts")
  fs.writeFileSync(child, [
    "import { Effect, Schema } from \"effect\"",
    "const defineProjectionRecipe = (recipe: unknown) => recipe",
    "const defineAlchemyResource = (resource: unknown) => resource",
    "const defineRecipeHandler = (handler: unknown) => handler",
    "export const ChildRecipeId = \"demo.child\" as const",
    "const ChildSourcePath = \"packages/demo/src/child.ts\" as const",
    "const ChildInput = Schema.Struct({ value: Schema.String })",
    "const ChildOutput = Schema.Struct({ value: Schema.String })",
    "const ChildInputResource = defineAlchemyResource({",
    "  id: \"demo.child.input\",",
    "  kind: \"configuration\",",
    "  ownerRecipeId: ChildRecipeId,",
    "  consumedBy: [ChildRecipeId],",
    "  addressSchema: ChildInput,",
    "  stateSchema: ChildOutput,",
    "  modes: [\"read\"],",
    "})",
    "export const ChildOutputResource = defineAlchemyResource({",
    "  id: \"demo.child.output\",",
    "  kind: \"report\",",
    "  ownerRecipeId: ChildRecipeId,",
    "  producedBy: [ChildRecipeId],",
    "  addressSchema: ChildInput,",
    "  stateSchema: ChildOutput,",
    "  modes: [\"project\", \"read\"],",
    "})",
    "const ChildHandler = defineRecipeHandler({",
    "  id: \"demo.child.handler\",",
    "  recipeId: ChildRecipeId,",
    "  sourcePath: ChildSourcePath,",
    "  handler: () => Effect.succeed({ value: \"child\" }),",
    "})",
    "export const ChildRecipe = defineProjectionRecipe({",
    "  id: ChildRecipeId,",
    "  inputSchema: ChildInput,",
    "  outputSchema: ChildOutput,",
    "  sourcePath: ChildSourcePath,",
    "  io: {",
    "    inputSchema: ChildInput,",
    "    outputSchema: ChildOutput,",
    "    inputResources: [ChildInputResource],",
    "    outputResources: [ChildOutputResource],",
    "  },",
    "  handler: ChildHandler,",
    "})",
    "",
  ].join("\n"))
  fs.writeFileSync(parent, [
    "import { Effect, Schema } from \"effect\"",
    "import { ChildOutputResource, ChildRecipeId } from \"./child.js\"",
    "const defineProjectionRecipe = (recipe: unknown) => recipe",
    "const defineAlchemyResource = (resource: unknown) => resource",
    "const defineRecipeHandler = (handler: unknown) => handler",
    "const ParentRecipeId = \"demo.parent\" as const",
    "const ParentSourcePath = \"packages/demo/src/parent.ts\" as const",
    "const ParentInput = Schema.Struct({ value: Schema.String })",
    "const ParentOutput = Schema.Struct({ value: Schema.String })",
    "const ParentInputResource = defineAlchemyResource({",
    "  id: \"demo.parent.input\",",
    "  kind: \"configuration\",",
    "  ownerRecipeId: ParentRecipeId,",
    "  consumedBy: [ParentRecipeId],",
    "  addressSchema: ParentInput,",
    "  stateSchema: ParentOutput,",
    "  modes: [\"read\"],",
    "})",
    "const ParentHandler = defineRecipeHandler({",
    "  id: \"demo.parent.handler\",",
    "  recipeId: ParentRecipeId,",
    "  sourcePath: ParentSourcePath,",
    "  handler: () => Effect.succeed({ value: \"parent\" }),",
    "})",
    "export const ParentRecipe = defineProjectionRecipe({",
    "  id: ParentRecipeId,",
    "  inputSchema: ParentInput,",
    "  outputSchema: ParentOutput,",
    "  sourcePath: ParentSourcePath,",
    "  dependencies: [{ recipeId: ChildRecipeId }],",
    "  io: {",
    "    inputSchema: ParentInput,",
    "    outputSchema: ParentOutput,",
    "    inputResources: [ParentInputResource],",
    "    outputResources: [ChildOutputResource],",
    "  },",
    "  handler: ParentHandler,",
    "  alchemyDag: [{",
    "    fromRecipeId: ParentRecipeId,",
    "    toRecipeId: ChildRecipeId,",
    "    resource: ChildOutputResource,",
    "    kind: \"projects\",",
    "    modes: [\"project\"],",
    "  }],",
    "})",
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
      noEmit: true,
    },
    include: ["packages/**/*.ts"],
  }, null, 2))
  return {
    workspaceRoot: root,
    workspacePath: root,
    fileNames: [parent, child],
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
    "export interface BenchmarkTargetDiagnosticPacket { packetId: string }",
    "export const hiddenJudge = { finalJudge: true }",
    "export const targetDiagnosticPacketFromSelectedPackets = () => ({ packetId: \"p1\" })",
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
      .replace(/\/tmp\/(?:nix-shell\.[^/\s]+\/)?trellis-ls-[^"/\s]+/gu, "<workspace>")
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
    expect(result.stdout).toContain("trellis-ls packets")
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

  it("normalizes the vendored upstream Effect diagnostic inventory", () => {
    const inventory = collectUpstreamEffectDiagnosticInventory()

    expect(inventory.ruleCount).toBeGreaterThan(70)
    expect(inventory.groupCounts).toMatchObject({
      correctness: expect.any(Number),
      effectNative: expect.any(Number),
      style: expect.any(Number),
    })
    expect(inventory.severityCounts).toMatchObject({
      error: expect.any(Number),
      warning: expect.any(Number),
      off: expect.any(Number),
    })
    expect(inventory.fixabilityCounts).toMatchObject({
      fixable: expect.any(Number),
      manual: expect.any(Number),
    })
    expect(inventory.supportedEffectVersions).toEqual(expect.arrayContaining(["v3", "v4"]))
  })

  it("selects staged Effect profiles and emits multiple upstream Effect rules", () => {
    const fixture = makeEffectProfilesFixture()
    const codesFor = (profile: NonNullable<Parameters<typeof runDiagnosticsCommand>[0]["profile"]>) =>
      runDiagnosticsCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        source: "effect",
        profile,
        format: "json",
      }).output.diagnostics.map((diagnostic) => diagnostic.code)

    expect(codesFor("effect-correctness")).toEqual(expect.arrayContaining([
      "effect/floatingEffect",
    ]))
    expect(codesFor("effect-autofix-safe")).toEqual(expect.arrayContaining([
      "effect/effectSucceedWithVoid",
      "effect/unnecessaryPipe",
    ]))
    expect(codesFor("effect-style-autofix")).toEqual(expect.arrayContaining([
      "effect/effectSucceedWithVoid",
      "effect/unnecessaryPipe",
    ]))
    expect(codesFor("effect-native-inventory")).toEqual(expect.arrayContaining([
      "effect/globalConsole",
      "effect/globalDate",
      "effect/processEnv",
    ]))

    const full = codesFor("effect-full-inventory")
    expect(full).toEqual(expect.arrayContaining([
      "effect/floatingEffect",
      "effect/effectSucceedWithVoid",
      "effect/unnecessaryPipe",
      "effect/globalConsole",
    ]))

    const diagnostics = runDiagnosticsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-full-inventory",
      format: "json",
    }).output.diagnostics
    expect(diagnostics[0]?.tags).toEqual(expect.arrayContaining([
      expect.stringMatching(/^effect-group:/u),
      expect.stringMatching(/^effect-supported:/u),
    ]))
  })

  it("projects deterministic Effect diagnostic packets with validation ladders", () => {
    const fixture = makeEffectProfilesFixture()
    const first = Schema.decodeUnknownSync(TrellisLsPacketsOutputSchema)(
      runPacketsCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        source: "effect",
        profile: "effect-autofix-safe",
        format: "json",
      }).output,
    )
    const second = runPacketsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-autofix-safe",
      format: "json",
    }).output

    expect(first.packetCount).toBeGreaterThanOrEqual(2)
    expect(first.packets.map((packet) => packet.packetId)).toEqual(
      second.packets.map((packet) => packet.packetId),
    )
    expect(first.packets[0]).toMatchObject({
      source: "effect",
      profile: "effect-autofix-safe",
      riskClass: "safe-autofix",
      safeFixCount: expect.any(Number),
      contextBundle: {
        rawSourceStored: false,
        rawCommandOutputStored: false,
      },
    })
    expect(first.packets[0]?.validationLadder.map((step) => step.step)).toEqual([
      "cheap",
      "focused",
      "medium",
      "final",
    ])
  })

  it("projects Trellis architecture diagnostics into core workflow packets", () => {
    const loaded = makeTrellisArchitectureDiagnosticsFixture()
    const output = Schema.decodeUnknownSync(TrellisLsPacketsOutputSchema)(
      runPacketsCommand({
        cwd: loaded.workspaceRoot,
        workspace: ".",
        source: "trellis",
        profile: "recipe-only-source",
        format: "json",
      }).output,
    )
    const orphanTargetPacket = output.packets.find((packet) =>
      packet.code === "trellis/orphan-public-nx-target"
    )

    expect(output.packetCount).toBeGreaterThanOrEqual(1)
    expect(orphanTargetPacket).toMatchObject({
      source: "trellis",
      corePacket: {
        recipeId: "trellis-language-service.architecture-migration-packet",
        ruleIds: ["attune/nx-targets-are-projections-not-source-truth"],
        policy: {
          repair: {
            preferCutWhenBehaviorPreserved: true,
          },
          privacy: {
            storeRawPrompt: false,
            storeRawTrace: false,
            storeFullSource: false,
            storeRawCommandOutput: false,
            storePatchText: false,
            storeRawDiff: false,
            boundedContextOnly: true,
          },
        },
      },
    })
    expect(orphanTargetPacket?.corePacket.targets.some((target) =>
      target.subject.kind === "project-target"
    )).toBe(true)
  })

  it("judges Trellis architecture packets before promotion", () => {
    const loaded = makeTrellisArchitectureDiagnosticsFixture()
    const packet = runPacketsCommand({
      cwd: loaded.workspaceRoot,
      workspace: ".",
      source: "trellis",
      profile: "recipe-only-source",
      format: "json",
    }).output.packets.find((candidate) =>
      candidate.code === "trellis/orphan-public-nx-target"
    )
    expect(packet).toBeDefined()
    const packetId = packet?.packetId
    if (packetId === undefined) {
      throw new Error("expected orphan public Nx target packet")
    }

    const output = Schema.decodeUnknownSync(TrellisLsJudgeOutputSchema)(
      runJudgeCommand({
        cwd: loaded.workspaceRoot,
        workspace: ".",
        source: "trellis",
        profile: "recipe-only-source",
        packetId,
        format: "json",
      }).output,
    )

    expect(output.command).toBe("judge")
    expect(output.judge).toMatchObject({
      judgeId: "judge:trellis-language-service:architecture-migration",
      recipeId: "trellis-language-service.architecture-migration-judge",
      ciBlocking: true,
    })
    expect(output.packetIds).toEqual([packetId])
    expect(output.selectedTargetOracles[0]).toMatchObject({
      packetId,
      selectedRemainingCount: expect.any(Number),
    })
    expect(output.judgment).toMatchObject({
      status: "fail",
      promotionAllowed: false,
      blockerPacketIds: [packet?.packetId],
    })
  })

  it("supports packet fixes, diff apply, write apply, and packet check", () => {
    const fixture = makeEffectProfilesFixture()
    const packet = runPacketsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-autofix-safe",
      format: "json",
    }).output.packets.find((candidate) =>
      candidate.code === "effect/effectSucceedWithVoid"
    )!

    const fixes = Schema.decodeUnknownSync(TrellisLsFixesOutputSchema)(
      runFixesCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        profile: "effect-autofix-safe",
        packetId: packet.packetId,
        format: "json",
      }).output,
    )
    const diff = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(
      runApplyCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        profile: "effect-autofix-safe",
        packetId: packet.packetId,
        mode: "diff",
        format: "json",
      }).output,
    )
    const write = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(
      runApplyCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        profile: "effect-autofix-safe",
        packetId: packet.packetId,
        mode: "write",
        format: "json",
      }).output,
    )
    const checkResult = runCheckCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      packetId: packet.packetId,
      format: "json",
    })
    const check = Schema.decodeUnknownSync(TrellisLsCheckOutputSchema)(checkResult.output)

    expect(fixes.packetId).toBe(packet.packetId)
    expect(fixes.fixes).toHaveLength(1)
    expect(diff.applied).toBe(false)
    expect(diff.diff).toContain("Effect.void")
    expect(write.applied).toBe(true)
    expect(fs.readFileSync(fixture.file, "utf8")).toContain("return Effect.void")
    expect(checkResult.exitCode).toBe(0)
    expect(check.validationStatus).toBe("cleared")
    expect(check.validationLadder).toBeUndefined()
  })

  it("runs a privacy-preserving packet fast path preview without writing", () => {
    const fixture = makeEffectProfilesFixture()
    const store = createInMemoryRecipeReceiptStore()
    const packet = runPacketsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-autofix-safe",
      format: "json",
    }).output.packets.find((candidate) =>
      candidate.code === "effect/effectSucceedWithVoid"
    )!

    const result = runFastPathCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      packetId: packet.packetId,
      mode: "preview",
      format: "json",
      receiptStore: store,
    })
    const output = Schema.decodeUnknownSync(TrellisLsFastPathOutputSchema)(result.output)
    const snapshot = Effect.runSync(store.snapshot())

    expect(result.exitCode).toBe(0)
    expect(output.command).toBe("fastpath")
    expect(output.applied).toBe(false)
    expect(output.refused).toBe(false)
    expect(output.safeFixCount).toBeGreaterThan(0)
    expect(output.observationIds).toHaveLength(1)
    expect(output.privacy).toMatchObject({
      rawSourceStored: false,
      rawCommandOutputStored: false,
      rawDiffStored: false,
      patchTextStored: false,
    })
    expect(JSON.stringify(output)).not.toContain("@@")
    expect(fs.readFileSync(fixture.file, "utf8")).toContain("Effect.succeed(undefined)")
    expect(snapshot.observations.map((observation) => observation.observationKind)).toContain(
      "trellis-language-service.effect-packet-fastpath-summary",
    )
  })

  it("runs a packet fast path write and checks for cleared status", () => {
    const fixture = makeEffectProfilesFixture()
    const packet = runPacketsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-autofix-safe",
      format: "json",
    }).output.packets.find((candidate) =>
      candidate.code === "effect/effectSucceedWithVoid"
    )!

    const result = runFastPathCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      packetId: packet.packetId,
      mode: "write",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsFastPathOutputSchema)(result.output)

    expect(result.exitCode).toBe(0)
    expect(output.applied).toBe(true)
    expect(output.appliedFixCount).toBe(1)
    expect(output.validationStatus).toBe("cleared")
    expect(output.check?.validationStatus).toBe("cleared")
    expect(fs.readFileSync(fixture.file, "utf8")).toContain("return Effect.void")
  })

  it("re-resolves a stale packet ID from stable target identity", () => {
    const fixture = makeEffectProfilesFixture()
    const packet = runPacketsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-autofix-safe",
      format: "json",
    }).output.packets.find((candidate) =>
      candidate.code === "effect/effectSucceedWithVoid"
    )!
    const targetId = packet.contextBundle.examples[0]!.diagnosticId

    const result = runFastPathCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      packetId: "packet_stale",
      targetId,
      mode: "preview",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsFastPathOutputSchema)(result.output)

    expect(result.exitCode).toBe(0)
    expect(output.stale).toBe(true)
    expect(output.resolution.status).toBe("re-resolved")
    expect(output.resolvedPacketId).toBe(packet.packetId)
    expect(output.targetIds).toContain(targetId)
  })

  it("refuses stale packet fast path when target identity is too broad", () => {
    const fixture = makeEffectProfilesFixture()
    const result = runFastPathCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      packetId: "packet_stale",
      ruleName: "effectSucceedWithVoid",
      mode: "write",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsFastPathOutputSchema)(result.output)

    expect(result.exitCode).toBe(1)
    expect(output.refused).toBe(true)
    expect(output.validationStatus).toBe("stale")
    expect(output.resolution.status).toBe("failed")
    expect(output.refusal?.code).toBe("trellis-ls/packet-fastpath-stale")
  })

  it("refuses packet write when a packet only has suppression fixes", () => {
    const fixture = makeFixture()
    const packet = runPacketsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-correctness",
      format: "json",
    }).output.packets[0]!
    const result = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-correctness",
      packetId: packet.packetId,
      mode: "write",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(result.output)

    expect(result.exitCode).toBe(1)
    expect(output.refused).toBe(true)
    expect(output.refusal?.code).toBe("trellis-ls/packet-has-no-safe-fixes")
  })

  it("refuses unsafe packet fast path writes without applying suppressions", () => {
    const fixture = makeFixture()
    const packet = runPacketsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-correctness",
      format: "json",
    }).output.packets[0]!
    const before = fs.readFileSync(fixture.file, "utf8")

    const result = runFastPathCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-correctness",
      packetId: packet.packetId,
      mode: "write",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsFastPathOutputSchema)(result.output)

    expect(result.exitCode).toBe(1)
    expect(output.applied).toBe(false)
    expect(output.refused).toBe(true)
    expect(output.validationStatus).toBe("refused")
    expect(output.refusal?.code).toBe("trellis-ls/packet-has-no-safe-fixes")
    expect(fs.readFileSync(fixture.file, "utf8")).toBe(before)
  })

  it("exposes review-required manual handles for Effect-native inventory packets", () => {
    const fixture = makeEffectProfilesFixture()
    const packet = runPacketsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-full-inventory",
      format: "json",
    }).output.packets.find((candidate) =>
      candidate.code === "effect/globalConsole"
    )!

    const hiddenByDefault = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-full-inventory",
      packetId: packet.packetId,
      format: "json",
    }).output
    const fixes = Schema.decodeUnknownSync(TrellisLsFixesOutputSchema)(
      runFixesCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        profile: "effect-full-inventory",
        packetId: packet.packetId,
        includeManual: true,
        format: "json",
      }).output,
    )
    const before = fs.readFileSync(fixture.file, "utf8")
    const result = runFastPathCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-full-inventory",
      packetId: packet.packetId,
      mode: "write",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsFastPathOutputSchema)(result.output)

    expect(packet).toMatchObject({
      riskClass: "review-required",
      safeFixCount: 0,
      reviewRequiredFixCount: 1,
    })
    expect(packet.contextBundle.examples[0]?.fixIds).toHaveLength(1)
    expect(hiddenByDefault.fixes).toHaveLength(0)
    expect(fixes.fixes).toHaveLength(1)
    expect(fixes.fixes[0]).toMatchObject({
      kind: "manual",
      title: "Review Effect logging migration for global console usage",
      safe: false,
      requiresReview: true,
      canApply: false,
      affectedFiles: ["src/effect-rules.ts"],
    })
    expect(fixes.fixes[0]?.edits).toBeUndefined()
    expect(result.exitCode).toBe(1)
    expect(output.applied).toBe(false)
    expect(output.refused).toBe(true)
    expect(output.fixCount).toBe(1)
    expect(output.safeFixCount).toBe(0)
    expect(output.reviewRequiredFixCount).toBe(1)
    expect(output.excludedFixIds).toEqual([fixes.fixes[0]!.fixId])
    expect(output.refusal?.code).toBe("trellis-ls/packet-has-no-safe-fixes")
    expect(fs.readFileSync(fixture.file, "utf8")).toBe(before)
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
      safe: false,
      requiresReview: true,
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

  it("applies a safe Effect text edit in write mode", () => {
    const fixture = makeEffectProfilesFixture()
    const fixId = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      safeOnly: true,
      format: "json",
    }).output.fixes.find((fix) => fix.title.includes("Effect.void"))!.fixId

    const result = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      fixId,
      mode: "write",
      format: "json",
      recheck: true,
    })
    const output = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(result.output)

    expect(result.exitCode).toBe(0)
    expect(output.applied).toBe(true)
    expect(output.recheck?.diagnostics.filter((diagnostic) =>
      diagnostic.code === "effect/effectSucceedWithVoid"
    )).toHaveLength(0)
    expect(fs.readFileSync(fixture.file, "utf8")).toContain("return Effect.void")
  })

  it("refuses suppression fixes in safe write mode", () => {
    const fixture = makeFixture()
    const fix = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      format: "json",
    }).output.fixes[0]!

    expect(fix).toMatchObject({
      safe: false,
      requiresReview: true,
    })
    expect(runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      safeOnly: true,
      format: "json",
    }).output.fixes).toHaveLength(0)

    const result = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      fixId: fix.fixId,
      mode: "write",
      format: "json",
    })
    const output = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(result.output)

    expect(result.exitCode).toBe(1)
    expect(output.refused).toBe(true)
    expect(output.refusal?.code).toBe("trellis-ls/review-required")
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

  it("derives deterministic delete apply and fastpath for no-compat script packets", () => {
    const fixture = makeScriptFixture()
    const packets = Schema.decodeUnknownSync(TrellisLsPacketsOutputSchema)(
      runPacketsCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        source: "trellis",
        profile: "recipe-only-source",
        format: "json",
      }).output,
    )
    const packet = packets.packets.find((candidate) =>
      candidate.code === "trellis/package-local-script-reintroduced"
    )!
    const fixes = Schema.decodeUnknownSync(TrellisLsFixesOutputSchema)(
      runFixesCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        format: "json",
      }).output,
    )

    expect(fixes.fixes).toContainEqual(expect.objectContaining({
      kind: "workspace-edit",
      safe: true,
      requiresReview: false,
      deleteFiles: [fixture.scriptFile],
    }))
    expect(packets.packets).toContainEqual(expect.objectContaining({
      source: "trellis",
      code: "trellis/package-local-script-reintroduced",
      corePacket: expect.objectContaining({
        ruleIds: ["attune/package-local-scripts-are-not-public-workflow-surfaces"],
        policy: expect.objectContaining({
          repair: expect.objectContaining({
            preferCutWhenBehaviorPreserved: true,
          }),
        }),
      }),
    }))

    const diff = Schema.decodeUnknownSync(TrellisLsApplyOutputSchema)(
      runApplyCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        profile: "recipe-only-source",
        packetId: packet.packetId,
        mode: "diff",
        format: "json",
      }).output,
    )
    expect(diff.diff).toContain("+++ /dev/null")
    expect(fs.existsSync(fixture.scriptFile)).toBe(true)

    const fastpath = Schema.decodeUnknownSync(TrellisLsFastPathOutputSchema)(
      runFastPathCommand({
        cwd: fixture.root,
        project: "tsconfig.json",
        source: "trellis",
        profile: "recipe-only-source",
        packetId: packet.packetId,
        mode: "write",
        format: "json",
      }).output,
    )
    expect(fastpath.source).toBe("trellis")
    expect(fastpath.applied).toBe(true)
    expect(fastpath.validationStatus).toBe("cleared")
    expect(fs.existsSync(fixture.scriptFile)).toBe(false)
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

    const fixes = runFixesCommand({
      cwd: fixture.root,
      workspace: ".",
      profile: "recipe-only-source",
      diagnosticId: authoredDiagnostic!.id,
      includeManual: true,
      format: "json",
    }).output
    expect(fixes.fixes[0]).toMatchObject({
      kind: "workspace-edit",
      safe: true,
      requiresReview: false,
      canApply: true,
      title: "Delete migrated attune.package.ts",
      deleteFiles: [fixture.attunePackage],
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
    expect(diff.diff).toContain("-export const LegacyPackageFacts")
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

  it("does not count broad source-tree ownership as strict file accounting", () => {
    const loaded = makeBroadFileAccountingFixture()
    const analysis = analyzeFileAccounting(loaded)
    const cliTarget = analysis.targets.find((target) => target.path === "packages/demo/src/cli.ts")
    const regularTarget = analysis.targets.find((target) => target.path === "packages/demo/src/regular.ts")
    const focusedTarget = analysis.targets.find((target) => target.path === "packages/demo/src/feature/owned.ts")

    expect(cliTarget).toMatchObject({
      currentOwner: expect.any(String),
      expectedOwnerKind: "invocation",
      missingOrAmbiguousOwnershipReason: expect.stringContaining("generic ownership needs specialization"),
    })
    expect(regularTarget).toMatchObject({
      currentOwner: expect.any(String),
      expectedOwnerKind: "Recipe",
      missingOrAmbiguousOwnershipReason: expect.stringContaining("broad package/source ownership is bootstrap-only"),
    })
    expect(focusedTarget).toMatchObject({
      currentOwner: "demo.feature",
      expectedOwnerKind: "Recipe",
    })
    expect(focusedTarget?.missingOrAmbiguousOwnershipReason).toBeUndefined()
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "trellis/workflow-not-invocation-recipe",
    )
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "trellis/source-file-unowned-by-recipe",
    )
    expect(analysis.oracle.accountedFiles).toBeLessThan(analysis.oracle.trackedFiles)
    expect(analysis.oracle.unaccountedFiles).toBeGreaterThan(0)
    expect(analysis.oracle.promotionAllowed).toBe(false)
  })

  it("does not count tracked generated code as complete even when projection-owned", () => {
    const loaded = makeGeneratedFileAccountingFixture()
    const analysis = analyzeFileAccounting(loaded)
    const generatedTarget = analysis.targets.find((target) =>
      target.path === "packages/demo/src/generated/widget.ts"
    )

    expect(generatedTarget).toMatchObject({
      currentOwner: "demo.generate-widget",
      expectedOwnerKind: "ProjectionRecipe",
      missingOrAmbiguousOwnershipReason: expect.stringContaining("tracked generated code must leave source control"),
    })
    expect(analysis.oracle.trackedGeneratedCodeFiles).toBe(1)
    expect(analysis.oracle.trackedGeneratedArtifactFiles).toBe(0)
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toContain("trellis/generated-code-tracked")
    expect(analysis.oracle.accountedFiles).toBeLessThan(analysis.oracle.trackedFiles)
    expect(analysis.oracle.promotionAllowed).toBe(false)
  })

  it("keeps deleted-but-tracked files in repository inventory", () => {
    const loaded = makeDeletedTrackedFileAccountingFixture()
    const analysis = analyzeFileAccounting(loaded)
    const deletedTarget = analysis.targets.find((target) =>
      target.path === "packages/demo/src/deleted.ts"
    )

    expect(analysis.snapshot.trackedFileCount).toBe(2)
    expect(deletedTarget).toMatchObject({
      fileRole: "source",
      expectedOwnerKind: "Recipe",
      missingOrAmbiguousOwnershipReason: expect.stringContaining("missing Recipe ownership"),
    })
    expect(analysis.oracle.trackedFiles).toBe(2)
    expect(analysis.oracle.unownedSourceFiles).toBeGreaterThanOrEqual(1)
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.file)).toContain(
      "packages/demo/src/deleted.ts",
    )
    expect(analysis.oracle.promotionAllowed).toBe(false)
  })

  it("reports ambiguous focused recipe ownership and groups packets by repair shape", () => {
    const loaded = makeAmbiguousFileAccountingFixture()
    const analysis = analyzeFileAccounting(loaded)
    const ambiguousTarget = analysis.targets.find((target) =>
      target.path === "packages/demo/src/feature/owned.ts"
    )
    const ambiguousDiagnostic = analysis.diagnostics.find((diagnostic) =>
      diagnostic.file === "packages/demo/src/feature/owned.ts"
    )

    expect(ambiguousTarget).toMatchObject({
      currentOwner: "demo.feature-a",
      missingOrAmbiguousOwnershipReason: expect.stringContaining("ambiguous ownership"),
    })
    expect(analysis.oracle.ambiguousFiles).toBe(1)
    expect(ambiguousDiagnostic).toMatchObject({
      code: "trellis/file-unowned-by-recipe",
      tags: expect.arrayContaining([
        "repair-recipe:trellis-language-service.file-accounting.file-unowned-by-recipe",
        "validation-target:workspace:packetized-architecture-judge",
        "blast-radius:package",
      ]),
    })
    expect(ambiguousDiagnostic?.tags.some((tag) =>
      tag.startsWith("packet-group:packages/demo|source|Recipe|trellis-language-service.file-accounting.file-unowned-by-recipe|workspace:packetized-architecture-judge|")
    )).toBe(true)
    expect(analysis.oracle.promotionAllowed).toBe(false)
  })

  it("counts specialized non-source wildcard ownership as final accounting", () => {
    const loaded = makeWorkspaceRoleFileAccountingFixture()
    const analysis = analyzeFileAccounting(loaded)
    const roleTargets = [
      "docs/README.md",
      "openspec/changes/demo/proposal.md",
      "nix/demo.nix",
    ].map((file) => analysis.targets.find((target) => target.path === file))

    expect(roleTargets).toEqual([
      expect.objectContaining({ currentOwner: "demo.docs" }),
      expect.objectContaining({ currentOwner: "demo.openspec" }),
      expect.objectContaining({ currentOwner: "demo.nix" }),
    ])
    expect(roleTargets.every((target) => target?.missingOrAmbiguousOwnershipReason === undefined)).toBe(true)
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.file)).not.toEqual(expect.arrayContaining([
      "docs/README.md",
      "openspec/changes/demo/proposal.md",
      "nix/demo.nix",
    ]))
  })

  it("derives source-expression failures from typed recipe, handler, Layer, and side-effect facts", () => {
    const loaded = makeSourceExpressionFixture()
    const analysis = analyzeSourceExpression(loaded, {
      packetCount: 0,
      missingJudgments: 0,
    })
    const diagnosticCodes = analysis.diagnostics.map((diagnostic) => diagnostic.code)

    expect(analysis.snapshot.sourceFileCount).toBeGreaterThanOrEqual(4)
    expect(analysis.snapshot.typedAlchemyResourceCount).toBe(2)
    expect(analysis.snapshot.handlerBindingCount).toBe(1)
    expect(analysis.oracle.stringOnlyIoRecipes).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.recipesMissingTypedHandlers).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.sideEffectsOutsideEffectRequirements).toBe(1)
    expect(analysis.oracle.pureModulesUnreachableFromRecipe).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.recipeHandlersNotDagBound).toBeGreaterThanOrEqual(1)
    expect(diagnosticCodes).toEqual(expect.arrayContaining([
      "trellis/recipe-has-string-only-io",
      "trellis/recipe-missing-typed-handler",
      "trellis/side-effect-outside-effect-requirement",
      "trellis/pure-module-not-reachable-from-recipe",
      "trellis/recipe-handler-not-dag-bound",
    ]))
    expect(analysis.oracle.promotionAllowed).toBe(false)
  })

  it("does not require file-local recipes for untracked generated TypeScript outputs", () => {
    const loaded = makeUntrackedGeneratedSourceExpressionFixture()
    const analysis = analyzeSourceExpression(loaded, {
      packetCount: 0,
      missingJudgments: 0,
    })
    const diagnosticFiles = analysis.diagnostics.map((diagnostic) => diagnostic.file)

    expect(analysis.snapshot.sourceFileCount).toBe(1)
    expect(diagnosticFiles).toContain("packages/demo/src/index.ts")
    expect(diagnosticFiles).not.toContain("packages/demo/src/generated/widget.ts")
    expect(analysis.targets.map((target) => target.path)).not.toContain(
      "packages/demo/src/generated/widget.ts",
    )
  })

  it("fails aggregate-only recipe catalogs even when typed IO and DAG counters pass", () => {
    const loaded = makeAggregateOnlyLocalRecipeFixture()
    const analysis = analyzeSourceExpression(loaded, {
      packetCount: 0,
      missingJudgments: 0,
    })
    const diagnosticCodes = analysis.diagnostics.map((diagnostic) => diagnostic.code)

    expect(analysis.oracle.recipesMissingAlchemyResourceIo).toBe(0)
    expect(analysis.oracle.recipesMissingTypedHandlers).toBe(0)
    expect(analysis.oracle.recipesNotInAlchemyDag).toBe(0)
    expect(analysis.oracle.recipeDependenciesNotAlchemyDag).toBe(0)
    expect(analysis.oracle.alchemyDagEdgesMissingResources).toBe(0)
    expect(analysis.oracle.nestedRecipesMissingTypedContracts).toBe(0)
    expect(analysis.oracle.recipeDagCycles).toBe(0)
    expect(analysis.oracle.sourceFilesMissingLocalRecipes).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.sourceFilesMissingLocalHandlers).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.sourceFilesMissingRecipeModules).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.aggregateRecipesOwningSourceFiles).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.packageCatalogsMissingLocalModules).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.semanticGroupingStringsUsedAsAuthority).toBeGreaterThanOrEqual(1)
    expect(diagnosticCodes).toEqual(expect.arrayContaining([
      "trellis/source-file-missing-local-recipe",
      "trellis/source-file-missing-local-handler",
      "trellis/source-file-missing-recipe-module",
      "trellis/aggregate-recipe-owns-source-file",
      "trellis/package-catalog-missing-local-module",
      "trellis/semantic-grouping-string-authority",
    ]))
    expect(analysis.oracle.promotionAllowed).toBe(false)
  })

  it("fails dependency-only, missing-resource, static-provider, cyclic, and string-heavy DAG expression", () => {
    const loaded = makeNestedRecipeDagFixture()
    const analysis = analyzeSourceExpression(loaded, {
      packetCount: 0,
      missingJudgments: 0,
    })
    const diagnosticCodes = analysis.diagnostics.map((diagnostic) => diagnostic.code)

    expect(analysis.oracle.recipeDependenciesNotAlchemyDag).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.alchemyDagEdgesMissingResources).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.alchemyResourcesNotProgrammatic).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.nestedRecipesMissingTypedContracts).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.recipeDagCycles).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.stringIdsNotInferred).toBeGreaterThanOrEqual(1)
    expect(analysis.oracle.semanticGroupingStringsUsedAsAuthority).toBeGreaterThanOrEqual(1)
    expect(diagnosticCodes).toEqual(expect.arrayContaining([
      "trellis/recipe-dependency-not-alchemy-dag",
      "trellis/alchemy-dag-edge-missing-resource",
      "trellis/alchemy-resource-not-programmatic",
      "trellis/nested-recipe-missing-typed-contract",
      "trellis/recipe-dag-cycle",
      "trellis/string-id-not-inferred",
      "trellis/semantic-grouping-string-authority",
    ]))
    expect(analysis.oracle.promotionAllowed).toBe(false)
  })

  it("resolves imported const recipe IDs in dependencies and nested DAG edges", () => {
    const loaded = makeImportedRecipeIdDagFixture()
    const analysis = analyzeSourceExpression(loaded, {
      packetCount: 0,
      missingJudgments: 0,
    })

    expect(analysis.oracle.recipeDependenciesNotAlchemyDag).toBe(0)
    expect(analysis.oracle.alchemyDagEdgesMissingResources).toBe(0)
    expect(analysis.oracle.nestedRecipesMissingTypedContracts).toBe(0)
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).not.toEqual(expect.arrayContaining([
      "trellis/recipe-dependency-not-alchemy-dag",
      "trellis/alchemy-dag-edge-missing-resource",
      "trellis/nested-recipe-missing-typed-contract",
    ]))
  })

  it("packetizes aggregate-only catalogs as file-local recipe and aggregate packets", () => {
    const loaded = makeAggregateOnlyLocalRecipeFixture()
    const output = Schema.decodeUnknownSync(TrellisLsPacketsOutputSchema)(
      runPacketsCommand({
        cwd: loaded.workspaceRoot,
        workspace: ".",
        source: "trellis",
        profile: "recipe-only-source",
        format: "json",
      }).output,
    )
    const localRecipePacket = output.packets.find((packet) =>
      packet.code === "trellis/source-file-missing-local-recipe"
    )
    const localHandlerPacket = output.packets.find((packet) =>
      packet.code === "trellis/source-file-missing-local-handler"
    )
    const aggregatePacket = output.packets.find((packet) =>
      packet.code === "trellis/aggregate-recipe-owns-source-file"
    )
    const recipeModulePacket = output.packets.find((packet) =>
      packet.code === "trellis/source-file-missing-recipe-module"
    )
    const catalogModulePacket = output.packets.find((packet) =>
      packet.code === "trellis/package-catalog-missing-local-module"
    )
    const semanticGroupingPacket = output.packets.find((packet) =>
      packet.code === "trellis/semantic-grouping-string-authority"
    )

    expect(localRecipePacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "file-local-recipe",
      path: "packages/demo/src/worker.ts",
      packageRootId: "packages/demo",
    })
    expect(localHandlerPacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "file-local-handler",
      path: "packages/demo/src/worker.ts",
      packageRootId: "packages/demo",
    })
    expect(aggregatePacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "recipe-aggregate",
      path: "packages/demo/src/recipes.ts",
      packageRootId: "packages/demo",
    })
    expect(recipeModulePacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "recipe-module",
      path: "packages/demo/src/worker.ts",
      packageRootId: "packages/demo",
    })
    expect(catalogModulePacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "package-catalog",
      path: "packages/demo/src/recipes.ts",
      packageRootId: "packages/demo",
    })
    expect(recipeModulePacket?.corePacket.targets[0]?.identity.code).toBe(
      "trellis/source-file-missing-recipe-module",
    )
    expect(semanticGroupingPacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "semantic-grouping",
      path: "packages/demo/src/recipes.ts",
      packageRootId: "packages/demo",
    })
  })

  it("packetizes nested DAG and typed-inference failures as grouped implementation packets", () => {
    const loaded = makeNestedRecipeDagFixture()
    const output = Schema.decodeUnknownSync(TrellisLsPacketsOutputSchema)(
      runPacketsCommand({
        cwd: loaded.workspaceRoot,
        workspace: ".",
        source: "trellis",
        profile: "recipe-only-source",
        format: "json",
      }).output,
    )
    const dependencyPacket = output.packets.find((packet) =>
      packet.code === "trellis/recipe-dependency-not-alchemy-dag"
    )
    const missingResourcePacket = output.packets.find((packet) =>
      packet.code === "trellis/alchemy-dag-edge-missing-resource"
    )
    const programmaticPacket = output.packets.find((packet) =>
      packet.code === "trellis/alchemy-resource-not-programmatic"
    )
    const nestedContractPacket = output.packets.find((packet) =>
      packet.code === "trellis/nested-recipe-missing-typed-contract"
    )
    const cyclePacket = output.packets.find((packet) =>
      packet.code === "trellis/recipe-dag-cycle"
    )
    const stringInferencePacket = output.packets.find((packet) =>
      packet.code === "trellis/string-id-not-inferred"
    )
    const semanticGroupingPacket = output.packets.find((packet) =>
      packet.code === "trellis/semantic-grouping-string-authority"
    )

    expect(dependencyPacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "alchemy-dag-edge",
      fromRecipeId: "demo.parent",
      toRecipeId: "demo.child",
    })
    expect(missingResourcePacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "alchemy-dag-edge",
      fromRecipeId: "demo.parent",
      resourceId: "unknown-resource",
    })
    expect(programmaticPacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "programmatic-alchemy-resource",
      resourceId: "demo.static-kubernetes",
    })
    expect(nestedContractPacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "nested-recipe",
      recipeId: "demo.untyped",
    })
    expect(cyclePacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "recipe-dag",
    })
    expect(stringInferencePacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "recipe-dag",
      recipeId: "demo.parent",
    })
    expect(semanticGroupingPacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "semantic-grouping",
      path: "packages/demo/src/recipes.ts",
      packageRootId: "packages/demo",
    })
  })

  it("projects source-expression diagnostics into grouped Trellis packets", () => {
    const loaded = makeSourceExpressionFixture()
    const output = Schema.decodeUnknownSync(TrellisLsPacketsOutputSchema)(
      runPacketsCommand({
        cwd: loaded.workspaceRoot,
        workspace: ".",
        source: "trellis",
        profile: "recipe-only-source",
        format: "json",
      }).output,
    )
    const recipeIoPacket = output.packets.find((packet) =>
      packet.code === "trellis/recipe-has-string-only-io"
    )
    const sideEffectPacket = output.packets.find((packet) =>
      packet.code === "trellis/side-effect-outside-effect-requirement"
    )
    const handlerDagPacket = output.packets.find((packet) =>
      packet.code === "trellis/recipe-handler-not-dag-bound"
    )

    expect(recipeIoPacket).toMatchObject({
      corePacket: {
        recipeId: "trellis-language-service.source-expression-packet",
        targets: [
          expect.objectContaining({
            subject: { kind: "recipe-io", recipeId: "demo.string-only" },
          }),
        ],
      },
      ruleName: "attune/recipes-use-typed-alchemy-resource-io",
    })
    expect(sideEffectPacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "effect-service-requirement",
      requirementId: "filesystem",
    })
    expect(sideEffectPacket?.corePacket.targets[0]?.identity.code).toBe(
      "trellis/side-effect-outside-effect-requirement",
    )
    expect(handlerDagPacket?.corePacket.targets[0]?.subject).toMatchObject({
      kind: "recipe-handler-dag",
      recipeId: "demo.typed",
      handlerId: "demo.typed.handler",
    })
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
      "trellis/tend-owned-packet-ontology",
      "trellis/tend-owned-judge-ontology",
    ]))

    const fixes = collectTrellisFixes(loaded, diagnostics)
    expect(fixes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "manual",
        title: "Refresh generated artifact through its ProjectionRecipe",
        requiresReview: true,
      }),
      expect.objectContaining({
        kind: "text-edit",
        title: "Attach Nx target recipe/projection ownership",
        safe: true,
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
        title: "Route Tend packet state through framework protocol receipts",
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
    const fixture = makeEffectProfilesFixture()
    const store = createInMemoryRecipeReceiptStore()
    const diagnostics = runDiagnosticsCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      source: "effect",
      profile: "effect-autofix-safe",
      format: "json",
      receiptStore: store,
    }).output
    const fixes = runFixesCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      safeOnly: true,
      format: "json",
      receiptStore: store,
    }).output
    const diff = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      fixId: fixes.fixes[0]!.fixId,
      mode: "diff",
      format: "json",
      receiptStore: store,
    }).output
    const applied = runApplyCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
      fixId: fixes.fixes[0]!.fixId,
      mode: "write",
      format: "json",
      receiptStore: store,
    }).output
    const check = runCheckCommand({
      cwd: fixture.root,
      project: "tsconfig.json",
      profile: "effect-autofix-safe",
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
      "trellis-language-service.apply-diff-summary",
      "trellis-language-service.upstream-quickfix-application",
      "trellis-language-service.check-summary",
    ]))
    expect(kinds.filter((kind) => kind === "trellis-language-service.apply-diff-summary")).toHaveLength(1)
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
          internalGenerator: "@attune/framework-nx:private-generator",
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
            "errorCount": 1,
            "messageCount": 0,
            "suggestionCount": 0,
            "warningCount": 0,
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
              "severity": "error",
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
                "effect-rule:floatingEffect",
                "effect-group:correctness",
                "effect-default-severity:error",
                "effect-fixable:false",
                "effect-supported:v3",
                "effect-supported:v4",
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
              "preview": "Adds \`void \` before the Effect expression. Review required: this suppresses a floating Effect diagnostic.",
              "requiresReview": true,
              "safe": false,
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
            "errorCount": 1,
            "messageCount": 0,
            "suggestionCount": 0,
            "warningCount": 0,
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
              "preview": "Adds \`void \` before the Effect expression. Review required: this suppresses a floating Effect diagnostic.",
              "requiresReview": true,
              "safe": false,
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

import * as fs from "node:fs"
import * as path from "node:path"
import ts from "typescript"
import { Effect, Layer } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"

import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceCommandResource,
  LanguageServiceProjectionInput,
  LanguageServiceWorkspaceResource,
} from "./contracts.js"

export const LanguageServiceProjectLoaderSourcePath = "packages/trellis/language-service/src/project-loader.ts" as const

export interface LoadedProject {
  readonly workspaceRoot: string
  readonly projectPath?: string
  readonly filePath?: string
  readonly workspacePath?: string
  readonly fileNames: readonly string[]
  readonly program?: ts.Program
}

export const findWorkspaceRoot = (start = process.cwd()): string => {
  let current = path.resolve(start)
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "nx.json")) || fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current
    }
    current = path.dirname(current)
  }
  return path.resolve(start)
}

export const loadProjectScope = (input: {
  readonly project?: string
  readonly file?: string
  readonly workspace?: string
  readonly cwd?: string
}): LoadedProject => {
  const workspaceRoot = findWorkspaceRoot(input.cwd)
  const projectPath = input.project === undefined
    ? undefined
    : path.resolve(workspaceRoot, input.project)
  const filePath = input.file === undefined
    ? undefined
    : path.resolve(workspaceRoot, input.file)
  const workspacePath = input.workspace === undefined
    ? undefined
    : path.resolve(workspaceRoot, input.workspace)

  const projectFiles = projectPath === undefined
    ? []
    : readProjectFiles(projectPath)
  const workspaceFiles = workspacePath === undefined
    ? []
    : readWorkspaceFiles(workspacePath)
  const fileNames = unique([
    ...projectFiles,
    ...workspaceFiles,
    ...(filePath === undefined ? [] : [filePath]),
  ]).filter((candidate) => !candidate.endsWith(".d.ts"))

  const program = projectPath === undefined
    ? fileNames.length === 0
      ? undefined
      : ts.createProgram(fileNames, defaultCompilerOptions())
    : createProgramFromTsconfig(projectPath)

  return {
    workspaceRoot,
    ...(projectPath === undefined ? {} : { projectPath }),
    ...(filePath === undefined ? {} : { filePath }),
    ...(workspacePath === undefined ? {} : { workspacePath }),
    fileNames,
    ...(program === undefined ? {} : { program }),
  }
}

export const relativeToWorkspace = (workspaceRoot: string, file: string): string =>
  path.relative(workspaceRoot, file).replaceAll(path.sep, "/")

const readProjectFiles = (projectPath: string): readonly string[] => {
  const configFile = ts.readConfigFile(projectPath, ts.sys.readFile)
  if (configFile.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"))
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(projectPath),
  )
  return parsed.fileNames
}

const createProgramFromTsconfig = (projectPath: string): ts.Program => {
  const configFile = ts.readConfigFile(projectPath, ts.sys.readFile)
  if (configFile.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"))
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(projectPath),
  )
  return ts.createProgram(parsed.fileNames, parsed.options)
}

const readWorkspaceFiles = (workspacePath: string): readonly string[] => {
  const files: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git" || entry.name === ".attune") {
        continue
      }
      const fullPath = path.join(directory, entry.name)
      if (isVendoredUpstreamEffectSource(fullPath)) {
        continue
      }
      if (entry.isDirectory()) {
        visit(fullPath)
      } else if (/\.[cm]?tsx?$/u.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }
  if (fs.existsSync(workspacePath)) visit(workspacePath)
  return files
}

const isVendoredUpstreamEffectSource = (targetPath: string): boolean =>
  targetPath.replaceAll(path.sep, "/").endsWith(
    "packages/trellis/language-service/src/upstream-effect/vendor",
  )

const defaultCompilerOptions = (): ts.CompilerOptions => ({
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2023,
  strict: true,
  skipLibCheck: true,
})

const unique = <A>(values: readonly A[]): readonly A[] => [...new Set(values)]

const languageServiceProjectLoaderLayer = defineRecipeLayer({
  id: "trellis-language-service.project-loader.layer",
  sourcePath: LanguageServiceProjectLoaderSourcePath,
  exportName: "languageServiceProjectLoaderLayer",
  layer: Layer.empty as never,
  provides: [{
    id: "trellis-language-service.project-loader-filesystem",
    service: "Effect.Platform.FileSystem",
  }],
})

const languageServiceWorkspaceInventoryHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.workspace-inventory.handler",
  recipeId: "trellis-language-service.workspace-inventory",
  sourcePath: LanguageServiceProjectLoaderSourcePath,
  exportName: "loadProjectScope",
  layer: languageServiceProjectLoaderLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceTypeScriptProgramHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.typescript-program.handler",
  recipeId: "trellis-language-service.typescript-program",
  sourcePath: LanguageServiceProjectLoaderSourcePath,
  exportName: "createProgramFromTsconfig",
  layer: languageServiceProjectLoaderLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceWorkspaceInventoryDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.cli-invocation-surfaces",
  toRecipeId: "trellis-language-service.workspace-inventory",
  resource: LanguageServiceWorkspaceResource,
  kind: "invokes",
  modes: ["read"],
})

const languageServiceTypeScriptProgramDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.workspace-inventory",
  toRecipeId: "trellis-language-service.typescript-program",
  resource: LanguageServiceCommandResource,
  kind: "projects",
  modes: ["project"],
})

export const LanguageServiceWorkspaceInventoryRecipe = defineRecipe({
  id: "trellis-language-service.workspace-inventory",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Load Trellis language-service workspace inventory facts",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceProjectLoaderSourcePath,
  allowedFiles: [LanguageServiceProjectLoaderSourcePath],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceWorkspaceResource],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceWorkspaceInventoryHandler,
  alchemyDag: [languageServiceWorkspaceInventoryDag],
})

export const LanguageServiceTypeScriptProgramRecipe = defineRecipe({
  id: "trellis-language-service.typescript-program",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Load TypeScript program facts for Trellis language-service scope",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceProjectLoaderSourcePath,
  allowedFiles: [LanguageServiceProjectLoaderSourcePath],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceWorkspaceResource],
    outputResources: [LanguageServiceCommandResource],
  },
  handler: languageServiceTypeScriptProgramHandler,
  alchemyDag: [languageServiceTypeScriptProgramDag],
})

export const LanguageServiceProjectLoaderRecipes = [
  LanguageServiceWorkspaceInventoryRecipe,
  LanguageServiceTypeScriptProgramRecipe,
] as const

import * as fs from "node:fs"
import * as path from "node:path"
import ts from "typescript"

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
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
        continue
      }
      const fullPath = path.join(directory, entry.name)
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

const defaultCompilerOptions = (): ts.CompilerOptions => ({
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  target: ts.ScriptTarget.ES2023,
  strict: true,
  skipLibCheck: true,
})

const unique = <A>(values: readonly A[]): readonly A[] => [...new Set(values)]

import { Project, ScriptKind, ts, type SourceFile } from "ts-morph"
import type { SyntaxFlavor } from "./model.js"
import type { SemanticCase, SemanticFile, SemanticProjectSeed } from "./model.js"

export type SemanticProjectInput = SemanticProjectSeed | SemanticCase

export type BuiltSemanticProject = Readonly<{
  readonly files: readonly SemanticFile[]
  readonly project: Project
  readonly seed: SemanticProjectSeed
}>

const isSemanticCase = (input: SemanticProjectInput): input is SemanticCase =>
  "project" in input

const normalizePath = (path: string): string => path.replace(/^\/+/u, "")

const filePathEquals = (left: string, right: string): boolean =>
  normalizePath(left) === normalizePath(right)

export const semanticSyntaxFlavorForPath = (path: string): SyntaxFlavor => {
  if (path.endsWith(".tsx")) {return "tsx"}
  if (path.endsWith(".jsx")) {return "jsx"}
  if (path.endsWith(".ts")) {return "ts"}
  return "js"
}

export const scriptKindForSemanticFile = (file: Pick<SemanticFile, "syntaxFlavor">): ScriptKind => {
  switch (file.syntaxFlavor) {
    case "js":
      return ScriptKind.JS
    case "jsx":
      return ScriptKind.JSX
    case "ts":
      return ScriptKind.TS
    case "tsx":
      return ScriptKind.TSX
  }
}

export const buildSemanticProject = (input: SemanticProjectInput): BuiltSemanticProject => {
  const seed = isSemanticCase(input) ? input.project : input
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      strict: false,
      target: ts.ScriptTarget.ES2022,
    },
    skipAddingFilesFromTsConfig: true,
    useInMemoryFileSystem: true,
  })

  for (const file of seed.files) {
    project.createSourceFile(file.path, file.source, {
      overwrite: true,
      scriptKind: scriptKindForSemanticFile(file),
    })
  }

  return {
    files: seed.files,
    project,
    seed,
  }
}

export const printSemanticFiles = (
  project: Project,
  knownFiles: readonly SemanticFile[],
): SemanticFile[] => {
  const byPath = new Map(knownFiles.map((file) => [normalizePath(file.path), file]))
  return project.getSourceFiles()
    .map((sourceFile) => {
      const path = normalizePath(sourceFile.getFilePath())
      const known = byPath.get(path)
      const syntaxFlavor = known?.syntaxFlavor ?? semanticSyntaxFlavorForPath(path)
      return {
        path,
        role: known?.role ?? "module",
        source: sourceFile.getFullText(),
        syntaxFlavor,
        tags: known?.tags ?? [syntaxFlavor, "semantic-mutation"],
      }
    })
    .toSorted((left, right) => left.path.localeCompare(right.path))
}

export const printSemanticProject = (
  project: Project,
  seed: SemanticProjectSeed,
  id = seed.id,
): SemanticProjectSeed => ({
  ...seed,
  entrypoint: normalizePath(seed.entrypoint),
  files: printSemanticFiles(project, seed.files),
  id,
})

export const printBuiltSemanticProject = (built: BuiltSemanticProject): SemanticProjectSeed =>
  printSemanticProject(built.project, built.seed)

export const sourceFileForSemanticFile = (
  project: Project,
  file: Pick<SemanticFile, "path">,
): SourceFile | undefined =>
  project.getSourceFiles().find((sourceFile) => filePathEquals(sourceFile.getFilePath(), file.path))

export type ProjectInput = SemanticProjectInput
export type BuiltProject = BuiltSemanticProject
export const syntaxFlavorForPath = semanticSyntaxFlavorForPath
export const scriptKindForProjectFile = scriptKindForSemanticFile
export const buildProject = buildSemanticProject
export const printProjectFiles = printSemanticFiles
export const printProject = printSemanticProject
export const printBuiltProject = printBuiltSemanticProject
export const sourceFileForProjectFile = sourceFileForSemanticFile

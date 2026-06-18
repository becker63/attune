export interface GeneratorTree {
  exists(path: string): boolean
  read(path: string, encoding: "utf-8"): string | null
  write(path: string, content: string): void
  children?(path: string): string[]
}

export type GeneratorTask = void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>

export const readText = (tree: GeneratorTree, path: string): string | null => {
  if (!tree.exists(path)) {
    return null
  }

  const value = tree.read(path, "utf-8")
  if (value === null) {
    return null
  }

  return value
}

export const ensureTrailingNewline = (content: string): string =>
  content.endsWith("\n") ? content : `${content}\n`

export const writeTextIfChanged = (tree: GeneratorTree, path: string, content: string): void => {
  const next = ensureTrailingNewline(content)
  if (readText(tree, path) === next) {
    return
  }

  tree.write(path, next)
}

export const listFiles = (tree: GeneratorTree, directory: string): string[] => {
  if (typeof tree.children !== "function" || !tree.exists(directory)) {
    return []
  }

  return tree.children(directory).filter((entry) => entry.endsWith(".ts")).sort()
}

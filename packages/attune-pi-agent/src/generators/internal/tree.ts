export interface GeneratorTree {
  exists(path: string): boolean
  read(path: string, encoding?: "utf-8"): string | null | Buffer
  write(path: string, content: string): void
}

export type GeneratorTask = void | (() => void | Promise<void>) | Promise<void | (() => void | Promise<void>)>

export const joinPath = (...parts: readonly string[]): string =>
  parts
    .filter((part) => part.length > 0)
    .join("/")
    .replaceAll("\\", "/")
    .replace(/\/+/gu, "/")
    .replace(/\/$/u, "")

export const readText = (tree: GeneratorTree, path: string): string | null => {
  if (!tree.exists(path)) {
    return null
  }

  const value = tree.read(path, "utf-8")
  if (value === null) {
    return null
  }

  return typeof value === "string" ? value : value.toString("utf8")
}

export const writeTextIfChanged = (tree: GeneratorTree, path: string, content: string): void => {
  const next = content.endsWith("\n") ? content : `${content}\n`

  if (readText(tree, path) === next) {
    return
  }

  tree.write(path, next)
}

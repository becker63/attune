export const normalizePath = (path: string): string =>
  path.replaceAll("\\", "/").replace(/\/+/gu, "/").replace(/\/$/u, "")

export const joinPath = (...parts: readonly string[]): string =>
  normalizePath(parts.filter((part) => part.length > 0).join("/"))

export const dirname = (path: string): string => {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf("/")
  return index === -1 ? "." : normalized.slice(0, index)
}

export const withoutExtension = (path: string): string => path.replace(/\.[^.]+$/u, "")

export const relativeModulePath = (fromFile: string, toFile: string): string => {
  const fromParts = dirname(fromFile).split("/").filter(Boolean)
  const toParts = withoutExtension(toFile).split("/").filter(Boolean)

  while (fromParts.length > 0 && toParts.length > 0 && fromParts[0] === toParts[0]) {
    fromParts.shift()
    toParts.shift()
  }

  const prefix = fromParts.map(() => "..")
  const relative = [...prefix, ...toParts].join("/")
  const withDot = relative.startsWith(".") ? relative : `./${relative}`
  return `${withDot}.js`
}

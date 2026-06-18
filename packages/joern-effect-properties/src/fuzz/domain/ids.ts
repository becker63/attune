export const fuzzRunId = (prefix = "joern-effect-fuzz", now = Date.now()): string =>
  `${prefix}-${now}`

export const slugId = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 96) || "id"

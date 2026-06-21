export interface AttunePiNames {
  readonly className: string
  readonly fileName: string
  readonly title: string
}

const words = (value: string): string[] =>
  value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .split(/[^A-Za-z0-9]+/u)
    .map((part) => part.trim())
    .filter(Boolean)

const capitalize = (value: string): string =>
  value.length === 0 ? value : `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`

export const toNames = (value: string): AttunePiNames => {
  const parts = words(value)
  const fallback = parts.length > 0 ? parts : ["generated"]

  return {
    className: fallback.map((part) => capitalize(part.toLowerCase())).join(""),
    fileName: fallback.map((part) => part.toLowerCase()).join("-"),
    title: fallback.map((part) => capitalize(part.toLowerCase())).join(" "),
  }
}

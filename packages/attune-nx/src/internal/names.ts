export interface AttuneNames {
  readonly className: string
  readonly constantName: string
  readonly fileName: string
  readonly propertyName: string
}

const words = (value: string): string[] =>
  value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .split(/[^A-Za-z0-9]+/u)
    .map((part) => part.trim())
    .filter(Boolean)

const capitalize = (value: string): string =>
  value.length === 0 ? value : `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`

export const toNames = (value: string): AttuneNames => {
  const parts = words(value)
  const fallback = parts.length > 0 ? parts : ["generated"]
  const className = fallback.map((part) => capitalize(part.toLowerCase())).join("")
  const propertyName = `${className[0]?.toLowerCase() ?? "g"}${className.slice(1)}`

  return {
    className,
    constantName: fallback.map((part) => part.toUpperCase()).join("_"),
    fileName: fallback.map((part) => part.toLowerCase()).join("-"),
    propertyName,
  }
}

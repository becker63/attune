import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect } from "effect"

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

export const AttunePiGeneratorNamesHandler = defineRecipeHandler<
  string,
  AttunePiNames
>({
  id: "attune-pi-agent.generator-names.handler",
  recipeId: "attune-pi-agent.generator-artifacts",
  sourcePath: "packages/attune/pi-agent/src/generators/internal/names.ts",
  exportName: "toNames",
  emitsReceipts: ["attune-pi-agent.generator-names.normalized"],
  handler: (value) => Effect.succeed(toNames(value)),
})

export const AttunePiGeneratorNamesRecipeModule = [
  AttunePiGeneratorNamesHandler,
] as const

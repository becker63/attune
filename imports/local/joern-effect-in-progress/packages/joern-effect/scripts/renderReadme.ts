import { readFile, writeFile } from "node:fs/promises"
import { Schema } from "effect"

const PackageJson = Schema.Struct({
  packageManager: Schema.optional(Schema.String),
})

const flake = await readFile("flake.nix", "utf8")
const template = await readFile("scripts/README.template.md", "utf8")
const packageJson = Schema.decodeUnknownSync(PackageJson)(
  JSON.parse(await readFile("package.json", "utf8")),
)

const readNixString = (name: string): string => {
  const match = flake.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, "u"))
  if (!match) throw new Error(`Could not find ${name} in flake.nix`)
  return match[1] ?? ""
}

const readNixPackage = (name: string): string => {
  const match = flake.match(new RegExp(`pkgs\\.${name}\\b`, "u"))
  if (!match) throw new Error(`Could not find pkgs.${name} in flake.nix`)
  return name
}

const replacements: Record<string, string> = {
  JOERN_VERSION: readNixString("joernVersion"),
  CPG_VERSION: readNixString("cpgVersion"),
  NODE_PACKAGE: readNixPackage("nodejs_22"),
  JDK_PACKAGE: readNixPackage("jdk21"),
  PNPM_PACKAGE_MANAGER: packageJson.packageManager ?? "pnpm",
}

const rendered = template.replace(/\{\{([A-Z0-9_]+)\}\}/gu, (_, key: string) => {
  const value = replacements[key]
  if (!value) throw new Error(`No README replacement for ${key}`)
  return value
})

await writeFile("README.md", rendered)

import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Schema } from "effect"

const PackageJson = Schema.Struct({
  packageManager: Schema.optional(Schema.String),
})

const workspaceRoot = join(import.meta.dirname, "..", "..", "..")
const packageRoot = join(workspaceRoot, "packages", "joern-effect")

const flake = await readFile(join(workspaceRoot, "flake.nix"), "utf8")
const joernToolchain = await readFile(
  join(workspaceRoot, "nix", "toolchains", "joern.nix"),
  "utf8",
)
const template = await readFile(join(packageRoot, "scripts", "README.template.md"), "utf8")
const packageJson = Schema.decodeUnknownSync(PackageJson)(
  JSON.parse(await readFile(join(workspaceRoot, "package.json"), "utf8")),
)

const readNixString = (name: string): string => {
  const match = joernToolchain.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, "u"))
  if (!match) throw new Error(`Could not find ${name} in nix/toolchains/joern.nix`)
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

await writeFile(join(packageRoot, "README.md"), rendered)

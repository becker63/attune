#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"

const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
const publicScripts = ["check", "codex:check", "codex:cloud-check", "arch:scan"]
const violations = publicScripts.flatMap((name) => {
  const command = packageJson.scripts?.[name] ?? ""
  return /\bcorepack\b|node_modules\/\.bin/u.test(command)
    ? [`${name} still exposes Corepack or node_modules/.bin: ${command}`]
    : []
})

const ignoredDirs = new Set([".attune", ".git", ".nx", "dist", "imports", "node_modules"])
const forbiddenBuckFileNames = new Set([".buckconfig", ".buckroot", "BUCK", "BUCK.v2"])
const activeConfigFileNames = new Set(["package.json", "project.json", "nx.json"])

const visit = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue

    const absolutePath = join(dir, entry.name)
    const relativePath = relative(".", absolutePath).split(sep).join("/")

    if (entry.isDirectory()) {
      if (entry.name === "buck-out") {
        violations.push(`${relativePath} is an active Buck/Buck2 output directory; move it under imports/ or remove it.`)
        continue
      }
      visit(absolutePath)
      continue
    }

    if (!entry.isFile()) continue

    if (forbiddenBuckFileNames.has(entry.name)) {
      violations.push(`${relativePath} reintroduces Buck/Buck2 active workflow configuration.`)
      continue
    }

    if (!activeConfigFileNames.has(entry.name)) continue
    const content = readFileSync(absolutePath, "utf8")
    if (/\bbuck2?\b/iu.test(content)) {
      violations.push(`${relativePath} references Buck/Buck2 in an active workflow config; use Nx/Nix and open a new OpenSpec before reintroducing Buck.`)
    }
  }
}

if (statSync(".", { throwIfNoEntry: false }) !== undefined) visit(".")

if (violations.length > 0) {
  console.error("Architecture scan failed:")
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log("Architecture scan passed: root package scripts are absent or delegate to Nx-owned targets without Corepack, node_modules/.bin, or active Buck/Buck2 workflow files.")

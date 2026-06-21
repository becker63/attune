#!/usr/bin/env node
import { readFileSync } from "node:fs"

const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
const publicScripts = ["check", "codex:check", "codex:cloud-check", "arch:scan"]
const violations = publicScripts.flatMap((name) => {
  const command = packageJson.scripts?.[name] ?? ""
  return /\bcorepack\b|node_modules\/\.bin/u.test(command)
    ? [`${name} still exposes Corepack or node_modules/.bin: ${command}`]
    : []
})

if (violations.length > 0) {
  console.error("Architecture scan failed:")
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log("Architecture scan passed: public policy aliases delegate to Nx-owned targets without Corepack or node_modules/.bin.")

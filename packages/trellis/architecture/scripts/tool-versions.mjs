#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const fail = (message) => {
  console.error(`Tool version check failed: ${message}`)
  process.exitCode = 1
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))

const readNixAttrSet = (path) => {
  if (!existsSync(path)) {
    fail(`missing ${path}`)
    return {}
  }

  const content = readFileSync(path, "utf8")
  return Object.fromEntries(
    [...content.matchAll(/^\s*([A-Za-z0-9_-]+)\s*=\s*"([^"]+)";/gmu)]
      .map((match) => [match[1], match[2]]),
  )
}

const commandVersion = (command, args = ["--version"]) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

  if (result.error !== undefined) {
    return {
      status: "unavailable",
      reason: result.error.code ?? result.error.message,
    }
  }

  const output = `${result.stdout}${result.stderr}`.trim()
  return {
    status: result.status === 0 ? "available" : "failed",
    exitCode: result.status,
    version: output.split(/\r?\n/u).find((line) => line.trim().length > 0) ?? "",
  }
}

const packageJson = readJson("package.json")
const pinned = readNixAttrSet("nix/lib/versions.nix")
const packageManager = String(packageJson.packageManager ?? "")
const pnpmMatch = /^pnpm@(.+)$/u.exec(packageManager)

if (pnpmMatch === null) {
  fail("package.json packageManager must be pnpm@<version>")
} else if (pinned.pnpm !== undefined && pnpmMatch[1] !== pinned.pnpm) {
  fail(`package.json packageManager pins pnpm ${pnpmMatch[1]}, but nix/lib/versions.nix pins ${pinned.pnpm}`)
}

for (const [name, value] of Object.entries({
  joern: pinned.joern,
  joernCpg: pinned.joernCpg,
  node: pinned.node,
  pnpm: pinned.pnpm,
})) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`nix/lib/versions.nix must pin ${name}`)
  }
}

const report = {
  schemaVersion: 1,
  kind: "attune.tool-versions",
  pinned: {
    node: pinned.node,
    pnpm: pinned.pnpm,
    joern: pinned.joern,
    joernCpg: pinned.joernCpg,
    packageManager,
  },
  observed: {
    node: commandVersion("node"),
    pnpm: commandVersion("pnpm"),
    nx: commandVersion("pnpm", ["exec", "nx", "--version"]),
    openspec: commandVersion("openspec", ["--version"]),
    joern: commandVersion(process.env.JOERN_BINARY ?? "joern", ["--version"]),
  },
  sources: {
    packageManager: "package.json",
    pinnedVersions: "nix/lib/versions.nix",
    nixToolchains: [
      "nix/toolchains/node.nix",
      "nix/toolchains/pnpm.nix",
      "nix/toolchains/joern.nix",
      "nix/toolchains/openspec.nix",
    ],
  },
}

console.log(JSON.stringify(report, null, 2))

#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const repoRoot = findRepoRoot(process.cwd())
const minimumNodeMajor = 22
const minimumNodeMinor = 12

if (!nodeVersionIsSupported(process.versions.node)) {
  reexecWithNixNode()
}

const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))
parsePnpmVersion(packageJson.packageManager)

process.env.NX_DAEMON ??= "false"
process.env.TMPDIR ??= "/tmp"
process.env.TEMP ??= process.env.TMPDIR
process.env.TMP ??= process.env.TMPDIR

const pnpm = await resolvePnpm()
const result = spawnSync(pnpm.command, pnpm.args.concat(process.argv.slice(2)), {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: false,
})

if (result.error !== undefined) {
  console.error(`failed to execute pnpm: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)

async function resolvePnpm() {
  const nativePnpm = findNativeExecutable("pnpm")
  if (nativePnpm !== undefined && commandWorks(nativePnpm, ["--version"])) {
    return { command: nativePnpm, args: [] }
  }

  reexecWithNixPnpm()
}

function findNativeExecutable(command) {
  const pathExt = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
    : [""]

  for (const directory of (process.env.PATH ?? "").split(pathDelimiter())) {
    if (directory.length === 0 || isWindowsPathFromWsl(directory)) {
      continue
    }

    for (const extension of pathExt) {
      const candidate = join(directory, `${command}${extension.toLowerCase()}`)
      if (existsSync(candidate) && commandWorks(candidate, ["--version"])) {
        return candidate
      }
      const upperCandidate = join(directory, `${command}${extension.toUpperCase()}`)
      if (existsSync(upperCandidate) && commandWorks(upperCandidate, ["--version"])) {
        return upperCandidate
      }
    }
  }

  return undefined
}

function commandWorks(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
  })

  return result.status === 0
}

function findRepoRoot(start) {
  let current = resolve(start)

  while (true) {
    if (existsSync(join(current, "package.json")) && existsSync(join(current, "pnpm-lock.yaml"))) {
      return current
    }

    const parent = dirname(current)
    if (parent === current) {
      throw new Error("could not locate Attune repo root")
    }
    current = parent
  }
}

function parsePnpmVersion(packageManager) {
  const match = String(packageManager ?? "").match(/^pnpm@([^+]+)(?:\+.+)?$/u)
  if (match === null) {
    throw new Error("package.json packageManager must be pnpm@<version>")
  }
  return match[1]
}

function pathDelimiter() {
  return process.platform === "win32" ? ";" : ":"
}

function isWindowsPathFromWsl(value) {
  return process.platform !== "win32" && /^\/mnt\/[a-z]\//iu.test(value)
}

function nodeVersionIsSupported(version) {
  const [majorRaw, minorRaw] = version.split(".")
  const major = Number(majorRaw ?? "0")
  const minor = Number(minorRaw ?? "0")

  return major > minimumNodeMajor || (major === minimumNodeMajor && minor >= minimumNodeMinor)
}

function reexecWithNixNode() {
  if (process.env.ATTUNE_NIX_NODE_REEXEC === "1") {
    console.error(`Attune requires Node ${minimumNodeMajor}.${minimumNodeMinor}+; current Node is ${process.version}.`)
    console.error("The Nix dev shell did not provide the expected Node runtime.")
    process.exit(1)
  }

  const nix = findNativeExecutable("nix")
  if (nix === undefined) {
    console.error(`Attune requires Node ${minimumNodeMajor}.${minimumNodeMinor}+; current Node is ${process.version}.`)
    console.error("Install Nix or run from the pinned Nix dev shell: nix develop --command node scripts/codex/pnpm.mjs ...")
    process.exit(1)
  }

  const result = spawnSync(
    nix,
    [
      "--extra-experimental-features",
      "nix-command",
      "--extra-experimental-features",
      "flakes",
      "develop",
      "--command",
      "env",
      "ATTUNE_NIX_NODE_REEXEC=1",
      "node",
      "scripts/codex/pnpm.mjs",
      ...process.argv.slice(2),
    ],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
      shell: false,
    },
  )

  if (result.error !== undefined) {
    console.error(`failed to re-exec through nix develop: ${result.error.message}`)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

function reexecWithNixPnpm() {
  if (process.env.ATTUNE_NIX_PNPM_REEXEC === "1") {
    console.error("Attune could not find pnpm on PATH inside the pinned Nix dev shell.")
    process.exit(1)
  }

  const nix = findNativeExecutable("nix")
  if (nix === undefined) {
    console.error("Attune requires pnpm from the pinned Nix dev shell.")
    console.error("Install Nix or run from the dev shell: nix develop --command pnpm ...")
    process.exit(1)
  }

  const result = spawnSync(
    nix,
    [
      "--extra-experimental-features",
      "nix-command",
      "--extra-experimental-features",
      "flakes",
      "develop",
      "--command",
      "env",
      "ATTUNE_NIX_PNPM_REEXEC=1",
      "node",
      "scripts/codex/pnpm.mjs",
      ...process.argv.slice(2),
    ],
    {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
      shell: false,
    },
  )

  if (result.error !== undefined) {
    console.error(`failed to re-exec through nix develop: ${result.error.message}`)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

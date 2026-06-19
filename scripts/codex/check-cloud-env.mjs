#!/usr/bin/env node
import { spawnSync } from "node:child_process"

const env = {
  ...process.env,
  NX_DAEMON: "false",
  TMPDIR: process.env.TMPDIR ?? "/tmp",
  TEMP: process.env.TEMP ?? process.env.TMPDIR ?? "/tmp",
  TMP: process.env.TMP ?? process.env.TMPDIR ?? "/tmp",
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
}

const commands = [
  ["node", ["scripts/codex/pnpm.mjs", "install", "--frozen-lockfile"]],
  ["node", ["scripts/codex/pnpm.mjs", "exec", "nx", "graph", "--file=/tmp/attune-nx-graph.json"]],
  ["node", ["scripts/codex/pnpm.mjs", "exec", "nx", "run", "attune-nx:typecheck"]],
  ["node", ["scripts/codex/pnpm.mjs", "exec", "nx", "run", "attuned-discovery:typecheck"]],
]

for (const [command, args] of commands) {
  console.log(`$ ${command} ${args.join(" ")}`)
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: false,
  })

  if (result.error !== undefined) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

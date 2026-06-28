import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const pluginName = "@attune/trellis-ls-opencode"
const pluginVersion = "0.0.0"
const capability = "trellisLsIntegration"

const writeProbe = ({ directory, worktree }) => {
  const probeDir = process.env.ATTUNE_OPENCODE_PLUGIN_PROBE_DIR
  if (!probeDir) return
  const probeFile = `${probeDir}/attune-trellis-ls-opencode.json`
  mkdirSync(dirname(probeFile), { recursive: true })
  writeFileSync(
    probeFile,
    JSON.stringify(
      {
        schemaVersion: 1,
        plugin: {
          name: pluginName,
          version: pluginVersion,
          loaded: true,
          capability,
        },
        directory,
        worktree,
        rawPromptIncluded: false,
        rawConversationIncluded: false,
      },
      null,
      2,
    ),
  )
}

export const AttuneTrellisLsPlugin = async ({ directory, worktree }) => {
  writeProbe({ directory, worktree })

  return {
    "shell.env": async (_input, output) => {
      output.env = {
        ...(output.env ?? {}),
        ATTUNE_TRELLIS_LS_PLUGIN: "1",
      }
    },
  }
}

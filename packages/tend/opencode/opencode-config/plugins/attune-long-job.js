import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const pluginName = "@attune/tend-long-job-opencode"
const pluginVersion = "0.0.0"
const capability = "longJobObservation"

const writeProbe = ({ directory, worktree }) => {
  const probeDir = process.env.ATTUNE_OPENCODE_PLUGIN_PROBE_DIR
  if (!probeDir) return
  const probeFile = `${probeDir}/attune-tend-long-job-opencode.json`
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

export const AttuneLongJobPlugin = async ({ directory, worktree }) => {
  writeProbe({ directory, worktree })

  return {
    "tool.execute.before": async (_input, output) => {
      output.metadata = {
        ...(output.metadata ?? {}),
        attuneLongJobObservation: "enabled",
      }
    },
  }
}

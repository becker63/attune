import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const pluginName = "@attune/tend-opencode"
const pluginVersion = "0.0.0"

const capabilities = {
  sessionDecode: true,
  commandObservation: true,
  tokenAudit: true,
  longJobObservation: true,
  trellisLsIntegration: true,
}

const writeProbe = (input) => {
  const probeDir = process.env.ATTUNE_OPENCODE_PLUGIN_PROBE_DIR
  const probeFile = process.env.ATTUNE_OPENCODE_PLUGIN_PROBE_FILE
    ?? (probeDir ? `${probeDir}/attune-tend-opencode.json` : undefined)
  if (!probeFile) return

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
          capability: "commandObservation",
        },
        directory: input.directory,
        worktree: input.worktree,
        capabilities,
        rawPromptIncluded: false,
        rawConversationIncluded: false,
      },
      null,
      2,
    ),
  )
}

export const AttuneTendPlugin = async ({ directory, worktree }) => {
  writeProbe({ directory, worktree })

  return {
    "tool.execute.before": async (_input, output) => {
      output.metadata = {
        ...(output.metadata ?? {}),
        attuneTendPlugin: pluginName,
      }
    },
  }
}

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
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

const traceValue = (value) => {
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }
  if (Array.isArray(value)) return value.map(traceValue)
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, traceValue(child)]))
}

const traceToolName = (input) =>
  input?.tool?.name
  ?? input?.toolName
  ?? input?.name
  ?? input?.tool
  ?? "opencode-tool"

const traceToolCallId = (input, phase) =>
  input?.toolCallID
  ?? input?.toolCallId
  ?? input?.id
  ?? `${process.env.ATTUNE_OPENCODE_TRACE_SESSION_ID ?? "opencode-session"}:${phase}:${Date.now()}`

const appendTraceEvent = (event) => {
  const traceFile = process.env.ATTUNE_OPENCODE_TRACE_FILE
  if (!traceFile) return
  mkdirSync(dirname(traceFile), { recursive: true })
  appendFileSync(traceFile, `${JSON.stringify(event)}\n`, "utf8")
}

const traceToolEvent = (phase, input, output) => {
  const toolName = String(traceToolName(input))
  const toolCallId = String(traceToolCallId(input, phase))
  appendTraceEvent({
    type: "tool",
    occurredAt: new Date().toISOString(),
    status: phase === "before" ? "started" : "succeeded",
    toolCallId,
    toolName,
    toolInputSummary: `${phase}:${toolName}`,
    toolResultSummary: output === undefined ? undefined : `output keys: ${Object.keys(output ?? {}).join(",")}`,
    input: traceValue(input),
    result: traceValue(output),
    metadata: {
      phase,
      plugin: pluginName,
      sessionId: process.env.ATTUNE_OPENCODE_TRACE_SESSION_ID,
    },
  })
}

export const AttuneTendPlugin = async ({ directory, worktree }) => {
  writeProbe({ directory, worktree })

  return {
    "tool.execute.before": async (input, output) => {
      traceToolEvent("before", input, output)
      output.metadata = {
        ...(output.metadata ?? {}),
        attuneTendPlugin: pluginName,
      }
    },
    "tool.execute.after": async (input, output) => {
      traceToolEvent("after", input, output)
      output.metadata = {
        ...(output.metadata ?? {}),
        attuneTendPlugin: pluginName,
      }
    },
  }
}

#!/usr/bin/env tsx
import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"

import { Context, Effect, Layer, Schema } from "effect"
import {
  RecipeInvocationSchema,
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineObservationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeInvocation,
} from "@attune/framework-protocol"
import {
  assertJsonFormat,
  assertMeasurementPhase,
  createOpenCodeDelegationEnv,
  createAttuneOpenCodeFingerprint,
  decodeOpenCodeSessionFileWithStoreEmission,
  observeCommandWithStoreEmission,
  renderJson,
  runDoctor,
  runHarnessSelfTest,
  tendOpenCodeCommandObservationInvocation,
} from "./cli-core.js"
import { runOpenSpecPacketCliWithStoreEmission } from "./contracts.js"
import type { TendOpenCodeBulkStoreEmission } from "./contracts.js"
import {
  type BenchmarkEvidenceTier,
  type BenchmarkLoopKind,
  type RecipeOnlyBenchmarkAction,
  type RecipeOnlyBenchmarkMode,
  type RecipeOnlyBenchmarkOptions,
} from "./benchmark.js"

type ParsedFlags = Readonly<Record<string, string | boolean>>

interface TendOpenCodeLiveTraceSmokeOutput {
  readonly schemaVersion: 1
  readonly command: "live-trace-smoke"
  readonly sessionId: string
  readonly traceFile?: string
  readonly storeEmission?: TendOpenCodeBulkStoreEmission
  readonly observationKinds: readonly string[]
  readonly observationCount: number
  readonly tokenEfficiency?: unknown
}

const tendOpenCodeAttuneCliEntryRecipeId = "tend-opencode.attune-cli-entry"
const tendOpenCodeAttuneCliEntryReceiptRecipeId = "tend-opencode.attune-cli-entry-receipt"
const tendOpenCodeAttuneCliSourcePath = "packages/tend/opencode/src/attune-cli.ts"

const TendOpenCodeAttuneCliEntryInputSchema = Schema.Struct({
  argv: Schema.Array(Schema.String),
  cwd: Schema.String,
})
type TendOpenCodeAttuneCliEntryInput = typeof TendOpenCodeAttuneCliEntryInputSchema.Type

const TendOpenCodeAttuneCliEntryOutputSchema = Schema.Struct({
  invocation: RecipeInvocationSchema,
})
type TendOpenCodeAttuneCliEntryOutput = typeof TendOpenCodeAttuneCliEntryOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeAttuneCliEntryResource = defineAlchemyResource({
  id: "tend-opencode.attune-cli-entry.workflow-target",
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: tendOpenCodeAttuneCliEntryRecipeId,
  consumedBy: [
    tendOpenCodeAttuneCliEntryRecipeId,
    tendOpenCodeAttuneCliEntryReceiptRecipeId,
  ],
  producedBy: [tendOpenCodeAttuneCliEntryRecipeId, tendOpenCodeAttuneCliEntryReceiptRecipeId],
  addressFields: ["argv", "cwd"],
  addressSchema: TendOpenCodeAttuneCliEntryInputSchema,
  stateSchema: TendOpenCodeAttuneCliEntryOutputSchema,
  modes: ["invoke", "observe", "read"],
  programmaticResourceExport: "createTendOpenCodeAttuneCliEntryInvocation",
  programmaticBridgeSourcePath: tendOpenCodeAttuneCliSourcePath,
})

export const createTendOpenCodeAttuneCliEntryInvocation = (
  input: TendOpenCodeAttuneCliEntryInput,
): TendOpenCodeAttuneCliEntryOutput => ({
  invocation: {
    recipeId: tendOpenCodeAttuneCliEntryRecipeId,
    action: "report",
    input,
    source: {
      surface: "cli",
      projectId: "tend-opencode",
      target: "tend-opencode",
      cwd: input.cwd,
    },
  },
})

export const TendOpenCodeAttuneCliEntryRecipe = defineInvocationRecipe({
  id: "tend-opencode.attune-cli-entry",
  projectId: "tend-opencode",
  title: "Expose the tend-opencode executable entrypoint as a recipe invocation adapter",
  inputSchema: TendOpenCodeAttuneCliEntryInputSchema,
  outputSchema: TendOpenCodeAttuneCliEntryOutputSchema,
  entrypoints: [tendOpenCodeAttuneCliSourcePath],
  allowedFiles: [tendOpenCodeAttuneCliSourcePath],
  validationEvidence: ["tend-opencode:typecheck", "tend-opencode:test"],
  io: {
    inputSchema: TendOpenCodeAttuneCliEntryInputSchema,
    outputSchema: TendOpenCodeAttuneCliEntryOutputSchema,
    inputResources: [TendOpenCodeAttuneCliEntryResource],
    outputResources: [TendOpenCodeAttuneCliEntryResource],
  },
// @attune-packet-target generated-runtime-projection eligible
  handler: defineRecipeHandler({
    id: "tend-opencode.attune-cli-entry.handler",
    recipeId: tendOpenCodeAttuneCliEntryRecipeId,
    sourcePath: tendOpenCodeAttuneCliSourcePath,
    exportName: "createTendOpenCodeAttuneCliEntryInvocation",
    emitsReceipts: ["recipe.invocation.created"],
    handler: (input: TendOpenCodeAttuneCliEntryInput) =>
      Effect.succeed(createTendOpenCodeAttuneCliEntryInvocation(input)),
  }),
})

export const TendOpenCodeAttuneCliEntryReceiptRecipe = defineObservationRecipe({
  id: "tend-opencode.attune-cli-entry-receipt",
  projectId: "tend-opencode",
  title: "Record tend-opencode entry invocations as local recipe receipt evidence",
  inputSchema: TendOpenCodeAttuneCliEntryOutputSchema,
  outputSchema: TendOpenCodeAttuneCliEntryOutputSchema,
  allowedFiles: [tendOpenCodeAttuneCliSourcePath],
  validationEvidence: ["tend-opencode:typecheck", "tend-opencode:test"],
  io: {
    inputSchema: TendOpenCodeAttuneCliEntryOutputSchema,
    outputSchema: TendOpenCodeAttuneCliEntryOutputSchema,
    inputResources: [TendOpenCodeAttuneCliEntryResource],
    outputResources: [TendOpenCodeAttuneCliEntryResource],
  },
// @attune-packet-target generated-runtime-projection eligible
  handler: defineRecipeHandler({
    id: "tend-opencode.attune-cli-entry-receipt.handler",
    recipeId: tendOpenCodeAttuneCliEntryReceiptRecipeId,
    sourcePath: tendOpenCodeAttuneCliSourcePath,
    exportName: "TendOpenCodeAttuneCliEntryReceiptRecipe",
    emitsReceipts: ["recipe.invocation.created"],
    handler: (input: TendOpenCodeAttuneCliEntryOutput) => Effect.succeed(input),
  }),
})

export const TendOpenCodeAttuneCliEntryReceiptDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "tend-opencode.attune-cli-entry",
  toRecipeId: "tend-opencode.attune-cli-entry-receipt",
  resource: TendOpenCodeAttuneCliEntryResource,
  kind: "observes",
  modes: ["invoke", "observe"],
})

export const TendOpenCodeAttuneCliRecipes = [
  TendOpenCodeAttuneCliEntryRecipe,
  TendOpenCodeAttuneCliEntryReceiptRecipe,
] as const

export interface TendOpenCodeUpstreamDelegationService {
  readonly delegate: (args: readonly string[]) => Effect.Effect<never>
}

export class TendOpenCodeUpstreamDelegationServices extends Context.Service<
  TendOpenCodeUpstreamDelegationServices,
  TendOpenCodeUpstreamDelegationService
>()("tend-opencode/UpstreamDelegationServices") {}

export const TendOpenCodeUpstreamDelegationLive = Layer.succeed(TendOpenCodeUpstreamDelegationServices, {
  delegate: (args) => Effect.promise(() => delegateToUpstream(args)),
})

export const TendOpenCodeUpstreamDelegationLayer = defineRecipeLayer({
  id: "tend-opencode.upstream-delegation.layer",
  sourcePath: "packages/tend/opencode/src/attune-cli.ts",
  exportName: "TendOpenCodeUpstreamDelegationLive",
  layer: TendOpenCodeUpstreamDelegationLive,
  provides: [{
    id: "tend-opencode.upstream-delegation.services",
    service: TendOpenCodeUpstreamDelegationServices,
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeUpstreamDelegationHandler = defineRecipeHandler({
  id: "tend-opencode.upstream-delegation.handler",
  recipeId: "tend-opencode.attune-cli-entry",
  sourcePath: "packages/tend/opencode/src/attune-cli.ts",
  exportName: "delegateToUpstream",
  layer: TendOpenCodeUpstreamDelegationLayer,
  emitsReceipts: ["opencode.upstream.delegated"],
  handler: (args: readonly string[]) =>
    Effect.gen(function* delegateTendOpenCodeUpstream() {
      const services = yield* TendOpenCodeUpstreamDelegationServices
      return yield* services.delegate(args)
    }),
})

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  const [command, ...rest] = argv
  const cliEntryInvocation: RecipeInvocation = createTendOpenCodeAttuneCliEntryInvocation({
    argv,
    cwd: process.cwd(),
  }).invocation
  void cliEntryInvocation
  if (command === undefined) await delegateToUpstream([])

  try {
    switch (command) {
      case "attune-help":
      case "tend-help":
      case "harness-help":
        writeHelp()
        process.exit(0)
      case "fingerprint": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        process.stdout.write(renderJson(createAttuneOpenCodeFingerprint({ harness: "tend-opencode" })))
        process.exit(0)
      }
      case "doctor": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        process.stdout.write(renderJson(runDoctor({ harness: "tend-opencode" })))
        process.exit(0)
      }
      case "run-harness-test": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const output = runHarnessSelfTest({ harness: "tend-opencode" })
        process.stdout.write(renderJson(output))
        process.exit(output.passed ? 0 : 1)
      }
      case "live-trace-smoke": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const output = await runLiveTraceSmoke(stringFlag(flags, "session-id"))
        process.stdout.write(renderJson(output))
        process.exit(output.storeEmission?.status === "failed" ? 1 : 0)
      }
      case "openspec": {
        const output = await runOpenSpecPacketCliWithStoreEmission(rest)
        process.stdout.write(renderJson(output))
        process.exit(output.storeEmission?.status === "failed" ? 1 : 0)
      }
      case "observe": {
        const { flags, command: observedCommand } = parseObserve(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const measurementPhase = assertMeasurementPhase(stringFlag(flags, "phase"))
        const measurementSessionId = stringFlag(flags, "session-id")
        const invocation: RecipeInvocation = tendOpenCodeCommandObservationInvocation({
          argv: observedCommand,
          cwd: process.cwd(),
          ...(measurementPhase === undefined ? {} : { measurementPhase }),
          ...(measurementSessionId === undefined ? {} : { measurementSessionId }),
        })
        void invocation
        const output = await observeCommandWithStoreEmission({
          command: observedCommand,
          ...(measurementPhase === undefined ? {} : { measurementPhase }),
          ...(measurementSessionId === undefined ? {} : { measurementSessionId }),
        })
        process.stdout.write(renderJson(output))
        process.exit(output.storeEmission.status === "failed" ? 1 : 0)
      }
      case "measurement-report": {
        const flags = parseFlags(rest)
        assertJsonFormat(stringFlag(flags, "format"))
        const reportsDir = stringFlag(flags, "reports-dir")
        const measurementSessionId = stringFlag(flags, "session-id")
        const exportOnly = booleanFlag(flags, "export-only")
        const dryRun = booleanFlag(flags, "dry-run")
        const input = {
          ...(reportsDir === undefined ? {} : { reportsDir }),
          ...(measurementSessionId === undefined ? {} : { measurementSessionId }),
          ...(exportOnly ? { exportOnly } : {}),
          ...(dryRun ? { dryRun } : {}),
        }
        const {
          tendOpenCodeMeasurementReportInvocation,
          writeMeasurementReports,
        } = await import("./measurement.js")
        const invocation: RecipeInvocation = tendOpenCodeMeasurementReportInvocation(input)
        void invocation
        const output = await writeMeasurementReports(input)
        process.stdout.write(renderJson(output))
        process.exit(output.storeEmission.status === "failed" ? 1 : 0)
      }
      case "benchmark": {
        const flags = parseFlags(rest)
        if (flags["help"] === true || flags["h"] === true) {
          writeHelp()
          process.exit(0)
        }
        assertJsonFormat(stringFlag(flags, "format"))
        const input = benchmarkOptionsFromFlags(flags)
        const {
          runRecipeOnlyWorktreeBenchmark,
          tendOpenCodeBenchmarkInvocation,
        } = await import("./benchmark.js")
        const invocation: RecipeInvocation = tendOpenCodeBenchmarkInvocation(input)
        void invocation
        const output = await runRecipeOnlyWorktreeBenchmark(input)
        process.stdout.write(renderJson(output))
        process.exit(output.storeEmission.status === "failed" ? 1 : 0)
      }
      default:
        await delegateToUpstream(process.argv.slice(2))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(2)
  }
}

const delegateToUpstream = async (args: readonly string[]): Promise<never> => {
  const upstream = process.env.ATTUNE_OPENCODE_UPSTREAM_PATH
  if (upstream === undefined || upstream.length === 0) {
    process.stderr.write("ATTUNE_OPENCODE_UPSTREAM_PATH is not configured.\n")
    process.exit(127)
  }
  const env = createOpenCodeDelegationEnv(process.env)
  const sessionId = env.ATTUNE_OPENCODE_TRACE_SESSION_ID ?? `opencode-live-${Date.now()}`
  const commandLine = ["opencode", ...args].join(" ")
  const startedAt = new Date().toISOString()
  const timeoutMs = delegationTimeoutMsFromEnv()
  appendDelegationTraceEvent(env, {
    type: "session",
    occurredAt: startedAt,
    recipeId: "tend-opencode.session-decoder",
    metadata: {
      args,
      upstream,
      cwd: process.cwd(),
    },
  })
  const result = childProcess.spawnSync(upstream, [...args], {
    stdio: ["inherit", "pipe", "pipe"],
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...(timeoutMs === undefined ? {} : { timeout: timeoutMs, killSignal: "SIGTERM" }),
    env,
  })
  const exitCode = typeof result.status === "number" ? result.status : 1
  const stdout = spawnOutputToString(result.stdout)
  const stderr = spawnOutputToString(result.stderr)
  if (stdout.length > 0) process.stdout.write(stdout)
  if (stderr.length > 0) process.stderr.write(stderr)
  const completedAt = new Date().toISOString()
  const estimatedTokens = estimatedDelegationTokens(args, stdout, stderr)
  if (result.error !== undefined) {
    const timedOut = spawnErrorCode(result.error) === "ETIMEDOUT"
    const failedExitCode = timedOut ? 124 : 127
    appendDelegationTraceEvent(env, {
      type: "command",
      occurredAt: completedAt,
      commandObservationId: "opencode-upstream-delegation",
      command: commandLine,
      status: "failed",
      outputClass: timedOut ? "delegation-timeout" : "delegation-error",
      tokens: estimatedTokens,
      payload: {
        error: result.error.message,
        errorCode: spawnErrorCode(result.error),
        timedOut,
        timeoutMs,
        stdout,
        stderr,
        stdoutBytes: Buffer.byteLength(stdout),
        stderrBytes: Buffer.byteLength(stderr),
        tokenMetricSource: "delegated-stdio-estimate",
      },
    })
    appendDelegatedReasoningTrace(env, sessionId, completedAt, args, stdout, stderr, "failed")
    await emitDelegatedTrace(env, args, failedExitCode)
    process.stderr.write(`${result.error.message}\n`)
    process.exit(failedExitCode)
  }
  appendDelegationTraceEvent(env, {
    type: "command",
    occurredAt: completedAt,
    commandObservationId: "opencode-upstream-delegation",
    command: commandLine,
    status: exitCode === 0 ? "succeeded" : "failed",
    outputClass: "upstream-delegation",
    tokens: estimatedTokens,
    payload: {
      exitCode,
      signal: result.signal,
      timeoutMs,
      stdout,
      stderr,
      stdoutBytes: Buffer.byteLength(stdout),
      stderrBytes: Buffer.byteLength(stderr),
      tokenMetricSource: "delegated-stdio-estimate",
    },
  })
  appendDelegatedReasoningTrace(
    env,
    sessionId,
    completedAt,
    args,
    stdout,
    stderr,
    exitCode === 0 ? "succeeded" : "failed",
  )
  await emitDelegatedTrace(env, args, exitCode)
  process.exit(exitCode)
}

const delegationTimeoutMsFromEnv = (): number | undefined => {
  const raw = process.env.ATTUNE_OPENCODE_DELEGATION_TIMEOUT_MS
  if (raw === undefined || raw.trim().length === 0) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined
}

const spawnErrorCode = (error: Error): string | undefined =>
  typeof (error as NodeJS.ErrnoException).code === "string"
    ? (error as NodeJS.ErrnoException).code
    : undefined

const spawnOutputToString = (value: string | Buffer | null | undefined): string => {
  if (typeof value === "string") return value
  if (Buffer.isBuffer(value)) return value.toString("utf8")
  return ""
}

const estimatedDelegationTokens = (
  args: readonly string[],
  stdout: string,
  stderr: string,
): {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
} => {
  const inputTokens = estimateTextTokens(args.join(" "))
  const outputTokens = estimateTextTokens(`${stdout}\n${stderr}`)
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  }
}

const estimateTextTokens = (text: string): number => {
  const normalized = text.trim()
  if (normalized.length === 0) return 0
  const wordish = normalized.split(/\s+/u).filter((part) => part.length > 0).length
  const charEstimate = Math.ceil(normalized.length / 4)
  return Math.max(1, wordish, charEstimate)
}

const appendDelegatedReasoningTrace = (
  env: NodeJS.ProcessEnv,
  sessionId: string,
  occurredAt: string,
  args: readonly string[],
  stdout: string,
  stderr: string,
  status: "succeeded" | "failed",
): void => {
  const output = stdout.length > 0 ? stdout : stderr
  appendDelegationTraceEvent(env, {
    type: "reasoning",
    occurredAt,
    status,
    reasoningTraceId: `${sessionId}:delegated-output-summary`,
    reasoningPhase: "upstream-output-summary",
    reasoningSummary: summarizeDelegatedReasoning(args, output, status),
    payload: {
      prompt: args.join(" "),
      outputSummary: summarizeText(output, 1200),
      stdoutBytes: Buffer.byteLength(stdout),
      stderrBytes: Buffer.byteLength(stderr),
      source: "delegated-stdio",
      hiddenChainOfThoughtExposed: false,
    },
    metadata: {
      tokenMetricSource: "delegated-stdio-estimate",
      note: "OpenCode provider-native token and hidden reasoning streams were not exposed; this row preserves exposed prompt/output reasoning context.",
    },
  })
}

const summarizeDelegatedReasoning = (
  args: readonly string[],
  output: string,
  status: "succeeded" | "failed",
): string => {
  const prompt = summarizeText(args.join(" "), 320)
  const summary = summarizeText(output, 900)
  return `Delegated OpenCode run ${status}. Prompt summary: ${prompt}. Output summary: ${summary}`
}

const summarizeText = (text: string, maxLength: number): string => {
  const normalized = text.replaceAll(/\s+/gu, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 16))}...[truncated]`
}

const appendDelegationTraceEvent = (
  env: NodeJS.ProcessEnv,
  event: Record<string, unknown>,
): void => {
  const traceFile = env.ATTUNE_OPENCODE_TRACE_FILE
  if (traceFile === undefined || traceFile.length === 0) return
  fs.mkdirSync(path.dirname(traceFile), { recursive: true })
  fs.appendFileSync(traceFile, `${JSON.stringify(event)}\n`, "utf8")
}

const emitDelegatedTrace = async (
  env: NodeJS.ProcessEnv,
  args: readonly string[],
  exitCode: number,
): Promise<Awaited<ReturnType<typeof decodeOpenCodeSessionFileWithStoreEmission>> | undefined> => {
  const traceFile = env.ATTUNE_OPENCODE_TRACE_FILE
  if (traceFile === undefined || traceFile.length === 0 || !fs.existsSync(traceFile)) return
  const events = fs.readFileSync(traceFile, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as Record<string, unknown>]
      } catch {
        return []
      }
    })
  if (events.length === 0) return
  const sessionId = env.ATTUNE_OPENCODE_TRACE_SESSION_ID
    ?? `opencode-live-${Date.now()}`
  const sessionFile = path.join(path.dirname(traceFile), `${sessionId}.session.json`)
  fs.writeFileSync(
    sessionFile,
    `${JSON.stringify({
      sessionId,
      startedAt: typeof events[0]?.occurredAt === "string" ? events[0].occurredAt : new Date().toISOString(),
      workspaceRoot: process.cwd(),
      events,
      metadata: {
        args,
        exitCode,
        traceFile,
      },
    }, null, 2)}\n`,
    "utf8",
  )
  const decoded = await decodeOpenCodeSessionFileWithStoreEmission(sessionFile)
  if (decoded.storeEmission?.status !== "emitted") {
    process.stderr.write(`tend-opencode trace emission status: ${decoded.storeEmission?.status ?? "unknown"}\n`)
  }
  return decoded
}

const runLiveTraceSmoke = async (
  requestedSessionId: string | undefined,
): Promise<TendOpenCodeLiveTraceSmokeOutput> => {
  const sessionId = requestedSessionId ?? `opencode-live-smoke-${Date.now()}`
  const env = createOpenCodeDelegationEnv({
    ...process.env,
    ATTUNE_OPENCODE_TRACE_SESSION_ID: sessionId,
  })
  const startedAt = new Date().toISOString()
  appendDelegationTraceEvent(env, {
    type: "session",
    occurredAt: startedAt,
    recipeId: "tend-opencode.session-decoder",
    metadata: {
      smoke: true,
      cwd: process.cwd(),
      command: "live-trace-smoke",
    },
    tokens: {
      inputTokens: 5,
      outputTokens: 2,
      totalTokens: 7,
    },
  })
  appendDelegationTraceEvent(env, {
    type: "tool",
    occurredAt: new Date().toISOString(),
    status: "succeeded",
    toolCallId: `${sessionId}:tool:1`,
    toolName: "tend-opencode.live-trace-smoke",
    toolInputSummary: "exercise live Tend/OpenCode wrapper trace ingestion",
    toolResultSummary: "synthetic live trace accepted",
    input: {
      sessionId,
      traceFile: env.ATTUNE_OPENCODE_TRACE_FILE,
    },
    result: {
      exitCode: 0,
      storeTarget: "framework_event.recipe_observation",
    },
    tokens: {
      inputTokens: 30,
      outputTokens: 12,
      cachedTokens: 6,
      totalTokens: 42,
    },
  })
  appendDelegationTraceEvent(env, {
    type: "reasoning",
    occurredAt: new Date().toISOString(),
    status: "succeeded",
    reasoningTraceId: `${sessionId}:reasoning:1`,
    reasoningPhase: "live-trace-smoke",
    reasoningSummary: "Verified the delegated Tend/OpenCode trace path can emit tool, reasoning, command, validation, token usage, and token-efficiency observations.",
    tokens: {
      inputTokens: 20,
      outputTokens: 10,
      reasoningTokens: 8,
      totalTokens: 30,
    },
  })
  appendDelegationTraceEvent(env, {
    type: "command",
    occurredAt: new Date().toISOString(),
    commandObservationId: `${sessionId}:command:1`,
    command: "tend-opencode live-trace-smoke",
    status: "succeeded",
    outputClass: "trace-smoke",
    payload: {
      stdout: "live trace smoke ok",
      stderr: "",
    },
    tokens: {
      inputTokens: 8,
      outputTokens: 4,
      totalTokens: 12,
    },
  })
  appendDelegationTraceEvent(env, {
    type: "validation",
    occurredAt: new Date().toISOString(),
    validationObservationId: `${sessionId}:validation:1`,
    validationTarget: "tend-opencode:live-trace-smoke",
    status: "succeeded",
    recipeId: "tend-opencode.session-decoder",
    tokens: {
      inputTokens: 5,
      outputTokens: 3,
      totalTokens: 8,
    },
  })
  const decoded = await emitDelegatedTrace(env, ["live-trace-smoke"], 0)
  return {
    schemaVersion: 1,
    command: "live-trace-smoke",
    sessionId,
    ...(env.ATTUNE_OPENCODE_TRACE_FILE === undefined ? {} : { traceFile: env.ATTUNE_OPENCODE_TRACE_FILE }),
    ...(decoded?.storeEmission === undefined ? {} : { storeEmission: decoded.storeEmission }),
    observationKinds: [...new Set(decoded?.decoded.observations.map((observation) => observation.observationKind) ?? [])],
    observationCount: decoded?.decoded.observations.length ?? 0,
    ...(() => {
      const tokenEfficiency = decoded?.decoded.observations.find((observation) =>
      observation.observationKind === "tend.token-efficiency"
      )?.payload
      return tokenEfficiency === undefined ? {} : { tokenEfficiency }
    })(),
  }
}

const parseFlags = (args: readonly string[]): ParsedFlags => {
  const flags: Record<string, string | boolean> = {}
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === undefined || !arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg ?? ""}`)
    }
    const name = arg.slice(2)
    const next = args[index + 1]
    if (next === undefined || next.startsWith("--")) {
      flags[name] = true
    } else {
      flags[name] = next
      index++
    }
  }
  return flags
}

const parseObserve = (
  args: readonly string[],
): { readonly flags: ParsedFlags; readonly command: readonly string[] } => {
  const separator = args.indexOf("--")
  if (separator < 0) throw new Error("Missing -- before observed command")
  return {
    flags: parseFlags(args.slice(0, separator)),
    command: args.slice(separator + 1),
  }
}

const stringFlag = (flags: ParsedFlags, name: string): string | undefined => {
  const value = flags[name]
  return typeof value === "string" ? value : undefined
}

const booleanFlag = (flags: ParsedFlags, name: string): boolean =>
  flags[name] === true

const benchmarkAction = (value: string | undefined): RecipeOnlyBenchmarkAction | undefined => {
  if (
    value === undefined
    || value === "plan"
    || value === "setup"
    || value === "judge"
    || value === "ingest"
    || value === "report"
    || value === "run"
    || value === "status"
  ) return value
  throw new Error(`Invalid benchmark --action: ${value}`)
}

const benchmarkModeFlag = (value: string | undefined): RecipeOnlyBenchmarkMode | undefined => {
  if (
    value === undefined
    || value === "live"
    || value === "dry-run"
    || value === "export-only"
  ) return value
  throw new Error(`Invalid benchmark --mode: ${value}`)
}

const benchmarkLoopKindFlag = (value: string | undefined): BenchmarkLoopKind | undefined => {
  if (
    value === undefined
    || value === "quick-turn"
    || value === "pair-turn"
    || value === "full-ab"
    || value === "audit"
  ) return value
  throw new Error(`Invalid benchmark --loop-kind: ${value}`)
}

const benchmarkEvidenceTierFlag = (value: string | undefined): BenchmarkEvidenceTier | undefined => {
  if (
    value === undefined
    || value === "exploratory"
    || value === "candidate"
    || value === "promotion-eligible"
  ) return value
  throw new Error(`Invalid benchmark --evidence-tier: ${value}`)
}

const benchmarkOptionsFromFlags = (flags: ParsedFlags): RecipeOnlyBenchmarkOptions => {
  const action = benchmarkAction(stringFlag(flags, "action"))
  const mode = benchmarkModeFlag(stringFlag(flags, "mode"))
  const loopKind = benchmarkLoopKindFlag(stringFlag(flags, "loop-kind"))
  const evidenceTier = benchmarkEvidenceTierFlag(stringFlag(flags, "evidence-tier"))
  const runId = stringFlag(flags, "run-id")
  const sessionId = stringFlag(flags, "session-id")
  const reportsDir = stringFlag(flags, "reports-dir")
  const codexHome = stringFlag(flags, "codex-home")
  const promptVariant = stringFlag(flags, "prompt-variant")
  const hypothesis = stringFlag(flags, "hypothesis")
  const opencodeTrellisThreadId = stringFlag(flags, "opencode-trellis-thread-id")
  const codexTrellisThreadId = stringFlag(flags, "codex-trellis-thread-id")
  const opencodeBlindThreadId = stringFlag(flags, "opencode-blind-thread-id")
  const codexBlindThreadId = stringFlag(flags, "codex-blind-thread-id")
  const opencodeEffectPacketsThreadId = stringFlag(flags, "opencode-effect-packets-thread-id")
  const codexEffectPacketsThreadId = stringFlag(flags, "codex-effect-packets-thread-id")
  const opencodeRawEffectThreadId = stringFlag(flags, "opencode-raw-effect-thread-id")
  const codexRawEffectThreadId = stringFlag(flags, "codex-raw-effect-thread-id")
  const opencodeTrellisRolloutPath = stringFlag(flags, "opencode-trellis-rollout")
  const codexTrellisRolloutPath = stringFlag(flags, "codex-trellis-rollout")
  const opencodeBlindRolloutPath = stringFlag(flags, "opencode-blind-rollout")
  const codexBlindRolloutPath = stringFlag(flags, "codex-blind-rollout")
  const opencodeEffectPacketsRolloutPath = stringFlag(flags, "opencode-effect-packets-rollout")
  const codexEffectPacketsRolloutPath = stringFlag(flags, "codex-effect-packets-rollout")
  const opencodeRawEffectRolloutPath = stringFlag(flags, "opencode-raw-effect-rollout")
  const codexRawEffectRolloutPath = stringFlag(flags, "codex-raw-effect-rollout")
  const controlThreadId = stringFlag(flags, "control-thread-id")
  const treatmentThreadId = stringFlag(flags, "treatment-thread-id")
  const controlRolloutPath = stringFlag(flags, "control-rollout")
  const treatmentRolloutPath = stringFlag(flags, "treatment-rollout")
  const timeoutMs = numberFlag(flags, "timeout-ms")
  return {
    ...(action === undefined ? {} : { action }),
    ...(mode === undefined ? {} : { mode }),
    ...(loopKind === undefined ? {} : { loopKind }),
    ...(evidenceTier === undefined ? {} : { evidenceTier }),
    ...(runId === undefined ? {} : { benchmarkRunId: runId }),
    ...(sessionId === undefined ? {} : { measurementSessionId: sessionId }),
    ...(reportsDir === undefined ? {} : { reportsDir }),
    ...(codexHome === undefined ? {} : { codexHome }),
    ...(promptVariant === undefined ? {} : { promptVariant }),
    ...(hypothesis === undefined ? {} : { hypothesis }),
    ...(opencodeTrellisThreadId === undefined ? {} : { opencodeTrellisThreadId }),
    ...(codexTrellisThreadId === undefined ? {} : { codexTrellisThreadId }),
    ...(opencodeBlindThreadId === undefined ? {} : { opencodeBlindThreadId }),
    ...(codexBlindThreadId === undefined ? {} : { codexBlindThreadId }),
    ...(opencodeEffectPacketsThreadId === undefined ? {} : { opencodeEffectPacketsThreadId }),
    ...(codexEffectPacketsThreadId === undefined ? {} : { codexEffectPacketsThreadId }),
    ...(opencodeRawEffectThreadId === undefined ? {} : { opencodeRawEffectThreadId }),
    ...(codexRawEffectThreadId === undefined ? {} : { codexRawEffectThreadId }),
    ...(opencodeTrellisRolloutPath === undefined ? {} : { opencodeTrellisRolloutPath }),
    ...(codexTrellisRolloutPath === undefined ? {} : { codexTrellisRolloutPath }),
    ...(opencodeBlindRolloutPath === undefined ? {} : { opencodeBlindRolloutPath }),
    ...(codexBlindRolloutPath === undefined ? {} : { codexBlindRolloutPath }),
    ...(opencodeEffectPacketsRolloutPath === undefined ? {} : { opencodeEffectPacketsRolloutPath }),
    ...(codexEffectPacketsRolloutPath === undefined ? {} : { codexEffectPacketsRolloutPath }),
    ...(opencodeRawEffectRolloutPath === undefined ? {} : { opencodeRawEffectRolloutPath }),
    ...(codexRawEffectRolloutPath === undefined ? {} : { codexRawEffectRolloutPath }),
    ...(controlThreadId === undefined ? {} : { controlThreadId }),
    ...(treatmentThreadId === undefined ? {} : { treatmentThreadId }),
    ...(controlRolloutPath === undefined ? {} : { controlRolloutPath }),
    ...(treatmentRolloutPath === undefined ? {} : { treatmentRolloutPath }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(booleanFlag(flags, "dry-run") ? { dryRun: true } : {}),
    ...(booleanFlag(flags, "export-only") ? { exportOnly: true } : {}),
    ...(booleanFlag(flags, "remove-worktrees") ? { keepWorktrees: false } : {}),
  }
}

const numberFlag = (flags: ParsedFlags, name: string): number | undefined => {
  const value = stringFlag(flags, name)
  if (value === undefined) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --${name}: ${value}`)
  return parsed
}

const writeHelp = (): void => {
  process.stdout.write([
    "tend-opencode",
    "",
    "Commands:",
    "  fingerprint --format json",
    "  doctor --format json",
    "  run-harness-test --format json",
    "  live-trace-smoke --format json [--session-id <id>]",
    "  openspec apply-packetized --change <change> --mode shadow|preview|active --format json",
    "  openspec packet-status --change <change> [--summary] --format json",
    "  openspec packet-loop --change <change> --until complete [--implementation-title <title>] [--score-only] --format json",
    "  observe --format json [--session-id <id>] [--phase baseline|treatment] -- <command...>",
    "  measurement-report --format json [--reports-dir reports/tend-opencode-codex-measurement] [--export-only|--dry-run]",
    "  benchmark --format json --action plan|setup|judge|ingest|report|run|status [--loop-kind quick-turn|pair-turn|full-ab|audit] [--evidence-tier exploratory|candidate|promotion-eligible] [--run-id <id>] [--timeout-ms <ms>] [--opencode-effect-packets-thread-id <id>] [--codex-effect-packets-thread-id <id>] [--opencode-raw-effect-thread-id <id>] [--codex-raw-effect-thread-id <id>] [--export-only|--dry-run]",
    "  tend-help",
    "  attune-help",
    "",
    "All other arguments delegate to the pinned upstream OpenCode runtime.",
    "",
  ].join("\n"))
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main()
}

import { Schema } from "effect"
import { TendOpenCodeDecodedSessionSchema } from "./index.js"

export const TendOpenCodeJsonFormatSchema = Schema.Literal("json")
export type TendOpenCodeJsonFormat = typeof TendOpenCodeJsonFormatSchema.Type

export const TendOpenCodeOutputFormatSchema = Schema.Literals(["json", "markdown"] as const)
export type TendOpenCodeOutputFormat = typeof TendOpenCodeOutputFormatSchema.Type

export const TendOpenCodeCapabilitiesSchema = Schema.Struct({
  sessionDecode: Schema.Boolean,
  commandObservation: Schema.Boolean,
  magicContext: Schema.Boolean,
  openRtk: Schema.Boolean,
  tokenAudit: Schema.Boolean,
  longJobObservation: Schema.Boolean,
  trellisLsIntegration: Schema.Boolean,
})
export type TendOpenCodeCapabilities = typeof TendOpenCodeCapabilitiesSchema.Type

export const AttuneOpenCodePluginFingerprintSchema = Schema.Struct({
  name: Schema.String,
  loaded: Schema.Boolean,
  version: Schema.String,
  capability: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
})
export type AttuneOpenCodePluginFingerprint =
  typeof AttuneOpenCodePluginFingerprintSchema.Type

export const AttuneOpenCodeSourceIdentitySchema = Schema.Struct({
  repoRoot: Schema.optional(Schema.String),
  flakeSource: Schema.optional(Schema.String),
  gitCommit: Schema.optional(Schema.String),
  gitDirty: Schema.optional(Schema.Boolean),
})
export type AttuneOpenCodeSourceIdentity =
  typeof AttuneOpenCodeSourceIdentitySchema.Type

export const AttuneOpenCodeRuntimeSchema = Schema.Struct({
  opencodePath: Schema.String,
  flakeProvided: Schema.Boolean,
  runtimeKind: Schema.Literals([
    "deterministic-attune-harness",
    "upstream-opencode",
  ] as const),
  upstreamIntegrated: Schema.Boolean,
  wrapperPath: Schema.optional(Schema.String),
  opencodeVersion: Schema.optional(Schema.String),
  configDir: Schema.optional(Schema.String),
  configPath: Schema.optional(Schema.String),
  slashCommandPath: Schema.optional(Schema.String),
  configContentPath: Schema.optional(Schema.String),
  pluginPath: Schema.optional(Schema.String),
  pluginPaths: Schema.optional(Schema.Array(Schema.String)),
  pluginPackagePaths: Schema.optional(Schema.Array(Schema.String)),
})
export type AttuneOpenCodeRuntime = typeof AttuneOpenCodeRuntimeSchema.Type

export const AttuneOpenCodeFingerprintSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  harness: Schema.String,
  harnessVersion: Schema.String,
  plugin: AttuneOpenCodePluginFingerprintSchema,
  plugins: Schema.Array(AttuneOpenCodePluginFingerprintSchema),
  source: AttuneOpenCodeSourceIdentitySchema,
  runtime: AttuneOpenCodeRuntimeSchema,
  capabilities: TendOpenCodeCapabilitiesSchema,
})
export type AttuneOpenCodeFingerprint =
  typeof AttuneOpenCodeFingerprintSchema.Type

export const TendOpenCodeCommandOutputSummarySchema = Schema.Struct({
  text: Schema.String,
  byteLength: Schema.Number,
  lineCount: Schema.Number,
  truncated: Schema.Boolean,
  sha256: Schema.String,
  redacted: Schema.Boolean,
})
export type TendOpenCodeCommandOutputSummary =
  typeof TendOpenCodeCommandOutputSummarySchema.Type

export const TendOpenCodeStoreEmissionSchema = Schema.Struct({
  status: Schema.Literals([
    "not-attempted",
    "emitted",
    "failed",
    "disabled",
    "export-only",
  ] as const),
  mode: Schema.String,
  observationId: Schema.String,
  databaseUrl: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
})
export type TendOpenCodeStoreEmission =
  typeof TendOpenCodeStoreEmissionSchema.Type

export const TendOpenCodeMeasurementPhaseSchema = Schema.Literals([
  "baseline",
  "treatment",
] as const)
export type TendOpenCodeMeasurementPhase =
  typeof TendOpenCodeMeasurementPhaseSchema.Type

export const TendOpenCodeCommandObservationOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("observe"),
  observationId: Schema.String,
  observationKind: Schema.Literal("measurement.command.observed"),
  measurementSessionId: Schema.optional(Schema.String),
  commandLine: Schema.String,
  argv: Schema.Array(Schema.String),
  cwd: Schema.String,
  startedAt: Schema.String,
  completedAt: Schema.String,
  durationMs: Schema.Number,
  exitCode: Schema.Number,
  status: Schema.Literals(["succeeded", "failed"] as const),
  stdoutSummary: TendOpenCodeCommandOutputSummarySchema,
  stderrSummary: TendOpenCodeCommandOutputSummarySchema,
  measurementPhase: Schema.optional(TendOpenCodeMeasurementPhaseSchema),
  knownNxTarget: Schema.optional(Schema.String),
  targetId: Schema.optional(Schema.String),
  recipeId: Schema.optional(Schema.String),
  inferredRecipeId: Schema.optional(Schema.String),
  tokenTotal: Schema.optional(Schema.Number),
  toolCalls: Schema.optional(Schema.Number),
  tokenMetricSource: Schema.optional(Schema.String),
  storeEmission: TendOpenCodeStoreEmissionSchema,
  rawOutputStored: Schema.Literal(false),
})
export type TendOpenCodeCommandObservationOutput =
  typeof TendOpenCodeCommandObservationOutputSchema.Type

export const TendOpenCodeDecodedOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("decode"),
  file: Schema.String,
  decoded: TendOpenCodeDecodedSessionSchema,
})
export type TendOpenCodeDecodedOutput =
  typeof TendOpenCodeDecodedOutputSchema.Type

export const TendOpenCodeSessionSummarySchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("summarize"),
  file: Schema.String,
  sessionId: Schema.String,
  workspaceRoot: Schema.String,
  eventCount: Schema.Number,
  toolCallCount: Schema.Number,
  tokenTotal: Schema.Number,
  commandCount: Schema.Number,
  validationCount: Schema.Number,
  receiptCount: Schema.Number,
  observationCount: Schema.Number,
  rawPromptIncluded: Schema.Boolean,
  rawConversationIncluded: Schema.Boolean,
})
export type TendOpenCodeSessionSummary =
  typeof TendOpenCodeSessionSummarySchema.Type

export const TendOpenCodeDoctorCheckSchema = Schema.Struct({
  name: Schema.String,
  command: Schema.Array(Schema.String),
  ok: Schema.Boolean,
  available: Schema.Boolean,
  durationMs: Schema.Number,
  exitCode: Schema.optional(Schema.Number),
  reason: Schema.optional(Schema.String),
  stdoutSummary: Schema.optional(TendOpenCodeCommandOutputSummarySchema),
  stderrSummary: Schema.optional(TendOpenCodeCommandOutputSummarySchema),
})
export type TendOpenCodeDoctorCheck = typeof TendOpenCodeDoctorCheckSchema.Type

export const TendOpenCodeDoctorOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("doctor"),
  harness: Schema.String,
  fingerprint: AttuneOpenCodeFingerprintSchema,
  checks: Schema.Array(TendOpenCodeDoctorCheckSchema),
})
export type TendOpenCodeDoctorOutput =
  typeof TendOpenCodeDoctorOutputSchema.Type

export const TendOpenCodeHarnessTestCheckSchema = Schema.Struct({
  name: Schema.String,
  passed: Schema.Boolean,
  detail: Schema.optional(Schema.String),
})
export type TendOpenCodeHarnessTestCheck =
  typeof TendOpenCodeHarnessTestCheckSchema.Type

export const TendOpenCodeHarnessTestOutputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  command: Schema.Literal("run-harness-test"),
  passed: Schema.Boolean,
  fingerprint: AttuneOpenCodeFingerprintSchema,
  checks: Schema.Array(TendOpenCodeHarnessTestCheckSchema),
  decoded: Schema.Struct({
    eventCount: Schema.Number,
    receiptCount: Schema.Number,
    observationCount: Schema.Number,
  }),
  upstream: Schema.Struct({
    available: Schema.Boolean,
    command: Schema.Array(Schema.String),
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
  }),
  slashCommand: Schema.Struct({
    installed: Schema.Boolean,
    path: Schema.String,
    invokesFingerprint: Schema.Boolean,
  }),
  actualPlugin: Schema.Struct({
    loaded: Schema.Boolean,
    skipped: Schema.Boolean,
    name: Schema.String,
    path: Schema.String,
    command: Schema.Array(Schema.String),
    durationMs: Schema.Number,
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
    stdoutSummary: TendOpenCodeCommandOutputSummarySchema,
    stderrSummary: TendOpenCodeCommandOutputSummarySchema,
    probe: Schema.Struct({
      observed: Schema.Boolean,
      rawPromptIncluded: Schema.Boolean,
      rawConversationIncluded: Schema.Boolean,
    }),
  }),
  actualPlugins: Schema.Array(Schema.Struct({
    loaded: Schema.Boolean,
    skipped: Schema.Boolean,
    name: Schema.String,
    capability: Schema.String,
    path: Schema.String,
    durationMs: Schema.Number,
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
    probe: Schema.Struct({
      observed: Schema.Boolean,
      rawPromptIncluded: Schema.Boolean,
      rawConversationIncluded: Schema.Boolean,
    }),
  })),
  pluginHookExercise: Schema.Struct({
    passed: Schema.Boolean,
    skipped: Schema.Boolean,
    command: Schema.Array(Schema.String),
    durationMs: Schema.Number,
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
    stdoutSummary: TendOpenCodeCommandOutputSummarySchema,
    stderrSummary: TendOpenCodeCommandOutputSummarySchema,
    entries: Schema.Array(Schema.Struct({
      name: Schema.String,
      capability: Schema.String,
      packagePath: Schema.String,
      hook: Schema.String,
      passed: Schema.Boolean,
      skipped: Schema.Boolean,
      observedKey: Schema.String,
      observedValue: Schema.optional(Schema.String),
      reason: Schema.optional(Schema.String),
    })),
  }),
  commandObservation: TendOpenCodeCommandObservationOutputSchema,
  rawTraceRequired: Schema.Boolean,
  leakageCheck: Schema.Struct({
    rawPromptPresent: Schema.Boolean,
    rawConversationPresent: Schema.Boolean,
  }),
})
export type TendOpenCodeHarnessTestOutput =
  typeof TendOpenCodeHarnessTestOutputSchema.Type

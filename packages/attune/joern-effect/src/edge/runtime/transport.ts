import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineDiagnosticRecipe,
  defineInvocationRecipe,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { escapeScalaString } from "./emitCpgql.js"
import { JoernHttpError } from "./errors.js"
import type { JsonValue } from "./json.js"

const joernTransportQueryRecipeId = "joern-effect.transport-query"
const joernImportCodeRecipeId = "joern-effect.import-code"
const joernReadinessProbeRecipeId = "joern-effect.readiness-probe"
const joernClientRuntimeRecipeId = "joern-effect.joern-client-runtime"
const joernServerLifecycleRecipeId = "joern-effect.server-lifecycle"
const joernTransportRuntimeSourcePath = "packages/attune/joern-effect/src/edge/runtime/transport.ts"
const joernImportCodeAlchemyBindingId = "joern-effect.import-code.alchemy" as const
const joernTransportProviderId = "joern-effect.transport-provider" as const
const joernImportCodeTransportSubstrateId = "joern-effect.import-code.transport" as const

export type JoernTransport = {
  readonly execute: (
    baseUrl: string,
    cpgql: string,
  ) => Effect.Effect<string, JoernHttpError>
  readonly importCode: (
    baseUrl: string,
    repoPath: string,
    projectName: string,
    frontend?: JoernImportFrontend,
  ) => Effect.Effect<void, JoernHttpError>
  readonly ready: (baseUrl: string) => Effect.Effect<boolean, never>
}

export type JoernImportFrontend = "auto" | "jssrc"

export const JoernTransportExecuteInputSchema = Schema.Struct({
  baseUrl: Schema.String,
  cpgql: Schema.String,
})
export type JoernTransportExecuteInput = typeof JoernTransportExecuteInputSchema.Type

export const JoernTransportExecuteOutputSchema = Schema.Struct({
  body: Schema.String,
})
export type JoernTransportExecuteOutput = typeof JoernTransportExecuteOutputSchema.Type

export const JoernImportCodeInputSchema = Schema.Struct({
  baseUrl: Schema.String,
  repoPath: Schema.String,
  projectName: Schema.String,
  frontend: Schema.optional(Schema.String),
})
export type JoernImportCodeInput = typeof JoernImportCodeInputSchema.Type

export const JoernImportCodeOutputSchema = Schema.Struct({
  repoPath: Schema.String,
  projectName: Schema.String,
  imported: Schema.Boolean,
})
export type JoernImportCodeOutput = typeof JoernImportCodeOutputSchema.Type

export const JoernReadinessProbeInputSchema = Schema.Struct({
  baseUrl: Schema.String,
})
export type JoernReadinessProbeInput = typeof JoernReadinessProbeInputSchema.Type

export const JoernReadinessProbeOutputSchema = Schema.Struct({
  ready: Schema.Boolean,
})
export type JoernReadinessProbeOutput = typeof JoernReadinessProbeOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernTransportResource = defineAlchemyResource({
  id: "joern-effect.transport-query.resource",
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  ownerRecipeId: joernTransportQueryRecipeId,
  producedBy: [joernTransportQueryRecipeId],
  consumedBy: [joernTransportQueryRecipeId, joernImportCodeRecipeId, joernClientRuntimeRecipeId],
  addressFields: ["baseUrl", "cpgql"],
  addressSchema: JoernTransportExecuteInputSchema as never,
  stateSchema: JoernTransportExecuteOutputSchema as never,
  modes: ["invoke", "read", "check"],
  programmaticResourceExport: "JoernTransportRuntimeLive",
  programmaticBridgeSourcePath: joernTransportRuntimeSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernImportCodeResource = defineAlchemyResource({
  id: "joern-effect.import-code.resource",
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  ownerRecipeId: joernImportCodeRecipeId,
  producedBy: [joernImportCodeRecipeId],
  consumedBy: [joernImportCodeRecipeId, joernServerLifecycleRecipeId],
  addressFields: ["baseUrl", "repoPath", "projectName"],
  addressSchema: JoernImportCodeInputSchema as never,
  stateSchema: JoernImportCodeOutputSchema as never,
  modes: ["plan", "apply", "check", "invoke"],
  programmaticResourceExport: "JoernTransportRuntimeLive",
  programmaticBridgeSourcePath: joernTransportRuntimeSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernReadinessProbeResource = defineAlchemyResource({
  id: "joern-effect.readiness-probe.resource",
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  ownerRecipeId: joernReadinessProbeRecipeId,
  producedBy: [joernReadinessProbeRecipeId],
  consumedBy: [joernReadinessProbeRecipeId, joernServerLifecycleRecipeId],
  addressFields: ["baseUrl"],
  addressSchema: JoernReadinessProbeInputSchema as never,
  stateSchema: JoernReadinessProbeOutputSchema as never,
  modes: ["check", "read", "observe"],
  programmaticResourceExport: "JoernTransportRuntimeLive",
  programmaticBridgeSourcePath: joernTransportRuntimeSourcePath,
})

export const renderImportCode = (
  repoPath: string,
  projectName: string,
  frontend: JoernImportFrontend = "jssrc",
): string => {
  const args = `inputPath="${escapeScalaString(repoPath)}", projectName="${escapeScalaString(projectName)}"`
  return frontend === "auto"
    ? `importCode(${args})`
    : `importCode.${frontend}(${args})`
}

const postJson = (
  url: string,
  body: JsonValue,
  query?: string,
): Effect.Effect<string, JoernHttpError> =>
  Effect.tryPromise({
    catch: (cause) =>
      cause instanceof JoernHttpError
        ? cause
        : new JoernHttpError({
            message: "Joern HTTP request failed",
            status: 0,
            body: String(cause),
            ...(query === undefined ? {} : { query }),
          }),
    try: async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const text = await response.text()
      if (!response.ok) {
        throw new JoernHttpError({
          message: `Joern HTTP request failed with status ${response.status}`,
          status: response.status,
          body: text,
          ...(query === undefined ? {} : { query }),
        })
      }
      return text
    },
  })

const JoernQueryResponse = Schema.Struct({
  stderr: Schema.optional(Schema.String),
  stdout: Schema.optional(Schema.String),
  success: Schema.optional(Schema.Boolean),
})

const decodeJoernQueryResponse = (body: string): Effect.Effect<
  Schema.Schema.Type<typeof JoernQueryResponse>,
  JoernHttpError
> =>
  Effect.try({
    catch: (cause) =>
      new JoernHttpError({
        body: String(cause),
        message: "Joern query response was not valid JSON",
        status: 0,
      }),
    try: () => JSON.parse(body),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknown(JoernQueryResponse)),
    Effect.mapError((cause) =>
      new JoernHttpError({
        body: String(cause),
        message: "Joern query response did not match expected schema",
        status: 0,
      }),
    ),
  )

const ansiEscapePattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu")

const stripAnsi = (value: string): string =>
  value.replace(ansiEscapePattern, "")

const parseScalaStringResult = (value: string): string | undefined => {
  const quoted = value.match(/^val\s+res\d+:\s+String\s+=\s+("(?:(?:\\.)|[^"\\])*")$/su)
  if (quoted) {
    return JSON.parse(quoted[1]!) as string
  }

  const tripleQuoted = value.match(/^val\s+res\d+:\s+String\s+=\s+"""([\s\S]*)"""$/u)
  if (tripleQuoted) {
    return tripleQuoted[1]!
  }

  return undefined
}

const extractFinalStringResult = (stdout: string): string => {
  const clean = stripAnsi(stdout).trim()
  const direct = parseScalaStringResult(clean)
  if (direct !== undefined) {
    return direct
  }

  const lines = clean.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
  const last = lines.at(-1)
  const fromLast = last ? parseScalaStringResult(last) : undefined
  if (fromLast !== undefined) {
    return fromLast
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    if (line?.startsWith("{") || line?.startsWith("[")) {
      return line
    }
  }

  return stdout
}

export const executeJoernTransportRequest = (
  input: JoernTransportExecuteInput,
): Effect.Effect<JoernTransportExecuteOutput, JoernHttpError> =>
  postJson(`${input.baseUrl}/query-sync`, { query: input.cpgql }, input.cpgql).pipe(
    Effect.flatMap((body) =>
      decodeJoernQueryResponse(body).pipe(Effect.map((decoded) => ({ body, decoded }))),
    ),
    Effect.flatMap(({ body, decoded }) => {
      if (decoded.success === false) {
        return Effect.fail(
          new JoernHttpError({
            body: decoded.stderr || decoded.stdout || body,
            message: "Joern query failed",
            query: input.cpgql,
            status: 200,
          }),
        )
      }
      return Effect.succeed({ body: extractFinalStringResult(decoded.stdout ?? body) })
    }),
  )

const normalizeImportFrontend = (frontend: string | undefined): JoernImportFrontend | undefined =>
  frontend === "auto" || frontend === "jssrc" ? frontend : undefined

export const runJoernImportCode = (
  input: JoernImportCodeInput,
): Effect.Effect<JoernImportCodeOutput, JoernHttpError> =>
  executeJoernTransportRequest({
    baseUrl: input.baseUrl,
    cpgql: renderImportCode(
      input.repoPath,
      input.projectName,
      normalizeImportFrontend(input.frontend),
    ),
  }).pipe(
    Effect.flatMap(({ body }) =>
      body.includes("None")
        ? Effect.fail(
            new JoernHttpError({
              body,
              message: "Joern importCode returned None",
              status: 0,
            }),
          )
        : Effect.succeed({
            repoPath: input.repoPath,
            projectName: input.projectName,
            imported: true,
          }),
    ),
  )

export const checkJoernTransportReady = (
  input: JoernReadinessProbeInput,
): Effect.Effect<JoernReadinessProbeOutput, never> =>
  postJson(`${input.baseUrl}/query-sync`, { query: "1 + 1" }).pipe(
    Effect.flatMap(decodeJoernQueryResponse),
    Effect.map((body) => ({ ready: body.success === true })),
    Effect.catchAll(() => Effect.succeed({ ready: false })),
  )

export const defaultTransport: JoernTransport = {
  execute: (baseUrl, query) =>
    executeJoernTransportRequest({ baseUrl, cpgql: query }).pipe(
      Effect.map((output) => output.body),
    ),
  importCode: (baseUrl, repoPath, projectName, frontend = "jssrc") =>
    runJoernImportCode({
      baseUrl,
      repoPath,
      projectName,
      frontend,
    }).pipe(
      Effect.asVoid,
    ),
  ready: (baseUrl) =>
    checkJoernTransportReady({ baseUrl }).pipe(
      Effect.map((output) => output.ready),
    ),
}

export interface JoernTransportRuntimeService {
  readonly execute: (
    input: JoernTransportExecuteInput,
  ) => Effect.Effect<JoernTransportExecuteOutput, JoernHttpError>
  readonly importCode: (
    input: JoernImportCodeInput,
  ) => Effect.Effect<JoernImportCodeOutput, JoernHttpError>
  readonly ready: (
    input: JoernReadinessProbeInput,
  ) => Effect.Effect<JoernReadinessProbeOutput>
}

export class JoernTransportRuntime extends Context.Tag("joern-effect/TransportRuntime")<
  JoernTransportRuntime,
  JoernTransportRuntimeService
>() {}

export const JoernTransportRuntimeLive = Layer.succeed(JoernTransportRuntime, {
  execute: executeJoernTransportRequest,
  importCode: runJoernImportCode,
  ready: checkJoernTransportReady,
})

export const JoernTransportRuntimeLayer = defineRecipeLayer({
  id: "joern-effect.transport-runtime.layer",
  sourcePath: joernTransportRuntimeSourcePath,
  exportName: "JoernTransportRuntimeLive",
  layer: JoernTransportRuntimeLive as never,
  provides: [{
    id: "joern-effect.transport-runtime.service",
    service: JoernTransportRuntime as never,
  }],
})

export const executeJoernTransportViaLayer = (
  input: JoernTransportExecuteInput,
): Effect.Effect<JoernTransportExecuteOutput, JoernHttpError, JoernTransportRuntime> =>
  Effect.gen(function* executeJoernTransportViaLayerBody() {
    const runtime = yield* JoernTransportRuntime
    return yield* runtime.execute(input)
  })

export const importCodeViaJoernTransportLayer = (
  input: JoernImportCodeInput,
): Effect.Effect<JoernImportCodeOutput, JoernHttpError, JoernTransportRuntime> =>
  Effect.gen(function* importCodeViaJoernTransportLayerBody() {
    const runtime = yield* JoernTransportRuntime
    return yield* runtime.importCode(input)
  })

export const checkJoernTransportReadyViaLayer = (
  input: JoernReadinessProbeInput,
): Effect.Effect<JoernReadinessProbeOutput, never, JoernTransportRuntime> =>
  Effect.gen(function* checkJoernTransportReadyViaLayerBody() {
    const runtime = yield* JoernTransportRuntime
    return yield* runtime.ready(input)
  })

export const JoernTransportQueryHandler = defineRecipeHandler<
  JoernTransportExecuteInput,
  JoernTransportExecuteOutput,
  JoernHttpError,
  JoernTransportRuntime
>({
  id: "joern-effect.transport-query.handler",
  recipeId: joernTransportQueryRecipeId,
  sourcePath: joernTransportRuntimeSourcePath,
  exportName: "executeJoernTransportViaLayer",
  layer: JoernTransportRuntimeLayer,
  emitsReceipts: ["joern.transport.query.executed"],
  handler: (input) => executeJoernTransportViaLayer(input) as never,
})

export const JoernImportCodeHandler = defineRecipeHandler<
  JoernImportCodeInput,
  JoernImportCodeOutput,
  JoernHttpError,
  JoernTransportRuntime
>({
  id: "joern-effect.import-code.handler",
  recipeId: joernImportCodeRecipeId,
  sourcePath: joernTransportRuntimeSourcePath,
  exportName: "importCodeViaJoernTransportLayer",
  layer: JoernTransportRuntimeLayer,
  emitsReceipts: ["joern.import-code.applied"],
  handler: (input) => importCodeViaJoernTransportLayer(input) as never,
})

export const JoernReadinessProbeHandler = defineRecipeHandler<
  JoernReadinessProbeInput,
  JoernReadinessProbeOutput,
  never,
  JoernTransportRuntime
>({
  id: "joern-effect.readiness-probe.handler",
  recipeId: joernReadinessProbeRecipeId,
  sourcePath: joernTransportRuntimeSourcePath,
  exportName: "checkJoernTransportReadyViaLayer",
  layer: JoernTransportRuntimeLayer,
  emitsReceipts: ["joern.readiness.checked"],
  handler: (input) => checkJoernTransportReadyViaLayer(input) as never,
})

export const JoernTransportQueryRecipe = defineInvocationRecipe({
  id: joernTransportQueryRecipeId,
  projectId: "joern-effect",
  title: "Execute Joern HTTP CPGQL requests through a typed Effect transport",
  inputSchema: JoernTransportExecuteInputSchema as never,
  outputSchema: JoernTransportExecuteOutputSchema as never,
  allowedFiles: [joernTransportRuntimeSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernTransportExecuteInputSchema as never,
    outputSchema: JoernTransportExecuteOutputSchema as never,
    inputResources: [JoernTransportResource],
    outputResources: [JoernTransportResource],
  },
  handler: JoernTransportQueryHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernTransportQueryRecipeId,
      toRecipeId: joernClientRuntimeRecipeId,
      resource: JoernTransportResource,
      kind: "invokes",
      modes: ["invoke", "read"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernTransportQueryRecipeId,
      toRecipeId: joernImportCodeRecipeId,
      resource: JoernTransportResource,
      kind: "invokes",
      modes: ["invoke", "read"],
    }),
  ],
})

export const JoernImportCodeRecipe = defineManagedRecipe({
  id: joernImportCodeRecipeId,
  projectId: "joern-effect",
  title: "Manage Joern project imports as typed runtime state",
  inputSchema: JoernImportCodeInputSchema as never,
  outputSchema: JoernImportCodeOutputSchema as never,
  allowedFiles: [joernTransportRuntimeSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernImportCodeInputSchema as never,
    outputSchema: JoernImportCodeOutputSchema as never,
    inputResources: [JoernTransportResource],
    outputResources: [JoernImportCodeResource],
  },
  handler: JoernImportCodeHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernImportCodeRecipeId,
      toRecipeId: joernServerLifecycleRecipeId,
      resource: JoernImportCodeResource,
      kind: "manages",
      modes: ["plan", "apply", "check"],
    }),
  ],
// @attune-packet-target generated-runtime-projection eligible
  alchemy: defineManagedRecipeAlchemyBinding({
    id: joernImportCodeAlchemyBindingId,
    managedRecipeId: joernImportCodeRecipeId,
    alchemyResourceType: "attune:alchemy:ManagedRecipe",
    providerId: joernTransportProviderId,
    resource: JoernImportCodeResource,
    lifecycle: {
      plan: "renderImportCode",
      apply: "importCodeViaJoernTransportLayer",
      check: "checkJoernTransportReadyViaLayer",
      read: "runJoernImportCode",
      diff: "renderImportCode",
    },
  }),
  lifecycle: ["plan", "apply", "check", "prune"],
  resourceKind: "joern-project-import",
  lifecycleSubstrates: [{
    id: joernImportCodeTransportSubstrateId,
    kind: "query-service",
    tool: "joern-http",
    lifecycleActions: ["plan", "apply", "check"],
    evidence: ["nx run joern-effect:test"],
  }],
  observedState: { imported: false },
  humanReviewRequired: true,
})

export const JoernReadinessProbeRecipe = defineDiagnosticRecipe({
  id: joernReadinessProbeRecipeId,
  projectId: "joern-effect",
  title: "Diagnose Joern HTTP server readiness through a typed transport probe",
  inputSchema: JoernReadinessProbeInputSchema as never,
  outputSchema: JoernReadinessProbeOutputSchema as never,
  allowedFiles: [joernTransportRuntimeSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernReadinessProbeInputSchema as never,
    outputSchema: JoernReadinessProbeOutputSchema as never,
    inputResources: [JoernReadinessProbeResource],
    outputResources: [JoernReadinessProbeResource],
  },
  handler: JoernReadinessProbeHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernReadinessProbeRecipeId,
      toRecipeId: joernServerLifecycleRecipeId,
      resource: JoernReadinessProbeResource,
      kind: "diagnoses",
      modes: ["check", "read", "observe"],
    }),
  ],
})

export const JoernTransportRuntimeRecipes = [
  JoernTransportQueryRecipe,
  JoernImportCodeRecipe,
  JoernReadinessProbeRecipe,
] as const

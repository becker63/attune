import { Effect, Schema } from "effect"

export class InvariantPackage extends Schema.Class<InvariantPackage>(
  "InvariantPackage",
)({
  allowedPaths: Schema.optional(Schema.Array(Schema.String)),
  claim: Schema.String,
  counterexamples: Schema.optional(Schema.Array(Schema.String)),
  description: Schema.String,
  examples: Schema.optional(Schema.Array(Schema.String)),
  forbiddenPaths: Schema.optional(Schema.Array(Schema.String)),
  forkRules: Schema.Array(Schema.String),
  forkTargets: Schema.Array(Schema.String),
  id: Schema.String,
  pack: Schema.String,
  phase: Schema.optional(Schema.String),
  properties: Schema.Array(Schema.String),
  propertyTargets: Schema.Array(Schema.String),
  telemetryQueries: Schema.Array(Schema.String),
  title: Schema.String,
  zone: Schema.optional(Schema.String),
}) {}

export class ForkZone extends Schema.Class<ForkZone>("ForkZone")({
  description: Schema.optional(Schema.String),
  name: Schema.String,
  paths: Schema.Array(Schema.String),
}) {}

export class ForkPhase extends Schema.Class<ForkPhase>("ForkPhase")({
  allowedRules: Schema.optional(Schema.Array(Schema.String)),
  description: Schema.String,
  forbiddenImports: Schema.optional(Schema.Array(Schema.String)),
  invariants: Schema.Array(Schema.String),
  minimumSeverity: Schema.optional(Schema.Literal("error")),
  name: Schema.String,
  oxlintArgs: Schema.optional(Schema.Array(Schema.String)),
  requiredRules: Schema.optional(Schema.Array(Schema.String)),
  targets: Schema.Array(Schema.String),
  zone: Schema.String,
  zones: Schema.optional(Schema.Array(ForkZone)),
}) {}

export class ForkConfig extends Schema.Class<ForkConfig>("ForkConfig")({
  invariants: Schema.Array(InvariantPackage),
  pack: Schema.String,
  phases: Schema.Array(ForkPhase),
  project: Schema.String,
}) {}

export const loadForkConfig = (
  path: string,
): Effect.Effect<ForkConfig, Error> =>
  Effect.tryPromise({
    catch: (cause) => new Error(String(cause)),
    try: async () => {
      if (path.endsWith(".ts") || path.endsWith(".mts") || path.endsWith(".js") || path.endsWith(".mjs")) {
        const module = await import(path.startsWith("file:") ? path : `file://${process.cwd()}/${path}`)
        return module.default ?? module.config
      }
      const { readFile } = await import("node:fs/promises")
      return JSON.parse(await readFile(path, "utf8"))
    },
  }).pipe(
    Effect.flatMap((json) =>
      Schema.decodeUnknownEffect(ForkConfig)(json).pipe(
        Effect.mapError((cause) => new Error(String(cause))),
      ),
    ),
  )

export const findPhase = (
  config: ForkConfig,
  phaseName: string,
): ForkPhase | undefined => config.phases.find((phase) => phase.name === phaseName)

export const invariantById = (
  config: ForkConfig,
  id: string,
): InvariantPackage | undefined =>
  config.invariants.find((invariant) => invariant.id === id)

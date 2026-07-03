import { Effect, Schema } from "effect"
import {
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"

const joernEnvironmentConfigRecipeId = "joern-effect.environment-config"
const joernPortAllocationRecipeId = "joern-effect.port-allocation"
const joernEnvironmentConfigSourcePath = "packages/attune/joern-effect/src/edge/runtime/env.ts"

export const EnvVars = {
  Ci: "CI",
  CodePropertyGraphDir: "CODEPROPERTYGRAPH_DIR",
  Home: "HOME",
  JavaHome: "JAVA_HOME",
  JoernBinary: "JOERN_BINARY",
  JoernCpgSchemaJson: "JOERN_CPG_SCHEMA_JSON",
  JoernCpgSchemaSources: "JOERN_CPG_SCHEMA_SOURCES",
  JoernCpgVersion: "JOERN_CPG_VERSION",
  JoernEffectDebug: "JOERN_EFFECT_DEBUG",
  JoernEffectE2eRuns: "JOERN_EFFECT_E2E_RUNS",
  JoernEffectTestTmpdir: "JOERN_EFFECT_TEST_TMPDIR",
  JoernEffectWorkspace: "JOERN_EFFECT_WORKSPACE",
  JoernHome: "JOERN_HOME",
  JoernReadyTimeoutMs: "JOERN_READY_TIMEOUT_MS",
  Path: "PATH",
  Tmpdir: "TMPDIR",
} as const

export type EnvVarName = (typeof EnvVars)[keyof typeof EnvVars]

export const JoernEnvironmentConfigInputSchema = Schema.Struct({
  names: Schema.Array(Schema.String),
})
export type JoernEnvironmentConfigInput = typeof JoernEnvironmentConfigInputSchema.Type

export const JoernEnvironmentConfigOutputSchema = Schema.Struct({
  values: Schema.Record({ key: Schema.String, value: Schema.String }),
  missing: Schema.Array(Schema.String),
})
export type JoernEnvironmentConfigOutput = typeof JoernEnvironmentConfigOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEnvironmentConfigResource = defineAlchemyResource({
  id: "joern-effect.environment-config.resource",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  ownerRecipeId: joernEnvironmentConfigRecipeId,
  producedBy: [joernEnvironmentConfigRecipeId],
  consumedBy: [joernEnvironmentConfigRecipeId, joernPortAllocationRecipeId],
  addressFields: ["names"],
  addressSchema: JoernEnvironmentConfigInputSchema as never,
  stateSchema: JoernEnvironmentConfigOutputSchema as never,
  modes: ["read", "project"],
})

export const readEnv = (name: EnvVarName): string | undefined => process.env[name]

export const readEnvOr = (name: EnvVarName, fallback: string): string => readEnv(name) ?? fallback

export const readIntEnvOr = (name: EnvVarName, fallback: number): number => {
  const value = readEnv(name)
  if (value === undefined || value.trim() === "") {return fallback}

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const envFlagEnabled = (name: EnvVarName): boolean => readEnv(name) === "1"

export const projectJoernEnvironmentConfig = (
  input: JoernEnvironmentConfigInput,
): JoernEnvironmentConfigOutput => ({
  values: Object.fromEntries(input.names.flatMap((name) => {
    const value = process.env[name]
    return value === undefined ? [] : [[name, value]]
  })),
  missing: input.names.filter((name) => process.env[name] === undefined),
})

export const JoernEnvironmentConfigHandler = defineRecipeHandler<
  JoernEnvironmentConfigInput,
  JoernEnvironmentConfigOutput
>({
  id: "joern-effect.environment-config.handler",
  recipeId: joernEnvironmentConfigRecipeId,
  sourcePath: joernEnvironmentConfigSourcePath,
  exportName: "projectJoernEnvironmentConfig",
  emitsReceipts: ["joern.environment-config.projected"],
  handler: (input) => Effect.succeed(projectJoernEnvironmentConfig(input)) as never,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernEnvironmentConfigRecipe = defineConfigRecipe({
  id: joernEnvironmentConfigRecipeId,
  projectId: "joern-effect",
  title: "Project Joern runtime environment variables into typed configuration",
  inputSchema: JoernEnvironmentConfigInputSchema as never,
  outputSchema: JoernEnvironmentConfigOutputSchema as never,
  allowedFiles: [joernEnvironmentConfigSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernEnvironmentConfigInputSchema as never,
    outputSchema: JoernEnvironmentConfigOutputSchema as never,
    inputResources: [JoernEnvironmentConfigResource],
    outputResources: [JoernEnvironmentConfigResource],
  },
  handler: JoernEnvironmentConfigHandler,
  alchemyDag: [{
    fromRecipeId: joernEnvironmentConfigRecipeId,
    toRecipeId: joernPortAllocationRecipeId,
    resource: JoernEnvironmentConfigResource,
    kind: "projects",
    modes: ["read", "project"],
  }],
})

export const JoernEnvironmentConfigRecipes = [JoernEnvironmentConfigRecipe] as const

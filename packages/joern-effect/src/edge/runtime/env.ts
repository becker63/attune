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

export const readEnv = (name: EnvVarName): string | undefined => process.env[name]

export const readEnvOr = (name: EnvVarName, fallback: string): string => readEnv(name) ?? fallback

export const readIntEnvOr = (name: EnvVarName, fallback: number): number => {
  const value = readEnv(name)
  if (value === undefined || value.trim() === "") {return fallback}

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const envFlagEnabled = (name: EnvVarName): boolean => readEnv(name) === "1"

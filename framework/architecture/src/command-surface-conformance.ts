export type CommandSurfaceRuleId =
  | "attune/command-surface/raw-run-command"
  | "attune/command-surface/package-script"
  | "attune/command-surface/stale-policy-architecture"
  | "attune/command-surface/raw-tool-doc"
  | "attune/command-surface/direct-generator-doc"

export interface CommandSurfaceDiagnostic {
  readonly ruleId: CommandSurfaceRuleId
  readonly severity: "error" | "warning"
  readonly filePath: string
  readonly message: string
}

export interface CommandSurfaceFile {
  readonly path: string
  readonly content: string
  readonly classification?: "public" | "internal" | "bootstrap"
}

export interface CommandSurfaceConformanceOptions {
  readonly files: readonly CommandSurfaceFile[]
  readonly finalRatchet?: boolean
}

export interface CommandSurfaceConformanceResult {
  readonly diagnostics: readonly CommandSurfaceDiagnostic[]
  readonly exitCode: number
}

const rawToolPattern = /(^|[`"\s])(arion|alchemy|bash|bun|corepack|deno|docker|helm|joern|kubectl|nix|nixos-rebuild|node|npm|npx|pnpm|podman|sh|stryker|tsx|ts-node|tsc|vite|vitest|yarn|zsh)(\s|$)/iu
const stalePolicyArchitecturePattern = /\bworkspace:policy-architecture\b/u
const directAttuneGeneratorDocPattern = /\bnx\s+(?:g|generate)\s+@attune\/nx:[\w-]+/u

export const checkCommandSurfaceConformance = ({
  files,
  finalRatchet = true,
}: CommandSurfaceConformanceOptions): CommandSurfaceConformanceResult => {
  const diagnostics = files.flatMap((file) => [
    ...checkJsonCommandSurface(file, finalRatchet),
    ...checkDocCommandSurface(file),
  ])

  return {
    diagnostics,
    exitCode: diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0,
  }
}

const checkJsonCommandSurface = (
  file: CommandSurfaceFile,
  finalRatchet: boolean,
): readonly CommandSurfaceDiagnostic[] => {
  if (!file.path.endsWith(".json")) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(file.content)
  } catch {
    return []
  }

  const diagnostics: CommandSurfaceDiagnostic[] = []

  if (finalRatchet && isPackageJsonPath(file.path) && isPublicSurface(file)) {
    const scripts = readRecord(readRecord(parsed).scripts)
    for (const scriptName of Object.keys(scripts)) {
      diagnostics.push(error(
        file.path,
        "attune/command-surface/package-script",
        `Package/root script "${scriptName}" remains after migration; expose the workflow through an Nx target or generator.`,
      ))
    }
  }

  for (const command of collectRunCommands(parsed)) {
    if (isInternalGuidance(file, command.context)) continue

    if (rawToolPattern.test(command.command)) {
      diagnostics.push(error(
        file.path,
        "attune/command-surface/raw-run-command",
        `nx:run-commands command "${command.command}" invokes raw tooling; use a typed Attune executor or inferred target.`,
      ))
    }
  }

  diagnostics.push(...checkJsonPolicyArchitectureSurface(file, parsed))

  return diagnostics
}

const checkDocCommandSurface = (file: CommandSurfaceFile): readonly CommandSurfaceDiagnostic[] => {
  if (!/\.(md|mdx|txt)$/u.test(file.path)) return []
  const diagnostics: CommandSurfaceDiagnostic[] = []
  const lines = file.content.split(/\r?\n/u)

  lines.forEach((line, index) => {
    if (stalePolicyArchitecturePattern.test(line) && !isInternalGuidance(file, line)) {
      diagnostics.push(error(
        file.path,
        "attune/command-surface/stale-policy-architecture",
        `Line ${index + 1} promotes workspace:policy-architecture as public guidance; use workspace:policy-fast, workspace:policy-proof-pressure, or a focused diagnostic target.`,
      ))
    }

    if (rawToolPattern.test(line) && !isInternalGuidance(file, line)) {
      diagnostics.push(error(
        file.path,
        "attune/command-surface/raw-tool-doc",
        `Line ${index + 1} documents a raw tool invocation as public workflow; route the surface through Nx.`,
      ))
    }

    if (directAttuneGeneratorDocPattern.test(line) && !isInternalGuidance(file, line)) {
      diagnostics.push(warning(
        file.path,
        "attune/command-surface/direct-generator-doc",
        `Line ${index + 1} documents a direct @attune/nx generator invocation as public workflow; prefer attune-check diagnostics and attune-repair.`,
      ))
    }
  })

  return diagnostics
}

interface CollectedCommand {
  readonly command: string
  readonly context: string
}

const collectRunCommands = (value: unknown): readonly CollectedCommand[] => {
  if (Array.isArray(value)) return value.flatMap(collectRunCommands)
  if (!isRecord(value)) return []

  const commands: CollectedCommand[] = []
  const executor = typeof value.executor === "string" ? value.executor : ""
  if (executor === "nx:run-commands") {
    const options = readRecord(value.options)
    commands.push(...collectCommandOptionStrings(options, describeCommandContext(value)))
  }

  for (const nested of Object.values(value)) commands.push(...collectRunCommands(nested))
  return commands
}

const collectCommandOptionStrings = (
  options: Record<string, unknown>,
  context: string,
): readonly CollectedCommand[] => [
  ...collectCommandValue(options.command, context),
  ...collectCommandValue(options.commands, context),
]

const collectCommandValue = (
  value: unknown,
  context: string,
): readonly CollectedCommand[] => {
  if (typeof value === "string") return [{ command: value, context }]
  if (Array.isArray(value)) {
    if (value.every((entry): entry is string => typeof entry === "string")) {
      return [{ command: value.join(" "), context }]
    }

    return value.flatMap((entry) => {
      if (typeof entry === "string") return [{ command: entry, context }]
      if (isRecord(entry)) return collectCommandOptionStrings(entry, context)
      return []
    })
  }

  if (isRecord(value)) return collectCommandOptionStrings(value, context)
  return []
}

const checkJsonPolicyArchitectureSurface = (
  file: CommandSurfaceFile,
  parsed: unknown,
): readonly CommandSurfaceDiagnostic[] => {
  const diagnostics: CommandSurfaceDiagnostic[] = []

  for (const finding of collectJsonPolicyArchitectureFindings(parsed)) {
    if (isInternalGuidance(file, finding.context)) continue
    diagnostics.push(error(
      file.path,
      "attune/command-surface/stale-policy-architecture",
      `${finding.path} promotes workspace:policy-architecture as public guidance; use workspace:policy-fast, workspace:policy-proof-pressure, or a focused diagnostic target.`,
    ))
  }

  return diagnostics
}

interface JsonPolicyArchitectureFinding {
  readonly path: string
  readonly context: string
}

const collectJsonPolicyArchitectureFindings = (
  value: unknown,
  path = "$",
  inheritedContext = "",
): readonly JsonPolicyArchitectureFinding[] => {
  if (typeof value === "string") {
    return stalePolicyArchitecturePattern.test(value)
      ? [{ path, context: `${inheritedContext}\n${value}` }]
      : []
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectJsonPolicyArchitectureFindings(entry, `${path}[${index}]`, inheritedContext),
    )
  }

  if (!isRecord(value)) return []

  const localContext = `${inheritedContext}\n${describeCommandContext(value)}`
  const diagnostics: JsonPolicyArchitectureFinding[] = []

  for (const [key, nested] of Object.entries(value)) {
    if (key === "policy-architecture") {
      const nestedContext = isRecord(nested) ? describeCommandContext(nested) : ""
      diagnostics.push({
        path: `${path}.${key}`,
        context: `${localContext}\n${nestedContext}`,
      })
    }

    diagnostics.push(
      ...collectJsonPolicyArchitectureFindings(nested, `${path}.${key}`, localContext),
    )
  }

  return diagnostics
}

const describeCommandContext = (value: Record<string, unknown>): string => {
  const metadata = readRecord(value.metadata)
  const description = typeof metadata.description === "string" ? metadata.description : ""
  const comment = typeof value.comment === "string" ? value.comment : ""
  const name = typeof value.name === "string" ? value.name : ""
  return [description, comment, name].filter(Boolean).join("\n")
}

const isPackageJsonPath = (path: string): boolean =>
  path === "package.json" || path.endsWith("/package.json")

const readRecord = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isPublicSurface = (file: CommandSurfaceFile): boolean =>
  file.classification !== "internal" && file.classification !== "bootstrap"

const isInternalGuidance = (file: CommandSurfaceFile, line: string): boolean =>
  file.classification === "internal" ||
  file.classification === "bootstrap" ||
  /\b(internal|implementation detail|inside (the )?dev shell|bootstrap|do not promote|must not promote|stale)\b/iu.test(line)

const error = (
  filePath: string,
  ruleId: CommandSurfaceRuleId,
  message: string,
): CommandSurfaceDiagnostic => ({
  ruleId,
  severity: "error",
  filePath,
  message,
})

const warning = (
  filePath: string,
  ruleId: CommandSurfaceRuleId,
  message: string,
): CommandSurfaceDiagnostic => ({
  ruleId,
  severity: "warning",
  filePath,
  message,
})

export const FrameworkNoReportRuleId = "attune/no-checked-in-protocol-report" as const

export type FrameworkNoReportRuleId = typeof FrameworkNoReportRuleId

export type FrameworkNoReportCategory =
  | "protocol-delta-report"
  | "obligation-report"
  | "evidence-summary-report"
  | "architecture-summary-report"
  | "agent-protocol-report"

export interface FrameworkNoReportFile {
  readonly path: string
  readonly content: string
}

export interface FrameworkNoReportDiagnostic {
  readonly ruleId: FrameworkNoReportRuleId
  readonly severity: "error"
  readonly filePath: string
  readonly message: string
  readonly category: FrameworkNoReportCategory
}

export interface FrameworkNoReportPolicyOptions {
  readonly files: readonly FrameworkNoReportFile[]
}

export interface FrameworkNoReportPolicyResult {
  readonly diagnostics: readonly FrameworkNoReportDiagnostic[]
  readonly exitCode: number
}

export interface FrameworkProtocolReportClassification {
  readonly category: FrameworkNoReportCategory
  readonly label: string
}

const protocolDeltaReportSignature: FrameworkProtocolReportClassification = {
  category: "protocol-delta-report",
  label: "ProtocolDelta report",
}

const obligationReportSignature: FrameworkProtocolReportClassification = {
  category: "obligation-report",
  label: "obligation report",
}

const evidenceSummaryReportSignature: FrameworkProtocolReportClassification = {
  category: "evidence-summary-report",
  label: "evidence summary report",
}

const architectureSummaryReportSignature: FrameworkProtocolReportClassification = {
  category: "architecture-summary-report",
  label: "architecture summary report",
}

const agentProtocolReportSignature: FrameworkProtocolReportClassification = {
  category: "agent-protocol-report",
  label: "Linear/GitHub/cloud-agent protocol report",
}

const reportFileExtensionPattern = /\.(json|jsonc|md|mdx|txt)$/iu
const sourceLikeExtensionPattern = /\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/iu
const cachePathPattern = /(^|\/)(\.attune\/cache|\.nx\/cache|node_modules|dist|coverage|tmp|temp)(\/|$)/iu
const historicalMigrationNotePathPattern = /^docs\/[^/]+\.(md|mdx|txt)$/iu
const historicalMigrationNoteMarkerPattern =
  /^# .+\n\nHistorical migration note only\. This file is not protocol source truth or\s+package-contract evidence;/iu

const pathSignatures: readonly [RegExp, FrameworkProtocolReportClassification][] = [
  [/\bprotocol[-_. ]?deltas?\b|\bdelta[-_. ]?report\b/iu, protocolDeltaReportSignature],
  [/\bobligations?[-_. ]?(report|summary|status)\b|\b(report|summary|status)[-_. ]?obligations?\b/iu, obligationReportSignature],
  [/\bevidence[-_. ]?(summary|report|status)\b|\bproperty[-_. ]?evidence[-_. ]?(summary|report|status)\b/iu, evidenceSummaryReportSignature],
  [/\barchitecture[-_. ]?(summary|report|status)\b|\battune[-_. ]?architecture[-_. ]?(summary|report|status)\b/iu, architectureSummaryReportSignature],
  [/\b(linear|github|cloud[-_. ]?agent)[-_. ]?(protocol[-_. ]?)?(summary|report|status)\b|\bprotocol[-_. ]?(linear|github|cloud[-_. ]?agent)[-_. ]?(summary|report|status)\b/iu, agentProtocolReportSignature],
]

const genericRunReportPathSignatures: readonly [RegExp, FrameworkProtocolReportClassification][] = [
  [/\b(fuzz|fuzzer|property|proof|run)[-_. ]?(report|summary|status)\b|\b(report|summary|status)[-_. ]?(fuzz|fuzzer|property|proof|run)\b/iu, evidenceSummaryReportSignature],
]

const reportTypeSignatures: readonly [RegExp, FrameworkProtocolReportClassification][] = [
  [/\bprotocol[-_. ]?delta[-_. ]?(report|summary|status)?\b/iu, protocolDeltaReportSignature],
  [/\bobligation[-_. ]?(report|summary|status)\b/iu, obligationReportSignature],
  [/\bevidence[-_. ]?(summary|report|status)\b/iu, evidenceSummaryReportSignature],
  [/\barchitecture[-_. ]?(summary|report|status)\b/iu, architectureSummaryReportSignature],
  [/\b(linear|github|cloud[-_. ]?agent)[-_. ]?(protocol[-_. ]?)?(summary|report|status)\b/iu, agentProtocolReportSignature],
]

const markdownHeadingSignatures: readonly [RegExp, FrameworkProtocolReportClassification][] = [
  [/^#{1,3}\s+(ProtocolDelta|Protocol Delta).*\b(report|summary|status)\b/imu, protocolDeltaReportSignature],
  [/^#{1,3}\s+.*\bobligations?\b.*\b(report|summary|status)\b/imu, obligationReportSignature],
  [/^#{1,3}\s+.*\bevidence\b.*\b(summary|report|status)\b/imu, evidenceSummaryReportSignature],
  [/^#{1,3}\s+.*\barchitecture\b.*\b(summary|report|status)\b/imu, architectureSummaryReportSignature],
  [/^#{1,3}\s+.*\b(linear|github|cloud[-_. ]?agent)\b.*\b(protocol[-_. ]?)?(summary|report|status)\b/imu, agentProtocolReportSignature],
]

const jsonKeySignatures: readonly [readonly string[], FrameworkProtocolReportClassification][] = [
  [["protocolDeltas"], protocolDeltaReportSignature],
  [["deltaId"], protocolDeltaReportSignature],
  [["obligationReport"], obligationReportSignature],
  [["obligationSummary"], obligationReportSignature],
  [["obligations"], obligationReportSignature],
  [["evidenceSummary"], evidenceSummaryReportSignature],
  [["propertyEvidenceSummary"], evidenceSummaryReportSignature],
  [["architectureSummary"], architectureSummaryReportSignature],
  [["architectureReport"], architectureSummaryReportSignature],
  [["linearSummary"], agentProtocolReportSignature],
  [["githubSummary"], agentProtocolReportSignature],
  [["cloudAgentReport"], agentProtocolReportSignature],
]

export const checkFrameworkNoReportPolicy = ({
  files,
}: FrameworkNoReportPolicyOptions): FrameworkNoReportPolicyResult => {
  const diagnostics = files.flatMap((file) => {
    const classification = classifyFrameworkProtocolReport(file)
    return classification ? [toDiagnostic(file.path, classification)] : []
  })

  return {
    diagnostics,
    exitCode: diagnostics.length > 0 ? 1 : 0,
  }
}

export const classifyFrameworkProtocolReport = (
  file: FrameworkNoReportFile,
): FrameworkProtocolReportClassification | undefined => {
  const normalizedPath = normalizePath(file.path)
  if (cachePathPattern.test(normalizedPath)) return undefined
  if (sourceLikeExtensionPattern.test(normalizedPath)) return undefined
  if (!reportFileExtensionPattern.test(normalizedPath)) return undefined

  const pathSignature = findPathSignature(normalizedPath)
  if (pathSignature) return pathSignature

  const jsonSignature = findJsonSignature(file.content)
  if (jsonSignature) return jsonSignature

  const markdownSignature = findMarkdownSignature(file.content)
  if (markdownSignature) return markdownSignature

  if (isHistoricalMigrationNote(normalizedPath, file.content)) return undefined

  return findGenericRunReportPathSignature(normalizedPath)
}

const findPathSignature = (normalizedPath: string): FrameworkProtocolReportClassification | undefined => {
  const basename = normalizedPath.split("/").at(-1) ?? normalizedPath
  return pathSignatures.find(([pattern]) => pattern.test(basename))?.[1]
}

const findGenericRunReportPathSignature = (normalizedPath: string): FrameworkProtocolReportClassification | undefined => {
  const basename = normalizedPath.split("/").at(-1) ?? normalizedPath
  return genericRunReportPathSignatures.find(([pattern]) => pattern.test(basename))?.[1]
}

const isHistoricalMigrationNote = (normalizedPath: string, content: string): boolean =>
  historicalMigrationNotePathPattern.test(normalizedPath) &&
  historicalMigrationNoteMarkerPattern.test(content)

const findJsonSignature = (content: string): FrameworkProtocolReportClassification | undefined => {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return undefined
  }

  const reportType = findStringProperty(parsed, "reportType") ?? findStringProperty(parsed, "kind")
  if (reportType) {
    const reportTypeSignature = reportTypeSignatures.find(([pattern]) => pattern.test(reportType))?.[1]
    if (reportTypeSignature) return reportTypeSignature
  }

  const keys = collectKeys(parsed)
  return jsonKeySignatures.find(([candidateKeys]) =>
    candidateKeys.some((key) => keys.has(key)),
  )?.[1]
}

const findMarkdownSignature = (content: string): FrameworkProtocolReportClassification | undefined =>
  markdownHeadingSignatures.find(([pattern]) => pattern.test(content))?.[1]

const collectKeys = (value: unknown): ReadonlySet<string> => {
  const keys = new Set<string>()
  const visit = (nested: unknown): void => {
    if (Array.isArray(nested)) {
      nested.forEach(visit)
      return
    }

    if (!isRecord(nested)) return

    for (const [key, child] of Object.entries(nested)) {
      keys.add(key)
      visit(child)
    }
  }

  visit(value)
  return keys
}

const findStringProperty = (value: unknown, property: string): string | undefined => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = findStringProperty(entry, property)
      if (nested) return nested
    }
    return undefined
  }

  if (!isRecord(value)) return undefined

  const candidate = value[property]
  if (typeof candidate === "string") return candidate

  for (const child of Object.values(value)) {
    const nested = findStringProperty(child, property)
    if (nested) return nested
  }

  return undefined
}

const toDiagnostic = (
  filePath: string,
  signature: FrameworkProtocolReportClassification,
): FrameworkNoReportDiagnostic => ({
  ruleId: FrameworkNoReportRuleId,
  severity: "error",
  filePath,
  category: signature.category,
  message: `${signature.label} files must not be checked in as protocol truth; use language-service diagnostics, Nx output, source declarations, generated source, or gitignored cache output instead.`,
})

const normalizePath = (path: string): string => path.replaceAll("\\", "/")

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

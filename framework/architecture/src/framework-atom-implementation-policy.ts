export const AtomImplementationPolicyRuleId = "attune/atom-implementation-boundary" as const

export type AtomImplementationPolicyRuleId = typeof AtomImplementationPolicyRuleId

export type AtomImplementationPolicyDiagnosticCode =
  | "atom-durable-write"
  | "atom-eventlog-mutation"
  | "atom-provider-action"
  | "atom-external-service-call"
  | "atom-scheduler-resource-lifecycle"
  | "atom-hidden-mutable-state"

export interface AtomImplementationPolicyFile {
  readonly path: string
  readonly content: string
}

export interface AtomImplementationPolicyDiagnostic {
  readonly ruleId: AtomImplementationPolicyRuleId
  readonly code: AtomImplementationPolicyDiagnosticCode
  readonly severity: "error"
  readonly filePath: string
  readonly line: number
  readonly column: number
  readonly sourceLine: string
  readonly message: string
}

export interface AtomImplementationPolicyOptions {
  readonly files: readonly AtomImplementationPolicyFile[]
}

export interface AtomImplementationPolicyResult {
  readonly diagnostics: readonly AtomImplementationPolicyDiagnostic[]
  readonly exitCode: number
}

interface AtomViolationPattern {
  readonly code: AtomImplementationPolicyDiagnosticCode
  readonly pattern: RegExp
  readonly message: string
}

const sourceFilePattern = /\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/u
const atomImplementationBasenamePattern =
  /(?:^|[.-])(?:base|derived|package-view)?-?atom\.[cm]?[tj]sx?$/iu
const ignoredAtomImplementationPathPattern =
  /\/src\/(?:fixtures?|generators?|generated|__tests__|tests?)\//u

const violationPatterns: readonly AtomViolationPattern[] = [
  {
    code: "atom-eventlog-mutation",
    pattern:
      /\b(?:eventLog|discoveryEvents|DiscoveryEvents|DiscoveryEventLog)\s*\.\s*append\s*\(|\b(?:appendProjectedDiscoveryEvent|appendEvidenceRecorded|appendDiscoveryEvent|appendEvent)\s*\(/gu,
    message:
      "Atom implementations must not append EventLog events; route event writes through the Effect service/event facade and announce Reactivity keys.",
  },
  {
    code: "atom-durable-write",
    pattern:
      /\b(?:db|database|client|store|projectionStore|protocolStore|readModelStore|projection)\s*\.\s*(?:insert|update|delete|upsert|write|save|set|append)\s*\(|\b(?:insert|update|delete|upsert|writeProjection|persistProjection|materializeProjection)\s*\(/gu,
    message:
      "Atom implementations must not perform durable writes; projections and Effect services own writes while atoms expose recomputable reads.",
  },
  {
    code: "atom-provider-action",
    pattern:
      /\b(?:provider|resourceProvider|resource|kubernetes|k8s|alchemy|docker|terraform)\s*\.\s*(?:apply|create|update|delete|deploy|run|execute|provision|destroy)\s*\(|\b(?:applyResource|createResource|deleteResource|destroyResource|provisionResource)\s*\(/giu,
    message:
      "Atom implementations must not perform provider or resource actions; model those as resource-provider operations behind Effect services.",
  },
  {
    code: "atom-external-service-call",
    pattern:
      /\b(?:fetch|request)\s*\(|\b(?:axios|got|ky|undici|http|https)\s*\.\s*(?:request|get|post|put|patch|delete)\s*\(/gu,
    message:
      "Atom implementations must not call external services; call them through auditable Effect operations and expose read-model state to atoms.",
  },
  {
    code: "atom-scheduler-resource-lifecycle",
    pattern:
      /\b(?:setInterval|setTimeout)\s*\(|\b(?:Schedule|Scheduler|Layer|Scope|Effect)\s*\.\s*(?:repeat|schedule|fork|forkDaemon|sleep|acquireRelease|scoped|addFinalizer|provide|runFork|runPromise|runSync)\s*\(/gu,
    message:
      "Atom implementations must not own scheduler or resource lifecycle; keep lifecycle work in Effect layers/services.",
  },
  {
    code: "atom-hidden-mutable-state",
    pattern:
      /\b(?:let|var)\s+[A-Za-z_$][\w$]*\b|\bconst\s+[A-Za-z_$][\w$]*(?:\s*:\s*[^=\n]+)?\s*=\s*new\s+(?:Map|Set|WeakMap|WeakSet)\s*\(|\bRef\.make\s*\(/gu,
    message:
      "Atom implementations must not keep hidden mutable state that bypasses Reactivity; move state to a read model, Reactivity-keyed base atom, or explicit service boundary.",
  },
]

export const checkAtomImplementationPolicy = ({
  files,
}: AtomImplementationPolicyOptions): AtomImplementationPolicyResult => {
  const diagnostics = files
    .filter(isAtomImplementationSourceFile)
    .flatMap(checkAtomImplementationFile)

  return {
    diagnostics,
    exitCode: diagnostics.length > 0 ? 1 : 0,
  }
}

export const isAtomImplementationSourceFile = (file: AtomImplementationPolicyFile): boolean => {
  const normalizedPath = normalizePath(file.path)
  if (!sourceFilePattern.test(normalizedPath)) return false
  if (!/^packages\/[^/]+\/src\//u.test(normalizedPath)) return false
  if (normalizedPath.endsWith("/src/attune.package.ts")) return false
  if (normalizedPath.endsWith("/src/attune.package.typecheck.ts")) return false
  if (ignoredAtomImplementationPathPattern.test(normalizedPath)) return false
  if (normalizedPath.includes("/src/atoms/") || normalizedPath.includes("/src/atom/")) return true

  const basename = normalizedPath.split("/").at(-1) ?? normalizedPath
  return atomImplementationBasenamePattern.test(basename)
}

const checkAtomImplementationFile = (
  file: AtomImplementationPolicyFile,
): readonly AtomImplementationPolicyDiagnostic[] => {
  const codeOnlyContent = maskCommentsAndStrings(file.content)
  const diagnostics: AtomImplementationPolicyDiagnostic[] = []

  for (const violationPattern of violationPatterns) {
    violationPattern.pattern.lastIndex = 0

    for (const match of codeOnlyContent.matchAll(violationPattern.pattern)) {
      if (match.index === undefined) continue
      diagnostics.push(toDiagnostic(file, violationPattern, match.index))
    }
  }

  return dedupeDiagnostics(diagnostics)
}

const toDiagnostic = (
  file: AtomImplementationPolicyFile,
  violationPattern: AtomViolationPattern,
  index: number,
): AtomImplementationPolicyDiagnostic => {
  const position = sourcePosition(file.content, index)

  return {
    ruleId: AtomImplementationPolicyRuleId,
    code: violationPattern.code,
    severity: "error",
    filePath: normalizePath(file.path),
    line: position.line,
    column: position.column,
    sourceLine: lineAt(file.content, position.line).trim(),
    message: violationPattern.message,
  }
}

const dedupeDiagnostics = (
  diagnostics: readonly AtomImplementationPolicyDiagnostic[],
): readonly AtomImplementationPolicyDiagnostic[] => {
  const seen = new Set<string>()
  const deduped: AtomImplementationPolicyDiagnostic[] = []

  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.code,
      diagnostic.filePath,
      diagnostic.line,
      diagnostic.column,
    ].join(":")
    if (seen.has(key)) continue

    seen.add(key)
    deduped.push(diagnostic)
  }

  return deduped
}

const commentOrStringPattern =
  /\/\*[\s\S]*?\*\/|\/\/[^\n\r]*|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|`(?:\\.|[^`\\])*`/gu

const maskCommentsAndStrings = (content: string): string =>
  content.replace(commentOrStringPattern, (match) => match.replace(/[^\n\r]/gu, " "))

const sourcePosition = (content: string, index: number): { readonly line: number; readonly column: number } => {
  let line = 1
  let column = 1

  for (let cursor = 0; cursor < index; cursor += 1) {
    if (content[cursor] === "\n") {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }

  return { line, column }
}

const lineAt = (content: string, line: number): string => content.split(/\r?\n/u)[line - 1] ?? ""

const normalizePath = (path: string): string => path.replaceAll("\\", "/")

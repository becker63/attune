export const FrameworkImportBoundaryRuleId = "attune/framework-import-boundary" as const

export type FrameworkImportBoundaryRuleId = typeof FrameworkImportBoundaryRuleId

export type FrameworkImportBoundaryDiagnosticCode =
  | "framework-sqlite-import"
  | "framework-runtime-internal-import"
  | "framework-nx-internal-import"
  | "framework-language-service-import"
  | "framework-testing-src-import"
  | "raw-drizzle-table-import"
  | "protocol-store-internal-import"

export interface FrameworkImportBoundaryDiagnostic {
  readonly ruleId: FrameworkImportBoundaryRuleId
  readonly code: FrameworkImportBoundaryDiagnosticCode
  readonly severity: "error"
  readonly filePath: string
  readonly importSource: string
  readonly message: string
}

export interface FrameworkImportBoundaryFile {
  readonly path: string
  readonly content: string
}

export interface FrameworkImportBoundaryOptions {
  readonly files: readonly FrameworkImportBoundaryFile[]
}

export interface FrameworkImportBoundaryResult {
  readonly diagnostics: readonly FrameworkImportBoundaryDiagnostic[]
  readonly exitCode: number
}

export interface FrameworkImportUsage {
  readonly filePath: string
  readonly importSource: string
  readonly importedNames?: readonly string[]
}

export interface FrameworkImportBoundaryViolation {
  readonly code: FrameworkImportBoundaryDiagnosticCode
  readonly reason: string
}

const frameworkTestingImport = "@attune/framework-testing"

const importDeclarationPattern =
  /\bimport\s+(?:type\s+)?(?:(?<imports>[\s\S]*?)\s+from\s+)?["'](?<source>[^"']+)["']/gu
const exportDeclarationPattern =
  /\bexport\s+(?:type\s+)?(?:\*|(?<imports>[\s\S]*?))\s+from\s+["'](?<source>[^"']+)["']/gu
const dynamicImportPattern = /\bimport\s*\(\s*["'](?<source>[^"']+)["']\s*\)/gu
const requirePattern = /\brequire\s*\(\s*["'](?<source>[^"']+)["']\s*\)/gu
const namedImportPattern = /\b(?:type\s+)?(?<name>[A-Za-z_$][\w$]*)\b(?:\s+as\s+[A-Za-z_$][\w$]*)?/gu

export const checkFrameworkImportBoundary = ({
  files,
}: FrameworkImportBoundaryOptions): FrameworkImportBoundaryResult => {
  const diagnostics = files.flatMap((file) =>
    extractImportUsages(file).flatMap((usage) => {
      const violation = classifyFrameworkImportBoundary(usage)
      return violation === undefined ? [] : [toDiagnostic(usage, violation)]
    }),
  )

  return {
    diagnostics,
    exitCode: diagnostics.length > 0 ? 1 : 0,
  }
}

export const classifyFrameworkImportBoundary = (
  usage: FrameworkImportUsage,
): FrameworkImportBoundaryViolation | undefined => {
  if (!isProductPackageFile(usage.filePath) || isFrameworkFile(usage.filePath)) return undefined

  const importSource = normalizePath(usage.importSource)
  const importedNames = usage.importedNames ?? []

  if (importsProgramFactStoreInternal(importSource, importedNames)) {
    return {
      code: "protocol-store-internal-import",
      reason: "ProgramFactStore internals are private framework runtime/store state.",
    }
  }

  if (isFrameworkSqliteImport(importSource)) {
    return {
      code: "framework-sqlite-import",
      reason: "SQLite and Drizzle materialization belongs behind framework Effect services.",
    }
  }

  if (isFrameworkRuntimeInternalImport(importSource)) {
    return {
      code: "framework-runtime-internal-import",
      reason: "Protocol Runtime internals are private framework implementation detail.",
    }
  }

  if (isFrameworkNxInternalImport(importSource)) {
    return {
      code: "framework-nx-internal-import",
      reason: "Framework Nx internals are reached through generated artifacts and Nx checks/actions.",
    }
  }

  if (isFrameworkLanguageServiceImport(importSource)) {
    return {
      code: "framework-language-service-import",
      reason: "Language-service internals project diagnostics and are not product package APIs.",
    }
  }

  if (isFrameworkTestingImport(importSource) && !isTestOrGeneratedEvidenceFile(usage.filePath)) {
    return {
      code: "framework-testing-src-import",
      reason: "Framework testing helpers are limited to tests and generated evidence.",
    }
  }

  if (isRawDrizzleTableImport(importSource, importedNames)) {
    return {
      code: "raw-drizzle-table-import",
      reason: "Raw Drizzle table/client APIs belong behind the private framework SQLite store boundary.",
    }
  }

  return undefined
}

const extractImportUsages = (file: FrameworkImportBoundaryFile): readonly FrameworkImportUsage[] => [
  ...extractFromPattern(file, importDeclarationPattern),
  ...extractFromPattern(file, exportDeclarationPattern),
  ...extractFromPattern(file, dynamicImportPattern),
  ...extractFromPattern(file, requirePattern),
]

const extractFromPattern = (
  file: FrameworkImportBoundaryFile,
  pattern: RegExp,
): readonly FrameworkImportUsage[] => {
  const usages: FrameworkImportUsage[] = []
  pattern.lastIndex = 0

  for (const match of file.content.matchAll(pattern)) {
    const source = match.groups?.source
    if (source === undefined) continue

    const importsText = match.groups?.imports
    const importedNames = importsText === undefined ? [] : extractImportedNames(importsText)
    usages.push(importedNames.length > 0
      ? { filePath: file.path, importSource: source, importedNames }
      : { filePath: file.path, importSource: source })
  }

  return usages
}

const extractImportedNames = (importsText: string): readonly string[] => {
  const names = new Set<string>()
  namedImportPattern.lastIndex = 0

  for (const match of importsText.matchAll(namedImportPattern)) {
    const name = match.groups?.name
    if (
      name === undefined ||
      name === "as" ||
      name === "from" ||
      name === "type"
    ) {
      continue
    }

    names.add(name)
  }

  return [...names]
}

const toDiagnostic = (
  usage: FrameworkImportUsage,
  violation: FrameworkImportBoundaryViolation,
): FrameworkImportBoundaryDiagnostic => ({
  ruleId: FrameworkImportBoundaryRuleId,
  code: violation.code,
  severity: "error",
  filePath: usage.filePath,
  importSource: usage.importSource,
  message: `${violation.reason} Import from "${usage.importSource}" should use @attune/framework-protocol, generated local artifacts, or @attune/framework-testing for evidence tests.`,
})

const isProductPackageFile = (filePath: string): boolean => {
  const normalized = normalizePath(filePath)
  return normalized.startsWith("packages/") || normalized.includes("/packages/")
}

const isFrameworkFile = (filePath: string): boolean => {
  const normalized = normalizePath(filePath)
  return normalized.startsWith("framework/") || normalized.includes("/framework/")
}

const isTestOrGeneratedEvidenceFile = (filePath: string): boolean => {
  const normalized = normalizePath(filePath)
  const basename = normalized.split("/").at(-1) ?? normalized

  return (
    normalized.includes("/test/") ||
    normalized.includes("/tests/") ||
    normalized.includes("/__tests__/") ||
    /\.(test|spec)\.[cm]?[tj]sx?$/u.test(basename) ||
    normalized.includes("/generated/evidence/") ||
    normalized.includes("/evidence/generated/") ||
    normalized.includes("/src/evidence/") ||
    /\bevidence\b.*\bgenerated\b/u.test(normalized)
  )
}

const importsProgramFactStoreInternal = (
  importSource: string,
  importedNames: readonly string[],
): boolean =>
  /(^|[/_-])ProgramFactStore(?:Live|Test)?(?:$|[./_-])/u.test(importSource) ||
  /(^|[/_-])protocol-store(?:$|[./_-])/iu.test(importSource) ||
  importedNames.some((name) => /^ProgramFactStore/u.test(name))

const isFrameworkSqliteImport = (importSource: string): boolean =>
  importSource === "@attune/framework-sqlite" ||
  importSource.startsWith("@attune/framework-sqlite/") ||
  importSource.includes("framework/sqlite/")

const isFrameworkRuntimeInternalImport = (importSource: string): boolean =>
  importSource === "@attune/framework-runtime/internal" ||
  importSource.startsWith("@attune/framework-runtime/internal/") ||
  importSource.includes("framework/runtime/src/internal/") ||
  importSource.includes("framework/runtime/internal/")

const isFrameworkNxInternalImport = (importSource: string): boolean =>
  importSource === "@attune/framework-nx/internal" ||
  importSource.startsWith("@attune/framework-nx/internal/") ||
  importSource.includes("framework/nx/src/internal/") ||
  importSource.includes("framework/nx/internal/")

const isFrameworkLanguageServiceImport = (importSource: string): boolean =>
  importSource === "@attune/framework-language-service" ||
  importSource.startsWith("@attune/framework-language-service/") ||
  importSource.includes("framework/language-service/")

const isFrameworkTestingImport = (importSource: string): boolean =>
  importSource === frameworkTestingImport || importSource.startsWith(`${frameworkTestingImport}/`)

const isRawDrizzleTableImport = (
  importSource: string,
  importedNames: readonly string[],
): boolean =>
  /^drizzle-orm\/(?:pg-core|sqlite-core|mysql-core|singlestore-core|gel-core)(?:\/|$)/u.test(importSource) ||
  (
    importSource === "drizzle-orm" &&
    importedNames.some((name) =>
      /^(pgTable|sqliteTable|mysqlTable|singlestoreTable|gelTable|drizzle|table)$/u.test(name),
    )
  )

const normalizePath = (path: string): string => path.replaceAll("\\", "/")

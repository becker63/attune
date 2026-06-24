import { readFileSync } from "node:fs"

import {
  extractProtocolSourceSummary,
  hashProtocolValue,
  type AttuneProtocolAction,
  type AttuneProtocolDiagnostic,
  type SourceRange,
} from "@attune/framework-protocol"
import {
  programIndexContentHash,
  programIndexJson,
  type ProgramIndexApi,
  type ProgramIndexArtifact,
  type ProgramIndexDiagnostic,
  type ProgramIndexEdge,
  type ProgramIndexInvalidation,
  type ProgramIndexObservation,
  type ProgramIndexProject,
  type ProgramIndexProjectHealth,
  type ProgramIndexRepair,
  type ProgramIndexSchemaDescriptor,
  type ProgramIndexSourceFile,
  type ProgramIndexSymbol,
  type ProgramIndexViewRow,
} from "@attune/framework-sqlite"
import { Effect } from "effect"

export type { ProgramIndexApi } from "@attune/framework-sqlite"

export type ProgramIndexAtomKind = "base" | "derived"

export interface ProgramIndexAtom<Value> {
  readonly id: string
  readonly kind: ProgramIndexAtomKind
  readonly reads: readonly string[]
  readonly read: (index: ProgramIndexApi) => Effect.Effect<Value, unknown>
}

export interface ProjectIndexProjection {
  readonly project: ProgramIndexProject | undefined
  readonly targets: readonly ProgramIndexViewRow[]
  readonly sourceFiles: readonly ProgramIndexSourceFile[]
  readonly symbols: readonly ProgramIndexViewRow[]
  readonly schemas: readonly ProgramIndexViewRow[]
  readonly staleArtifacts: readonly ProgramIndexViewRow[]
}

export interface ProgramIndexReactivityEvent {
  readonly reactivityKey: string
  readonly factKey: string
  readonly subject: string
  readonly invalidationId: number
  readonly createdAt: string
}

export interface ProgramSourceIndexRows {
  readonly sourceFiles: readonly ProgramIndexSourceFile[]
  readonly symbols: readonly ProgramIndexSymbol[]
  readonly schemaDescriptors: readonly ProgramIndexSchemaDescriptor[]
  readonly edges: readonly ProgramIndexEdge[]
  readonly diagnostics: readonly ProgramIndexDiagnostic[]
  readonly repairs: readonly ProgramIndexRepair[]
}

export interface ProgramSourceIndexInput {
  readonly projectId: string
  readonly sourceFiles: readonly string[]
  readonly packageId?: string
  readonly now?: string
  readonly protocolFactoryNames?: readonly string[]
}

export interface ProgramCompatibilityInput {
  readonly projectId: string
  readonly root: string
  readonly paths: readonly string[]
  readonly now?: string
  readonly contentByPath?: Readonly<Record<string, string>>
}

export interface ProgramCompatibilityRows {
  readonly artifacts: readonly ProgramIndexArtifact[]
  readonly observations: readonly ProgramIndexObservation[]
}

export const projectIndexAtom = (projectId: string): ProgramIndexAtom<ProjectIndexProjection> => ({
  id: `attune.program.project.${projectId}`,
  kind: "base",
  reads: ["project", "target", "source_file", "symbol", "schema_descriptor", "artifact"],
  read: (index) =>
    Effect.gen(function* readProjectIndex() {
      const [project] = yield* index.listProjects({ projectId })
      const targets = yield* index.listTargets({ projectId })
      const sourceFiles = yield* index.listSourceFiles({ projectId })
      const symbols = yield* index.listSymbolsByFile()
      const schemas = yield* index.listSchemasBySymbol()
      const staleArtifacts = yield* index.listStaleArtifacts(projectId)
      return {
        project,
        targets: targets.map((target) => ({
          project_id: target.projectId,
          name: target.name,
          executor: target.executor ?? null,
          options_json: target.optionsJson ?? null,
          configurations_json: target.configurationsJson ?? null,
        })),
        sourceFiles,
        symbols: symbols.filter((row) => row.project_id === projectId),
        schemas: schemas.filter((row) => row.project_id === projectId),
        staleArtifacts,
      }
    }),
})

export const sourceFileSymbolsAtom = (
  filePath: string,
): ProgramIndexAtom<readonly ProgramIndexViewRow[]> => ({
  id: `attune.program.source-file-symbols.${filePath}`,
  kind: "base",
  reads: ["source_file", "symbol"],
  read: (index) => index.listSymbolsByFile(filePath),
})

export const schemaDescriptorsAtom = (
  projectId: string,
): ProgramIndexAtom<readonly ProgramIndexViewRow[]> => ({
  id: `attune.program.schema-descriptors.${projectId}`,
  kind: "base",
  reads: ["schema_descriptor", "symbol"],
  read: (index) =>
    index.listSchemasBySymbol().pipe(
      Effect.map((rows) => rows.filter((row) => row.project_id === projectId)),
    ),
})

export const staleArtifactsAtom = (
  projectId: string,
): ProgramIndexAtom<readonly ProgramIndexViewRow[]> => ({
  id: `attune.program.stale-artifacts.${projectId}`,
  kind: "base",
  reads: ["artifact"],
  read: (index) => index.listStaleArtifacts(projectId),
})

export const diagnosticsForFileAtom = (
  filePath: string,
): ProgramIndexAtom<readonly ProgramIndexViewRow[]> => ({
  id: `attune.program.diagnostics-for-file.${filePath}`,
  kind: "base",
  reads: ["diagnostic", "source_file"],
  read: (index) => index.listDiagnosticsByFile(filePath),
})

export const repairPlansAtom = (
  projectId: string,
): ProgramIndexAtom<readonly ProgramIndexViewRow[]> => ({
  id: `attune.program.repair-plans.${projectId}`,
  kind: "derived",
  reads: ["diagnostic", "repair"],
  read: (index) => index.listRepairableDiagnostics(projectId),
})

export const workspaceHealthAtom = (): ProgramIndexAtom<readonly ProgramIndexProjectHealth[]> => ({
  id: "attune.program.workspace-health",
  kind: "derived",
  reads: ["project", "source_file", "symbol", "artifact", "diagnostic", "repair"],
  read: (index) => index.listProjectHealth(),
})

export const reactivityEventsFromInvalidations = (
  invalidations: readonly ProgramIndexInvalidation[],
): readonly ProgramIndexReactivityEvent[] =>
  invalidations.map((invalidation) => ({
    reactivityKey: `attune.program.${invalidation.key}.${invalidation.subject}`,
    factKey: invalidation.key,
    subject: invalidation.subject,
    invalidationId: invalidation.id,
    createdAt: invalidation.createdAt,
  }))

export const consumeProgramIndexInvalidations = (
  index: ProgramIndexApi,
): Effect.Effect<readonly ProgramIndexReactivityEvent[], unknown> =>
  index.listInvalidations({ unconsumed: true }).pipe(
    Effect.flatMap((invalidations) => {
      const events = reactivityEventsFromInvalidations(invalidations)
      return index.markInvalidationsConsumed(invalidations.map((invalidation) => invalidation.id)).pipe(
        Effect.as(events),
      )
    }),
  )

export const programSourceIndexRows = (
  input: ProgramSourceIndexInput,
): ProgramSourceIndexRows => {
  const now = input.now ?? new Date().toISOString()
  const summary = extractProtocolSourceSummary({
    sourceFiles: input.sourceFiles,
    packageId: input.packageId ?? input.projectId,
    ...(input.protocolFactoryNames === undefined ? {} : {
      protocolFactoryNames: input.protocolFactoryNames,
    }),
  })
  const sourceFiles = summary.sourceFiles.map((path) => {
    const content = readFileSync(path)
    return {
      id: sourceFileId(input.projectId, path),
      projectId: input.projectId,
      path,
      hash: programIndexContentHash(content),
      updatedAt: now,
    }
  })
  const sourceFileByPath = new Map(sourceFiles.map((sourceFile) => [sourceFile.path, sourceFile]))
  const symbols = summary.declarations.map((declaration) => {
    const sourceFile = sourceFileByPath.get(declaration.declaration.sourcePath)
    return {
      id: symbolId(input.projectId, declaration.declaration.exportName),
      projectId: input.projectId,
      ...(sourceFile === undefined ? {} : { sourceFileId: sourceFile.id }),
      exportName: declaration.declaration.exportName,
      localName: declaration.declaration.symbolName,
      kind: declaration.kind,
      ...(declaration.declaration.range === undefined ? {} : {
        rangeJson: programIndexJson(declaration.declaration.range),
      }),
      hash: hashProtocolValue({
        id: declaration.id,
        typeText: declaration.typeText,
        initializerText: declaration.initializerText,
      }),
    }
  })
  const symbolByExport = new Map(symbols.map((symbol) => [symbol.exportName, symbol]))
  const schemaDescriptors = summary.declarations.flatMap((declaration) => {
    if (declaration.kind !== "schema") return []
    const symbol = symbolByExport.get(declaration.declaration.exportName)
    if (symbol === undefined) return []
    const features = nonSerializableSchemaFeatures(declaration.initializerText ?? "")
    return [{
      id: `schema:${symbol.id}`,
      symbolId: symbol.id,
      role: "boundary",
      astHash: hashProtocolValue(declaration.initializerText ?? declaration.typeText ?? declaration.id),
      descriptorVersion: 1,
      shapeJson: programIndexJson({
        id: declaration.id,
        typeText: declaration.typeText,
        initializerText: declaration.initializerText,
      }),
      annotationsJson: programIndexJson({
        sourcePath: declaration.declaration.sourcePath,
        exportName: declaration.declaration.exportName,
      }),
      serializationStatus: features.length === 0 ? "serializable" : "partial",
      ...(features.length === 0 ? {} : {
        nonSerializableFeaturesJson: programIndexJson(features),
      }),
    } satisfies ProgramIndexSchemaDescriptor]
  })
  const importEdges = summary.declarations.flatMap((declaration) => {
    const from = symbolByExport.get(declaration.declaration.exportName)
    if (from === undefined) return []
    return declaration.imports.map((sourceImport) => ({
      id: hashProtocolValue({
        source: "typescript-import",
        from: from.id,
        moduleSpecifier: sourceImport.moduleSpecifier,
        importedName: sourceImport.importedName,
        localName: sourceImport.localName,
      }),
      fromSymbolId: from.id,
      toSymbolId: `external:${sourceImport.moduleSpecifier}:${sourceImport.importedName}`,
      kind: "import",
      source: "typescript",
    } satisfies ProgramIndexEdge))
  })
  const referenceEdges = summary.declarations.flatMap((declaration) => {
    const from = symbolByExport.get(declaration.declaration.exportName)
    if (from === undefined) return []
    return declaration.referencedIdentifiers
      .filter((identifier) => identifier !== declaration.declaration.exportName)
      .map((identifier) => ({
        id: hashProtocolValue({
          source: "typescript-reference",
          from: from.id,
          identifier,
        }),
        fromSymbolId: from.id,
        toSymbolId: symbolByExport.get(identifier)?.id ?? `local:${input.projectId}:${identifier}`,
        kind: "identifier-reference",
        source: "typescript",
      } satisfies ProgramIndexEdge))
  })
  const diagnostics = schemaDescriptors
    .filter((descriptor) => descriptor.serializationStatus !== "serializable")
    .map((descriptor) => {
      const symbol = symbols.find((candidate) => candidate.id === descriptor.symbolId)
      return {
        id: `diagnostic:${descriptor.id}:serialization`,
        projectId: input.projectId,
        ...(symbol?.sourceFileId === undefined ? {} : { sourceFileId: symbol.sourceFileId }),
        ...(symbol?.rangeJson === undefined ? {} : { rangeJson: symbol.rangeJson }),
        code: "attune/program-index/schema-non-serializable",
        severity: "warning" as const,
        message: "schema_descriptor fact is partial for this symbol; executable Effect Schema features remain owned by the source_file.",
        ...(descriptor.nonSerializableFeaturesJson === undefined ? {} : {
          causeJson: descriptor.nonSerializableFeaturesJson,
        }),
      }
    })
  const repairs = diagnostics.map((diagnostic) => ({
    id: `repair:${diagnostic.id}`,
    diagnosticId: diagnostic.id,
    safety: "safe" as const,
    nxTarget: `${input.projectId}:attune-repair`,
    repairKind: "schema-descriptor-refresh",
    payloadJson: programIndexJson({
      source: "program-index",
      diagnostic: diagnostic.code,
    }),
    createdAt: now,
  }))

  return {
    sourceFiles,
    symbols,
    schemaDescriptors,
    edges: [...importEdges, ...referenceEdges],
    diagnostics,
    repairs,
  }
}

export const materializeProgramSourceIndex = (
  index: ProgramIndexApi,
  input: ProgramSourceIndexInput,
): Effect.Effect<ProgramSourceIndexRows, unknown> => {
  const rows = programSourceIndexRows(input)
  return Effect.gen(function* writeProgramSourceIndex() {
    yield* index.putSourceFiles(rows.sourceFiles)
    yield* index.putSymbols(rows.symbols)
    yield* index.putSchemaDescriptors(rows.schemaDescriptors)
    yield* index.putEdges(rows.edges)
    yield* index.putDiagnostics(rows.diagnostics)
    yield* index.putRepairs(rows.repairs)
    return rows
  })
}

export const compatibilityRowsFromCurrentPackageContracts = (
  input: ProgramCompatibilityInput,
): ProgramCompatibilityRows => {
  const now = input.now ?? new Date().toISOString()
  const artifacts = input.paths.map((path) => {
    const content = input.contentByPath?.[path]
    const currentHash = content === undefined ? undefined : programIndexContentHash(content)
    return {
      id: `compat:${input.projectId}:${path}`,
      projectId: input.projectId,
      path,
      kind: compatibilityArtifactKind(path),
      builtFromHash: hashProtocolValue({ projectId: input.projectId, root: input.root }),
      ...(currentHash === undefined ? {} : { currentHash }),
      status: "current" as const,
    } satisfies ProgramIndexArtifact
  })
  const observations = artifacts
    .filter((artifact) => artifact.kind !== "attune-package-source")
    .map((artifact) => ({
      id: `observation:${artifact.id}`,
      projectId: input.projectId,
      kind: "compatibility-input",
      status: "recorded",
      payloadJson: programIndexJson({
        compatibilitySource: compatibilitySourceMetadata(artifact.path),
        path: artifact.path,
        kind: artifact.kind,
        note: "Legacy package-contract/generated-companion label recorded as compatibility input.",
      }),
      createdAt: now,
    } satisfies ProgramIndexObservation))
  return { artifacts, observations }
}

export const materializeCompatibilityRows = (
  index: ProgramIndexApi,
  input: ProgramCompatibilityInput,
): Effect.Effect<ProgramCompatibilityRows, unknown> => {
  const rows = compatibilityRowsFromCurrentPackageContracts(input)
  return Effect.gen(function* writeCompatibilityRows() {
    yield* index.putArtifacts(rows.artifacts)
    yield* index.putObservations(rows.observations)
    return rows
  })
}

export const programIndexDiagnosticsForFile = (
  index: ProgramIndexApi,
  filePath: string,
): Effect.Effect<readonly AttuneProtocolDiagnostic[], unknown> =>
  Effect.gen(function* readProgramIndexDiagnosticsForFile() {
    const [diagnosticRows, repairRows] = yield* Effect.all([
      index.listDiagnosticsByFile(filePath),
      index.listRepairableDiagnostics(),
    ])
    const repairsByDiagnosticId = new Map<string, ProgramIndexViewRow[]>()
    for (const repairRow of repairRows) {
      const diagnosticId = stringValue(repairRow, "diagnostic_id")
      if (diagnosticId.length === 0) continue
      repairsByDiagnosticId.set(diagnosticId, [
        ...(repairsByDiagnosticId.get(diagnosticId) ?? []),
        repairRow,
      ])
    }
    return diagnosticRows.map((row) =>
      programIndexDiagnosticRowToProtocolDiagnostic(
        row,
        repairsByDiagnosticId.get(stringValue(row, "diagnostic_id")) ?? [],
      )
    )
  })

export const programIndexDiagnosticRowToProtocolDiagnostic = (
  row: ProgramIndexViewRow,
  repairRows: readonly ProgramIndexViewRow[] = [],
): AttuneProtocolDiagnostic => {
  const range = sourceRangeFromRow(row)
  const cause = jsonValueFromRow(row, "cause_json")
  return {
    code: stringValue(row, "code"),
    severity: diagnosticSeverity(row.severity ?? null),
    packageId: stringValue(row, "project_id", "workspace"),
    sourcePath: stringValue(row, "path", "workspace"),
    explanation: stringValue(row, "message"),
    ...(range === undefined ? {} : { range }),
    ...(cause === undefined ? {} : { cause }),
    suggestedActions: repairRows.map(programIndexRepairRowToProtocolAction),
    relatedEvidence: cause === undefined ? [] : ["program-index:cause"],
  }
}

const sourceFileId = (projectId: string, path: string): string =>
  `file:${projectId}:${programIndexContentHash(path).slice(0, 16)}`

const symbolId = (projectId: string, exportName: string): string =>
  `${projectId}:${exportName}`

const nonSerializableSchemaFeatures = (initializerText: string): readonly string[] => {
  const features = [
    ["transform", /\.transform\b|Schema\.transform\b/u],
    ["filter", /\.filter\b|Schema\.filter\b/u],
    ["refinement", /\.refine\b|Schema\.refine\b|Schema\.refinement\b/u],
    ["suspend", /Schema\.suspend\b/u],
    ["declaration", /Schema\.declare\b/u],
  ] as const
  return features.flatMap(([feature, pattern]) => pattern.test(initializerText) ? [feature] : [])
}

const compatibilityArtifactKind = (path: string): string => {
  if (/src\/attune\.package\.ts$/u.test(path)) return "attune-package-source"
  if (/src\/attune\.contract\.generated\.ts$/u.test(path)) return "generated-contract-companion"
  if (/src\/attune\.generated\.ts$/u.test(path)) return "generated-protocol-companion"
  if (/attune\.source-bom\.json$/u.test(path)) return "source-bom"
  if (/package-contracts\.typecheck\.generated\.ts$/u.test(path)) return "package-contract-typecheck-aggregate"
  if (/type-guidance/u.test(path)) return "type-guidance-compatibility"
  return "generated-contract-shard"
}

const compatibilitySourceMetadata = (path: string): string => {
  if (/attune\.source-bom\.json$/u.test(path)) return "source-bom-compat"
  if (/type-guidance/u.test(path)) return "type-guidance-compat"
  if (/src\/attune\.(?:contract\.)?generated\.ts$/u.test(path)) return "generated-companion-compat"
  return "package-contract-compat"
}

const stringValue = (
  row: ProgramIndexViewRow,
  key: string,
  fallback = "",
): string => {
  const value = row[key]
  return typeof value === "string" ? value : fallback
}

const diagnosticSeverity = (
  value: ProgramIndexViewRow[string],
): AttuneProtocolDiagnostic["severity"] =>
  value === "error" || value === "warning" || value === "info" ? value : "info"

const sourceRangeFromRow = (
  row: ProgramIndexViewRow,
): SourceRange | undefined => {
  const value = jsonValueFromRow(row, "range_json")
  if (
    typeof value === "object" &&
    value !== null &&
    "start" in value &&
    "end" in value &&
    typeof value.start === "number" &&
    typeof value.end === "number"
  ) {
    return { start: value.start, end: value.end }
  }
  return undefined
}

const programIndexRepairRowToProtocolAction = (
  row: ProgramIndexViewRow,
): AttuneProtocolAction => {
  const nxTarget = stringValue(row, "nx_target")
  const repairKind = stringValue(row, "repair_kind")
  const safety = stringValue(row, "safety")
  const payload = jsonValueFromRow(row, "payload_json")
  return {
    id: stringValue(row, "repair_id", stringValue(row, "diagnostic_id", "program-index-repair")),
    title: repairKind.length === 0
      ? "Review program-index repair"
      : `Run ${repairKind} repair`,
    kind: nxTarget.length === 0 ? "debug" : "nx-generator",
    ...(nxTarget.length === 0 ? {} : { target: nxTarget }),
    options: {
      source: "program-index",
      diagnosticId: stringValue(row, "diagnostic_id"),
      safety,
      ...(repairKind.length === 0 ? {} : { repairKind }),
      ...(payload === undefined ? {} : { payload }),
    },
  }
}

const jsonValueFromRow = (
  row: ProgramIndexViewRow,
  key: string,
): unknown | undefined => {
  const value = row[key]
  if (typeof value !== "string" || value.length === 0) return undefined
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

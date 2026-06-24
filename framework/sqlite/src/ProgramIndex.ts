import { createHash } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"

import { Context, Data, Effect, Layer } from "effect"

export const defaultProgramIndexPath = ".attune/cache/program-index.sqlite"

export const programIndexBackendName = "node:sqlite"

export class ProgramIndexError extends Data.TaggedError("ProgramIndexError")<{
  readonly operation: string
  readonly message: string
  readonly cause?: unknown
}> {}

export interface ProgramIndexProject {
  readonly id: string
  readonly root: string
  readonly sourceRoot?: string
  readonly projectType?: string
  readonly hash?: string
  readonly updatedAt: string
}

export interface ProgramIndexTarget {
  readonly projectId: string
  readonly name: string
  readonly executor?: string
  readonly optionsJson?: string
  readonly configurationsJson?: string
}

export interface ProgramIndexSourceFile {
  readonly id: string
  readonly projectId?: string
  readonly path: string
  readonly hash: string
  readonly updatedAt: string
}

export interface ProgramIndexSymbol {
  readonly id: string
  readonly projectId?: string
  readonly sourceFileId?: string
  readonly exportName?: string
  readonly localName?: string
  readonly kind?: string
  readonly rangeJson?: string
  readonly hash?: string
}

export interface ProgramIndexSchemaDescriptor {
  readonly id: string
  readonly symbolId: string
  readonly role?: string
  readonly astHash?: string
  readonly descriptorVersion: number
  readonly shapeJson?: string
  readonly annotationsJson?: string
  readonly serializationStatus: "serializable" | "partial" | "unsupported"
  readonly nonSerializableFeaturesJson?: string
}

export interface ProgramIndexEdge {
  readonly id: string
  readonly fromSymbolId: string
  readonly toSymbolId: string
  readonly kind: string
  readonly source?: string
}

export interface ProgramIndexArtifact {
  readonly id: string
  readonly projectId?: string
  readonly path: string
  readonly kind?: string
  readonly builtFromHash?: string
  readonly currentHash?: string
  readonly status: "current" | "stale" | "missing" | "unknown"
}

export interface ProgramIndexObservation {
  readonly id: string
  readonly symbolId?: string
  readonly projectId?: string
  readonly kind: string
  readonly status: string
  readonly payloadJson?: string
  readonly createdAt: string
}

export interface ProgramIndexDiagnostic {
  readonly id: string
  readonly projectId?: string
  readonly sourceFileId?: string
  readonly rangeJson?: string
  readonly code: string
  readonly severity: "error" | "warning" | "info"
  readonly message: string
  readonly causeJson?: string
}

export interface ProgramIndexRepair {
  readonly id: string
  readonly diagnosticId: string
  readonly safety: "safe" | "needs-review" | "manual-only"
  readonly nxTarget?: string
  readonly repairKind?: string
  readonly route?: string
  readonly payloadJson?: string
  readonly validationAfterTargetsJson?: string
  readonly createdAt: string
}

export interface ProgramIndexInvalidation {
  readonly id: number
  readonly key: string
  readonly subject: string
  readonly createdAt: string
  readonly consumedAt?: string
}

export interface ProgramIndexProjectHealth {
  readonly projectId: string
  readonly root: string
  readonly sourceFileCount: number
  readonly symbolCount: number
  readonly diagnosticCount: number
  readonly errorCount: number
  readonly warningCount: number
  readonly staleArtifactCount: number
  readonly safeRepairCount: number
}

export interface ProgramIndexRowCounts {
  readonly projects: number
  readonly targets: number
  readonly sourceFiles: number
  readonly symbols: number
  readonly schemaDescriptors: number
  readonly edges: number
  readonly artifacts: number
  readonly observations: number
  readonly diagnostics: number
  readonly repairs: number
  readonly invalidations: number
}

export interface ProgramIndexHealth {
  readonly ok: boolean
  readonly backend: "memory" | typeof programIndexBackendName
  readonly path: string
  readonly migrationVersion: number
  readonly rowCounts: ProgramIndexRowCounts
  readonly detail: string
}

export interface ProgramIndexSnapshot {
  readonly projects: readonly ProgramIndexProject[]
  readonly targets: readonly ProgramIndexTarget[]
  readonly sourceFiles: readonly ProgramIndexSourceFile[]
  readonly symbols: readonly ProgramIndexSymbol[]
  readonly schemaDescriptors: readonly ProgramIndexSchemaDescriptor[]
  readonly edges: readonly ProgramIndexEdge[]
  readonly artifacts: readonly ProgramIndexArtifact[]
  readonly observations: readonly ProgramIndexObservation[]
  readonly diagnostics: readonly ProgramIndexDiagnostic[]
  readonly repairs: readonly ProgramIndexRepair[]
  readonly invalidations: readonly ProgramIndexInvalidation[]
}

export interface ProgramIndexProjectFilter {
  readonly projectId?: string
}

export interface ProgramIndexSourceFileFilter extends ProgramIndexProjectFilter {
  readonly sourceFileId?: string
  readonly path?: string
}

export interface ProgramIndexSymbolFilter extends ProgramIndexProjectFilter {
  readonly sourceFileId?: string
  readonly symbolId?: string
}

export interface ProgramIndexInvalidationFilter {
  readonly key?: string
  readonly unconsumed?: boolean
}

export interface ProgramIndexRepairableDiagnosticFilter extends ProgramIndexProjectFilter {
  readonly path?: string
  readonly diagnosticId?: string
}

export type ProgramIndexViewRow = Readonly<Record<string, string | number | null>>

export interface ProgramIndexApi {
  readonly initialize: () => Effect.Effect<ProgramIndexHealth, ProgramIndexError>
  readonly reset: () => Effect.Effect<void, ProgramIndexError>
  readonly reinitialize: () => Effect.Effect<ProgramIndexHealth, ProgramIndexError>
  readonly health: () => Effect.Effect<ProgramIndexHealth, ProgramIndexError>
  readonly putProjects: (
    rows: readonly ProgramIndexProject[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putTargets: (
    rows: readonly ProgramIndexTarget[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putSourceFiles: (
    rows: readonly ProgramIndexSourceFile[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putSymbols: (
    rows: readonly ProgramIndexSymbol[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putSchemaDescriptors: (
    rows: readonly ProgramIndexSchemaDescriptor[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putEdges: (
    rows: readonly ProgramIndexEdge[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putArtifacts: (
    rows: readonly ProgramIndexArtifact[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putObservations: (
    rows: readonly ProgramIndexObservation[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putDiagnostics: (
    rows: readonly ProgramIndexDiagnostic[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly putRepairs: (
    rows: readonly ProgramIndexRepair[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly deleteRepairs: (
    ids: readonly string[],
  ) => Effect.Effect<void, ProgramIndexError>
  readonly recordInvalidation: (
    key: string,
    subject: string,
  ) => Effect.Effect<void, ProgramIndexError>
  readonly listProjects: (
    filter?: ProgramIndexProjectFilter,
  ) => Effect.Effect<readonly ProgramIndexProject[], ProgramIndexError>
  readonly listTargets: (
    filter?: ProgramIndexProjectFilter,
  ) => Effect.Effect<readonly ProgramIndexTarget[], ProgramIndexError>
  readonly listSourceFiles: (
    filter?: ProgramIndexSourceFileFilter,
  ) => Effect.Effect<readonly ProgramIndexSourceFile[], ProgramIndexError>
  readonly listSymbols: (
    filter?: ProgramIndexSymbolFilter,
  ) => Effect.Effect<readonly ProgramIndexSymbol[], ProgramIndexError>
  readonly listSchemaDescriptors: (
    filter?: { readonly symbolId?: string },
  ) => Effect.Effect<readonly ProgramIndexSchemaDescriptor[], ProgramIndexError>
  readonly listEdges: (
    filter?: { readonly symbolId?: string },
  ) => Effect.Effect<readonly ProgramIndexEdge[], ProgramIndexError>
  readonly listArtifacts: (
    filter?: ProgramIndexProjectFilter,
  ) => Effect.Effect<readonly ProgramIndexArtifact[], ProgramIndexError>
  readonly listObservations: (
    filter?: ProgramIndexProjectFilter,
  ) => Effect.Effect<readonly ProgramIndexObservation[], ProgramIndexError>
  readonly listDiagnostics: (
    filter?: ProgramIndexSourceFileFilter,
  ) => Effect.Effect<readonly ProgramIndexDiagnostic[], ProgramIndexError>
  readonly listRepairs: (
    filter?: { readonly diagnosticId?: string },
  ) => Effect.Effect<readonly ProgramIndexRepair[], ProgramIndexError>
  readonly listInvalidations: (
    filter?: ProgramIndexInvalidationFilter,
  ) => Effect.Effect<readonly ProgramIndexInvalidation[], ProgramIndexError>
  readonly markInvalidationsConsumed: (
    ids: readonly number[],
    consumedAt?: string,
  ) => Effect.Effect<void, ProgramIndexError>
  readonly listSymbolsByFile: (
    path?: string,
  ) => Effect.Effect<readonly ProgramIndexViewRow[], ProgramIndexError>
  readonly listSchemasBySymbol: (
    symbolId?: string,
  ) => Effect.Effect<readonly ProgramIndexViewRow[], ProgramIndexError>
  readonly listEdgesBySymbol: (
    symbolId?: string,
  ) => Effect.Effect<readonly ProgramIndexViewRow[], ProgramIndexError>
  readonly listStaleArtifacts: (
    projectId?: string,
  ) => Effect.Effect<readonly ProgramIndexViewRow[], ProgramIndexError>
  readonly listDiagnosticsByFile: (
    path?: string,
  ) => Effect.Effect<readonly ProgramIndexViewRow[], ProgramIndexError>
  readonly listRepairableDiagnostics: (
    filter?: string | ProgramIndexRepairableDiagnosticFilter,
  ) => Effect.Effect<readonly ProgramIndexViewRow[], ProgramIndexError>
  readonly listProjectHealth: () => Effect.Effect<readonly ProgramIndexProjectHealth[], ProgramIndexError>
  readonly listSchemaSerializationIssues: (
    projectId?: string,
  ) => Effect.Effect<readonly ProgramIndexViewRow[], ProgramIndexError>
  readonly listPackageLocalAttuneCompanions: (
    projectId?: string,
  ) => Effect.Effect<readonly ProgramIndexViewRow[], ProgramIndexError>
  readonly snapshot: () => Effect.Effect<ProgramIndexSnapshot, ProgramIndexError>
  readonly close: () => Effect.Effect<void, ProgramIndexError>
}

export interface SqliteProgramIndexOptions {
  readonly path?: string
}

export const programIndexContentHash = (content: string | Uint8Array): string =>
  createHash("sha256").update(content).digest("hex")

export const programIndexJson = (value: unknown): string =>
  JSON.stringify(value)

export const createInMemoryProgramIndex = (): ProgramIndexApi => {
  let projects: readonly ProgramIndexProject[] = []
  let targets: readonly ProgramIndexTarget[] = []
  let sourceFiles: readonly ProgramIndexSourceFile[] = []
  let symbols: readonly ProgramIndexSymbol[] = []
  let schemaDescriptors: readonly ProgramIndexSchemaDescriptor[] = []
  let edges: readonly ProgramIndexEdge[] = []
  let artifacts: readonly ProgramIndexArtifact[] = []
  let observations: readonly ProgramIndexObservation[] = []
  let diagnostics: readonly ProgramIndexDiagnostic[] = []
  let repairs: readonly ProgramIndexRepair[] = []
  let invalidations: readonly ProgramIndexInvalidation[] = []
  let invalidationId = 0

  const now = (): string => new Date().toISOString()
  const record = (key: string, subject: string): void => {
    invalidationId += 1
    invalidations = [...invalidations, { id: invalidationId, key, subject, createdAt: now() }]
  }
  const rowCounts = (): ProgramIndexRowCounts => ({
    projects: projects.length,
    targets: targets.length,
    sourceFiles: sourceFiles.length,
    symbols: symbols.length,
    schemaDescriptors: schemaDescriptors.length,
    edges: edges.length,
    artifacts: artifacts.length,
    observations: observations.length,
    diagnostics: diagnostics.length,
    repairs: repairs.length,
    invalidations: invalidations.length,
  })
  const health = (): ProgramIndexHealth => ({
    ok: true,
    backend: "memory",
    path: ":memory:",
    migrationVersion: latestProgramIndexMigrationVersion,
    rowCounts: rowCounts(),
    detail: "In-memory program index is initialized.",
  })

  return {
    initialize: () => Effect.succeed(health()),
    reset: () =>
      Effect.sync(() => {
        projects = []
        targets = []
        sourceFiles = []
        symbols = []
        schemaDescriptors = []
        edges = []
        artifacts = []
        observations = []
        diagnostics = []
        repairs = []
        invalidations = []
        invalidationId = 0
      }),
    reinitialize: () =>
      Effect.sync(() => {
        projects = []
        targets = []
        sourceFiles = []
        symbols = []
        schemaDescriptors = []
        edges = []
        artifacts = []
        observations = []
        diagnostics = []
        repairs = []
        invalidations = []
        invalidationId = 0
        return health()
      }),
    health: () => Effect.succeed(health()),
    putProjects: (rows) =>
      Effect.sync(() => {
        projects = upsertMany(projects, rows, (row) => row.id)
      }),
    putTargets: (rows) =>
      Effect.sync(() => {
        targets = upsertMany(targets, rows, (row) => `${row.projectId}:${row.name}`)
      }),
    putSourceFiles: (rows) =>
      Effect.sync(() => {
        sourceFiles = upsertMany(sourceFiles, rows, (row) => row.id)
      }),
    putSymbols: (rows) =>
      Effect.sync(() => {
        symbols = upsertMany(symbols, rows, (row) => row.id)
        for (const row of rows) record("symbol", row.id)
      }),
    putSchemaDescriptors: (rows) =>
      Effect.sync(() => {
        schemaDescriptors = upsertMany(schemaDescriptors, rows, (row) => row.id)
        for (const row of rows) record("schema", row.id)
      }),
    putEdges: (rows) =>
      Effect.sync(() => {
        edges = upsertMany(edges, rows, (row) => row.id)
      }),
    putArtifacts: (rows) =>
      Effect.sync(() => {
        artifacts = upsertMany(artifacts, rows, (row) => row.id)
        for (const row of rows) record("artifact", row.id)
      }),
    putObservations: (rows) =>
      Effect.sync(() => {
        observations = upsertMany(observations, rows, (row) => row.id)
        for (const row of rows) record("observation", row.id)
      }),
    putDiagnostics: (rows) =>
      Effect.sync(() => {
        diagnostics = upsertMany(diagnostics, rows, (row) => row.id)
        for (const row of rows) record("diagnostic", row.id)
      }),
    putRepairs: (rows) =>
      Effect.sync(() => {
        repairs = upsertMany(repairs, rows, (row) => row.id)
        for (const row of rows) record("repair", row.id)
      }),
    deleteRepairs: (ids) =>
      Effect.sync(() => {
        const selected = new Set(ids)
        repairs = repairs.filter((row) => !selected.has(row.id))
        for (const id of ids) record("repair", id)
      }),
    recordInvalidation: (key, subject) => Effect.sync(() => record(key, subject)),
    listProjects: (filter = {}) => Effect.succeed(projects.filter((row) => matchesProject(row, filter))),
    listTargets: (filter = {}) => Effect.succeed(targets.filter((row) => matchesProject(row, filter))),
    listSourceFiles: (filter = {}) => Effect.succeed(sourceFiles.filter((row) => matchesSourceFile(row, filter))),
    listSymbols: (filter = {}) => Effect.succeed(symbols.filter((row) => matchesSymbol(row, filter))),
    listSchemaDescriptors: (filter = {}) =>
      Effect.succeed(schemaDescriptors.filter((row) =>
        filter.symbolId === undefined || row.symbolId === filter.symbolId
      )),
    listEdges: (filter = {}) =>
      Effect.succeed(edges.filter((row) =>
        filter.symbolId === undefined ||
        row.fromSymbolId === filter.symbolId ||
        row.toSymbolId === filter.symbolId
      )),
    listArtifacts: (filter = {}) => Effect.succeed(artifacts.filter((row) => matchesProject(row, filter))),
    listObservations: (filter = {}) => Effect.succeed(observations.filter((row) => matchesProject(row, filter))),
    listDiagnostics: (filter = {}) => Effect.succeed(diagnostics.filter((row) => matchesDiagnostic(row, filter))),
    listRepairs: (filter = {}) =>
      Effect.succeed(repairs.filter((row) =>
        filter.diagnosticId === undefined || row.diagnosticId === filter.diagnosticId
      )),
    listInvalidations: (filter = {}) =>
      Effect.succeed(invalidations.filter((row) =>
        (filter.key === undefined || row.key === filter.key) &&
        (filter.unconsumed !== true || row.consumedAt === undefined)
      )),
    markInvalidationsConsumed: (ids, consumedAt = now()) =>
      Effect.sync(() => {
        const selected = new Set(ids)
        invalidations = invalidations.map((row) =>
          selected.has(row.id) ? { ...row, consumedAt } : row
        )
      }),
    listSymbolsByFile: (path) =>
      Effect.succeed(symbolsByFileRows(sourceFiles, symbols, path)),
    listSchemasBySymbol: (symbolId) =>
      Effect.succeed(schemaDescriptors
        .filter((row) => symbolId === undefined || row.symbolId === symbolId)
        .map((row) => viewRow(row))),
    listEdgesBySymbol: (symbolId) =>
      Effect.succeed(edges
        .filter((row) =>
          symbolId === undefined || row.fromSymbolId === symbolId || row.toSymbolId === symbolId
        )
        .map((row) => viewRow(row))),
    listStaleArtifacts: (projectId) =>
      Effect.succeed(artifacts
        .filter((row) =>
          (projectId === undefined || row.projectId === projectId) &&
          row.status !== "current"
        )
        .map((row) => viewRow(row))),
    listDiagnosticsByFile: (path) =>
      Effect.succeed(diagnosticsByFileRows(sourceFiles, diagnostics, path)),
    listRepairableDiagnostics: (filter) =>
      Effect.succeed(repairableDiagnosticRows(
        sourceFiles,
        diagnostics,
        repairs,
        normalizeRepairableDiagnosticFilter(filter),
      )),
    listProjectHealth: () =>
      Effect.succeed(projectHealthRows(projects, sourceFiles, symbols, artifacts, diagnostics, repairs)),
    listSchemaSerializationIssues: (projectId) =>
      Effect.succeed(schemaDescriptors
        .filter((row) => row.serializationStatus !== "serializable")
        .filter((row) => {
          if (projectId === undefined) return true
          const symbol = symbols.find((candidate) => candidate.id === row.symbolId)
          return symbol?.projectId === projectId
        })
        .map((row) => viewRow(row))),
    listPackageLocalAttuneCompanions: (projectId) =>
      Effect.succeed(artifacts
        .filter((row) =>
          (projectId === undefined || row.projectId === projectId) &&
          isPackageLocalAttuneCompanion(row.path)
        )
        .map((row) => viewRow(row))),
    snapshot: () =>
      Effect.succeed({
        projects,
        targets,
        sourceFiles,
        symbols,
        schemaDescriptors,
        edges,
        artifacts,
        observations,
        diagnostics,
        repairs,
        invalidations,
      }),
    close: () => Effect.void,
  }
}

export const createSqliteProgramIndex = ({
  path = defaultProgramIndexPath,
}: SqliteProgramIndexOptions = {}): ProgramIndexApi => {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true })
  }

  const database = new DatabaseSync(path)
  migrateProgramIndex(database)

  const putProject = database.prepare(`
    INSERT OR REPLACE INTO project
      (id, root, source_root, project_type, hash, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const putTarget = database.prepare(`
    INSERT OR REPLACE INTO target
      (project_id, name, executor, options_json, configurations_json)
    VALUES (?, ?, ?, ?, ?)
  `)
  const putSourceFile = database.prepare(`
    INSERT OR REPLACE INTO source_file
      (id, project_id, path, hash, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  const putSymbol = database.prepare(`
    INSERT OR REPLACE INTO symbol
      (id, project_id, source_file_id, export_name, local_name, kind, range_json, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putSchema = database.prepare(`
    INSERT OR REPLACE INTO schema_descriptor
      (id, symbol_id, role, ast_hash, descriptor_version, shape_json, annotations_json, serialization_status, non_serializable_features_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putEdge = database.prepare(`
    INSERT OR REPLACE INTO edge
      (id, from_symbol_id, to_symbol_id, kind, source)
    VALUES (?, ?, ?, ?, ?)
  `)
  const putArtifact = database.prepare(`
    INSERT OR REPLACE INTO artifact
      (id, project_id, path, kind, built_from_hash, current_hash, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putObservation = database.prepare(`
    INSERT OR REPLACE INTO observation
      (id, symbol_id, project_id, kind, status, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const putDiagnostic = database.prepare(`
    INSERT OR REPLACE INTO diagnostic
      (id, project_id, source_file_id, range_json, code, severity, message, cause_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const putRepair = database.prepare(`
    INSERT INTO repair
      (id, diagnostic_id, safety, nx_target, repair_kind, route, payload_json, validation_after_targets_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      diagnostic_id = excluded.diagnostic_id,
      safety = excluded.safety,
      nx_target = excluded.nx_target,
      repair_kind = excluded.repair_kind,
      route = excluded.route,
      payload_json = excluded.payload_json,
      validation_after_targets_json = excluded.validation_after_targets_json,
      created_at = excluded.created_at
  `)
  const deleteRepair = database.prepare(`
    DELETE FROM repair WHERE id = ?
  `)
  const putInvalidation = database.prepare(`
    INSERT INTO invalidation_log (key, subject) VALUES (?, ?)
  `)
  const markInvalidationConsumed = database.prepare(`
    UPDATE invalidation_log SET consumed_at = ? WHERE id = ?
  `)

  const indexEffect = <A>(
    operation: string,
    run: () => A,
  ): Effect.Effect<A, ProgramIndexError> =>
    Effect.try({
      catch: (cause) => toProgramIndexError(operation, cause),
      try: run,
    })

  const readHealth = (): ProgramIndexHealth => ({
    ok: true,
    backend: programIndexBackendName,
    path,
    migrationVersion: programIndexMigrationVersion(database),
    rowCounts: sqliteProgramIndexRowCounts(database),
    detail: "SQLite program index is initialized.",
  })

  return {
    initialize: () => indexEffect("initialize", () => {
      migrateProgramIndex(database)
      return readHealth()
    }),
    reset: () => indexEffect("reset", () => resetProgramIndexRows(database)),
    reinitialize: () => indexEffect("reinitialize", () => {
      resetProgramIndexRows(database)
      migrateProgramIndex(database)
      return readHealth()
    }),
    health: () => indexEffect("health", readHealth),
    putProjects: (rows) => indexEffect("putProjects", () => {
      for (const row of rows) {
        putProject.run(
          row.id,
          row.root,
          row.sourceRoot ?? null,
          row.projectType ?? null,
          row.hash ?? null,
          row.updatedAt,
        )
      }
    }),
    putTargets: (rows) => indexEffect("putTargets", () => {
      for (const row of rows) {
        putTarget.run(
          row.projectId,
          row.name,
          row.executor ?? null,
          row.optionsJson ?? null,
          row.configurationsJson ?? null,
        )
      }
    }),
    putSourceFiles: (rows) => indexEffect("putSourceFiles", () => {
      for (const row of rows) {
        putSourceFile.run(
          row.id,
          row.projectId ?? null,
          row.path,
          row.hash,
          row.updatedAt,
        )
      }
    }),
    putSymbols: (rows) => indexEffect("putSymbols", () => {
      for (const row of rows) {
        putSymbol.run(
          row.id,
          row.projectId ?? null,
          row.sourceFileId ?? null,
          row.exportName ?? null,
          row.localName ?? null,
          row.kind ?? null,
          row.rangeJson ?? null,
          row.hash ?? null,
        )
      }
    }),
    putSchemaDescriptors: (rows) => indexEffect("putSchemaDescriptors", () => {
      for (const row of rows) {
        putSchema.run(
          row.id,
          row.symbolId,
          row.role ?? null,
          row.astHash ?? null,
          row.descriptorVersion,
          row.shapeJson ?? null,
          row.annotationsJson ?? null,
          row.serializationStatus,
          row.nonSerializableFeaturesJson ?? null,
        )
      }
    }),
    putEdges: (rows) => indexEffect("putEdges", () => {
      for (const row of rows) {
        putEdge.run(
          row.id,
          row.fromSymbolId,
          row.toSymbolId,
          row.kind,
          row.source ?? null,
        )
      }
    }),
    putArtifacts: (rows) => indexEffect("putArtifacts", () => {
      for (const row of rows) {
        putArtifact.run(
          row.id,
          row.projectId ?? null,
          row.path,
          row.kind ?? null,
          row.builtFromHash ?? null,
          row.currentHash ?? null,
          row.status,
        )
      }
    }),
    putObservations: (rows) => indexEffect("putObservations", () => {
      for (const row of rows) {
        putObservation.run(
          row.id,
          row.symbolId ?? null,
          row.projectId ?? null,
          row.kind,
          row.status,
          row.payloadJson ?? null,
          row.createdAt,
        )
      }
    }),
    putDiagnostics: (rows) => indexEffect("putDiagnostics", () => {
      for (const row of rows) {
        putDiagnostic.run(
          row.id,
          row.projectId ?? null,
          row.sourceFileId ?? null,
          row.rangeJson ?? null,
          row.code,
          row.severity,
          row.message,
          row.causeJson ?? null,
        )
      }
    }),
    putRepairs: (rows) => indexEffect("putRepairs", () => {
      for (const row of rows) {
        putRepair.run(
          row.id,
          row.diagnosticId,
          row.safety,
          row.nxTarget ?? null,
          row.repairKind ?? null,
          row.route ?? null,
          row.payloadJson ?? null,
          row.validationAfterTargetsJson ?? null,
          row.createdAt,
        )
      }
    }),
    deleteRepairs: (ids) => indexEffect("deleteRepairs", () => {
      for (const id of ids) deleteRepair.run(id)
    }),
    recordInvalidation: (key, subject) => indexEffect("recordInvalidation", () => putInvalidation.run(key, subject)),
    listProjects: (filter = {}) => indexEffect("listProjects", () => readProjects(database, filter)),
    listTargets: (filter = {}) => indexEffect("listTargets", () => readTargets(database, filter)),
    listSourceFiles: (filter = {}) => indexEffect("listSourceFiles", () => readSourceFiles(database, filter)),
    listSymbols: (filter = {}) => indexEffect("listSymbols", () => readSymbols(database, filter)),
    listSchemaDescriptors: (filter = {}) =>
      indexEffect("listSchemaDescriptors", () => readSchemaDescriptors(database, filter)),
    listEdges: (filter = {}) => indexEffect("listEdges", () => readEdges(database, filter)),
    listArtifacts: (filter = {}) => indexEffect("listArtifacts", () => readArtifacts(database, filter)),
    listObservations: (filter = {}) => indexEffect("listObservations", () => readObservations(database, filter)),
    listDiagnostics: (filter = {}) => indexEffect("listDiagnostics", () => readDiagnostics(database, filter)),
    listRepairs: (filter = {}) => indexEffect("listRepairs", () => readRepairs(database, filter)),
    listInvalidations: (filter = {}) => indexEffect("listInvalidations", () => readInvalidations(database, filter)),
    markInvalidationsConsumed: (ids, consumedAt = new Date().toISOString()) =>
      indexEffect("markInvalidationsConsumed", () => {
        for (const id of ids) markInvalidationConsumed.run(consumedAt, id)
      }),
    listSymbolsByFile: (path) =>
      indexEffect("listSymbolsByFile", () => readView(database, "symbols_by_file", path === undefined ? "" : "path = ?", path === undefined ? [] : [path])),
    listSchemasBySymbol: (symbolId) =>
      indexEffect("listSchemasBySymbol", () => readView(database, "schemas_by_symbol", symbolId === undefined ? "" : "symbol_id = ?", symbolId === undefined ? [] : [symbolId])),
    listEdgesBySymbol: (symbolId) =>
      indexEffect("listEdgesBySymbol", () => readView(database, "edges_by_symbol", symbolId === undefined ? "" : "(from_symbol_id = ? OR to_symbol_id = ?)", symbolId === undefined ? [] : [symbolId, symbolId])),
    listStaleArtifacts: (projectId) =>
      indexEffect("listStaleArtifacts", () => readView(database, "stale_artifacts", projectId === undefined ? "" : "project_id = ?", projectId === undefined ? [] : [projectId])),
    listDiagnosticsByFile: (path) =>
      indexEffect("listDiagnosticsByFile", () => readView(database, "diagnostics_by_file", path === undefined ? "" : "path = ?", path === undefined ? [] : [path])),
    listRepairableDiagnostics: (filter) =>
      indexEffect("listRepairableDiagnostics", () => {
        const repairableFilter = whereRepairableDiagnostic(normalizeRepairableDiagnosticFilter(filter))
        return readView(database, "repairable_diagnostics", repairableFilter.sql, repairableFilter.parameters)
      }),
    listProjectHealth: () => indexEffect("listProjectHealth", () => readProjectHealth(database)),
    listSchemaSerializationIssues: (projectId) =>
      indexEffect("listSchemaSerializationIssues", () => readView(database, "symbols_with_schema_serialization_issues", projectId === undefined ? "" : "project_id = ?", projectId === undefined ? [] : [projectId])),
    listPackageLocalAttuneCompanions: (projectId) =>
      indexEffect("listPackageLocalAttuneCompanions", () => readView(database, "package_local_attune_companions", projectId === undefined ? "" : "project_id = ?", projectId === undefined ? [] : [projectId])),
    snapshot: () =>
      indexEffect("snapshot", () => ({
        projects: readProjects(database),
        targets: readTargets(database),
        sourceFiles: readSourceFiles(database),
        symbols: readSymbols(database),
        schemaDescriptors: readSchemaDescriptors(database),
        edges: readEdges(database),
        artifacts: readArtifacts(database),
        observations: readObservations(database),
        diagnostics: readDiagnostics(database),
        repairs: readRepairs(database),
        invalidations: readInvalidations(database),
      })),
    close: () => indexEffect("close", () => database.close()),
  }
}

export class ProgramIndex extends Context.Service<
  ProgramIndex,
  ProgramIndexApi
>()("@attune/framework-sqlite/ProgramIndex") {
  static fromService(service: ProgramIndexApi): Layer.Layer<ProgramIndex> {
    return Layer.succeed(ProgramIndex, service)
  }

  static sqlite(options: SqliteProgramIndexOptions = {}): Layer.Layer<ProgramIndex> {
    return Layer.effect(
      ProgramIndex,
      Effect.sync(() => createSqliteProgramIndex(options)),
    )
  }
}

export const ProgramIndexLive = ProgramIndex.sqlite()

export const ProgramIndexTest = (): Layer.Layer<ProgramIndex> =>
  ProgramIndex.fromService(createInMemoryProgramIndex())

const upsertMany = <Row>(
  existing: readonly Row[],
  incoming: readonly Row[],
  key: (row: Row) => string,
): readonly Row[] => {
  const incomingKeys = new Set(incoming.map(key))
  return [
    ...existing.filter((row) => !incomingKeys.has(key(row))),
    ...incoming,
  ]
}

const matchesProject = (
  row: { readonly projectId?: string; readonly id?: string },
  filter: ProgramIndexProjectFilter,
): boolean => filter.projectId === undefined || row.projectId === filter.projectId || row.id === filter.projectId

const matchesSourceFile = (
  row: ProgramIndexSourceFile,
  filter: ProgramIndexSourceFileFilter,
): boolean =>
  matchesProject(row, filter) &&
  (filter.sourceFileId === undefined || row.id === filter.sourceFileId) &&
  (filter.path === undefined || row.path === filter.path)

const matchesSymbol = (
  row: ProgramIndexSymbol,
  filter: ProgramIndexSymbolFilter,
): boolean =>
  matchesProject(row, filter) &&
  (filter.sourceFileId === undefined || row.sourceFileId === filter.sourceFileId) &&
  (filter.symbolId === undefined || row.id === filter.symbolId)

const matchesDiagnostic = (
  row: ProgramIndexDiagnostic,
  filter: ProgramIndexSourceFileFilter,
): boolean =>
  matchesProject(row, filter) &&
  (filter.sourceFileId === undefined || row.sourceFileId === filter.sourceFileId)

const normalizeRepairableDiagnosticFilter = (
  filter: string | ProgramIndexRepairableDiagnosticFilter | undefined,
): ProgramIndexRepairableDiagnosticFilter => {
  if (typeof filter === "string") return { projectId: filter }
  return filter ?? {}
}

const viewRow = (row: object): ProgramIndexViewRow =>
  Object.fromEntries(
    Object.entries(row as Record<string, unknown>).filter((entry): entry is [string, string | number | null] => {
      const value = entry[1]
      return value === null || typeof value === "string" || typeof value === "number"
    }),
  )

const symbolsByFileRows = (
  sourceFiles: readonly ProgramIndexSourceFile[],
  symbols: readonly ProgramIndexSymbol[],
  path?: string,
): readonly ProgramIndexViewRow[] => {
  const fileById = new Map(sourceFiles.map((file) => [file.id, file]))
  return symbols.flatMap((symbol) => {
    const file = symbol.sourceFileId === undefined ? undefined : fileById.get(symbol.sourceFileId)
    if (file === undefined || (path !== undefined && file.path !== path)) return []
    return [viewRow({
      path: file.path,
      source_file_id: file.id,
      project_id: symbol.projectId ?? file.projectId ?? null,
      symbol_id: symbol.id,
      export_name: symbol.exportName ?? null,
      local_name: symbol.localName ?? null,
      kind: symbol.kind ?? null,
      range_json: symbol.rangeJson ?? null,
    })]
  })
}

const diagnosticsByFileRows = (
  sourceFiles: readonly ProgramIndexSourceFile[],
  diagnostics: readonly ProgramIndexDiagnostic[],
  path?: string,
): readonly ProgramIndexViewRow[] => {
  const fileById = new Map(sourceFiles.map((file) => [file.id, file]))
  return diagnostics.flatMap((diagnostic) => {
    const file = diagnostic.sourceFileId === undefined ? undefined : fileById.get(diagnostic.sourceFileId)
    if (file === undefined || (path !== undefined && file.path !== path)) return []
    return [viewRow({
      path: file.path,
      diagnostic_id: diagnostic.id,
      project_id: diagnostic.projectId ?? file.projectId ?? null,
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
      range_json: diagnostic.rangeJson ?? null,
      cause_json: diagnostic.causeJson ?? null,
    })]
  })
}

const repairableDiagnosticRows = (
  sourceFiles: readonly ProgramIndexSourceFile[],
  diagnostics: readonly ProgramIndexDiagnostic[],
  repairs: readonly ProgramIndexRepair[],
  filter: ProgramIndexRepairableDiagnosticFilter = {},
): readonly ProgramIndexViewRow[] => {
  const diagnosticById = new Map(diagnostics.map((diagnostic) => [diagnostic.id, diagnostic]))
  const sourceFileById = new Map(sourceFiles.map((sourceFile) => [sourceFile.id, sourceFile]))
  return repairs.flatMap((repair) => {
    const diagnostic = diagnosticById.get(repair.diagnosticId)
    const sourceFile = diagnostic?.sourceFileId === undefined
      ? undefined
      : sourceFileById.get(diagnostic.sourceFileId)
    if (
      diagnostic === undefined ||
      (filter.projectId !== undefined && diagnostic.projectId !== filter.projectId) ||
      (filter.path !== undefined && sourceFile?.path !== filter.path) ||
      (filter.diagnosticId !== undefined && diagnostic.id !== filter.diagnosticId)
    ) {
      return []
    }
    return [viewRow({
      repair_id: repair.id,
      diagnostic_id: diagnostic.id,
      project_id: diagnostic.projectId ?? null,
      source_file_id: diagnostic.sourceFileId ?? null,
      path: sourceFile?.path ?? null,
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
      safety: repair.safety,
      nx_target: repair.nxTarget ?? null,
      repair_kind: repair.repairKind ?? null,
      route: repair.route ?? null,
      payload_json: repair.payloadJson ?? null,
      validation_after_targets_json: repair.validationAfterTargetsJson ?? null,
      created_at: repair.createdAt,
    })]
  })
}

const projectHealthRows = (
  projects: readonly ProgramIndexProject[],
  sourceFiles: readonly ProgramIndexSourceFile[],
  symbols: readonly ProgramIndexSymbol[],
  artifacts: readonly ProgramIndexArtifact[],
  diagnostics: readonly ProgramIndexDiagnostic[],
  repairs: readonly ProgramIndexRepair[],
): readonly ProgramIndexProjectHealth[] =>
  projects.map((project) => {
    const projectDiagnostics = diagnostics.filter((diagnostic) => diagnostic.projectId === project.id)
    const repairDiagnosticIds = new Set(projectDiagnostics.map((diagnostic) => diagnostic.id))
    return {
      projectId: project.id,
      root: project.root,
      sourceFileCount: sourceFiles.filter((file) => file.projectId === project.id).length,
      symbolCount: symbols.filter((symbol) => symbol.projectId === project.id).length,
      diagnosticCount: projectDiagnostics.length,
      errorCount: projectDiagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
      warningCount: projectDiagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
      staleArtifactCount: artifacts.filter((artifact) =>
        artifact.projectId === project.id && artifact.status !== "current"
      ).length,
      safeRepairCount: repairs.filter((repair) =>
        repair.safety === "safe" && repairDiagnosticIds.has(repair.diagnosticId)
      ).length,
    }
  })

const isPackageLocalAttuneCompanion = (path: string): boolean =>
  /(^|\/)attune\.source-bom\.json$/u.test(path) ||
  /(^|\/)src\/attune\.(generated|contract\.generated|package\.typecheck)\.ts$/u.test(path)

const programIndexInitialMigrationSql = `
CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY,
  root TEXT NOT NULL,
  source_root TEXT,
  project_type TEXT,
  hash TEXT,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS target (
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  executor TEXT,
  options_json TEXT,
  configurations_json TEXT,
  PRIMARY KEY(project_id, name)
) STRICT;

CREATE TABLE IF NOT EXISTS source_file (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  path TEXT NOT NULL,
  hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS symbol (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  source_file_id TEXT,
  export_name TEXT,
  local_name TEXT,
  kind TEXT,
  range_json TEXT,
  hash TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS schema_descriptor (
  id TEXT PRIMARY KEY,
  symbol_id TEXT NOT NULL,
  role TEXT,
  ast_hash TEXT,
  descriptor_version INTEGER NOT NULL,
  shape_json TEXT,
  annotations_json TEXT,
  serialization_status TEXT NOT NULL,
  non_serializable_features_json TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS edge (
  id TEXT PRIMARY KEY,
  from_symbol_id TEXT NOT NULL,
  to_symbol_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS artifact (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  path TEXT NOT NULL,
  kind TEXT,
  built_from_hash TEXT,
  current_hash TEXT,
  status TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS observation (
  id TEXT PRIMARY KEY,
  symbol_id TEXT,
  project_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS diagnostic (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  source_file_id TEXT,
  range_json TEXT,
  code TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  cause_json TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS repair (
  id TEXT PRIMARY KEY,
  diagnostic_id TEXT NOT NULL,
  safety TEXT NOT NULL,
  nx_target TEXT,
  repair_kind TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS invalidation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT current_timestamp,
  consumed_at TEXT
) STRICT;
`

const programIndexViewMigrationSql = `
CREATE VIEW IF NOT EXISTS symbols_by_file AS
SELECT
  source_file.path,
  source_file.id AS source_file_id,
  COALESCE(symbol.project_id, source_file.project_id) AS project_id,
  symbol.id AS symbol_id,
  symbol.export_name,
  symbol.local_name,
  symbol.kind,
  symbol.range_json,
  symbol.hash
FROM symbol
JOIN source_file ON source_file.id = symbol.source_file_id;

CREATE VIEW IF NOT EXISTS schemas_by_symbol AS
SELECT
  schema_descriptor.*,
  symbol.project_id,
  symbol.source_file_id,
  symbol.export_name,
  symbol.kind AS symbol_kind
FROM schema_descriptor
JOIN symbol ON symbol.id = schema_descriptor.symbol_id;

CREATE VIEW IF NOT EXISTS edges_by_symbol AS
SELECT * FROM edge;

CREATE VIEW IF NOT EXISTS stale_artifacts AS
SELECT * FROM artifact WHERE status != 'current';

CREATE VIEW IF NOT EXISTS diagnostics_by_file AS
SELECT
  source_file.path,
  diagnostic.id AS diagnostic_id,
  diagnostic.project_id,
  diagnostic.source_file_id,
  diagnostic.range_json,
  diagnostic.code,
  diagnostic.severity,
  diagnostic.message,
  diagnostic.cause_json
FROM diagnostic
LEFT JOIN source_file ON source_file.id = diagnostic.source_file_id;

CREATE VIEW IF NOT EXISTS repairable_diagnostics AS
SELECT
  repair.id AS repair_id,
  repair.diagnostic_id,
  diagnostic.project_id,
  diagnostic.source_file_id,
  source_file.path,
  diagnostic.code,
  diagnostic.severity,
  diagnostic.message,
  repair.safety,
  repair.nx_target,
  repair.repair_kind,
  NULL AS route,
  repair.payload_json,
  NULL AS validation_after_targets_json,
  repair.created_at
FROM repair
JOIN diagnostic ON diagnostic.id = repair.diagnostic_id
LEFT JOIN source_file ON source_file.id = diagnostic.source_file_id;

CREATE VIEW IF NOT EXISTS project_health AS
SELECT
  project.id AS project_id,
  project.root,
  (SELECT COUNT(*) FROM source_file WHERE source_file.project_id = project.id) AS source_file_count,
  (SELECT COUNT(*) FROM symbol WHERE symbol.project_id = project.id) AS symbol_count,
  (SELECT COUNT(*) FROM diagnostic WHERE diagnostic.project_id = project.id) AS diagnostic_count,
  (SELECT COUNT(*) FROM diagnostic WHERE diagnostic.project_id = project.id AND diagnostic.severity = 'error') AS error_count,
  (SELECT COUNT(*) FROM diagnostic WHERE diagnostic.project_id = project.id AND diagnostic.severity = 'warning') AS warning_count,
  (SELECT COUNT(*) FROM artifact WHERE artifact.project_id = project.id AND artifact.status != 'current') AS stale_artifact_count,
  (
    SELECT COUNT(*)
    FROM repair
    JOIN diagnostic ON diagnostic.id = repair.diagnostic_id
    WHERE diagnostic.project_id = project.id AND repair.safety = 'safe'
  ) AS safe_repair_count
FROM project;

CREATE VIEW IF NOT EXISTS symbols_with_schema_serialization_issues AS
SELECT
  schema_descriptor.*,
  symbol.project_id,
  symbol.source_file_id,
  symbol.export_name,
  symbol.local_name
FROM schema_descriptor
JOIN symbol ON symbol.id = schema_descriptor.symbol_id
WHERE schema_descriptor.serialization_status != 'serializable';

CREATE VIEW IF NOT EXISTS package_local_attune_companions AS
SELECT *
FROM artifact
WHERE path LIKE '%/attune.source-bom.json'
   OR path LIKE '%/src/attune.generated.ts'
   OR path LIKE '%/src/attune.contract.generated.ts'
   OR path LIKE '%/src/attune.package.typecheck.ts';
`

const programIndexInvalidationMigrationSql = `
CREATE TRIGGER IF NOT EXISTS symbol_insert_invalidation
AFTER INSERT ON symbol
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('symbol', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS symbol_update_invalidation
AFTER UPDATE ON symbol
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('symbol', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS symbol_delete_invalidation
AFTER DELETE ON symbol
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('symbol', OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS schema_insert_invalidation
AFTER INSERT ON schema_descriptor
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('schema', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS schema_update_invalidation
AFTER UPDATE ON schema_descriptor
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('schema', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS schema_delete_invalidation
AFTER DELETE ON schema_descriptor
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('schema', OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS artifact_insert_invalidation
AFTER INSERT ON artifact
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('artifact', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS artifact_update_invalidation
AFTER UPDATE ON artifact
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('artifact', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS artifact_delete_invalidation
AFTER DELETE ON artifact
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('artifact', OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS observation_insert_invalidation
AFTER INSERT ON observation
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('observation', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS observation_update_invalidation
AFTER UPDATE ON observation
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('observation', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS observation_delete_invalidation
AFTER DELETE ON observation
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('observation', OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS diagnostic_insert_invalidation
AFTER INSERT ON diagnostic
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('diagnostic', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS diagnostic_update_invalidation
AFTER UPDATE ON diagnostic
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('diagnostic', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS diagnostic_delete_invalidation
AFTER DELETE ON diagnostic
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('diagnostic', OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS repair_insert_invalidation
AFTER INSERT ON repair
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('repair', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS repair_update_invalidation
AFTER UPDATE ON repair
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('repair', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS repair_delete_invalidation
AFTER DELETE ON repair
BEGIN
  INSERT INTO invalidation_log (key, subject) VALUES ('repair', OLD.id);
END;
`

const programIndexRepairRoutingMigrationSql = `
ALTER TABLE repair ADD COLUMN route TEXT;
ALTER TABLE repair ADD COLUMN validation_after_targets_json TEXT;

DROP VIEW IF EXISTS repairable_diagnostics;
CREATE VIEW repairable_diagnostics AS
SELECT
  repair.id AS repair_id,
  repair.diagnostic_id,
  diagnostic.project_id,
  diagnostic.source_file_id,
  source_file.path,
  diagnostic.code,
  diagnostic.severity,
  diagnostic.message,
  repair.safety,
  repair.nx_target,
  repair.repair_kind,
  repair.route,
  repair.payload_json,
  repair.validation_after_targets_json,
  repair.created_at
FROM repair
JOIN diagnostic ON diagnostic.id = repair.diagnostic_id
LEFT JOIN source_file ON source_file.id = diagnostic.source_file_id;
`

const programIndexMigrations = [
  {
    version: 1,
    name: "init-program-index",
    sql: programIndexInitialMigrationSql,
  },
  {
    version: 2,
    name: "add-program-index-views",
    sql: programIndexViewMigrationSql,
  },
  {
    version: 3,
    name: "add-program-index-invalidations",
    sql: programIndexInvalidationMigrationSql,
  },
  {
    version: 4,
    name: "add-program-index-repair-routing",
    sql: programIndexRepairRoutingMigrationSql,
  },
] as const

const latestProgramIndexMigrationVersion =
  programIndexMigrations.at(-1)?.version ?? 0

const migrateProgramIndex = (database: DatabaseSync): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS program_index_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `)

  for (const migration of programIndexMigrations) {
    const existing = database
      .prepare("SELECT version FROM program_index_migrations WHERE version = ?")
      .get(migration.version)
    if (existing !== undefined) continue

    database.exec("BEGIN IMMEDIATE")
    try {
      database.exec(migration.sql)
      database
        .prepare("INSERT INTO program_index_migrations (version, name, applied_at) VALUES (?, ?, ?)")
        .run(migration.version, migration.name, new Date().toISOString())
      database.exec("COMMIT")
    } catch (error) {
      database.exec("ROLLBACK")
      throw error
    }
  }
}

const programIndexTables = [
  "project",
  "target",
  "source_file",
  "symbol",
  "schema_descriptor",
  "edge",
  "artifact",
  "observation",
  "diagnostic",
  "repair",
  "invalidation_log",
] as const

const resetProgramIndexRows = (database: DatabaseSync): void => {
  database.exec("BEGIN IMMEDIATE")
  try {
    for (const table of programIndexTables) {
      database.exec(`DELETE FROM ${table}`)
    }
    database.exec("COMMIT")
  } catch (error) {
    database.exec("ROLLBACK")
    throw error
  }
}

const sqliteProgramIndexRowCounts = (database: DatabaseSync): ProgramIndexRowCounts => ({
  projects: tableCount(database, "project"),
  targets: tableCount(database, "target"),
  sourceFiles: tableCount(database, "source_file"),
  symbols: tableCount(database, "symbol"),
  schemaDescriptors: tableCount(database, "schema_descriptor"),
  edges: tableCount(database, "edge"),
  artifacts: tableCount(database, "artifact"),
  observations: tableCount(database, "observation"),
  diagnostics: tableCount(database, "diagnostic"),
  repairs: tableCount(database, "repair"),
  invalidations: tableCount(database, "invalidation_log"),
})

const tableCount = (database: DatabaseSync, table: string): number => {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as
    | { readonly count?: unknown }
    | undefined
  const count = row?.count
  if (typeof count !== "number") {
    throw new Error(`Program index count failed for ${table}.`)
  }
  return count
}

const programIndexMigrationVersion = (database: DatabaseSync): number => {
  const row = database
    .prepare("SELECT MAX(version) AS version FROM program_index_migrations")
    .get() as { readonly version?: unknown } | undefined
  const version = row?.version
  return typeof version === "number" ? version : 0
}

const readProjects = (
  database: DatabaseSync,
  filter: ProgramIndexProjectFilter = {},
): readonly ProgramIndexProject[] =>
  readRows(
    database,
    "SELECT * FROM project",
    filter.projectId === undefined
      ? emptyWhere
      : { sql: "id = ?", parameters: [filter.projectId] },
    "id",
  ).map(projectFromRow)

const readTargets = (
  database: DatabaseSync,
  filter: ProgramIndexProjectFilter = {},
): readonly ProgramIndexTarget[] =>
  readRows(database, "SELECT * FROM target", whereProjectId(filter), "project_id, name").map(targetFromRow)

const readSourceFiles = (
  database: DatabaseSync,
  filter: ProgramIndexSourceFileFilter = {},
): readonly ProgramIndexSourceFile[] =>
  readRows(database, "SELECT * FROM source_file", whereSourceFile(filter), "path").map(sourceFileFromRow)

const readSymbols = (
  database: DatabaseSync,
  filter: ProgramIndexSymbolFilter = {},
): readonly ProgramIndexSymbol[] =>
  readRows(database, "SELECT * FROM symbol", whereSymbol(filter), "id").map(symbolFromRow)

const readSchemaDescriptors = (
  database: DatabaseSync,
  filter: { readonly symbolId?: string } = {},
): readonly ProgramIndexSchemaDescriptor[] =>
  readRows(
    database,
    "SELECT * FROM schema_descriptor",
    filter.symbolId === undefined ? emptyWhere : { sql: "symbol_id = ?", parameters: [filter.symbolId] },
    "id",
  ).map(schemaDescriptorFromRow)

const readEdges = (
  database: DatabaseSync,
  filter: { readonly symbolId?: string } = {},
): readonly ProgramIndexEdge[] =>
  readRows(
    database,
    "SELECT * FROM edge",
    filter.symbolId === undefined
      ? emptyWhere
      : { sql: "(from_symbol_id = ? OR to_symbol_id = ?)", parameters: [filter.symbolId, filter.symbolId] },
    "id",
  ).map(edgeFromRow)

const readArtifacts = (
  database: DatabaseSync,
  filter: ProgramIndexProjectFilter = {},
): readonly ProgramIndexArtifact[] =>
  readRows(database, "SELECT * FROM artifact", whereProjectId(filter), "path").map(artifactFromRow)

const readObservations = (
  database: DatabaseSync,
  filter: ProgramIndexProjectFilter = {},
): readonly ProgramIndexObservation[] =>
  readRows(database, "SELECT * FROM observation", whereProjectId(filter), "created_at, id").map(observationFromRow)

const readDiagnostics = (
  database: DatabaseSync,
  filter: ProgramIndexSourceFileFilter = {},
): readonly ProgramIndexDiagnostic[] =>
  readRows(database, "SELECT * FROM diagnostic", whereDiagnostic(filter), "id").map(diagnosticFromRow)

const readRepairs = (
  database: DatabaseSync,
  filter: { readonly diagnosticId?: string } = {},
): readonly ProgramIndexRepair[] =>
  readRows(
    database,
    "SELECT * FROM repair",
    filter.diagnosticId === undefined
      ? emptyWhere
      : { sql: "diagnostic_id = ?", parameters: [filter.diagnosticId] },
    "id",
  ).map(repairFromRow)

const readInvalidations = (
  database: DatabaseSync,
  filter: ProgramIndexInvalidationFilter = {},
): readonly ProgramIndexInvalidation[] => {
  const clauses: string[] = []
  const parameters: string[] = []
  if (filter.key !== undefined) {
    clauses.push("key = ?")
    parameters.push(filter.key)
  }
  if (filter.unconsumed === true) {
    clauses.push("consumed_at IS NULL")
  }
  return readRows(
    database,
    "SELECT * FROM invalidation_log",
    { sql: clauses.join(" AND "), parameters },
    "id",
  ).map(invalidationFromRow)
}

const readProjectHealth = (database: DatabaseSync): readonly ProgramIndexProjectHealth[] =>
  readView(database, "project_health").map((row) => ({
    projectId: stringFromRow(row, "project_id"),
    root: stringFromRow(row, "root"),
    sourceFileCount: numberFromRow(row, "source_file_count"),
    symbolCount: numberFromRow(row, "symbol_count"),
    diagnosticCount: numberFromRow(row, "diagnostic_count"),
    errorCount: numberFromRow(row, "error_count"),
    warningCount: numberFromRow(row, "warning_count"),
    staleArtifactCount: numberFromRow(row, "stale_artifact_count"),
    safeRepairCount: numberFromRow(row, "safe_repair_count"),
  }))

const readView = (
  database: DatabaseSync,
  view: string,
  where = "",
  parameters: readonly string[] = [],
): readonly ProgramIndexViewRow[] => {
  const whereSql = where.length === 0 ? "" : ` WHERE ${where}`
  const rows = database.prepare(`SELECT * FROM ${view}${whereSql}`).all(...parameters) as
    readonly Record<string, unknown>[]
  return rows.map(viewRow)
}

const emptyWhere = { sql: "", parameters: [] as readonly string[] }

const readRows = (
  database: DatabaseSync,
  baseSql: string,
  where: { readonly sql: string; readonly parameters: readonly string[] },
  orderBy: string,
): readonly Record<string, unknown>[] => {
  const whereSql = where.sql.length === 0 ? "" : ` WHERE ${where.sql}`
  return database.prepare(`${baseSql}${whereSql} ORDER BY ${orderBy}`).all(...where.parameters) as
    readonly Record<string, unknown>[]
}

const whereProjectId = (
  filter: ProgramIndexProjectFilter,
): { readonly sql: string; readonly parameters: readonly string[] } =>
  filter.projectId === undefined
    ? emptyWhere
    : { sql: "project_id = ?", parameters: [filter.projectId] }

const whereSourceFile = (
  filter: ProgramIndexSourceFileFilter,
): { readonly sql: string; readonly parameters: readonly string[] } => {
  const clauses: string[] = []
  const parameters: string[] = []
  if (filter.projectId !== undefined) {
    clauses.push("project_id = ?")
    parameters.push(filter.projectId)
  }
  if (filter.sourceFileId !== undefined) {
    clauses.push("id = ?")
    parameters.push(filter.sourceFileId)
  }
  if (filter.path !== undefined) {
    clauses.push("path = ?")
    parameters.push(filter.path)
  }
  return { sql: clauses.join(" AND "), parameters }
}

const whereSymbol = (
  filter: ProgramIndexSymbolFilter,
): { readonly sql: string; readonly parameters: readonly string[] } => {
  const clauses: string[] = []
  const parameters: string[] = []
  if (filter.projectId !== undefined) {
    clauses.push("project_id = ?")
    parameters.push(filter.projectId)
  }
  if (filter.sourceFileId !== undefined) {
    clauses.push("source_file_id = ?")
    parameters.push(filter.sourceFileId)
  }
  if (filter.symbolId !== undefined) {
    clauses.push("id = ?")
    parameters.push(filter.symbolId)
  }
  return { sql: clauses.join(" AND "), parameters }
}

const whereDiagnostic = (
  filter: ProgramIndexSourceFileFilter,
): { readonly sql: string; readonly parameters: readonly string[] } => {
  const clauses: string[] = []
  const parameters: string[] = []
  if (filter.projectId !== undefined) {
    clauses.push("project_id = ?")
    parameters.push(filter.projectId)
  }
  if (filter.sourceFileId !== undefined) {
    clauses.push("source_file_id = ?")
    parameters.push(filter.sourceFileId)
  }
  return { sql: clauses.join(" AND "), parameters }
}

const whereRepairableDiagnostic = (
  filter: ProgramIndexRepairableDiagnosticFilter,
): { readonly sql: string; readonly parameters: readonly string[] } => {
  const clauses: string[] = []
  const parameters: string[] = []
  if (filter.projectId !== undefined) {
    clauses.push("project_id = ?")
    parameters.push(filter.projectId)
  }
  if (filter.path !== undefined) {
    clauses.push("path = ?")
    parameters.push(filter.path)
  }
  if (filter.diagnosticId !== undefined) {
    clauses.push("diagnostic_id = ?")
    parameters.push(filter.diagnosticId)
  }
  return { sql: clauses.join(" AND "), parameters }
}

const projectFromRow = (row: Record<string, unknown>): ProgramIndexProject => ({
  id: stringFromRow(row, "id"),
  root: stringFromRow(row, "root"),
  ...optionalStringProperty("sourceRoot", row.source_root),
  ...optionalStringProperty("projectType", row.project_type),
  ...optionalStringProperty("hash", row.hash),
  updatedAt: stringFromRow(row, "updated_at"),
})

const targetFromRow = (row: Record<string, unknown>): ProgramIndexTarget => ({
  projectId: stringFromRow(row, "project_id"),
  name: stringFromRow(row, "name"),
  ...optionalStringProperty("executor", row.executor),
  ...optionalStringProperty("optionsJson", row.options_json),
  ...optionalStringProperty("configurationsJson", row.configurations_json),
})

const sourceFileFromRow = (row: Record<string, unknown>): ProgramIndexSourceFile => ({
  id: stringFromRow(row, "id"),
  ...optionalStringProperty("projectId", row.project_id),
  path: stringFromRow(row, "path"),
  hash: stringFromRow(row, "hash"),
  updatedAt: stringFromRow(row, "updated_at"),
})

const symbolFromRow = (row: Record<string, unknown>): ProgramIndexSymbol => ({
  id: stringFromRow(row, "id"),
  ...optionalStringProperty("projectId", row.project_id),
  ...optionalStringProperty("sourceFileId", row.source_file_id),
  ...optionalStringProperty("exportName", row.export_name),
  ...optionalStringProperty("localName", row.local_name),
  ...optionalStringProperty("kind", row.kind),
  ...optionalStringProperty("rangeJson", row.range_json),
  ...optionalStringProperty("hash", row.hash),
})

const schemaDescriptorFromRow = (row: Record<string, unknown>): ProgramIndexSchemaDescriptor => ({
  id: stringFromRow(row, "id"),
  symbolId: stringFromRow(row, "symbol_id"),
  ...optionalStringProperty("role", row.role),
  ...optionalStringProperty("astHash", row.ast_hash),
  descriptorVersion: numberFromRow(row, "descriptor_version"),
  ...optionalStringProperty("shapeJson", row.shape_json),
  ...optionalStringProperty("annotationsJson", row.annotations_json),
  serializationStatus: stringFromRow(row, "serialization_status") as ProgramIndexSchemaDescriptor["serializationStatus"],
  ...optionalStringProperty("nonSerializableFeaturesJson", row.non_serializable_features_json),
})

const edgeFromRow = (row: Record<string, unknown>): ProgramIndexEdge => ({
  id: stringFromRow(row, "id"),
  fromSymbolId: stringFromRow(row, "from_symbol_id"),
  toSymbolId: stringFromRow(row, "to_symbol_id"),
  kind: stringFromRow(row, "kind"),
  ...optionalStringProperty("source", row.source),
})

const artifactFromRow = (row: Record<string, unknown>): ProgramIndexArtifact => ({
  id: stringFromRow(row, "id"),
  ...optionalStringProperty("projectId", row.project_id),
  path: stringFromRow(row, "path"),
  ...optionalStringProperty("kind", row.kind),
  ...optionalStringProperty("builtFromHash", row.built_from_hash),
  ...optionalStringProperty("currentHash", row.current_hash),
  status: stringFromRow(row, "status") as ProgramIndexArtifact["status"],
})

const observationFromRow = (row: Record<string, unknown>): ProgramIndexObservation => ({
  id: stringFromRow(row, "id"),
  ...optionalStringProperty("symbolId", row.symbol_id),
  ...optionalStringProperty("projectId", row.project_id),
  kind: stringFromRow(row, "kind"),
  status: stringFromRow(row, "status"),
  ...optionalStringProperty("payloadJson", row.payload_json),
  createdAt: stringFromRow(row, "created_at"),
})

const diagnosticFromRow = (row: Record<string, unknown>): ProgramIndexDiagnostic => ({
  id: stringFromRow(row, "id"),
  ...optionalStringProperty("projectId", row.project_id),
  ...optionalStringProperty("sourceFileId", row.source_file_id),
  ...optionalStringProperty("rangeJson", row.range_json),
  code: stringFromRow(row, "code"),
  severity: stringFromRow(row, "severity") as ProgramIndexDiagnostic["severity"],
  message: stringFromRow(row, "message"),
  ...optionalStringProperty("causeJson", row.cause_json),
})

const repairFromRow = (row: Record<string, unknown>): ProgramIndexRepair => ({
  id: stringFromRow(row, "id"),
  diagnosticId: stringFromRow(row, "diagnostic_id"),
  safety: stringFromRow(row, "safety") as ProgramIndexRepair["safety"],
  ...optionalStringProperty("nxTarget", row.nx_target),
  ...optionalStringProperty("repairKind", row.repair_kind),
  ...optionalStringProperty("route", row.route),
  ...optionalStringProperty("payloadJson", row.payload_json),
  ...optionalStringProperty("validationAfterTargetsJson", row.validation_after_targets_json),
  createdAt: stringFromRow(row, "created_at"),
})

const invalidationFromRow = (row: Record<string, unknown>): ProgramIndexInvalidation => ({
  id: numberFromRow(row, "id"),
  key: stringFromRow(row, "key"),
  subject: stringFromRow(row, "subject"),
  createdAt: stringFromRow(row, "created_at"),
  ...optionalStringProperty("consumedAt", row.consumed_at),
})

const stringFromRow = (row: Record<string, unknown>, key: string): string => {
  const value = row[key]
  if (typeof value !== "string") {
    throw new Error(`Program index row field ${key} must be text.`)
  }
  return value
}

const numberFromRow = (row: Record<string, unknown>, key: string): number => {
  const value = row[key]
  if (typeof value !== "number") {
    throw new Error(`Program index row field ${key} must be numeric.`)
  }
  return value
}

const optionalStringProperty = <Key extends string>(
  key: Key,
  value: unknown,
): Record<Key, string> | Record<string, never> =>
  typeof value === "string" ? { [key]: value } as Record<Key, string> : {}

const toProgramIndexError = (operation: string, cause: unknown): ProgramIndexError =>
  new ProgramIndexError({
    operation,
    message: cause instanceof Error ? cause.message : String(cause),
    cause,
  })

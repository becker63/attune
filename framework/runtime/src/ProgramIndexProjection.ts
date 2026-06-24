import { existsSync, readFileSync } from "node:fs"

import {
  extractProtocolSourceSummary,
  hashProgramValue,
  type ProgramRepairAction,
  type ProgramDiagnostic,
  type ProtocolSourceDeclaration,
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
  readonly sourceFiles: readonly ProgramIndexSourceFile[]
  readonly symbols: readonly ProgramIndexSymbol[]
  readonly schemaDescriptors: readonly ProgramIndexSchemaDescriptor[]
  readonly edges: readonly ProgramIndexEdge[]
  readonly artifacts: readonly ProgramIndexArtifact[]
  readonly observations: readonly ProgramIndexObservation[]
  readonly diagnostics: readonly ProgramIndexDiagnostic[]
  readonly repairs: readonly ProgramIndexRepair[]
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
    projectId: input.packageId ?? input.projectId,
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
      hash: hashProgramValue({
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
      astHash: hashProgramValue(declaration.initializerText ?? declaration.typeText ?? declaration.id),
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
      id: hashProgramValue({
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
        id: hashProgramValue({
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
    route: "workspace:program-index-materialize",
    payloadJson: programIndexJson({
      source: "program-index",
      diagnostic: diagnostic.code,
    }),
    validationAfterTargetsJson: programIndexJson([
      `${input.projectId}:attune-check`,
      `${input.projectId}:typecheck`,
    ]),
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
  const rootArtifactRows = input.paths.map((path) => {
    const content = input.contentByPath?.[path]
    const currentHash = content === undefined ? undefined : programIndexContentHash(content)
    const status = compatibilityArtifactStatus(input.contentByPath, content)
    return {
      id: `compat:${input.projectId}:${path}`,
      projectId: input.projectId,
      path,
      kind: compatibilityArtifactKind(path),
      builtFromHash: hashProgramValue({ projectId: input.projectId, root: input.root }),
      ...(currentHash === undefined ? {} : { currentHash }),
      status,
    } satisfies ProgramIndexArtifact
  })
  const sourceFiles = rootArtifactRows.map((artifact) => ({
    id: sourceFileId(input.projectId, artifact.path),
    projectId: input.projectId,
    path: artifact.path,
    hash: artifact.currentHash ?? programIndexContentHash(`${artifact.status}:${artifact.path}`),
    updatedAt: now,
  } satisfies ProgramIndexSourceFile))
  const sourceFileByPath = new Map(sourceFiles.map((sourceFile) => [sourceFile.path, sourceFile]))
  const projected = compatibilityMechanicalRowsFromArtifacts({
    input,
    artifacts: rootArtifactRows,
    sourceFileByPath,
    now,
  })
  const artifacts = [...rootArtifactRows, ...projected.artifacts]
  const observations = [
    ...rootArtifactRows
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
    } satisfies ProgramIndexObservation)),
    ...projected.observations,
  ]
  const diagnostics = artifacts.flatMap((artifact) =>
    compatibilityDiagnosticsFromArtifact(input.projectId, artifact, sourceFileByPath.get(artifact.path))
  )
  const repairs = diagnostics.map((diagnostic) =>
    compatibilityRepairForDiagnostic(input.projectId, diagnostic, now)
  )
  return {
    sourceFiles,
    symbols: projected.symbols,
    schemaDescriptors: projected.schemaDescriptors,
    edges: projected.edges,
    artifacts,
    observations,
    diagnostics,
    repairs,
  }
}

export const materializeCompatibilityRows = (
  index: ProgramIndexApi,
  input: ProgramCompatibilityInput,
): Effect.Effect<ProgramCompatibilityRows, unknown> => {
  const rows = compatibilityRowsFromCurrentPackageContracts(input)
  return Effect.gen(function* writeCompatibilityRows() {
    yield* index.putSourceFiles(rows.sourceFiles)
    yield* index.putSymbols(rows.symbols)
    yield* index.putSchemaDescriptors(rows.schemaDescriptors)
    yield* index.putEdges(rows.edges)
    yield* index.putArtifacts(rows.artifacts)
    yield* index.putObservations(rows.observations)
    yield* index.putDiagnostics(rows.diagnostics)
    yield* index.putRepairs(rows.repairs)
    return rows
  })
}

interface CompatibilityMechanicalRows {
  readonly symbols: readonly ProgramIndexSymbol[]
  readonly schemaDescriptors: readonly ProgramIndexSchemaDescriptor[]
  readonly edges: readonly ProgramIndexEdge[]
  readonly artifacts: readonly ProgramIndexArtifact[]
  readonly observations: readonly ProgramIndexObservation[]
}

interface CompatibilityMechanicalRowsInput {
  readonly input: ProgramCompatibilityInput
  readonly artifacts: readonly ProgramIndexArtifact[]
  readonly sourceFileByPath: ReadonlyMap<string, ProgramIndexSourceFile>
  readonly now: string
}

interface CompatibilityOperationFact {
  readonly operationId: string
  readonly exportName: string
  readonly operationKind?: string
  readonly sourceFileId?: string
  readonly schemaRoles: Readonly<Record<"input" | "output" | "error", string>>
  readonly reactivityKeys: readonly string[]
  readonly atoms: readonly string[]
  readonly lawLabels: readonly string[]
}

interface CompatibilityTsProjection {
  readonly symbols: readonly ProgramIndexSymbol[]
  readonly schemaDescriptors: readonly ProgramIndexSchemaDescriptor[]
  readonly edges: readonly ProgramIndexEdge[]
  readonly observations: readonly ProgramIndexObservation[]
  readonly operationFacts: readonly CompatibilityOperationFact[]
}

const compatibilityMechanicalRowsFromArtifacts = ({
  input,
  artifacts,
  sourceFileByPath,
  now,
}: CompatibilityMechanicalRowsInput): CompatibilityMechanicalRows => {
  const symbols = new Map<string, ProgramIndexSymbol>()
  const schemaDescriptors = new Map<string, ProgramIndexSchemaDescriptor>()
  const edges = new Map<string, ProgramIndexEdge>()
  const artifactsById = new Map<string, ProgramIndexArtifact>()
  const observations = new Map<string, ProgramIndexObservation>()
  const operationFacts = new Map<string, CompatibilityOperationFact>()

  const putSymbols = (rows: readonly ProgramIndexSymbol[]): void => {
    for (const row of rows) symbols.set(row.id, row)
  }
  const putSchemas = (rows: readonly ProgramIndexSchemaDescriptor[]): void => {
    for (const row of rows) schemaDescriptors.set(row.id, row)
  }
  const putEdges = (rows: readonly ProgramIndexEdge[]): void => {
    for (const row of rows) edges.set(row.id, row)
  }
  const putArtifacts = (rows: readonly ProgramIndexArtifact[]): void => {
    for (const row of rows) artifactsById.set(row.id, row)
  }
  const putObservations = (rows: readonly ProgramIndexObservation[]): void => {
    for (const row of rows) observations.set(row.id, row)
  }
  const putOperationFacts = (rows: readonly CompatibilityOperationFact[]): void => {
    for (const row of rows) operationFacts.set(row.operationId, row)
  }

  for (const artifact of artifacts) {
    const content = compatibilityContent(input, artifact.path)
    if (content === undefined) continue

    if (isTypeScriptCompatibilityArtifact(artifact.path)) {
      const projection = compatibilityTsProjectionFromArtifact({
        projectId: input.projectId,
        artifact,
        sourceFile: sourceFileByPath.get(artifact.path),
        content,
        now,
      })
      putSymbols(projection.symbols)
      putSchemas(projection.schemaDescriptors)
      putEdges(projection.edges)
      putObservations(projection.observations)
      putOperationFacts(projection.operationFacts)
    }

    if (compatibilitySourceMetadata(artifact.path) === "artifact-ownership-compat") {
      const artifactOwnership = artifactOwnershipCompatibilityRows({
        projectId: input.projectId,
        root: input.root,
        artifact,
        content,
        now,
      })
      putArtifacts(artifactOwnership.artifacts)
      putObservations(artifactOwnership.observations)
    }
  }

  const operationSymbols = [...operationFacts.values()].map((operation) => ({
    id: compatibilityOperationSymbolId(input.projectId, operation.operationId),
    projectId: input.projectId,
    ...(operation.sourceFileId === undefined ? {} : { sourceFileId: operation.sourceFileId }),
    exportName: operation.operationId,
    localName: operation.exportName,
    kind: "compatibility-operation-id",
    hash: hashProgramValue({
      compatibilitySource: "package-contract-compat",
      projectId: input.projectId,
      operationId: operation.operationId,
      exportName: operation.exportName,
    }),
  } satisfies ProgramIndexSymbol))
  putSymbols(operationSymbols)

  const schemaSymbolByExportName = new Map(
    [...symbols.values()]
      .filter((symbol) => symbol.exportName !== undefined && symbol.kind === "compatibility-schema-symbol")
      .map((symbol) => [symbol.exportName, symbol]),
  )
  const contractSymbol = [...symbols.values()].find((symbol) =>
    symbol.exportName === "PackageContract" && symbol.projectId === input.projectId
  )

  for (const operation of operationFacts.values()) {
    const operationSymbolId = compatibilityOperationSymbolId(input.projectId, operation.operationId)
    if (contractSymbol !== undefined) {
      edges.set(compatibilityEdgeId("declares-symbol", contractSymbol.id, operationSymbolId), {
        id: compatibilityEdgeId("declares-symbol", contractSymbol.id, operationSymbolId),
        fromSymbolId: contractSymbol.id,
        toSymbolId: operationSymbolId,
        kind: "declares-symbol",
        source: "package-contract-compat",
      })
    }

    for (const role of ["input", "output", "error"] as const) {
      const schemaName = operation.schemaRoles[role]
      if (schemaName.length === 0) continue
      const schemaSymbol = schemaSymbolByExportName.get(schemaName)
      if (schemaSymbol === undefined) continue
      const descriptorId = `compat-schema:${operationSymbolId}:${role}:${schemaName}`
      schemaDescriptors.set(descriptorId, {
        id: descriptorId,
        symbolId: schemaSymbol.id,
        role,
        astHash: hashProgramValue({
          compatibilitySource: "package-contract-compat",
          operationId: operation.operationId,
          role,
          schemaName,
        }),
        descriptorVersion: 1,
        shapeJson: programIndexJson({
          compatibilitySource: "package-contract-compat",
          operationId: operation.operationId,
          schemaName,
          role,
        }),
        annotationsJson: programIndexJson({
          fact: "schema_descriptor",
          compatibilitySource: "package-contract-compat",
        }),
        serializationStatus: "serializable",
      })
      edges.set(compatibilityEdgeId(`${role}-schema`, operationSymbolId, schemaSymbol.id), {
        id: compatibilityEdgeId(`${role}-schema`, operationSymbolId, schemaSymbol.id),
        fromSymbolId: operationSymbolId,
        toSymbolId: schemaSymbol.id,
        kind: `${role}-schema`,
        source: "package-contract-compat",
      })
    }

    const reactivitySymbols = operation.reactivityKeys.map((key) =>
      compatibilityVirtualSymbol(input.projectId, "reactivity-key", key, operation.sourceFileId)
    )
    const atomSymbols = operation.atoms.map((atom) =>
      compatibilityVirtualSymbol(input.projectId, "atom", atom, operation.sourceFileId)
    )
    putSymbols([...reactivitySymbols, ...atomSymbols])
    for (const symbol of reactivitySymbols) {
      edges.set(compatibilityEdgeId("touches-reactivity-key", operationSymbolId, symbol.id), {
        id: compatibilityEdgeId("touches-reactivity-key", operationSymbolId, symbol.id),
        fromSymbolId: operationSymbolId,
        toSymbolId: symbol.id,
        kind: "touches-reactivity-key",
        source: "package-contract-compat",
      })
    }
    for (const symbol of atomSymbols) {
      edges.set(compatibilityEdgeId("touches-atom", operationSymbolId, symbol.id), {
        id: compatibilityEdgeId("touches-atom", operationSymbolId, symbol.id),
        fromSymbolId: operationSymbolId,
        toSymbolId: symbol.id,
        kind: "touches-atom",
        source: "package-contract-compat",
      })
    }

    observations.set(`observation:${operationSymbolId}:compat`, {
      id: `observation:${operationSymbolId}:compat`,
      symbolId: operationSymbolId,
      projectId: input.projectId,
      kind: "compatibility-symbol-metadata",
      status: "recorded",
      payloadJson: programIndexJson({
        compatibilitySource: "package-contract-compat",
        fact: "symbol",
        oldLabel: "operation",
        operationId: operation.operationId,
        exportName: operation.exportName,
        operationKind: operation.operationKind,
        schemaRoles: operation.schemaRoles,
        reactivityKeys: operation.reactivityKeys,
        atoms: operation.atoms,
        lawLabels: operation.lawLabels,
      }),
      createdAt: now,
    })
  }

  return {
    symbols: [...symbols.values()].sort((left, right) => left.id.localeCompare(right.id)),
    schemaDescriptors: [...schemaDescriptors.values()].sort((left, right) => left.id.localeCompare(right.id)),
    edges: [...edges.values()].sort((left, right) => left.id.localeCompare(right.id)),
    artifacts: [...artifactsById.values()].sort((left, right) => left.id.localeCompare(right.id)),
    observations: [...observations.values()].sort((left, right) => left.id.localeCompare(right.id)),
  }
}

const compatibilityTsProjectionFromArtifact = (
  input: {
    readonly projectId: string
    readonly artifact: ProgramIndexArtifact
    readonly sourceFile: ProgramIndexSourceFile | undefined
    readonly content: string
    readonly now: string
  },
): CompatibilityTsProjection => {
  const source = compatibilitySourceMetadata(input.artifact.path)
  const declarations = compatibilitySourceDeclarations(input.artifact.path, input.projectId, input.content)
  const symbols = declarations.map((declaration) =>
    compatibilitySymbolFromDeclaration(input.projectId, input.artifact.path, input.sourceFile, declaration, input.content)
  )
  const exportSymbolByName = new Map(symbols.flatMap((symbol) =>
    symbol.exportName === undefined ? [] : [[symbol.exportName, symbol] as const]
  ))
  const schemaDescriptors = symbols.flatMap((symbol) => {
    if (symbol.kind !== "compatibility-schema-symbol") return []
    const declaration = declarations.find((candidate) => candidate.declaration.exportName === symbol.exportName)
    const initializerText = declaration?.initializerText ?? ""
    const features = nonSerializableSchemaFeatures(initializerText)
    return [{
      id: `compat-schema:${symbol.id}:boundary`,
      symbolId: symbol.id,
      role: "boundary",
      astHash: hashProgramValue({
        compatibilitySource: source,
        exportName: symbol.exportName,
        initializerText,
      }),
      descriptorVersion: 1,
      shapeJson: programIndexJson({
        compatibilitySource: source,
        exportName: symbol.exportName,
        typeText: declaration?.typeText,
        initializerText,
      }),
      annotationsJson: programIndexJson({
        fact: "schema_descriptor",
        compatibilitySource: source,
        path: input.artifact.path,
      }),
      serializationStatus: features.length === 0 ? "serializable" : "partial",
      ...(features.length === 0 ? {} : {
        nonSerializableFeaturesJson: programIndexJson(features),
      }),
    } satisfies ProgramIndexSchemaDescriptor]
  })
  const operationFacts = declarations.flatMap((declaration) => {
    const fact = compatibilityOperationFactFromDeclaration(declaration)
    return fact === undefined ? [] : [{
      ...fact,
      ...(input.sourceFile === undefined ? {} : { sourceFileId: input.sourceFile.id }),
    }]
  })
  const edges = operationFacts.flatMap((operation) => {
    const operationExport = exportSymbolByName.get(operation.exportName)
    const operationSymbolId = compatibilityOperationSymbolId(input.projectId, operation.operationId)
    if (operationExport === undefined) return []
    return [{
      id: compatibilityEdgeId("symbol-alias", operationExport.id, operationSymbolId),
      fromSymbolId: operationExport.id,
      toSymbolId: operationSymbolId,
      kind: "symbol-alias",
      source,
    } satisfies ProgramIndexEdge]
  })
  const observations = generatedCompanionObservations({
    projectId: input.projectId,
    artifact: input.artifact,
    content: input.content,
    now: input.now,
  })

  return {
    symbols,
    schemaDescriptors,
    edges,
    observations,
    operationFacts,
  }
}

const compatibilityContent = (
  input: ProgramCompatibilityInput,
  path: string,
): string | undefined => {
  const provided = input.contentByPath?.[path]
  if (provided !== undefined) return provided
  if (!existsSync(path)) return undefined
  return readFileSync(path, "utf8")
}

const isTypeScriptCompatibilityArtifact = (path: string): boolean =>
  /\.[cm]?tsx?$/u.test(path)

const compatibilitySourceDeclarations = (
  path: string,
  projectId: string,
  content: string,
): readonly ProtocolSourceDeclaration[] =>
  fallbackCompatibilityDeclarations(path, projectId, content)

const fallbackCompatibilityDeclarations = (
  path: string,
  projectId: string,
  content: string,
): readonly ProtocolSourceDeclaration[] => {
  const declarations: ProtocolSourceDeclaration[] = []
  const exportRegex = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=/gu
  let match: RegExpExecArray | null
  while ((match = exportRegex.exec(content)) !== null) {
    const exportName = match[1]
    if (exportName === undefined) continue
    const initializerText = compatibilityInitializerText(content, match.index)
    declarations.push({
      kind: fallbackCompatibilityDeclarationKind(exportName, initializerText),
      id: `${projectId}:compat:${exportName}`,
      declaration: {
        sourcePath: path,
        exportName,
        symbolName: exportName,
        range: {
          start: { line: 1, character: 1 },
          end: { line: 1, character: 1 },
        },
      },
      initializerText,
      referencedIdentifiers: [],
      imports: [],
      avoidableStringReferences: [],
    })
  }
  return declarations
}

const compatibilityInitializerText = (
  content: string,
  startIndex: number,
): string => {
  const nextExport = content.slice(startIndex + 1).search(/\nexport\s+(?:const|type|interface|class|function)\s/u)
  if (nextExport < 0) return content.slice(startIndex)
  return content.slice(startIndex, startIndex + 1 + nextExport)
}

const fallbackCompatibilityDeclarationKind = (
  exportName: string,
  initializerText: string,
): string => {
  if (exportName === "PackageContract") return "compatibility-contract-symbol"
  if (/defineOperation\s*\(|\bprojection\s*\(|\bquery\s*\(|\bcommand\s*\(|\bcodec\s*\(/u.test(initializerText)) {
    return "compatibility-operation-export"
  }
  if (/Schema\./u.test(initializerText)) return "compatibility-schema-symbol"
  return "compatibility-exported-symbol"
}

const compatibilitySymbolFromDeclaration = (
  projectId: string,
  path: string,
  sourceFile: ProgramIndexSourceFile | undefined,
  declaration: ProtocolSourceDeclaration,
  content: string,
): ProgramIndexSymbol => {
  const exportName = declaration.declaration.exportName
  const initializerText = declaration.initializerText ?? ""
  const kind = compatibilityDeclarationKind(exportName, declaration.kind, initializerText)
  return {
    id: compatibilityExportSymbolId(projectId, path, exportName),
    projectId,
    ...(sourceFile === undefined ? {} : { sourceFileId: sourceFile.id }),
    exportName,
    localName: declaration.declaration.symbolName,
    kind,
    rangeJson: programIndexJson(declaration.declaration.range),
    hash: hashProgramValue({
      compatibilitySource: compatibilitySourceMetadata(path),
      exportName,
      kind,
      initializerText,
      contentHash: programIndexContentHash(content),
    }),
  }
}

const compatibilityDeclarationKind = (
  exportName: string,
  extractedKind: string,
  initializerText: string,
): string => {
  if (exportName === "PackageContract" || /definePackageContract\s*\(/u.test(initializerText)) {
    return "compatibility-contract-symbol"
  }
  if (
    /defineOperation\s*\(|\bprojection\s*\(|\bquery\s*\(|\bcommand\s*\(|\bcodec\s*\(|\beventFacade\s*\(|\batomFamily\s*\(/u
      .test(initializerText) ||
    extractedKind === "operation" ||
    /Operation$/u.test(exportName)
  ) {
    return "compatibility-operation-export"
  }
  if (extractedKind === "schema" || /Schema\./u.test(initializerText)) return "compatibility-schema-symbol"
  return "compatibility-exported-symbol"
}

const compatibilityOperationFactFromDeclaration = (
  declaration: ProtocolSourceDeclaration,
): CompatibilityOperationFact | undefined => {
  const initializerText = declaration.initializerText ?? ""
  if (compatibilityDeclarationKind(declaration.declaration.exportName, declaration.kind, initializerText) !== "compatibility-operation-export") {
    return undefined
  }
  const operationId = propertyStringValue(initializerText, "id")
  if (operationId === undefined) return undefined
  const operationKind = propertyStringValue(initializerText, "kind") ?? operationKindFromInitializer(initializerText)
  return {
    operationId,
    exportName: declaration.declaration.exportName,
    ...(operationKind === undefined ? {} : { operationKind }),
    schemaRoles: {
      input: propertyIdentifierValue(initializerText, "input") ?? "",
      output: propertyIdentifierValue(initializerText, "output") ?? "",
      error: propertyIdentifierValue(initializerText, "error") ?? "",
    },
    reactivityKeys: propertyArrayStringValues(initializerText, "reactivityKeys"),
    atoms: propertyArrayStringValues(initializerText, "atoms"),
    lawLabels: propertyArrayStringValues(initializerText, "laws"),
  }
}

const operationKindFromInitializer = (
  initializerText: string,
): string | undefined => {
  const match = initializerText.match(/\b(projection|query|command|codec|eventFacade|atomFamily|resourceProvider|generator|policyRule|joernTemplate)\s*\(/u)
  return match?.[1]
}

const propertyStringValue = (
  text: string,
  propertyName: string,
): string | undefined => {
  const match = new RegExp(`\\b${escapeRegExp(propertyName)}\\s*:\\s*["']([^"']+)["']`, "u").exec(text)
  return match?.[1]
}

const propertyIdentifierValue = (
  text: string,
  propertyName: string,
): string | undefined => {
  const match = new RegExp(`\\b${escapeRegExp(propertyName)}\\s*:\\s*([A-Za-z_$][\\w$]*)`, "u").exec(text)
  return match?.[1]
}

const propertyArrayStringValues = (
  text: string,
  propertyName: string,
): readonly string[] => {
  const values = new Set<string>()
  const pattern = new RegExp(`\\b${escapeRegExp(propertyName)}\\s*:\\s*\\[([\\s\\S]*?)\\]`, "gu")
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    for (const value of stringLiteralsInText(match[1] ?? "")) values.add(value)
  }
  return [...values].sort()
}

const stringLiteralsInText = (
  text: string,
): readonly string[] => {
  const values = new Set<string>()
  const pattern = /["']([^"']+)["']/gu
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match[1] !== undefined) values.add(match[1])
  }
  return [...values]
}

const generatedCompanionObservations = (
  input: {
    readonly projectId: string
    readonly artifact: ProgramIndexArtifact
    readonly content: string
    readonly now: string
  },
): readonly ProgramIndexObservation[] => {
  const rows: ProgramIndexObservation[] = []
  const typeGuidanceIds = objectKeysFromNamedBlock(input.content, "PackageTypeGuidance", "operations")
  if (typeGuidanceIds.length > 0) {
    rows.push(compatibilityObservation({
      id: `observation:${input.artifact.id}:type-guidance`,
      projectId: input.projectId,
      kind: "compatibility-type-observation",
      compatibilitySource: "type-guidance-compat",
      oldLabel: "type-guidance",
      path: input.artifact.path,
      payload: { operationIds: typeGuidanceIds },
      now: input.now,
    }))
  }

  const fuzzHandlerIds = objectKeysFromConstObject(input.content, "PackageFuzzHandlers")
  if (fuzzHandlerIds.length > 0) {
    rows.push(compatibilityObservation({
      id: `observation:${input.artifact.id}:fuzz-handlers`,
      projectId: input.projectId,
      kind: "compatibility-observation",
      compatibilitySource: "generated-companion-compat",
      oldLabel: "fuzz-handlers",
      path: input.artifact.path,
      payload: { operationIds: fuzzHandlerIds },
      now: input.now,
    }))
  }

  const propertyIds = objectKeysFromConstObject(input.content, "PackageProperties")
  if (propertyIds.length > 0) {
    rows.push(compatibilityObservation({
      id: `observation:${input.artifact.id}:properties`,
      projectId: input.projectId,
      kind: "compatibility-observation",
      compatibilitySource: "generated-companion-compat",
      oldLabel: "property-map",
      path: input.artifact.path,
      payload: { operationIds: propertyIds },
      now: input.now,
    }))
  }

  if (/definePackageFuzzRpcGroup\s*\(/u.test(input.content)) {
    rows.push(compatibilityObservation({
      id: `observation:${input.artifact.id}:rpc-group`,
      projectId: input.projectId,
      kind: "compatibility-observation",
      compatibilitySource: "generated-companion-compat",
      oldLabel: "rpc-group",
      path: input.artifact.path,
      payload: { recorded: true },
      now: input.now,
    }))
  }

  return rows
}

const objectKeysFromNamedBlock = (
  content: string,
  anchorName: string,
  propertyName: string,
): readonly string[] => {
  const anchorIndex = content.indexOf(anchorName)
  if (anchorIndex < 0) return []
  const propertyIndex = content.indexOf(`${propertyName}:`, anchorIndex)
  if (propertyIndex < 0) return []
  return objectKeysFromBraceAt(content, content.indexOf("{", propertyIndex))
}

const objectKeysFromConstObject = (
  content: string,
  constName: string,
): readonly string[] => {
  const anchorIndex = content.indexOf(`const ${constName}`)
  if (anchorIndex < 0) return []
  return objectKeysFromBraceAt(content, content.indexOf("{", anchorIndex))
}

const objectKeysFromBraceAt = (
  content: string,
  openBraceIndex: number,
): readonly string[] => {
  if (openBraceIndex < 0) return []
  const closeBraceIndex = matchingBraceIndex(content, openBraceIndex)
  if (closeBraceIndex < 0) return []
  const block = content.slice(openBraceIndex + 1, closeBraceIndex)
  const keys = new Set<string>()
  let index = 0
  let depth = 0
  let quote: string | undefined
  while (index < block.length) {
    const character = block[index]
    const previous = block[index - 1]
    if (quote !== undefined) {
      if (character === quote && previous !== "\\") quote = undefined
      index += 1
      continue
    }
    if (character === "\"" || character === "'" || character === "`") {
      if (depth === 0) {
        const parsed = quotedObjectKeyAt(block, index)
        if (parsed !== undefined) {
          keys.add(parsed.key)
          index = parsed.nextIndex
          continue
        }
      }
      quote = character
      index += 1
      continue
    }
    if (character === "{") depth += 1
    if (character === "}") depth -= 1
    if (depth === 0 && character !== undefined && /[A-Za-z_$]/u.test(character)) {
      const parsed = identifierObjectKeyAt(block, index)
      if (parsed !== undefined) {
        keys.add(parsed.key)
        index = parsed.nextIndex
        continue
      }
    }
    index += 1
  }
  return [...keys].sort()
}

const quotedObjectKeyAt = (
  block: string,
  startIndex: number,
): { readonly key: string; readonly nextIndex: number } | undefined => {
  const quote = block[startIndex]
  if (quote !== "\"" && quote !== "'") return undefined
  let endIndex = startIndex + 1
  while (endIndex < block.length) {
    if (block[endIndex] === quote && block[endIndex - 1] !== "\\") break
    endIndex += 1
  }
  const after = block.slice(endIndex + 1).match(/^\s*:/u)
  if (after === null) return undefined
  return {
    key: block.slice(startIndex + 1, endIndex),
    nextIndex: endIndex + 1 + after[0].length,
  }
}

const identifierObjectKeyAt = (
  block: string,
  startIndex: number,
): { readonly key: string; readonly nextIndex: number } | undefined => {
  const match = block.slice(startIndex).match(/^([A-Za-z_$][\w$-]*)\s*:/u)
  if (match === null || match[1] === undefined) return undefined
  return {
    key: match[1],
    nextIndex: startIndex + match[0].length,
  }
}

const matchingBraceIndex = (
  content: string,
  openBraceIndex: number,
): number => {
  let depth = 0
  let quote: string | undefined
  for (let index = openBraceIndex; index < content.length; index += 1) {
    const character = content[index]
    const previous = content[index - 1]
    if (quote !== undefined) {
      if (character === quote && previous !== "\\") quote = undefined
      continue
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character
      continue
    }
    if (character === "{") depth += 1
    if (character === "}") {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const artifactOwnershipCompatibilityRows = (
  input: {
    readonly projectId: string
    readonly root: string
    readonly artifact: ProgramIndexArtifact
    readonly content: string
    readonly now: string
  },
): Pick<CompatibilityMechanicalRows, "artifacts" | "observations"> => {
  const parsed = parseJsonRecord(input.content)
  if (parsed === undefined) {
    return {
      artifacts: [],
      observations: [compatibilityObservation({
        id: `observation:${input.artifact.id}:artifact-ownership-invalid`,
        projectId: input.projectId,
        kind: "compatibility-artifact-ownership",
        compatibilitySource: "artifact-ownership-compat",
        oldLabel: "artifact-ownership",
        path: input.artifact.path,
        status: "invalid",
        payload: { fact: "artifact", path: input.artifact.path },
        now: input.now,
      })],
    }
  }

  const sourceInputs = stringArrayField(parsed, "sourceInputs")
  const ownedFiles = stringArrayField(parsed, "ownedFiles")
  const projectFactOutputPaths = arrayObjectStringValues(parsed, "projectFactShards", "outputs")
  const projectFactSourcePaths = arrayObjectStringValues(parsed, "projectFactShards", "sources")
  const generatedOutputPaths = arrayObjectStringValues(parsed, "generatedOutputs", "outputs")
  const paths = [
    ...sourceInputs.map((path) => ({ path, kind: "source-input-pattern" })),
    ...ownedFiles.map((path) => ({ path, kind: "artifact-ownership-pattern" })),
    ...projectFactOutputPaths.map((path) => ({ path, kind: "generated-artifact-output" })),
    ...projectFactSourcePaths.map((path) => ({ path, kind: "generated-artifact-input" })),
    ...generatedOutputPaths.map((path) => ({ path, kind: "generated-artifact-output" })),
  ] as const
  const artifacts = paths.map(({ path, kind }) => {
    const normalizedPath = normalizeArtifactOwnershipPath(input.root, path)
    const builtFromHash = input.artifact.currentHash ?? input.artifact.builtFromHash
    return {
      id: `compat:${input.projectId}:artifact-ownership:${programIndexContentHash(`${kind}:${normalizedPath}`).slice(0, 16)}`,
      projectId: input.projectId,
      path: normalizedPath,
      kind,
      ...(builtFromHash === undefined ? {} : { builtFromHash }),
      status: "unknown",
    } satisfies ProgramIndexArtifact
  })

  return {
    artifacts,
    observations: [compatibilityObservation({
      id: `observation:${input.artifact.id}:artifact-ownership`,
      projectId: input.projectId,
      kind: "compatibility-artifact-ownership",
      compatibilitySource: "artifact-ownership-compat",
      oldLabel: "artifact-ownership",
      path: input.artifact.path,
      payload: {
        fact: "artifact",
        projectRoot: stringField(parsed, "projectRoot"),
        sourceInputs,
        ownedFiles,
        projectFactOutputPaths,
        projectFactSourcePaths,
        generatedOutputPaths,
      },
      now: input.now,
    })],
  }
}

const parseJsonRecord = (
  content: string,
): Readonly<Record<string, unknown>> | undefined => {
  try {
    const value = JSON.parse(content) as unknown
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Readonly<Record<string, unknown>>
      : undefined
  } catch {
    return undefined
  }
}

const stringField = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): string | undefined => {
  const value = record[key]
  return typeof value === "string" ? value : undefined
}

const stringArrayField = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): readonly string[] => {
  const value = record[key]
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []
}

const arrayObjectStringValues = (
  record: Readonly<Record<string, unknown>>,
  key: string,
  nestedKey: string,
): readonly string[] => {
  const value = record[key]
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return []
    return stringArrayField(entry as Readonly<Record<string, unknown>>, nestedKey)
  })
}

const normalizeArtifactOwnershipPath = (
  root: string,
  path: string,
): string => {
  if (path.startsWith("/") || path.startsWith(root) || path.startsWith(".attune/") || path.startsWith("framework/")) {
    return path
  }
  return `${root}/${path}`.replaceAll("//", "/")
}

const compatibilityObservation = (
  input: {
    readonly id: string
    readonly projectId: string
    readonly kind: string
    readonly compatibilitySource: string
    readonly oldLabel: string
    readonly path: string
    readonly payload: Readonly<Record<string, unknown>>
    readonly now: string
    readonly status?: string
  },
): ProgramIndexObservation => ({
  id: input.id,
  projectId: input.projectId,
  kind: input.kind,
  status: input.status ?? "recorded",
  payloadJson: programIndexJson({
    compatibilitySource: input.compatibilitySource,
    oldLabel: input.oldLabel,
    path: input.path,
    ...input.payload,
  }),
  createdAt: input.now,
})

const compatibilityExportSymbolId = (
  projectId: string,
  path: string,
  exportName: string,
): string => `compat-symbol:${projectId}:${programIndexContentHash(path).slice(0, 12)}:export:${exportName}`

const compatibilityOperationSymbolId = (
  projectId: string,
  operationId: string,
): string => `compat-symbol:${projectId}:operation:${operationId}`

const compatibilityVirtualSymbol = (
  projectId: string,
  kind: "atom" | "reactivity-key",
  name: string,
  sourceFileId: string | undefined,
): ProgramIndexSymbol => ({
  id: `compat-symbol:${projectId}:${kind}:${programIndexContentHash(name).slice(0, 16)}`,
  projectId,
  ...(sourceFileId === undefined ? {} : { sourceFileId }),
  exportName: name,
  localName: name,
  kind: `compatibility-${kind}`,
  hash: hashProgramValue({
    compatibilitySource: "package-contract-compat",
    kind,
    name,
  }),
})

const compatibilityEdgeId = (
  kind: string,
  fromSymbolId: string,
  toSymbolId: string,
): string => hashProgramValue({
  source: "compatibility",
  kind,
  fromSymbolId,
  toSymbolId,
})

const escapeRegExp = (
  value: string,
): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

export const programIndexDiagnosticsForFile = (
  index: ProgramIndexApi,
  filePath: string,
): Effect.Effect<readonly ProgramDiagnostic[], unknown> =>
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
      programIndexDiagnosticRowToProgramDiagnostic(
        row,
        repairsByDiagnosticId.get(stringValue(row, "diagnostic_id")) ?? [],
      )
    )
  })

export const programIndexDiagnosticRowToProgramDiagnostic = (
  row: ProgramIndexViewRow,
  repairRows: readonly ProgramIndexViewRow[] = [],
): ProgramDiagnostic => {
  const range = sourceRangeFromRow(row)
  const cause = jsonValueFromRow(row, "cause_json")
  return {
    code: stringValue(row, "code"),
    severity: diagnosticSeverity(row.severity ?? null),
    projectId: stringValue(row, "project_id", "workspace"),
    sourcePath: stringValue(row, "path", "workspace"),
    explanation: stringValue(row, "message"),
    ...(range === undefined ? {} : { range }),
    ...(cause === undefined ? {} : { cause }),
    suggestedActions: repairRows.map(programIndexRepairRowToProgramAction),
    relatedObservations: cause === undefined ? [] : ["program-index:cause"],
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
  if (/framework\/architecture\/src\/generated\/package-contracts\/[^/]+\/attune\.contract\.generated\.ts$/u.test(path)) {
    return "framework-generated-contract-artifact"
  }
  if (/framework\/architecture\/src\/generated\/package-contracts\/[^/]+\/attune\.generated\.ts$/u.test(path)) {
    return "framework-generated-companion-artifact"
  }
  if (/\.attune\/cache\/generated\/[^/]+\/attune-symbol-registry\.ts$/u.test(path)) {
    return "framework-generated-symbol-registry"
  }
  if (/\.attune\/cache\/generated\/[^/]+\/attune-property-observations\.ts$/u.test(path)) {
    return "framework-generated-property-observations"
  }
  if (/\.attune\/cache\/generated\/[^/]+\/attune-schema-observations\.ts$/u.test(path)) {
    return "framework-generated-schema-observations"
  }
  if (/\.attune\/cache\/generated\/[^/]+\/attune-observation-scaffold\.ts$/u.test(path)) {
    return "framework-generated-observation-artifact"
  }
  if (/\.attune\/cache\/generated\/[^/]+\/artifact-freshness\.json$/u.test(path)) {
    return "framework-generated-artifact-freshness"
  }
  if (/src\/attune\.contract\.generated\.ts$/u.test(path)) return "generated-contract-companion"
  if (/src\/attune\.generated\.ts$/u.test(path)) return "generated-program-companion"
  if (/attune\.artifact-ownership\.json$/u.test(path) || /framework\/architecture\/src\/generated\/artifact-ownership\/[^/]+\.json$/u.test(path)) {
    return "artifact-ownership-compatibility"
  }
  if (/package-contracts\.typecheck\.generated\.ts$/u.test(path)) return "package-contract-typecheck-aggregate"
  if (/type-guidance/u.test(path)) return "type-guidance-compatibility"
  return "generated-contract-shard"
}

const compatibilitySourceMetadata = (path: string): string => {
  if (/attune\.artifact-ownership\.json$/u.test(path) || /framework\/architecture\/src\/generated\/artifact-ownership\/[^/]+\.json$/u.test(path)) {
    return "artifact-ownership-compat"
  }
  if (/type-guidance/u.test(path)) return "type-guidance-compat"
  if (
    /src\/attune\.(?:contract\.)?generated\.ts$/u.test(path) ||
    /framework\/architecture\/src\/generated\/package-contracts\/[^/]+\/attune\.generated\.ts$/u.test(path) ||
    /\.attune\/cache\/generated\//u.test(path)
  ) {
    return "generated-companion-compat"
  }
  return "package-contract-compat"
}

const compatibilityArtifactStatus = (
  contentByPath: Readonly<Record<string, string>> | undefined,
  content: string | undefined,
): ProgramIndexArtifact["status"] => {
  if (content !== undefined) return "current"
  return contentByPath === undefined ? "unknown" : "missing"
}

const compatibilityDiagnosticsFromArtifact = (
  projectId: string,
  artifact: ProgramIndexArtifact,
  sourceFile: ProgramIndexSourceFile | undefined,
): readonly ProgramIndexDiagnostic[] => {
  const cause = {
    fact: "artifact",
    artifactId: artifact.id,
    path: artifact.path,
    status: artifact.status,
    compatibilitySource: compatibilitySourceMetadata(artifact.path),
  }
  const sourceFileFields = sourceFile === undefined ? {} : { sourceFileId: sourceFile.id }
  const rows: ProgramIndexDiagnostic[] = []

  if (artifact.status === "missing" || artifact.status === "stale") {
    rows.push({
      id: `diagnostic:${artifact.id}:${artifact.status}`,
      projectId,
      ...sourceFileFields,
      code: `attune/program-index/artifact-${artifact.status}`,
      severity: artifact.status === "missing" ? "error" : "warning",
      message: `artifact fact is ${artifact.status} for ${artifact.path}.`,
      causeJson: programIndexJson(cause),
    })
  }

  if (isPackageLocalAttuneCompanionPath(artifact.path)) {
    rows.push({
      id: `diagnostic:${artifact.id}:package-local-companion`,
      projectId,
      ...sourceFileFields,
      code: "attune/program-index/package-local-companion",
      severity: "warning",
      message: `artifact fact records legacy package-local generated companion compatibility input ${artifact.path}; framework-owned artifact projection should replace it.`,
      causeJson: programIndexJson(cause),
    })
  }

  if (compatibilitySourceMetadata(artifact.path) === "artifact-ownership-compat") {
    if (artifact.status === "missing" || artifact.status === "stale") {
      rows.push({
        id: `diagnostic:${artifact.id}:artifact-ownership-compat:${artifact.status}`,
        projectId,
        ...sourceFileFields,
        code: `attune/program-index/artifact-ownership-compatibility-${artifact.status}`,
        severity: artifact.status === "missing" ? "warning" : "info",
        message: `artifact fact is ${artifact.status} for artifact ownership compatibility input ${artifact.path}; artifact ownership should derive from program-index facts.`,
        causeJson: programIndexJson({ ...cause, fact: "artifact" }),
      })
    }
    if (!isPackageLocalArtifactOwnershipCompatibilityPath(artifact.path)) return rows
    rows.push({
      id: `diagnostic:${artifact.id}:artifact-ownership-compat`,
      projectId,
      ...sourceFileFields,
      code: "attune/program-index/artifact-ownership-compatibility",
      severity: "info",
      message: `observation fact records artifact-ownership compatibility input ${artifact.path}; artifact ownership should derive from program-index facts.`,
      causeJson: programIndexJson({ ...cause, fact: "observation" }),
    })
  }

  if (isCheckedInReportArtifactPath(artifact.path)) {
    rows.push({
      id: `diagnostic:${artifact.id}:checked-in-report`,
      projectId,
      ...sourceFileFields,
      code: "attune/program-index/checked-in-report-artifact",
      severity: "error",
      message: `artifact fact points at checked-in report output ${artifact.path}; observations and diagnostics belong in cache, stdout, or CI artifacts.`,
      causeJson: programIndexJson(cause),
    })
  }

  return rows
}

const compatibilityRepairForDiagnostic = (
  projectId: string,
  diagnostic: ProgramIndexDiagnostic,
  now: string,
): ProgramIndexRepair => {
  const repair = compatibilityRepairMetadata(diagnostic.code)
  return {
    id: `repair:${diagnostic.id}`,
    diagnosticId: diagnostic.id,
    safety: repair.safety,
    ...(repair.nxTarget === undefined ? {} : { nxTarget: repair.nxTarget(projectId) }),
    repairKind: repair.repairKind,
    route: repair.route(projectId),
    payloadJson: programIndexJson({
      source: "program-index",
      diagnostic: diagnostic.code,
      cause: diagnostic.causeJson === undefined ? undefined : JSON.parse(diagnostic.causeJson) as unknown,
    }),
    validationAfterTargetsJson: programIndexJson(repair.validationAfterTargets(projectId)),
    createdAt: now,
  }
}

const compatibilityRepairMetadata = (
  code: string,
): {
  readonly safety: ProgramIndexRepair["safety"]
  readonly repairKind: string
  readonly nxTarget?: (projectId: string) => string
  readonly route: (projectId: string) => string
  readonly validationAfterTargets: (projectId: string) => readonly string[]
} => {
  switch (code) {
    case "attune/program-index/artifact-missing":
    case "attune/program-index/artifact-stale":
      return {
        safety: "safe",
        repairKind: "artifact-freshness",
        nxTarget: (projectId) => `${projectId}:attune-repair`,
        route: () => "attune-repair-cli:artifact-freshness",
        validationAfterTargets: (projectId) => [
          `${projectId}:attune-check`,
          `${projectId}:typecheck`,
        ],
      }
    case "attune/program-index/package-local-companion":
      return {
        safety: "needs-review",
        repairKind: "artifact-relocation",
        nxTarget: (projectId) => `${projectId}:attune-repair`,
        route: () => "attune-repair-cli:artifact-freshness",
        validationAfterTargets: (projectId) => [
          `${projectId}:attune-check`,
          `${projectId}:typecheck`,
        ],
      }
    case "attune/program-index/artifact-ownership-compatibility":
    case "attune/program-index/artifact-ownership-compatibility-missing":
    case "attune/program-index/artifact-ownership-compatibility-stale":
      return {
        safety: "needs-review",
        repairKind: "artifact-ownership-projection",
        nxTarget: () => "workspace:attune-repair",
        route: () => "attune-repair-cli:artifact-freshness",
        validationAfterTargets: () => ["workspace:attune-check"],
      }
    case "attune/program-index/checked-in-report-artifact":
      return {
        safety: "manual-only",
        repairKind: "checked-in-report-removal",
        nxTarget: () => "workspace:attune-repair",
        route: () => "manual:remove-checked-in-report",
        validationAfterTargets: () => ["workspace:attune-check"],
      }
    default:
      return {
        safety: "needs-review",
        repairKind: "program-index-diagnostic-review",
        nxTarget: (projectId) => `${projectId}:attune-repair`,
        route: () => "manual:review-program-index-diagnostic",
        validationAfterTargets: (projectId) => [`${projectId}:attune-check`],
      }
  }
}

const isPackageLocalAttuneCompanionPath = (path: string): boolean =>
  /(^|\/)attune\.artifact-ownership\.json$/u.test(path) ||
  /(^|\/)src\/attune\.(generated|contract\.generated|package\.typecheck)\.ts$/u.test(path)

const isPackageLocalArtifactOwnershipCompatibilityPath = (path: string): boolean =>
  /(^|\/)attune\.artifact-ownership\.json$/u.test(path)

const isCheckedInReportArtifactPath = (path: string): boolean => {
  if (/(^|\/)src\/artifacts\/.*\.[cm]?[jt]sx?$/u.test(path)) return false

  return /(^|\/)(reports?|artifacts?|agent-output|protocol-output)(\/|$)|\b(protocol[-_. ]?delta|obligation[-_. ]?(report|summary|status)|evidence[-_. ]?(summary|report|status)|architecture[-_. ]?(summary|report|status)|cloud[-_. ]?agent[-_. ]?(summary|report|status)|(fuzz|fuzzer|property|proof|run)[-_. ]?(report|summary|status)|(report|summary|status)[-_. ]?(fuzz|fuzzer|property|proof|run))\b/iu.test(path)
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
): ProgramDiagnostic["severity"] =>
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

const programIndexRepairRowToProgramAction = (
  row: ProgramIndexViewRow,
): ProgramRepairAction => {
  const nxTarget = stringValue(row, "nx_target")
  const repairKind = stringValue(row, "repair_kind")
  const safety = stringValue(row, "safety")
  const route = stringValue(row, "route")
  const payload = jsonValueFromRow(row, "payload_json")
  const validationAfterTargets = stringArrayValueFromRow(row, "validation_after_targets_json")
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
      ...(route.length === 0 ? {} : { route }),
      ...(repairKind.length === 0 ? {} : { repairKind }),
      ...(validationAfterTargets.length === 0 ? {} : { validationAfterTargets }),
      ...(payload === undefined ? {} : { payload }),
    },
  }
}

const stringArrayValueFromRow = (
  row: ProgramIndexViewRow,
  key: string,
): readonly string[] => {
  const value = jsonValueFromRow(row, key)
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string")
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

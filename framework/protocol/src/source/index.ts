import { Schema } from "effect"
import ts from "typescript"

import type {
  AttuneOperationContract,
  TouchedViews,
} from "../builders/index.js"

export const SourceDeclarationPositionSchema = Schema.Struct({
  line: Schema.Number,
  character: Schema.Number,
})

export const SourceDeclarationRangeSchema = Schema.Struct({
  start: SourceDeclarationPositionSchema,
  end: SourceDeclarationPositionSchema,
})

export const SourceDeclarationSchema = Schema.Struct({
  sourcePath: Schema.String,
  exportName: Schema.String,
  symbolName: Schema.String,
  range: Schema.optional(SourceDeclarationRangeSchema),
})

export const SourceReferenceSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  declaration: SourceDeclarationSchema,
  explicitId: Schema.optional(Schema.String),
})

export type SourceDeclarationPosition = typeof SourceDeclarationPositionSchema.Type
export type SourceDeclarationRange = typeof SourceDeclarationRangeSchema.Type
export type SourceDeclaration = typeof SourceDeclarationSchema.Type
export type SourceReference = typeof SourceReferenceSchema.Type

export interface SymbolLikeDeclaration {
  readonly sourcePath: string
  readonly exportName?: string
  readonly symbolName: string
  readonly range?: SourceDeclarationRange
}

export interface IdDerivationOptions {
  readonly packageId?: string
  readonly explicitId?: string
  readonly namespace?: string
}

export interface SourceReferenceOptions extends IdDerivationOptions {
  readonly kind: string
}

export const sourceDeclaration = (
  declaration: SymbolLikeDeclaration,
): SourceDeclaration => ({
  sourcePath: declaration.sourcePath,
  exportName: declaration.exportName ?? declaration.symbolName,
  symbolName: declaration.symbolName,
  ...(declaration.range === undefined ? {} : { range: declaration.range }),
})

const kebabCase = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()

export const stableIdFromDeclaration = (
  declaration: SourceDeclaration,
  options: IdDerivationOptions = {},
): string => {
  if (options.explicitId !== undefined) return options.explicitId

  const segments = [
    options.packageId,
    options.namespace,
    kebabCase(declaration.exportName || declaration.symbolName),
  ].filter((segment): segment is string => segment !== undefined && segment.length > 0)

  return segments.join(".")
}

export const sourceReference = (
  declarationLike: SymbolLikeDeclaration,
  options: SourceReferenceOptions,
): SourceReference => {
  const declaration = sourceDeclaration(declarationLike)
  return {
    id: stableIdFromDeclaration(declaration, options),
    kind: options.kind,
    declaration,
    ...(options.explicitId === undefined ? {} : { explicitId: options.explicitId }),
  }
}

export const serializeSourceReference = (reference: SourceReference): string =>
  Schema.encodeSync(SourceReferenceSchema)(reference).id

export const roundtripSourceReference = (reference: SourceReference): SourceReference =>
  Schema.decodeUnknownSync(SourceReferenceSchema)(
    Schema.encodeSync(SourceReferenceSchema)(reference),
  )

export const reactivityKey = (
  declaration: SymbolLikeDeclaration,
  options: IdDerivationOptions = {},
): SourceReference => sourceReference(declaration, {
  ...options,
  kind: "reactivity-key",
  namespace: options.namespace ?? "reactivity",
})

export const baseAtom = (
  declaration: SymbolLikeDeclaration,
  options: IdDerivationOptions = {},
): SourceReference => sourceReference(declaration, {
  ...options,
  kind: "base-atom",
  namespace: options.namespace ?? "atom",
})

export const derivedAtom = (
  declaration: SymbolLikeDeclaration,
  options: IdDerivationOptions = {},
): SourceReference => sourceReference(declaration, {
  ...options,
  kind: "derived-atom",
  namespace: options.namespace ?? "atom",
})

export const packageViewAtom = (
  declaration: SymbolLikeDeclaration,
  options: IdDerivationOptions = {},
): SourceReference => sourceReference(declaration, {
  ...options,
  kind: "package-view-atom",
  namespace: options.namespace ?? "view",
})

export const serviceRef = (
  declaration: SymbolLikeDeclaration,
  options: IdDerivationOptions = {},
): SourceReference => sourceReference(declaration, {
  ...options,
  kind: "service",
  namespace: options.namespace ?? "service",
})

export const schemaRef = (
  declaration: SymbolLikeDeclaration,
  options: IdDerivationOptions = {},
): SourceReference => sourceReference(declaration, {
  ...options,
  kind: "schema",
  namespace: options.namespace ?? "schema",
})

export const artifactOwner = (
  declaration: SymbolLikeDeclaration,
  options: IdDerivationOptions = {},
): SourceReference => sourceReference(declaration, {
  ...options,
  kind: "generated-artifact-owner",
  namespace: options.namespace ?? "artifact",
})

export interface BaseAtomNode {
  readonly id: string
  readonly refreshesOn: readonly string[]
}

export interface DerivedAtomNode {
  readonly id: string
  readonly reads: readonly string[]
}

export interface PackageViewAtomNode {
  readonly id: string
  readonly reads: readonly string[]
}

export interface PackageViewGraph {
  readonly reactivityKeys: readonly string[]
  readonly baseAtoms: readonly BaseAtomNode[]
  readonly derivedAtoms: readonly DerivedAtomNode[]
  readonly packageViewAtoms: readonly PackageViewAtomNode[]
}

export interface OperationViewEdge {
  readonly operationId: string
  readonly reactivityKey: string
  readonly baseAtom: string
  readonly derivedAtoms: readonly string[]
  readonly packageViewAtoms: readonly string[]
}

export const definePackageViewGraph = <const Graph extends PackageViewGraph>(
  graph: Graph,
): Graph => graph

const reachableAtoms = (
  startAtom: string,
  derivedAtoms: readonly DerivedAtomNode[],
): readonly string[] => {
  const reachable = new Set<string>()
  let changed = true

  while (changed) {
    changed = false
    for (const atom of derivedAtoms) {
      if (reachable.has(atom.id)) continue
      if (atom.reads.includes(startAtom) || atom.reads.some((read) => reachable.has(read))) {
        reachable.add(atom.id)
        changed = true
      }
    }
  }

  return [...reachable].sort()
}

export const deriveOperationToViewEdges = (
  operation: Pick<AttuneOperationContract, "id" | "views">,
  graph: PackageViewGraph,
): readonly OperationViewEdge[] => {
  const touchedKeys = operation.views?.reactivityKeys ?? []
  return touchedKeys.flatMap((reactivityKeyId) =>
    graph.baseAtoms
      .filter((atom) => atom.refreshesOn.includes(reactivityKeyId))
      .map((atom) => {
        const derivedAtoms = reachableAtoms(atom.id, graph.derivedAtoms)
        return {
          operationId: operation.id,
          reactivityKey: reactivityKeyId,
          baseAtom: atom.id,
          derivedAtoms,
          packageViewAtoms: graph.packageViewAtoms
            .filter((viewAtom) =>
              viewAtom.reads.includes(atom.id) ||
              viewAtom.reads.some((read) => derivedAtoms.includes(read)))
            .map((viewAtom) => viewAtom.id)
            .sort(),
        }
      }))
}

export const touchedViewsFromReferences = (
  input: {
    readonly reactivityKeys?: readonly SourceReference[]
    readonly atoms?: readonly SourceReference[]
  },
): TouchedViews => ({
  ...(input.reactivityKeys === undefined ? {} : {
    reactivityKeys: input.reactivityKeys.map((reference) => reference.id),
  }),
  ...(input.atoms === undefined ? {} : {
    atoms: input.atoms.map((reference) => reference.id),
  }),
})

export type OperationRegistry<
  Operations extends readonly AttuneOperationContract[],
> = {
  readonly [Operation in Operations[number] as Operation["id"]]: Operation
}

export const deriveOperationRegistry = <
  const Operations extends readonly AttuneOperationContract[],
>(
  operations: Operations,
): OperationRegistry<Operations> => {
  const entries = new Map<string, AttuneOperationContract>()
  const duplicates = new Set<string>()

  for (const operation of operations) {
    if (entries.has(operation.id)) duplicates.add(operation.id)
    entries.set(operation.id, operation)
  }

  if (duplicates.size > 0) {
    throw new Error(`Duplicate Attune operation ids: ${[...duplicates].sort().join(", ")}`)
  }

  return Object.fromEntries(entries) as OperationRegistry<Operations>
}

export interface StringReferenceDiagnostic {
  readonly code: "attune/protocol/avoidable-string-reference"
  readonly message: string
  readonly reference: string
  readonly suggestedAction: string
}

const StringReferenceDiagnosticSchema = Schema.Struct({
  code: Schema.Literal("attune/protocol/avoidable-string-reference"),
  message: Schema.String,
  reference: Schema.String,
  suggestedAction: Schema.String,
})

export const diagnoseAvoidableStringReferences = (
  values: readonly string[],
  knownReferences: readonly SourceReference[],
): readonly StringReferenceDiagnostic[] => {
  const knownIds = new Set(knownReferences.map((reference) => reference.id))
  return values
    .filter((value) => !knownIds.has(value))
    .map((reference) => ({
      code: "attune/protocol/avoidable-string-reference" as const,
      reference,
      message: `Reference ${reference} is not backed by a source declaration.`,
      suggestedAction: "Replace the raw string with a framework source reference or add an explicit id override.",
    }))
}

export const ProtocolSourceImportSchema = Schema.Struct({
  sourcePath: Schema.String,
  moduleSpecifier: Schema.String,
  importedName: Schema.String,
  localName: Schema.String,
  range: SourceDeclarationRangeSchema,
})

export const ProtocolSourceDeclarationSchema = Schema.Struct({
  kind: Schema.String,
  id: Schema.String,
  declaration: SourceDeclarationSchema,
  typeText: Schema.optional(Schema.String),
  initializerText: Schema.optional(Schema.String),
  referencedIdentifiers: Schema.Array(Schema.String),
  imports: Schema.Array(ProtocolSourceImportSchema),
  avoidableStringReferences: Schema.Array(StringReferenceDiagnosticSchema),
})

export const ProtocolSourceExtractionSummarySchema = Schema.Struct({
  sourceFiles: Schema.Array(Schema.String),
  declarations: Schema.Array(ProtocolSourceDeclarationSchema),
  imports: Schema.Array(ProtocolSourceImportSchema),
  diagnostics: Schema.Array(StringReferenceDiagnosticSchema),
})

export type ProtocolSourceImport = typeof ProtocolSourceImportSchema.Type
export type ProtocolSourceDeclaration = typeof ProtocolSourceDeclarationSchema.Type
export type ProtocolSourceExtractionSummary =
  typeof ProtocolSourceExtractionSummarySchema.Type

export interface ExtractProtocolSourceSummaryOptions {
  readonly sourceFiles: readonly string[]
  readonly packageId?: string
  readonly compilerOptions?: ts.CompilerOptions
  readonly protocolFactoryNames?: readonly string[]
}

const defaultProtocolFactoryKinds = {
  reactivityKey: { kind: "reactivity-key", namespace: "reactivity" },
  baseAtom: { kind: "base-atom", namespace: "atom" },
  derivedAtom: { kind: "derived-atom", namespace: "atom" },
  packageViewAtom: { kind: "package-view-atom", namespace: "view" },
  serviceRef: { kind: "service", namespace: "service" },
  schemaRef: { kind: "schema", namespace: "schema" },
  Struct: { kind: "schema", namespace: "schema" },
  Literal: { kind: "schema", namespace: "schema" },
  Literals: { kind: "schema", namespace: "schema" },
  Union: { kind: "schema", namespace: "schema" },
  Array: { kind: "schema", namespace: "schema" },
  Record: { kind: "schema", namespace: "schema" },
  NullOr: { kind: "schema", namespace: "schema" },
  Optional: { kind: "schema", namespace: "schema" },
  transform: { kind: "schema", namespace: "schema" },
  filter: { kind: "schema", namespace: "schema" },
  artifactOwner: { kind: "generated-artifact-owner", namespace: "artifact" },
  projection: { kind: "operation", namespace: "operation" },
  query: { kind: "operation", namespace: "operation" },
  command: { kind: "operation", namespace: "operation" },
  codec: { kind: "operation", namespace: "operation" },
  eventFacade: { kind: "operation", namespace: "operation" },
  atomFamily: { kind: "operation", namespace: "operation" },
  resourceProvider: { kind: "operation", namespace: "operation" },
  generator: { kind: "operation", namespace: "operation" },
  policyRule: { kind: "operation", namespace: "operation" },
  joernTemplate: { kind: "operation", namespace: "operation" },
} as const

interface ProtocolFactoryInfo {
  readonly kind: string
  readonly namespace: string
}

const rangeForNode = (
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceDeclarationRange => {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
  return {
    start: { line: start.line + 1, character: start.character + 1 },
    end: { line: end.line + 1, character: end.character + 1 },
  }
}

const hasExportModifier = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false)

const propertyNameText = (name: ts.PropertyName): string | undefined => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }
  return undefined
}

const calledIdentifier = (node: ts.Node): string | undefined => {
  if (!ts.isCallExpression(node)) return undefined
  if (ts.isIdentifier(node.expression)) return node.expression.text
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text
  return undefined
}

const findProtocolCall = (
  node: ts.Node,
  knownFactoryNames: ReadonlySet<string>,
): ts.CallExpression | undefined => {
  let found: ts.CallExpression | undefined

  const visit = (candidate: ts.Node): void => {
    if (found !== undefined) return
    const name = calledIdentifier(candidate)
    if (name !== undefined && knownFactoryNames.has(name) && ts.isCallExpression(candidate)) {
      found = candidate
      return
    }
    ts.forEachChild(candidate, visit)
  }

  visit(node)
  return found
}

const exportedDeclarationName = (
  node: ts.Node,
): string | undefined => {
  if (ts.isVariableStatement(node) && hasExportModifier(node)) {
    const declaration = node.declarationList.declarations[0]
    if (declaration !== undefined && ts.isIdentifier(declaration.name)) return declaration.name.text
  }

  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    hasExportModifier(node) &&
    node.name !== undefined
  ) {
    return node.name.text
  }

  return undefined
}

const initializerTextForExportedDeclaration = (
  sourceFile: ts.SourceFile,
  node: ts.Node,
): string | undefined => {
  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0]
    if (declaration?.initializer !== undefined) {
      return declaration.initializer.getText(sourceFile)
    }
  }

  return undefined
}

const collectImports = (sourceFile: ts.SourceFile): readonly ProtocolSourceImport[] => {
  const imports: ProtocolSourceImport[] = []

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue
    }

    const moduleSpecifier = statement.moduleSpecifier.text
    const clause = statement.importClause
    if (clause?.name !== undefined) {
      imports.push({
        sourcePath: sourceFile.fileName,
        moduleSpecifier,
        importedName: "default",
        localName: clause.name.text,
        range: rangeForNode(sourceFile, clause.name),
      })
    }

    const namedBindings = clause?.namedBindings
    if (namedBindings === undefined) continue

    if (ts.isNamespaceImport(namedBindings)) {
      imports.push({
        sourcePath: sourceFile.fileName,
        moduleSpecifier,
        importedName: "*",
        localName: namedBindings.name.text,
        range: rangeForNode(sourceFile, namedBindings.name),
      })
      continue
    }

    for (const element of namedBindings.elements) {
      imports.push({
        sourcePath: sourceFile.fileName,
        moduleSpecifier,
        importedName: element.propertyName?.text ?? element.name.text,
        localName: element.name.text,
        range: rangeForNode(sourceFile, element.name),
      })
    }
  }

  return imports
}

const collectReferencedIdentifiers = (node: ts.Node): readonly string[] => {
  const identifiers = new Set<string>()

  const visit = (candidate: ts.Node): void => {
    if (ts.isIdentifier(candidate)) identifiers.add(candidate.text)
    ts.forEachChild(candidate, visit)
  }

  visit(node)
  return [...identifiers].sort()
}

const firstStringArgument = (call: ts.CallExpression): string | undefined => {
  const first = call.arguments[0]
  return first !== undefined && ts.isStringLiteralLike(first) ? first.text : undefined
}

const explicitIdFromObjectLiteral = (node: ts.Node): string | undefined => {
  if (!ts.isObjectLiteralExpression(node)) return undefined

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = propertyNameText(property.name)
    if (name === "id" && ts.isStringLiteralLike(property.initializer)) {
      return property.initializer.text
    }
  }

  return undefined
}

const explicitIdFromCall = (call: ts.CallExpression): string | undefined => {
  const direct = firstStringArgument(call)
  if (direct !== undefined) return direct

  for (const argument of call.arguments) {
    const id = explicitIdFromObjectLiteral(argument)
    if (id !== undefined) return id
  }

  return undefined
}

const stringLiteralsFromNode = (node: ts.Node): readonly string[] => {
  const values = new Set<string>()

  const visit = (candidate: ts.Node): void => {
    if (ts.isStringLiteralLike(candidate)) values.add(candidate.text)
    ts.forEachChild(candidate, visit)
  }

  visit(node)
  return [...values].sort()
}

const diagnoseRawStringsWithSourceReferences = (
  values: readonly string[],
  knownReferences: readonly SourceReference[],
  allowedValues: readonly string[] = [],
): readonly StringReferenceDiagnostic[] => {
  const knownIds = new Set(knownReferences.map((reference) => reference.id))
  const allowed = new Set(allowedValues)
  return values
    .filter((value) => knownIds.has(value) && !allowed.has(value))
    .map((reference) => ({
      code: "attune/protocol/avoidable-string-reference" as const,
      reference,
      message: `Reference ${reference} has a source declaration and should use its source reference.`,
      suggestedAction: "Replace the raw string with the exported framework source reference.",
    }))
}

const declarationSymbolName = (
  checker: ts.TypeChecker,
  node: ts.Node,
  fallback: string,
): string => {
  const nameNode = ts.isVariableStatement(node)
    ? node.declarationList.declarations[0]?.name
    : (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name !== undefined
      ? node.name
      : undefined
  const symbol = checker.getSymbolAtLocation(nameNode ?? node)
  return symbol?.getName() ?? fallback
}

const idDerivationOptions = (
  options: {
    readonly packageId: string | undefined
    readonly namespace: string | undefined
    readonly explicitId: string | undefined
  },
): IdDerivationOptions => ({
  ...(options.packageId === undefined ? {} : { packageId: options.packageId }),
  ...(options.namespace === undefined ? {} : { namespace: options.namespace }),
  ...(options.explicitId === undefined ? {} : { explicitId: options.explicitId }),
})

export const extractProtocolSourceSummary = (
  options: ExtractProtocolSourceSummaryOptions,
): ProtocolSourceExtractionSummary => {
  const compilerOptions: ts.CompilerOptions = {
    allowJs: false,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2023,
    ...options.compilerOptions,
  }
  const program = ts.createProgram([...options.sourceFiles], compilerOptions)
  const checker = program.getTypeChecker()
  const protocolFactoryKinds = new Map<string, ProtocolFactoryInfo>([
    ...Object.entries(defaultProtocolFactoryKinds),
    ...(options.protocolFactoryNames ?? []).map((name) => [
      name,
      { kind: "protocol-declaration", namespace: "protocol" },
    ] as const),
  ])
  const protocolFactoryNames = new Set(protocolFactoryKinds.keys())
  const sourceFiles = program
    .getSourceFiles()
    .filter((sourceFile) => options.sourceFiles.includes(sourceFile.fileName))
  const allImports = sourceFiles.flatMap((sourceFile) => [...collectImports(sourceFile)])
  const importByFileAndLocalName = new Map(
    allImports.map((sourceImport) => [
      `${sourceImport.sourcePath}:${sourceImport.localName}`,
      sourceImport,
    ]),
  )
  const extractedDeclarations: Array<Omit<
    ProtocolSourceDeclaration,
    "avoidableStringReferences"
  > & {
    readonly explicitId?: string
    readonly stringLiterals: readonly string[]
    readonly sourceReference: SourceReference
  }> = []

  for (const sourceFile of sourceFiles) {
    for (const statement of sourceFile.statements) {
      const exportName = exportedDeclarationName(statement)
      if (exportName === undefined) continue

      const call = findProtocolCall(statement, protocolFactoryNames)
      const range = rangeForNode(sourceFile, statement)
      const declaration = sourceDeclaration({
        sourcePath: sourceFile.fileName,
        exportName,
        symbolName: declarationSymbolName(checker, statement, exportName),
        range,
      })
      const type = checker.getTypeAtLocation(statement)

      if (call === undefined) {
        const referencedIdentifiers = collectReferencedIdentifiers(statement)
        const imports = referencedIdentifiers
          .map((identifier) => importByFileAndLocalName.get(`${sourceFile.fileName}:${identifier}`))
          .filter((sourceImport): sourceImport is ProtocolSourceImport => sourceImport !== undefined)
        const id = stableIdFromDeclaration(declaration, idDerivationOptions({
          packageId: options.packageId,
          namespace: "symbol",
          explicitId: undefined,
        }))
        const reference: SourceReference = {
          id,
          kind: "exported-symbol",
          declaration,
        }
        const initializerText = initializerTextForExportedDeclaration(sourceFile, statement)

        extractedDeclarations.push({
          kind: reference.kind,
          id,
          declaration,
          typeText: checker.typeToString(type),
          ...(initializerText === undefined ? {} : { initializerText }),
          referencedIdentifiers,
          imports,
          stringLiterals: [],
          sourceReference: reference,
        })
        continue
      }

      const factoryName = calledIdentifier(call)
      const factoryInfo = factoryName === undefined ? undefined : protocolFactoryKinds.get(factoryName)
      const explicitId = explicitIdFromCall(call)
      const idOptions = idDerivationOptions({
        packageId: options.packageId,
        namespace: factoryInfo?.namespace,
        explicitId,
      })
      const id = stableIdFromDeclaration(declaration, idOptions)
      const referencedIdentifiers = collectReferencedIdentifiers(call)
      const imports = referencedIdentifiers
        .map((identifier) => importByFileAndLocalName.get(`${sourceFile.fileName}:${identifier}`))
        .filter((sourceImport): sourceImport is ProtocolSourceImport => sourceImport !== undefined)
      const kind = factoryInfo?.kind ?? "protocol-declaration"
      const reference: SourceReference = {
        id,
        kind,
        declaration,
        ...(explicitId === undefined ? {} : { explicitId }),
      }

      extractedDeclarations.push({
        kind: reference.kind,
        id,
        declaration,
        typeText: checker.typeToString(type),
        initializerText: initializerTextForExportedDeclaration(sourceFile, statement) ?? call.getText(sourceFile),
        referencedIdentifiers,
        imports,
        ...(explicitId === undefined ? {} : { explicitId }),
        stringLiterals: stringLiteralsFromNode(call),
        sourceReference: reference,
      })
    }
  }

  const knownReferences = extractedDeclarations.map((declaration) => declaration.sourceReference)
  const declarations = extractedDeclarations.map((declaration) => {
    const {
      explicitId,
      stringLiterals,
      sourceReference: _sourceReference,
      ...serializableDeclaration
    } = declaration
    return {
      ...serializableDeclaration,
      avoidableStringReferences: diagnoseRawStringsWithSourceReferences(
        stringLiterals,
        knownReferences,
        explicitId === undefined ? [] : [explicitId],
      ),
    }
  })

  const diagnostics = declarations.flatMap((declaration) => [
    ...declaration.avoidableStringReferences,
  ])

  return Schema.decodeUnknownSync(ProtocolSourceExtractionSummarySchema)({
    sourceFiles: sourceFiles.map((sourceFile) => sourceFile.fileName).sort(),
    declarations: declarations.sort((left, right) => left.id.localeCompare(right.id)),
    imports: allImports,
    diagnostics,
  })
}

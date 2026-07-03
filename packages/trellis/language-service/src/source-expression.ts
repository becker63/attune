import { createHash } from "node:crypto"
import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"

import { Effect, Layer, Schema } from "effect"
import ts from "typescript"
import {
  defineAlchemyRecipeDagEdge,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  defineRepairRecipe,
  RecipeExpressionOracleResultSchema,
  RecipeExpressionSnapshotSchema,
  type RecipeExpressionOracleResult,
  type RecipeExpressionRole,
  type RecipeExpressionSideEffectKind,
  type RecipeExpressionSnapshot,
  type RecipeExpressionTarget,
  type RecipeExpressionTargetMissingReason,
} from "@attune/framework-protocol"

import type { TrellisLsDiagnostic } from "./contracts.js"
import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceDiagnosticsResource,
  LanguageServicePacketResource,
  LanguageServiceProjectionInput,
  LanguageServiceSourceExpressionResource,
} from "./contracts.js"
import { stableTrellisLsId } from "./ids.js"
import { relativeToWorkspace, type LoadedProject } from "./project-loader.js"

export const LanguageServiceSourceExpressionSourcePath = "packages/trellis/language-service/src/source-expression.ts" as const
const sourceExpressionDiagnosticTags = ["source-expression"] as const

export interface RecipeExpressionAnalysis {
  readonly snapshot: RecipeExpressionSnapshot
  readonly targets: readonly RecipeExpressionTarget[]
  readonly diagnostics: readonly TrellisLsDiagnostic[]
  readonly oracle: RecipeExpressionOracleResult
}

interface SourceFact {
  readonly path: string
  readonly text: string
  readonly recipeDeclarations: readonly RecipeDeclarationFact[]
  readonly alchemyResources: readonly AlchemyResourceFact[]
  readonly alchemyDagEdges: readonly AlchemyDagEdgeFact[]
  readonly handlerBindings: readonly RecipeHandlerFact[]
  readonly adapterInvocationCount: number
  readonly alchemyResourceBindingCount: number
  readonly recipeModuleExportCount: number
  readonly recipeModuleImportCount: number
  readonly semanticGroupingStringSurfaceCount: number
  readonly sideEffectKind?: RecipeExpressionSideEffectKind
  readonly expressionRole: RecipeExpressionRole
  readonly imports: readonly string[]
}

interface RecipeDeclarationFact {
  readonly id: string
  readonly kind: string
  readonly role: RecipeExpressionRole
  readonly hasSchemaIo: boolean
  readonly hasAlchemyResourceIo: boolean
  readonly hasTypedHandler: boolean
  readonly hasEffectBackedHandler: boolean
  readonly hasAlchemyBinding: boolean
  readonly hasLifecycleHandler: boolean
  readonly isManaged: boolean
  readonly isProjection: boolean
  readonly dependencyIds: readonly string[]
  readonly hasAlchemyDag: boolean
  readonly stringIdSurfaceCount: number
  readonly semanticGroupingStringSurfaceCount: number
  readonly declaredSourcePath?: string
}

interface RecipeHandlerFact {
  readonly id?: string
  readonly recipeId?: string
  readonly sourcePath?: string
}

interface AlchemyResourceFact {
  readonly id: string
  readonly exportName?: string
  readonly kind?: string
  readonly owned: boolean
  readonly programmatic: boolean
  readonly requiresProgrammaticBridge: boolean
}

interface AlchemyDagEdgeFact {
  readonly fromRecipeId: string
  readonly toRecipeId: string
  readonly resourceId: string
  readonly resourceVariableName?: string
  readonly kind?: string
  readonly complete: boolean
}

interface SourceExpressionGraphContext {
  readonly dagRecipeIds: ReadonlySet<string>
  readonly dagEdges: readonly AlchemyDagEdgeFact[]
  readonly dagEdgesByPath: ReadonlyMap<string, readonly AlchemyDagEdgeFact[]>
  readonly allResourceIds: ReadonlySet<string>
  readonly recipesById: ReadonlyMap<string, RecipeDeclarationFact>
  readonly cyclicRecipeIds: ReadonlySet<string>
}

const sourceExpressionPacketFamilies = new Set([
  "trellis/source-not-in-recipe-expression-graph",
  "trellis/recipe-has-string-only-io",
  "trellis/recipe-missing-alchemy-resource-io",
  "trellis/recipe-missing-typed-handler",
  "trellis/handler-not-effect-effectful",
  "trellis/side-effect-outside-effect-requirement",
  "trellis/projection-output-not-typed-resource",
  "trellis/managed-recipe-not-alchemy-backed",
  "trellis/alchemy-resource-not-recipe-owned",
  "trellis/managed-recipe-missing-lifecycle-handler",
  "trellis/nx-target-not-recipe-invocation",
  "trellis/cli-command-not-recipe-invocation",
  "trellis/diagnostic-emitter-not-diagnostic-recipe",
  "trellis/repair-handler-not-repair-recipe",
  "trellis/observation-writer-not-observation-recipe",
  "trellis/pure-module-not-reachable-from-recipe",
  "trellis/source-file-missing-local-recipe",
  "trellis/source-file-missing-local-handler",
  "trellis/source-file-missing-recipe-module",
  "trellis/aggregate-recipe-owns-source-file",
  "trellis/package-catalog-missing-local-module",
  "trellis/recipe-handler-not-file-local",
  "trellis/recipe-handler-not-dag-bound",
  "trellis/recipe-not-in-alchemy-dag",
  "trellis/recipe-dependency-not-alchemy-dag",
  "trellis/alchemy-dag-edge-missing-resource",
  "trellis/alchemy-resource-not-programmatic",
  "trellis/nested-recipe-missing-typed-contract",
  "trellis/recipe-dag-cycle",
  "trellis/string-id-not-inferred",
  "trellis/semantic-grouping-string-authority",
])

export const isSourceExpressionPacketFamily = (code: string): boolean =>
  sourceExpressionPacketFamilies.has(code)

export const analyzeSourceExpression = (
  loaded: LoadedProject,
  input: {
    readonly packetCount?: number
    readonly missingJudgments?: number
  } = {},
): RecipeExpressionAnalysis => {
  const sourceFiles = projectAwareSourceFiles(loaded)
  const facts = sourceFiles.map((file) => sourceFactFor(loaded.workspaceRoot, file))
  const factsByPath = new Map(facts.map((fact) => [fact.path, fact]))
  const graph = sourceExpressionGraphContext(facts)
  const reachablePureModules = reachableModulesFromHandlers(loaded.workspaceRoot, factsByPath)
  const targets = facts.flatMap((fact) => expressionTargetsForFact(fact, reachablePureModules, graph))
  const diagnostics = targets.flatMap(diagnosticForTarget)
  const expressionHash = createHash("sha256")
    .update(JSON.stringify(facts.map((fact) => ({
      path: fact.path,
      role: fact.expressionRole,
      recipeIds: fact.recipeDeclarations.map((recipe) => recipe.id),
      resourceIds: fact.alchemyResources.map((resource) => resource.id),
      dagEdges: fact.alchemyDagEdges,
      handlerBindings: fact.handlerBindings,
      adapterInvocationCount: fact.adapterInvocationCount,
      alchemyResourceBindingCount: fact.alchemyResourceBindingCount,
      recipeModuleExportCount: fact.recipeModuleExportCount,
      recipeModuleImportCount: fact.recipeModuleImportCount,
      semanticGroupingStringSurfaceCount: fact.semanticGroupingStringSurfaceCount,
      sideEffectKind: fact.sideEffectKind,
    })).sort((left, right) => left.path.localeCompare(right.path))))
    .digest("hex")
  const snapshot = Schema.decodeUnknownSync(RecipeExpressionSnapshotSchema)({
    sourceSnapshotId: stableTrellisLsId("packet", [
      "recipe-expression-snapshot",
      expressionHash,
      sourceFiles.length,
    ]),
    sourceFileCount: sourceFiles.length,
    behaviorfulSourceFileCount: facts.filter(isBehaviorfulFact).length,
    recipeDeclarationCount: facts.reduce((sum, fact) => sum + fact.recipeDeclarations.length, 0),
    managedRecipeDeclarationCount: facts.reduce((sum, fact) =>
      sum + fact.recipeDeclarations.filter((recipe) => recipe.isManaged).length, 0),
    typedAlchemyResourceCount: facts.reduce((sum, fact) => sum + fact.alchemyResources.length, 0),
    handlerBindingCount: facts.reduce((sum, fact) => sum + fact.handlerBindings.length, 0),
    adapterInvocationCount: facts.reduce((sum, fact) => sum + fact.adapterInvocationCount, 0),
    alchemyResourceBindingCount: facts.reduce((sum, fact) => sum + fact.alchemyResourceBindingCount, 0),
    expressionHash,
  })
  const failingTargets = targets.filter((target) => target.missingExpressionReason !== undefined)
  const failingPaths = new Set(failingTargets.map((target) => target.path))
  const stringOnlyIoRecipes = targets.filter((target) =>
    target.missingExpressionReason === "recipe-has-string-only-io"
  ).length
  const packetCount = input.packetCount ?? diagnostics.length
  const missingJudgments = input.missingJudgments ?? (diagnostics.length === 0 && packetCount === 0 ? 0 : 1)
  const oracle = Schema.decodeUnknownSync(RecipeExpressionOracleResultSchema)({
    sourceFiles: sourceFiles.length,
    behaviorfulSourceFiles: snapshot.behaviorfulSourceFileCount,
    expressedSourceFiles: sourceFiles.length - failingPaths.size,
    unexpressedSourceFiles: failingPaths.size,
    stringOnlyIoRecipes,
    recipesMissingAlchemyResourceIo: targets.filter((target) =>
      target.missingExpressionReason === "recipe-missing-alchemy-resource-io"
    ).length + stringOnlyIoRecipes,
    recipesMissingTypedHandlers: targets.filter((target) =>
      target.missingExpressionReason === "recipe-missing-typed-handler"
    ).length,
    handlersNotEffectBacked: targets.filter((target) =>
      target.missingExpressionReason === "handler-not-effect-effectful"
    ).length,
    sideEffectsOutsideEffectRequirements: targets.filter((target) =>
      target.missingExpressionReason === "side-effect-outside-effect-requirement"
    ).length,
    projectionOutputsWithoutTypedAlchemyResources: targets.filter((target) =>
      target.missingExpressionReason === "projection-output-not-typed-resource"
    ).length,
    managedRecipesWithoutMutatingAlchemyLifecycle: targets.filter((target) =>
      target.missingExpressionReason === "managed-recipe-not-alchemy-backed"
    ).length,
    alchemyResourcesWithoutRecipeOwner: targets.filter((target) =>
      target.missingExpressionReason === "alchemy-resource-not-recipe-owned"
    ).length,
    managedRecipesMissingLifecycleHandlers: targets.filter((target) =>
      target.missingExpressionReason === "managed-recipe-missing-lifecycle-handler"
    ).length,
    adaptersNotInvokingRecipes: targets.filter((target) =>
      target.missingExpressionReason === "adapter-not-invoking-recipe"
    ).length,
    pureModulesUnreachableFromRecipe: targets.filter((target) =>
      target.missingExpressionReason === "pure-module-not-reachable-from-recipe"
    ).length,
    sourceFilesMissingLocalRecipes: targets.filter((target) =>
      target.missingExpressionReason === "source-file-missing-local-recipe"
    ).length,
    sourceFilesMissingLocalHandlers: targets.filter((target) =>
      target.missingExpressionReason === "source-file-missing-local-handler"
    ).length,
    sourceFilesMissingRecipeModules: targets.filter((target) =>
      target.missingExpressionReason === "source-file-missing-recipe-module"
    ).length,
    aggregateRecipesOwningSourceFiles: targets.filter((target) =>
      target.missingExpressionReason === "aggregate-recipe-owns-source-file"
    ).length,
    packageCatalogsMissingLocalModules: targets.filter((target) =>
      target.missingExpressionReason === "package-catalog-missing-local-module"
    ).length,
    recipeHandlersNotFileLocal: targets.filter((target) =>
      target.missingExpressionReason === "recipe-handler-not-file-local"
    ).length,
    recipeHandlersNotDagBound: targets.filter((target) =>
      target.missingExpressionReason === "recipe-handler-not-dag-bound"
    ).length,
    recipesNotInAlchemyDag: targets.filter((target) =>
      target.missingExpressionReason === "recipe-not-in-alchemy-dag"
    ).length,
    recipeDependenciesNotAlchemyDag: targets.filter((target) =>
      target.missingExpressionReason === "recipe-dependency-not-alchemy-dag"
    ).length,
    alchemyDagEdgesMissingResources: targets.filter((target) =>
      target.missingExpressionReason === "alchemy-dag-edge-missing-resource"
    ).length,
    alchemyResourcesNotProgrammatic: targets.filter((target) =>
      target.missingExpressionReason === "alchemy-resource-not-programmatic"
    ).length,
    nestedRecipesMissingTypedContracts: targets.filter((target) =>
      target.missingExpressionReason === "nested-recipe-missing-typed-contract"
    ).length,
    recipeDagCycles: targets.filter((target) =>
      target.missingExpressionReason === "recipe-dag-cycle"
    ).length,
    stringIdsNotInferred: targets.filter((target) =>
      target.missingExpressionReason === "string-id-not-inferred"
    ).length,
    semanticGroupingStringsUsedAsAuthority: targets.filter((target) =>
      target.missingExpressionReason === "semantic-grouping-string-authority"
    ).length,
    missingJudgments,
    packetCount,
    promotionAllowed: failingTargets.length === 0 && missingJudgments === 0 && packetCount === 0,
  })
  return { snapshot, targets, diagnostics, oracle }
}

const projectAwareSourceFiles = (loaded: LoadedProject): readonly string[] => {
  const trackedFiles = gitTrackedFileSet(loaded.workspaceRoot)
  const fromLoadedProgram = loaded.program?.getSourceFiles().map((file) => file.fileName) ?? []
  const workspacePath = loaded.workspacePath ?? loaded.workspaceRoot
  const fromPackageConfigs = tsconfigPaths(workspacePath).flatMap(sourceFilesFromTsconfig)
  const candidates = fromPackageConfigs.length > 0
    ? [...fromPackageConfigs, ...fromLoadedProgram, ...loaded.fileNames]
    : [...fromLoadedProgram, ...loaded.fileNames]
  return uniqueStrings(candidates)
    .filter((file) => file.startsWith(loaded.workspaceRoot))
    .filter((file) => /\.[cm]?tsx?$/u.test(file) && !file.endsWith(".d.ts"))
    .filter((file) =>
      !isIgnoredSourcePath(relativeToWorkspace(loaded.workspaceRoot, file), trackedFiles)
    )
    .sort((left, right) => left.localeCompare(right))
}

const gitTrackedFileSet = (workspaceRoot: string): ReadonlySet<string> | undefined => {
  const result = childProcess.spawnSync("git", ["-C", workspaceRoot, "ls-files", "-z"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
  if (result.error !== undefined || result.status !== 0) return undefined
  return new Set(
    result.stdout
      .split("\0")
      .filter(Boolean)
      .map((file) => file.replaceAll(path.sep, "/")),
  )
}

const sourceFilesFromTsconfig = (tsconfigPath: string): readonly string[] => {
  const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  if (config.error !== undefined) return []
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(tsconfigPath))
  return parsed.fileNames
}

const sourceFactFor = (workspaceRoot: string, file: string): SourceFact => {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
  const codeText = codeSearchTextFor(text)
  const relativePath = relativeToWorkspace(workspaceRoot, file)
  const constStrings = new Map([
    ...importedConstStringVariableValuesFor(workspaceRoot, relativePath, text, codeText),
    ...constStringVariableValuesFor(text, codeText),
  ])
  const recipeDeclarations = recipeDeclarationsFor(text, constStrings, codeText, {
    ignoreNonExportedTestFixtures: isTestLikePath(relativePath),
  })
  const alchemyResources = alchemyResourcesFor(text, codeText)
  const alchemyDagEdges = alchemyDagEdgesFor(text, constStrings, codeText)
  const handlerBindings = handlerBindingsFor(text, constStrings, codeText)
  const adapterInvocationCount = adapterInvocationCountFor(relativePath, codeText)
  const alchemyResourceBindingCount = countCodeMatches(text, codeText, /\bdefineManagedRecipeAlchemyBinding\s*\(/gu) +
    countCodeMatches(text, codeText, /\balchemy\s*:/gu)
  const recipeModuleExportCount = recipeModuleExportCountFor(text, codeText)
  const recipeModuleImportCount = recipeModuleImportCountFor(text, codeText)
  const semanticGroupingStringSurfaceCount = isTestLikePath(relativePath)
    ? 0
    : semanticGroupingStringAuthorityCount(text, codeText)
  const sideEffectKind = sideEffectKindFor(text)
  const imports = relativeImportsFor(text)
  const expressionRole = expressionRoleFor({
    path: relativePath,
    text,
    recipeDeclarations,
    alchemyResources,
    alchemyDagEdges,
    handlerBindings,
    adapterInvocationCount,
    alchemyResourceBindingCount,
    recipeModuleExportCount,
    recipeModuleImportCount,
    semanticGroupingStringSurfaceCount,
    ...(sideEffectKind === undefined ? {} : { sideEffectKind }),
  })
  return {
    path: relativePath,
    text,
    recipeDeclarations,
    alchemyResources,
    alchemyDagEdges,
    handlerBindings,
    adapterInvocationCount,
    alchemyResourceBindingCount,
    recipeModuleExportCount,
    recipeModuleImportCount,
    semanticGroupingStringSurfaceCount,
    ...(sideEffectKind === undefined ? {} : { sideEffectKind }),
    expressionRole,
    imports,
  }
}

const recipeDeclarationsFor = (
  text: string,
  constStrings: ReadonlyMap<string, string> = constStringVariableValuesFor(text),
  searchText: string = codeSearchTextFor(text),
  options: {
    readonly ignoreNonExportedTestFixtures?: boolean
  } = {},
): readonly RecipeDeclarationFact[] => {
  const declarations: RecipeDeclarationFact[] = []
  const effectBackedHandlerFactories = effectBackedHandlerFactoryNamesFor(text, searchText)
  const pattern = /\bdefine(?<kind>ExternalSchemaManaged|ExternalSchema|ManagedExecutable|Managed|Projection|Diagnostic|Repair|Observation|Invocation|Judge|Documentation|Toolchain|Config|OpenSpecChange|Test|Runtime|Schema|Asset)?Recipe\b\s*(?:<[\s\S]*?>)?\s*\(/gu
  for (const match of searchText.matchAll(pattern)) {
    if (
      options.ignoreNonExportedTestFixtures === true &&
      !isExportedRecipeDeclaration(searchText, match.index ?? 0)
    ) {
      continue
    }
    const openBrace = searchText.indexOf("{", (match.index ?? 0) + match[0].length)
    if (openBrace < 0) continue
    const segment = balancedSegment(text, openBrace, "{", "}")
    if (segment === undefined) continue
    const body = segment.body
    const id = constStrings.get(identifierProperty(body, "id") ?? "") ??
      stringProperty(body, "id") ??
      `anonymous:${declarations.length}`
    const kind = match.groups?.kind ?? "Plain"
    const hasTypedHandler = /\bhandler\s*:/u.test(body)
    const handlerFactoryName = identifierProperty(body, "handler")
    const dependencyIds = stringOrConstPropertiesInArrayProperty(body, "dependencies", "recipeId", constStrings)
    const hasAlchemyDag = /\balchemyDag\s*:/u.test(body)
    const declaredSourcePath = stringProperty(body, "sourcePath")
    declarations.push({
      id,
      kind,
      role: recipeRoleForDefineKind(kind, id, body),
      hasSchemaIo: /\binputSchema\s*:/u.test(body) || /\boutputSchema\s*:/u.test(body),
      hasAlchemyResourceIo: /\bio\s*:/u.test(body) &&
        /\binputResources\s*:/u.test(body) &&
        /\boutputResources\s*:/u.test(body),
      hasTypedHandler,
      hasEffectBackedHandler: !hasTypedHandler ||
        /\bdefineRecipeHandler\s*(?:<|\()/u.test(body) ||
        /\bEffect\./u.test(body) ||
        effectBackedHandlerFactories.has(handlerFactoryName ?? ""),
      hasAlchemyBinding: /\balchemy\s*:/u.test(body) || /\bdefineManagedRecipeAlchemyBinding\s*\(/u.test(body),
      hasLifecycleHandler: /\blifecycle\s*:/u.test(body),
      isManaged: /Managed/u.test(kind),
      isProjection: kind === "Projection" || /projection|generated|generate/iu.test(id),
      dependencyIds,
      hasAlchemyDag,
      stringIdSurfaceCount: authoredIdentityStringCount(body),
      semanticGroupingStringSurfaceCount: semanticGroupingStringAuthorityCount(body),
      ...(declaredSourcePath === undefined ? {} : { declaredSourcePath }),
    })
  }
  return declarations
}

const alchemyResourcesFor = (
  text: string,
  searchText: string = codeSearchTextFor(text),
): readonly AlchemyResourceFact[] => {
  const resources: AlchemyResourceFact[] = []
  const pattern = /\b(?:(?:export\s+)?const\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*)?defineAlchemyResource\s*\(/gu
  for (const match of searchText.matchAll(pattern)) {
    const openBrace = searchText.indexOf("{", (match.index ?? 0) + match[0].length)
    if (openBrace < 0) continue
    const segment = balancedSegment(text, openBrace, "{", "}")
    if (segment === undefined) continue
    const body = segment.body
    const kind = stringProperty(body, "kind")
    const exportName = match.groups?.name
    resources.push({
      id: stringProperty(body, "id") ?? `anonymous-resource:${resources.length}`,
      ...(exportName === undefined ? {} : { exportName }),
      ...(kind === undefined ? {} : { kind }),
      owned: /\bownerRecipeId\s*:/u.test(body) || /\bproducedBy\s*:/u.test(body) || /\bconsumedBy\s*:/u.test(body),
      programmatic: /\bprogrammatic(?:Resource|Provider|Bridge)\w*\s*:|\bResource\s*\(|\bProvider\.|\bprovider\s*:/u.test(body),
      requiresProgrammaticBridge: kind === undefined ? false : statefulAlchemyResourceKinds.has(kind),
    })
  }
  return resources
}

const alchemyDagEdgesFor = (
  text: string,
  constStrings: ReadonlyMap<string, string> = constStringVariableValuesFor(text),
  searchText: string = codeSearchTextFor(text),
): readonly AlchemyDagEdgeFact[] => {
  const edges: AlchemyDagEdgeFact[] = []
  const resourceIdsByVariableName = alchemyResourceVariableIdsFor(text, searchText)
  const edgeBodies = [
    ...functionObjectBodiesFor(text, "defineAlchemyRecipeDagEdge", searchText),
    ...arrayPropertyObjectBodiesFor(text, "alchemyDag", searchText),
  ]
  for (const body of edgeBodies) {
    const fromRecipeId = stringProperty(body, "fromRecipeId") ??
      stringProperty(body, "parentRecipeId") ??
      constStrings.get(identifierProperty(body, "fromRecipeId") ?? "") ??
      constStrings.get(identifierProperty(body, "parentRecipeId") ?? "")
    const toRecipeId = stringProperty(body, "toRecipeId") ??
      stringProperty(body, "childRecipeId") ??
      constStrings.get(identifierProperty(body, "toRecipeId") ?? "") ??
      constStrings.get(identifierProperty(body, "childRecipeId") ?? "")
    const resourceVariableName = identifierProperty(body, "resource")
    const resourceId = stringProperty(body, "resourceId") ??
      stringProperty(body, "resource") ??
      resourceIdsByVariableName.get(resourceVariableName ?? "")
    if (fromRecipeId === undefined || toRecipeId === undefined || resourceId === undefined) {
      edges.push({
        fromRecipeId: fromRecipeId ?? "unknown-source-recipe",
        toRecipeId: toRecipeId ?? "unknown-target-recipe",
        resourceId: resourceId ?? "unknown-resource",
        ...(resourceVariableName === undefined ? {} : { resourceVariableName }),
        complete: false,
      })
      continue
    }
    const kind = stringProperty(body, "kind")
    edges.push({
      fromRecipeId,
      toRecipeId,
      resourceId,
      ...(resourceVariableName === undefined ? {} : { resourceVariableName }),
      ...(kind === undefined ? {} : { kind }),
      complete: true,
    })
  }
  return edges
}

const expressionTargetsForFact = (
  fact: SourceFact,
  reachablePureModules: ReadonlySet<string>,
  graph: SourceExpressionGraphContext,
): readonly RecipeExpressionTarget[] => {
  const targets: RecipeExpressionTarget[] = []
  for (const recipe of fact.recipeDeclarations) {
    if (isPackageRecipeCatalogPath(fact.path)) {
      targets.push(targetFor(fact, {
        role: recipe.role,
        expectedExpressionKind: "Thin recipe catalog importing file-local recipe modules",
        currentRecipeId: recipe.id,
        reason: "aggregate-recipe-owns-source-file",
      }))
    }
    if (!graph.dagRecipeIds.has(recipe.id)) {
      targets.push(targetFor(fact, {
        role: recipe.role,
        expectedExpressionKind: "Alchemy recipe DAG node",
        currentRecipeId: recipe.id,
        reason: "recipe-not-in-alchemy-dag",
      }))
    }
    for (const dependencyId of recipe.dependencyIds) {
      if (!graph.dagEdges.some((edge) =>
        edge.fromRecipeId === recipe.id && edge.toRecipeId === dependencyId
      )) {
        targets.push(targetFor(fact, {
          role: recipe.role,
          expectedExpressionKind: "Alchemy DAG edge for recipe dependency",
          currentRecipeId: recipe.id,
          resourceId: dependencyId,
          reason: "recipe-dependency-not-alchemy-dag",
        }))
      }
    }
    if (graph.cyclicRecipeIds.has(recipe.id)) {
      targets.push(targetFor(fact, {
        role: recipe.role,
        expectedExpressionKind: "Acyclic Alchemy recipe DAG",
        currentRecipeId: recipe.id,
        reason: "recipe-dag-cycle",
      }))
    }
    if (recipe.stringIdSurfaceCount > 2) {
      targets.push(targetFor(fact, {
        role: recipe.role,
        expectedExpressionKind: "Typed handles and inferred stable IDs",
        currentRecipeId: recipe.id,
        reason: "string-id-not-inferred",
      }))
    }
    if (recipe.semanticGroupingStringSurfaceCount > 0) {
      targets.push(targetFor(fact, {
        role: recipe.role,
        expectedExpressionKind: "Inferred grouping from typed resources, Effect requirements, Layers, and DAG edges",
        currentRecipeId: recipe.id,
        reason: "semantic-grouping-string-authority",
      }))
    }
    if (!recipe.hasAlchemyResourceIo) {
      targets.push(targetFor(fact, {
        role: recipe.role,
        expectedExpressionKind: "TypedAlchemyResourceIo",
        currentRecipeId: recipe.id,
        reason: recipe.hasSchemaIo ? "recipe-has-string-only-io" : "recipe-missing-alchemy-resource-io",
      }))
    }
    const hasEffectBackedHandler = recipe.hasEffectBackedHandler ||
      fact.handlerBindings.some((handler) =>
        handler.recipeId === recipe.id &&
        (hasLayerBackedHandler(fact) || /\bEffect\./u.test(fact.text))
      )
    if (!recipe.hasTypedHandler) {
      targets.push(targetFor(fact, {
        role: recipe.role,
        expectedExpressionKind: "RecipeHandlerBinding",
        currentRecipeId: recipe.id,
        reason: "recipe-missing-typed-handler",
      }))
    } else if (!hasEffectBackedHandler) {
      targets.push(targetFor(fact, {
        role: recipe.role,
        expectedExpressionKind: "Effect.Effect handler",
        currentRecipeId: recipe.id,
        reason: "handler-not-effect-effectful",
      }))
    }
    if (recipe.isProjection && !recipe.hasAlchemyResourceIo) {
      targets.push(targetFor(fact, {
        role: "projection-handler",
        expectedExpressionKind: "ProjectionRecipe output Alchemy resource",
        currentRecipeId: recipe.id,
        reason: "projection-output-not-typed-resource",
      }))
    }
    if (recipe.isManaged && !recipe.hasAlchemyBinding) {
      targets.push(targetFor(fact, {
        role: "managed-resource",
        expectedExpressionKind: "AlchemyManagedResourceBinding",
        currentRecipeId: recipe.id,
        reason: "managed-recipe-not-alchemy-backed",
      }))
    }
    if (recipe.isManaged && !recipe.hasLifecycleHandler) {
      targets.push(targetFor(fact, {
        role: "managed-resource",
        expectedExpressionKind: "ManagedRecipe lifecycle handler map",
        currentRecipeId: recipe.id,
        reason: "managed-recipe-missing-lifecycle-handler",
      }))
    }
  }
  if (
    fact.semanticGroupingStringSurfaceCount > 0 &&
    fact.recipeDeclarations.every((recipe) => recipe.semanticGroupingStringSurfaceCount === 0)
  ) {
    targets.push(targetFor(fact, {
      role: fact.expressionRole,
      expectedExpressionKind: "Inferred grouping from typed resources, Effect requirements, Layers, and DAG edges",
      reason: "semantic-grouping-string-authority",
    }))
  }
  for (const handler of fact.handlerBindings) {
    if (handler.sourcePath !== undefined && handler.sourcePath !== fact.path) {
      targets.push(targetFor(fact, {
        role: handlerRoleForPath(handler.sourcePath),
        expectedExpressionKind: "RecipeHandler declared in the source file it executes",
        ...(handler.recipeId === undefined ? {} : { currentRecipeId: handler.recipeId }),
        handlerId: handler.id ?? handler.sourcePath,
        reason: "recipe-handler-not-file-local",
      }))
    }
    if (handler.recipeId !== undefined && !graph.dagRecipeIds.has(handler.recipeId)) {
      targets.push(targetFor(fact, {
        role: handlerRoleForPath(fact.path),
        expectedExpressionKind: "RecipeHandler bound to a recipe node in the Alchemy DAG",
        currentRecipeId: handler.recipeId,
        handlerId: handler.id ?? `${handler.recipeId}.handler`,
        reason: "recipe-handler-not-dag-bound",
      }))
    }
  }
  for (const edge of graph.dagEdgesByPath.get(fact.path) ?? fact.alchemyDagEdges) {
    if (!edge.complete || !graph.allResourceIds.has(edge.resourceId)) {
      targets.push(targetFor(fact, {
        role: "recipe-declaration",
        expectedExpressionKind: "Alchemy DAG edge resource contract",
        currentRecipeId: edge.fromRecipeId,
        alchemyResourceId: edge.resourceId,
        reason: "alchemy-dag-edge-missing-resource",
      }))
    }
    const child = graph.recipesById.get(edge.toRecipeId)
    if (child === undefined || !child.hasAlchemyResourceIo || !child.hasTypedHandler) {
      targets.push(targetFor(fact, {
        role: "recipe-declaration",
        expectedExpressionKind: "Nested recipe with typed Alchemy I/O and Effect handler",
        currentRecipeId: edge.toRecipeId,
        alchemyResourceId: edge.resourceId,
        reason: "nested-recipe-missing-typed-contract",
      }))
    }
  }
  for (const resource of fact.alchemyResources) {
    if (!resource.owned) {
      targets.push(targetFor(fact, {
        role: "typed-resource",
        expectedExpressionKind: "Recipe-owned Alchemy resource",
        alchemyResourceId: resource.id,
        reason: "alchemy-resource-not-recipe-owned",
      }))
    }
    if (resource.requiresProgrammaticBridge && !resource.programmatic) {
      targets.push(targetFor(fact, {
        role: "alchemy-provider",
        expectedExpressionKind: "Programmatic Effect Alchemy resource/provider bridge",
        alchemyResourceId: resource.id,
        reason: "alchemy-resource-not-programmatic",
      }))
    }
  }
  if (fact.sideEffectKind !== undefined && !hasLayerBackedHandler(fact) && !isTestLikePath(fact.path)) {
    targets.push(targetFor(fact, {
      role: "side-effect-surface",
      expectedExpressionKind: "Effect service requirement supplied by Layer or ManagedRecipe lifecycle",
      sideEffectKind: fact.sideEffectKind,
      reason: "side-effect-outside-effect-requirement",
    }))
  }
  if (
    fact.adapterInvocationCount > 0 &&
    !isTestLikePath(fact.path) &&
    !/\bRecipeInvocation\b|\bmakeRecipeInvocation\b|\binvokeRecipe\b/u.test(fact.text)
  ) {
    targets.push(targetFor(fact, {
      role: "invocation-adapter",
      expectedExpressionKind: "RecipeInvocation adapter",
      reason: "adapter-not-invoking-recipe",
    }))
  }
  if (
    fact.expressionRole === "pure-implementation" &&
    !isThinRecipeCatalog(fact) &&
    !reachablePureModules.has(fact.path) &&
    !isTestLikePath(fact.path) &&
    !isToolingConfigPath(fact.path)
  ) {
    targets.push(targetFor(fact, {
      role: "pure-implementation",
      expectedExpressionKind: "Reachable pure module from typed recipe handler",
      reason: "pure-module-not-reachable-from-recipe",
    }))
  }
  if (isMeaningfulLocalRecipeSourceFile(fact) && !hasLocalRecipeExpression(fact)) {
    targets.push(targetFor(fact, {
      role: fact.expressionRole,
      expectedExpressionKind: "File-local Recipe or RecipeHandler expression",
      reason: "source-file-missing-local-recipe",
    }))
  }
  if (isMeaningfulLocalRecipeSourceFile(fact) && !hasLocalHandlerExpression(fact)) {
    targets.push(targetFor(fact, {
      role: fact.expressionRole,
      expectedExpressionKind: "File-local typed Effect RecipeHandler binding",
      reason: "source-file-missing-local-handler",
    }))
  }
  if (isMeaningfulLocalRecipeSourceFile(fact) && !hasFileLocalRecipeModuleExpression(fact)) {
    targets.push(targetFor(fact, {
      role: fact.expressionRole,
      expectedExpressionKind: "File-local recipe module export consumed by package catalog",
      reason: "source-file-missing-recipe-module",
    }))
  }
  if (isPackageRecipeCatalogPath(fact.path) && fact.recipeModuleImportCount === 0) {
    targets.push(targetFor(fact, {
      role: "recipe-declaration",
      expectedExpressionKind: "Package catalog importing file-local recipe modules",
      reason: "package-catalog-missing-local-module",
    }))
  }
  if (targets.length === 0) {
    targets.push(targetFor(fact, {
      role: fact.expressionRole,
      expectedExpressionKind: "Recipe expression graph node",
    }))
  }
  return targets
}

const targetFor = (
  fact: SourceFact,
  input: {
    readonly role: RecipeExpressionRole
    readonly expectedExpressionKind: string
    readonly currentRecipeId?: string
    readonly handlerId?: string
    readonly resourceId?: string
    readonly alchemyResourceId?: string
    readonly sideEffectKind?: RecipeExpressionSideEffectKind
    readonly reason?: RecipeExpressionTargetMissingReason
  },
): RecipeExpressionTarget => ({
  path: fact.path,
  expressionRole: input.role,
  expectedExpressionKind: input.expectedExpressionKind,
  ...(input.currentRecipeId === undefined ? {} : { currentRecipeId: input.currentRecipeId }),
  ...(input.handlerId === undefined ? {} : { handlerId: input.handlerId }),
  ...(input.resourceId === undefined ? {} : { resourceId: input.resourceId }),
  ...(input.alchemyResourceId === undefined ? {} : { alchemyResourceId: input.alchemyResourceId }),
  ...(input.reason === undefined ? {} : { missingExpressionReason: input.reason }),
  ...(input.sideEffectKind === undefined ? {} : { sideEffectKind: input.sideEffectKind }),
  recipeReachability: fact.expressionRole === "external/quarantined" ? "external" : "unknown",
  repairability: input.reason === undefined ? "deterministic" : "guided",
  risk: input.sideEffectKind === undefined ? "needs-review" : "manual",
})

const diagnosticForTarget = (target: RecipeExpressionTarget): readonly TrellisLsDiagnostic[] => {
  if (target.missingExpressionReason === undefined) return []
  const code = diagnosticCodeForMissingReason(target)
  const repairRecipeId = `trellis-language-service.source-expression.${code.replace(/^trellis\//u, "").replace(/[^A-Za-z0-9._:-]+/gu, "-")}`
  const packageRootId = packageRootForFile(target.path)
  const validationTarget = "workspace:packetized-architecture-judge"
  const blastRadius = packageRootId.startsWith("packages/") ? "package" : "workspace"
  const packetLevel = sourceExpressionPacketLevelForTarget(target)
  const packetGroup = sourceExpressionPacketGroupForTarget({
    target,
    packageRootId,
    repairRecipeId,
    validationTarget,
    blastRadius,
  })
  return [{
    id: stableTrellisLsId("diag", [
      "trellis",
      code,
      target.path,
      target.expressionRole,
      target.expectedExpressionKind,
      target.currentRecipeId ?? target.resourceId ?? target.alchemyResourceId ?? "",
      target.sideEffectKind ?? "",
    ]),
    source: "trellis",
    code,
    severity: target.risk === "manual" || target.risk === "unsafe" ? "error" : "warning",
    message: `${target.path} is not fully expressed in the typed Recipe/ManagedRecipe graph: ${target.expectedExpressionKind}.`,
    file: target.path,
    repairIds: [],
    tags: [
      ...sourceExpressionDiagnosticTags,
      `package-root:${packageRootId}`,
      `expression-role:${target.expressionRole}`,
      `expected-expression:${target.expectedExpressionKind}`,
      ...(target.currentRecipeId === undefined ? [] : [`recipe-id:${target.currentRecipeId}`]),
      ...(target.handlerId === undefined ? [] : [`handler-id:${target.handlerId}`]),
      ...(target.resourceId === undefined ? [] : [`resource-id:${target.resourceId}`]),
      ...(target.alchemyResourceId === undefined ? [] : [`alchemy-resource-id:${target.alchemyResourceId}`]),
      ...(target.sideEffectKind === undefined ? [] : [`side-effect-kind:${target.sideEffectKind}`]),
      `missing-reason:${target.missingExpressionReason}`,
      `packet-level:${packetLevel}`,
      `repair-recipe:${repairRecipeId}`,
      `validation-target:${validationTarget}`,
      `risk:${target.risk}`,
      `blast-radius:${blastRadius}`,
      `packet-group:${packetGroup}`,
    ],
  }]
}

const sourceExpressionPacketLevelForTarget = (target: RecipeExpressionTarget): string => {
  switch (target.missingExpressionReason) {
    case "source-file-missing-local-recipe":
    case "source-file-missing-local-handler":
    case "source-file-missing-recipe-module":
    case "aggregate-recipe-owns-source-file":
    case "package-catalog-missing-local-module":
      return "level-1-file-local-module"
    case "recipe-not-in-alchemy-dag":
    case "recipe-dependency-not-alchemy-dag":
    case "alchemy-dag-edge-missing-resource":
    case "nested-recipe-missing-typed-contract":
    case "recipe-handler-not-dag-bound":
    case "recipe-dag-cycle":
      return "level-2-recipe-dag"
    case "semantic-grouping-string-authority":
    case "string-id-not-inferred":
      return "level-2-typed-inference"
    case "manual-review":
      return "level-3-residual-manual"
    default:
      return "level-2-role-expression"
  }
}

const sourceExpressionPacketGroupForTarget = (input: {
  readonly target: RecipeExpressionTarget
  readonly packageRootId: string
  readonly repairRecipeId: string
  readonly validationTarget: string
  readonly blastRadius: "package" | "workspace"
}): string => [
  input.packageRootId,
  sourceExpressionPacketLevelForTarget(input.target),
  input.target.expressionRole,
  input.target.missingExpressionReason ?? "accounted",
  input.target.currentRecipeId ?? "inferred-recipe",
  input.target.handlerId ?? "inferred-handler",
  input.target.resourceId ?? input.target.alchemyResourceId ?? input.target.sideEffectKind ?? "inferred-resource",
  input.repairRecipeId,
  input.validationTarget,
  input.target.risk,
  input.blastRadius,
].join("|")

const diagnosticCodeForMissingReason = (target: RecipeExpressionTarget): string => {
  switch (target.missingExpressionReason) {
    case "not-in-recipe-expression-graph":
      return "trellis/source-not-in-recipe-expression-graph"
    case "recipe-has-string-only-io":
      return "trellis/recipe-has-string-only-io"
    case "recipe-missing-alchemy-resource-io":
      return "trellis/recipe-missing-alchemy-resource-io"
    case "recipe-missing-typed-handler":
      return "trellis/recipe-missing-typed-handler"
    case "handler-not-effect-effectful":
      return "trellis/handler-not-effect-effectful"
    case "side-effect-outside-effect-requirement":
      return "trellis/side-effect-outside-effect-requirement"
    case "projection-output-not-typed-resource":
      return "trellis/projection-output-not-typed-resource"
    case "managed-recipe-not-alchemy-backed":
      return "trellis/managed-recipe-not-alchemy-backed"
    case "alchemy-resource-not-recipe-owned":
      return "trellis/alchemy-resource-not-recipe-owned"
    case "managed-recipe-missing-lifecycle-handler":
      return "trellis/managed-recipe-missing-lifecycle-handler"
    case "adapter-not-invoking-recipe":
      return target.path.endsWith("/cli.ts")
        ? "trellis/cli-command-not-recipe-invocation"
        : "trellis/nx-target-not-recipe-invocation"
    case "pure-module-not-reachable-from-recipe":
      return "trellis/pure-module-not-reachable-from-recipe"
    case "source-file-missing-local-recipe":
      return "trellis/source-file-missing-local-recipe"
    case "source-file-missing-local-handler":
      return "trellis/source-file-missing-local-handler"
    case "source-file-missing-recipe-module":
      return "trellis/source-file-missing-recipe-module"
    case "aggregate-recipe-owns-source-file":
      return "trellis/aggregate-recipe-owns-source-file"
    case "package-catalog-missing-local-module":
      return "trellis/package-catalog-missing-local-module"
    case "recipe-handler-not-file-local":
      return "trellis/recipe-handler-not-file-local"
    case "recipe-handler-not-dag-bound":
      return "trellis/recipe-handler-not-dag-bound"
    case "recipe-not-in-alchemy-dag":
      return "trellis/recipe-not-in-alchemy-dag"
    case "recipe-dependency-not-alchemy-dag":
      return "trellis/recipe-dependency-not-alchemy-dag"
    case "alchemy-dag-edge-missing-resource":
      return "trellis/alchemy-dag-edge-missing-resource"
    case "alchemy-resource-not-programmatic":
      return "trellis/alchemy-resource-not-programmatic"
    case "nested-recipe-missing-typed-contract":
      return "trellis/nested-recipe-missing-typed-contract"
    case "recipe-dag-cycle":
      return "trellis/recipe-dag-cycle"
    case "string-id-not-inferred":
      return "trellis/string-id-not-inferred"
    case "semantic-grouping-string-authority":
      return "trellis/semantic-grouping-string-authority"
    case "manual-review":
      return "trellis/source-not-in-recipe-expression-graph"
    default:
      return "trellis/source-not-in-recipe-expression-graph"
  }
}

const sourceExpressionGraphContext = (
  facts: readonly SourceFact[],
): SourceExpressionGraphContext => {
  const allResourceIds = new Set(facts.flatMap((fact) => fact.alchemyResources.map((resource) => resource.id)))
  const resourceIdByExportName = new Map(
    facts.flatMap((fact) =>
      fact.alchemyResources.flatMap((resource) =>
        resource.exportName === undefined ? [] : [[resource.exportName, resource.id] as const]
      )
    ),
  )
  const resolveEdge = (edge: AlchemyDagEdgeFact): AlchemyDagEdgeFact => {
    if (allResourceIds.has(edge.resourceId)) return edge
    const resourceId = edge.resourceVariableName === undefined
      ? undefined
      : resourceIdByExportName.get(edge.resourceVariableName)
    if (resourceId === undefined) return edge
    return {
      ...edge,
      resourceId,
      complete: edge.fromRecipeId !== "unknown-source-recipe" &&
        edge.toRecipeId !== "unknown-target-recipe",
    }
  }
  const dagEdgesByPath = new Map(facts.map((fact) => [
    fact.path,
    fact.alchemyDagEdges.map(resolveEdge),
  ] as const))
  const dagEdges = [...dagEdgesByPath.values()].flat()
  const recipes = facts.flatMap((fact) => fact.recipeDeclarations)
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  const dagRecipeIds = new Set<string>()
  for (const edge of dagEdges) {
    dagRecipeIds.add(edge.fromRecipeId)
    dagRecipeIds.add(edge.toRecipeId)
  }
  const cyclicRecipeIds = cyclicRecipeIdsFor(dagEdges)
  return {
    dagRecipeIds,
    dagEdges,
    dagEdgesByPath,
    allResourceIds,
    recipesById,
    cyclicRecipeIds,
  }
}

const cyclicRecipeIdsFor = (
  edges: readonly AlchemyDagEdgeFact[],
): ReadonlySet<string> => {
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    adjacency.set(edge.fromRecipeId, [...(adjacency.get(edge.fromRecipeId) ?? []), edge.toRecipeId])
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const cyclic = new Set<string>()
  const visit = (recipeId: string, stack: readonly string[]): void => {
    if (visiting.has(recipeId)) {
      for (const item of stack.slice(stack.indexOf(recipeId))) cyclic.add(item)
      cyclic.add(recipeId)
      return
    }
    if (visited.has(recipeId)) return
    visiting.add(recipeId)
    for (const next of adjacency.get(recipeId) ?? []) visit(next, [...stack, recipeId])
    visiting.delete(recipeId)
    visited.add(recipeId)
  }
  for (const recipeId of adjacency.keys()) visit(recipeId, [])
  return cyclic
}

const reachableModulesFromHandlers = (
  workspaceRoot: string,
  factsByPath: ReadonlyMap<string, SourceFact>,
): ReadonlySet<string> => {
  const roots = [...factsByPath.values()]
    .filter((fact) => fact.handlerBindings.length > 0 || /\bhandler\s*:/u.test(fact.text))
    .map((fact) => fact.path)
  const reachable = new Set<string>(roots)
  const queue = [...roots]
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) continue
    const fact = factsByPath.get(current)
    if (fact === undefined) continue
    for (const specifier of fact.imports) {
      const resolved = resolveRelativeImport(workspaceRoot, current, specifier)
      if (resolved === undefined || reachable.has(resolved) || !factsByPath.has(resolved)) continue
      reachable.add(resolved)
      queue.push(resolved)
    }
  }
  return reachable
}

const expressionRoleFor = (input: {
  readonly path: string
  readonly text: string
  readonly recipeDeclarations: readonly RecipeDeclarationFact[]
  readonly alchemyResources: readonly AlchemyResourceFact[]
  readonly alchemyDagEdges: readonly AlchemyDagEdgeFact[]
  readonly handlerBindings: readonly RecipeHandlerFact[]
  readonly adapterInvocationCount: number
  readonly alchemyResourceBindingCount: number
  readonly recipeModuleExportCount: number
  readonly recipeModuleImportCount: number
  readonly semanticGroupingStringSurfaceCount: number
  readonly sideEffectKind?: RecipeExpressionSideEffectKind
}): RecipeExpressionRole => {
  if (isIgnoredSourcePath(input.path)) return "external/quarantined"
  if (input.alchemyResourceBindingCount > 0) return "managed-resource"
  if (input.alchemyResources.length > 0) return "typed-resource"
  if (input.handlerBindings.length > 0) return handlerRoleForPath(input.path)
  if (input.recipeDeclarations.length > 0) return "recipe-declaration"
  if (input.adapterInvocationCount > 0) return "invocation-adapter"
  if (input.sideEffectKind !== undefined) return "side-effect-surface"
  return "pure-implementation"
}

const handlerRoleForPath = (file: string): RecipeExpressionRole => {
  if (/projection|generated|generate/iu.test(file)) return "projection-handler"
  if (/diagnostic/iu.test(file)) return "diagnostic-handler"
  if (/repair/iu.test(file)) return "repair-handler"
  if (/observation|receipt/iu.test(file)) return "observation-handler"
  return "recipe-handler"
}

const recipeRoleForDefineKind = (kind: string | undefined, id: string, body: string): RecipeExpressionRole => {
  switch (kind) {
    case "Managed":
    case "ManagedExecutable":
    case "ExternalSchemaManaged":
      return "managed-resource"
    case "Projection":
    case "ExternalSchema":
      return "projection-handler"
    case "Diagnostic":
      return "diagnostic-handler"
    case "Repair":
      return "repair-handler"
    case "Observation":
      return "observation-handler"
    case "Invocation":
      return "invocation-adapter"
    default:
      if (/managed|lifecycle|alchemy|provider/iu.test(`${id}\n${body}`)) return "managed-resource"
      if (/projection|generated|generate/iu.test(`${id}\n${body}`)) return "projection-handler"
      return "recipe-declaration"
  }
}

const sideEffectKindFor = (text: string): RecipeExpressionSideEffectKind | undefined => {
  const code = codeSurfaceForSideEffectScan(text)
  if (/\bfrom\s+["']node:fs|["']fs\/promises["']|["']fs["']|\bfs\./u.test(text) || /\bfs\./u.test(code)) {
    return "filesystem"
  }
  if (/\bfrom\s+["']node:child_process/u.test(text) || /childProcess\.|execa|spawnSync|execFileSync/u.test(code)) {
    return "process"
  }
  if (
    /\bfrom\s+["'](?:node:)?https?["']/u.test(text) ||
    /\brequire\s*\(\s*["'](?:node:)?https?["']\s*\)/u.test(code) ||
    /\bfetch\s*\(/u.test(code)
  ) return "network"
  if (
    /\bfrom\s+["'](?:pg|postgres|kysely|drizzle)(?:["'/])/u.test(text) ||
    /\brequire\s*\(\s*["'](?:pg|postgres|kysely|drizzle)(?:["'/])/u.test(code) ||
    /sql`/iu.test(text)
  ) return "database"
  if (
    /\bfrom\s+["'](?:@kubernetes\/client-node|kubernetes-client)(?:["'/])/u.test(text) ||
    /KubeConfig|CustomObjectsApi|CoreV1Api|AppsV1Api|BatchV1Api|NetworkingV1Api/u.test(code)
  ) return "kubernetes"
  if (/\bfrom\s+["']alchemy(?:["'/])|\bimport\s*\(\s*["']alchemy(?:["'/])/u.test(text) || /Alchemy\./u.test(code)) {
    return "provider"
  }
  if (/worker_threads|new\s+Worker\b/u.test(code)) return "worker"
  if (/scheduler|cron|setInterval|setTimeout/u.test(code)) return "scheduler"
  return undefined
}

const codeSurfaceForSideEffectScan = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/.*$/gmu, "")
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gu, "")

const statefulAlchemyResourceKinds = new Set([
  "generated-directory",
  "workflow-target",
  "nx-target",
  "database",
  "runtime-sql",
  "kubernetes-object-set",
  "external-service",
])

const hasLayerBackedHandler = (fact: SourceFact): boolean =>
  fact.handlerBindings.length > 0 &&
  (/\bdefineRecipeLayer\s*\(/u.test(fact.text) ||
    /\bLayer\./u.test(fact.text) ||
    /\bprovides\s*:/u.test(fact.text) ||
    /\bdefineManagedRecipeAlchemyBinding\s*\(/u.test(fact.text))

const adapterInvocationCountFor = (file: string, text: string): number => {
  const code = codeSurfaceForSideEffectScan(text)
  if (/\/cli(?:-core)?\.ts$/u.test(file) || /\bprocess\.argv\b/u.test(code)) return 1
  if (/\bnx\s+run\b|\bproject\.json\b|\btargetName\b/u.test(code)) return 1
  return 0
}

const relativeImportsFor = (text: string): readonly string[] =>
  [...text.matchAll(/\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["'](?<specifier>\.[^"']+)["']/gu)]
    .flatMap((match) => match.groups?.specifier === undefined ? [] : [match.groups.specifier])

const resolveRelativeImport = (
  workspaceRoot: string,
  importer: string,
  specifier: string,
): string | undefined => {
  const base = path.resolve(workspaceRoot, path.dirname(importer), specifier)
  const candidates = [
    base,
    ...typescriptSourceAlternatesForJsSpecifier(base),
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]
  const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  return resolved === undefined ? undefined : relativeToWorkspace(workspaceRoot, resolved)
}

const typescriptSourceAlternatesForJsSpecifier = (base: string): readonly string[] => {
  if (base.endsWith(".mjs")) return [base.slice(0, -4) + ".mts", base.slice(0, -4) + ".ts"]
  if (base.endsWith(".cjs")) return [base.slice(0, -4) + ".cts", base.slice(0, -4) + ".ts"]
  if (base.endsWith(".js")) return [base.slice(0, -3) + ".ts", base.slice(0, -3) + ".tsx"]
  return []
}

const tsconfigPaths = (root: string): readonly string[] =>
  findFiles(root)
    .filter((file) => /\/tsconfig(?:\.[^/]+)?\.json$/u.test(file.replaceAll(path.sep, "/")))
    .filter((file) => !/\/(?:node_modules|dist|coverage|\.attune|vendor)\//u.test(file.replaceAll(path.sep, "/")))
    .sort()

const findFiles = (root: string): readonly string[] => {
  if (!fs.existsSync(root)) return []
  const files: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if ([".git", "node_modules", "dist", "coverage", ".attune"].includes(entry.name)) continue
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(fullPath)
      else files.push(fullPath)
    }
  }
  visit(root)
  return files
}

const isBehaviorfulFact = (fact: SourceFact): boolean =>
  fact.recipeDeclarations.length > 0 ||
  fact.alchemyResources.length > 0 ||
  fact.handlerBindings.length > 0 ||
  fact.adapterInvocationCount > 0 ||
  fact.alchemyResourceBindingCount > 0 ||
  fact.recipeModuleExportCount > 0 ||
  fact.sideEffectKind !== undefined

const isIgnoredSourcePath = (
  file: string,
  trackedFiles?: ReadonlySet<string>,
): boolean =>
  /\/node_modules\/|\/dist\/|\/coverage\/|\/\.attune\/|\/upstream-effect\/vendor\//u.test(file) ||
  file.endsWith(".d.ts") ||
  (trackedFiles !== undefined && isGeneratedSourceOutputPath(file) && !trackedFiles.has(file))

const isGeneratedSourceOutputPath = (file: string): boolean =>
  /(^|\/)(generated|__generated__)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(file)

const isTestLikePath = (file: string): boolean =>
  /(^|\/)(test|tests|__fixtures__|fixtures)(\/|$)|\.(?:test|spec)\.[cm]?tsx?$/u.test(file)

const isToolingConfigPath = (file: string): boolean =>
  /(^|\/)(?:vite|vitest|tsup|rollup|eslint|prettier|typedoc|tailwind|postcss|playwright|webpack)\.config\.[cm]?tsx?$/u
    .test(file)

const isMeaningfulLocalRecipeSourceFile = (fact: SourceFact): boolean =>
  !isTestLikePath(fact.path) &&
  !isToolingConfigPath(fact.path) &&
  !isPackageRecipeCatalogPath(fact.path) &&
  fact.expressionRole !== "external/quarantined" &&
  fact.path.startsWith("packages/") &&
  /\/src\/.+\.[cm]?tsx?$/u.test(fact.path)

const hasLocalRecipeExpression = (fact: SourceFact): boolean =>
  fact.recipeDeclarations.length > 0 ||
  fact.handlerBindings.length > 0 ||
  fact.alchemyResourceBindingCount > 0 ||
  fact.recipeModuleExportCount > 0

const hasLocalHandlerExpression = (fact: SourceFact): boolean =>
  fact.handlerBindings.some((handler) => handler.sourcePath === fact.path) ||
  fact.handlerBindings.some((handler) => handler.sourcePath === undefined)

const hasFileLocalRecipeModuleExpression = (fact: SourceFact): boolean =>
  fact.recipeModuleExportCount > 0 ||
  fact.recipeDeclarations.length > 0

const isPackageRecipeCatalogPath = (file: string): boolean =>
  /\/src\/recipes\.[cm]?ts$/u.test(file)

const isThinRecipeCatalog = (fact: SourceFact): boolean =>
  isPackageRecipeCatalogPath(fact.path) &&
  fact.recipeDeclarations.length === 0 &&
  fact.recipeModuleImportCount > 0 &&
  /\bdefineRecipePackage\s*\(/u.test(fact.text)

const packageRootForFile = (file: string): string => {
  const match = /^packages\/(?:(?:attune|canopy|tend|trellis)\/[^/]+|[^/]+)/u.exec(file)
  if (match !== null) return match[0]
  return "workspace"
}

const stringProperty = (text: string, property: string): string | undefined => {
  const match = new RegExp(`\\b${property}\\s*:\\s*["'](?<value>[^"']+)["']`, "u").exec(text)
  return match?.groups?.value
}

const stringPropertiesInArrayProperty = (
  text: string,
  arrayProperty: string,
  property: string,
): readonly string[] => {
  const arrayMatch = new RegExp(`\\b${arrayProperty}\\s*:\\s*\\[(?<body>[\\s\\S]*?)\\]`, "u").exec(text)
  const body = arrayMatch?.groups?.body
  if (body === undefined) return []
  return [...body.matchAll(new RegExp(`\\b${property}\\s*:\\s*["'](?<value>[^"']+)["']`, "gu"))]
    .flatMap((match) => match.groups?.value === undefined ? [] : [match.groups.value])
}

const stringOrConstPropertiesInArrayProperty = (
  text: string,
  arrayProperty: string,
  property: string,
  constStrings: ReadonlyMap<string, string>,
): readonly string[] => {
  const arrayMatch = new RegExp(`\\b${arrayProperty}\\s*:\\s*\\[(?<body>[\\s\\S]*?)\\]`, "u").exec(text)
  const body = arrayMatch?.groups?.body
  if (body === undefined) return []
  return [...body.matchAll(new RegExp(`\\b${property}\\s*:\\s*(?<value>["'][^"']+["']|[A-Za-z_$][\\w$]*)`, "gu"))]
    .flatMap((match) => {
      const raw = match.groups?.value
      if (raw === undefined) return []
      if (raw.startsWith("\"") || raw.startsWith("'")) return [raw.slice(1, -1)]
      return constStrings.get(raw) === undefined ? [] : [constStrings.get(raw) as string]
    })
}

const handlerBindingsFor = (
  text: string,
  constStrings: ReadonlyMap<string, string> = constStringVariableValuesFor(text),
  searchText: string = codeSearchTextFor(text),
): readonly RecipeHandlerFact[] => {
  const handlers: RecipeHandlerFact[] = []
  const pattern = /\bdefineRecipeHandler\s*(?:<[\s\S]*?>)?\s*\(/gu
  for (const match of searchText.matchAll(pattern)) {
    const openBrace = searchText.indexOf("{", (match.index ?? 0) + match[0].length)
    if (openBrace < 0) continue
    const segment = balancedSegment(text, openBrace, "{", "}")
    if (segment === undefined) continue
    const body = segment.body
    const id = stringProperty(body, "id") ??
      constStrings.get(identifierProperty(body, "id") ?? "")
    const recipeId = stringProperty(body, "recipeId") ??
      constStrings.get(identifierProperty(body, "recipeId") ?? "")
    const sourcePath = stringProperty(body, "sourcePath") ??
      constStrings.get(identifierProperty(body, "sourcePath") ?? "")
    handlers.push({
      ...(id === undefined ? {} : { id }),
      ...(recipeId === undefined ? {} : { recipeId }),
      ...(sourcePath === undefined ? {} : { sourcePath }),
    })
  }
  return handlers
}

const recipeModuleExportCountFor = (
  text: string,
  searchText: string = codeSearchTextFor(text),
): number =>
  countCodeMatches(text, searchText, /\bdefineRecipeModule\s*\(/gu) +
  countMatches(searchText, /\bexport\s+const\s+\w*(?:Recipes|RecipeModule)\s*=\s*(?:\[[\s\S]*?\]|defineRecipeModule\s*\()/gu) +
  countMatches(searchText, /\bexport\s+const\s+\w*Recipe\s*=\s*define\w*Recipe\s*(?:<[\s\S]*?>)?\s*\(/gu)

const recipeModuleImportCountFor = (
  text: string,
  searchText: string = codeSearchTextFor(text),
): number =>
  [...text.matchAll(/\bimport\s+\{(?<bindings>[^}]+)\}\s+from\s+["']\.[^"']+["']/gu)]
    .filter((match) => isCodeMatch(text, searchText, match.index ?? 0))
    .reduce((sum, match) => {
      const bindings = match.groups?.bindings ?? ""
      return sum + bindings.split(",").filter((binding) =>
        /\b\w*(?:Recipes|RecipeModule)\b/u.test(binding.trim())
      ).length
    }, 0)

const alchemyResourceVariableIdsFor = (
  text: string,
  searchText: string = codeSearchTextFor(text),
): ReadonlyMap<string, string> => {
  const ids = new Map<string, string>()
  const pattern = /\b(?:export\s+)?const\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*defineAlchemyResource\s*\(/gu
  for (const match of searchText.matchAll(pattern)) {
    const name = match.groups?.name
    const openBrace = searchText.indexOf("{", (match.index ?? 0) + match[0].length)
    if (openBrace < 0) continue
    const segment = balancedSegment(text, openBrace, "{", "}")
    if (segment === undefined) continue
    const id = stringProperty(segment.body, "id")
    if (name !== undefined && id !== undefined) ids.set(name, id)
  }
  return ids
}

const identifierProperty = (text: string, property: string): string | undefined => {
  const match = new RegExp(`\\b${property}\\s*:\\s*(?<value>[A-Za-z_$][\\w$]*)\\b`, "u").exec(text)
  return match?.groups?.value
}

const constStringVariableValuesFor = (
  text: string,
  searchText: string = codeSearchTextFor(text),
): ReadonlyMap<string, string> => {
  const values = new Map<string, string>()
  const pattern = /\bconst\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*["'](?<value>[^"']+)["'](?:\s+as\s+const)?/gu
  for (const match of text.matchAll(pattern)) {
    if (!isCodeMatch(text, searchText, match.index ?? 0)) continue
    const name = match.groups?.name
    const value = match.groups?.value
    if (name !== undefined && value !== undefined) values.set(name, value)
  }
  return values
}

const importedConstStringVariableValuesFor = (
  workspaceRoot: string,
  importer: string,
  text: string,
  searchText: string = codeSearchTextFor(text),
): ReadonlyMap<string, string> => {
  const values = new Map<string, string>()
  const pattern = /\bimport\s+\{(?<bindings>[^}]+)\}\s+from\s+["'](?<specifier>\.[^"']+)["']/gu
  for (const match of text.matchAll(pattern)) {
    if (!isCodeMatch(text, searchText, match.index ?? 0)) continue
    const specifier = match.groups?.specifier
    const bindings = match.groups?.bindings
    if (specifier === undefined || bindings === undefined) continue
    const importedPath = resolveRelativeImport(workspaceRoot, importer, specifier)
    if (importedPath === undefined) continue
    const absoluteImportedPath = path.resolve(workspaceRoot, importedPath)
    const importedText = fs.existsSync(absoluteImportedPath) ? fs.readFileSync(absoluteImportedPath, "utf8") : ""
    const exportedValues = exportedConstStringVariableValuesFor(importedText)
    for (const binding of importedConstBindingsFor(bindings)) {
      const value = exportedValues.get(binding.exportedName)
      if (value !== undefined) values.set(binding.localName, value)
    }
  }
  return values
}

const exportedConstStringVariableValuesFor = (
  text: string,
  searchText: string = codeSearchTextFor(text),
): ReadonlyMap<string, string> => {
  const values = new Map<string, string>()
  const pattern = /\bexport\s+const\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*["'](?<value>[^"']+)["'](?:\s+as\s+const)?/gu
  for (const match of text.matchAll(pattern)) {
    if (!isCodeMatch(text, searchText, match.index ?? 0)) continue
    const name = match.groups?.name
    const value = match.groups?.value
    if (name !== undefined && value !== undefined) values.set(name, value)
  }
  return values
}

const effectBackedHandlerFactoryNamesFor = (
  text: string,
  searchText: string = codeSearchTextFor(text),
): ReadonlySet<string> => {
  const names = new Set<string>()
  const constFactoryPattern =
    /\bconst\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>\s*(?:[A-Za-z_$][\w$]*\.)?defineRecipeHandler\s*(?:<|\()/gu
  for (const match of searchText.matchAll(constFactoryPattern)) {
    const name = match.groups?.name
    if (name !== undefined) names.add(name)
  }

  const functionFactoryPattern =
    /\bfunction\s+(?<name>[A-Za-z_$][\w$]*)\s*\([\s\S]*?\)\s*(?::[^{]+)?\{\s*return\s+(?:[A-Za-z_$][\w$]*\.)?defineRecipeHandler\s*(?:<|\()/gu
  for (const match of searchText.matchAll(functionFactoryPattern)) {
    const name = match.groups?.name
    if (name !== undefined) names.add(name)
  }
  return names
}

const importedConstBindingsFor = (
  bindings: string,
): readonly { readonly exportedName: string; readonly localName: string }[] =>
  bindings
    .split(",")
    .flatMap((rawBinding) => {
      const binding = rawBinding.trim()
      if (binding.length === 0 || binding.startsWith("type ")) return []
      const match = /^(?<exportedName>[A-Za-z_$][\w$]*)(?:\s+as\s+(?<localName>[A-Za-z_$][\w$]*))?$/u.exec(binding)
      const exportedName = match?.groups?.exportedName
      if (exportedName === undefined) return []
      const localName = match?.groups?.localName ?? exportedName
      return [{
        exportedName,
        localName,
      }]
    })

const functionObjectBodiesFor = (
  text: string,
  functionName: string,
  searchText: string = codeSearchTextFor(text),
): readonly string[] => {
  const bodies: string[] = []
  const pattern = new RegExp(`\\b${functionName}\\s*\\(`, "gu")
  for (const match of searchText.matchAll(pattern)) {
    const openBrace = searchText.indexOf("{", (match.index ?? 0) + match[0].length)
    if (openBrace < 0) continue
    const segment = balancedSegment(text, openBrace, "{", "}")
    if (segment === undefined) continue
    bodies.push(segment.body)
  }
  return bodies
}

const arrayPropertyObjectBodiesFor = (
  text: string,
  property: string,
  searchText: string = codeSearchTextFor(text),
): readonly string[] => {
  const bodies: string[] = []
  const pattern = new RegExp(`\\b${property}\\s*:\\s*\\[`, "gu")
  for (const match of searchText.matchAll(pattern)) {
    const openBracket = searchText.indexOf("[", match.index ?? 0)
    if (openBracket < 0) continue
    const segment = balancedSegment(text, openBracket, "[", "]")
    if (segment === undefined) continue
    bodies.push(...topLevelObjectBodiesFor(segment.body))
  }
  return bodies
}

const topLevelObjectBodiesFor = (text: string): readonly string[] => {
  const bodies: string[] = []
  let index = 0
  while (index < text.length) {
    const openBrace = text.indexOf("{", index)
    if (openBrace < 0) break
    const segment = balancedSegment(text, openBrace, "{", "}")
    if (segment === undefined) break
    bodies.push(segment.body)
    index = segment.end
  }
  return bodies
}

const balancedSegment = (
  text: string,
  openIndex: number,
  open: "{" | "[",
  close: "}" | "]",
): { readonly body: string; readonly end: number } | undefined => {
  let depth = 0
  let quote: "'" | "\"" | "`" | undefined
  let escaped = false
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index]
    if (quote !== undefined) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === "\\") {
        escaped = true
        continue
      }
      if (char === quote) quote = undefined
      continue
    }
    if (char === "'" || char === "\"" || char === "`") {
      quote = char
      continue
    }
    if (char === open) {
      depth += 1
      continue
    }
    if (char !== close) continue
    depth -= 1
    if (depth === 0) {
      return {
        body: text.slice(openIndex + 1, index),
        end: index + 1,
      }
    }
  }
  return undefined
}

const authoredIdentityStringCount = (text: string): number =>
  countMatches(text, /\b(?:id|recipeId|ownerRecipeId|providerId|resourceId|fromRecipeId|toRecipeId|parentRecipeId|childRecipeId)\s*:\s*["'][^"']+["']/gu)

const semanticGroupingStringAuthorityCount = (
  text: string,
  searchText: string = codeSearchTextFor(text),
): number =>
  countSemanticGroupingMatches(text, searchText, /\b(?:groups|grouping|packetGroup|validationTarget|validationTargets|repairRecipeId|risk|blastRadius|capability|capabilities|sideEffectKind|effectKind|ownerKind|expectedOwnerKind|expressionRole|classification)\s*:\s*["'][^"']+["']/gu) +
  countSemanticGroupingMatches(text, searchText, /\b(?:groups|capabilities|validationTargets|tags)\s*:\s*\[\s*["'][^"']+["']/gu)

const countMatches = (text: string, pattern: RegExp): number =>
  [...text.matchAll(pattern)].length

const countCodeMatches = (
  text: string,
  searchText: string,
  pattern: RegExp,
): number =>
  [...text.matchAll(pattern)].filter((match) =>
    isCodeMatch(text, searchText, match.index ?? 0)
  ).length

const countSemanticGroupingMatches = (
  text: string,
  searchText: string,
  pattern: RegExp,
): number =>
  [...text.matchAll(pattern)].filter((match) => {
    const index = match.index ?? 0
    if (!isCodeMatch(text, searchText, index)) return false
    const linePrefix = text.slice(text.lastIndexOf("\n", index) + 1, index)
    return !/\breadonly\s*$/u.test(linePrefix)
  }).length

const isCodeMatch = (
  text: string,
  searchText: string,
  index: number,
): boolean =>
  searchText[index] === text[index]

const isExportedRecipeDeclaration = (
  searchText: string,
  index: number,
): boolean =>
  /\bexport\s+const\s+[A-Za-z_$][\w$]*\s*=\s*$/u.test(
    searchText.slice(searchText.lastIndexOf("\n", index) + 1, index),
  )

const codeSearchTextFor = (text: string): string => {
  const chars = text.split("")
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    text,
  )
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (!isNonCodeSyntaxKind(token)) continue
    const start = scanner.getTokenPos()
    const end = scanner.getTextPos()
    for (let index = start; index < end; index += 1) {
      chars[index] = chars[index] === "\n" ? "\n" : " "
    }
  }
  return chars.join("")
}

const isNonCodeSyntaxKind = (kind: ts.SyntaxKind): boolean =>
  kind === ts.SyntaxKind.StringLiteral ||
  kind === ts.SyntaxKind.RegularExpressionLiteral ||
  kind === ts.SyntaxKind.SingleLineCommentTrivia ||
  kind === ts.SyntaxKind.MultiLineCommentTrivia

const uniqueStrings = (values: readonly string[]): readonly string[] =>
  [...new Set(values)]

const languageServiceSourceExpressionLayer = defineRecipeLayer({
  id: "trellis-language-service.source-expression.layer",
  sourcePath: LanguageServiceSourceExpressionSourcePath,
  exportName: "languageServiceSourceExpressionLayer",
  layer: Layer.empty as never,
  provides: [{
    id: "trellis-language-service.source-expression-filesystem",
    service: "Effect.Platform.FileSystem",
  }],
})

const languageServiceSourceExpressionOracleHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.source-expression-oracle.handler",
  recipeId: "trellis-language-service.source-expression-oracle",
  sourcePath: LanguageServiceSourceExpressionSourcePath,
  exportName: "analyzeSourceExpression",
  layer: languageServiceSourceExpressionLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceSourceExpressionPacketHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.source-expression-packet.handler",
  recipeId: "trellis-language-service.source-expression-packet",
  sourcePath: LanguageServiceSourceExpressionSourcePath,
  exportName: "isSourceExpressionPacketFamily",
  layer: languageServiceSourceExpressionLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceSourceExpressionOracleDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.recipe-fact-diagnostics",
  toRecipeId: "trellis-language-service.source-expression-oracle",
  resource: LanguageServiceSourceExpressionResource,
  kind: "projects",
  modes: ["project", "check", "read"],
})

const languageServiceSourceExpressionPacketDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.source-expression-oracle",
  toRecipeId: "trellis-language-service.source-expression-packet",
  resource: LanguageServicePacketResource,
  kind: "repairs",
  modes: ["project", "read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceSourceExpressionOracleRecipe = defineProjectionRecipe({
  id: "trellis-language-service.source-expression-oracle",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Render typed Recipe/ManagedRecipe source-expression oracle JSON",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceSourceExpressionSourcePath],
  observedFiles: [LanguageServiceSourceExpressionSourcePath],
  affectedFiles: [LanguageServiceSourceExpressionSourcePath],
  outputs: ["TrellisLsSourceExpressionOutput", "RecipeExpressionSnapshot", "RecipeExpressionOracleResult"],
  validationEvidence: ["workspace:packetized-architecture-judge"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceDiagnosticsResource],
    outputResources: [LanguageServiceSourceExpressionResource],
  },
  handler: languageServiceSourceExpressionOracleHandler,
  alchemyDag: [languageServiceSourceExpressionOracleDag],
})

export const LanguageServiceSourceExpressionPacketRecipe = defineRepairRecipe({
  id: "trellis-language-service.source-expression-packet",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Packetize typed Recipe/ManagedRecipe expression failures into grouped repair targets",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceSourceExpressionSourcePath],
  affectedFiles: [LanguageServiceSourceExpressionSourcePath],
  validationEvidence: ["workspace:packetized-architecture-judge"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceSourceExpressionResource],
    outputResources: [LanguageServicePacketResource],
  },
  handler: languageServiceSourceExpressionPacketHandler,
  alchemyDag: [languageServiceSourceExpressionPacketDag],
})

export const LanguageServiceSourceExpressionRecipes = [
  LanguageServiceSourceExpressionOracleRecipe,
  LanguageServiceSourceExpressionPacketRecipe,
] as const

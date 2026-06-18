import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join, normalize } from "node:path"
import { Context, Effect, Layer } from "effect"
import {
  CpgProgram,
  Joern,
  cpg,
  prop,
  type GraphAnalysisError,
  type GraphMaterializationError,
  type JoernDecodeError,
  type JoernError,
  type JoernExecutableNotFoundError,
  type JoernHttpError,
  type JoernImportError,
  type JoernServerStartError,
  type JoernServerTimeoutError,
} from "joern-effect"
import type { CpgProgramDefinition } from "joern-effect"
import { compileGeneratedDslPrograms } from "../templates/queries.js"
import type { FuzzCase } from "../domain/model.js"
import {
  FuzzExpectationMismatchError,
  checkFuzzExpectations,
  summarizeQueryRows,
  type QueryObservationSummary,
} from "./expectations.js"
import { loadQueryFeedbackSnapshot } from "./queryFeedback.js"
import { makeJoernWorkspacePool } from "./workspacePool.js"
import type { JoernWorkspacePoolError, JoernWorkspacePoolService, JoernWorkspaceWorker } from "./workspacePool.js"

export type FuzzQueryRecipeResult = Readonly<{
  readonly cpgql: string
  readonly fingerprint: string
  readonly kind: string
  readonly name: string
  readonly observations: QueryObservationSummary
  readonly preview: string
  readonly rowCount: number
}>

export type FuzzJoernOracleResult = Readonly<{
  readonly caseCount: number
  readonly projectName: string
  readonly projectPath: string
  readonly workerId: string
  readonly workspacePath: string
  readonly queryResults: readonly FuzzQueryRecipeResult[]
}>

export type FuzzJoernImportResult = Readonly<{
  readonly caseCount: number
  readonly projectName: string
  readonly projectPath: string
  readonly workerId: string
  readonly workspacePath: string
}>

export type FuzzOracleQueryOptions = Readonly<{
  readonly queryBudget?: number
  readonly queryFeedback?: boolean
}>

type WrittenProject = Readonly<{
  readonly caseCount: number
}>

const safeFileStem = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/gu, "_").slice(0, 120)

const safeRelativeSourcePath = (fuzzCase: FuzzCase): string => {
  const generated = `src/${safeFileStem(fuzzCase.caseId)}.${fuzzCase.syntaxFlavor}`
  const configured = fuzzCase.sourcePath
  if (configured === undefined) {
    return generated
  }
  const normalized = normalize(configured).replace(/^[/\\]+/u, "")
  if (normalized.split(/[\\/]/u).includes("..")) {
    return generated
  }
  return normalized
}

const writeProject = (
  worker: JoernWorkspaceWorker,
  cases: readonly FuzzCase[],
): Effect.Effect<WrittenProject> =>
  Effect.promise(async () => {
    const path = worker.projectPath
    await writeFile(join(path, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`)
    await writeFile(
      join(path, "tsconfig.json"),
      `${JSON.stringify({ compilerOptions: { jsx: "react-jsx", module: "ESNext", target: "ES2022" } }, null, 2)}\n`,
    )
    await mkdir(join(path, "src"), { recursive: true })
    await Promise.all(cases.map(async (fuzzCase) => {
      const relativePath = safeRelativeSourcePath(fuzzCase)
      await mkdir(dirname(join(path, relativePath)), { recursive: true })
      await writeFile(join(path, relativePath), fuzzCase.source)
    }))
    return { caseCount: cases.length }
  })

const sinkRowsProgram = CpgProgram.effect(
  "fuzz sink rows",
  Effect.gen(function* fuzzSinkRowsProgram() {
    const sink = yield* cpg.call.name("sink").as("fuzz sink")
    return yield* sink.toRows({
      code: prop.code,
      file: prop.filename,
      line: prop.lineNumber,
      name: prop.name,
    })
  }),
)

const graphFactsProgram = CpgProgram.effect(
  "fuzz sink graph facts",
  Effect.gen(function* fuzzGraphFactsProgram() {
    const sink = yield* cpg.call.name("sink").as("fuzz sink")
    const graph = yield* sink.materializeGraph("fuzz sink graph").including((node) => node.method)
    const neighborhood = yield* graph.neighborhood.around(sink).withinDistance(2)
    return yield* graph.toGraphFacts().from(neighborhood).all()
  }),
)

const methodInventoryProgram = CpgProgram.effect(
  "fuzz method inventory",
  Effect.gen(function* fuzzMethodInventoryProgram() {
    const methods = yield* cpg.method.name(".*").as("fuzz methods")
    return yield* methods.toRows({
      file: prop.filename,
      fullName: prop.fullName,
      name: prop.name,
      signature: prop.signature,
    })
  }),
)

const callInventoryProgram = CpgProgram.effect(
  "fuzz call inventory",
  Effect.gen(function* fuzzCallInventoryProgram() {
    const calls = yield* cpg.call.name(".*").as("fuzz calls")
    return yield* calls.toRows({
      code: prop.code,
      dispatch: prop.dispatchType,
      method: prop.methodFullName,
      name: prop.name,
      type: prop.typeFullName,
    })
  }),
)

const identifierInventoryProgram = CpgProgram.effect(
  "fuzz identifier inventory",
  Effect.gen(function* fuzzIdentifierInventoryProgram() {
    const identifiers = yield* cpg.identifier.name(".*").as("fuzz identifiers")
    return yield* identifiers.toRows({
      code: prop.code,
      name: prop.name,
      type: prop.typeFullName,
    })
  }),
)

const literalSignalProgram = CpgProgram.effect(
  "fuzz literal signals",
  Effect.gen(function* fuzzLiteralSignalProgram() {
    const literals = yield* cpg.literal.code(".*(token|secret|password|api[_-]?key|sink|source).*").as("fuzz literals")
    return yield* literals.toRows({
      code: prop.code,
      type: prop.typeFullName,
    })
  }),
)

const controlStructureInventoryProgram = CpgProgram.effect(
  "fuzz control structure inventory",
  Effect.gen(function* fuzzControlStructureInventoryProgram() {
    const controls = yield* cpg.controlStructure.controlStructureType(".*").as("fuzz controls")
    return yield* controls.toRows({
      code: prop.code,
      kind: prop.controlStructureType,
      parser: prop.parserTypeName,
    })
  }),
)

const typeDeclInventoryProgram = CpgProgram.effect(
  "fuzz type declaration inventory",
  Effect.gen(function* fuzzTypeDeclInventoryProgram() {
    const types = yield* cpg.typeDecl.fullName(".*").as("fuzz type declarations")
    return yield* types.toRows({
      file: prop.filename,
      fullName: prop.fullName,
      name: prop.name,
    })
  }),
)

const compactCpgql = (cpgql: string): string =>
  cpgql
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ")

const previewCpgql = (cpgql: string): string => {
  const compact = compactCpgql(cpgql)
  return compact.length <= 1_200 ? compact : `${compact.slice(0, 1_200)}...`
}

const runProgramRecipe = <Out extends readonly unknown[]>(
  name: string,
  fingerprint: string,
  kind: string,
  program: CpgProgramDefinition<Out, never>,
): Effect.Effect<FuzzQueryRecipeResult, JoernError | JoernDecodeError | GraphMaterializationError | GraphAnalysisError, Joern> =>
  Effect.gen(function* runCompiledRecipe() {
    const compiled = yield* CpgProgram.compile(program)
    const rows = yield* CpgProgram.run(program)
    return {
      cpgql: compiled.cpgql,
      fingerprint,
      kind,
      name,
      observations: summarizeQueryRows(rows),
      preview: previewCpgql(compiled.cpgql),
      rowCount: rows.length,
    }
  })

const runRecipes = (): Effect.Effect<readonly FuzzQueryRecipeResult[], JoernError | JoernDecodeError | GraphMaterializationError | GraphAnalysisError, Joern> =>
  Effect.gen(function* runFuzzRecipes() {
    return yield* Effect.all([
      runProgramRecipe("sink-rows", "call-name-sink-to-rows-code-file-line-name", "rows", sinkRowsProgram),
      runProgramRecipe(
        "sink-neighborhood-graph-facts",
        "call-name-sink-neighborhood-distance-2-graph-facts",
        "graph-facts",
        graphFactsProgram,
      ),
      runProgramRecipe(
        "method-inventory",
        "method-name-any-to-rows-file-full-name-name-signature",
        "rows",
        methodInventoryProgram,
      ),
      runProgramRecipe(
        "call-inventory",
        "call-name-any-to-rows-code-dispatch-method-name-type",
        "rows",
        callInventoryProgram,
      ),
      runProgramRecipe(
        "identifier-inventory",
        "identifier-name-any-to-rows-code-name-type",
        "rows",
        identifierInventoryProgram,
      ),
      runProgramRecipe("literal-signal", "literal-code-signal-to-rows-code-type", "rows", literalSignalProgram),
      runProgramRecipe(
        "control-structure-inventory",
        "control-structure-any-to-rows-code-kind-parser",
        "rows",
        controlStructureInventoryProgram,
      ),
      runProgramRecipe(
        "type-decl-inventory",
        "type-decl-full-name-any-to-rows-file-full-name-name",
        "rows",
        typeDeclInventoryProgram,
      ),
    ])
  })

const runGeneratedRecipes = (
  cases: readonly FuzzCase[],
  options: FuzzOracleQueryOptions,
): Effect.Effect<readonly FuzzQueryRecipeResult[], JoernError | JoernDecodeError | GraphMaterializationError | GraphAnalysisError, Joern> =>
  Effect.gen(function* runGeneratedFuzzRecipes() {
    const feedback = yield* loadQueryFeedbackSnapshot(options.queryFeedback ?? true)
    const generatedPrograms = yield* compileGeneratedDslPrograms(cases, {
      ...(options.queryBudget === undefined ? {} : { budget: options.queryBudget }),
      feedback,
    })
    return yield* Effect.forEach(
      generatedPrograms,
      (generated) =>
        CpgProgram.run(generated.program).pipe(
          Effect.map((rows) => ({
            cpgql: generated.cpgql,
            fingerprint: generated.fingerprint,
            kind: generated.kind,
            name: generated.name,
            observations: summarizeQueryRows(rows),
            preview: generated.preview,
            rowCount: rows.length,
          })),
        ),
      { concurrency: 1 },
    )
  })

export type FuzzOracleError =
  | JoernError
  | JoernDecodeError
  | GraphMaterializationError
  | GraphAnalysisError
  | FuzzExpectationMismatchError
  | JoernExecutableNotFoundError
  | JoernHttpError
  | JoernImportError
  | JoernServerStartError
  | JoernServerTimeoutError
  | JoernWorkspacePoolError

export interface FuzzOracleService {
  readonly importJoernProject: (cases: readonly FuzzCase[]) => Effect.Effect<FuzzJoernImportResult, FuzzOracleError>
  readonly runJoernQueries: (
    cases: readonly FuzzCase[],
    options?: FuzzOracleQueryOptions,
  ) => Effect.Effect<FuzzJoernOracleResult, FuzzOracleError>
}

export class FuzzOracle extends Context.Tag("attune/joern-effect-properties/fuzz/FuzzOracle")<
  FuzzOracle,
  FuzzOracleService
>() {}

export const makeFuzzOracle = (
  workspacePool: JoernWorkspacePoolService = makeJoernWorkspacePool(),
): FuzzOracleService => ({
  importJoernProject: (cases) => Effect.gen(function* importJoernProject() {
    return yield* workspacePool.withImportedProject(
      (worker) => writeProject(worker, cases).pipe(Effect.asVoid),
      (worker) =>
        Effect.succeed({
          caseCount: cases.length,
          projectName: worker.projectName,
          projectPath: worker.projectPath,
          workerId: worker.workerId,
          workspacePath: worker.workspacePath,
        }),
    )
  }),
  runJoernQueries: (cases, options = {}) => Effect.gen(function* runJoernOracle() {
    return yield* workspacePool.withImportedProject(
      (worker) => writeProject(worker, cases).pipe(Effect.asVoid),
      (worker) =>
        Effect.all([runRecipes(), runGeneratedRecipes(cases, options)]).pipe(
          Effect.flatMap(([baselineQueryResults, generatedQueryResults]) => {
            const queryResults = [...baselineQueryResults, ...generatedQueryResults]
            const failures = checkFuzzExpectations(cases, queryResults)
            if (failures.length > 0) {
              return Effect.fail(new FuzzExpectationMismatchError({ failures, queryResults }))
            }
            return Effect.succeed({
              caseCount: cases.length,
              projectName: worker.projectName,
              projectPath: worker.projectPath,
              queryResults,
              workerId: worker.workerId,
              workspacePath: worker.workspacePath,
            })
          }),
        ),
    )
  }),
})

export const FuzzOracleLive: Layer.Layer<FuzzOracle> = Layer.succeed(
  FuzzOracle,
  makeFuzzOracle(),
)

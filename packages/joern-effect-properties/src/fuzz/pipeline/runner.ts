import { Context, Effect, Layer } from "effect"
import fc from "fast-check"
import { FuzzTelemetry, type FuzzTelemetryService } from "../services/telemetry.js"
import { FuzzOracle, type FuzzOracleService } from "../services/oracle.js"
import { FuzzExpectationMismatchError } from "../services/expectations.js"
import type { FuzzCase, FuzzerRunConfig, FuzzerRunSummary } from "../domain/model.js"
import { PropertyHarnessRuntime } from "../config/runtime.js"
import type { PropertyHarnessConfig } from "../config/runtime.js"
import { makeFuzzTrace, runPayload } from "../services/eventPayloads.js"
import { SemanticAdmitter, type SemanticAdmitterService } from "../services/admission.js"
import { SemanticCorpusStore } from "../services/corpus.js"
import { semanticCasePlanArbitrary } from "../templates/workloads.js"
import type { SemanticCase, SemanticProjectSeed } from "../domain/model.js"
import {
  SemanticMutator,
  type SemanticCasePlan,
  type SemanticMutationResult,
  type SemanticMutatorService,
} from "../services/mutator.js"

export interface SemanticFuzzSchedulerService {
  readonly run: (config: FuzzerRunConfig) => Effect.Effect<
    FuzzerRunSummary,
    unknown,
    SemanticCorpusStore | SemanticMutator | SemanticAdmitter | FuzzOracle | FuzzTelemetry
  >
}

export class SemanticFuzzScheduler extends Context.Tag(
  "attune/joern-effect-properties/fuzz/SemanticFuzzScheduler",
)<SemanticFuzzScheduler, SemanticFuzzSchedulerService>() {}

const chunksFor = <A>(values: readonly A[], workerCount: number): readonly (readonly A[])[] => {
  const chunkCount = Math.min(Math.max(workerCount, 1), Math.max(values.length, 1))
  return Array.from({ length: chunkCount }, (_chunk, workerIndex) =>
    values.filter((_value, valueIndex) => valueIndex % chunkCount === workerIndex),
  ).filter((chunk) => chunk.length > 0)
}

const chunksBySize = <A>(values: readonly A[], chunkSize: number): readonly (readonly A[])[] => {
  const safeChunkSize = Math.max(1, chunkSize)
  const chunks: Array<readonly A[]> = []
  for (let index = 0; index < values.length; index += safeChunkSize) {
    chunks.push(values.slice(index, index + safeChunkSize))
  }
  return chunks
}

const filterSeeds = (
  seeds: readonly SemanticProjectSeed[],
  config: FuzzerRunConfig,
): readonly SemanticProjectSeed[] =>
  seeds.filter((seed) => {
    const idMatches = config.seedIds === undefined || config.seedIds.includes(seed.id)
    const syntaxMatches = config.syntaxFlavors === undefined || seed.files.some((file) =>
      config.syntaxFlavors?.includes(file.syntaxFlavor) ?? false
    )
    return idMatches && syntaxMatches
  })

const semanticCasePayload = (
  input: Readonly<{
    readonly semanticCase: SemanticCase
    readonly traceId: string
    readonly spanId: string
    readonly parentSpanId: string
  }>,
): Readonly<Record<string, unknown>> => ({
  caseId: input.semanticCase.caseId,
  corpusSeedId: input.semanticCase.project.id,
  fileCount: input.semanticCase.project.files.length,
  fastCheckPath: input.semanticCase.replay?.fastCheckPath,
  fastCheckSeed: input.semanticCase.replay?.fastCheckSeed,
  mutationSequence: input.semanticCase.mutations.map((step) => `${step.kind}:${step.targetFile}`).join(","),
  "otel.parent_span_id": input.parentSpanId,
  "otel.span_id": input.spanId,
  "otel.trace_id": input.traceId,
  syntaxFlavor: [...new Set(input.semanticCase.project.files.map((file) => file.syntaxFlavor))].join(","),
})

const failurePayload = (
  semanticCase: SemanticCase | undefined,
  workerId: string,
  traceId: string,
  parentSpanId: string,
  failureClass: string,
  failureSummary: string,
  extra: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> => ({
  failureClass,
  failureSummary,
  ...extra,
  workerId,
  "otel.parent_span_id": parentSpanId,
  "otel.span_id": makeFuzzTrace().spanId,
  "otel.trace_id": traceId,
  ...(semanticCase === undefined ? {} : {
    caseId: semanticCase.caseId,
    corpusSeedId: semanticCase.project.id,
    fastCheckPath: semanticCase.replay?.fastCheckPath,
    fastCheckSeed: semanticCase.replay?.fastCheckSeed,
    mutationSequence: semanticCase.mutations.map((step) => `${step.kind}:${step.targetFile}`).join(","),
    syntaxFlavor: [...new Set(semanticCase.project.files.map((file) => file.syntaxFlavor))].join(","),
  }),
})

const failureSummaryFor = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const expectationFailureFields = (
  error: unknown,
): Readonly<Record<string, unknown>> => {
  if (!(error instanceof FuzzExpectationMismatchError)) {
    return {}
  }
  const classifications = [...new Set(error.failures.map((failure) => failure.classification))]
  const queryObservations = (error.queryResults ?? []).slice(0, 20).map((query) => ({
    fingerprint: query.fingerprint,
    kind: query.kind,
    name: query.name,
    observedCodes: query.observations.codes.slice(0, 8),
    observedFullNames: query.observations.fullNames.slice(0, 8),
    observedNames: query.observations.names.slice(0, 8),
    rowCount: query.rowCount,
  }))
  return {
    expectationClassifications: classifications.join(","),
    expectationFailureCount: error.failures.length,
    expectationSummary: error.failures
      .slice(0, 8)
      .map((failure) =>
        `${failure.classification}:${failure.expectation.kind}:${failure.expectation.value}:${failure.expectation.sourcePath}`
      )
      .join(";"),
    observedQueryCount: error.queryResults?.length ?? 0,
    observedQuerySummary: JSON.stringify(queryObservations),
  }
}

const fixtureCandidateJson = (
  input: Readonly<{
    readonly error: unknown
    readonly firstCase: SemanticCase | undefined
  }>,
): string | undefined => {
  if (!(input.error instanceof FuzzExpectationMismatchError) || input.firstCase === undefined) {
    return undefined
  }
  return JSON.stringify({
    caseId: input.firstCase.caseId,
    expectationFailures: input.error.failures.map((failure) => ({
      caseId: failure.caseId,
      classification: failure.classification,
      expectation: failure.expectation,
      reason: failure.reason,
    })),
    mutations: input.firstCase.mutations.map((step) => ({
      kind: step.kind,
      targetFile: step.targetFile,
    })),
    queryResults: (input.error.queryResults ?? []).slice(0, 20).map((query) => ({
      fingerprint: query.fingerprint,
      kind: query.kind,
      name: query.name,
      observations: {
        codes: query.observations.codes.slice(0, 20),
        fullNames: query.observations.fullNames.slice(0, 20),
        names: query.observations.names.slice(0, 20),
      },
      rowCount: query.rowCount,
    })),
    replay: input.firstCase.replay,
    sourceFiles: input.firstCase.project.files.map((file) => ({
      path: file.path,
      source: file.source,
      syntaxFlavor: file.syntaxFlavor,
    })),
  })
}

const emitCounterexampleEvents = (
  input: Readonly<{
    readonly batchIndex: number
    readonly error: unknown
    readonly failureClass: string
    readonly firstCase: SemanticCase | undefined
    readonly shardIndex: number
    readonly telemetry: FuzzTelemetryService
    readonly traceId: string
    readonly workerId: string
    readonly workerSpanId: string
  }>,
  config: FuzzerRunConfig,
): Effect.Effect<void> => {
  const payload = failurePayload(
    input.firstCase,
    input.workerId,
    input.traceId,
    input.workerSpanId,
    input.error instanceof FuzzExpectationMismatchError ? "invariant" : input.failureClass,
    failureSummaryFor(input.error),
    expectationFailureFields(input.error),
  )
  const fixtureJson = fixtureCandidateJson({
    error: input.error,
    firstCase: input.firstCase,
  })
  return input.telemetry.emit(config, "attune.fuzz.counterexample_found", {
    ...payload,
    batchIndex: input.batchIndex,
    shardIndex: input.shardIndex,
  }).pipe(
    Effect.zipRight(input.telemetry.emit(config, "attune.fuzz.shrink_completed", {
      ...payload,
      batchIndex: input.batchIndex,
      shardIndex: input.shardIndex,
      shrinkStrategy: "semantic-fast-check-replay-case",
    })),
    Effect.zipRight(input.telemetry.emit(config, "attune.fuzz.fixture_candidate", {
      ...payload,
      batchIndex: input.batchIndex,
      ...(fixtureJson === undefined ? {} : { fixtureJson }),
      shardIndex: input.shardIndex,
    })),
    Effect.zipRight(input.telemetry.flush),
  )
}

type WorkerSummary = Readonly<{
  readonly accepted: number
  readonly rejected: number
}>

const emitGeneratedCaseEvents = (
  input: Readonly<{
    readonly batchIndex: number
    readonly caseIndex: number
    readonly result: SemanticMutationResult
    readonly spanId: string
    readonly telemetry: FuzzTelemetryService
    readonly traceId: string
    readonly workerId: string
    readonly workerSpanId: string
  }>,
  config: FuzzerRunConfig,
): Effect.Effect<void> =>
  Effect.gen(function* emitGeneratedCaseEvents() {
    const semanticCase = input.result.case
    yield* input.telemetry.emit(config, "attune.fuzz.case_generated", {
      appliedMutations: input.result.applied.map((mutation) => mutation.kind).join(","),
      batchIndex: input.batchIndex,
      caseIndex: input.caseIndex,
      rejectedMutations: input.result.rejected.map((mutation) => `${mutation.kind}:${mutation.reason}`).join(";"),
      workerId: input.workerId,
      ...semanticCasePayload({
        parentSpanId: input.workerSpanId,
        semanticCase,
        spanId: input.spanId,
        traceId: input.traceId,
      }),
    })
    yield* Effect.forEach(
      input.result.applied,
      (mutation) => input.telemetry.emit(config, "attune.fuzz.mutation_applied", {
        batchIndex: input.batchIndex,
        caseIndex: input.caseIndex,
        mutationKind: mutation.kind,
        targetFile: mutation.targetFile,
        workerId: input.workerId,
        ...semanticCasePayload({
          parentSpanId: input.workerSpanId,
          semanticCase,
          spanId: makeFuzzTrace().spanId,
          traceId: input.traceId,
        }),
      }),
    )
  })

const admitGeneratedCase = (
  input: Readonly<{
    readonly admitter: SemanticAdmitterService
    readonly batchIndex: number
    readonly caseIndex: number
    readonly semanticCase: SemanticCase
    readonly spanId: string
    readonly telemetry: FuzzTelemetryService
    readonly traceId: string
    readonly workerId: string
    readonly workerSpanId: string
  }>,
  config: FuzzerRunConfig,
): Effect.Effect<Readonly<{ readonly accepted: boolean; readonly fuzzCases: readonly FuzzCase[] }>> =>
  Effect.gen(function* admitGeneratedCase() {
    const admission = yield* input.admitter.admit(input.semanticCase)
    const payload = {
      batchIndex: input.batchIndex,
      caseIndex: input.caseIndex,
      workerId: input.workerId,
      ...semanticCasePayload({
        parentSpanId: input.workerSpanId,
        semanticCase: input.semanticCase,
        spanId: input.spanId,
        traceId: input.traceId,
      }),
    }
    if (!admission.accepted) {
      yield* input.telemetry.emit(config, "attune.fuzz.case_rejected", {
        ...payload,
        diagnostics: admission.diagnostics,
      })
      return { accepted: false, fuzzCases: [] }
    }
    const fuzzCases = yield* input.admitter.toFuzzCases(input.semanticCase)
    yield* input.telemetry.emit(config, "attune.fuzz.case_admitted", {
      ...payload,
      files: admission.files.length,
    })
    return { accepted: true, fuzzCases }
  })

const emitJoernImportCompleted = (
  input: Readonly<{
    readonly batchIndex: number
    readonly caseCount: number
    readonly durationMs: number
    readonly projectName: string
    readonly projectPath: string
    readonly shardCount: number
    readonly shardIndex: number
    readonly telemetry: FuzzTelemetryService
    readonly traceId: string
    readonly workerId: string
    readonly workerSpanId: string
    readonly workspacePath: string
    readonly joernWorkerId: string
  }>,
  config: FuzzerRunConfig,
): Effect.Effect<void> =>
  input.telemetry.emit(config, "attune.fuzz.joern_import_completed", {
    batchIndex: input.batchIndex,
    caseCount: input.caseCount,
    durationMs: input.durationMs,
    joernWorkerId: input.joernWorkerId,
    projectName: input.projectName,
    projectPath: input.projectPath,
    shardCount: input.shardCount,
    shardIndex: input.shardIndex,
    workspacePath: input.workspacePath,
    workerId: input.workerId,
    "otel.parent_span_id": input.workerSpanId,
    "otel.span_id": makeFuzzTrace().spanId,
    "otel.trace_id": input.traceId,
  })

const runJoernShard = (
  input: Readonly<{
    readonly batchIndex: number
    readonly config: FuzzerRunConfig
    readonly firstCase: SemanticCase | undefined
    readonly joernMode: "import" | "query"
    readonly joernShard: readonly FuzzCase[]
    readonly oracle: FuzzOracleService
    readonly shardCount: number
    readonly shardIndex: number
    readonly telemetry: FuzzTelemetryService
    readonly traceId: string
    readonly workerId: string
    readonly workerSpanId: string
  }>,
): Effect.Effect<void> =>
  Effect.gen(function* runJoernShard() {
    const oracleStartedAt = Date.now()
    yield* input.telemetry.emit(input.config, "attune.fuzz.joern_import_started", {
      batchIndex: input.batchIndex,
      caseCount: input.joernShard.length,
      shardCount: input.shardCount,
      shardIndex: input.shardIndex,
      workerId: input.workerId,
      "otel.parent_span_id": input.workerSpanId,
      "otel.span_id": makeFuzzTrace().spanId,
      "otel.trace_id": input.traceId,
    })
    yield* input.telemetry.flush

    if (input.joernMode === "import") {
      const importResult = yield* Effect.either(input.oracle.importJoernProject(input.joernShard))
      if (importResult._tag === "Left") {
        yield* emitCounterexampleEvents({
          batchIndex: input.batchIndex,
          error: importResult.left,
          failureClass: "joern-import",
          firstCase: input.firstCase,
          shardIndex: input.shardIndex,
          telemetry: input.telemetry,
          traceId: input.traceId,
          workerId: input.workerId,
          workerSpanId: input.workerSpanId,
        }, input.config)
        return
      }
      yield* emitJoernImportCompleted({
        ...importResult.right,
        batchIndex: input.batchIndex,
        durationMs: Date.now() - oracleStartedAt,
        joernWorkerId: importResult.right.workerId,
        shardCount: input.shardCount,
        shardIndex: input.shardIndex,
        telemetry: input.telemetry,
        traceId: input.traceId,
        workerId: input.workerId,
        workerSpanId: input.workerSpanId,
      }, input.config)
      yield* input.telemetry.flush
      return
    }

    const oracleResult = yield* Effect.either(input.oracle.runJoernQueries(input.joernShard, {
      ...(input.config.queryBudget === undefined ? {} : { queryBudget: input.config.queryBudget }),
      ...(input.config.queryFeedback === undefined ? {} : { queryFeedback: input.config.queryFeedback }),
    }))
    if (oracleResult._tag === "Left") {
      yield* emitCounterexampleEvents({
        batchIndex: input.batchIndex,
        error: oracleResult.left,
        failureClass: "oracle-disagreement",
        firstCase: input.firstCase,
        shardIndex: input.shardIndex,
        telemetry: input.telemetry,
        traceId: input.traceId,
        workerId: input.workerId,
        workerSpanId: input.workerSpanId,
      }, input.config)
      return
    }
    const durationMs = Date.now() - oracleStartedAt
    yield* emitJoernImportCompleted({
      ...oracleResult.right,
      batchIndex: input.batchIndex,
      durationMs,
      joernWorkerId: oracleResult.right.workerId,
      shardCount: input.shardCount,
      shardIndex: input.shardIndex,
      telemetry: input.telemetry,
      traceId: input.traceId,
      workerId: input.workerId,
      workerSpanId: input.workerSpanId,
    }, input.config)
    yield* input.telemetry.emit(input.config, "attune.fuzz.joern_oracle_completed", {
      batchIndex: input.batchIndex,
      caseCount: oracleResult.right.caseCount,
      durationMs,
      joernWorkerId: oracleResult.right.workerId,
      projectName: oracleResult.right.projectName,
      queryResults: oracleResult.right.queryResults,
      shardCount: input.shardCount,
      shardIndex: input.shardIndex,
      workerId: input.workerId,
      "otel.parent_span_id": input.workerSpanId,
      "otel.span_id": makeFuzzTrace().spanId,
      "otel.trace_id": input.traceId,
    })
    yield* Effect.forEach(
      oracleResult.right.queryResults,
      (queryResult) => input.telemetry.emit(input.config, "attune.fuzz.query_completed", {
        batchIndex: input.batchIndex,
        caseCount: oracleResult.right.caseCount,
        cpgql: queryResult.cpgql,
        joernWorkerId: oracleResult.right.workerId,
        projectName: oracleResult.right.projectName,
        queryFingerprint: queryResult.fingerprint,
        queryKind: queryResult.kind,
        queryName: queryResult.name,
        queryPreview: queryResult.preview,
        rowCount: queryResult.rowCount,
        shardCount: input.shardCount,
        shardIndex: input.shardIndex,
        workerId: input.workerId,
        "otel.parent_span_id": input.workerSpanId,
        "otel.span_id": makeFuzzTrace().spanId,
        "otel.trace_id": input.traceId,
      }),
    )
    yield* input.telemetry.flush
  })

const runJoernShards = (
  input: Readonly<{
    readonly acceptedFuzzCases: readonly FuzzCase[]
    readonly acceptedSemanticCases: readonly SemanticCase[]
    readonly batchIndex: number
    readonly config: FuzzerRunConfig
    readonly joernMode: "import" | "none" | "query"
    readonly joernShardSize: number
    readonly oracle: FuzzOracleService
    readonly telemetry: FuzzTelemetryService
    readonly traceId: string
    readonly workerId: string
    readonly workerSpanId: string
  }>,
): Effect.Effect<void> =>
  Effect.gen(function* runJoernShards() {
    if (input.joernMode === "none" || input.acceptedFuzzCases.length === 0) {return}
    const joernMode = input.joernMode === "import" ? "import" : "query"
    const joernShards = chunksBySize(input.acceptedFuzzCases, input.joernShardSize)
    yield* Effect.forEach(
      joernShards,
      (joernShard, shardIndex) => runJoernShard({
        batchIndex: input.batchIndex,
        config: input.config,
        firstCase: input.acceptedSemanticCases[0],
        joernMode,
        joernShard,
        oracle: input.oracle,
        shardCount: joernShards.length,
        shardIndex,
        telemetry: input.telemetry,
        traceId: input.traceId,
        workerId: input.workerId,
        workerSpanId: input.workerSpanId,
      }),
      { concurrency: 1 },
    )
  })

const runSemanticWorker = (
  input: Readonly<{
    readonly admitter: SemanticAdmitterService
    readonly batchIndex: number
    readonly batchTraceSpanId: string
    readonly config: FuzzerRunConfig
    readonly joernMode: "import" | "none" | "query"
    readonly joernShardSize: number
    readonly mutator: SemanticMutatorService
    readonly oracle: FuzzOracleService
    readonly planChunkCount: number
    readonly telemetry: FuzzTelemetryService
    readonly traceId: string
    readonly workerIndex: number
    readonly workerPlans: readonly SemanticCasePlan[]
  }>,
): Effect.Effect<WorkerSummary> =>
  Effect.gen(function* runSemanticWorker() {
    const workerId = `semantic-worker-${input.workerIndex}`
    const workerTrace = makeFuzzTrace()
    yield* input.telemetry.emit(input.config, "attune.fuzz.worker_started", {
      batchIndex: input.batchIndex,
      caseCount: input.workerPlans.length,
      mode: input.config.mode,
      workerId,
      "otel.parent_span_id": input.batchTraceSpanId,
      "otel.span_id": workerTrace.spanId,
      "otel.trace_id": input.traceId,
    })
    yield* input.telemetry.flush

    let accepted = 0
    let rejected = 0
    const acceptedSemanticCases: SemanticCase[] = []
    const acceptedFuzzCases: FuzzCase[] = []

    for (const [caseIndex, plan] of input.workerPlans.entries()) {
      const spanId = makeFuzzTrace().spanId
      const globalCaseIndex = input.workerIndex + caseIndex * input.planChunkCount
      const result = yield* input.mutator.applyDetailed(plan)
      const semanticCase = result.case
      yield* emitGeneratedCaseEvents({
        batchIndex: input.batchIndex,
        caseIndex: globalCaseIndex,
        result,
        spanId,
        telemetry: input.telemetry,
        traceId: input.traceId,
        workerId,
        workerSpanId: workerTrace.spanId,
      }, input.config)
      const admission = yield* admitGeneratedCase({
        admitter: input.admitter,
        batchIndex: input.batchIndex,
        caseIndex: globalCaseIndex,
        semanticCase,
        spanId,
        telemetry: input.telemetry,
        traceId: input.traceId,
        workerId,
        workerSpanId: workerTrace.spanId,
      }, input.config)
      if (admission.accepted) {
        accepted += 1
        acceptedSemanticCases.push(semanticCase)
        acceptedFuzzCases.push(...admission.fuzzCases)
      } else {
        rejected += 1
      }
    }

    yield* runJoernShards({
      acceptedFuzzCases,
      acceptedSemanticCases,
      batchIndex: input.batchIndex,
      config: input.config,
      joernMode: input.joernMode,
      joernShardSize: input.joernShardSize,
      oracle: input.oracle,
      telemetry: input.telemetry,
      traceId: input.traceId,
      workerId,
      workerSpanId: workerTrace.spanId,
    })

    yield* input.telemetry.emit(input.config, "attune.fuzz.worker_completed", {
      accepted,
      batchIndex: input.batchIndex,
      caseCount: input.workerPlans.length,
      rejected,
      workerId,
      "otel.parent_span_id": input.batchTraceSpanId,
      "otel.span_id": workerTrace.spanId,
      "otel.trace_id": input.traceId,
    })
    yield* input.telemetry.flush
    return { accepted, rejected }
  })

export const makeSemanticFuzzScheduler = (runtime: PropertyHarnessConfig): SemanticFuzzSchedulerService => ({
  run: (config) => Effect.gen(function* runFuzzPipeline() {
    const corpus = yield* SemanticCorpusStore
    const mutator = yield* SemanticMutator
    const admitter = yield* SemanticAdmitter
    const oracle = yield* FuzzOracle
    const telemetry = yield* FuzzTelemetry
    const trace = makeFuzzTrace()
    const workerCount = runtime.workerCount
    const batchCount = Math.max(1, config.batchCount ?? 1)
    const joernShardSize = Math.max(1, config.joernShardSize ?? Number.MAX_SAFE_INTEGER)
    const maxMutators = Math.max(1, config.maxMutators ?? 4)
    const joernMode = config.joernMode ?? (config.mode === "smoke" ? "none" : "query")

      yield* telemetry.emit(config, "attune.fuzz.run_started", {
        batchCount,
        caseCount: config.caseCount,
        joernMode,
        joernShardSize,
        maxMutators,
        mode: config.mode,
        queryBudget: config.queryBudget,
        queryFeedback: config.queryFeedback ?? true,
        seed: config.seed,
        seedIds: config.seedIds?.join(","),
        syntaxFlavors: config.syntaxFlavors?.join(","),
        workspaceRootPath: runtime.workspaceRootPath ?? "<node-tmpdir>",
        workerCount,
        "otel.span_id": trace.spanId,
        "otel.trace_id": trace.traceId,
    })
    yield* telemetry.flush

    const seeds = filterSeeds(yield* corpus.list, config)
    if (seeds.length === 0) {
      const reason = [
        "No corpus seeds matched fuzzer filters",
        config.seedIds === undefined ? undefined : `seedIds=${config.seedIds.join(",")}`,
        config.syntaxFlavors === undefined ? undefined : `syntaxFlavors=${config.syntaxFlavors.join(",")}`,
      ].filter((part) => part !== undefined).join("; ")
      yield* telemetry.emit(config, "attune.fuzz.corpus_filter_empty", {
        reason,
        seedIds: config.seedIds?.join(","),
        syntaxFlavors: config.syntaxFlavors?.join(","),
        "otel.parent_span_id": trace.spanId,
        "otel.span_id": makeFuzzTrace().spanId,
        "otel.trace_id": trace.traceId,
      })
      yield* telemetry.flush
      return yield* Effect.fail(new Error(reason))
    }
    yield* telemetry.emit(config, "attune.fuzz.corpus_selected", {
      seedCount: seeds.length,
      seedIds: seeds.map((seed) => seed.id).join(","),
      syntaxFlavors: [...new Set(seeds.flatMap((seed) => seed.files.map((file) => file.syntaxFlavor)))].join(","),
      "otel.parent_span_id": trace.spanId,
      "otel.span_id": makeFuzzTrace().spanId,
      "otel.trace_id": trace.traceId,
    })
    yield* telemetry.flush
    const batchSummaries = yield* Effect.forEach(
      Array.from({ length: batchCount }, (_, batchIndex) => batchIndex),
      (batchIndex) => Effect.gen(function* runSemanticBatch() {
        const batchSeed = config.seed + batchIndex
        const batchTrace = makeFuzzTrace()
        yield* telemetry.emit(config, "attune.fuzz.batch_started", {
          batchCount,
          batchIndex,
          caseCount: config.caseCount,
          joernShardSize,
          maxMutators,
          seed: batchSeed,
          "otel.parent_span_id": trace.spanId,
          "otel.span_id": batchTrace.spanId,
          "otel.trace_id": trace.traceId,
        })
        yield* telemetry.flush

        const plans = fc.sample(semanticCasePlanArbitrary(seeds, maxMutators), {
          numRuns: config.caseCount,
          seed: batchSeed,
        }).map((plan, sampleIndex) => ({
          ...plan,
          caseId: `${plan.caseId}-batch-${batchIndex}-sample-${sampleIndex}`,
          plan: {
            ...plan.plan,
            replay: {
              fastCheckPath: `semantic-seed:${batchSeed}:batch:${batchIndex}:sample:${sampleIndex}`,
              fastCheckSeed: batchSeed,
            },
          },
        }))
        const planChunks = chunksFor(plans, workerCount)

        const workerSummaries = yield* Effect.forEach(
          planChunks,
          (workerPlans, workerIndex) => runSemanticWorker({
            admitter,
            batchIndex,
            batchTraceSpanId: batchTrace.spanId,
            config,
            joernMode,
            joernShardSize,
            mutator,
            oracle,
            planChunkCount: planChunks.length,
            telemetry,
            traceId: trace.traceId,
            workerIndex,
            workerPlans,
          }),
          { concurrency: workerCount },
        )
        const batchSummary = {
          accepted: workerSummaries.reduce((sum, worker) => sum + worker.accepted, 0),
          cases: plans.length,
          rejected: workerSummaries.reduce((sum, worker) => sum + worker.rejected, 0),
        }
        yield* telemetry.emit(config, "attune.fuzz.batch_completed", {
          ...batchSummary,
          batchCount,
          batchIndex,
          "otel.parent_span_id": trace.spanId,
          "otel.span_id": batchTrace.spanId,
          "otel.trace_id": trace.traceId,
        })
        yield* telemetry.flush
        return batchSummary
      }),
      { concurrency: 1 },
    )

    const summary = {
      accepted: batchSummaries.reduce((sum, batch) => sum + batch.accepted, 0),
      batches: batchCount,
      cases: batchSummaries.reduce((sum, batch) => sum + batch.cases, 0),
      mode: config.mode,
      rejected: batchSummaries.reduce((sum, batch) => sum + batch.rejected, 0),
      seed: config.seed,
    }
    yield* telemetry.emit(config, "attune.fuzz.run_completed", {
      ...runPayload(summary, trace.traceId, trace.spanId),
      batchCount,
      joernShardSize,
      maxMutators,
      workerCount,
    })
    yield* telemetry.flush
    return summary
  }),
})

export const SemanticFuzzSchedulerLive: Layer.Layer<SemanticFuzzScheduler, never, PropertyHarnessRuntime> = Layer.effect(
  SemanticFuzzScheduler,
  PropertyHarnessRuntime.pipe(Effect.map(makeSemanticFuzzScheduler)),
)

export type FuzzPipelineRunnerService = SemanticFuzzSchedulerService
export const FuzzPipelineRunner = SemanticFuzzScheduler
export const makeFuzzPipelineRunner = makeSemanticFuzzScheduler
export const FuzzPipelineRunnerLive = SemanticFuzzSchedulerLive

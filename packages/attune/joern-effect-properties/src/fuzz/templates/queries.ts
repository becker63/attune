import { Effect } from "effect"
import { CpgProgram, GraphWeights, cpg, prop } from "joern-effect"
import type { CompiledCpgProgram, CpgProgramDefinition } from "joern-effect"
import type { FuzzCase } from "../domain/model.js"
import type { QueryFeedbackSnapshot } from "../services/queryFeedback.js"

type DslProgramKind = "rows" | "graph-facts" | "findings" | "protocol-deviations"
type RowRoot = "call" | "controlStructure" | "identifier" | "literal" | "method" | "typeDecl"
type GraphOperation = "boundary" | "bridge" | "findings" | "neighborhood" | "protocol"

export type DslGenerationOptions = Readonly<{
  readonly budget?: number
  readonly feedback?: QueryFeedbackSnapshot
}>

export type GeneratedDslProgram<Out> = Readonly<{
  readonly fingerprint: string
  readonly kind: DslProgramKind
  readonly name: string
  readonly program: CpgProgramDefinition<Out, never>
}>

export type CompiledDslProgram<Out> = Readonly<{
  readonly cpgql: string
  readonly fingerprint: string
  readonly kind: DslProgramKind
  readonly name: string
  readonly preview: string
  readonly program: CpgProgramDefinition<Out, never>
}>

type RowPlan = Readonly<{
  readonly pattern: string
  readonly root: RowRoot
  readonly take: number
  readonly variant: "plain" | "repeat-ast-parent" | "signal-where"
}>

type GraphPlan = Readonly<{
  readonly distance: number
  readonly includeArgument: boolean
  readonly includeMethod: boolean
  readonly includePath: boolean
  readonly operation: GraphOperation
  readonly sinkPattern: string
  readonly sourcePattern: string
  readonly take: number
}>

const hashText = (value: string): number => {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

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

const compileProgram = <Out>(
  generated: GeneratedDslProgram<Out>,
): Effect.Effect<CompiledDslProgram<Out>> =>
  CpgProgram.compile(generated.program).pipe(
    Effect.map((compiled: CompiledCpgProgram<Out>) => ({
      cpgql: compiled.cpgql,
      fingerprint: generated.fingerprint,
      kind: generated.kind,
      name: generated.name,
      preview: previewCpgql(compiled.cpgql),
      program: generated.program,
    })),
  )

const slug = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]+/gu, "-").replace(/^-|-$/gu, "").toLowerCase()

const rowFingerprint = (plan: RowPlan): string =>
  [
    "generated",
    "row",
    plan.root,
    slug(plan.pattern),
    plan.variant,
    `take-${plan.take}`,
  ].join("-")

const graphFingerprint = (plan: GraphPlan): string =>
  [
    "generated",
    "graph",
    plan.operation,
    slug(plan.sourcePattern),
    slug(plan.sinkPattern),
    `distance-${plan.distance}`,
    plan.includeMethod ? "method" : "no-method",
    plan.includeArgument ? "argument" : "no-argument",
    plan.includePath ? "path" : "no-path",
    `take-${plan.take}`,
  ].join("-")

const rowProgramFor = (plan: RowPlan): GeneratedDslProgram<readonly unknown[]> => ({
  fingerprint: rowFingerprint(plan),
  kind: "rows",
  name: rowFingerprint(plan),
  program: CpgProgram.effect(
    `generated row ${plan.root} ${plan.variant}`,
    Effect.gen(function* generatedRowProgram() {
      if (plan.root === "call") {
        const traversal = yield* (
          plan.variant === "signal-where"
            ? cpg.call.name(".*").where((node) => node.code(plan.pattern)).dedup.take(plan.take)
            : cpg.call.name(plan.pattern).dedup.take(plan.take)
        ).as(`generated ${plan.root}`)
        return yield* traversal.toRows({
          code: prop.code,
          method: prop.methodFullName,
          name: prop.name,
          type: prop.typeFullName,
        })
      }
      if (plan.root === "identifier") {
        if (plan.variant === "repeat-ast-parent") {
          const traversal = yield* cpg.identifier.name(plan.pattern).repeat((node) => node.astParent).maxDepth(2).dedup.take(plan.take).as(`generated ${plan.root}`)
          return yield* traversal.toRows({
            code: prop.code,
          })
        }
        const traversal = yield* (
          cpg.identifier.name(plan.pattern).dedup.take(plan.take)
        ).as(`generated ${plan.root}`)
        return yield* traversal.toRows({
          code: prop.code,
          name: prop.name,
          type: prop.typeFullName,
        })
      }
      if (plan.root === "literal") {
        const traversal = yield* cpg.literal.code(plan.pattern).dedup.take(plan.take).as(`generated ${plan.root}`)
        return yield* traversal.toRows({
          code: prop.code,
          type: prop.typeFullName,
        })
      }
      if (plan.root === "method") {
        const traversal = yield* cpg.method.name(plan.pattern).dedup.take(plan.take).as(`generated ${plan.root}`)
        return yield* traversal.toRows({
          code: prop.code,
          fullName: prop.fullName,
          name: prop.name,
          signature: prop.signature,
        })
      }
      if (plan.root === "typeDecl") {
        const traversal = yield* cpg.typeDecl.fullName(plan.pattern).dedup.take(plan.take).as(`generated ${plan.root}`)
        return yield* traversal.toRows({
          fullName: prop.fullName,
          name: prop.name,
        })
      }
      const traversal = yield* cpg.controlStructure.controlStructureType(plan.pattern).dedup.take(plan.take).as(`generated ${plan.root}`)
      return yield* traversal.toRows({
        code: prop.code,
        kind: prop.controlStructureType,
        parser: prop.parserTypeName,
      })
    }),
  ),
})

const materializedGraphFor = (plan: GraphPlan) =>
  CpgProgram.effect(
    `generated graph ${plan.operation}`,
    Effect.gen(function* generatedGraphProgram() {
      const sources = yield* cpg.call.name(plan.sourcePattern).dedup.take(plan.take).as("generated graph sources")
      const sinks = yield* cpg.call.name(plan.sinkPattern).dedup.take(plan.take).as("generated graph sinks")
      let graphBuilder = sinks.materializeGraph(`generated ${plan.operation} graph`).including(sources)
      if (plan.includeMethod) {
        graphBuilder = graphBuilder.including((node) => node.method)
      }
      if (plan.includeArgument) {
        graphBuilder = graphBuilder.including((node) => node.argument)
      }
      if (plan.includePath) {
        graphBuilder = graphBuilder.includingPath()
      }
      const graph = yield* graphBuilder.as(`generated ${plan.operation} materialized graph`)

      if (plan.operation === "bridge") {
        const bridges = yield* graph.centrality.bridgeNodes()
        return yield* graph.toGraphFacts().from(bridges).all()
      }
      if (plan.operation === "boundary") {
        const boundary = yield* graph.boundaries.crossedBetween(sources, sinks)
        return yield* graph.toGraphFacts().from(boundary).all()
      }
      if (plan.operation === "findings") {
        const path = yield* graph.paths.shortest().from(sources).to(sinks).weightedBy(GraphWeights.preferDataFlowEdges()).as("generated graph shortest path")
        return yield* path.toFindings().withSource(sources).withSink(sinks).withRoot(sinks)
      }
      if (plan.operation === "protocol") {
        return yield* graph.toProtocolDeviations().withRoot(sinks).withPresentSteps(sinks).withMissingSteps(sources)
      }
      const neighborhood = yield* graph.neighborhood.around(sinks).withinDistance(plan.distance)
      return yield* graph.toGraphFacts().from(neighborhood).all()
    }),
  )

const graphProgramFor = (plan: GraphPlan): GeneratedDslProgram<readonly unknown[]> => ({
  fingerprint: graphFingerprint(plan),
  kind: plan.operation === "findings"
    ? "findings"
    : plan.operation === "protocol"
      ? "protocol-deviations"
      : "graph-facts",
  name: graphFingerprint(plan),
  program: materializedGraphFor(plan),
})

const rowPatterns = [
  ".*",
  "sink",
  "source",
  "handler",
  ".*(sink|source).*",
  ".*(token|secret|password|api[_-]?key).*",
] as const

const rowRoots = [
  "call",
  "identifier",
  "literal",
  "method",
  "typeDecl",
  "controlStructure",
] as const

const rowVariants = [
  "plain",
  "repeat-ast-parent",
  "signal-where",
] as const

const takes = [10, 25, 50, 100] as const

const rowPlans = (): readonly RowPlan[] =>
  rowRoots.flatMap((root) =>
    rowPatterns.flatMap((pattern) =>
      rowVariants
        .filter((variant) =>
          variant === "repeat-ast-parent"
            ? root === "identifier"
            : variant === "signal-where"
              ? root === "call"
              : true,
        )
        .flatMap((variant) =>
          takes.map((take) => ({ pattern, root, take, variant })),
        ),
    ),
  )

const graphPlans = (): readonly GraphPlan[] => {
  const sourcePatterns = ["source", ".*source.*", ".*"] as const
  const sinkPatterns = ["sink", ".*sink.*", ".*(sink|exec|spawn|eval).*"] as const
  const operations = ["boundary", "bridge", "findings", "neighborhood", "protocol"] as const
  return operations.flatMap((operation) =>
    sourcePatterns.flatMap((sourcePattern) =>
      sinkPatterns.flatMap((sinkPattern) =>
        [1, 2, 3].flatMap((distance) =>
          [true, false].flatMap((includeMethod) =>
            [true, false].flatMap((includeArgument) =>
              [true, false].map((includePath) => ({
                distance,
                includeArgument,
                includeMethod,
                includePath,
                operation,
                sinkPattern,
                sourcePattern,
                take: distance === 3 ? 20 : 35,
              })),
            ),
          ),
        ),
      ),
    ),
  )
}

const allGeneratedPrograms = (): readonly GeneratedDslProgram<readonly unknown[]>[] => [
  ...rowPlans().map(rowProgramFor),
  ...graphPlans().map(graphProgramFor),
]

const feedbackScore = (
  program: GeneratedDslProgram<readonly unknown[]>,
  feedback: QueryFeedbackSnapshot | undefined,
): number => {
  const entry = feedback?.entries[program.fingerprint]
  const count = entry?.count ?? 0
  const rows = entry?.rows ?? 0
  const graphBoost = program.kind === "rows" ? 0 : 250
  const productiveBoost = Math.min(rows, 10_000) / 100
  return (count * 1_000) - graphBoost - productiveBoost
}

const chooseGeneratedPrograms = (
  cases: readonly FuzzCase[],
  options: DslGenerationOptions,
): readonly GeneratedDslProgram<readonly unknown[]>[] => {
  const budget = Math.max(0, Math.floor(options.budget ?? 4))
  if (budget === 0) {
    return []
  }
  const seedText = cases.map((fuzzCase) => fuzzCase.caseId).join("|")
  const orderPrograms = (
    programs: readonly GeneratedDslProgram<readonly unknown[]>[],
  ): readonly GeneratedDslProgram<readonly unknown[]>[] =>
    [...programs]
    .sort((left, right) => {
      const score = feedbackScore(left, options.feedback) - feedbackScore(right, options.feedback)
      if (score !== 0) {
        return score
      }
      return hashText(`${left.fingerprint}|${seedText}`) - hashText(`${right.fingerprint}|${seedText}`)
    })
  const candidates = allGeneratedPrograms()
  const graphBudget = budget >= 4 ? Math.max(1, Math.floor(budget / 3)) : 0
  const graphPrograms = orderPrograms(candidates.filter((program) => program.kind !== "rows"))
    .slice(0, graphBudget)
  const selectedFingerprints = new Set(graphPrograms.map((program) => program.fingerprint))
  const remainingPrograms = orderPrograms(candidates.filter((program) => !selectedFingerprints.has(program.fingerprint)))
    .slice(0, Math.max(0, budget - graphPrograms.length))
  return [...graphPrograms, ...remainingPrograms]
}

export const compileGeneratedDslPrograms = (
  cases: readonly FuzzCase[],
  options: DslGenerationOptions = {},
): Effect.Effect<readonly CompiledDslProgram<readonly unknown[]>[]> =>
  Effect.forEach(chooseGeneratedPrograms(cases, options), compileProgram)

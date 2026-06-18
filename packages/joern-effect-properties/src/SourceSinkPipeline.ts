import { access, constants, mkdir, mkdtemp, rm, statfs, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { Data, Effect, Schema } from "effect"
import {
  CpgGraph,
  CpgProgram,
  EnvVars,
  EvidenceGraph,
  Joern,
  JoernDecodeError,
  JoernError,
  Query,
  cpg,
  envFlagEnabled,
  escapeScalaString,
  makeJoernClient,
  prop,
  readEnv,
  renderImportCode,
  type GraphAnalysisError,
  type GraphMaterializationError,
} from "joern-effect"
import { parseSync } from "oxc-parser"
import {
  makePropertyEvent,
  propertyEventBase,
  propertyRunId,
  writePropertyEvent,
} from "./events.js"

type JoernClient = ReturnType<typeof makeJoernClient>

const pipelineEventBase = () =>
  propertyEventBase({
    invariantId: "programs-use-boundaries",
    phase: "edge",
    target: "joern-effect-properties:property",
  }, propertyRunId())

const emitPipelineEvent = (
  stage: string,
  scenario: SourceSinkScenario,
  payload: Readonly<Record<string, unknown>> = {},
): void => {
  writePropertyEvent(makePropertyEvent(pipelineEventBase(), {
    eventType: "attune.property.pipeline_stage",
    payload: {
      scenarioId: scenario.id,
      stage,
      syntaxFlavor: scenario.syntaxFlavor,
      ...payload,
    },
  }))
}

export type Classification =
  | "finding"
  | "safe"
  | "near-miss"
  | "unsupported"
  | "needs-hybrid-engine"

export type EngineSelection =
  | "joern"
  | "oxc"
  | "oxlint"
  | "ast-grep"
  | "hybrid-oxc-joern"
  | "not-ready"

export type RelationKind =
  | "dataflow"
  | "import"
  | "call"
  | "contains"
  | "contained-by"
  | "controls"
  | "dominates"
  | "precedes"
  | "same-method"
  | "same-file"
  | "same-neighborhood"
  | "crosses-boundary"
  | "location-decode"

export class AnchorObservation extends Schema.Class<AnchorObservation>("AnchorObservation")({
  kind: Schema.Literal(
    "request-parameter",
    "provider-call",
    "throwable-operation",
    "client-file",
    "jsx-attribute",
    "schema-decode-step",
    "auth-guard",
    "raw-database-result",
    "call",
    "effect-region",
    "module",
    "api-boundary",
  ),
  pattern: Schema.String,
}) {}

export class RelationObservation extends Schema.Class<RelationObservation>("RelationObservation")({
  kind: Schema.Literal(
    "dataflow",
    "import",
    "call",
    "contains",
    "contained-by",
    "controls",
    "dominates",
    "precedes",
    "same-method",
    "same-file",
    "same-neighborhood",
    "crosses-boundary",
    "location-decode",
  ),
}) {}

export class ContextObservation extends Schema.Class<ContextObservation>("ContextObservation")({
  kind: Schema.Literal("expected", "missing", "forbidden", "nearby"),
  pattern: Schema.String,
}) {}

export type SourceToSinkExpected =
  | "Unsafe"
  | "SafeBecauseSanitizedOnPath"
  | "UnsafeBecauseSafetyNearbyOnly"
  | "UnsafeBecauseSafetyAfterSink"
  | "SafeBecauseLiteralSinkArgument"
  | "IgnoredBecauseTestFile"
  | "IgnoredBecauseGeneratedFile"

export type SourceSinkScenarioInput = {
  readonly id: string
  readonly functionName: string
  readonly parameterName: string
  readonly accessPath: readonly string[]
  readonly aliasChainLength: number
  readonly sinkCallee: string
  readonly sanitizerCallee?: string
  readonly safetyPlacement: "none" | "on-path" | "nearby" | "after-sink"
  readonly literalSinkArgument: boolean
  readonly fileZone: "application" | "test" | "generated"
  readonly syntaxFlavor: "ts" | "tsx" | "jsx"
  readonly expected: SourceToSinkExpected
}

export type SourceFile = {
  readonly path: string
  readonly text: string
}

export type RoleTable = {
  readonly sourcePattern: string
  readonly sinkPattern: string
  readonly sanitizerPattern: string
  readonly sourceRole: string
  readonly sinkRole: string
}

export class SourceSinkScenario extends Data.TaggedClass("SourceSinkScenario")<SourceSinkScenarioInput> {
  render() {
    return ScenarioSteps.render(this)
  }
}

export class RenderedCase extends Data.TaggedClass("RenderedCase")<{
  readonly scenario: SourceSinkScenario
  readonly files: readonly SourceFile[]
  readonly roles: RoleTable
}> {
  admitWithOxc() {
    return ScenarioSteps.admitWithOxc(this)
  }
}

export type OxcShapeSignature = {
  readonly accepted: boolean
  readonly syntax: "ts" | "tsx" | "jsx"
  readonly constructs: readonly string[]
  readonly files: readonly {
    readonly path: string
    readonly constructs: readonly string[]
  }[]
}

export class OxcAcceptedCase extends Data.TaggedClass("OxcAcceptedCase")<{
  readonly scenario: SourceSinkScenario
  readonly files: readonly SourceFile[]
  readonly roles: RoleTable
  readonly oxcShape: OxcShapeSignature
}> {
  importWithJoern() {
    return ScenarioSteps.importWithJoern(this)
  }
}

export type WrittenRepo = {
  readonly path: string
  readonly bytes: number
  readonly filesystem: "/dev/shm" | "tmpfs" | "tmp"
  readonly freeBytes: number
}

const WrittenRepoSchema: Schema.Schema<WrittenRepo> = Schema.Struct({
  bytes: Schema.Number,
  filesystem: Schema.Literal("/dev/shm", "tmpfs", "tmp"),
  freeBytes: Schema.Number,
  path: Schema.String,
})

export class JoernImportedCase extends Data.TaggedClass("JoernImportedCase")<{
  readonly scenario: SourceSinkScenario
  readonly files: readonly SourceFile[]
  readonly roles: RoleTable
  readonly oxcShape: OxcShapeSignature
  readonly repo: WrittenRepo
}> {
  compareDslAndRaw() {
    return ScenarioSteps.compareDslAndRaw(this)
  }
}

export class CanonicalRow extends Schema.Class<CanonicalRow>("CanonicalRow")({
  code: Schema.String,
  file: Schema.NullOr(Schema.String),
  line: Schema.NullOr(Schema.Number),
  name: Schema.NullOr(Schema.String),
}) {}

export type CanonicalRowInput = {
  readonly code: string
  readonly name: string | null
  readonly file: string | null
  readonly line: number | null
}

export class OracleComparison extends Schema.Class<OracleComparison>("OracleComparison")({
  dslRows: Schema.Array(CanonicalRow),
  emittedCpgql: Schema.String,
  rawCpgql: Schema.String,
  rawRows: Schema.Array(CanonicalRow),
  result: Schema.Literal("Agreed", "Disagreed"),
}) {}

export class ComparedCase extends Data.TaggedClass("ComparedCase")<{
  readonly scenario: SourceSinkScenario
  readonly files: readonly SourceFile[]
  readonly roles: RoleTable
  readonly oxcShape: OxcShapeSignature
  readonly repo: WrittenRepo
  readonly comparison: OracleComparison
}> {
  materializeGraph() {
    return ScenarioSteps.materializeGraph(this)
  }
}

export class GraphFactSignature extends Schema.Class<GraphFactSignature>("GraphFactSignature")({
  danglingEdges: Schema.Array(Schema.String),
  edgeCount: Schema.Number,
  edgeKinds: Schema.Array(Schema.String),
  hasSinkAnchor: Schema.Boolean,
  hasSourceAnchor: Schema.Boolean,
  nodeCount: Schema.Number,
  nodeKinds: Schema.Array(Schema.String),
}) {}

export class MaterializedCase extends Data.TaggedClass("MaterializedCase")<{
  readonly scenario: SourceSinkScenario
  readonly files: readonly SourceFile[]
  readonly roles: RoleTable
  readonly oxcShape: OxcShapeSignature
  readonly comparison: OracleComparison
  readonly graph: Schema.Schema.Type<typeof EvidenceGraph>
  readonly graphFacts: GraphFactSignature
  readonly repo: WrittenRepo
}> {
  classify() {
    return ScenarioSteps.classify(this)
  }
}

export type ActualClassification = {
  readonly classification: Classification
  readonly bestEngine: EngineSelection
  readonly reliability: "stable" | "stable-with-workaround" | "unstable" | "unsupported"
}

export class ClassifiedCase extends Data.TaggedClass("ClassifiedCase")<{
  readonly scenario: SourceSinkScenario
  readonly oxcShape: OxcShapeSignature
  readonly comparison: OracleComparison
  readonly graph: Schema.Schema.Type<typeof EvidenceGraph>
  readonly graphFacts: GraphFactSignature
  readonly repo: WrittenRepo
  readonly classification: ActualClassification
}> {
  toObservation() {
    return ScenarioSteps.toObservation(this)
  }
}

export class SourceSinkObservation extends Schema.Class<SourceSinkObservation>("SourceSinkObservation")({
  bestEngine: Schema.Literal("joern", "oxc", "oxlint", "ast-grep", "hybrid-oxc-joern", "not-ready"),
  classification: Schema.Literal("finding", "safe", "near-miss", "unsupported", "needs-hybrid-engine"),
  evidence: Schema.Struct({
    comparison: OracleComparison,
    graph: EvidenceGraph,
    graphFacts: GraphFactSignature,
  }),
  expectedContext: Schema.Array(ContextObservation),
  forbiddenContext: Schema.Array(ContextObservation),
  id: Schema.String,
  missingContext: Schema.Array(ContextObservation),
  nearbyContext: Schema.Array(ContextObservation),
  relation: RelationObservation,
  repo: WrittenRepoSchema,
  sink: AnchorObservation,
  source: AnchorObservation,
  taxonomy: Schema.Array(Schema.String),
}) {}

export class OxcRejected extends Data.TaggedError("OxcRejected")<{
  readonly scenario: SourceSinkScenario
  readonly error: unknown
}> {}

export class JoernImportFailed extends Data.TaggedError("JoernImportFailed")<{
  readonly scenario: SourceSinkScenario
  readonly error: unknown
}> {}

export class RawDslDisagreement extends Data.TaggedError("RawDslDisagreement")<{
  readonly scenario: SourceSinkScenario
  readonly comparison: OracleComparison
}> {}

export class GraphInvariantFailed extends Data.TaggedError("GraphInvariantFailed")<{
  readonly scenario: SourceSinkScenario
  readonly graph: Schema.Schema.Type<typeof EvidenceGraph>
  readonly invariant: string
}> {}

export type SourceSinkCaseFailure =
  | OxcRejected
  | JoernImportFailed
  | RawDslDisagreement
  | GraphInvariantFailed

export type TerminalResult =
  | { readonly _tag: "Observation"; readonly observation: SourceSinkObservation }
  | { readonly _tag: "CandidateReport"; readonly report: RecipeCandidateReport }
  | { readonly _tag: "CapabilityNote"; readonly note: CapabilityReport }
  | { readonly _tag: "EngineeringBug"; readonly bug: EngineeringBugReport }

export const Terminal = {
  CandidateReport: (args: { readonly report: RecipeCandidateReport }): TerminalResult => ({
    _tag: "CandidateReport",
    ...args,
  }),
  CapabilityNote: (args: { readonly note: CapabilityReport }): TerminalResult => ({
    _tag: "CapabilityNote",
    ...args,
  }),
  EngineeringBug: (args: { readonly bug: EngineeringBugReport }): TerminalResult => ({
    _tag: "EngineeringBug",
    ...args,
  }),
  Observation: (args: { readonly observation: SourceSinkObservation }): TerminalResult => ({
    _tag: "Observation",
    ...args,
  }),
}

export class RecipeCandidateReport extends Schema.Class<RecipeCandidateReport>("RecipeCandidateReport")({
  id: Schema.String,
  observedProblem: Schema.String,
  status: Schema.Literal("candidate", "needs-human-review", "needs-agent-draft", "validated", "promoted", "rejected"),
  suggestedTemplate: Schema.String,
  taxonomyCandidates: Schema.Array(Schema.String),
  title: Schema.String,
  validationPlan: Schema.Struct({
    corpusCases: Schema.Array(Schema.String),
    freshGenerators: Schema.Array(Schema.String),
    metamorphicTransforms: Schema.Array(Schema.String),
    requiredNearMisses: Schema.Array(Schema.String),
    requiredInvariants: Schema.Array(Schema.String),
    minimumFreshCases: Schema.Number,
  }),
}) {}

export class CapabilityReport extends Schema.Class<CapabilityReport>("CapabilityReport")({
  details: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  id: Schema.String,
  recommendedEngine: Schema.String,
  reliability: Schema.String,
  title: Schema.String,
}) {}

export class EngineeringBugReport extends Schema.Class<EngineeringBugReport>("EngineeringBugReport")({
  details: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  failureClass: Schema.String,
  id: Schema.String,
  title: Schema.String,
}) {}

const normalizePath = (path: string | null | undefined): string | null =>
  path ? path.replace(/\\/gu, "/") : null

const debug = (...args: readonly unknown[]): void => {
  if (envFlagEnabled(EnvVars.JoernEffectDebug)) {console.log("[source-sink]", ...args)}
}

const normalizeCode = (code: string | null | undefined): string =>
  (code ?? "").replace(/\s+/gu, " ").trim()

const canonicalizeRows = (rows: readonly CanonicalRowInput[]): readonly CanonicalRow[] =>
  [...rows]
    .map((row) => new CanonicalRow({
      code: normalizeCode(row.code),
      file: normalizePath(row.file),
      line: row.line ?? null,
      name: row.name ?? null,
    }))
    .toSorted((a, b) =>
      `${a.file ?? ""}:${a.line ?? ""}:${a.name ?? ""}:${a.code}`.localeCompare(
        `${b.file ?? ""}:${b.line ?? ""}:${b.name ?? ""}:${b.code}`,
      ),
    )

const renderJsxSource = (scenario: SourceSinkScenario): string => {
  const sourceAccess = [scenario.parameterName, ...scenario.accessPath].join(".")
  const sanitizer = scenario.sanitizerCallee ?? "sanitize"
  const componentName = `${scenario.functionName}View`
  const jsxLines = [
    `function ${scenario.sinkCallee}(value) { return value }`,
    `function ${sanitizer}(value) { return value }`,
    `export function ${scenario.functionName}(${scenario.parameterName}) {`,
  ]

  if (scenario.fileZone === "generated") {jsxLines.push("  // generated file")}
  if (scenario.safetyPlacement === "nearby") {jsxLines.push(`  ${sanitizer}(${scenario.parameterName}.other)`)}

  let current = sourceAccess
  if (scenario.safetyPlacement === "on-path") {current = `${sanitizer}(${current})`}
  for (let index = 0; index < scenario.aliasChainLength; index++) {
    const name = `command${index}`
    jsxLines.push(`  const ${name} = ${current}`)
    current = name
  }

  const argument = scenario.literalSinkArgument ? JSON.stringify("literal-command") : current
  jsxLines.push(`  const rendered = <${componentName} value={${argument}} />`)
  jsxLines.push(`  ${scenario.sinkCallee}(rendered.props.value)`)
  if (scenario.safetyPlacement === "after-sink") {jsxLines.push(`  ${sanitizer}(${current})`)}
  jsxLines.push("  return rendered")
  jsxLines.push("}")
  jsxLines.push(`function ${componentName}(props) { return <span>{props.value}</span> }`)
  return `${jsxLines.join("\n")}\n`
}

const renderSource = (scenario: SourceSinkScenario): string => {
  if (scenario.syntaxFlavor === "jsx") {return renderJsxSource(scenario)}

  const sourceAccess = [scenario.parameterName, ...scenario.accessPath].join(".")
  const lines = [
    "declare function exec(value: unknown): unknown",
    "declare function spawn(value: unknown): unknown",
    "declare function validate<T>(value: T): T",
    "declare function sanitize<T>(value: T): T",
    "",
    `export function ${scenario.functionName}(${scenario.parameterName}: any) {`,
  ]

  if (scenario.fileZone === "generated") {lines.push("  // generated file")}

  const sanitizer = scenario.sanitizerCallee ?? "sanitize"
  if (scenario.safetyPlacement === "nearby") {lines.push(`  ${sanitizer}(${scenario.parameterName}.other)`)}

  let current = sourceAccess
  if (scenario.safetyPlacement === "on-path") {current = `${sanitizer}(${current})`}
  for (let index = 0; index < scenario.aliasChainLength; index++) {
    const name = `command${index}`
    lines.push(`  const ${name} = ${current}`)
    current = name
  }

  const argument = scenario.literalSinkArgument ? JSON.stringify("literal-command") : current
  if (scenario.syntaxFlavor === "tsx") {
    const componentName = `${scenario.functionName}View`
    lines.push(`  const rendered = <${componentName} value={${argument}} />`)
    lines.push(`  ${scenario.sinkCallee}(rendered.props.value)`)
    lines.push(`  return rendered`)
    lines.push("}")
    lines.push(`function ${componentName}(props: { readonly value: unknown }) { return <span>{props.value}</span> }`)
    return `${lines.join("\n")}\n`
  }
  lines.push(`  ${scenario.sinkCallee}(${argument})`)
  if (scenario.safetyPlacement === "after-sink") {lines.push(`  ${sanitizer}(${current})`)}
  lines.push("}")
  return `${lines.join("\n")}\n`
}

const sourceFilePath = (scenario: SourceSinkScenario): string => {
  if (scenario.fileZone === "test") {return `src/${scenario.functionName}.test.${scenario.syntaxFlavor}`}
  if (scenario.fileZone === "generated") {return `src/generated/${scenario.functionName}.${scenario.syntaxFlavor}`}
  return `src/${scenario.functionName}.${scenario.syntaxFlavor}`
}

const constructsFor = (text: string, syntax: "ts" | "tsx" | "jsx"): readonly string[] => {
  const constructs = new Set<string>()
  if (text.includes("function ")) {constructs.add("function-declaration")}
  if (text.includes("const ")) {constructs.add("variable-declaration")}
  if (text.includes("(")) {constructs.add("call-expression")}
  if (text.includes(".")) {constructs.add("member-expression")}
  if (syntax === "tsx" || text.includes("<")) {constructs.add("tsx-capable")}
  return [...constructs].toSorted()
}

const repoRoot = async (): Promise<{ readonly path: string; readonly filesystem: WrittenRepo["filesystem"] }> => {
  const configured = readEnv(EnvVars.JoernEffectTestTmpdir)
  if (configured) {
    await mkdir(configured, { recursive: true })
    return { filesystem: configured.includes("/dev/shm") || configured.startsWith("/work") ? "tmpfs" : "tmp", path: configured }
  }
  try {
    await access("/dev/shm", constants.W_OK)
    return { filesystem: "/dev/shm", path: "/dev/shm" }
  } catch {
    return { filesystem: "tmp", path: tmpdir() }
  }
}

const writeRepo = (self: OxcAcceptedCase): Effect.Effect<WrittenRepo, never> =>
  Effect.promise(async () => {
    const root = await repoRoot()
    const dir = await mkdtemp(join(root.path, "joern-effect-source-sink-"))
    const packageJson = JSON.stringify({ type: "module" }, null, 2)
    const tsconfig = JSON.stringify({ compilerOptions: { module: "ESNext", target: "ES2022" } }, null, 2)
    await writeFile(join(dir, "package.json"), `${packageJson}\n`)
    await writeFile(join(dir, "tsconfig.json"), `${tsconfig}\n`)
    const writtenFiles = await Promise.all(self.files.map(async (file) => {
      const path = join(dir, file.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, file.text)
      return Buffer.byteLength(file.text)
    }))
    const bytes = packageJson.length + tsconfig.length + 2 + writtenFiles.reduce((sum, size) => sum + size, 0)
    const stats = await statfs(root.path)
    return {
      bytes,
      filesystem: root.filesystem,
      freeBytes: stats.bavail * stats.bsize,
      path: dir,
    }
  })

const importRepo = (
  joern: JoernClient,
  repo: WrittenRepo,
  scenario: SourceSinkScenario,
): Effect.Effect<void, JoernImportFailed> =>
  joern.queryRaw(
    renderImportCode(repo.path, scenario.id, "jssrc"),
  ).pipe(
    Effect.map(() => undefined),
    Effect.mapError((error) => new JoernImportFailed({ error, scenario })),
  )

const sourceSinkDslProgram = (scenario: SourceSinkScenario) =>
  CpgProgram.effect(
    `source/sink ${scenario.id}`,
    Effect.gen(function*  sourceSinkDslProgramBody() {
      const sink = yield* cpg.call.name(scenario.sinkCallee).as("sink anchor")
      return yield* sink.toRows({
        code: prop.code,
        file: prop.filename,
        line: prop.lineNumber,
        name: prop.name,
      })
    }),
  )

const evidenceDslProgram = (scenario: SourceSinkScenario) =>
  CpgProgram.effect(
    `source/sink evidence ${scenario.id}`,
    Effect.gen(function*  evidenceDslProgramBody() {
      const sink = yield* cpg.call.name(scenario.sinkCallee).as("sink anchor")
      return yield* sink
        .materializeGraph("source/sink graph")
        .including((node) => node.method)
    }),
  )

const rawRowsQuery = (scenario: SourceSinkScenario): string =>
  `import io.shiftleft.semanticcpg.language.locationCreator
cpg.call.name("${escapeScalaString(scenario.sinkCallee)}")
  .map(n => Map(
    "code" -> n.code,
    "name" -> n.name,
    "file" -> n.location.filename,
    "line" -> n.lineNumber
  ))
  .toJson`

const rowSchema = Schema.Array(
  Schema.Struct({
    code: Schema.String,
    file: Schema.NullOr(Schema.String),
    line: Schema.NullOr(Schema.Number),
    name: Schema.NullOr(Schema.String),
  }),
)

const deriveGraphFacts = (
  scenario: SourceSinkScenario,
  graph: Schema.Schema.Type<typeof EvidenceGraph>,
): Effect.Effect<GraphFactSignature, GraphInvariantFailed> =>
  CpgGraph.fromEvidence(graph).pipe(
    Effect.mapError((error) =>
      new GraphInvariantFailed({ graph, invariant: String(error), scenario }),
    ),
    Effect.flatMap((cpgGraph) =>
      Effect.try({
        catch: (error) =>
          new GraphInvariantFailed({
            scenario,
            graph,
            invariant: error instanceof Error ? error.message : String(error),
          }),
        try: () => {
          const raw = cpgGraph.raw()
          const nodeIds = new Set(graph.nodes.map((node) => node.id))
          const danglingEdges = graph.edges
            .filter((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))
            .map((edge) => edge.id)
          if (danglingEdges.length > 0) {
            throw new Error(`Dangling edges: ${danglingEdges.join(", ")}`)
          }
          return new GraphFactSignature({
            nodeCount: raw.order,
            edgeCount: raw.size,
            nodeKinds: [...new Set(graph.nodes.map((node) => node.kind))].toSorted(),
            edgeKinds: [...new Set(graph.edges.map((edge) => edge.kind))].toSorted(),
            danglingEdges,
            hasSourceAnchor: graph.nodes.some((node) => node.role === "source anchor" || node.name === scenario.parameterName),
            hasSinkAnchor: graph.nodes.some((node) => node.role === "sink anchor" || node.name === scenario.sinkCallee),
          })
        },
      }),
    ),
    Effect.withSpan("joern-effect.property.graphology.derive_facts", {
      attributes: {
        "attune.scenario.id": scenario.id,
        "attune.syntax": scenario.syntaxFlavor,
        "graph.edge.count": graph.edges.length,
        "graph.node.count": graph.nodes.length,
      },
    }),
  )

export const ScenarioSteps = {
  admitWithOxc: (self: RenderedCase): Effect.Effect<OxcAcceptedCase, OxcRejected> =>
    Effect.try({
      try: () => {
        emitPipelineEvent("oxc.admit.started", self.scenario, {
          fileCount: self.files.length,
        })
        debug("oxc:start", self.scenario.id)
        const files = self.files.map((file) => {
          const result = parseSync(file.path, file.text, { sourceType: "module" })
          if (result.errors.length > 0) throw result.errors[0]
          return file
        })
        debug("oxc:accepted", self.scenario.id)
        const fileShapes = files.map((file) => ({
          path: file.path,
          constructs: constructsFor(file.text, self.scenario.syntaxFlavor),
        }))
        return new OxcAcceptedCase({
          scenario: self.scenario,
          files,
          roles: self.roles,
          oxcShape: {
            accepted: true,
            syntax: self.scenario.syntaxFlavor,
            constructs: [...new Set(fileShapes.flatMap((file) => file.constructs))].toSorted(),
            files: fileShapes,
          },
        })
      },
      catch: (error) => new OxcRejected({ scenario: self.scenario, error }),
    }).pipe(
      Effect.tap((accepted) =>
        Effect.sync(() => {
          emitPipelineEvent("oxc.admit.completed", accepted.scenario, {
            constructs: accepted.oxcShape.constructs,
            fileCount: accepted.files.length,
          })
        }),
      ),
      Effect.withSpan("joern-effect.property.oxc.admit", {
        attributes: {
          "attune.scenario.id": self.scenario.id,
          "attune.syntax": self.scenario.syntaxFlavor,
        },
      }),
    ),

  classify: (self: MaterializedCase): Effect.Effect<ClassifiedCase> => {
    const hasFinding = self.comparison.dslRows.length > 0
    const classification: ActualClassification = {
      classification: hasFinding ? "finding" : "safe",
      bestEngine: "joern",
      reliability: self.graphFacts.danglingEdges.length === 0 ? "stable" : "unstable",
    }
    return Effect.succeed(
      new ClassifiedCase({
        scenario: self.scenario,
        oxcShape: self.oxcShape,
        comparison: self.comparison,
        graph: self.graph,
        graphFacts: self.graphFacts,
        repo: self.repo,
        classification,
      }),
    )
  },

  compareDslAndRaw: (
    self: JoernImportedCase,
  ): Effect.Effect<
    ComparedCase,
    | RawDslDisagreement
    | JoernError
    | JoernDecodeError
    | GraphMaterializationError
    | GraphAnalysisError,
    Joern
  > =>
    Effect.gen(function* () {
      const joern = yield* Joern
      emitPipelineEvent("dsl.compare.started", self.scenario)
      debug("compare:start", self.scenario.id)
      const dslProgram = sourceSinkDslProgram(self.scenario)
      const compiled = yield* CpgProgram.compile(dslProgram)
      const dslRows = yield* CpgProgram.run(dslProgram)
      const rawCpgql = rawRowsQuery(self.scenario)
      const rawRows = yield* joern.query(new Query(rawCpgql, rowSchema))
      const comparison = new OracleComparison({
        dslRows: canonicalizeRows(dslRows),
        rawRows: canonicalizeRows(rawRows),
        emittedCpgql: compiled.cpgql,
        rawCpgql,
        result: JSON.stringify(canonicalizeRows(dslRows)) === JSON.stringify(canonicalizeRows(rawRows)) ? "Agreed" : "Disagreed",
      })
      debug("compare:done", self.scenario.id, comparison.result)
      if (comparison.result === "Disagreed") {
        emitPipelineEvent("dsl.compare.disagreed", self.scenario, {
          dslRowCount: comparison.dslRows.length,
          rawRowCount: comparison.rawRows.length,
        })
        return yield* Effect.fail(new RawDslDisagreement({ scenario: self.scenario, comparison }))
      }
      emitPipelineEvent("dsl.compare.completed", self.scenario, {
        dslRowCount: comparison.dslRows.length,
        rawRowCount: comparison.rawRows.length,
      })
      return new ComparedCase({
        scenario: self.scenario,
        files: self.files,
        roles: self.roles,
        oxcShape: self.oxcShape,
        repo: self.repo,
        comparison,
      })
    }).pipe(
      Effect.withSpan("joern-effect.property.dsl.compare_raw", {
        attributes: {
          "attune.scenario.id": self.scenario.id,
          "attune.syntax": self.scenario.syntaxFlavor,
        },
      }),
    ),

  importWithJoern: (self: OxcAcceptedCase): Effect.Effect<JoernImportedCase, JoernImportFailed, Joern> =>
    Effect.gen(function* () {
      debug("joern:service", self.scenario.id)
      const joern = yield* Joern
      debug("repo:write", self.scenario.id)
      emitPipelineEvent("joern.import.started", self.scenario)
      const repo = yield* writeRepo(self)
      debug("joern:import", self.scenario.id, repo.path)
      yield* importRepo(joern, repo, self.scenario)
      debug("joern:imported", self.scenario.id)
      emitPipelineEvent("joern.import.completed", self.scenario, {
        repoBytes: repo.bytes,
        repoFilesystem: repo.filesystem,
        repoPath: repo.path,
      })
      return new JoernImportedCase({
        scenario: self.scenario,
        files: self.files,
        roles: self.roles,
        oxcShape: self.oxcShape,
        repo,
      })
    }).pipe(
      Effect.withSpan("joern-effect.property.joern.import", {
        attributes: {
          "attune.scenario.id": self.scenario.id,
          "attune.syntax": self.scenario.syntaxFlavor,
        },
      }),
    ),

  materializeGraph: (
    self: ComparedCase,
  ): Effect.Effect<
    MaterializedCase,
    | GraphInvariantFailed
    | JoernError
    | JoernDecodeError
    | GraphMaterializationError
    | GraphAnalysisError,
    Joern
  > =>
    Effect.gen(function* () {
      emitPipelineEvent("graph.materialize.started", self.scenario)
      const graph = yield* CpgProgram.runEvidenceGraph(evidenceDslProgram(self.scenario))
      const graphFacts = yield* deriveGraphFacts(self.scenario, graph)
      debug("graph:done", self.scenario.id, graphFacts)
      emitPipelineEvent("graph.materialize.completed", self.scenario, {
        danglingEdgeCount: graphFacts.danglingEdges.length,
        edgeCount: graphFacts.edgeCount,
        nodeCount: graphFacts.nodeCount,
      })
      return new MaterializedCase({
        scenario: self.scenario,
        files: self.files,
        roles: self.roles,
        oxcShape: self.oxcShape,
        comparison: self.comparison,
        graph,
        graphFacts,
        repo: self.repo,
      })
    }).pipe(
      Effect.withSpan("joern-effect.property.graphology.materialize", {
        attributes: {
          "attune.scenario.id": self.scenario.id,
          "attune.syntax": self.scenario.syntaxFlavor,
        },
      }),
    ),

  render: (scenario: SourceSinkScenario): Effect.Effect<RenderedCase> => {
    emitPipelineEvent("render.started", scenario)
    debug("render", scenario.id)
    const roles: RoleTable = {
      sourcePattern: scenario.parameterName,
      sinkPattern: scenario.sinkCallee,
      sanitizerPattern: scenario.sanitizerCallee ?? "sanitize|validate",
      sourceRole: "source anchor",
      sinkRole: "sink anchor",
    }
    const rendered = new RenderedCase({
        scenario,
        files: [{ path: sourceFilePath(scenario), text: renderSource(scenario) }],
        roles,
      })
    debug("render:done", scenario.id)
    emitPipelineEvent("render.completed", scenario, {
      fileCount: rendered.files.length,
      sourceBytes: rendered.files.reduce((bytes, file) => bytes + file.text.length, 0),
    })
    return Effect.succeed(rendered).pipe(
      Effect.withSpan("joern-effect.property.render", {
        attributes: {
          "attune.scenario.id": scenario.id,
          "attune.syntax": scenario.syntaxFlavor,
        },
      }),
    )
  },

  toObservation: (self: ClassifiedCase): Effect.Effect<SourceSinkObservation> =>
    Effect.succeed(
      new SourceSinkObservation({
        id: self.scenario.id,
        source: new AnchorObservation({ kind: "request-parameter", pattern: self.scenario.parameterName }),
        relation: new RelationObservation({ kind: "dataflow" satisfies RelationKind }),
        repo: self.repo,
        sink: new AnchorObservation({ kind: "call", pattern: self.scenario.sinkCallee }),
        expectedContext: self.scenario.safetyPlacement === "on-path" ? [new ContextObservation({ kind: "expected", pattern: self.scenario.sanitizerCallee ?? "sanitize" })] : [],
        missingContext: [],
        forbiddenContext: [],
        nearbyContext: self.scenario.safetyPlacement === "nearby" ? [new ContextObservation({ kind: "nearby", pattern: self.scenario.sanitizerCallee ?? "sanitize" })] : [],
        classification: self.classification.classification,
        bestEngine: self.classification.bestEngine,
        evidence: {
          graph: self.graph,
          comparison: self.comparison,
          graphFacts: self.graphFacts,
        },
        taxonomy: self.scenario.safetyPlacement === "nearby" ? ["near-miss.sanitizer-nearby-not-on-path"] : [],
      }),
    ),
}

export const tryRunCase = (scenario: SourceSinkScenario) =>
  Effect.gen(function*  tryRunCaseBody() {
    emitPipelineEvent("pipeline.started", scenario)
    const rendered = yield* scenario.render()
    debug("pipeline:rendered", scenario.id)
    const accepted = yield* rendered.admitWithOxc()
    debug("pipeline:accepted", scenario.id)
    const imported = yield* accepted.importWithJoern()
    debug("pipeline:imported", scenario.id)
    const compared = yield* imported.compareDslAndRaw()
    debug("pipeline:compared", scenario.id)
    const materialized = yield* compared.materializeGraph()
    debug("pipeline:materialized", scenario.id)
    const classified = yield* materialized.classify()
    debug("pipeline:classified", scenario.id)
    const observation = yield* classified.toObservation()
    emitPipelineEvent("pipeline.completed", scenario, {
      classification: observation.classification,
    })
    return observation
  }).pipe(
    Effect.withSpan("joern-effect.property.pipeline.run_case", {
      attributes: {
        "attune.scenario.id": scenario.id,
        "attune.syntax": scenario.syntaxFlavor,
      },
    }),
  )

export const runCase = (scenario: SourceSinkScenario) =>
  tryRunCase(scenario).pipe(
    Effect.matchEffect({
      onFailure: (failure: SourceSinkCaseFailure | unknown) => {
        if (failure instanceof RawDslDisagreement) {
          return Effect.succeed(
            Terminal.CandidateReport({
              report: new RecipeCandidateReport({
                id: `candidate.${failure.scenario.id}.raw-dsl-disagreement`,
                title: "DSL/raw Joern disagreement",
                observedProblem: "RawDslDisagreement",
                status: "needs-agent-draft",
                taxonomyCandidates: [],
                suggestedTemplate: "core-dsl-fix",
                validationPlan: {
                  corpusCases: [failure.scenario.id],
                  freshGenerators: ["SourceToSinkScenario"],
                  metamorphicTransforms: ["renameLocalVariables"],
                  requiredNearMisses: [],
                  requiredInvariants: ["dslRawCanonicalAgreement", "noDanglingEdges"],
                  minimumFreshCases: 100,
                },
              }),
            }),
          )
        }
        if (failure instanceof OxcRejected || failure instanceof JoernImportFailed) {
          return Effect.succeed(
            Terminal.CapabilityNote({
              note: new CapabilityReport({
                id: `capability.${failure.scenario.id}.${failure._tag}`,
                title: failure._tag,
                recommendedEngine: failure instanceof OxcRejected ? "not-ready" : "hybrid-oxc-joern",
                reliability: "unsupported",
                details: { error: String(failure.error) },
              }),
            }),
          )
        }
        if (failure instanceof GraphInvariantFailed) {
          return Effect.succeed(
            Terminal.EngineeringBug({
              bug: new EngineeringBugReport({
                id: `bug.${failure.scenario.id}.graph-invariant`,
                title: "Graph invariant failed",
                failureClass: "GraphInvariantFailure",
                details: { invariant: failure.invariant },
              }),
            }),
          )
        }
        return Effect.die(failure)
      },
      onSuccess: (observation) => Effect.succeed(Terminal.Observation({ observation })),
    }),
  )

export const cleanupObservationRepo = (observation: SourceSinkObservation): Effect.Effect<void> =>
  Effect.promise(async () => {
    await rm(observation.repo.path, { recursive: true, force: true })
  })

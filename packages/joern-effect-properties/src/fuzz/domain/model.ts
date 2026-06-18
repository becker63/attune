import { Schema } from "effect"

export const SyntaxFlavor = Schema.Literal("js", "ts", "jsx", "tsx")
export type SyntaxFlavor = Schema.Schema.Type<typeof SyntaxFlavor>

export const FuzzPreset = Schema.Literal("smoke", "workbench", "nightly", "campaign")
export type FuzzPreset = Schema.Schema.Type<typeof FuzzPreset>

export const FuzzMode = FuzzPreset
export type FuzzMode = FuzzPreset

export const JoernExecutionMode = Schema.Literal("none", "import", "query")
export type JoernExecutionMode = Schema.Schema.Type<typeof JoernExecutionMode>

export const CorpusOrigin = Schema.Literal(
  "curated",
  "typescript-docs",
  "parser-fixture",
  "promoted-counterexample",
)
export type CorpusOrigin = Schema.Schema.Type<typeof CorpusOrigin>

export const ProjectFileRole = Schema.Literal(
  "entrypoint",
  "module",
  "component",
  "declaration",
  "fixture",
)
export type ProjectFileRole = Schema.Schema.Type<typeof ProjectFileRole>

export const ProjectFile = Schema.Struct({
  path: Schema.String,
  role: ProjectFileRole,
  source: Schema.String,
  syntaxFlavor: SyntaxFlavor,
  tags: Schema.Array(Schema.String),
})
export type ProjectFile = Schema.Schema.Type<typeof ProjectFile>

export const ProjectTemplate = Schema.Struct({
  entrypoint: Schema.String,
  files: Schema.Array(ProjectFile),
  id: Schema.String,
  origin: CorpusOrigin,
  tags: Schema.Array(Schema.String),
  title: Schema.String,
})
export type ProjectTemplate = Schema.Schema.Type<typeof ProjectTemplate>

export const MutationKind = Schema.Literal(
  "module-split",
  "function-wrap",
  "async-boundary",
  "generic-decode",
  "object-destructure",
  "optional-chain",
  "jsx-prop-flow",
  "source-sink-flow",
  "class-method",
  "import-export-shape",
)
export type MutationKind = Schema.Schema.Type<typeof MutationKind>

export const MutationStep = Schema.Struct({
  kind: MutationKind,
  params: Schema.Record({ key: Schema.String, value: Schema.String }),
  targetFile: Schema.String,
})
export type MutationStep = Schema.Schema.Type<typeof MutationStep>

export const FuzzExpectationKind = Schema.Literal(
  "call-name",
  "identifier-name",
  "literal-code-contains",
  "method-name",
  "type-decl-name",
)
export type FuzzExpectationKind = Schema.Schema.Type<typeof FuzzExpectationKind>

export const FuzzExpectation = Schema.Struct({
  description: Schema.String,
  kind: FuzzExpectationKind,
  sourcePath: Schema.String,
  value: Schema.String,
})
export type FuzzExpectation = Schema.Schema.Type<typeof FuzzExpectation>

export const CounterexampleFailureClass = Schema.Literal(
  "admission-rejection",
  "joern-import",
  "query-render",
  "schema-decode",
  "invariant",
  "oracle-disagreement",
  "unknown",
)
export type CounterexampleFailureClass = Schema.Schema.Type<typeof CounterexampleFailureClass>

export const CounterexampleReplay = Schema.Struct({
  fastCheckPath: Schema.optional(Schema.String),
  fastCheckSeed: Schema.optional(Schema.Number),
})
export type CounterexampleReplay = Schema.Schema.Type<typeof CounterexampleReplay>

export const CounterexampleQueryRecipe = Schema.Struct({
  fingerprint: Schema.optional(Schema.String),
  recipe: Schema.optional(Schema.String),
})
export type CounterexampleQueryRecipe = Schema.Schema.Type<typeof CounterexampleQueryRecipe>

const CounterexampleMutationStep = Schema.Struct({
  kind: Schema.String,
  value: Schema.String,
})

export const CounterexampleCandidate = Schema.Struct({
  failureClass: CounterexampleFailureClass,
  mutators: Schema.Array(CounterexampleMutationStep),
  query: Schema.optional(CounterexampleQueryRecipe),
  replay: Schema.optional(CounterexampleReplay),
  seedId: Schema.String,
  source: Schema.String,
  syntaxFlavor: SyntaxFlavor,
  title: Schema.optional(Schema.String),
})
export type CounterexampleCandidate = Schema.Schema.Type<typeof CounterexampleCandidate>

export const FuzzProjectCase = Schema.Struct({
  caseId: Schema.String,
  mutations: Schema.Array(MutationStep),
  project: ProjectTemplate,
  replay: Schema.optional(CounterexampleReplay),
})
export type FuzzProjectCase = Schema.Schema.Type<typeof FuzzProjectCase>

export const FuzzFileCase = Schema.Struct({
  caseId: Schema.String,
  expectations: Schema.optional(Schema.Array(FuzzExpectation)),
  mutators: Schema.Array(CounterexampleMutationStep),
  replay: Schema.optional(CounterexampleReplay),
  seed: Schema.Struct({
    id: Schema.String,
    origin: CorpusOrigin,
    source: Schema.String,
    syntaxFlavor: SyntaxFlavor,
    title: Schema.String,
  }),
  source: Schema.String,
  sourcePath: Schema.optional(Schema.String),
  syntaxFlavor: SyntaxFlavor,
})
export type FuzzFileCase = Schema.Schema.Type<typeof FuzzFileCase>

export const FileAdmissionResult = Schema.Struct({
  accepted: Schema.Boolean,
  diagnostics: Schema.Array(Schema.String),
  path: Schema.String,
  sourceBytes: Schema.Number,
  syntaxFlavor: SyntaxFlavor,
})
export type FileAdmissionResult = Schema.Schema.Type<typeof FileAdmissionResult>

export const AdmissionResult = Schema.Struct({
  accepted: Schema.Boolean,
  caseId: Schema.String,
  diagnostics: Schema.Array(Schema.String),
  files: Schema.Array(FileAdmissionResult),
  projectId: Schema.String,
})
export type AdmissionResult = Schema.Schema.Type<typeof AdmissionResult>

export type FuzzerRunConfig = Readonly<{
  readonly batchCount?: number
  readonly caseCount: number
  readonly joernMode?: JoernExecutionMode
  readonly joernShardSize?: number
  readonly maxMutators?: number
  readonly mode: FuzzPreset
  readonly queryBudget?: number
  readonly queryFeedback?: boolean
  readonly seed: number
  readonly target: string
}>

export type FuzzerRunSummary = Readonly<{
  readonly accepted: number
  readonly batches?: number
  readonly cases: number
  readonly mode: FuzzPreset
  readonly rejected: number
  readonly seed: number
}>

export type CorpusSeed = FuzzFileCase["seed"]
export type FuzzCase = FuzzFileCase
export type MutatorStep = CounterexampleCandidate["mutators"][number]

export const SemanticCorpusOrigin = CorpusOrigin
export type SemanticCorpusOrigin = CorpusOrigin
export const SemanticFileRole = ProjectFileRole
export type SemanticFileRole = ProjectFileRole
export const SemanticFile = ProjectFile
export type SemanticFile = ProjectFile
export const SemanticProjectSeed = ProjectTemplate
export type SemanticProjectSeed = ProjectTemplate
export const SemanticMutationKind = MutationKind
export type SemanticMutationKind = MutationKind
export const SemanticMutationStep = MutationStep
export type SemanticMutationStep = MutationStep
export const SemanticCase = FuzzProjectCase
export type SemanticCase = FuzzProjectCase
export const SemanticFileAdmissionResult = FileAdmissionResult
export type SemanticFileAdmissionResult = FileAdmissionResult
export const SemanticAdmissionResult = AdmissionResult
export type SemanticAdmissionResult = AdmissionResult
export const SemanticRunSummary = Schema.Struct({
  accepted: Schema.Number,
  cases: Schema.Number,
  mode: FuzzPreset,
  rejected: Schema.Number,
  seed: Schema.Number,
})
export type SemanticRunSummary = Schema.Schema.Type<typeof SemanticRunSummary>

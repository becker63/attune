import { Data, Effect, Schema } from "effect"
import {
  joernTemplates,
  type JoernTemplate,
} from "./templates/index.js"

export const JoernTemplateExecutorRunInput = Schema.Struct({
  templateId: Schema.String,
  bindings: Schema.Unknown,
})

export type JoernTemplateExecutorInput = Schema.Schema.Type<typeof JoernTemplateExecutorRunInput>

export const JoernTemplateExecutorRunOutput = Schema.Struct({
  templateId: Schema.String,
  evidenceKind: Schema.Literal(
    "finding",
    "graph-fact",
    "protocol-deviation",
    "raw-query",
  ),
  cpgql: Schema.String,
  rendered: Schema.Boolean,
})

export type JoernTemplateExecutorOutput = Schema.Schema.Type<typeof JoernTemplateExecutorRunOutput>

export class JoernTemplateNotFoundError extends Data.TaggedError(
  "JoernTemplateNotFoundError",
)<{
  readonly templateId: string
  readonly knownTemplateIds: readonly string[]
}> {}

export class JoernTemplateBindingError extends Data.TaggedError(
  "JoernTemplateBindingError",
)<{
  readonly templateId: string
  readonly message: string
}> {}

const getTemplate = (
  templateId: string,
): readonly [JoernTemplate | undefined, readonly string[]] => {
  const knownTemplateIds = joernTemplates.map((template) => template.id)
  const template = joernTemplates.find((candidate) => candidate.id === templateId)
  return [template, knownTemplateIds]
}

const renderTemplate = (
  template: JoernTemplate,
  bindings: unknown,
): Effect.Effect<string, JoernTemplateBindingError> =>
  Effect.gen(function* () {
    if (typeof bindings !== "object" || bindings === null || Array.isArray(bindings)) {
      return yield* Effect.fail(
        new JoernTemplateBindingError({
          templateId: template.id,
          message: "Template bindings must be an object",
        }),
      )
    }

    const decodedBindings = yield* Schema.decodeUnknown(template.bindings)(bindings).pipe(
      Effect.mapError(
        () =>
          new JoernTemplateBindingError({
            templateId: template.id,
            message: "Template bindings do not match generated schema",
          }),
      ),
    )
    return template.render(decodedBindings)
  })

const evidenceKindForTemplate = (
  template: JoernTemplate,
): JoernTemplateExecutorOutput["evidenceKind"] => {
  if (template.id === "dangerous-call") {
    return "finding"
  }

  return "raw-query"
}

export interface JoernTemplateExecutorService {
  readonly execute: (
    input: JoernTemplateExecutorInput,
  ) => Effect.Effect<JoernTemplateExecutorOutput, JoernTemplateNotFoundError | JoernTemplateBindingError>
  readonly run: (input: JoernTemplateExecutorInput) => Effect.Effect<JoernTemplateExecutorOutput, JoernTemplateNotFoundError | JoernTemplateBindingError>
}

const executeTemplate = (
  input: JoernTemplateExecutorInput,
): Effect.Effect<JoernTemplateExecutorOutput, JoernTemplateNotFoundError | JoernTemplateBindingError> => {
  const [template, knownTemplateIds] = getTemplate(input.templateId)
  if (template === undefined) {
    return Effect.fail(
      new JoernTemplateNotFoundError({
        templateId: input.templateId,
        knownTemplateIds,
      }),
    )
  }

  return renderTemplate(template, input.bindings).pipe(
    Effect.map((cpgql) => ({
      templateId: template.id,
      evidenceKind: evidenceKindForTemplate(template),
      cpgql,
      rendered: true,
    })),
  )
}

export const makeJoernTemplateExecutor = (): JoernTemplateExecutorService => ({
  execute: executeTemplate,
  run: executeTemplate,
})

export class JoernTemplateExecutor extends Effect.Service<JoernTemplateExecutor>()(
  "joern-effect/JoernTemplateExecutor",
  {
    accessors: true,
    effect: Effect.succeed(makeJoernTemplateExecutor()),
  },
) {}

export const JoernTemplateExecutorRunOperation = {
  id: "joern-template-executor",
  kind: "query",
  input: JoernTemplateExecutorRunInput,
  output: JoernTemplateExecutorRunOutput,
  inferredDiagnosticRules: "inferDiagnosticRules()",
  diagnosticRuleExtensions: [],
  registration: `queryOperation({ id, input, output, diagnosticRules: inferDiagnosticRules(), edges: touches(...) })`,
} as const

export const JoernTemplateExecutorLive = JoernTemplateExecutor.Default
export const PackageLayer = JoernTemplateExecutorLive
export const PackageTestLayer = JoernTemplateExecutorLive

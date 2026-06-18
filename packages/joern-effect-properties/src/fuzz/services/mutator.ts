import { Context, Effect, Layer } from "effect"
import { Node, type Project, type SourceFile } from "ts-morph"
import type { CounterexampleReplay } from "../domain/model.js"
import {
  buildSemanticProject,
  printSemanticProject,
  scriptKindForSemanticFile,
  sourceFileForSemanticFile,
} from "../domain/project.js"
import type {
  SemanticCase,
  SemanticFile,
  SemanticMutationKind,
  SemanticMutationStep,
  SemanticProjectSeed,
} from "../domain/model.js"

type MutableSemanticContext = {
  readonly files: readonly SemanticFile[]
  readonly project: Project
}

export type SemanticMutationPlan = Readonly<{
  readonly planId: string
  readonly replay?: CounterexampleReplay
  readonly steps: readonly SemanticMutationStep[]
}>

export type SemanticCasePlan = Readonly<{
  readonly caseId: string
  readonly plan: SemanticMutationPlan
  readonly seed: SemanticProjectSeed
}>

export type SemanticAppliedMutation = Readonly<{
  readonly kind: SemanticMutationKind
  readonly targetFile: string
}>

export type SemanticRejectedMutation = Readonly<{
  readonly kind: SemanticMutationKind
  readonly reason: string
  readonly targetFile: string
}>

export type SemanticMutationApplication = Readonly<{
  readonly targetFile: string
}>

export type SemanticMutationRule = Readonly<{
  readonly apply: (
    context: MutableSemanticContext,
    step: SemanticMutationStep,
  ) => SemanticMutationApplication | undefined
  readonly description: string
  readonly kind: SemanticMutationKind
  readonly precondition: (context: MutableSemanticContext, step: SemanticMutationStep) => boolean
  readonly rejectionReason: string
}>

export type SemanticMutationResult = Readonly<{
  readonly applied: readonly SemanticAppliedMutation[]
  readonly case: SemanticCase
  readonly rejected: readonly SemanticRejectedMutation[]
}>

const supportsTypeSyntax = (file: SemanticFile): boolean =>
  file.syntaxFlavor === "ts" || file.syntaxFlavor === "tsx"

const supportsJsxSyntax = (file: SemanticFile): boolean =>
  file.syntaxFlavor === "jsx" || file.syntaxFlavor === "tsx"

const paramValue = (
  step: SemanticMutationStep,
  name: string,
  fallback: string,
): string => step.params[name] ?? step.params.value ?? fallback

const sanitizeIdentifier = (value: string, fallback: string): string => {
  const safe = value.replace(/[^A-Za-z0-9_$]+/gu, "_").replace(/^[^A-Za-z_$]+/u, "")
  return safe.length > 0 ? safe : fallback
}

const componentIdentifier = (value: string): string => {
  const safe = sanitizeIdentifier(value, "Flow")
  return `${safe[0]?.toUpperCase() ?? "F"}${safe.slice(1)}`
}

const preferredFile = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
  predicate: (file: SemanticFile) => boolean = () => true,
): SemanticFile | undefined => {
  const targeted = context.files.find((file) => file.path === step.targetFile && predicate(file))
  if (targeted !== undefined) {return targeted}
  return context.files.find(predicate)
}

const sourceFileFor = (
  context: MutableSemanticContext,
  file: SemanticFile,
): SourceFile | undefined => sourceFileForSemanticFile(context.project, file)

const firstCallableName = (sourceFile: SourceFile): string | undefined => {
  const declared = sourceFile.getFunctions().find((fn) => fn.getName() !== undefined)?.getName()
  if (declared !== undefined) {return declared}

  const variable = sourceFile.getVariableDeclarations().find((declaration) => {
    const initializer = declaration.getInitializer()
    return initializer !== undefined && (
      Node.isArrowFunction(initializer) ||
      Node.isFunctionExpression(initializer)
    )
  })
  return variable?.getName()
}

const callableFile = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): Readonly<{ file: SemanticFile; sourceFile: SourceFile; target: string }> | undefined => {
  const file = preferredFile(context, step)
  const sourceFile = file === undefined ? undefined : sourceFileFor(context, file)
  const target = sourceFile === undefined ? undefined : firstCallableName(sourceFile)
  if (file === undefined || sourceFile === undefined || target === undefined) {return undefined}
  return { file, sourceFile, target }
}

const hasCallableSite = (context: MutableSemanticContext, step: SemanticMutationStep): boolean =>
  callableFile(context, step) !== undefined

const appendFunctionWrap = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): SemanticMutationApplication | undefined => {
  const site = callableFile(context, step)
  if (site === undefined) {return undefined}
  const name = sanitizeIdentifier(paramValue(step, "name", "wrapped"), "wrapped")
  const parameter = supportsTypeSyntax(site.file) ? "input: any" : "input"
  site.sourceFile.addStatements(`
export function wrapped_${name}(${parameter}) {
  return ${site.target}(input)
}
`)
  return { targetFile: site.file.path }
}

const appendAsyncBoundary = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): SemanticMutationApplication | undefined => {
  const site = callableFile(context, step)
  if (site === undefined) {return undefined}
  const name = sanitizeIdentifier(paramValue(step, "name", "asyncBoundary"), "asyncBoundary")
  const parameter = supportsTypeSyntax(site.file) ? "input: any" : "input"
  site.sourceFile.addStatements(`
export async function async_boundary_${name}(${parameter}) {
  return await Promise.resolve(${site.target}(input))
}
`)
  return { targetFile: site.file.path }
}

const appendGenericDecode = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): SemanticMutationApplication | undefined => {
  const file = preferredFile(context, step, supportsTypeSyntax)
  const sourceFile = file === undefined ? undefined : sourceFileFor(context, file)
  if (file === undefined || sourceFile === undefined) {return undefined}
  const name = sanitizeIdentifier(paramValue(step, "name", "decode"), "decode")
  sourceFile.addStatements(`
type DecodeBox_${name}<T> = { readonly value: T }

export function decode_${name}<T>(value: T): DecodeBox_${name}<T> {
  return { value }
}
`)
  return { targetFile: file.path }
}

const appendObjectDestructure = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): SemanticMutationApplication | undefined => {
  const file = preferredFile(context, step)
  const sourceFile = file === undefined ? undefined : sourceFileFor(context, file)
  if (file === undefined || sourceFile === undefined) {return undefined}
  const name = sanitizeIdentifier(paramValue(step, "name", "destructured"), "destructured")
  const parameter = supportsTypeSyntax(file)
    ? "input: { body?: { command?: unknown } } = {}"
    : "input = {}"
  sourceFile.addStatements(`
export function destructured_${name}(${parameter}) {
  const { body } = input
  return body?.command
}
`)
  return { targetFile: file.path }
}

const appendOrRewriteOptionalChain = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): SemanticMutationApplication | undefined => {
  const file = preferredFile(context, step)
  const sourceFile = file === undefined ? undefined : sourceFileFor(context, file)
  if (file === undefined || sourceFile === undefined) {return undefined}
  const text = sourceFile.getFullText()
  const unsafeAccess = "input.body.command"
  const index = text.indexOf(unsafeAccess)
  if (index >= 0) {
    sourceFile.replaceText([index, index + unsafeAccess.length], "input?.body?.command")
    return { targetFile: file.path }
  }

  const name = sanitizeIdentifier(paramValue(step, "name", "optional"), "optional")
  const parameter = supportsTypeSyntax(file) ? "input: any" : "input"
  sourceFile.addStatements(`
export function optional_${name}(${parameter}) {
  return input?.body?.command
}
`)
  return { targetFile: file.path }
}

const appendJsxPropFlow = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): SemanticMutationApplication | undefined => {
  const file = preferredFile(context, step, supportsJsxSyntax)
  const sourceFile = file === undefined ? undefined : sourceFileFor(context, file)
  if (file === undefined || sourceFile === undefined) {return undefined}
  const name = componentIdentifier(paramValue(step, "name", "Props"))
  const parameter = supportsTypeSyntax(file) ? "props: { value?: string }" : "props"
  sourceFile.addStatements(`
export function PropFlow${name}(${parameter}) {
  return <section data-flow={props.value}>{props.value}</section>
}
`)
  return { targetFile: file.path }
}

const splitFilePath = (file: SemanticFile, name: string): string => {
  const directory = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "."
  const extension = file.syntaxFlavor === "js" || file.syntaxFlavor === "jsx" ? "js" : "ts"
  return `${directory}/split_${name}.${extension}`.replace(/^\.\//u, "")
}

const moduleSpecifierFor = (from: SemanticFile, toPath: string): string => {
  const fromDirectory = from.path.includes("/") ? from.path.slice(0, from.path.lastIndexOf("/")) : ""
  const relative = fromDirectory.length > 0 && toPath.startsWith(`${fromDirectory}/`)
    ? toPath.slice(fromDirectory.length + 1)
    : toPath
  return `./${relative.replace(/\.(m?[jt]sx?)$/u, "")}`
}

const appendModuleSplit = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): SemanticMutationApplication | undefined => {
  const file = preferredFile(context, step)
  const sourceFile = file === undefined ? undefined : sourceFileFor(context, file)
  if (file === undefined || sourceFile === undefined) {return undefined}
  const name = sanitizeIdentifier(paramValue(step, "name", "split"), "split")
  const exportedName = `split_value_${name}`
  const newPath = splitFilePath(file, name)
  if (context.project.getSourceFiles().some((existing) => existing.getFilePath().replace(/^\/+/u, "") === newPath)) {
    return undefined
  }

  context.project.createSourceFile(newPath, `export const ${exportedName} = "${name}"\n`, {
    overwrite: false,
    scriptKind: scriptKindForSemanticFile({
      syntaxFlavor: newPath.endsWith(".ts") ? "ts" : "js",
    }),
  })
  sourceFile.addImportDeclaration({
    moduleSpecifier: moduleSpecifierFor(file, newPath),
    namedImports: [exportedName],
  })
  sourceFile.addStatements(`
export function module_split_${name}() {
  return ${exportedName}
}
`)
  return { targetFile: file.path }
}

const appendSourceSinkFlow = (
  context: MutableSemanticContext,
  step: SemanticMutationStep,
): SemanticMutationApplication | undefined => {
  const file = preferredFile(context, step)
  const sourceFile = file === undefined ? undefined : sourceFileFor(context, file)
  if (file === undefined || sourceFile === undefined) {return undefined}
  const name = sanitizeIdentifier(paramValue(step, "name", "flow"), "flow")
  const parameter = supportsTypeSyntax(file) ? "input: any" : "input"
  const valueParameter = supportsTypeSyntax(file) ? "value: any" : "value"
  const returnType = supportsTypeSyntax(file) ? ": any" : ""
  sourceFile.addStatements(`
function source_${name}(${parameter})${returnType} {
  return input?.body?.command ?? input
}

function sink_${name}(${valueParameter})${returnType} {
  return value
}

export function flow_${name}(${parameter})${returnType} {
  return sink_${name}(source_${name}(input))
}
`)
  return { targetFile: file.path }
}

export const semanticMutationRules: readonly SemanticMutationRule[] = [
  {
    apply: appendFunctionWrap,
    description: "Wrap an existing callable in a new exported function.",
    kind: "function-wrap",
    precondition: hasCallableSite,
    rejectionReason: "No function or function-valued variable is available to wrap.",
  },
  {
    apply: appendAsyncBoundary,
    description: "Call an existing callable through an async Promise boundary.",
    kind: "async-boundary",
    precondition: hasCallableSite,
    rejectionReason: "No function or function-valued variable is available for an async boundary.",
  },
  {
    apply: appendGenericDecode,
    description: "Add a conservative generic decode helper to a TS/TSX file.",
    kind: "generic-decode",
    precondition: (context, step) => preferredFile(context, step, supportsTypeSyntax) !== undefined,
    rejectionReason: "Generic decode requires a TypeScript or TSX file.",
  },
  {
    apply: appendObjectDestructure,
    description: "Add an object destructuring flow with optional reads.",
    kind: "object-destructure",
    precondition: (context, step) => preferredFile(context, step) !== undefined,
    rejectionReason: "No file is available for an object destructuring mutation.",
  },
  {
    apply: appendOrRewriteOptionalChain,
    description: "Rewrite an unsafe input.body.command read or add a safe optional-chain flow.",
    kind: "optional-chain",
    precondition: (context, step) => preferredFile(context, step) !== undefined,
    rejectionReason: "No file is available for an optional chaining mutation.",
  },
  {
    apply: appendJsxPropFlow,
    description: "Add a JSX component that carries props into an attribute and child expression.",
    kind: "jsx-prop-flow",
    precondition: (context, step) => preferredFile(context, step, supportsJsxSyntax) !== undefined,
    rejectionReason: "JSX prop flow requires a JSX or TSX file.",
  },
  {
    apply: appendModuleSplit,
    description: "Split a new exported value into a sibling module and import it from the target file.",
    kind: "module-split",
    precondition: (context, step) => preferredFile(context, step) !== undefined,
    rejectionReason: "No file is available for a module split mutation.",
  },
  {
    apply: appendSourceSinkFlow,
    description: "Inject local source and sink helpers connected through an exported flow.",
    kind: "source-sink-flow",
    precondition: (context, step) => preferredFile(context, step) !== undefined,
    rejectionReason: "No file is available for a source/sink mutation.",
  },
]

const ruleByKind = new Map(semanticMutationRules.map((rule) => [rule.kind, rule]))

export const applySemanticMutationPlan = (
  seed: SemanticProjectSeed,
  plan: SemanticMutationPlan,
  caseId = plan.planId,
): SemanticMutationResult => {
  const built = buildSemanticProject(seed)
  const applied: SemanticAppliedMutation[] = []
  const rejected: SemanticRejectedMutation[] = []
  const appliedSteps: SemanticMutationStep[] = []
  const context: MutableSemanticContext = {
    files: seed.files,
    project: built.project,
  }

  for (const step of plan.steps) {
    const rule = ruleByKind.get(step.kind)
    if (rule === undefined) {
      rejected.push({
        kind: step.kind,
        reason: `Unknown semantic mutation kind: ${step.kind}`,
        targetFile: step.targetFile,
      })
      continue
    }
    if (!rule.precondition(context, step)) {
      rejected.push({
        kind: step.kind,
        reason: rule.rejectionReason,
        targetFile: step.targetFile,
      })
      continue
    }

    const application = rule.apply(context, step)
    if (application === undefined) {
      rejected.push({
        kind: step.kind,
        reason: rule.rejectionReason,
        targetFile: step.targetFile,
      })
      continue
    }
    applied.push({
      kind: step.kind,
      targetFile: application.targetFile,
    })
    appliedSteps.push(step)
  }

  const project = printSemanticProject(built.project, seed, `${seed.id}-${caseId}`)
  const semanticCase: SemanticCase = {
    caseId,
    mutations: appliedSteps,
    project,
    ...(plan.replay === undefined ? {} : { replay: plan.replay }),
  }

  return {
    applied,
    case: semanticCase,
    rejected,
  }
}

export interface SemanticMutatorService {
  readonly apply: (input: SemanticCasePlan) => Effect.Effect<SemanticCase>
  readonly applyDetailed: (input: SemanticCasePlan) => Effect.Effect<SemanticMutationResult>
  readonly applyPlan: (
    seed: SemanticProjectSeed,
    plan: SemanticMutationPlan,
    caseId?: string,
  ) => Effect.Effect<SemanticCase>
}

export class SemanticMutator extends Context.Tag(
  "attune/joern-effect-properties/fuzz/SemanticMutator",
)<SemanticMutator, SemanticMutatorService>() {}

export const makeSemanticMutator = (): SemanticMutatorService => ({
  apply: (input) => Effect.sync(() => applySemanticMutationPlan(input.seed, input.plan, input.caseId).case),
  applyDetailed: (input) => Effect.sync(() => applySemanticMutationPlan(input.seed, input.plan, input.caseId)),
  applyPlan: (seed, plan, caseId) =>
    Effect.sync(() => applySemanticMutationPlan(seed, plan, caseId).case),
})

export const SemanticMutatorLive: Layer.Layer<SemanticMutator> = Layer.succeed(
  SemanticMutator,
  makeSemanticMutator(),
)

export type MutationPlan = SemanticMutationPlan
export type CasePlan = SemanticCasePlan
export type AppliedMutation = SemanticAppliedMutation
export type RejectedMutation = SemanticRejectedMutation
export type MutationApplication = SemanticMutationApplication
export type MutationRule = SemanticMutationRule
export type MutationResult = SemanticMutationResult
export const mutationRules = semanticMutationRules
export const applyMutationPlan = applySemanticMutationPlan
export type ProjectMutatorService = SemanticMutatorService
export const ProjectMutator = SemanticMutator
export const makeProjectMutator = makeSemanticMutator
export const ProjectMutatorLive = SemanticMutatorLive

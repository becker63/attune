import { Schema } from "effect"

import { defaultAttunePiPermissionProfile } from "../permissions/default-profile.js"
import {
  SpecInterviewInput,
  SpecInterviewResult,
  type SpecInterviewAnswer,
  type SpecInterviewQuestion,
  type SuggestedObligation,
} from "../schema/spec-interview.js"
import type { ImplementationSpec } from "../schema/implementation-spec.js"

const requiredSlots = [
  "affectedPackages",
  "scope",
  "nonGoals",
  "tasks",
  "validationCommands",
  "reviewGates",
] as const

type RequiredSlot = (typeof requiredSlots)[number]

type AnswerMap = ReadonlyMap<string, string | ReadonlyArray<string>>

const questionBank: Record<RequiredSlot, SpecInterviewQuestion> = {
  affectedPackages: {
    id: "affectedPackages",
    prompt: "Which Attune packages may this spec change?",
    rationale: "Nx commands, artifact ownership, and review scope need package boundaries.",
    answerKind: "package-list",
    required: true,
  },
  scope: {
    id: "scope",
    prompt: "What is explicitly in scope for this implementation run?",
    rationale: "The executor needs positive boundaries before it can plan work.",
    answerKind: "list",
    required: true,
  },
  nonGoals: {
    id: "nonGoals",
    prompt: "What must this run not do?",
    rationale: "Non-goals become guardrails and help prevent scope drift.",
    answerKind: "list",
    required: true,
  },
  tasks: {
    id: "tasks",
    prompt: "What concrete tasks should the agent attempt first?",
    rationale: "The draft spec needs bounded executable work items, not only intent.",
    answerKind: "list",
    required: true,
  },
  validationCommands: {
    id: "validationCommands",
    prompt: "Which validation commands prove this slice?",
    rationale: "The agent's feedback loop depends on deterministic project signals.",
    answerKind: "command-list",
    required: true,
  },
  reviewGates: {
    id: "reviewGates",
    prompt: "Which human or model review gates are required before handoff?",
    rationale: "Review gates make the handoff boundary explicit.",
    answerKind: "list",
    required: true,
  },
}

export const attuneSpec = (input: unknown): SpecInterviewResult => {
  const decoded = Schema.decodeUnknownSync(SpecInterviewInput)(input)
  const answers = toAnswerMap(decoded.answers)
  const title = readText(answers, "title") ?? inferTitle(decoded.rawPrompt)
  const intent = readText(answers, "intent") ?? inferIntent(decoded.rawPrompt)
  const missingConstraints = requiredSlots
    .filter((slot) => readList(answers, slot).length === 0)
    .map((slot) => questionBank[slot].prompt)
  const questions = requiredSlots
    .filter((slot) => readList(answers, slot).length === 0)
    .slice(0, 3)
    .map((slot) => questionBank[slot])
  const suggestions = suggestObligations(decoded.rawPrompt, title)
  const draft = missingConstraints.length === 0
    ? buildDraft({ answers, intent, rawPrompt: decoded.rawPrompt, title })
    : null

  return Schema.decodeUnknownSync(SpecInterviewResult)({
    phase: draft === null ? "questioning" : "draft-ready",
    questions,
    missingConstraints,
    suggestedTestObligations: suggestions.test,
    suggestedPropertyObligations: suggestions.property,
    suggestedMutationObligations: suggestions.mutation,
    draft,
  })
}

const buildDraft = (input: {
  readonly answers: AnswerMap
  readonly intent: string
  readonly rawPrompt: string
  readonly title: string
}): ImplementationSpec => {
  const specId = slugify(readText(input.answers, "id") ?? input.title)
  const affectedPackages = readList(input.answers, "affectedPackages")
  const validationCommands = readList(input.answers, "validationCommands")
  const reviewGates = readList(input.answers, "reviewGates")
  const forbiddenActions = mergeUnique([
    ...readList(input.answers, "forbiddenActions"),
    "modify .env*, *.env, *.env.*, or ~/.ssh/*",
    "run deploy, kubectl, SSH, sudo, git reset --hard, or git clean -fdx",
  ])

  return {
    id: specId,
    title: input.title,
    intent: input.intent,
    scope: readList(input.answers, "scope"),
    nonGoals: readList(input.answers, "nonGoals"),
    affectedPackages,
    boundaries: [
      {
        id: "repo-local",
        description: "Operate inside the Attune repository unless an explicit permission profile allows otherwise.",
      },
      ...readList(input.answers, "boundaries").map((description, index) => ({
        id: `boundary-${index + 1}`,
        description,
      })),
    ],
    tasks: readList(input.answers, "tasks").map((task, index) => ({
      id: `${specId}-task-${index + 1}`,
      title: task,
      kind: "pure-implementation",
      description: task,
      dependsOn: index === 0 ? [] : [`${specId}-task-${index}`],
      affectedPackages,
      validationCommands,
      humanReviewRequired: false,
    })),
    testObligations: [
      {
        id: `${specId}-typecheck`,
        claim: `${input.title} preserves typed package boundaries.`,
        kind: "typecheck",
        target: affectedPackages.join(", "),
        commands: validationCommands,
        requiredEvidence: ["typecheck output", "schema decode output"],
        failureClassification: "type-boundary-error",
      },
    ],
    propertyObligations: [
      {
        id: `${specId}-roundtrip-property`,
        propertyName: `${input.title} generated artifacts remain stable`,
        targetPackage: affectedPackages[0] ?? "attune",
        generatorInputs: ["generated artifact inputs", "normalized spec fields"],
        invariant: "Equivalent spec inputs render deterministic artifact output.",
        counterexamplePolicy: {
          persistMinimizedCounterexamples: true,
          addRegressionFixturesWhenAccepted: true,
          classifyFailureAsDesignOrImplementation: true,
          requireExplanationBeforeDiscard: true,
        },
        fixturePolicy: "Persist useful minimized failures as regression fixtures.",
        commands: validationCommands.filter((command) => command.includes("property")),
        seedLoggingRequired: true,
      },
    ],
    mutationObligations: [
      {
        id: `${specId}-critical-classifier-mutants`,
        targetPackage: affectedPackages[0] ?? "attune",
        targetFiles: readList(input.answers, "mutationTargets"),
        mutationCommand: validationCommands.find((command) => command.includes("mutation")) ?? "Define a scoped mutation command.",
        expectedKillThreshold: 80,
        survivorPolicy: "Classify survivors before treating the score as acceptable.",
        equivalentMutantPolicy: "Equivalent mutants must be marked explicitly with rationale.",
        requiredClassification: [
          "missing-assertion",
          "missing-property",
          "equivalent-mutant",
          "implementation-bug",
          "needs-human-review",
        ],
      },
    ],
    snapshotObligations: [],
    validationCommands: validationCommands.map((command, index) => ({
      id: `validation-${index + 1}`,
      command,
      targetPackage: affectedPackages[0] ?? "attune",
      required: true,
    })),
    reviewGates: reviewGates.map((description, index) => ({
      id: `review-gate-${index + 1}`,
      description,
      requiredBefore: index === reviewGates.length - 1 ? "handoff" : `review-gate-${index + 2}`,
    })),
    forbiddenActions: forbiddenActions.map((action, index) => ({
      id: `forbidden-action-${index + 1}`,
      action,
      reason: "Captured during /attune-spec interrogation.",
    })),
    permissionProfile: defaultAttunePiPermissionProfile,
    artifactPolicy: {
      root: `.attune-runs/${specId}`,
      ignoredByGit: true,
      promoteSelectedArtifactsOnly: true,
      requiredFiles: [
        "spec.json",
        "plan.md",
        "status.md",
        "events.jsonl",
        "evidence-matrix.md",
        "validation.md",
        "summary.md",
      ],
    },
  }
}

const toAnswerMap = (answers: ReadonlyArray<SpecInterviewAnswer>): AnswerMap =>
  new Map<string, string | ReadonlyArray<string>>(
    answers.map((answer) => [answer.questionId, answer.value]),
  )

const readText = (answers: AnswerMap, id: string): string | undefined => {
  const value = answers.get(id)
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  return undefined
}

const readList = (answers: AnswerMap, id: string): string[] => {
  const value = answers.get(id)
  if (Array.isArray(value)) {
    return mergeUnique(value.map((entry) => entry.trim()).filter(Boolean))
  }

  if (typeof value !== "string") {
    return []
  }

  return mergeUnique(
    value
      .split(/\r?\n|,/u)
      .map((entry) => entry.replace(/^[-*]\s*/u, "").trim())
      .filter(Boolean),
  )
}

const inferTitle = (rawPrompt: string): string => {
  const firstLine = rawPrompt.trim().split(/\r?\n/u).find((line) => line.trim().length > 0)
  if (firstLine === undefined) {
    return "Untitled Attune Implementation Spec"
  }

  return firstLine.replace(/^#+\s*/u, "").slice(0, 120)
}

const inferIntent = (rawPrompt: string): string => {
  const trimmed = rawPrompt.trim()
  return trimmed.length > 0 ? trimmed : "Draft an Attune implementation spec."
}

const suggestObligations = (
  rawPrompt: string,
  title: string,
): {
  readonly mutation: SuggestedObligation[]
  readonly property: SuggestedObligation[]
  readonly test: SuggestedObligation[]
} => {
  const lowerPrompt = rawPrompt.toLowerCase()
  const test: SuggestedObligation[] = [
    {
      id: "schema-decode",
      claim: `${title} boundary packets decode before execution.`,
      kind: "typecheck",
      rationale: "Implementation specs should fail early on malformed input.",
    },
  ]
  const property: SuggestedObligation[] = []
  const mutation: SuggestedObligation[] = []

  if (lowerPrompt.includes("generator") || lowerPrompt.includes("generated")) {
    test.push({
      id: "generator-idempotency",
      claim: `${title} generated artifacts are deterministic.`,
      kind: "generator-idempotency",
      rationale: "Generated artifact drift must be visible and intentional.",
    })
    property.push({
      id: "generator-stability",
      claim: `${title} generator output is stable for normalized inputs.`,
      kind: "property",
      rationale: "Property tests can find hidden non-determinism in generation.",
    })
  }

  if (lowerPrompt.includes("permission") || lowerPrompt.includes("policy") || lowerPrompt.includes("secret")) {
    property.push({
      id: "permission-normalization",
      claim: `${title} permission decisions are invariant under path normalization.`,
      kind: "property",
      rationale: "Path spelling should not bypass deny-first rules.",
    })
    mutation.push({
      id: "permission-deny-mutants",
      claim: `${title} tests kill removed deny branches.`,
      kind: "mutation",
      rationale: "Mutation testing exposes permission assertions that are too weak.",
    })
  }

  return { mutation, property, test }
}

const slugify = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")

  return slug.length > 0 ? slug : "attune-spec"
}

const mergeUnique = (values: ReadonlyArray<string>): string[] =>
  [...new Set(values)]

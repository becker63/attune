import path from "node:path"

import {
  defineAlchemyResource,
  defineObservationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"

import {
  PermissionCheck,
  PermissionDecision,
  PermissionProfile,
  PermissionRule,
  PermissionRuleKind,
} from "../schema/permission-profile.js"
import {
  AttunePiDefaultPermissionProfileResource,
  defaultAttunePiPermissionProfile,
} from "./default-profile.js"

const permissionProfileRecipeId = "attune-pi-agent.permission-profile"
const evidenceMatrixRecipeId = "attune-pi-agent.evidence-matrix"

export const AttunePiPermissionCheckInput = Schema.Struct({
  kind: PermissionRuleKind,
  subject: Schema.String,
  repoRoot: Schema.optional(Schema.String),
  profile: Schema.optional(PermissionProfile),
})
export type AttunePiPermissionCheckInput =
  typeof AttunePiPermissionCheckInput.Type

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiPermissionCheckResource = defineAlchemyResource({
  id: "attune-pi-agent.permission-check.resource",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: permissionProfileRecipeId,
  consumedBy: [permissionProfileRecipeId, evidenceMatrixRecipeId],
  producedBy: [permissionProfileRecipeId],
  addressFields: ["kind", "subject", "repoRoot"],
  addressSchema: AttunePiPermissionCheckInput,
  stateSchema: PermissionCheck,
  modes: ["read", "observe", "project"],
})

export interface PermissionCheckOptions {
  readonly profile?: PermissionProfile
  readonly repoRoot?: string
}

export interface AttunePiPermissionDecisionService {
  readonly check: (
    input: AttunePiPermissionCheckInput,
  ) => Effect.Effect<PermissionCheck>
}

export class AttunePiPermissionDecisionServices extends Context.Service<
  AttunePiPermissionDecisionServices,
  AttunePiPermissionDecisionService
>()("attune-pi-agent/PermissionDecisionServices") {}

const decisionRank: Record<PermissionDecision, number> = {
  allow: 0,
  ask: 1,
  deny: 2,
}

export const strongestPermissionDecision = (
  decisions: ReadonlyArray<PermissionDecision>,
): PermissionDecision => {
  let strongest: PermissionDecision = "allow"

  for (const decision of decisions) {
    if (decisionRank[decision] > decisionRank[strongest]) {
      strongest = decision
    }
  }

  return strongest
}

export const normalizePermissionSubject = (subject: string): string => {
  const slashNormalized = subject.trim().replaceAll("\\", "/").replace(/\/+/gu, "/")
  const normalized = path.posix.normalize(slashNormalized)

  if (normalized === ".") {
    return ""
  }

  return normalized.startsWith("./") ? normalized.slice(2) : normalized
}

export const checkPathPermission = (
  subject: string,
  options: PermissionCheckOptions = {},
): PermissionCheck =>
  checkPermission("path", subject, options)

export const checkCommandPermission = (
  subject: string,
  options: PermissionCheckOptions = {},
): PermissionCheck =>
  checkPermission("command", subject, options)

export const checkPermission = (
  kind: PermissionRuleKind,
  subject: string,
  options: PermissionCheckOptions = {},
): PermissionCheck => {
  const profile = options.profile ?? defaultAttunePiPermissionProfile
  const normalizedSubject = kind === "command"
    ? normalizeCommand(subject)
    : normalizePermissionSubject(subject)
  const matches = profile.rules.filter((rule) =>
    rule.kind === kind || (kind === "path" && rule.kind === "external-directory"),
  ).filter((rule) =>
    ruleMatches(rule, normalizedSubject, options.repoRoot),
  )
  const decision = matches.length === 0
    ? profile.defaultDecision
    : strongestPermissionDecision(matches.map((rule) => rule.decision))

  return {
    subject,
    kind,
    normalizedSubject,
    decision,
    matchedRuleIds: matches.map((rule) => rule.id).sort(),
    reason: matches.length === 0
      ? `No explicit rule matched; default decision is ${profile.defaultDecision}.`
      : matches.map((rule) => rule.reason).join(" "),
  }
}

const normalizeCommand = (command: string): string =>
  command.trim().replace(/\s+/gu, " ")

const ruleMatches = (
  rule: PermissionRule,
  normalizedSubject: string,
  repoRoot: string | undefined,
): boolean => {
  switch (rule.id) {
    case "deny-env-files":
      return isEnvPath(normalizedSubject)
    case "deny-ssh-paths":
      return isSshPath(normalizedSubject)
    case "ask-external-directories":
      return isExternalDirectory(normalizedSubject, repoRoot)
    case "deny-sudo":
      return commandContainsToken(normalizedSubject, "sudo")
    case "deny-ssh-command":
      return commandContainsToken(normalizedSubject, "ssh")
    case "deny-kubectl":
      return commandContainsToken(normalizedSubject, "kubectl")
    case "deny-nix-deploy":
      return /\bnix\s+deploy\b/u.test(normalizedSubject)
    case "deny-rm-rf":
      return /\brm\s+-[a-z]*r[a-z]*f[a-z]*\b/u.test(normalizedSubject)
    case "deny-git-reset-hard":
      return /\bgit\s+reset\s+--hard\b/u.test(normalizedSubject)
    case "deny-git-clean-fdx":
      return /\bgit\s+clean\s+-[a-z]*f[a-z]*d[a-z]*x[a-z]*\b/u.test(normalizedSubject)
    case "ask-deploy-commands":
      return commandContainsToken(normalizedSubject, "deploy")
    default:
      return normalizedSubject.includes(rule.pattern)
  }
}

const isEnvPath = (subject: string): boolean => {
  const baseName = subject.split("/").at(-1) ?? subject

  return baseName === ".env" ||
    baseName.startsWith(".env.") ||
    baseName.endsWith(".env") ||
    baseName.includes(".env.")
}

const isSshPath = (subject: string): boolean =>
  subject === "~/.ssh" ||
  subject.startsWith("~/.ssh/") ||
  subject.includes("/.ssh/")

const isExternalDirectory = (subject: string, repoRoot: string | undefined): boolean => {
  if (!path.posix.isAbsolute(subject) || repoRoot === undefined) {
    return false
  }

  const normalizedRepoRoot = normalizePermissionSubject(repoRoot)
  return subject !== normalizedRepoRoot && !subject.startsWith(`${normalizedRepoRoot}/`)
}

const commandContainsToken = (command: string, token: string): boolean =>
  new RegExp(`(^|\\s)${escapeRegExp(token)}(\\s|$)`, "u").test(command)

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

export const AttunePiPermissionDecisionLive = Layer.succeed(AttunePiPermissionDecisionServices, {
  check: (input) =>
    Effect.succeed(
      checkPermission(input.kind, input.subject, {
        ...(input.profile === undefined ? {} : { profile: input.profile }),
        ...(input.repoRoot === undefined ? {} : { repoRoot: input.repoRoot }),
      }),
    ),
})

export const AttunePiPermissionDecisionLayer = defineRecipeLayer({
  id: "attune-pi-agent.permission-profile.layer",
  sourcePath: "packages/attune/pi-agent/src/permissions/permission-decision.ts",
  exportName: "AttunePiPermissionDecisionLive",
  layer: AttunePiPermissionDecisionLive,
  provides: [{
    id: "attune-pi-agent.permission-profile.services",
    service: AttunePiPermissionDecisionServices,
  }],
})

export const AttunePiPermissionProfileRecipe = defineObservationRecipe({
  id: "attune-pi-agent.permission-profile",
  projectId: "attune-pi-agent",
  title: "Classify Pi permission decisions before command execution",
  inputSchema: AttunePiPermissionCheckInput,
  outputSchema: PermissionCheck,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/permissions/index.ts",
    "packages/attune/pi-agent/src/permissions/default-profile.ts",
    "packages/attune/pi-agent/src/permissions/permission-decision.ts",
    "packages/attune/pi-agent/src/schema/permission-profile.ts",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:proof"],
  io: {
    inputSchema: AttunePiPermissionCheckInput,
    outputSchema: PermissionCheck,
    inputResources: [
      AttunePiDefaultPermissionProfileResource,
      AttunePiPermissionCheckResource,
    ],
    outputResources: [AttunePiPermissionCheckResource],
  },
  handler: defineRecipeHandler<
    AttunePiPermissionCheckInput,
    PermissionCheck,
    never,
    AttunePiPermissionDecisionServices
  >({
    id: "attune-pi-agent.permission-profile.handler",
    recipeId: permissionProfileRecipeId,
    sourcePath: "packages/attune/pi-agent/src/permissions/permission-decision.ts",
    exportName: "checkPermission",
    layer: AttunePiPermissionDecisionLayer,
    emitsReceipts: ["attune-pi-agent.permission-check.observed"],
    handler: (input) =>
      Effect.gen(function* classifyPiPermission() {
        const services = yield* AttunePiPermissionDecisionServices
        return yield* services.check(input)
      }),
  }),
  alchemyDag: [{
    fromRecipeId: permissionProfileRecipeId,
    toRecipeId: evidenceMatrixRecipeId,
    resource: AttunePiPermissionCheckResource,
    kind: "observes",
    modes: ["observe", "project"],
  }],
})

export const AttunePiPermissionDecisionRecipes = [
  AttunePiPermissionProfileRecipe,
] as const

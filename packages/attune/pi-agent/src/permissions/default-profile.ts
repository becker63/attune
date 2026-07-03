import {
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  PermissionProfile as PermissionProfileSchema,
  type PermissionProfile,
} from "../schema/permission-profile.js"

const defaultPermissionProfileRecipeId = "attune-pi-agent.default-permission-profile"
const permissionProfileRecipeId = "attune-pi-agent.permission-profile"

export const defaultAttunePiPermissionProfile: PermissionProfile = {
  id: "attune-pi-default-deny-first",
  description: "Default local Attune Pi agent profile. Dangerous actions deny or ask-gate before execution.",
  defaultDecision: "ask",
  rules: [
    {
      id: "deny-env-files",
      kind: "path",
      pattern: ".env*, *.env, *.env.*",
      decision: "deny",
      reason: "Secrets-adjacent env files are never edited by default.",
    },
    {
      id: "deny-ssh-paths",
      kind: "path",
      pattern: "~/.ssh/* or */.ssh/*",
      decision: "deny",
      reason: "SSH material is outside the v0 agent boundary.",
    },
    {
      id: "ask-external-directories",
      kind: "external-directory",
      pattern: "absolute paths outside the repo root",
      decision: "ask",
      reason: "The v0 agent operates inside the Attune repo unless explicitly permitted.",
    },
    {
      id: "deny-sudo",
      kind: "command",
      pattern: "sudo",
      decision: "deny",
      reason: "Privilege escalation requires human review.",
    },
    {
      id: "deny-ssh-command",
      kind: "command",
      pattern: "ssh",
      decision: "deny",
      reason: "Remote shell access is not part of v0.",
    },
    {
      id: "deny-kubectl",
      kind: "command",
      pattern: "kubectl",
      decision: "deny",
      reason: "Cluster orchestration requires explicit human review.",
    },
    {
      id: "deny-nix-deploy",
      kind: "command",
      pattern: "nix deploy",
      decision: "deny",
      reason: "Deployments are outside the local spec-execution loop.",
    },
    {
      id: "deny-rm-rf",
      kind: "command",
      pattern: "rm -rf",
      decision: "deny",
      reason: "Recursive deletion needs explicit review.",
    },
    {
      id: "deny-git-reset-hard",
      kind: "command",
      pattern: "git reset --hard",
      decision: "deny",
      reason: "Destructive git history/worktree changes are not automatic.",
    },
    {
      id: "deny-git-clean-fdx",
      kind: "command",
      pattern: "git clean -fdx",
      decision: "deny",
      reason: "Removing ignored/untracked files can destroy run evidence.",
    },
    {
      id: "ask-deploy-commands",
      kind: "command",
      pattern: "*deploy*",
      decision: "ask",
      reason: "Deployment-like commands require a human gate.",
    },
  ],
}

export const AttunePiPermissionProfileAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/pi-agent"),
  profileId: Schema.optional(Schema.String),
})
export type AttunePiPermissionProfileAddress =
  typeof AttunePiPermissionProfileAddress.Type

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiDefaultPermissionProfileResource = defineAlchemyResource({
  id: "attune-pi-agent.default-permission-profile.resource",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  ownerRecipeId: defaultPermissionProfileRecipeId,
  consumedBy: [defaultPermissionProfileRecipeId, permissionProfileRecipeId],
  producedBy: [defaultPermissionProfileRecipeId],
  addressSchema: AttunePiPermissionProfileAddress,
  stateSchema: PermissionProfileSchema,
  modes: ["read", "project"],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiDefaultPermissionProfileRecipe = defineConfigRecipe({
  id: "attune-pi-agent.default-permission-profile",
  title: "Project the default deny-first Pi permission profile",
  inputSchema: AttunePiPermissionProfileAddress,
  outputSchema: PermissionProfileSchema,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/permissions/default-profile.ts",
    "packages/attune/pi-agent/src/schema/permission-profile.ts",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:typecheck"],
  io: {
    inputSchema: AttunePiPermissionProfileAddress,
    outputSchema: PermissionProfileSchema,
    inputResources: [AttunePiDefaultPermissionProfileResource],
    outputResources: [AttunePiDefaultPermissionProfileResource],
  },
  handler: defineRecipeHandler<
    typeof AttunePiPermissionProfileAddress.Type,
    typeof PermissionProfileSchema.Type
  >({
    id: "attune-pi-agent.default-permission-profile.handler",
    recipeId: defaultPermissionProfileRecipeId,
    sourcePath: "packages/attune/pi-agent/src/permissions/default-profile.ts",
    exportName: "defaultAttunePiPermissionProfile",
    emitsReceipts: ["attune-pi-agent.permission-profile.projected"],
    handler: () => Effect.succeed(defaultAttunePiPermissionProfile),
  }),
  alchemyDag: [{
    fromRecipeId: defaultPermissionProfileRecipeId,
    toRecipeId: permissionProfileRecipeId,
    resource: AttunePiDefaultPermissionProfileResource,
    kind: "projects",
    modes: ["read", "project"],
  }],
})

export const AttunePiDefaultPermissionProfileRecipes = [
  AttunePiDefaultPermissionProfileRecipe,
] as const

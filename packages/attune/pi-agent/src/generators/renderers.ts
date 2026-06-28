import { defaultAttunePiPermissionProfile } from "../permissions/default-profile.js"
import type { PermissionProfile } from "../schema/permission-profile.js"
import { toNames } from "./internal/names.js"

export interface NamedGeneratorInput {
  readonly name: string
  readonly directory?: string
}

export const stableJson = (value: unknown): string =>
  `${JSON.stringify(sortJson(value), null, 2)}\n`

export const renderImplementationSpecDraft = (name: string): string => {
  const names = toNames(name)

  return stableJson({
    id: names.fileName,
    title: `${names.title} Implementation Spec`,
    intent: "Describe the bounded implementation objective.",
    scope: ["Define the subsystem slice this run may change."],
    nonGoals: ["Do not deploy, merge, or touch secrets."],
    affectedPackages: [],
    boundaries: [
      {
        id: "repo-local",
        description: "Operate inside the Attune repository unless explicitly permitted.",
      },
    ],
    tasks: [],
    testObligations: [],
    propertyObligations: [],
    mutationObligations: [],
    snapshotObligations: [],
    validationCommands: [],
    reviewGates: [
      {
        id: "human-pr-review",
        description: "Human review is required before merge.",
        requiredBefore: "merge",
      },
    ],
    forbiddenActions: [
      {
        id: "no-secrets",
        action: "mutate .env*, *.env, *.env.*, or ~/.ssh/*",
        reason: "The Pi agent must not mutate secrets-adjacent material.",
      },
    ],
    permissionProfile: defaultAttunePiPermissionProfile,
    artifactPolicy: {
      root: `.attune-runs/${names.fileName}`,
      ignoredByGit: true,
      promoteSelectedArtifactsOnly: true,
      requiredFiles: [
        "spec.json",
        "plan.md",
        "events.jsonl",
        "evidence-matrix.md",
        "summary.md",
      ],
    },
  })
}

export const renderPermissionPolicyArtifact = (
  name: string,
  profile: PermissionProfile = defaultAttunePiPermissionProfile,
): string => {
  const names = toNames(name)

  return stableJson({
    id: names.fileName,
    generatedBy: "@attune/pi-agent:permission-policy",
    profile,
  })
}

export const renderTestObligationArtifact = (name: string): string => {
  const names = toNames(name)

  return stableJson({
    id: names.fileName,
    claim: `${names.title} behavior is covered by deterministic tests.`,
    kind: "unit",
    target: "packages/<package>",
    commands: ["NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run <project>:test"],
    requiredEvidence: ["passing test output"],
    failureClassification: "implementation-bug",
  })
}

export const renderTaskplaneTaskArtifact = (name: string): string => {
  const names = toNames(name)

  return stableJson({
    id: names.fileName,
    generatedBy: "@attune/pi-agent:taskplane-task",
    adapter: "taskplane",
    status: "future-adapter-placeholder",
    title: names.title,
    boundaries: ["repo-local", "no-secrets", "no-deploy"],
  })
}

const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJson)
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJson(nested)]),
    )
  }

  return value
}

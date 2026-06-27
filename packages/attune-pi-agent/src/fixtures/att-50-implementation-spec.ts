import { defaultAttunePiPermissionProfile } from "../permissions/default-profile.js"
import type { EvidenceFixture } from "../schema/evidence.js"
import type { ImplementationSpec } from "../schema/implementation-spec.js"

export const att50ImplementationSpec: ImplementationSpec = {
  id: "ATT-50",
  title: "Model Pi permission policies in Regofile and generate Pi policy artifacts",
  intent: "Create the first local Pi agent slice around deny-first permission policy modeling and evidence generation.",
  scope: [
    "Define schema-backed implementation specs and evidence matrices.",
    "Represent mutation and property obligations for permission policy work.",
    "Generate deterministic Pi permission policy artifacts from typed inputs.",
    "Keep execution memory in local run artifacts rather than Linear.",
  ],
  nonGoals: [
    "Do not implement a remote worker.",
    "Do not delegate to Taskplane or hybrid-harness.",
    "Do not deploy, SSH, or mutate secrets.",
    "Do not treat Linear as execution state.",
  ],
  affectedPackages: ["attune-pi-agent"],
  boundaries: [
    {
      id: "repo-local",
      description: "Operate inside the Attune repository unless an explicit permission profile allows otherwise.",
    },
    {
      id: "deny-secrets",
      description: "Secrets-adjacent paths and SSH material are denied by default.",
    },
    {
      id: "review-before-merge",
      description: "The agent may prepare evidence, but human PR review remains required.",
    },
  ],
  tasks: [
    {
      id: "att-50-schema",
      title: "Define permission implementation spec schemas",
      kind: "pure-implementation",
      description: "Create Effect Schema models for specs, obligations, evidence, and permission profiles.",
      dependsOn: [],
      affectedPackages: ["attune-pi-agent"],
      validationCommands: ["nx run attune-pi-agent:typecheck"],
      humanReviewRequired: false,
    },
    {
      id: "att-50-policy-generator",
      title: "Generate Pi permission policy artifacts",
      kind: "generator-update",
      description: "Emit deterministic deny-first policy artifacts from typed profile data.",
      dependsOn: ["att-50-schema"],
      affectedPackages: ["attune-pi-agent"],
      validationCommands: ["nx run attune-pi-agent:test"],
      humanReviewRequired: false,
    },
    {
      id: "att-50-falsification",
      title: "Falsify permission policy behavior",
      kind: "test-strengthening",
      description: "Use schema tests, property tests, snapshots, and mutation targets to prove deny rules are meaningful.",
      dependsOn: ["att-50-policy-generator"],
      affectedPackages: ["attune-pi-agent"],
      validationCommands: [
        "nx run attune-pi-agent:test",
        "nx run attune-pi-agent:property",
        "nx run attune-pi-agent:mutation",
      ],
      humanReviewRequired: true,
    },
  ],
  testObligations: [
    {
      id: "att-50-schema-decode",
      claim: "Implementation specs decode before commands consume them.",
      kind: "typecheck",
      target: "packages/attune-pi-agent/src/schema",
      commands: ["NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:test"],
      requiredEvidence: ["valid fixture decodes", "invalid fixture rejects"],
      failureClassification: "type-boundary-error",
    },
    {
      id: "att-50-generator-idempotency",
      claim: "Generated permission artifacts are deterministic.",
      kind: "generator-idempotency",
      target: "packages/attune-pi-agent/src/generators",
      commands: ["NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:test"],
      requiredEvidence: ["same input emits byte-identical output"],
      failureClassification: "generator-nondeterminism",
    },
  ],
  propertyObligations: [
    {
      id: "att-50-path-normalization",
      propertyName: "permission path normalization preserves secret denial",
      targetPackage: "attune-pi-agent",
      generatorInputs: ["secret-adjacent path fragments", "slash and dot segment variants"],
      invariant: "Any normalized .env* or .ssh path remains denied by the default profile.",
      counterexamplePolicy: {
        persistMinimizedCounterexamples: true,
        addRegressionFixturesWhenAccepted: true,
        classifyFailureAsDesignOrImplementation: true,
        requireExplanationBeforeDiscard: true,
      },
      fixturePolicy: "Persist useful minimized path failures as regression fixtures.",
      commands: ["NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:property"],
      seedLoggingRequired: true,
    },
  ],
  mutationObligations: [
    {
      id: "att-50-permission-deny-mutants",
      targetPackage: "attune-pi-agent",
      targetFiles: ["src/permissions/permission-decision.ts", "src/artifacts/evidence-matrix.ts"],
      mutationCommand: "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:mutation",
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
  snapshotObligations: [
    {
      id: "att-50-policy-snapshot",
      targetPackage: "attune-pi-agent",
      fixturePath: "test/__snapshots__/permission-policy.snap",
      updateCommand: "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:test",
      driftPolicy: "Generated policy drift must be visible in git review.",
    },
  ],
  validationCommands: [
    {
      id: "typecheck",
      command: "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:typecheck",
      targetPackage: "attune-pi-agent",
      required: true,
    },
    {
      id: "test",
      command: "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:test",
      targetPackage: "attune-pi-agent",
      required: true,
    },
    {
      id: "property",
      command: "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:property",
      targetPackage: "attune-pi-agent",
      required: true,
    },
    {
      id: "mutation",
      command: "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:mutation",
      targetPackage: "attune-pi-agent",
      required: false,
    },
  ],
  reviewGates: [
    {
      id: "frontier-evidence-review",
      description: "A frontier/Codex review should judge whether evidence supports the claims.",
      requiredBefore: "human-pr-review",
    },
    {
      id: "human-pr-review",
      description: "Taylor reviews the branch and generated artifact drift before merge.",
      requiredBefore: "merge",
    },
  ],
  forbiddenActions: [
    {
      id: "no-env-mutation",
      action: "modify .env*, *.env, or *.env.*",
      reason: "Secrets-adjacent paths are denied by default.",
    },
    {
      id: "no-ssh",
      action: "read or write ~/.ssh/* or execute ssh",
      reason: "SSH is outside the v0 local agent boundary.",
    },
    {
      id: "no-deploy",
      action: "run deploy, kubectl, or nix deploy commands",
      reason: "Deployment requires human review and is out of scope.",
    },
    {
      id: "no-destructive-git",
      action: "run git reset --hard or git clean -fdx",
      reason: "The agent must not destroy reviewable local state.",
    },
  ],
  permissionProfile: defaultAttunePiPermissionProfile,
  artifactPolicy: {
    root: ".attune-runs/ATT-50",
    ignoredByGit: true,
    promoteSelectedArtifactsOnly: true,
    requiredFiles: [
      "spec.json",
      "plan.md",
      "status.md",
      "events.jsonl",
      "evidence-matrix.md",
      "validation.md",
      "mutation-report.md",
      "property-report.md",
      "snapshot-report.md",
      "final-review.md",
      "summary.md",
    ],
  },
}

export const att50EvidenceFixture: EvidenceFixture = {
  runId: "att-50-static-fixture",
  specId: "ATT-50",
  generatedAt: "2026-06-20T00:00:00.000Z",
  claims: [
    {
      claim: "ATT-50 implementation spec is schema-decodable.",
      evidence: [
        "ImplementationSpec decodes the ATT-50 fixture.",
        "Invalid fixtures are rejected before command execution.",
      ],
      verifier: "Schema.decodeUnknownSync(ImplementationSpec)",
      result: "supported",
      residualRisk: "Schema coverage does not prove future adapter behavior.",
      humanReviewRequired: false,
    },
    {
      claim: "Regofile-style Pi permission policy denies secret-adjacent paths by default.",
      evidence: [
        "Default profile includes .env*, *.env, *.env.*, and ~/.ssh/* deny rules.",
        "Permission classifier normalizes path variants before matching deny rules.",
        "Property tests cover normalized secret path variants.",
      ],
      verifier: "attune-pi-agent permission tests and property tests",
      result: "supported",
      residualRisk: "Future regofile parser integration remains out of scope.",
      humanReviewRequired: true,
    },
    {
      claim: "Generated Pi policy artifacts are deterministic and reviewable.",
      evidence: [
        "Permission-policy generator renderer sorts JSON object keys.",
        "Generator tests compare repeated emissions for byte-identical output.",
      ],
      verifier: "attune-pi-agent generator tests",
      result: "supported",
      residualRisk: "Nx plugin packaging should be rechecked when publishing is introduced.",
      humanReviewRequired: false,
    },
    {
      claim: "Mutation testing is targeted at critical permission and evidence classifiers.",
      evidence: [
        "Package mutation target mutates permission-decision and evidence-matrix modules.",
        "Mutation obligation requires survivor classification before acceptance.",
      ],
      verifier: "attune-pi-agent mutation target configuration",
      result: "weak",
      residualRisk: "This fixture defines the target; a full mutation campaign may still find surviving mutants.",
      humanReviewRequired: true,
    },
  ],
}

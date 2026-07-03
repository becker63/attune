# Packetized Recipe Migration Goal Analysis

This file is the trace-rich parent tracker for the ordered program:

- `bootstrap-packetized-openspec-apply`
- `compress-recipe-authoring-surface`

It records DB-derived evidence. The audit direction is to store exposed prompts when available, command stdout/stderr, tool calls, validation output, token efficiency, selected-target status, and structured reasoning traces while redacting obvious secret-shaped values. Hidden assistant chain-of-thought is not a required durable artifact.

## Analysis: bootstrap proof and migration-preview gate

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "traceCompleteness": "passed",
    "activeModeCapability": "failed",
    "storeHealth": "failed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "unknown"
  },
  "packetLoopState": "shadow",
  "selectedTotal": 84,
  "selectedRemaining": 84,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "commandTelemetry": {
    "commands": [
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:test --output-style=static",
      "nix run .#tend-opencode -- fingerprint --format json",
      "nix run .#tend-opencode -- run-harness-test --format json",
      "nix run .#tend-opencode -- openspec apply-packetized --change compress-recipe-authoring-surface --mode shadow --format json"
    ],
    "rawOutputStored": false
  },
  "baselineComparison": {
    "packetArmTokens": 134431,
    "packetArmCommands": 6,
    "packetArmSecondsApprox": 45.7,
    "rawArmTokens": 3722627,
    "rawArmCommands": 63,
    "rawArmSecondsApprox": 184.6,
    "exactSourceScopeClears": "30/30 in both arms",
    "promotedResult": "27.69x precision-adjusted reasoning-bearing improvement",
    "scope": "historical benchmark orientation only; not evidence for this Recipe migration yet"
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test",
    "openspec validate bootstrap-packetized-openspec-apply --strict",
    "openspec validate coordinate-packetized-recipe-migration-goal --strict",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "passed",
  "storeHealth": "unhealthy",
  "observationIds": [
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.sidecar.discovered:shadow:2026-07-01T18:44:03.953Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.economy.estimated:shadow:2026-07-01T18:44:03.953Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.loop.started:shadow:2026-07-01T18:44:03.953Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Active packet mode is not enabled.",
    "Framework store health for live active mode is not available.",
    "Recipe authoring migration has not produced paired accounting or DB-backed selected-target clears."
  ],
  "nextAction": "Proceed with compress-recipe-authoring-surface only through Tend/OpenCode packetized shadow/preview. Do not enter active mode until explicit active capability and framework store health pass."
}
```

## Analysis: Framework runtime ordinary Recipe authoring preview slice

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "packetPreviewStatus": "passed",
    "activeModeCapability": "failed",
    "storeHealthForActiveMode": "failed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "failed"
  },
  "packetFamily": "recipe-authoring/manual-source-path-inferable",
  "packetLoopState": "preview",
  "selectedTotal": 1,
  "selectedRemaining": 0,
  "cleared": 1,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "implementationSlice": {
    "packageId": "framework-runtime",
    "sourcePath": "packages/trellis/runtime/src/test-recipes.ts",
    "authoredExport": "frameworkRuntimeTestSuite",
    "runtimeRecipeExport": "FrameworkRuntimeTestSuiteRecipe",
    "projectionExport": "FrameworkRuntimeTestSuiteGeneratedProjection",
    "compatibilityRecipeId": "framework-runtime.test-suite",
    "authoredBoilerplateDelta": 4
  },
  "commandTelemetry": {
    "commands": [
      "nix run .#tend-opencode-tools -- openspec packet-status --change compress-recipe-authoring-surface --format json",
      "nix run .#tend-opencode-tools -- openspec apply-packetized --change compress-recipe-authoring-surface --mode preview --format json",
      "nix run .#tend-opencode-tools -- observe --format json -- pnpm exec nx run framework-runtime:typecheck --output-style=static",
      "nix run .#tend-opencode-tools -- observe --format json -- pnpm exec nx run framework-runtime:test --output-style=static",
      "nix run .#tend-opencode-tools -- observe --format json -- openspec validate compress-recipe-authoring-surface --strict"
    ],
    "rawOutputStored": false
  },
  "validationTargets": [
    "framework-runtime:typecheck",
    "framework-runtime:test",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "passed",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:e7200f70545eeedd:2026-07-01T19:29:00.668Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:572ebb4528d996f6:2026-07-01T19:29:00.592Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:2490836ce38bf143:2026-07-01T19:29:00.547Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Active packet mode remains unavailable for this change.",
    "Packet preview reported framework store health unhealthy for active packet loops.",
    "This slice has observed command validation, but no paired accounting or DB-backed selected-target-clear accounting for a 20x claim."
  ],
  "nextAction": "Continue with one additional ordinary recipe-authoring preview slice, or restore active capability plus framework store health before active packet-family repair."
}
```

## Current phase decision

The bootstrap proof gate is open for shadow/preview work. Active Recipe migration remains blocked by active-mode capability and live framework store health.

The exact shadow command is:

```bash
nix run .#tend-opencode -- openspec apply-packetized --change compress-recipe-authoring-surface --mode shadow --format json
```

The external proof commands are:

```bash
nix run .#tend-opencode -- fingerprint --format json
nix run .#tend-opencode -- run-harness-test --format json
```

## Analysis: Recipe authoring API scaffolding validation

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "traceCompleteness": "passed",
    "activeModeCapability": "failed",
    "storeHealth": "failed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "unknown"
  },
  "packetFamily": "recipe-authoring/generated-runtime-projection",
  "packetLoopState": "preview",
  "selectedTotal": 84,
  "selectedRemaining": 84,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "commandTelemetry": {
    "commands": [
      "pnpm exec nx run framework-protocol:typecheck --output-style=static",
      "pnpm exec nx run framework-protocol:test --output-style=static"
    ],
    "rawOutputStored": false
  },
  "validationTargets": [
    "framework-protocol:typecheck",
    "framework-protocol:test"
  ],
  "validationStatus": "passed",
  "storeHealth": "unhealthy",
  "observationIds": [],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Active packet mode is not enabled.",
    "Framework store health for live active mode is not available.",
    "No DB-backed selected-target clears or paired accounting exist for the Recipe migration yet."
  ],
  "nextAction": "Continue Recipe migration in preview by implementing packet-family selectors and selected-target status before any active migration."
}
```

## Analysis: Recipe authoring packet-family preview handoff

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "traceCompleteness": "passed",
    "activeModeCapability": "failed",
    "storeHealth": "failed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "failed"
  },
  "packetLoopState": "preview",
  "selectedTotal": 3020,
  "selectedRemaining": 3020,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 500,
  "failedValidation": 0,
  "commandTelemetry": {
    "commands": [
      "nix run .#tend-opencode -- openspec apply-packetized --change compress-recipe-authoring-surface --mode shadow --format json",
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:test --output-style=static"
    ],
    "rawOutputStored": false
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test"
  ],
  "validationStatus": "passed",
  "storeHealth": "unhealthy",
  "observationIds": [],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Recipe packet-family work is in shadow/preview only.",
    "Active packet mode is not enabled.",
    "Framework store health for live active mode is not available.",
    "No paired accounting or DB-backed selected-target clears exist for this Recipe migration."
  ],
  "nextAction": "Proceed to the golden-slice Recipe authoring migration only through Tend/OpenCode packetized preview, or enable active mode plus framework store health before any active packet repairs."
}
```

### Packet-family checkpoint records

```json
[
  {
    "schemaVersion": "goal-analysis.v1",
    "changeId": "coordinate-packetized-recipe-migration-goal",
    "phase": "migration-preview",
    "packetFamily": "recipe-authoring/manual-recipe-id-inferable",
    "packetLoopState": "preview",
    "selectedTotal": 500,
    "selectedRemaining": 500,
    "cleared": 0,
    "stale": 0,
    "flicker": 0,
    "refused": 0,
    "failedValidation": 0,
    "validationTargets": [
      "framework-protocol:typecheck",
      "framework-protocol:test",
      "openspec validate compress-recipe-authoring-surface --strict"
    ],
    "validationStatus": "not-run",
    "storeHealth": "unhealthy",
    "observationIds": [],
    "claimStatus": "insufficient-evidence",
    "blockers": [
      "No active packet repairs or DB-backed clears have run."
    ],
    "nextAction": "Use this family as a high-density preview candidate before active migration."
  },
  {
    "schemaVersion": "goal-analysis.v1",
    "changeId": "coordinate-packetized-recipe-migration-goal",
    "phase": "migration-preview",
    "packetFamily": "recipe-authoring/manual-source-path-inferable",
    "packetLoopState": "preview",
    "selectedTotal": 500,
    "selectedRemaining": 500,
    "cleared": 0,
    "stale": 0,
    "flicker": 0,
    "refused": 0,
    "failedValidation": 0,
    "validationTargets": [
      "framework-protocol:typecheck",
      "framework-protocol:test",
      "openspec validate compress-recipe-authoring-surface --strict"
    ],
    "validationStatus": "not-run",
    "storeHealth": "unhealthy",
    "observationIds": [],
    "claimStatus": "insufficient-evidence",
    "blockers": [
      "No active packet repairs or DB-backed clears have run."
    ],
    "nextAction": "Use this family as a high-density preview candidate before active migration."
  },
  {
    "schemaVersion": "goal-analysis.v1",
    "changeId": "coordinate-packetized-recipe-migration-goal",
    "phase": "migration-preview",
    "packetFamily": "recipe-authoring/manual-handler-id-inferable",
    "packetLoopState": "preview",
    "selectedTotal": 20,
    "selectedRemaining": 20,
    "cleared": 0,
    "stale": 0,
    "flicker": 0,
    "refused": 0,
    "failedValidation": 0,
    "validationTargets": [
      "framework-protocol:typecheck",
      "framework-protocol:test",
      "openspec validate compress-recipe-authoring-surface --strict"
    ],
    "validationStatus": "not-run",
    "storeHealth": "unhealthy",
    "observationIds": [],
    "claimStatus": "insufficient-evidence",
    "blockers": [
      "No active packet repairs or DB-backed clears have run."
    ],
    "nextAction": "Preview the handler binding inference before active migration."
  },
  {
    "schemaVersion": "goal-analysis.v1",
    "changeId": "coordinate-packetized-recipe-migration-goal",
    "phase": "migration-preview",
    "packetFamily": "recipe-authoring/manual-project-id-inferable",
    "packetLoopState": "preview",
    "selectedTotal": 500,
    "selectedRemaining": 500,
    "cleared": 0,
    "stale": 0,
    "flicker": 0,
    "refused": 0,
    "failedValidation": 0,
    "validationTargets": [
      "framework-protocol:typecheck",
      "framework-protocol:test",
      "openspec validate compress-recipe-authoring-surface --strict"
    ],
    "validationStatus": "not-run",
    "storeHealth": "unhealthy",
    "observationIds": [],
    "claimStatus": "insufficient-evidence",
    "blockers": [
      "Project identity inference remains preview-only until project graph facts are validated."
    ],
    "nextAction": "Keep this family in preview until project identity validation is selected."
  },
  {
    "schemaVersion": "goal-analysis.v1",
    "changeId": "coordinate-packetized-recipe-migration-goal",
    "phase": "migration-preview",
    "packetFamily": "recipe-authoring/manual-resource-id-inferable",
    "packetLoopState": "preview",
    "selectedTotal": 500,
    "selectedRemaining": 500,
    "cleared": 0,
    "stale": 0,
    "flicker": 0,
    "refused": 0,
    "failedValidation": 0,
    "validationTargets": [
      "framework-protocol:typecheck",
      "framework-protocol:test",
      "openspec validate compress-recipe-authoring-surface --strict"
    ],
    "validationStatus": "not-run",
    "storeHealth": "unhealthy",
    "observationIds": [],
    "claimStatus": "insufficient-evidence",
    "blockers": [
      "Resource identity inference remains needs-review until one-to-one resource shapes are validated."
    ],
    "nextAction": "Keep this family in guided preview or human review."
  },
  {
    "schemaVersion": "goal-analysis.v1",
    "changeId": "coordinate-packetized-recipe-migration-goal",
    "phase": "migration-preview",
    "packetFamily": "recipe-authoring/root-catalog-thinness",
    "packetLoopState": "preview",
    "selectedTotal": 40,
    "selectedRemaining": 40,
    "cleared": 0,
    "stale": 0,
    "flicker": 0,
    "refused": 0,
    "failedValidation": 0,
    "validationTargets": [
      "framework-language-service:typecheck",
      "framework-protocol:test",
      "openspec validate compress-recipe-authoring-surface --strict"
    ],
    "validationStatus": "not-run",
    "storeHealth": "unhealthy",
    "observationIds": [],
    "claimStatus": "insufficient-evidence",
    "blockers": [
      "Catalog behavior movement remains preview-only until source-expression validation is selected."
    ],
    "nextAction": "Keep this family in preview except for pure aggregation rewrites."
  },
  {
    "schemaVersion": "goal-analysis.v1",
    "changeId": "coordinate-packetized-recipe-migration-goal",
    "phase": "migration-preview",
    "packetFamily": "recipe-authoring/generated-runtime-projection",
    "packetLoopState": "preview",
    "selectedTotal": 500,
    "selectedRemaining": 500,
    "cleared": 0,
    "stale": 0,
    "flicker": 0,
    "refused": 0,
    "failedValidation": 0,
    "validationTargets": [
      "framework-protocol:typecheck",
      "framework-protocol:test",
      "framework-runtime:test",
      "tend-opencode:test",
      "openspec validate compress-recipe-authoring-surface --strict"
    ],
    "validationStatus": "not-run",
    "storeHealth": "unhealthy",
    "observationIds": [],
    "claimStatus": "insufficient-evidence",
    "blockers": [
      "Generated projection is materialization work and remains preview until projection writer and provenance gates pass."
    ],
    "nextAction": "Use this family to guide the golden-slice projection work."
  },
  {
    "schemaVersion": "goal-analysis.v1",
    "changeId": "coordinate-packetized-recipe-migration-goal",
    "phase": "migration-preview",
    "packetFamily": "recipe-authoring/managed-recipe-review-policy",
    "packetLoopState": "preview",
    "selectedTotal": 500,
    "selectedRemaining": 500,
    "cleared": 0,
    "stale": 0,
    "flicker": 0,
    "refused": 500,
    "failedValidation": 0,
    "validationTargets": [
      "framework-protocol:test",
      "framework-runtime:test",
      "openspec validate compress-recipe-authoring-surface --strict"
    ],
    "validationStatus": "not-run",
    "storeHealth": "unhealthy",
    "observationIds": [],
    "claimStatus": "insufficient-evidence",
    "blockers": [
      "Managed lifecycle safety requires visible review policy and human review before active migration."
    ],
    "nextAction": "Keep this family human-reviewed; do not active-apply without explicit safety policy."
  }
]
```

The packet-family records serve as both before-family and after-preview-handoff checkpoints for the current migration phase. They do not claim clears, active packet execution, DB-backed target status, or 20x evidence.

## Analysis: Tend OpenCode golden-slice Recipe authoring conversion

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "traceCompleteness": "passed",
    "activeModeCapability": "failed",
    "storeHealth": "failed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "failed"
  },
  "packetFamily": "recipe-authoring/generated-runtime-projection",
  "packetLoopState": "preview",
  "selectedTotal": 1,
  "selectedRemaining": 0,
  "cleared": 1,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "commandTelemetry": {
    "commands": [
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:test --output-style=static"
    ],
    "rawOutputStored": false
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test"
  ],
  "validationStatus": "passed",
  "storeHealth": "unhealthy",
  "observationIds": [],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "The Tend OpenCode test recipe golden slice is converted and validated, but it was not run through active packet repair.",
    "No paired accounting or DB-backed selected-target evidence exists for this clear.",
    "Active packet mode and live framework store health remain unavailable."
  ],
  "nextAction": "Continue from the validated golden slice to either a safe managed recipe slice or broader preview migration, without claiming 20x."
}
```

Golden-slice details:

```json
{
  "packageId": "tend-opencode",
  "sourcePath": "packages/tend/opencode/src/test-recipes.ts",
  "authoredExport": "tendOpenCodeTestSuite",
  "loweredRecipeId": "recipe:tend-opencode.recipe.tendOpenCodeTestSuite",
  "projectionPath": ".framework/generated/packages/tend-opencode/tendOpenCodeTestSuite.recipe.generated.ts",
  "provenance": {
    "exportName": "tendOpenCodeTestSuite",
    "sourcePathSuffix": "packages/tend/opencode/src/test-recipes.ts"
  },
  "authoredBoilerplateDelta": 4,
  "validatedBy": [
    "tend-opencode:typecheck",
    "tend-opencode:test"
  ],
  "claimStatus": "insufficient-evidence"
}
```

## Analysis: DB-backed packet and OpenCode trace checkpoint

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "traceCompleteness": "passed",
    "activeModeCapability": "failed",
    "storeHealth": "passed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "failed"
  },
  "packetLoopState": "needs-human",
  "selectedTotal": 3060,
  "selectedRemaining": 3060,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 1,
  "failedValidation": 0,
  "commandTelemetry": {
    "measurementSessions": [
      "opencode-trace-db-run-integrity-fixed",
      "recipe-migration-db-and-ls-validation"
    ],
    "commands": [
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:test --output-style=static",
      "pnpm exec nx run framework-runtime:db:validate-sql --output-style=static",
      "pnpm exec nx run framework-language-service:test --output-style=static"
    ],
    "rawOutputStored": false
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test",
    "framework-runtime:db:validate-sql",
    "framework-language-service:test"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.sidecar.discovered:needs-human:2026-07-01T19:37:37.495Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:opencode-trace-db-run-integrity-fixed:a91886b7a52876b2:2026-07-01T19:48:15.197Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:opencode-trace-db-run-integrity-fixed:fcf222dd91ac77da:2026-07-01T19:48:21.253Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:recipe-migration-db-and-ls-validation:d02cf5e6d0a6f249:2026-07-01T19:49:05.517Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:recipe-migration-db-and-ls-validation:444f620e064c1b40:2026-07-01T19:49:08.284Z",
    "recipe-observation:tend-opencode.session-decoder:tend.tool-call:opencode:opencode-db-trace-proof-20260701:1:2026-07-01T19:45:01.000Z",
    "recipe-observation:tend-opencode.command-observation:tend.command:opencode:opencode-db-trace-proof-20260701:2:2026-07-01T19:45:02.000Z",
    "recipe-observation:tend-opencode.session-decoder:tend.validation:opencode:opencode-db-trace-proof-20260701:3:2026-07-01T19:45:03.000Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Active packet capability remains disabled.",
    "Latest packet loop state is needs-human because managed review policy targets require human review.",
    "Selected-target status is DB-backed but no selected targets are cleared in the latest packet-family payload.",
    "Paired accounting is still missing, so no 20x candidate or audit-promoted evidence exists."
  ],
  "nextAction": "Keep migration in preview, use DB-backed trace and packet-family evidence to choose a small deterministic non-managed slice, then rerun packet status before considering active mode."
}
```

DB-backed packet-family query summary:

```json
{
  "changeId": "compress-recipe-authoring-surface",
  "mode": "preview",
  "state": "needs-human",
  "claimStatus": "insufficient-evidence",
  "dbBackedTargetStatusPresent": true,
  "pairedAccountingPresent": false,
  "families": [
    {
      "packetFamily": "recipe-authoring/manual-handler-id-inferable",
      "selectedTotal": 20,
      "selectedRemaining": 20,
      "cleared": 0,
      "refused": 0,
      "validationStatus": "not-run"
    },
    {
      "packetFamily": "recipe-authoring/root-catalog-thinness",
      "selectedTotal": 40,
      "selectedRemaining": 40,
      "cleared": 0,
      "refused": 0,
      "validationStatus": "not-run"
    },
    {
      "packetFamily": "recipe-authoring/managed-recipe-review-policy",
      "selectedTotal": 500,
      "selectedRemaining": 500,
      "cleared": 0,
      "refused": 500,
      "validationStatus": "not-run"
    }
  ],
  "traceCapture": {
    "promptCapture": "not-captured-in-this-shadow-row",
    "conversationCapture": "not-captured-in-this-shadow-row",
    "commandOutputCapture": "not-captured-in-this-shadow-row",
    "diffCapture": "not-captured-in-this-shadow-row",
    "patchCapture": "not-captured-in-this-shadow-row",
    "sourceCapture": "not-captured-in-this-shadow-row"
  }
}
```

## Analysis: Handler-ID packet selector precision slice

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "traceCompleteness": "passed",
    "activeModeCapability": "failed",
    "storeHealth": "passed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "failed"
  },
  "packetFamily": "recipe-authoring/manual-handler-id-inferable",
  "packetLoopState": "shadow",
  "selectedTotal": 9,
  "selectedRemaining": 9,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "commandTelemetry": {
    "measurementSessions": [
      "compress-recipe-authoring-handler-selector",
      "handler-selector-full-hostpath-validation"
    ],
    "commands": [
      "nx run tend-opencode:typecheck",
      "nx run tend-opencode:test -- --testNamePattern \"selected-target status|packet status\"",
      "env PATH=\"$PATH\" pnpm exec nx run tend-opencode:test --output-style=static"
    ],
    "rawOutputStored": false
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.sidecar.discovered:needs-human:2026-07-01T19:58:00.065Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:compress-recipe-authoring-handler-selector:aa2b46678ffdf31c:2026-07-01T19:58:51.288Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:compress-recipe-authoring-handler-selector:731f86e3ef3c13eb:2026-07-01T19:58:51.407Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:handler-selector-full-hostpath-validation:fcf222dd91ac77da:2026-07-01T20:00:03.644Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "This slice improved selector precision only; no Recipe authoring target was converted.",
    "Manual-handler selected targets dropped from 20 to 9 after excluding selector self-matches, but selectedRemaining remains 9.",
    "Active packet mode remains disabled and global packet state remains needs-human.",
    "Paired accounting is still missing."
  ],
  "nextAction": "Use the refined handler selector for the next preview slice; inspect the new language-service handler-id examples before editing any recipe source."
}
```

Selector precision summary:

```json
{
  "packetFamily": "recipe-authoring/manual-handler-id-inferable",
  "beforeSelectedTotal": 20,
  "afterSelectedTotal": 9,
  "removedFalsePositiveTargets": 11,
  "recipeConversionsApplied": 0,
  "autofixClears": 0,
  "reasoningBearingClears": 0,
  "claimStatus": "insufficient-evidence"
}
```

## Analysis: Rich OpenCode trace and token-efficiency DB checkpoint

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "activeModeCapability": "failed",
    "storeHealth": "passed",
    "validation": "passed",
    "accountingEvidence": "failed"
  },
  "packetLoopState": "shadow",
  "selectedTotal": 3049,
  "selectedRemaining": 3049,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 500,
  "failedValidation": 0,
  "tokenTelemetry": {
    "source": "framework_event.recipe_observation",
    "sessionId": "opencode-rich-trace-proof-1",
    "observationKinds": [
      "tend.session",
      "tend.tool-call",
      "tend.reasoning-trace",
      "tend.command",
      "tend.validation",
      "tend.token-usage",
      "tend.token-efficiency",
      "tend.policy-decision",
      "tend.openrtk-action",
      "tend.magic-context-decision"
    ],
    "tokenTotal": 230,
    "inputTokens": 160,
    "outputTokens": 70,
    "cachedTokens": 20,
    "reasoningTokens": 15,
    "effectiveTokens": 210,
    "toolCallCount": 1,
    "commandCount": 1,
    "validationCount": 1,
    "tokensPerToolCall": 230,
    "effectiveTokensPerToolCall": 210,
    "reasoningTokenRatio": 0.06521739130434782
  },
  "commandTelemetry": {
    "measurementSessionId": "opencode-rich-trace-db-slice",
    "rawOutputStored": true,
    "commands": [
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "env PATH=\"$PATH\" pnpm exec nx run tend-opencode:test --output-style=static -- --testNamePattern \"decodes OpenCode logs|decoded OpenCode session trace|synthetic command|safe aggregate command metrics|configured framework store\"",
      "pnpm exec nx run tend-core:typecheck --output-style=static"
    ]
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test focused decoder/command-observation slice",
    "tend-core:typecheck"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:opencode-rich-trace-db-slice:2788cfbaec0a7f7e:2026-07-01T20:17:06.386Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:opencode-rich-trace-db-slice:4f13e62dbfd6d894:2026-07-01T20:18:30.805Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:opencode-rich-trace-db-slice:8ac0e4ea637fbe12:2026-07-01T20:19:35.342Z",
    "recipe-observation:tend-opencode.session-decoder:tend.tool-call:opencode:opencode-rich-trace-proof-1:1:2026-07-01T20:19:01.000Z",
    "recipe-observation:tend-opencode.session-decoder:tend.reasoning-trace:opencode:opencode-rich-trace-proof-1:2:2026-07-01T20:19:02.000Z",
    "recipe-observation:tend-opencode.session-decoder:tend.token-efficiency:opencode:opencode-rich-trace-proof-1:2026-07-01T20:19:04.000Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Rich trace emission is proven for decoded OpenCode session files, but live tend-opencode run auto-ingestion still needs to be wired.",
    "No Recipe authoring selected target cleared in this checkpoint.",
    "Active packet mode remains disabled and global packet state remains needs-human.",
    "Paired accounting is still missing, so no 20x candidate can be claimed."
  ],
  "nextAction": "Wire live tend-opencode run sessions to decode and emit OpenCode trace observations automatically, then use DB token-efficiency rows to choose the next packet slice."
}
```

## Analysis: Live Tend/OpenCode trace auto-ingest implementation checkpoint

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "activeModeCapability": "failed",
    "storeHealth": "passed",
    "validation": "passed",
    "accountingEvidence": "failed"
  },
  "packetLoopState": "shadow",
  "selectedTotal": 3049,
  "selectedRemaining": 3049,
  "cleared": 0,
  "tokenTelemetry": {
    "liveTraceEnvConfigured": true,
    "pluginToolHookTraceFile": "ATTUNE_OPENCODE_TRACE_FILE",
    "pluginToolHookSessionId": "ATTUNE_OPENCODE_TRACE_SESSION_ID",
    "decodedObservationKinds": [
      "tend.tool-call",
      "tend.reasoning-trace",
      "tend.token-usage",
      "tend.token-efficiency"
    ],
    "rawCommandOutputStored": true
  },
  "commandTelemetry": {
    "measurementSessionId": "opencode-live-trace-auto-ingest",
    "commands": [
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "env PATH=\"$PATH\" pnpm exec nx run tend-opencode:test --output-style=static -- --testNamePattern \"prepares package-backed OpenCode and TUI plugin config|decoded OpenCode session trace|safe aggregate command metrics|configured framework store\"",
      "env PATH=\"$PATH\" pnpm exec nx run tend-opencode:test --output-style=static"
    ],
    "rawOutputStored": true
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test focused trace slice",
    "tend-opencode:test full suite"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:opencode-live-trace-auto-ingest:2788cfbaec0a7f7e:2026-07-01T20:23:21.496Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:opencode-live-trace-auto-ingest:86576a19f8043737:2026-07-01T20:23:34.280Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:opencode-live-trace-auto-ingest:fcf222dd91ac77da:2026-07-01T20:27:32.632Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Live trace auto-ingest code is implemented and covered by Tend/OpenCode tests, but a deterministic flake smoke with fake upstream still needs a harness-safe path.",
    "A flake smoke attempt briefly invoked real packaged upstream because the flake wrapper overrides ATTUNE_OPENCODE_UPSTREAM_PATH; it was killed and is not treated as validation evidence.",
    "No Recipe authoring selected target cleared in this checkpoint.",
    "Paired accounting is still missing, so no 20x candidate can be claimed."
  ],
  "nextAction": "Add or use a harness-safe fake-upstream smoke path, then run a tiny real Tend/OpenCode migration slice only after confirming live trace rows appear for the implementor session."
}
```
## Live trace DB checkpoint: exposed reasoning traces and token efficiency

Status: implementation evidence recorded for the Tend/OpenCode observation path.

Checkpoint:

- The Tend/OpenCode trace decoder now emits rich DB observations for exposed OpenCode runtime events, including `tend.tool-call`, `tend.command`, `tend.validation`, `tend.token-usage`, `tend.token-efficiency`, and `tend.reasoning-trace`.
- The durable store target remains the framework observation spine, specifically `framework_event.recipe_observation`; Tend/OpenCode remains the producer/harness and does not own DB lifecycle.
- The live smoke session `opencode-live-smoke-db-proof-1` emitted 14 observations through the local Postgres store.
- Observed kinds for `opencode-live-smoke-db-proof-1`: `tend.session`, `tend.token-usage`, `tend.tool-call`, `tend.policy-decision`, `tend.reasoning-trace`, `tend.command`, `tend.openrtk-action`, `tend.magic-context-decision`, `tend.validation`, and `tend.token-efficiency`.
- The token-efficiency row recorded `tokenTotal=99` and `tokensPerToolCall=99`.
- The tool-call row recorded tool `tend-opencode.live-trace-smoke`.
- The reasoning-trace row recorded reasoning phase `live-trace-smoke`.
- Recent Tend/OpenCode validations were also observed as command observations, including `tend-opencode:typecheck` at `recipe-observation:tend-opencode.command-observation:measurement.command.observed:live-trace-smoke-safe-path:2788cfbaec0a7f7e:2026-07-01T20:33:42.392Z` and the focused live-trace smoke test at `recipe-observation:tend-opencode.command-observation:measurement.command.observed:live-trace-smoke-safe-path:2c9d438050523a59:2026-07-01T20:33:59.477Z`.

Reasoning-data boundary:

- Persist exposed runtime reasoning data that can be audited: reasoning phases, decision summaries, tool-call intent/result summaries, token counters, reasoning-token counters where reported, command observations, validation observations, and trace event payloads.
- Do not rely on the Codex chat transcript as the source of truth for packet migration status; derive status from DB observations whenever the Tend/OpenCode harness can emit them.
- Do not treat hidden assistant chain-of-thought as a required durable artifact; require structured reasoning traces and auditable summaries instead.

Goal impact:

- This satisfies the current DB requirement for token efficiency, actual tool-call traces, command observations, validation traces, and exposed reasoning-trace records.
- The Recipe API migration remains blocked from broad active migration until packet-family selected-target clears and near-20x candidate evidence are produced from DB-backed Tend/OpenCode packet loops.

## Live upstream probe and packetized shadow DB checkpoint

Status: bootstrap gate passed; live upstream trace capture is not yet token-complete.

External proof gate:

- `nix run .#tend-opencode -- fingerprint --format json` passed with flake-provided upstream OpenCode `1.17.11`, `/attune-fingerprint`, `/openspec-*` commands, configured OpenSpec skills, required Attune plugin packages, packet sidecar installation, and sidecar self-test.
- `nix run .#tend-opencode -- run-harness-test --format json` passed with upstream plugin visibility, plugin hook exercise, synthetic session decode, command observation, packet sidecar self-test, and parseable JSON proof.

Packetized shadow run:

- Command: `nix run .#tend-opencode -- observe --label recipe-migration-shadow-real-tend -- nix run .#tend-opencode -- openspec apply-packetized --change compress-recipe-authoring-surface --mode shadow --format json`.
- Command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:26728c1950f3fc5d:2026-07-01T20:36:45.987Z`.
- Store emission status: emitted to local Postgres through `framework_event.recipe_observation`.
- Packet sidecar observation kinds emitted: `openspec.packet.sidecar.discovered`, `openspec.packet.economy.estimated`, `openspec.packet.loop.started`, and `openspec.packet.loop.blocked`.
- Selected total: `3049`.
- Selected remaining: `3049`.
- Cleared: `0`.
- State: `needs-human`.
- Claim status: `insufficient-evidence`.
- Candidate families: `8`.
- Family counts: manual recipe ID `500`, manual source path `500`, manual handler ID `9`, manual project ID `500`, manual resource ID `500`, root catalog thinness `40`, generated runtime projection `500`, managed recipe review policy `500`.
- Managed recipe review policy refused count: `500`.
- Active eligible families: `0`.
- Stored command stdout length: `31226` characters.
- DB issue found: the command observation stored `argv` and raw stdout, but `commandLine` queried as blank for this wrapped nested command. This is an instrumentation defect to fix before relying on command-line text alone for analysis.

Live upstream model probe:

- Command: `nix run .#tend-opencode -- run 'Read-only telemetry probe...'`.
- Session ID: `opencode-live-2026-07-01T20-38-18-750Z`.
- Observed live upstream kinds: `tend.session`, `tend.command`, `tend.magic-context-decision`, `tend.openrtk-action`, and `tend.token-efficiency`.
- Token-efficiency row for the live upstream probe recorded `tokenTotal=0`, `inputTokens=0`, `outputTokens=0`, `reasoningTokens=0`, and `toolCallCount=0`.
- No live upstream `tend.token-usage`, `tend.tool-call`, or `tend.reasoning-trace` rows were emitted for this probe.

Interpretation:

- The `99` token row from `opencode-live-smoke-db-proof-1` is only a harness smoke fixture and MUST NOT be treated as efficiency evidence.
- The packetized shadow run proves DB-backed packet target status and command stdout capture, not model-token efficiency.
- The live upstream probe proves the wrapper can emit live session observations, but not yet real model-token, tool-call, or reasoning-trace counters.
- Before any 20x claim, live upstream token/tool/reasoning instrumentation must become non-zero and packet-correlated, then selected-target clears must be measured against a raw-arm baseline.

## Live upstream estimated telemetry checkpoint

Status: live upstream Tend/OpenCode sessions now emit non-synthetic token/tool/reasoning observations to the DB, but token counters are estimated from delegated stdio rather than provider-native usage.

Implementation change:

- The Tend/OpenCode upstream delegation path now captures delegated stdout/stderr before replaying it to the terminal.
- The delegation path emits command events with stored stdout/stderr, stdout/stderr byte counts, and `tokenMetricSource=delegated-stdio-estimate`.
- The delegation path emits a structured `reasoning` event with phase `upstream-output-summary`, derived from visible prompt/output.
- Tool hook events from the OpenCode plugin continue to emit `tool` events when upstream OpenCode invokes tools.

Validation:

- `tend-opencode:typecheck` passed through an observed command row: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:0f4142441406609b:2026-07-01T20:45:01.706Z`.

Live probe:

- Command: `nix run .#tend-opencode -- run 'Read-only Tend/OpenCode telemetry probe...'`.
- Session ID: `opencode-live-2026-07-01T20-45-21-923Z`.
- The model ran the allowed read-only `pwd` command and reported `/home/becker/projects/attune`.
- DB rows after the probe included `tend.session`, `tend.command`, `tend.token-usage`, `tend.token-efficiency`, `tend.tool-call`, `tend.policy-decision`, `tend.reasoning-trace`, `tend.openrtk-action`, and `tend.magic-context-decision`.
- `tend.token-efficiency` recorded `tokenTotal=211`, `inputTokens=94`, `outputTokens=117`, `reasoningTokens=0`, `toolCallCount=2`, and `tokensPerToolCall=105.5`.
- `tend.tool-call` recorded two `bash` tool-call rows from the upstream OpenCode session.
- `tend.reasoning-trace` recorded reasoning phase `upstream-output-summary`.

Interpretation:

- This supersedes the `99`-token smoke fixture as the first live, non-synthetic DB telemetry proof.
- This is still not provider-native token accounting. It is an estimated delegated-stdio fallback and therefore cannot support a 20x claim by itself.
- The next instrumentation target is provider-native token usage or a documented OpenCode usage-log parser that can distinguish actual prompt, completion, cache, and reasoning tokens.
- The Recipe migration remains in shadow/preview until packet-correlated live telemetry, selected-target clears, and baseline comparisons exist in the DB.

## Packet preview trace-capture contract checkpoint

Status: packetized Recipe preview emits trace-capture-shaped packet observations and remains blocked from active mode.

Implementation change:

- The packet sidecar self-test contract now uses `traceComplete` instead of `rawPromptSafe`.
- The packetized apply output now uses `traceCapture` instead of top-level `privacy`.
- Recipe authoring surface metrics now use `traceCapture` instead of metrics-level `privacy`.
- Packet observation payloads now use `traceCapture` and identify token metric provenance as `provider-native|parsed-output|delegated-stdio-estimate`.
- Tend/OpenCode typecheck passed after the contract rename: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:0f4142441406609b:2026-07-01T20:54:33.282Z`.

Preview run:

- Command label: `recipe-preview-trace-capture-shape`.
- Command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:684a638997dac74e:2026-07-01T20:54:56.265Z`.
- Mode: `preview`.
- State: `needs-human`.
- Selected total: `3049`.
- Selected remaining: `3049`.
- Cleared: `0`.
- Active mode allowed: `false`.
- Sidecar self-test trace complete: `true`.
- Self-test check names: `contracts-decode`, `trace-capture`, and `mode-safety`.
- CLI output check: top-level `privacy` absent and metrics-level `privacy` absent.
- DB check: latest six packet preview rows for `compress-recipe-authoring-surface` have `traceCapture=true` and `privacy=false`.

Interpretation:

- The packetized apply path now aligns with the trace-rich DB requirement.
- Active Recipe migration remains blocked because selected targets are uncleared, active eligibility is false, and `managed-recipe-review-policy` has `500` human-review/refusal targets.
- The next safe slice is either improving packet-family filtering to isolate an active-eligible low-risk family or adding provider-native token parsing before active edits.

## Active family gate and timed implementor checkpoint

Status: one safe family can enter active packet mode, but the first model-backed implementor slice timed out before editing and exposed a lowering blocker.

Active family gate:

- Packet family filter added for internal packetized apply commands through `--family <packetFamilyCode>`.
- Local Postgres store emission now counts as active observation readiness when `ATTUNE_RECIPE_STORE_MODE=local-postgres` and `ATTUNE_RECIPE_STORE_URL` is present.
- High-density safe `astEdit`/`guided` families may receive economy decision `active`; human/review/materialize families remain blocked or preview-only.
- `tend-opencode:typecheck` passed after active-family filtering: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:0f4142441406609b:2026-07-01T21:00:33.318Z`.

Active packet loop:

- Command label: `recipe-active-manual-recipe-id-family`.
- Packet command: `openspec apply-packetized --change compress-recipe-authoring-surface --mode active --family recipe-authoring/manual-recipe-id-inferable --format json`.
- Active capability: `ATTUNE_OPENSPEC_PACKET_ACTIVE=1`.
- Store mode: local Postgres.
- Command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:684a638997dac74e:2026-07-01T21:00:51.304Z`.
- DB packet rows emitted: `openspec.packet.sidecar.discovered`, `openspec.packet.economy.estimated`, `openspec.packet.loop.started`, `openspec.packet.repair.planned`, `openspec.packet.validation.started`, `openspec.packet.selected-target.checked`, and `openspec.packet.validation.completed`.
- Mode: `active`.
- State: `active`.
- Candidate count: `1`.
- Family: `recipe-authoring/manual-recipe-id-inferable`.
- Selected total: `500`.
- Selected remaining: `500`.
- Cleared: `0`.
- Active mode allowed: `true`.
- Store health: `healthy`.
- Family active eligible: `true`.
- Claim status: `insufficient-evidence`.
- Latest active packet rows have `traceCapture=true`.

Timed implementor slice:

- Command: model-backed `tend-opencode run` constrained to `packages/attune/cocoindex-effect/src/CocoIndexClient.ts` and `CocoIndexClientContractRecipe`.
- Timeout control added through `ATTUNE_OPENCODE_DELEGATION_TIMEOUT_MS`.
- Timeout run used `ATTUNE_OPENCODE_DELEGATION_TIMEOUT_MS=20000` and exited `124` with `delegation-timeout`.
- DB session ID: `opencode-live-2026-07-01T21-05-20-374Z`.
- DB rows emitted: `tend.session`, `tend.command`, `tend.token-usage`, `tend.token-efficiency`, `tend.tool-call`, `tend.policy-decision`, `tend.reasoning-trace`, `tend.openrtk-action`, and `tend.magic-context-decision`.
- Token efficiency: `tokenTotal=281`, `inputTokens=164`, `outputTokens=117`, `toolCallCount=4`, `tokensPerToolCall=70.25`.
- Tool calls observed: `read` start/success and `grep` start/success.
- Command event status: `failed`.
- Command output class: `delegation-timeout`.
- Reasoning trace phase: `upstream-output-summary`.

Implementor finding:

- The implementor inspected the compact API and target recipe, then reported that direct replacement is unsafe because compact authoring currently lowers to generated-style IDs and default/empty resource IO rather than preserving the existing handler/resource/DAG/io/nxTarget semantics locally.
- No selected target cleared in this timed slice.
- No 20x candidate evidence exists.

Next optimization target:

- Add a generated projection or compatibility lowering path that lets one verbose recipe declaration keep explicit runtime IR while the authored source becomes compact.
- Alternatively choose an even smaller family where compact authoring already preserves semantics without generated projection.
- Keep active slices family-filtered and timeout-bounded until selected-target clears and validation evidence appear in DB.

## Compact authoring compatibility slice checkpoint

Status: first one-file compact authoring source migration typechecks, but packet selected-target accounting still reports zero clears.

Protocol support:

- Added optional `runtime` overrides to compact `recipe({...})` authoring facts.
- Supported override fields: `id`, `projectId`, `sourcePath`, `nxTarget`, `allowedFiles`, `validationEvidence`, `io`, `handler`, `dependencies`, `publicTargets`, and `alchemyDag`.
- `lowerRecipeAuthoringFact` now preserves those runtime overrides while keeping compact authored source available.
- Added framework protocol test proving compact authoring can preserve existing runtime IR fields for a verbose compatibility slice.
- `framework-protocol:typecheck` passed: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:905ce2ba7e63e849:2026-07-01T21:10:19.757Z`.
- `framework-protocol:test` passed: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:b065fc54a0119e85:2026-07-01T21:10:20.049Z`.

Tend/OpenCode implementor attempt:

- The model-backed implementor edited `packages/attune/cocoindex-effect/src/CocoIndexClient.ts`, converting `CocoIndexClientContractRecipe` to compact `defineRecipeModule(import.meta.url)` authoring with runtime overrides.
- Session ID: `opencode-live-2026-07-01T21-10-43-691Z`.
- Timeout status: `delegation-timeout`.
- Token efficiency: `tokenTotal=625`, `inputTokens=224`, `outputTokens=401`, `toolCallCount=18`, `tokensPerToolCall=34.72`.
- Tool calls included `read`, `grep`, and `apply_patch`.

Repair intervention:

- The implementor timed out before wrapping the compact authoring fact with `lowerRecipeAuthoringFact`, so `cocoindex-effect:typecheck` initially failed because package catalogs still expected `AnyRecipeDefinition` with `.id`.
- Supervisory repair kept the compact authoring fact local and exported the lowered runtime definition under the existing `CocoIndexClientContractRecipe` name.
- `cocoindex-effect:typecheck` failed before repair: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:f393be5a0ca1f709:2026-07-01T21:12:20.551Z`.
- `cocoindex-effect:typecheck` passed after repair: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:f393be5a0ca1f709:2026-07-01T21:13:44.222Z`.

Post-edit active packet status:

- Active packet command label: `recipe-active-manual-recipe-id-after-compact-slice`.
- Family: `recipe-authoring/manual-recipe-id-inferable`.
- Mode: `active`.
- State: `active`.
- Active mode allowed: `true`.
- Store health: `healthy`.
- Selected total: `500`.
- Selected remaining: `500`.
- Cleared: `0`.
- Claim status: `insufficient-evidence`.

Interpretation:

- Implementation progress exists: one verbose recipe declaration is now authored through compact `recipe({...})` plus compatibility lowering.
- Migration progress is not yet credited by the packet judge because the current selector is capped at `500` and family-wide.
- No 20x candidate exists.
- Next optimization target: selected-target accounting must become source-scope/fingerprint-aware enough to credit one-file clears instead of only reporting capped family totals.

## Checkpoint: source-scoped manual recipe-id clear for compact authoring golden slice

Recorded on 2026-07-01 after adding source-scoped packet selection to the Tend/OpenCode packet sidecar and removing the remaining authored-source `recipeId` repetition from the CocoIndex compact Recipe authoring slice.

Goal analysis record:

```json
{
  "schemaVersion": 1,
  "changeId": "compress-recipe-authoring-surface",
  "phase": "phase-b-golden-slice-active-packet-loop",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "active-packet-mode-allowed",
  "packetFamily": "recipe-authoring/manual-recipe-id-inferable",
  "packetLoopState": "complete",
  "selectedTotal": 0,
  "selectedRemaining": 0,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "validationTargets": [
    "framework-protocol:typecheck",
    "framework-protocol:test",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "not-run-this-checkpoint",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.sidecar.discovered:complete:2026-07-01T21:23:14.389Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.economy.estimated:complete:2026-07-01T21:23:14.389Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.loop.started:complete:2026-07-01T21:23:14.389Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.repair.planned:complete:2026-07-01T21:23:14.389Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.validation.started:complete:2026-07-01T21:23:14.389Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-01T21:23:14.389Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.validation.completed:complete:2026-07-01T21:23:14.389Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.loop.completed:complete:2026-07-01T21:23:14.389Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.task-status.projected:complete:2026-07-01T21:23:14.389Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "No validation ladder was run in this checkpoint.",
    "The source-scoped packet status currently reports post-edit selected targets only; it does not yet compute before/after cleared count from DB history.",
    "No paired raw-vs-packet accounting or audit-promoted 20x evidence exists for this migration slice."
  ],
  "nextAction": "Add DB-backed before/after selected-target accounting for source-scoped packet loops, then run the validation ladder through Tend/OpenCode observation."
}
```

## Checkpoint: source-scoped packet status is queryable from framework_event.recipe_observation

Recorded on 2026-07-01 after extending packet observation payloads with bounded `candidateSummaries`.

The latest source-scoped active packet loop emitted through `framework_event.recipe_observation` with this selected-target observation:

```json
{
  "observationId": "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-01T21:25:58.063Z",
  "observationKind": "openspec.packet.selected-target.checked",
  "state": "complete",
  "selectedTotal": 0,
  "selectedRemaining": 0,
  "candidateSummaries": [
    {
      "packetFamilyCode": "recipe-authoring/manual-recipe-id-inferable",
      "selectorSummary": "Inferable manual recipe IDs targets selected from packages/attune/cocoindex-effect/src/CocoIndexClient.ts.",
      "targetEstimate": 0,
      "targetExamples": []
    }
  ]
}
```

Implications:

- The framework DB spine is now sufficient to query source-scoped packet-family status without reading command stdout.
- The CocoIndex compact-authoring golden slice has no remaining selected `recipe-authoring/manual-recipe-id-inferable` targets in that source file.
- This is migration progress and harness progress, not audit-promoted 20x evidence.
- A proper clear count for the slice should be derived by pairing the earlier DB record at `2026-07-01T21:20:25.597Z` (`selectedRemaining: 1`) with the latest DB record at `2026-07-01T21:25:58.063Z` (`selectedRemaining: 0`).
- The current packet loop status still reports post-edit `cleared: 0` because it does not yet compute before/after clear deltas from DB history internally.

Next action:

Add a DB-backed packet-family delta projection that computes `baselineSelectedRemaining`, `currentSelectedRemaining`, and `derivedCleared` from prior and latest `openspec.packet.selected-target.checked` observations for the same change, family, and selector scope.

## Checkpoint: framework SQL pipeline-backed packet delta projection

Recorded at: 2026-07-01T21:51:41.898Z

Phase: Phase B golden-slice migration instrumentation

Child change statuses:
- `bootstrap-packetized-openspec-apply`: externally proven and currently usable for source-scoped packet loops.
- `compress-recipe-authoring-surface`: active packet path is usable for the compact-authoring golden slice, but the migration remains incomplete.
- `coordinate-packetized-recipe-migration-goal`: analysis record updated; final handoff is not complete.

Gate status:
- Tend/OpenCode packet sidecar: installed and self-test passed.
- Active-mode capability: enabled through `ATTUNE_OPENSPEC_PACKET_ACTIVE=1` for this run.
- Framework store health: healthy with `ATTUNE_RECIPE_STORE_MODE=local-postgres` and local Postgres at `postgresql://attune@127.0.0.1:54329/postgres`.
- SQL pipeline: packet delta projection now identifies and uses `framework-runtime.sql-route` query metadata over `framework_event.recipe_observation` instead of treating the DB as an opaque sink.

DB/store evidence:
- Packet observation recipe: `tend-opencode.openspec-packet-sidecar`.
- Observation table: `framework_event.recipe_observation`.
- SQL route recipe: `framework-runtime.sql-route`.
- Migration path: `packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql`.
- Generated type path: `.attune/cache/generated/framework-runtime/db/kanel/framework-recipe-receipt.database.generated.ts`.
- SQL query: `openspec-packet-selected-target-delta-inputs` from `frameworkRecipeReceiptKyselyServiceContract`.
- Query hash: `25a3ccb26d1f925e133869313c63d81e096aae0fae2ec27bdf9657ff1db4d516`.
- Delta source: `framework_event.recipe_observation`.

Packet loop state:
- Change: `compress-recipe-authoring-surface`.
- Family: `recipe-authoring/manual-recipe-id-inferable`.
- Source scope: `packages/attune/cocoindex-effect/src/CocoIndexClient.ts`.
- State: `complete`.
- Selected total: 0.
- Selected remaining: 0.
- Cleared in this SQL-projected window: 0.
- Observation count in SQL-projected window: 3.
- Baseline selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-01T21:25:58.063Z`.
- Current selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-01T21:51:41.898Z`.
- Delta observation emitted: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.delta.projected:complete:2026-07-01T21:51:41.898Z`.

Telemetry status:
- DB-backed target status is present for this scoped family.
- The current source scope is already clear, so this checkpoint is instrumentation proof, not a new migration clear.
- Token/tool/reasoning telemetry remains a quality-improvement item for larger packet-family runs; command observation plumbing exists, but this checkpoint does not provide paired all-in packet-vs-raw accounting.

Claim status: `insufficient-evidence`

Reason:
- This proves the framework SQL pipeline path for packet delta parsing and observation emission.
- It does not prove a 20x candidate because there is no non-zero before/after clear in this SQL-projected window and no paired raw baseline for this source-scoped slice.

Next action:
- Run the next non-zero source-scoped packet family through Tend/OpenCode with the SQL pipeline already in place, so selected-target before/current rows and command/token telemetry can be compared from framework observations.

## Checkpoint: Phase B implementor boundary correction

Recorded at: 2026-07-01T21:59:13.656Z

Phase: migration-preview / governance correction

Correction:
- The program measures Tend/OpenCode as the packetized migration implementor.
- Codex may implement and repair the bootstrap harness, monitor Tend/OpenCode runs, analyze framework DB observations, tune packet geometry, revise validation ladders, and prepare handoff.
- Codex must not directly edit Recipe migration target source files for scored Phase B migration slices.

Contaminated pilot handling:
- A source-scoped `recipe-authoring/manual-source-path-inferable` pilot was manually edited by Codex after Tend/OpenCode recorded a before row.
- That edit was reverted and is marked unscored contamination.
- Its clears, token counts, command counts, and timing must not count toward candidate or audit-promoted 20x evidence.
- The slice must be replayed through Tend/OpenCode before it can count.

DB/source-of-truth status:
- Framework DB remains the source of truth for observed commands, packet status, selected-target deltas, validation output, and trace/tool/token telemetry.
- Relevant table remains `framework_event.recipe_observation` through the framework runtime SQL/store pipeline.
- The governance artifacts now require Tend/OpenCode implementor execution as a gate, not merely Tend/OpenCode benchmarking after raw edits.

Claim status: `insufficient-evidence`

Reason:
- Bootstrap and SQL-pipeline proof are useful, but no scored Tend/OpenCode migration slice has yet produced a clean paired 20x candidate for the Recipe API cut.
- Any manually edited Codex migration slice is excluded until replayed through Tend/OpenCode.

Next action:
- Fix any remaining Tend/OpenCode benchmark/startup defects that prevent the harness from executing source-scoped slices.
- Start the next source-scoped slice through Tend/OpenCode itself.
- Analyze DB-backed target clears, command/tool/token telemetry, validation status, and reasoning-trace summaries.
- Revise packet families or validation ladders if the slice underperforms.
- Hand off to the user before the full autonomous OpenCode run once scoped slice evidence is strong enough.

## Checkpoint: Tend/OpenCode replayed source-path slice with DB-selected target delta

Recorded at: 2026-07-01T22:09:20.435Z

Phase: migration-active / source-scoped Tend/OpenCode slice

Implementor boundary:
- Implementor: Tend/OpenCode through `nix run .#tend-opencode -- run --format json --thinking --dangerously-skip-permissions`.
- Codex role: monitor, start the bounded Tend/OpenCode run, observe DB evidence, and validate focused targets.
- The prior raw Codex source-path pilot was reverted before this replay and remains unscored contamination.

Tend/OpenCode implementor command observation:
- Observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:b45b857f154184e5:2026-07-01T22:03:58.981Z`.
- Command: `nix run .#tend-opencode -- run --format json --thinking --dangerously-skip-permissions --title recipe-authoring-source-path-slice ...`.
- Duration: 201823 ms.
- Exit status: succeeded.
- Raw JSON event stream stored in the command observation, including OpenCode step events, tool calls, token blocks, exposed reasoning events, stdout/stderr summaries, and plugin metadata.
- Stdout byte length: 250669.
- Stdout sha256: `9114cc5c18e8bb729445feab5c712b2f81141b45218487e66ada633f4df66a74`.

Packet family:
- Change: `compress-recipe-authoring-surface`.
- Family: `recipe-authoring/manual-source-path-inferable`.
- Source scope: `packages/attune/cocoindex-effect/src/CocoIndexClient.ts`.

DB-selected target status:
- SQL source: `framework_event.recipe_observation`.
- SQL route: `framework-runtime.sql-route`.
- Query: `openspec-packet-selected-target-delta-inputs` from `frameworkRecipeReceiptKyselyServiceContract`.
- Query hash: `25a3ccb26d1f925e133869313c63d81e096aae0fae2ec27bdf9657ff1db4d516`.
- Baseline selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:active:2026-07-01T21:53:47.712Z`.
- Current selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-01T22:08:30.278Z`.
- Delta observation emitted: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.delta.projected:complete:2026-07-01T22:08:30.278Z`.
- Baseline selected remaining: 2.
- Current selected remaining: 0.
- Derived clears: 2.
- Stale: 0.
- Flicker: 0.
- Refused: 0.
- Failed validation in packet status: 0.

Focused validation observations:
- `cocoindex-effect:typecheck`: passed, observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:f393be5a0ca1f709:2026-07-01T22:08:30.663Z`.
- `framework-protocol:typecheck`: passed, observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:905ce2ba7e63e849:2026-07-01T22:08:30.931Z`.
- `framework-protocol:test`: passed, observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:b065fc54a0119e85:2026-07-01T22:08:46.650Z`.
- `tend-opencode:typecheck`: passed after benchmark startup fix, observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:0f4142441406609b:2026-07-01T22:03:24.772Z`.
- `tend-opencode:test`: passed, observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-01T22:08:46.688Z`.

Benchmark/harness startup evidence:
- `nix run .#tend-opencode -- benchmark --help` now exits cleanly without starting packet projection capture.
- `benchmark --action plan --mode export-only --loop-kind quick-turn` exits successfully and is DB-observed as `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:dceec78532d2159b:2026-07-01T22:03:24.739Z`.

Claim status: `insufficient-evidence`

Reason:
- This is valid Tend/OpenCode migration-slice evidence and proves the implementor boundary for a tiny source-scoped slice.
- It is not a 20x candidate because the slice has only two selected targets, no paired raw baseline arm, no all-in raw-vs-packet comparison, and no audit-promoted holdout/negative-control accounting.

Next action:
- Use this as a clean pilot and move to a larger but still bounded Tend/OpenCode source/package slice.
- Prefer a non-trivial family with repeated deterministic targets, such as `recipe-authoring/manual-source-path-inferable` or `recipe-authoring/manual-recipe-id-inferable` in one package file set.
- Keep measuring from `framework_event.recipe_observation` and do not count Codex-authored migration edits.
- If the larger slice does not approach 20x candidate efficiency, revise packet prompts, geometry, validation ladder, or Tend/OpenCode harness support and replay through Tend/OpenCode.

## Harness scoring correction: exploratory probes are not the packet arm

After the first Tend/OpenCode-implemented source-path slices, the DB-backed traces showed useful selected-target clears but poor packet efficiency relative to the corrected 20x benchmark orientation. The 2-target slice cleared 2 targets with about 55,394 provider-native OpenCode tokens, and the 6-target slice cleared 6 targets with about 99,982 provider-native OpenCode tokens. Those runs are evidence about migration shape and packet-design gaps, not evidence that the packetized arm achieved the goal.

The bootstrap harness was revised so packet scoring is owned by Tend/OpenCode rather than an external metrics script. `openspec packet-loop` now supports joining a predeclared observed implementation run through `--implementation-title`, derives selected-target deltas from `framework_event.recipe_observation`, derives command telemetry from the observed OpenCode run, and emits an `openspec.packet.benchmark.analyzed` observation. Dense delegated `opencode run` slices are classified as `exploratory-probe` evidence and cannot promote the 20x claim. Active packet economy for the Recipe source-path family now requires a packet-owned fastpath capability, so density alone no longer makes a slice the scored packet arm.

Claim status remains `insufficient-evidence`. The next clean step is to implement or enable a deterministic Tend/OpenCode packet fastpath for one true high-density Recipe authoring family, run it through the same DB-backed packet-loop scoring path, and only then consider scaling the packet.

## True-packet fastpath correction

The packet sidecar now distinguishes exploratory delegated OpenCode edits from packet-owned fastpath execution. The Recipe source-path family no longer becomes active from density alone. Active packet economy requires the explicit fastpath capability and a source-scoped slice. `openspec packet-loop` carries a `packetFastpath` result with source file, edit shape, before/after selected-target counts, changed files, and cleared count.

Packet scoring also moved into the Tend/OpenCode harness. The packet loop can join a predeclared observed implementation run by `--implementation-title`, query selected-target deltas through the framework SQL route, query the observed implementation command through the framework SQL route, derive token/tool/reasoning telemetry from the observed run, and emit `openspec.packet.benchmark.analyzed` back through `framework_event.recipe_observation`.

This prevents the two known bad incentives: selecting the densest file without a packet-owned repair, and counting exploratory agent edits as the packet arm. The next scoreable slice should use `ATTUNE_OPENSPEC_PACKET_FASTPATH=1` with a source-scoped `recipe-authoring/manual-source-path-inferable` packet loop observed through Tend/OpenCode, then inspect the DB-emitted `openspec.packet.benchmark.analyzed` payload before scaling.

## Packet fastpath scoring protocol

A scoreable fastpath slice uses a two-phase Tend/OpenCode harness protocol:

1. Observe the packet-owned active fastpath run with a stable implementation title. This command performs the source-scoped packet repair and emits packet loop observations.
2. Run `openspec packet-loop` again with the same change, family, source, `--implementation-title <title>`, and `--score-only`. This pass does not apply source edits. It joins the already-written `measurement.command.observed` row for the implementation title with the selected-target delta rows and emits `openspec.packet.benchmark.analyzed`.

This avoids a timing bug where a packet loop cannot score the outer observed command before that command observation exists. It also avoids post-hoc manual metrics scripts. The DB remains the source of truth: selected-target status, command telemetry, token/tool/reasoning trace summaries, and packet benchmark analysis all live in `framework_event.recipe_observation`.

## Source-path selector correction

The first source-scoped fastpath run on `packages/trellis/nx/src/index.ts` cleared 26 of 55 selected `sourcePath` hits. DB scoring classified it as a candidate on token efficiency, but inspection of the remaining hits showed the selector was too broad: it included type fields, variables, address fields, generated comments, and other non-removable `sourcePath` references. That means the 55-target denominator was not a clean source-scope packet and must not be used as scalable 20x evidence.

The packet selector was narrowed to object-field authoring boilerplate only (`^\\s*sourcePath\\s*:`) and the selector summary was changed to `Inferable manual source path object-field ...` so new DB deltas do not mix with the broad v1 rows. The earlier run remains useful as a probe that improved packet geometry, not as audit-promoted evidence.

## Checkpoint: Packet optimizer correction and source-path eligibility oracle preview

Recorded at: 2026-07-01T23:18:16.790Z

Phase: migration-preview / packet-variant optimizer

Correction:
- Packet families are optimizer search space, not selected answers.
- A packet variant is a hypothesis that must be measured over slices, scored through Tend/OpenCode, and either rejected, revised, replayed, expanded, or handed off.
- Target density is an input to the optimizer, not proof that the packet arm works.
- Rejected variants are useful DB-backed optimizer evidence and must not be hidden or promoted.

Tend/OpenCode score-only command:

```bash
ATTUNE_RECIPE_STORE_MODE=local-postgres ATTUNE_RECIPE_STORE_URL='postgresql://attune@127.0.0.1:54329/postgres' \
nix run .#tend-opencode -- openspec packet-loop \
  --change compress-recipe-authoring-surface \
  --mode preview \
  --family recipe-authoring/source-path-eligibility-oracle \
  --source packages/trellis/nx/src/index.ts \
  --implementation-title source-path-eligibility-oracle-preview \
  --score-only \
  --until complete \
  --format json
```

Packet variant:
- Family: `recipe-authoring/source-path-eligibility-oracle`.
- Variant: `v1-bootstrap-family`.
- Optimizer iteration: 1.
- Hypothesis: bootstrap selector geometry and validation ladder can identify which `sourcePath` targets are eligible for generated-runtime lowering before any deletion fastpath is trusted.
- Selected total: 27.
- Selected remaining: 27.
- Cleared: 0.
- State: `preview`.
- Active mode eligible: false.
- Store health: healthy.
- Claim status: `insufficient-evidence`.
- Optimization status from packet analysis: `rejected`.
- Optimizer action from packet analysis: mark this variant rejected for scored evidence and use the trace only to design the next variant.

DB/store evidence:
- Store emission status: emitted.
- Store mode: local Postgres.
- Observation table: `framework_event.recipe_observation`.
- SQL route recipe: `framework-runtime.sql-route`.
- Selected-target query: `openspec-packet-selected-target-delta-inputs`.
- Selected-target query hash: `25a3ccb26d1f925e133869313c63d81e096aae0fae2ec27bdf9657ff1db4d516`.
- Implementation command query hash: `f7b5d2ae6df3ce853b62f087caf6c9eaf9a5c034891d7a06e7154276dfe83fcf`.
- Benchmark analysis observation emitted as `openspec.packet.benchmark.analyzed`.

Command telemetry joined by the harness:
- Implementation command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:5ad0310f1c7842c3:2026-07-01T23:16:35.341Z`.
- Status: succeeded.
- Duration: 2647 ms.
- Token total: 0.
- Effective tokens: 0.
- Tool calls: 0.
- Token metric source: `packet-loop-control`.
- Stdout sha256: `edece12780f2d475ee3d6c87fc61f2749621c00b2e6ea60e93635569ecc53151`.

Reason:
- The oracle family currently selects 27 object-field `sourcePath` targets in `packages/trellis/nx/src/index.ts`, but it does not yet classify per-target eligibility or clear targets.
- The prior deletion-oriented source-path variant was unsafe because the current runtime still needs `sourcePath` in multiple IR/projection positions.
- Therefore the next work is not to select a different packet. The next work is to optimize the packet: add a deterministic eligibility oracle, connect it to generated-runtime projection prerequisites, and replay through Tend/OpenCode.

Next action:
- Implement per-target eligibility classification for `recipe-authoring/source-path-eligibility-oracle`.
- Keep `recipe-authoring/manual-source-path-inferable` blocked from active deletion until the oracle proves generated-runtime projection eligibility.
- Replay the source-scoped slice through Tend/OpenCode and score it through `framework_event.recipe_observation`.
- Do not scale the full Recipe migration and do not claim 20x until repeated Tend/OpenCode slices produce DB-backed clears, telemetry, validation, and paired comparison evidence near the 10-20x band with 20x as the target.

## Checkpoint: Source-path eligibility oracle target classification

Recorded at: 2026-07-01T23:29:02.275Z

Phase: migration-preview / packet-variant optimizer

Harness change:
- Added packet target classifications to the bootstrapped Tend/OpenCode packet candidate contract.
- `recipe-authoring/source-path-eligibility-oracle` now classifies each selected `sourcePath` object-field target instead of acting as a raw selector.
- Classifications are emitted in packet-loop JSON and in `candidateSummaries` stored through `framework_event.recipe_observation`.

Observed Tend/OpenCode validation:
- `tend-opencode:typecheck`: passed.
- Typecheck observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:0f4142441406609b:2026-07-01T23:27:45.763Z`.
- `tend-opencode:test`: passed with 63 tests.
- Test observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-01T23:27:58.340Z`.

Classified oracle preview:
- Command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:237e224ba990e979:2026-07-01T23:28:51.526Z`.
- Change: `compress-recipe-authoring-surface`.
- Family: `recipe-authoring/source-path-eligibility-oracle`.
- Variant: `v1-bootstrap-family`.
- Source: `packages/trellis/nx/src/index.ts`.
- Selected total: 27.
- Selected remaining: 27.
- Cleared: 0.
- Target classifications: 27 `needs-projection`, 0 `eligible`.
- Classification prerequisite: `recipe-authoring/generated-runtime-projection`.
- Active mode eligible: false.
- Store health: healthy.
- Packet loop observations emitted through `framework_event.recipe_observation`.

Score-only packet analysis:
- Evidence class: `exploratory-probe`.
- Optimization status: `rejected`.
- Optimizer action: mark this packet variant rejected for scored evidence; use the trace only to design the next variant.
- Command telemetry source: `packet-loop-control`.
- Token total: 0.
- Tool calls: 0.
- Duration: 2511 ms for the observed preview command.
- SQL route: `framework-runtime.sql-route`.
- Selected-target query hash: `25a3ccb26d1f925e133869313c63d81e096aae0fae2ec27bdf9657ff1db4d516`.
- Implementation-command query hash: `f7b5d2ae6df3ce853b62f087caf6c9eaf9a5c034891d7a06e7154276dfe83fcf`.

Claim status: `insufficient-evidence`

Reason:
- The oracle now produces useful optimizer data, but it proves that this slice is not ready for sourcePath deletion.
- A 27-target denominator with 27 `needs-projection` blockers is not a packet win and must not be scaled.
- The next packet to optimize is the generated-runtime projection path that can turn some of these blockers into eligible targets.

Next action:
- Shift optimization from selecting another sourcePath slice to improving `recipe-authoring/generated-runtime-projection` or an equivalent eligibility oracle.
- Replay the same source-scoped sourcePath family only after classifications move from `needs-projection` to `eligible`.
- Keep the full OpenCode migration handoff blocked until multiple Tend/OpenCode packet variants show stable DB-backed clears and near-target efficiency.

## Checkpoint: Generated-runtime projection selector geometry v2

Recorded at: 2026-07-01T23:33:14.334Z

Phase: migration-preview / packet-variant optimizer

Reason for optimizer iteration:
- The `recipe-authoring/source-path-eligibility-oracle` classified all 27 sourcePath object-field targets in `packages/trellis/nx/src/index.ts` as `needs-projection`.
- A preview of `recipe-authoring/generated-runtime-projection` then showed selector pollution: v1 counted imported helper symbols as projection targets.
- That made the packet denominator too broad and unsafe to scale.

Harness change:
- `recipe-authoring/generated-runtime-projection` now uses variant `v2-call-expression-runtime-projection-selector`.
- Optimizer iteration: 2.
- Hypothesis: select verbose runtime declaration call sites, not imported helper symbols, before materializing `.framework/generated` projections.
- Selector changed from helper-symbol mentions to `defineX(...)` call expressions.
- Added a Tend/OpenCode regression test proving helper imports are not counted.

Observed Tend/OpenCode validation:
- `tend-opencode:typecheck`: passed.
- Typecheck observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:0f4142441406609b:2026-07-01T23:31:57.300Z`.
- `tend-opencode:test`: passed with 64 tests.
- Test observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-01T23:32:19.992Z`.

DB-scored preview:
- Command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:e75307b457fba323:2026-07-01T23:33:02.651Z`.
- Change: `compress-recipe-authoring-surface`.
- Family: `recipe-authoring/generated-runtime-projection`.
- Variant: `v2-call-expression-runtime-projection-selector`.
- Source: `packages/trellis/nx/src/index.ts`.
- Previous preview target count: 15 broad helper-symbol hits.
- Current preview target count: 8 runtime declaration call-site hits.
- Selected remaining: 8.
- Cleared: 0.
- Active mode eligible: false.
- Store health: healthy.
- Packet loop observations emitted through `framework_event.recipe_observation`.
- Score-only evidence class: `exploratory-probe`.
- Optimization status: `rejected` for scored 20x evidence.

SQL and telemetry:
- Selected-target query hash: `25a3ccb26d1f925e133869313c63d81e096aae0fae2ec27bdf9657ff1db4d516`.
- Implementation-command query hash: `f7b5d2ae6df3ce853b62f087caf6c9eaf9a5c034891d7a06e7154276dfe83fcf`.
- Preview command duration: 2532 ms.
- Token total: 0.
- Tool calls: 0.
- Token metric source: `packet-loop-control`.
- Stdout hash: `4a72ee6bd132d3ca620269eded8fb430b3d747f9512dab7e9efca7d8b6bb749a`.

Claim status: `insufficient-evidence`

Reason:
- This is a real packet-geometry improvement because the selected target set is now cleaner.
- It is not a migration clear and not a 20x candidate.
- The generated-runtime projection packet still lacks per-call projection-readiness classifications and a materialization fastpath.

Next action:
- Add projection-readiness classifications for the 8 generated-runtime call-site targets.
- Use those classifications to decide whether the next packet variant should materialize `.framework/generated` projections, add lowering support, or block on explicit authoring facts.
- Replay the sourcePath deletion packet only after generated-runtime projection evidence turns sourcePath oracle targets from `needs-projection` to `eligible`.

## Checkpoint: Token-efficiency fields are explicit on packet-loop analysis

Recorded at: 2026-07-01T23:42:23.967Z

Phase: migration-preview / packet-variant optimizer

Metric correction:
- Token efficiency is now an explicit packet-loop analysis field, not something inferred later from command telemetry.
- Every DB-backed packet analysis includes `tokenEfficiencyStatus`, `tokenEfficiencyReason`, measured tokens, measured clears, measured commands, raw tokens per clear, 20x target tokens per clear, and optional per-clear ratios when scoreable.
- Zero-clear runs are explicitly marked `zero-clears` rather than silently omitting `tokensPerClear`.

Observed Tend/OpenCode validation:
- `tend-opencode:typecheck`: passed.
- Typecheck observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:0f4142441406609b:2026-07-01T23:37:29.090Z`.
- `tend-opencode:test`: first failed because the assertion was placed on a non-analysis unit path; that failed observation is retained in DB as harness evidence.
- Failed test observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-01T23:37:42.579Z`.
- `tend-opencode:test`: rerun passed with 64 tests.
- Passing test observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-01T23:41:25.301Z`.

DB-scored packet run:
- Change: `compress-recipe-authoring-surface`.
- Family: `recipe-authoring/generated-runtime-projection`.
- Variant: `v3-call-expression-projection-readiness-classifier`.
- Source: `packages/trellis/nx/src/index.ts`.
- Selected total: 8.
- Selected remaining: 8.
- Cleared: 0.
- Target classifications: 8 `needs-authoring-fact`, 0 `eligible`.
- Preview command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:b30638b1ab610aa2:2026-07-01T23:42:11.209Z`.
- Score-only benchmark analysis observation emitted through `framework_event.recipe_observation` at `2026-07-01T23:42:23.967Z`.

Token-efficiency payload:
- `tokenEfficiencyStatus`: `zero-clears`.
- `tokenEfficiencyReason`: token efficiency is unscoreable because the run cleared zero selected targets.
- `measuredTokens`: 0.
- `measuredClears`: 0.
- `measuredCommands`: 1.
- `rawTokensPerClear`: 124087.56666666667.
- `targetTokensPerClearFor20x`: 6204.378333333333.
- `clearsPerCommand`: 0.
- `reaches20xTokenEfficiency`: false.
- `tokenMetricSource`: `packet-loop-control`.

Claim status: `insufficient-evidence`

Reason:
- The run is useful optimizer evidence, but it is not a scoreable improvement because it cleared zero targets.
- The 20x objective is optimizing over token efficiency per selected-target clear, so zero-clear runs must remain rejected even when they are cheap.

Next action:
- Optimize the generated-runtime projection packet toward producing at least one `eligible` or materializable projection target.
- The next scored run must produce non-zero selected-target clears before token efficiency can become a measured candidate.
- Do not hand off the full autonomous OpenCode migration yet.

## Checkpoint: Generated-runtime readiness fastpath produces first scored candidate

Recorded at: 2026-07-02T00:16:20.000Z

Phase: migration-preview / packet-variant optimizer

Objective:
- Stop optimizing by selecting another packet slice and instead optimize the packet itself.
- Separate generated runtime projection readiness from generated runtime projection materialization so a target-local readiness marker is not falsely counted as full projection completion.
- Keep Tend/OpenCode as the measured implementor and scorer; Codex only changed the harness/spec artifacts and analysis.

Bootstrap gate status:
- Fingerprint proof passed and was DB-emitted.
- Fingerprint observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:7a8673626045caeb:2026-07-01T23:53:51.691Z`.
- Harness proof passed and was DB-emitted.
- Harness observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:8325a2fc40f86ea0:2026-07-01T23:53:51.734Z`.
- Proof included flake-provided upstream OpenCode, installed OpenSpec commands/skills, full Attune plugin suite, exercised plugin hooks, installed packet sidecar, sidecar self-test, and framework-store command observation emission.

Optimizer evidence before the fastpath:
- `recipe-authoring/generated-runtime-projection` v4 target-local classifier preview selected 8 materialization call sites.
- V4 preview was `not-scored` without an implementation command.
- Tend/OpenCode one-marker materialization slice observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-01:4ac244a5fdcc40fb:26a54265183ef52f:2026-07-01T23:54:25.916Z`.
- Materialization-family score: `zero-clears` because one readiness marker did not clear generated projection materialization.
- Materialization one-marker telemetry: 28,378 tokens, 1 command, 11 tool calls, 87.457s, 0 selected-target clears.
- Verdict: rejected for scored evidence. Useful trace only.

Readiness family added:
- New family: `recipe-authoring/generated-runtime-projection-readiness`.
- Variant: `v2-deterministic-target-local-readiness-marker-fastpath`.
- Selector: only verbose runtime declaration call sites that still lack target-local readiness proof.
- Preview now emits `openspec.packet.selected-target.checked`, enabling DB-backed per-run deltas through `framework_event.recipe_observation`.
- Per-run delta projection now compares the current selected-target check with the immediately previous check, rather than oldest-to-latest cumulative progress. This prevents over-crediting later packet runs for clears performed by earlier runs.

DB-backed baseline:
- Baseline readiness preview selected 7 remaining unproven targets after the first exploratory marker.
- Baseline selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T00:00:42.900Z`.
- Token efficiency status: `not-scored` because no implementation command was joined.

Exploratory delegated OpenCode slice:
- Implementation title: `generated-runtime-readiness-one-more-marker-slice`.
- Command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:8b1dda26312120e4:2026-07-02T00:00:56.842Z`.
- Selected-target delta: 7 -> 6.
- Derived clears: 1.
- Token total: 11,396.
- Commands: 1.
- Tool calls: 6.
- Duration: 39.698s.
- Tokens per clear: 11,396.
- Raw reference tokens per clear: 124,087.56666666667.
- 20x target tokens per clear: 6,204.378333333333.
- Token improvement vs raw: 10.888694863694864x.
- Token-efficiency status: `measured`, below 20x.
- Evidence class: `exploratory-probe`.
- Optimization status: `rejected` for scored packet evidence.
- Verdict: useful for optimizer direction, not scalable as the packet arm.

Deterministic packet fastpath:
- Implemented in the Tend/OpenCode packet sidecar, not as an external metrics script.
- Active command: `tend-opencode openspec packet-loop --mode active --family recipe-authoring/generated-runtime-projection-readiness --source packages/trellis/nx/src/index.ts` with explicit active and fastpath gates.
- Active command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:dcc81d951160c70f:2026-07-02T00:10:10.477Z`.
- Active packet repair: added target-local readiness markers for the remaining selected targets in `packages/trellis/nx/src/index.ts`.
- Packet fastpath result: targetCountBefore 6, targetCountAfter 0, cleared 6, changedFiles 1.
- Active selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-02T00:10:11.330Z`.

Scored fastpath result:
- Score title: `generated-runtime-readiness-fastpath-active`.
- DB-backed per-run delta: 6 -> 0.
- Derived clears: 6.
- Measured tokens: 0.
- Measured commands: 1.
- Tool calls: 0.
- Duration: 2.471s.
- Tokens per clear: 0.
- Commands per clear: 0.16666666666666666.
- Clears per command: 6.
- Seconds per clear: 0.41183333333333333.
- Token metric source: `packet-fastpath`.
- Token-efficiency status: `meets-20x`.
- Evidence class: `candidate`.
- Optimization status: `candidate`.
- Gaming risk: `low` for this slice because the packet family, baseline, implementation title, command telemetry, selected-target status, and SQL route are all DB-backed.
- Claim status: `candidate`, not `audit-promoted`.

SQL/store evidence:
- Store: `framework_event.recipe_observation`.
- Schema split preserved: `framework_core`, `framework_event`, `framework_view`.
- SQL route recipe: `framework-runtime.sql-route`.
- Selected-target query hash: `25a3ccb26d1f925e133869313c63d81e096aae0fae2ec27bdf9657ff1db4d516`.
- Implementation-command query hash: `f7b5d2ae6df3ce853b62f087caf6c9eaf9a5c034891d7a06e7154276dfe83fcf`.

Observed validation:
- `tend-opencode:typecheck`: passed after final patch.
- Typecheck observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T00:16:02.233Z`.
- `tend-opencode:test`: passed with 66 tests after final patch.
- Test observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-02T00:15:13.451Z`.
- Earlier failed test observations remain in the DB and are part of the optimizer trace; they are not hidden.

Claim status: `candidate`

Reason:
- The deterministic readiness fastpath is the first packet-owned slice that meets the token-efficiency target with DB-backed selected-target status and command telemetry.
- It is still only one source-scoped readiness slice and does not prove the full Recipe API migration or audit-promoted 20x.
- It also clears readiness markers, not generated runtime materialization or the full compact authoring API.

Next action:
- Repeat the same readiness fastpath on another predeclared source-scoped slice with the same validation ladder.
- Then move to the next bottleneck: generated runtime projection materialization from compact authoring facts.
- Keep the full OpenCode migration handoff blocked until multiple packet families/slices show stable candidate evidence near or above the 20x target and validation remains clean.

## Goal analysis checkpoint: automatic token-efficiency finalizer for observed packet loops

Observed at: 2026-07-02T00:29:05.806Z

Purpose: token efficiency must be part of every scored Tend/OpenCode packet run, because the 20x claim optimizes over tokens per selected-target clear, not task completion alone.

Harness change:

- Added `TendOpenCodePacketRunFinalizer` to the Tend/OpenCode command observation output contract.
- `tend-opencode observe` now detects observed `openspec packet-loop` commands and, after writing `measurement.command.observed`, automatically replays the same packet loop in `--score-only` mode.
- The score-only replay joins the observed command telemetry with packet selected-target deltas from `framework_event.recipe_observation` and emits `openspec.packet.benchmark.analyzed`.
- Runs without `--change`, `--family`, or `--implementation-title` are explicitly marked unscoreable instead of being treated as vague insufficient evidence.
- Score-only packet-loop commands are skipped by the finalizer to avoid recursive scoring.

Validation before live slice:

- `pnpm exec nx run tend-opencode:typecheck --output-style=static`: passed.
- `pnpm exec nx run tend-opencode:test --output-style=static`: passed, 67 tests.

Slice:

- Change: `compress-recipe-authoring-surface`.
- Packet family: `recipe-authoring/generated-runtime-projection-readiness`.
- Source: `packages/attune/discovery/src/index.ts`.
- Baseline command: `nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/generated-runtime-projection-readiness --source packages/attune/discovery/src/index.ts --implementation-title generated-runtime-readiness-discovery-index-baseline --until complete --format json`.
- Baseline target status: 9 selected, 9 remaining, 0 cleared.
- Active observed command: `nix run .#tend-opencode -- observe --format json -- nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode active --family recipe-authoring/generated-runtime-projection-readiness --source packages/attune/discovery/src/index.ts --implementation-title generated-runtime-readiness-discovery-index-active --until complete --format json`.
- Active command observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:1395ff2b3638c587:2026-07-02T00:28:50.070Z`.
- Active packet result: 9 selected, 0 remaining, 9 cleared.
- Automatic finalizer status: `scored`.
- Automatic finalizer DB-backed target status: true.
- Automatic finalizer measured tokens: 0.
- Automatic finalizer measured clears: 9.
- Automatic finalizer tokens per clear: 0.
- Automatic finalizer token efficiency status: `meets-20x`.
- Automatic finalizer command improvement versus raw: 18.9x.
- Automatic finalizer token metric source: `packet-fastpath`.
- Automatic finalizer benchmark observation emitted: `openspec.packet.benchmark.analyzed` through `framework_event.recipe_observation`.

Validation after slice:

- `nix run .#tend-opencode -- observe --format json -- pnpm exec nx run attuned-discovery:typecheck --output-style=static`: passed.
- Validation command observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:70a40c39614e11a7:2026-07-02T00:29:04.596Z`.

Claim status:

- This is candidate evidence for a deterministic readiness-marker packet fastpath, not audit-promoted 20x evidence for the full Recipe API migration.
- The score is now attached to the observed run automatically, which fixes the prior weakness where token efficiency required a separate manual score-only command.
- The next optimization step remains broader packet improvement: readiness markers are not the final generated runtime projection or compact Recipe API migration.

## Goal analysis checkpoint: readiness fastpath repeatability and materialization blocker

Observed at: 2026-07-02T00:33:20.000Z

Purpose:

- Refresh bootstrap proof after the token-efficiency finalizer change.
- Prove typical OpenCode trace observations are emitted through the framework DB spine.
- Run another Tend/OpenCode-implemented migration slice to test readiness fastpath repeatability.
- Check whether readiness clears unlock the downstream generated-runtime projection materialization packet.

Bootstrap proof refresh:

- Fingerprint command: `nix run .#tend-opencode -- fingerprint --format json` observed through Tend/OpenCode.
- Fingerprint observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:7a8673626045caeb:2026-07-02T00:31:00.726Z`.
- Fingerprint status: passed.
- Harness command: `nix run .#tend-opencode -- run-harness-test --format json` observed through Tend/OpenCode.
- Harness observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:8325a2fc40f86ea0:2026-07-02T00:31:00.701Z`.
- Harness status: passed.
- Proof covered flake-provided upstream OpenCode, `/attune-fingerprint`, OpenSpec commands and skills, all required Attune plugin packages, upstream plugin visibility, plugin hook exercise, packet sidecar install, packet sidecar self-test, and DB-emitted command observation.

Trace completeness proof:

- Trace command: `nix run .#tend-opencode -- live-trace-smoke --format json --session-id packet-goal-live-trace-20260702` observed through Tend/OpenCode.
- Trace command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0622f408821049a1:2026-07-02T00:31:42.605Z`.
- Trace store status: emitted to `framework_event.recipe_observation`.
- Trace observation kinds: `tend.session`, `tend.token-usage`, `tend.tool-call`, `tend.policy-decision`, `tend.reasoning-trace`, `tend.command`, `tend.openrtk-action`, `tend.magic-context-decision`, `tend.validation`, and `tend.token-efficiency`.
- Trace observation count: 14.
- Token efficiency trace: 99 total tokens, 68 input, 31 output, 6 cached, 8 reasoning, 93 effective, 1 tool call, 1 command, 1 validation.

Slice selection:

- Global readiness preview after the discovery slice was used only as capped slice-picking evidence.
- Highest visible source in the capped preview: `packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts` with 8 readiness targets.

Readiness slice:

- Change: `compress-recipe-authoring-surface`.
- Packet family: `recipe-authoring/generated-runtime-projection-readiness`.
- Packet variant: `v2-deterministic-target-local-readiness-marker-fastpath`.
- Source: `packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts`.
- Baseline preview command: `nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/generated-runtime-projection-readiness --source packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts --implementation-title generated-runtime-readiness-joern-generation-cli-baseline --until complete --format json`.
- Baseline selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T00:32:16.659Z`.
- Baseline target status: 8 selected, 8 remaining, 0 cleared.
- Active observed command: `nix run .#tend-opencode -- observe --format json -- nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode active --family recipe-authoring/generated-runtime-projection-readiness --source packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts --implementation-title generated-runtime-readiness-joern-generation-cli-active --until complete --format json`.
- Active command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:19d0181b027fae3c:2026-07-02T00:32:28.348Z`.
- Active selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-02T00:32:29.228Z`.
- Active result: 8 selected, 0 remaining, 8 cleared.
- Automatic finalizer status: `scored`.
- Automatic finalizer token efficiency status: `meets-20x`.
- Automatic finalizer measured tokens: 0.
- Automatic finalizer measured clears: 8.
- Automatic finalizer tokens per clear: 0.
- Automatic finalizer command improvement versus raw: 16.8x.
- Automatic finalizer token metric source: `packet-fastpath`.
- Automatic finalizer DB-backed target status: true.

Validation:

- Project discovery command: `pnpm exec nx show projects` observed through Tend/OpenCode.
- Project discovery observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:fc2432714e92f678:2026-07-02T00:32:39.989Z`.
- Affected project: `joern-effect`.
- Validation command: `pnpm exec nx run joern-effect:typecheck --output-style=static` observed through Tend/OpenCode.
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6c432c06bf983138:2026-07-02T00:32:48.644Z`.
- Validation status: passed.

Downstream materialization check:

- Preview command: `nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/generated-runtime-projection --source packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts --implementation-title generated-runtime-projection-joern-generation-cli-preview-after-readiness --until complete --format json`.
- Selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T00:33:07.267Z`.
- Materialization family target status: 8 selected, 8 remaining, 0 cleared.
- Classification result: all 8 targets are now `eligible` because target-local generated-runtime projection proof is present.
- Economy result: `shadow`.
- Reason: `recipe-authoring/generated-runtime-projection` still has `repairability: materialize`, `risk: needs-review`, and `safeFixDensity: 0`; it has no safe active projection-writer fastpath yet.

Claim status:

- Readiness packet status: repeated `candidate` evidence for source-scoped deterministic readiness-marker fastpath.
- Materialization packet status: `insufficient-evidence` and preview-only.
- Overall Recipe API migration status: not ready for final handoff or full autonomous OpenCode run.

Next optimizer action:

- Stop spending optimization effort merely selecting more readiness slices unless needed for density.
- Implement or prove a Tend/OpenCode-owned generated-runtime projection writer/oracle that materializes `.framework/generated` projection output with provenance and gives `recipe-authoring/generated-runtime-projection` a safe active-mode path.
- Keep the full migration handoff blocked until materialization and compact authoring packets show non-zero DB-backed clears with validation.

## Goal analysis checkpoint: generated-runtime projection materialization fastpath

Observed at: 2026-07-02T00:40:10.000Z

Purpose:

- Stop treating readiness markers as the endpoint.
- Add a Tend/OpenCode-owned generated-runtime projection materialization path.
- Prove materialization clears selected targets through `framework_event.recipe_observation` and automatic token-efficiency finalization.

Harness change:

- Added a bootstrapped `recipe-authoring/generated-runtime-projection` active fastpath inside the Tend/OpenCode packet sidecar.
- The fastpath is source-scoped and requires explicit active + fastpath capability gates.
- The fastpath refuses repo-wide materialization and refuses any source where not every selected generated-runtime projection target is target-local `eligible`.
- The fastpath writes generated projection provenance under `.framework/generated/packetized-recipe-authoring/`.
- The selected-target judge clears a materialization target only when the generated projection file contains the target ID.
- This remains a bootstrapped projection writer, not the final Framework compiler rewrite.

Harness validation:

- `pnpm exec nx run tend-opencode:typecheck --output-style=static`: passed.
- `pnpm exec nx run tend-opencode:test --output-style=static`: passed, 68 tests.
- New test coverage proves materialization writes a `.framework/generated` projection file with provenance and a follow-up preview sees zero remaining selected targets.

Materialization slice 1:

- Change: `compress-recipe-authoring-surface`.
- Packet family: `recipe-authoring/generated-runtime-projection`.
- Packet variant: `v4-target-local-projection-readiness-classifier` plus bootstrapped materialization fastpath.
- Source: `packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts`.
- Baseline selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T00:33:07.267Z`.
- Baseline target status: 8 selected, 8 remaining, all target-local eligible after readiness.
- Active command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:a43ac2e244902034:2026-07-02T00:38:51.602Z`.
- Active selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-02T00:38:53.198Z`.
- Generated output: `.framework/generated/packetized-recipe-authoring/packages__attune__joern-effect__src__internal__generation__JoernGenerationCli.runtime.generated.ts`.
- Active result: 8 selected, 0 remaining, 8 cleared.
- Automatic finalizer status: `scored`.
- Automatic finalizer token efficiency status: `meets-20x`.
- Automatic finalizer measured tokens: 0.
- Automatic finalizer measured clears: 8.
- Automatic finalizer tokens per clear: 0.
- Automatic finalizer command improvement versus raw: 16.8x.
- Automatic finalizer token metric source: `packet-fastpath`.
- Post-preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:7b58eb8eb13b4729:2026-07-02T00:39:10.030Z`.
- Post-preview target status: 0 selected, 0 remaining.
- Validation command: `pnpm exec nx run joern-effect:typecheck --output-style=static` observed through Tend/OpenCode.
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6c432c06bf983138:2026-07-02T00:39:10.098Z`.
- Validation status: passed.

Materialization slice 2:

- Change: `compress-recipe-authoring-surface`.
- Packet family: `recipe-authoring/generated-runtime-projection`.
- Source: `packages/attune/discovery/src/index.ts`.
- Baseline selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T00:39:29.052Z`.
- Baseline target status: 9 selected, 9 remaining, all target-local eligible after readiness.
- Active command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:b118f37895b2efc6:2026-07-02T00:39:42.769Z`.
- Active selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.selected-target.checked:complete:2026-07-02T00:39:43.672Z`.
- Generated output: `.framework/generated/packetized-recipe-authoring/packages__attune__discovery__src__index.runtime.generated.ts`.
- Active result: 9 selected, 0 remaining, 9 cleared.
- Automatic finalizer status: `scored`.
- Automatic finalizer token efficiency status: `meets-20x`.
- Automatic finalizer measured tokens: 0.
- Automatic finalizer measured clears: 9.
- Automatic finalizer tokens per clear: 0.
- Automatic finalizer command improvement versus raw: 18.9x.
- Automatic finalizer token metric source: `packet-fastpath`.
- Post-preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ca79d1e97251b132:2026-07-02T00:39:57.604Z`.
- Post-preview target status: 0 selected, 0 remaining.
- Validation command: `pnpm exec nx run attuned-discovery:typecheck --output-style=static` observed through Tend/OpenCode.
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:70a40c39614e11a7:2026-07-02T00:39:29.134Z`.
- Validation status: passed.

Claim status:

- `recipe-authoring/generated-runtime-projection-readiness`: repeated candidate evidence.
- `recipe-authoring/generated-runtime-projection`: now has repeated source-scoped candidate evidence on two sources.
- Overall migration remains not complete and not audit-promoted.
- Full autonomous handoff remains premature because compact authoring conversion, managed recipe review policy, root catalog/thinness, broader validation/reporting, and final handoff reporting are still incomplete.

Next optimizer action:

- Expand the generated-runtime projection materialization fastpath to another small source slice or package slice.
- Then move from projection prerequisites into actual compact authoring conversion and managed-review policy work through Tend/OpenCode packets.
- Keep final handoff blocked until multiple packet families, not only readiness/projection prerequisites, show validated candidate behavior.

## Checkpoint: sourcePath packet false-positive and geometry revision

Timestamp: 2026-07-02T00:58:00Z

### Summary

The `recipe-authoring/manual-source-path-inferable` Joern slice exposed a packet false-positive. The original packet treated every `sourcePath:` object field as inferable after generated-runtime projection proof existed. Active execution removed 14 fields, but `joern-effect:typecheck` failed because three removed fields are still required by current runtime binding types:

- `defineRecipeLayer(...)` / `RecipeLayerBinding`
- two shared `defineRecipeHandler(...)` factories / `RecipeHandlerBinding`

This is not claim evidence. It is packet optimizer feedback.

### Packet changes made from the feedback

- `manual-source-path-inferable` now selects only sourcePath fields whose enclosing declaration context is currently safe to omit.
- `source-path-eligibility-oracle` now classifies required handler/layer sourcePath fields as `blocked`, not `eligible`.
- The sourcePath deletion fastpath now uses the same context rule, so it cannot remove required handler/layer sourcePath fields even when generated projection proof exists.
- Zero-token packet-control / packet-fastpath runs are no longer valid 20x token-efficiency evidence. They remain selected-target and command-efficiency/control evidence only.

### Tend/OpenCode repair and DB evidence

Tend/OpenCode performed the source repair, not raw Codex:

- Command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e4fb2ac61ccc2f40:2026-07-02T00:56:39.465Z`
- Repair title: `source-path-required-field-repair-joern-generation-cli`
- Repair action: restored `sourcePath: joernGenerationCliSourcePath` only to `joernGenerationCliLayer` and the two shared `defineRecipeHandler` factories.
- Token-bearing OpenCode trace was captured in the observed command stdout, including step/tool/reasoning events.

Corrected packet previews:

- SourcePath eligibility oracle observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:bdf160534a7a1ca5:2026-07-02T00:57:29.527Z`
- Corrected oracle result: 3 selected, all classified `blocked` because current runtime binding types require `sourcePath`.
- Manual sourcePath post-repair observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:074a1d01f64af175:2026-07-02T00:57:29.521Z`
- Corrected manual packet result: 0 inferable selected targets remain in `packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts`.

Validation evidence:

- `joern-effect:typecheck` passed through Tend/OpenCode observation.
- Observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6c432c06bf983138:2026-07-02T00:57:29.542Z`

### Claim status

- This slice is not audit-promoted 20x evidence.
- The earlier zero-token packet-fastpath score must be treated as control-only evidence, not token-efficiency proof.
- The useful outcome is packet optimization: the sourcePath packet is now narrower and validation-backed.

### Next action

Continue optimizing packet interfaces over small Tend/OpenCode slices. Prefer families where the selected target definition is stable enough to produce real token-bearing OpenCode implementation traces and validation-backed selected-target clears.
## Checkpoint: manual handler ID packet geometry blocked, not migrated

Timestamp: 2026-07-02T01:22Z

Phase: Phase B packet optimization over Recipe API migration slices.

Harness evidence:

- Fingerprint proof was rerun through `tend-opencode observe` and emitted `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:7a8673626045caeb:2026-07-02T01:04:03.176Z`.
- Harness proof was rerun through `tend-opencode observe` and emitted `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:8325a2fc40f86ea0:2026-07-02T01:04:03.122Z`.
- A tiny model-path smoke completed in 4.8s and emitted `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:200165d8913a2140:2026-07-02T01:17:25.892Z`.
- The bounded OpenCode packet-geometry slice emitted `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:950a77f4cfd60a12:2026-07-02T01:17:53.659Z`.

Packet family: `recipe-authoring/manual-handler-id-inferable`

Result:

- The family is not a safe migration-clearing packet yet.
- Current runtime authoring surfaces still use manual handler identity as diagnostic or fallback metadata without a proven lowered `run` handler binding.
- The packet loop now reports `state=unsafe`, `selectedTotal=9`, `selectedRemaining=9`, `cleared=0`, `refused=9`, and `claimStatus=blocked`.
- Representative selected-target observation: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:unsafe:2026-07-02T01:21:13.649Z`.

Telemetry:

- The OpenCode slice used 34 observed tool calls in the DB-stored JSON event stream.
- Parsed tool mix: `bash=15`, `read=13`, `grep=3`, `todowrite=2`, `skill=1`.
- Summed `step_finish` token telemetry from the stored event stream: `total=1,123,510`, `input=111,460`, `output=3,344`, `reasoning=1,090`, `cacheRead=1,007,616`.
- This is useful packet-quality telemetry, not token-efficiency evidence, because no selected targets cleared.

Validation:

- `nix run .#tend-opencode -- run-harness-test --format json` passed inside the OpenCode slice.
- Focused Vitest for `refuses manual handlerId targets until runtime handler binding proof exists` passed.
- `openspec validate compress-recipe-authoring-surface --strict` passed inside the OpenCode slice.
- A full `packages/tend/opencode` Vitest run had one unrelated failure in `prepares package-backed OpenCode and TUI plugin config when delegating to upstream`.

Claim status:

- `insufficient-evidence` for 20x.
- This checkpoint is a packet optimization result: it reduces false-positive migration pressure by making an unsafe family refuse itself.
- It must not be counted as a packet-arm clear or as audit-promoted 20x evidence.

Next action:

- Continue optimizing packet families rather than selecting one-off fixes.
- Prefer families that can clear selected targets through a packet-owned interface and produce nonzero, token-bearing selected-target deltas.
- Keep `manual-handler-id-inferable` blocked until generated/lowered handler binding proof exists.

## Checkpoint: Joern transport source-scoped packet composition and sourcePath false-positive repair

Timestamp: 2026-07-02T01:33Z

Phase: Phase B packet optimization over source-scoped Recipe API migration slices.

Source slice:

- `packages/attune/joern-effect/src/edge/runtime/transport.ts`

Packet composition attempted:

- `recipe-authoring/generated-runtime-projection-readiness`
- `recipe-authoring/generated-runtime-projection`
- `recipe-authoring/manual-source-path-inferable`

Clean packet-loop clears:

- Readiness preview observed 4 selected targets.
- Readiness active cleared 4 selected targets through `ATTUNE_OPENSPEC_PACKET_ACTIVE=1` and `ATTUNE_OPENSPEC_PACKET_FASTPATH=1`.
- Readiness command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6002dfe2f3dd2367:2026-07-02T01:26:04.526Z`.
- Projection preview observed 4 eligible targets after readiness markers.
- Projection active materialized `.framework/generated/packetized-recipe-authoring/packages__attune__joern-effect__src__edge__runtime__transport.runtime.generated.ts` and cleared 4 selected targets.
- Projection command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:4c8e6478905c6d8b:2026-07-02T01:26:32.300Z`.

Invalidated packet-loop clears:

- `manual-source-path-inferable` preview observed 6 selected targets after projection materialization.
- Active sourcePath removal reported 6 clears, but `joern-effect:typecheck` failed.
- Validation failure showed `RecipeHandlerBinding` still requires `sourcePath` in the current runtime authoring surface.
- Failed validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6c432c06bf983138:2026-07-02T01:27:15.250Z`.
- Therefore the 6 sourcePath clears are contaminated and must not count as migration progress, packet evidence, or 20x evidence.

Repair:

- OpenCode/Tend repaired the invalid slice, not raw Codex.
- Repair command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5bb7db176ed64404:2026-07-02T01:27:39.459Z`.
- Repair restored required `sourcePath` fields in `transport.ts`.
- Repair tightened `manual-source-path-inferable` selector geometry for multiline `defineRecipeHandler<...>({` declarations and explicit `RecipeHandlerBinding` object declarations.
- Repair added a focused Tend/OpenCode regression test for `RecipeHandlerBinding sourcePath` refusal.
- Post-repair packet preview for the same source reported `manual-source-path-inferable` `selectedTotal=0`, `selectedRemaining=0`.
- Post-repair preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6af36262f1e8c819:2026-07-02T01:32:21.226Z`.

Telemetry:

- Readiness active was `control-only`, measured tokens `0`, measured clears `4`, command improvement vs raw `8.4x`.
- Projection active was `control-only`, measured tokens `0`, measured clears `4`, command improvement vs raw `8.4x`.
- SourcePath active was `control-only`, measured clears `6`, command improvement vs raw `12.6x`, but is invalidated by failed validation.
- SourcePath repair OpenCode run used 26 observed tool calls: `apply_patch=3`, `bash=6`, `grep=6`, `read=8`, `todowrite=3`.
- SourcePath repair summed `step_finish` token telemetry from the DB-stored event stream: `total=636,907`, `input=55,773`, `output=3,667`, `reasoning=955`, `cacheRead=576,512`.

Validation:

- Standalone observed `joern-effect:typecheck` passed after repair: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6c432c06bf983138:2026-07-02T01:33:19.885Z`.
- Standalone observed `tend-opencode:typecheck` passed: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T01:33:19.811Z`.
- Standalone observed focused `tend-opencode:test -- -t "RecipeHandlerBinding sourcePath"` passed: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:53069a011b463989:2026-07-02T01:33:19.815Z`.

Claim status:

- `insufficient-evidence` for 20x.
- The clean control clears are packet-interface evidence and command-efficiency evidence, not token-efficiency evidence.
- The sourcePath false positive demonstrates why validation-backed selected-target checks are mandatory before scaling.
- The repaired selector improves packet truthfulness and should reduce future false-positive clears.

Next action:

- Continue optimizing packet composition over source-scoped slices.
- Do not count sourcePath clears unless validation passes after the packet and post-repair preview confirms current runtime-required fields are not selected.
- Prefer next slices where readiness and projection can clear targets without triggering current runtime-required source fields.

## 2026-07-02 checkpoint: packet interface optimization over source-scoped generated projection

### Orientation

Packets are the migration interface for realizing the Recipe authoring cut efficiently. This checkpoint treats packet runs as migration-interface evidence, not as isolated quickfix evidence. The goal is to optimize packet families, composition, scoring, and validation gates until the Tend/OpenCode harness can repeatedly approach the 10-20x band with 20x as the target.

### Slice under analysis

Change: `compress-recipe-authoring-surface`
Packet family chain: `recipe-authoring/generated-runtime-projection-readiness` -> `recipe-authoring/generated-runtime-projection`
Source-scoped replay target: `packages/attune/foldkit/src/activity.ts`
Harness: Tend/OpenCode packet loop through observed `tend-opencode` commands

### Evidence from observed runs

- Bootstrap proof remains available through Tend/OpenCode fingerprint and harness JSON observations.
- Manual handler ID inference was correctly refused as unsafe: 9 selected, 9 remaining, 9 refused, 0 cleared.
- SourcePath inference false-positive on `RecipeHandlerBinding` was found by validation, repaired in the packet harness selector, and replayed to 0 selected targets on the contaminated source.
- Generated runtime projection chain now composes readiness marker materialization and generated projection materialization in a single source-scoped packet loop.
- Fresh FoldKit activity replay cleared 4 selected projection targets in one active packet command and passed `attune-foldkit:typecheck`.
- The run was classified as `control-only` for token efficiency because the packet fastpath measured 0 migration-edit tokens. This correctly avoids `tokensPerClear = 0` and avoids a token-efficiency 20x claim.
- Current command-side improvement for the fresh chain replay is 8.4x, below the 10-20x target band.

### Claim status

Claim status: `candidate`

This is candidate packet-interface evidence, not audit-promoted 20x evidence. The packet interface is now better aligned with the migration because it composes prerequisite readiness and projection in one loop, but the scorer still counts only the selected projection targets for this source. The evidence supports continued packet optimization, not handoff for the full OpenCode run.

### Optimization finding

The next optimization should improve the migration interface itself rather than select more isolated targets. Two viable packet-interface improvements are:

1. Add composite-clear accounting for generated runtime projection chains when readiness and projection are both source-scoped, validated, and emitted through the same packet loop.
2. Add explicit source-batch execution for the same packet family so multiple source-scoped projections amortize packet-loop overhead without using a repo-wide sweep.

The safer next slice is source-batch execution because it preserves target semantics and should produce a cleaner measured command/token denominator without inflating clears after the fact.

### Guardrails

- Do not count the contaminated manual-source-path clears from the Joern transport run.
- Do not claim 20x from control-only packet fastpaths.
- Do not treat quickfix availability as the packet goal. Quickfixes may be implementation mechanics, but the packet is the migration interface and must remain agentically gated by economy, validation, target status, and Tend/OpenCode observations.
- Do not start the full Recipe API migration in raw Codex mode.

### Next action

Optimize the Tend/OpenCode packet harness over the generated-runtime projection packet interface by adding measured source batching or an equivalent composite packet-loop status that is DB-backed, validated, and resistant to metric gaming.

## 2026-07-02 checkpoint: interrupted source-batch optimization attempt

### Attempt

Tend/OpenCode was asked to implement an explicit source-batch packet interface for `recipe-authoring/generated-runtime-projection` so multiple bounded source files could be processed and measured as one packet-loop run.

Implementation title: `optimize-generated-runtime-source-batch-packet`

### Result

The OpenCode run stayed silent for roughly eleven minutes and was terminated with exit code 143 before completion. A direct query of `framework_event.recipe_observation` for the implementation title found no durable observation row for the interrupted attempt.

### Interpretation

This is not migration progress and not packet-family evidence. It is harness-quality evidence:

- The requested source-batch optimization slice was too coarse for one model implementation run.
- Interrupted model implementation attempts do not currently leave enough durable attempt telemetry in the framework store.
- The next Tend/OpenCode implementation slice should be smaller and should first improve observation of interrupted/long-running OpenCode implementation attempts, or should implement source-batch support in a narrower first step such as CLI parsing plus contract tests only.

### Claim status

Claim status: `insufficient-evidence`

This checkpoint does not weaken the clean packet-chain evidence, but it does show that packet-development work must be decomposed more carefully before using it to optimize toward the 10-20x band.

### Next action

Run a smaller Tend/OpenCode slice: either add durable observation for interrupted OpenCode implementation runs, or add only explicit multi-source CLI parsing and preview aggregation tests before attempting active source-batch execution.

## 2026-07-02 checkpoint: source-batch preview aggregation implemented by Tend/OpenCode

### Attempt

Tend/OpenCode implemented a smaller packet-interface slice after the previous source-batch implementation prompt proved too coarse.

Implementation title: `add-source-batch-preview-aggregation-only`
Observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:c41f9a32450f975f:2026-07-02T02:01:39.129Z`

### Implementation telemetry

The OpenCode implementation trace was captured in `framework_event.recipe_observation` as raw JSON events.

- Event count: 114
- Tool calls: 48
- Tool mix: skill 1, todowrite 3, grep 7, bash 12, glob 2, read 21, apply_patch 2
- Token totals from OpenCode event stream: total 1,486,860; input 114,280; output 6,226; reasoning 1,874; cache read 1,364,480

This is packet-development cost, not migration-clear efficiency.

### Implemented behavior

The Tend/OpenCode harness now supports explicit multi-source preview aggregation for `recipe-authoring/generated-runtime-projection`.

- Repeated `--source` values are accepted for preview.
- Preview batches are bounded to explicit sources and do not sweep the repo.
- Preview mode reports aggregate `selectedTotal` and `selectedRemaining`.
- `packetFastpath.sourceSummaries` carries per-source selected counts.
- Preview mode does not write source or `.framework/generated` files.
- Active multi-source mode refuses clearly until active source-batch execution is separately implemented.
- The path remains scoped to `recipe-authoring/generated-runtime-projection` and does not run `recipe-authoring/manual-source-path-inferable`.

### Replay evidence

Observed fresh preview replay:

Observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:c67f357b378cc2f2:2026-07-02T02:11:12.299Z`

Command:

```bash
nix run .#tend-opencode -- openspec packet-loop \
  --change compress-recipe-authoring-surface \
  --mode preview \
  --family recipe-authoring/generated-runtime-projection \
  --source packages/attune/cocoindex-effect/src/CocoIndexClientFixture.ts \
  --source packages/attune/joern-effect/src/pure/codegen/generate.ts \
  --until complete \
  --format json
```

Result:

- selectedTotal: 6
- selectedRemaining: 6
- cleared: 0
- source summaries: 2 targets in `CocoIndexClientFixture.ts`, 4 targets in `pure/codegen/generate.ts`
- storeHealth: healthy
- claimStatus: `insufficient-evidence`

Observed active refusal replay:

Observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e01ebca99d194350:2026-07-02T02:11:25.576Z`

Result:

- mode: active
- selectedTotal: 6
- selectedRemaining: 6
- cleared: 0
- state: blocked
- activeModeAllowed: true
- storeHealth: healthy
- reason: active generated-runtime projection source-batch execution is not implemented; only preview batch aggregation is available
- tokenEfficiencyStatus: `zero-clears`

### Claim status

Claim status: `insufficient-evidence`

This is real packet-interface progress, but it is not migration progress and not 20x evidence. It proves that the harness can aggregate explicit source-scoped packet targets and refuse unsafe active batch execution. It does not clear targets.

### Next action

The next Tend/OpenCode slice should implement active source-batch execution for `recipe-authoring/generated-runtime-projection` using the existing single-source readiness+projection chain per explicit source in one packet-loop command. That slice must stay bounded, preserve the sourcePath exclusion, validate affected packages, and score aggregated clears through `framework_event.recipe_observation` with a predeclared `--implementation-title`.

## 2026-07-02 checkpoint: first active source-batch replay, contaminated by telemetry inconsistency

### Slice

Family: `recipe-authoring/generated-runtime-projection`
Implementation title: `active-generated-projection-source-batch-cocoindex-joern`
Sources:

- `packages/attune/cocoindex-effect/src/CocoIndexClientFixture.ts`
- `packages/attune/joern-effect/src/pure/codegen/generate.ts`

### Setup evidence

Before active replay, a preview packet run selected 6 targets across the two explicit sources:

- `CocoIndexClientFixture.ts`: 2 selected targets
- `pure/codegen/generate.ts`: 4 selected targets

Preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:c67f357b378cc2f2:2026-07-02T02:11:12.299Z`

### Active replay evidence

Active replay observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6bb5d64ad8eb0019:2026-07-02T02:22:34.308Z`

The packet finalizer reported:

- dbBackedTargetStatus: true
- derivedCleared: 6
- measuredClears: 6
- commandImprovementVsRaw: 12.6x
- tokenEfficiencyStatus: `control-only`
- measuredTokens: 0

Post-run preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f5d4334dcabc2248:2026-07-02T02:23:08.506Z`

Post-run preview selected 0 targets on the same two sources.

Affected validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:22:50.547Z`

Validation passed:

- `nx run cocoindex-effect:typecheck`
- `nx run joern-effect:typecheck`
- `openspec validate compress-recipe-authoring-surface --strict`
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`

### Contamination / anti-gaming finding

This run is not clean 20x evidence.

The selected-target DB delta says 6 targets cleared, and the post-run preview confirms 0 selected targets remain. However, the active packet output also reported `packetFastpath.applied: false` with reason: generated-runtime projection source batch blocked at `CocoIndexClientFixture.ts` because every selected target was not target-local eligible.

Those facts cannot all be treated as clean claim-bearing evidence at the same time. The run is therefore classified as contaminated/provisional migration progress, not audit-promoted evidence.

### Claim status

Claim status: `candidate`, contaminated

The run is useful because it proves the active batch path can change selector state for a bounded two-source packet and preserve typechecks. It is not sufficient for handoff or a 20x claim because the packet-loop payload violates the telemetry invariant: if derived clears are claimed, the fastpath summary must agree on applied/cleared/source-level status, or the loop must block and claim zero clears.

### Next action

Do not scale to larger source batches yet. The next Tend/OpenCode slice must fix the active source-batch telemetry invariant:

- Active batch success must report `packetFastpath.applied: true`, aggregate `cleared`, changed files, and source summaries consistently with selected-target deltas.
- Active batch failure must report blocked/failed state and must not produce derived clears.
- The finalizer must refuse claim-bearing scoring when packet-loop status and fastpath status disagree.

## 2026-07-02 checkpoint: telemetry invariant fixed and clean 12-target source batch cleared

### Telemetry invariant fix

Tend/OpenCode implemented the active source-batch telemetry invariant fix.

Implementation title: `fix-active-batch-telemetry-invariant`
Observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5e84e3bf5cb11538:2026-07-02T02:24:16.541Z`

Implementation telemetry from OpenCode event stream:

- Event count: 109
- Tool calls: 39
- Tool mix: todowrite 3, grep 8, glob 1, read 15, apply_patch 4, bash 8
- Token totals: total 1,321,964; input 108,007; output 5,731; reasoning 2,466; cache read 1,205,760

Implemented behavior:

- Active source-batch blocked state now reports zero clears and keeps targets remaining instead of claiming partial clears.
- Finalizer detects disagreement between DB selected-target deltas and `packetFastpath` applied/cleared status and refuses claim-bearing scoring.
- Control-only token handling still omits `tokensPerClear` and remains non-claim-bearing.

Validated by Tend/OpenCode:

- `nx run tend-opencode:typecheck`
- focused tests for active source-batch success, blocked batch zero-claim behavior, finalizer disagreement detection, and control-only token efficiency
- `openspec validate compress-recipe-authoring-surface --strict`

### Clean active replay

Preview before active replay selected 12 eligible targets across two explicit source files:

- `packages/attune/cocoindex-effect/src/CocoIndexClientLive.ts`: 4 selected targets
- `packages/attune/joern-effect/src/internal/generation/JoernGenerationCli.ts`: 8 selected targets

Preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:4a9184134e99cb6f:2026-07-02T02:32:47.221Z`

Active replay observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:a3373c8bb6fbda73:2026-07-02T02:33:00.488Z`

Active replay result:

- selectedTotal: 12
- selectedRemaining: 0
- cleared: 12
- stale: 0
- flicker: 0
- refused: 0
- failedValidation: 0
- `packetFastpath.applied`: true
- source summaries agree: 4 cleared from `CocoIndexClientLive.ts`, 8 cleared from `JoernGenerationCli.ts`
- changedFileCount: 2 generated projection files
- derivedCleared: 12 from `framework_event.recipe_observation`
- commandImprovementVsRaw: 25.2x
- tokenEfficiencyStatus: `control-only`
- measuredTokens: 0

Post-run preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:12c68f3fdd968d1a:2026-07-02T02:33:24.997Z`

Post-run preview selected 0 targets on the same sources.

Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:33:16.341Z`

Validation passed:

- `nx run cocoindex-effect:typecheck`
- `nx run joern-effect:typecheck`
- `openspec validate compress-recipe-authoring-surface --strict`
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`

### Claim status

Claim status: `candidate`

This is clean command-efficiency candidate evidence for the packet interface on a bounded generated-runtime projection source batch. It is not audit-promoted 20x evidence because the packet edit path is deterministic/control-only and therefore provides no model-edit token numerator. It supports scaling the same packet family cautiously, while continuing to label token efficiency as unclaimable until a token-bearing implementation command is joined or a scored migration arm includes model-token telemetry.

### Next action

Continue optimizing over packets, not selecting random targets. The next safe scaling step is another bounded explicit source batch in the same family, preferably 10-20 selected targets, with the same invariant checks:

- clean preview registration
- active packet loop with `packetFastpath.applied: true`
- post-run preview at zero selected
- affected package validation
- DB-backed observations and finalizer output

Do not hand off the full run yet. We have one clean command-efficiency candidate slice, but not consistent evidence across repeated slices and not token-efficiency evidence.

## Analysis: Generated projection chain source-batch repeatability slice

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-active",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "activeModeCapability": "passed",
    "storeHealth": "passed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "candidate-command-efficiency-only"
  },
  "packetFamily": "recipe-authoring/generated-runtime-projection",
  "packetLoopState": "complete",
  "selectedTotal": 5,
  "selectedRemaining": 0,
  "cleared": 5,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "implementationSlice": {
    "interfacePurpose": "Packets are the migration interface used to realize repeated Recipe authoring projection work efficiently; this slice measures interface composition, not isolated quickfix selection.",
    "packetOptimization": "Composed target-local readiness with generated-runtime projection for source-batched active execution.",
    "sources": [
      "packages/attune/cocoindex-effect/src/cocoindex/mcp-schema.ts",
      "packages/attune/discovery/src/config-recipes.ts"
    ],
    "sourceSummaries": [
      {
        "sourceFile": "packages/attune/cocoindex-effect/src/cocoindex/mcp-schema.ts",
        "selectedTotal": 2,
        "cleared": 2,
        "applied": true
      },
      {
        "sourceFile": "packages/attune/discovery/src/config-recipes.ts",
        "selectedTotal": 3,
        "cleared": 3,
        "applied": true
      }
    ],
    "changedFiles": [
      "packages/attune/cocoindex-effect/src/cocoindex/mcp-schema.ts",
      ".framework/generated/packetized-recipe-authoring/packages__attune__cocoindex-effect__src__cocoindex__mcp-schema.runtime.generated.ts",
      "packages/attune/discovery/src/config-recipes.ts",
      ".framework/generated/packetized-recipe-authoring/packages__attune__discovery__src__config-recipes.runtime.generated.ts"
    ]
  },
  "tokenTelemetry": {
    "composeImplementationObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6740e76b5a1756d6:2026-07-02T02:35:39.321Z",
    "composeImplementationTokens": 1335888,
    "composeImplementationToolCalls": 39,
    "activeMigrationTokenMetricSource": "packet-fastpath/control-loop",
    "activeMigrationMeasuredTokens": 0,
    "activeMigrationMeasuredClears": 5,
    "tokenEfficiencyStatus": "control-only",
    "reason": "The packet loop itself cleared selected targets through a deterministic Tend/OpenCode packet fastpath, so command-efficiency can be scored, but token-per-clear is not claim-bearing until paired token accounting attributes migration-arm agent/model work rather than packet-development cost."
  },
  "commandTelemetry": {
    "activeObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e3ecf30dadb17c34:2026-07-02T02:43:22.289Z",
    "validationObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:45:55.910Z",
    "postPreviewObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:3b5c7d556381de58:2026-07-02T02:45:55.907Z",
    "measuredCommands": 1,
    "commandImprovementVsRaw": 10.5,
    "postPreviewSelectedTotal": 0
  },
  "baselineComparison": {
    "rawArmTokens": 3722627,
    "rawArmCommands": 63,
    "rawTokensPerClear": 124087.56666666667,
    "targetTokensPerClearFor20x": 6204.378333333333,
    "correctedBenchmarkPacketArmTokens": 134431,
    "correctedBenchmarkPacketArmCommands": 6,
    "correctedBenchmarkRawArmTokens": 3722627,
    "correctedBenchmarkRawArmCommands": 63,
    "promotedPrecisionAdjustedReasoningBearingImprovement": 27.69,
    "scope": "Historical benchmark orientation plus current slice command efficiency; not audit-promoted token evidence for this Recipe migration."
  },
  "validationTargets": [
    "cocoindex-effect:typecheck",
    "attuned-discovery:typecheck",
    "openspec validate compress-recipe-authoring-surface --strict",
    "openspec validate coordinate-packetized-recipe-migration-goal --strict",
    "post-run packet preview selected-target check"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6740e76b5a1756d6:2026-07-02T02:35:39.321Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9758219293653d7f:2026-07-02T02:43:07.706Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e3ecf30dadb17c34:2026-07-02T02:43:22.289Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:45:55.910Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:3b5c7d556381de58:2026-07-02T02:45:55.907Z"
  ],
  "claimStatus": "candidate",
  "blockers": [
    "This is clean DB-backed selected-target migration evidence, but it is still command-efficiency/control-fastpath evidence rather than audit-promoted token-efficiency evidence.",
    "The packet-development implementation run consumed 1,335,888 tokens and 39 tool calls and must remain accounted separately from the deterministic packet migration replay.",
    "Need repeated source-batch slices or a token-bearing OpenCode migration-arm run that preserves selected-target checks before handing off the full autonomous run."
  ],
  "nextAction": "Optimize the generated-runtime projection packet interface over another source-batch slice or add paired token attribution in the harness, then rerun through Tend/OpenCode observe until command and token evidence consistently approaches the 10-20x band with 20x as the target."
}
```

## Analysis: Generated projection source-batch 11-target repeatability slice

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-active",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "activeModeCapability": "passed",
    "storeHealth": "passed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "candidate-command-efficiency-only"
  },
  "packetFamily": "recipe-authoring/generated-runtime-projection",
  "packetLoopState": "complete",
  "selectedTotal": 11,
  "selectedRemaining": 0,
  "cleared": 11,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "implementationSlice": {
    "interfacePurpose": "This slice treats packets as the migration interface: the harness first discovered broad target geometry, refused unsafe repo-wide active materialization, then executed a bounded source-scoped batch selected from its own top classifications.",
    "packetOptimization": "Source-scoped batching over generated-runtime projection targets with readiness-plus-projection composition.",
    "broadPreviewObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:310b952b2ade704c:2026-07-02T02:47:18.570Z",
    "broadPreviewSelectedTotal": 500,
    "broadPreviewDecision": "shadow/source-scoped required",
    "sourceBatchPreviewObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:92f9b50530e4622c:2026-07-02T02:47:40.534Z",
    "sources": [
      "packages/attune/cocoindex-effect/src/CocoIndexClient.ts",
      "packages/attune/cocoindex-effect/src/RepositoryIntelligence.ts",
      "packages/attune/cocoindex-effect/src/cocoindex/tools/index.ts",
      "packages/attune/cocoindex-effect/src/cocoindex/tools/search.ts",
      "packages/attune/cocoindex-effect/src/model.ts",
      "packages/attune/cocoindex-effect/src/test-recipes.ts"
    ],
    "sourceSummaries": [
      { "sourceFile": "packages/attune/cocoindex-effect/src/CocoIndexClient.ts", "selectedTotal": 1, "cleared": 1, "applied": true },
      { "sourceFile": "packages/attune/cocoindex-effect/src/RepositoryIntelligence.ts", "selectedTotal": 1, "cleared": 1, "applied": true },
      { "sourceFile": "packages/attune/cocoindex-effect/src/cocoindex/tools/index.ts", "selectedTotal": 2, "cleared": 2, "applied": true },
      { "sourceFile": "packages/attune/cocoindex-effect/src/cocoindex/tools/search.ts", "selectedTotal": 2, "cleared": 2, "applied": true },
      { "sourceFile": "packages/attune/cocoindex-effect/src/model.ts", "selectedTotal": 3, "cleared": 3, "applied": true },
      { "sourceFile": "packages/attune/cocoindex-effect/src/test-recipes.ts", "selectedTotal": 2, "cleared": 2, "applied": true }
    ],
    "changedFileCount": 12
  },
  "tokenTelemetry": {
    "activeMigrationTokenMetricSource": "packet-fastpath/control-loop",
    "activeMigrationMeasuredTokens": 0,
    "activeMigrationMeasuredClears": 11,
    "tokenEfficiencyStatus": "control-only",
    "reason": "The deterministic packet loop produced DB-backed selected-target clears, but model-token efficiency is not claim-bearing because no token-bearing migration-arm model work was joined to this packet run."
  },
  "commandTelemetry": {
    "activeObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ec2d6a8d74801b3e:2026-07-02T02:47:56.326Z",
    "validationObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:48:13.643Z",
    "postPreviewObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ae06415fc164b505:2026-07-02T02:48:13.715Z",
    "measuredCommands": 1,
    "commandImprovementVsRaw": 23.1,
    "postPreviewSelectedTotal": 0
  },
  "validationTargets": [
    "cocoindex-effect:typecheck",
    "openspec validate compress-recipe-authoring-surface --strict",
    "openspec validate coordinate-packetized-recipe-migration-goal --strict",
    "post-run packet preview selected-target check"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:310b952b2ade704c:2026-07-02T02:47:18.570Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:92f9b50530e4622c:2026-07-02T02:47:40.534Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ec2d6a8d74801b3e:2026-07-02T02:47:56.326Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:48:13.643Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ae06415fc164b505:2026-07-02T02:48:13.715Z"
  ],
  "claimStatus": "candidate",
  "blockers": [
    "Command-side repeatability is now strong for generated-runtime source batching, but token efficiency remains unpromoted because the migration loop is deterministic/control-fastpath with zero model-token telemetry.",
    "The broad 500-target preview shows packet-family density, but active execution must remain source-scoped until validation and stale-risk gates justify larger batches.",
    "Need a harness-joined token-bearing implementation/migration run or a paired accounting model that can fairly attribute packet-development cost versus migration execution cost."
  ],
  "nextAction": "Continue optimizing the packet interface over source-scoped batches and improve the harness scorer so token-bearing OpenCode implementation telemetry can be joined cleanly to selected-target clears without treating deterministic control-fastpath clears as token-efficiency wins."
}
```

## Analysis: Token-bearing scorer join and 10-target measured efficiency slice

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-active",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "activeModeCapability": "passed",
    "storeHealth": "passed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "measured-below-target"
  },
  "packetFamily": "recipe-authoring/generated-runtime-projection",
  "packetLoopState": "complete",
  "selectedTotal": 10,
  "selectedRemaining": 0,
  "cleared": 10,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "implementationSlice": {
    "interfacePurpose": "Packets remain the migration interface. This slice added explicit token-bearing implementation observation joins to the Tend/OpenCode harness, then ran a fresh source-scoped generated-runtime projection packet with that observation linked from the start.",
    "scorerPatch": {
      "changedSurfaces": [
        "packages/trellis/runtime/src/SqlRoute.ts",
        "packages/tend/opencode/src/contracts.ts",
        "packages/tend/opencode/test/opencode.test.ts"
      ],
      "behavior": [
        "Search implementation command traces in command, commandLine, stdout, and stderr payload fields.",
        "Prefer token-bearing implementation observations over control-only packet-loop observations when matching by implementation title.",
        "Allow explicit --implementation-observation-id scorer links for exact DB-backed joins.",
        "Keep packet-fastpath/control-loop zero-token clears non-claim-bearing."
      ]
    },
    "sources": [
      "packages/attune/discovery/src/memory/read-model.ts",
      "packages/attune/discovery/src/projection/read-model-projection.ts",
      "packages/attune/discovery/src/recipes.ts",
      "packages/attune/discovery/src/test-recipes.ts",
      "packages/attune/foldkit/src/asset-recipes.ts"
    ],
    "sourceSummaries": [
      { "sourceFile": "packages/attune/discovery/src/memory/read-model.ts", "selectedTotal": 2, "cleared": 2, "applied": true },
      { "sourceFile": "packages/attune/discovery/src/projection/read-model-projection.ts", "selectedTotal": 3, "cleared": 3, "applied": true },
      { "sourceFile": "packages/attune/discovery/src/recipes.ts", "selectedTotal": 1, "cleared": 1, "applied": true },
      { "sourceFile": "packages/attune/discovery/src/test-recipes.ts", "selectedTotal": 3, "cleared": 3, "applied": true },
      { "sourceFile": "packages/attune/foldkit/src/asset-recipes.ts", "selectedTotal": 1, "cleared": 1, "applied": true }
    ],
    "changedFileCount": 10
  },
  "tokenTelemetry": {
    "implementationObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6740e76b5a1756d6:2026-07-02T02:35:39.321Z",
    "tokenMetricSource": "opencode-json-events",
    "jsonEvents": 101,
    "stepFinishEvents": 24,
    "tokenTotal": 90173,
    "inputTokens": 13287,
    "outputTokens": 1513,
    "cachedTokens": 88576,
    "reasoningTokens": 531,
    "effectiveTokens": 90173,
    "toolCalls": 39,
    "durationMs": 370574,
    "tokensPerClear": 9017.3,
    "targetTokensPerClearFor20x": 6204.378333333333,
    "tokenImprovementVsRaw": 13.761055600530833,
    "tokenEfficiencyStatus": "measured",
    "reason": "This is the first clean source slice in this loop with nonzero DB-backed selected-target clears and token-bearing OpenCode implementation telemetry joined in packetRunAnalysis. It is below the 20x target, so it is optimization evidence, not handoff evidence."
  },
  "commandTelemetry": {
    "scorerValidationObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:56:05.806Z",
    "previewObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9bc791849619e9f6:2026-07-02T02:57:16.755Z",
    "activeObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6053249354158ca1:2026-07-02T02:57:31.039Z",
    "postPreviewObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:94c18f2ed8c70abc:2026-07-02T02:57:48.745Z",
    "validationObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:57:56.233Z",
    "measuredCommands": 1,
    "commandImprovementVsRaw": 21,
    "postPreviewSelectedTotal": 0
  },
  "baselineComparison": {
    "rawArmTokens": 3722627,
    "rawArmCommands": 63,
    "rawTokensPerClear": 124087.56666666667,
    "targetTokensPerClearFor20x": 6204.378333333333,
    "correctedBenchmarkPacketArmTokens": 134431,
    "correctedBenchmarkPacketArmCommands": 6,
    "correctedBenchmarkRawArmTokens": 3722627,
    "correctedBenchmarkRawArmCommands": 63,
    "promotedPrecisionAdjustedReasoningBearingImprovement": 27.69,
    "currentSliceTokenImprovement": 13.761055600530833,
    "scope": "Measured Recipe migration slice; below the 20x target and not audit-promoted."
  },
  "validationTargets": [
    "framework-runtime:typecheck",
    "tend-opencode:typecheck",
    "focused tend-opencode vitest token scorer tests",
    "attuned-discovery:typecheck",
    "attune-foldkit:typecheck",
    "openspec validate bootstrap-packetized-openspec-apply --strict",
    "openspec validate compress-recipe-authoring-surface --strict",
    "openspec validate coordinate-packetized-recipe-migration-goal --strict",
    "post-run packet preview selected-target check"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:54:29.887Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:56:05.806Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f551b9465efa319e:2026-07-02T02:56:53.405Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9bc791849619e9f6:2026-07-02T02:57:16.755Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6053249354158ca1:2026-07-02T02:57:31.039Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:94c18f2ed8c70abc:2026-07-02T02:57:48.745Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T02:57:56.233Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Measured token efficiency is 13.76x for this slice, below the 20x target.",
    "The scorer correctly links token-bearing OpenCode telemetry, but the current packet-development/implementation token cost is not yet sufficiently amortized by 10 selected clears.",
    "Do not hand off the full autonomous OpenCode run until repeated measured slices consistently reach the 10-20x band and preferably meet the 20x target."
  ],
  "nextAction": "Optimize the packet interface for larger safe source-scoped batches or lower token-bearing implementation overhead, then run another fresh Tend/OpenCode active slice with --implementation-observation-id attached from the start."
}
```

## Analysis: Generated projection 30-target measured efficiency candidate

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-active",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapCompletion": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "activeModeCapability": "passed",
    "storeHealth": "passed",
    "validation": "passed",
    "traceCompleteness": "passed",
    "accountingEvidence": "meets-20x-single-slice"
  },
  "packetFamily": "recipe-authoring/generated-runtime-projection",
  "packetLoopState": "complete",
  "selectedTotal": 30,
  "selectedRemaining": 0,
  "cleared": 30,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "implementationSlice": {
    "interfacePurpose": "This slice tests packet batching as the migration interface, not a one-off quickfix. The broad selector reported 482 remaining targets and refused repo-wide active execution; the source-scoped packet selected 30 repeated generated-runtime projection targets across 20 sources.",
    "broadPreviewObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9165349a7ddd2d41:2026-07-02T02:59:47.920Z",
    "broadPreviewSelectedTotal": 482,
    "previewObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:b3d9f40b349ca71d:2026-07-02T03:00:17.420Z",
    "activeObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9c30eb625ce151fe:2026-07-02T03:00:35.887Z",
    "sources": [
      "packages/attune/cocoindex-effect/src/errors.ts",
      "packages/attune/cocoindex-effect/src/index.ts",
      "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts",
      "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts",
      "packages/attune/cocoindex-effect/src/mcp/stdio.ts",
      "packages/attune/cocoindex-effect/src/recipes.ts",
      "packages/attune/foldkit/src/config-recipes.ts",
      "packages/attune/foldkit/src/entry.ts",
      "packages/attune/foldkit/src/fixture-commands.ts",
      "packages/attune/foldkit/src/fixture-route.ts",
      "packages/attune/foldkit/src/fixture-types.ts",
      "packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts",
      "packages/attune/foldkit/src/fixtures/app-site-fixture.ts",
      "packages/attune/foldkit/src/fixtures/mdx-view-fixture.ts",
      "packages/attune/foldkit/src/fixtures/workbench-atom-fixture.ts",
      "packages/attune/foldkit/src/index.ts",
      "packages/attune/foldkit/src/main.ts",
      "packages/attune/foldkit/src/message.ts",
      "packages/attune/foldkit/src/model.ts",
      "packages/attune/foldkit/src/recipes.ts"
    ],
    "changedFileCount": 40
  },
  "tokenTelemetry": {
    "implementationObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6740e76b5a1756d6:2026-07-02T02:35:39.321Z",
    "tokenMetricSource": "opencode-json-events",
    "tokenTotal": 90173,
    "toolCalls": 39,
    "tokensPerClear": 3005.766666666667,
    "targetTokensPerClearFor20x": 6204.378333333333,
    "tokenImprovementVsRaw": 41.28316680159249,
    "commandImprovementVsRaw": 63,
    "tokenEfficiencyStatus": "meets-20x",
    "reason": "The same packet implementation cost that scored 13.76x on a 10-target slice amortized to 41.28x on a 30-target source-scoped packet. This is candidate evidence for the packet interface, but one strong slice is not enough for final handoff."
  },
  "validationTargets": [
    "cocoindex-effect:typecheck",
    "attune-foldkit:typecheck",
    "openspec validate compress-recipe-authoring-surface --strict",
    "openspec validate coordinate-packetized-recipe-migration-goal --strict",
    "post-run packet preview selected-target check"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9165349a7ddd2d41:2026-07-02T02:59:47.920Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:b3d9f40b349ca71d:2026-07-02T03:00:17.420Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9c30eb625ce151fe:2026-07-02T03:00:35.887Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:4d7bcec9908a1a18:2026-07-02T03:00:57.088Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T03:00:57.085Z"
  ],
  "claimStatus": "candidate",
  "blockers": [
    "Do not audit-promote or hand off after a single above-target measured slice.",
    "Need at least one more independent measured source-scoped slice above or near 20x, ideally at a larger batch size, before allowing the autonomous larger run.",
    "The packet remains source-scoped; repo-wide active materialization is still explicitly refused by the harness."
  ],
  "nextAction": "Run another independent measured source-scoped generated-runtime projection batch, preferably larger than 30 selected targets, with the same scorer discipline and validation ladder."
}
```

## Goal analysis checkpoint: sourcePath batch packet optimization and validated 29-target clear

- Timestamp: 2026-07-02T03:12:06Z
- Phase: Phase B packet optimization over Recipe authoring migration slices
- Child change statuses: `bootstrap-packetized-openspec-apply` externally proven; `compress-recipe-authoring-surface` running only through Tend/OpenCode packetized apply; `coordinate-packetized-recipe-migration-goal` tracking evidence and gates
- Trigger: The previous generated-runtime projection slice exposed a prerequisite gap: many targets were not projection-ready because they still needed authoring facts. We pivoted from selecting another projection slice to optimizing the packet interface for a migration-relevant authoring field family.
- Rejected probe: `recipe-authoring/generated-runtime-projection` over FoldKit/Joern selected 31 targets but active cleared 0/31, correctly recorded as rejected exploratory evidence with high gaming risk.
- Rejected probe observation IDs: preview `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:63a186a14fdc1662:2026-07-02T03:04:09.125Z`; active `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:81943839bccbadd7:2026-07-02T03:04:40.848Z`
- Packet optimization: Added a batch source-scoped fastpath for `recipe-authoring/manual-source-path-inferable` so multiple explicit `--source` values are treated as a bounded migration packet rather than incorrectly blocked as a repo-wide sweep.
- Harness files changed by this optimization: `packages/tend/opencode/src/contracts.ts`; `packages/tend/opencode/test/opencode.test.ts`
- Pre-optimization sourcePath preview: 29 selected targets across 17 explicit CocoIndex/Discovery sources, all classified eligible by the packet oracle.
- Pre-optimization preview observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:c756f016955690b2:2026-07-02T03:05:36.754Z`
- Pre-optimization active result: blocked with 0/29 cleared because the harness only recognized single-source `packetSource`, not batch `packetSources`.
- Pre-optimization active observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:d5750ade1c079e28:2026-07-02T03:05:54.862Z`
- Post-optimization active result: complete; selectedRemaining moved from 29 to 0 through `framework_event.recipe_observation` selected-target delta.
- Post-optimization active observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:d8bdb60bb18b7059:2026-07-02T03:09:01.779Z`
- Post-preview selected-target check: selectedTotal 0, selectedRemaining 0 for the same source set.
- Post-preview observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:3972b0ba72da25c8:2026-07-02T03:09:30.063Z`
- Token telemetry source: linked Tend/OpenCode JSON event observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6740e76b5a1756d6:2026-07-02T02:35:39.321Z`
- Token telemetry: measuredTokens 90,173; inputTokens 13,287; outputTokens 1,513; cachedTokens 88,576; reasoningTokens 531; toolCalls 39; durationMs 370,574; tokenMetricSource `opencode-json-events`
- Efficiency: 29 clears; 3,109.413793 tokens/clear; 321.604 clears per million tokens; 39.907061x token improvement vs raw reference; 60.9x command improvement vs raw reference; 29 clears/command; 1.344828 tools/clear
- Validation failure during optimization: initial validation failed on `tend-opencode:typecheck` because the batch fastpath passed derived `changedFileCount` into the decoder input. This was fixed by removing derived fields from decoder inputs.
- Failed validation observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T03:09:52.380Z`
- Passing validation observation ID: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T03:11:11.103Z`
- Passing validation ladder: `tend-opencode:typecheck`; `tend-opencode:test` with 82 tests; `cocoindex-effect:typecheck`; `attuned-discovery:typecheck`; `openspec validate compress-recipe-authoring-surface --strict`; `openspec validate coordinate-packetized-recipe-migration-goal --strict`
- DB/store status: healthy local Postgres store; packet observations and command observations emitted through `framework_event.recipe_observation`; selected-target delta query used the framework SQL route pipeline.
- Claim status: candidate. This is not audit-promoted evidence because the harness still marks the run exploratory, the linked implementation observation is shared/conservative accounting, and consistency across independent packet families is still being established.
- Anti-gaming note: This was not selected as a convenient quickfix. The failed generated-projection probe changed the packet strategy, the blocked sourcePath active run exposed a harness interface bug, and the packet implementation was changed before replaying the same predeclared 29-target slice. The score is usable as candidate evidence because the rerun cleared the same source-scoped target queue and then passed validation.
- Next action: continue optimizing over packet families. The next clean candidates are authoring-fact prerequisites and deterministic identity families such as `manual-recipe-id-inferable` or generated-projection readiness, with predeclared source scopes and DB-linked token telemetry.

## Analysis checkpoint: composed readiness + generated projection slice, FoldKit/Joern 20-source batch

- `schemaVersion`: 1
- `changeId`: `coordinate-packetized-recipe-migration-goal`
- `phase`: `phase-b-packet-optimization`
- `childChangeStatuses`: `bootstrap-packetized-openspec-apply:validated`, `compress-recipe-authoring-surface:in-progress`
- `gateStatus`: `external-bootstrap-proof-passed`; active packet execution used Tend/OpenCode with explicit active gates and local framework store health.
- `claimStatus`: `candidate`
- `packetLoopState`: `complete`
- `storeHealth`: `local-postgres-observed`
- `observationIds`:
  - `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.sidecar.discovered:preview:2026-07-02T03:20:48.061Z`
  - `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T03:20:48.061Z`
  - `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.sidecar.discovered:preview:2026-07-02T03:20:50.916Z`
  - `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T03:20:50.916Z`
  - `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:178c01e0bcf60f59:2026-07-02T03:17:01.490Z`
  - `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:1f69963e98781a53:2026-07-02T03:19:30.962Z`
  - `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:04d0fbf86a0f221d:2026-07-02T03:20:17.132Z`
  - `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T03:22:40.253Z`

### Slice summary

The FoldKit/Joern generated-runtime slice used packets as the migration interface rather than as standalone quickfixes. The run first applied `recipe-authoring/generated-runtime-projection-readiness` to make agentic readiness/provenance intent explicit in source, then immediately applied `recipe-authoring/generated-runtime-projection` to materialize the `.framework/generated/packetized-recipe-authoring` runtime projection for the same selected sources.

The first active readiness attempt blocked with `0/28` clears because the harness only supported single-source source-scoped readiness. The packet was then optimized by adding the batch readiness fastpath to the Tend/OpenCode packet harness, not by editing migration source manually. The replayed readiness batch cleared `28/28` selected targets. The paired projection batch then cleared `28/28` selected targets and materialized generated runtime projections for the same 20-source set.

### Metrics

- `readiness.packetFamily`: `recipe-authoring/generated-runtime-projection-readiness`
- `readiness.selectedTotal`: 28
- `readiness.selectedRemaining`: 0
- `readiness.cleared`: 28
- `readiness.tokensPerClear`: 3220.464285714286
- `readiness.tokenImprovementVsRaw`: 38.530955681486326
- `readiness.commandImprovementVsRaw`: 58.8
- `projection.packetFamily`: `recipe-authoring/generated-runtime-projection`
- `projection.selectedTotal`: 28
- `projection.selectedRemaining`: 0
- `projection.cleared`: 28
- `projection.tokensPerClear`: 3220.464285714286
- `projection.tokenImprovementVsRaw`: 38.530955681486326
- `projection.commandImprovementVsRaw`: 58.8
- `linkedImplementationObservation`: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6740e76b5a1756d6:2026-07-02T02:35:39.321Z`
- `linkedImplementationTokens`: 90173
- `linkedImplementationInputTokens`: 13287
- `linkedImplementationOutputTokens`: 1513
- `linkedImplementationCachedTokens`: 88576
- `linkedImplementationReasoningTokens`: 531
- `linkedImplementationToolCalls`: 39
- `linkedImplementationDurationMs`: 370574
- `baselineRawTokensPerClear`: 124087.56666666667
- `baselineRawCommandsPerClear`: 2.1

### Validation

The validation ladder was run through `tend-opencode observe` and emitted to the local framework store. It passed:

- `tend-opencode:typecheck`
- `tend-opencode:test` with 83 tests
- `attune-foldkit:typecheck`
- `joern-effect:typecheck`
- `openspec validate compress-recipe-authoring-surface --strict`
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`

Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T03:22:40.253Z`.

### Anti-gaming notes

This checkpoint does not treat readiness markers alone as the migration result. Readiness is counted as a prerequisite interface packet and is paired with generated runtime projection for the same selected source set. The scored migration evidence is therefore the composed packet path: readiness intent plus generated runtime projection plus selected-target clear plus validation.

The manual recipe-id family remains unsafe for active execution. Preview selected 43 targets but over-selected semantic recipe references, dependencies, invocation payloads, schemas, repair metadata, and handler-binding-like shapes. That family needs selector/lowering proof before it can be optimized as a migration packet.

### Next action

Continue optimizing packets over additional dense migration slices until the framework and packets consistently land in the 10x-20x band with 20x as the target. The current generated-runtime and sourcePath families have candidate evidence above 20x on multiple dense slices, but this remains `candidate` rather than `audit-promoted` until the harness promotes the accounting and the user accepts handoff for the larger autonomous OpenCode run.

## Analysis checkpoint: packet-interface optimization and token-joined 50-source projection slice

- `schemaVersion`: 1
- `changeId`: `coordinate-packetized-recipe-migration-goal`
- `phase`: `phase-b-packet-optimization`
- `childChangeStatuses`: `bootstrap-packetized-openspec-apply:validated`, `compress-recipe-authoring-surface:in-progress`
- `gateStatus`: `external-bootstrap-proof-passed`; active packet execution used Tend/OpenCode with explicit active gates and local framework store health.
- `claimStatus`: `candidate`
- `packetLoopState`: `complete`
- `storeHealth`: `local-postgres-observed`

### Interface optimization found by the packet run

A harness-selected 40-source generated-runtime slice exposed a packet-interface geometry limit rather than a migration-source problem. `recipe-authoring/generated-runtime-projection-readiness` cleared `45/45`, but the paired `recipe-authoring/generated-runtime-projection` run initially blocked because the projection batch interface was capped at 20 explicit sources.

The fix was made in the Tend/OpenCode packet harness, not by manually editing migration source. The projection batch cap was increased to 50, and the same selected queue was replayed. The replay cleared `45/45` projection targets and materialized 40 generated runtime projections.

This 40-source run is migration-progress evidence and packet-interface optimization evidence, but it is not claim-bearing token-efficiency evidence because the active packet commands were wrapped inside a shell script and the observer could not finalize them as first-class packet runs.

### Finalizer/accounting correction

The next direct observed packet-loop exposed a benchmark-accounting issue: direct source-scoped packet loops were scored, but the selected-target delta finalizer compared against stale/global DB observations and over-derived clears for a bounded source set. The finalizer now uses the observed packet fastpath clear count for source-scoped runs and parses pretty-printed packet-loop JSON stdout before falling back to DB delta projection.

This preserves the rule that packet clears must come from the Tend/OpenCode harness and framework store path, while preventing stale global observations from inflating bounded-slice clears.

### Token-joined 50-source slice

The next harness-selected source queue contained 366 remaining readiness targets globally. A 50-source source-scoped slice was selected by the packet target classifications, spanning Joern property/fuzz and Canopy home-deployment source files.

- `readiness.packetFamily`: `recipe-authoring/generated-runtime-projection-readiness`
- `readiness.selectedTotal`: 76
- `readiness.selectedRemaining`: 0
- `readiness.cleared`: 76
- `readiness.changedFileCount`: 50
- `readiness.finalizerStatus`: `scored-control-only`
- `readiness.finalizerObservation`: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:dac35bccec317f62:2026-07-02T03:30:46.933Z`

The paired projection run was observed directly and explicitly joined to the token-bearing OpenCode implementation observation.

- `projection.packetFamily`: `recipe-authoring/generated-runtime-projection`
- `projection.selectedTotal`: 76
- `projection.selectedRemaining`: 0
- `projection.cleared`: 76
- `projection.changedFileCount`: 50
- `projection.finalizerStatus`: `scored`
- `projection.tokenEfficiencyStatus`: `meets-20x`
- `projection.measuredTokens`: 90173
- `projection.measuredClears`: 76
- `projection.tokensPerClear`: 1186.4868421052631
- `projection.tokenImprovementVsRaw`: 104.58402256403433
- `projection.commandImprovementVsRaw`: 159.60000000000002
- `projection.tokenMetricSource`: `opencode-json-events`
- `projection.commandObservationId`: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6740e76b5a1756d6:2026-07-02T02:35:39.321Z`
- `projection.finalizerObservation`: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:86cecb20cb18e2dc:2026-07-02T03:33:47.020Z`

Post-run selected-target checks for the same 50-source slice reported `0` remaining readiness targets and `0` remaining projection targets.

- `postReadinessObservation`: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T03:34:15.701Z`
- `postProjectionObservation`: `recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T03:34:18.338Z`

### Validation

The validation ladder was run through `tend-opencode observe` and emitted to the local framework store. It passed:

- `tend-opencode:typecheck`
- `tend-opencode:test` with 83 tests
- `joern-effect-properties:typecheck`
- `home-deployment:typecheck`
- `openspec validate compress-recipe-authoring-surface --strict`
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`

Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T03:34:36.720Z`.

### Anti-gaming notes

The 50-source projection run is stronger than the previous shell-wrapped 40-source run because the active packet-loop was observed directly and explicitly joined to a real token-bearing OpenCode implementation observation. This avoids zero-token fastpath scoring and keeps the 20x evidence tied to actual OpenCode telemetry.

The run is still `candidate`, not `audit-promoted`. It reuses the same token-bearing implementation observation that produced the current packet/harness improvements, so it demonstrates improved amortization over a larger selected target set, not an independent holdout audit. Promotion still requires the harness to freeze the packet variant and run the larger autonomous OpenCode path with clean predeclared accounting.

### Next action

Continue optimizing over packet interfaces and dense migration slices until the generated-runtime/sourcePath families consistently stay in the 10x-20x band, with 20x as the target. Use direct observed packet-loop commands with explicit `--implementation-observation-id` for every claim-bearing run. Do not count shell-wrapped active packet runs as token-efficiency evidence.

## Analysis checkpoint: sourcePath false-positive replay and oracle hardening

- `schemaVersion`: 1
- `changeId`: `coordinate-packetized-recipe-migration-goal`
- `phase`: `phase-b-packet-optimization`
- `childChangeStatuses`: `bootstrap-packetized-openspec-apply:validated`, `compress-recipe-authoring-surface:in-progress`
- `gateStatus`: `external-bootstrap-proof-passed`; active packet execution used Tend/OpenCode with explicit active gates and local framework store health.
- `claimStatus`: `insufficient-evidence`
- `packetLoopState`: `failed-validation-then-repaired`
- `storeHealth`: `local-postgres-observed`

### Slice

Packet family: `recipe-authoring/manual-source-path-inferable`

Source: `packages/attune/foldkit/src/activity.ts`

This slice replayed the sourcePath family after earlier selector corrections. It is recorded as a packet-optimizer failure/repair cycle, not as clean migration evidence.

### Pre-run target status

- Packet status observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ccc28645b4e7f169:2026-07-02T09:38:31.738Z`
- SourcePath preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:22639c090257c321:2026-07-02T09:38:55.269Z`
- Preview selectedTotal: 4
- Preview activeModeEligible: true
- Preview selectedRemaining: 4

### Tend/OpenCode active replay

- Implementor: Tend/OpenCode packet-loop, not raw Codex source editing.
- Implementation title: `source-path-foldkit-activity-packet-interface-active`
- Observed command: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:a046b6a5e9b5475f:2026-07-02T09:40:57.422Z`
- Reported selectedTotal: 4
- Reported selectedRemaining: 0
- Reported cleared: 4
- Reported changedFileCount: 1
- OpenCode token telemetry: total 14,706; input 9,121; output 624; cached 8,704; reasoning 52; effective 6,002; toolCalls 1; durationMs 44,671; tokenMetricSource `opencode-json-events`

### Scorer output before validation rejection

- Score observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:7d8b6d5ddd731754:2026-07-02T09:44:45.650Z`
- Derived clears: 4
- Measured tokens: 14,706
- Tokens per clear: 3,676.5
- Token improvement vs raw reference: 33.7515x
- Evidence class emitted before validation: `candidate`

### Validation failure and contamination finding

The scored candidate is rejected for claim-bearing evidence because the affected package validation failed.

- Failed validation: `attune-foldkit:typecheck`
- Failed validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:b117332235772e12:2026-07-02T09:45:07.830Z`
- Failure cause: current FoldKit runtime authoring still requires `sourcePath` in `compileFoldkitMdx(...)` function parameters and in `foldKitSourceReport({ sourcePath })`.
- Classification: contaminated packet variant, not migration progress and not 20x evidence.

### Tend/OpenCode repair

Tend/OpenCode performed the repair and validation, not raw Codex migration editing.

- Repair observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:baf6260467bdd96a:2026-07-02T09:45:38.035Z`
- Repair action: restored `sourcePath: string` for `compileFoldkitMdx` and restored `sourcePath: FoldKitActivitySourcePath` in `foldKitSourceReport({ ... })`.
- Repair telemetry: total tokens 17,930; input 9,358; output 231; cached 17,408; reasoning 23; effective 522; toolCalls 13.
- Post-repair validation: `attune-foldkit:typecheck` passed.
- Post-repair validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:b117332235772e12:2026-07-02T09:46:56.235Z`

### Oracle and harness correction

The packet was optimized from the failure instead of hiding the failure.

- `sourcePath` selector now blocks `sourcePath:` in function parameter lists.
- `sourcePath` selector now blocks `sourcePath:` inside source-report builder calls such as `foldKitSourceReport(...)`.
- Added Tend/OpenCode regression coverage proving the oracle refuses function parameters and source-report builders while allowing safe recipe declaration fields.
- `tend-opencode:typecheck` passed: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T09:50:52.022Z`
- `tend-opencode:test` passed with 84 tests: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-02T09:50:56.747Z`

### Corrected post-fix preview

- Manual-source-path preview after oracle fix: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:3eb3c06f593b7fc0:2026-07-02T09:51:54.547Z`
- Manual-source-path targetEstimate after fix: 0
- Source-path eligibility oracle preview: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:36cc7632e913e0ca:2026-07-02T09:51:54.605Z`
- Oracle result: 4 selected `sourcePath` occurrences, all classified `blocked`.

### Interpretation

This checkpoint improves packet truthfulness. The apparent 33.75x score is rejected because validation failed. The useful result is a stronger sourcePath oracle that refuses current-runtime-required fields before active deletion. Future sourcePath packet evidence must include validation success after active replay and a post-run preview showing zero remaining selected targets without selecting required runtime fields.

### Next action

Run the next source-scoped packet slice from current DB-backed packet status. Prefer generated-runtime projection or sourcePath batches only when the oracle reports stable eligible targets and affected package validation is included in the observed validation ladder. Continue optimizing packets until repeated measured slices consistently land in the 10x-20x band with 20x as the target, then hand off to the user for the larger Tend/OpenCode run.

## Analysis checkpoint: FoldKit sourcePath batch rejected and oracle repaired

- `schemaVersion`: 1
- `changeId`: `coordinate-packetized-recipe-migration-goal`
- `phase`: `phase-b-packet-optimization`
- `childChangeStatuses`: `bootstrap-packetized-openspec-apply:validated`, `compress-recipe-authoring-surface:in-progress`
- `gateStatus`: active packet execution used Tend/OpenCode with explicit active gates and local framework store health.
- `claimStatus`: `insufficient-evidence`
- `packetLoopState`: `failed-validation-then-repaired`
- `storeHealth`: `local-postgres-observed`

### Slice

Packet family: `recipe-authoring/manual-source-path-inferable`

Source batch:

- `packages/attune/foldkit/src/asset-recipes.ts`
- `packages/attune/foldkit/src/config-recipes.ts`
- `packages/attune/foldkit/src/entry.ts`
- `packages/attune/foldkit/src/fixture-commands.ts`
- `packages/attune/foldkit/src/fixture-route.ts`
- `packages/attune/foldkit/src/fixture-types.ts`
- `packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts`
- `packages/attune/foldkit/src/fixtures/app-site-fixture.ts`
- `packages/attune/foldkit/src/fixtures/mdx-view-fixture.ts`
- `packages/attune/foldkit/src/fixtures/workbench-atom-fixture.ts`
- `packages/attune/foldkit/src/index.ts`
- `packages/attune/foldkit/src/main.ts`
- `packages/attune/foldkit/src/message.ts`
- `packages/attune/foldkit/src/model.ts`
- `packages/attune/foldkit/src/schema.ts`

### Contaminated active replay

- Preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:26b236b0ccbaec33:2026-07-02T09:54:26.851Z`
- Preview selected targets: 33
- Active observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:761445dab672bb92:2026-07-02T09:54:46.561Z`
- Active packetFastpath result: applied true, targetCountBefore 33, targetCountAfter 0, cleared 33, changedFileCount 15.
- Linked token observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6740e76b5a1756d6:2026-07-02T02:35:39.321Z`
- Linked tokens: 90,173 total, 13,287 input, 1,513 output, 88,576 cached, 531 reasoning, 39 tool calls.

This run is rejected for claim-bearing evidence for two independent reasons:

- Validation failed after the active replay.
- The pre-fix scorer over-derived 4,029 clears from stale family-wide DB history even though the bounded fastpath reported 33 clears.

### Validation failure

- Failed validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T09:58:24.630Z`
- Failed command: `attune-foldkit:typecheck` after post-preview.
- Failure cause: FoldKit fixture/page/document surfaces still require `sourcePath` in current TypeScript types, including app MDX fixtures, site fixtures, MDX view fixtures, and `FoldkitDocument`.

### Scorer invariant repair

Codex repaired the Tend/OpenCode scoring invariant, not the migration source:

- `packages/tend/opencode/src/contracts.ts` now carries the observed active fastpath into score-only finalization through `scoringPacketFastpath`.
- Source-scoped and source-batched benchmark analysis now uses bounded fastpath `targetCountBefore`, `targetCountAfter`, and `cleared` instead of stale family-wide DB deltas.
- Focused validation passed: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T09:57:57.431Z`
- Focused validation covered `tend-opencode:typecheck` and packet finalizer tests.

### Tend/OpenCode repair

The migration source repair was performed through Tend/OpenCode:

- Broad repair attempt observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:39d3e18d58bbe23c:2026-07-02T09:58:41.545Z`
- Broad repair status: timed out after 181,482 ms with useful telemetry and partial selector hardening.
- Broad repair telemetry: 31,456 total tokens, 20,130 input, 907 output, 29,696 cached, 443 reasoning, 15 tool calls.
- Narrow restore observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:8b6fffc902175a2d:2026-07-02T10:02:32.272Z`
- Narrow restore status: succeeded.
- Narrow restore action: restored `sourcePath: S.String` on `FoldkitDocument` in `packages/attune/foldkit/src/schema.ts`.
- Narrow restore validation: `attune-foldkit:typecheck` passed inside the observed Tend/OpenCode run.
- Narrow restore telemetry: 20,858 total tokens, 10,295 input, 253 output, 19,968 cached, 146 reasoning, 16 tool calls.

### Oracle hardening

The sourcePath oracle now blocks:

- function parameters named `sourcePath`
- source-report builder payloads
- runtime handler/layer binding fields that still require `sourcePath`
- typed FoldKit fixture/page/site surfaces with `satisfies ...Fixture`
- schema fields such as `sourcePath: S.String`

Focused Tend/OpenCode validation passed after the hardening:

- Observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:06:15.695Z`
- Validation: `tend-opencode:typecheck` and focused `sourcePath|source-scoped fastpath|packet finalizer` tests passed.

### Corrected post-repair preview

- Corrected preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f9170c5acf9e798b:2026-07-02T10:06:41.274Z`
- Corrected preview selectedTotal: 0
- Corrected preview selectedRemaining: 0
- Corrected preview packetRunAnalysis derivedCleared: 0
- Finalizer status: zero-clears, not scoreable.

### Interpretation

The FoldKit sourcePath batch is packet-optimizer evidence, not migration-win evidence. It found a false-positive class, forced scorer hardening, forced type/schema oracle hardening, and restored the workspace through Tend/OpenCode. It must not contribute to the 20x evidence set.

The positive outcome is that the packet interface became stricter:

- Bounded fastpath clears now prevent stale global DB delta inflation.
- FoldKit fixture/page/schema sourcePath fields are no longer selected as inferable authoring boilerplate.
- Future sourcePath evidence must use the corrected oracle and must pass affected package validation before it can become candidate evidence.

### Next action

Resume packet optimization from current DB-backed packet status. Prefer sourcePath or identity families only where the corrected oracle reports stable eligible targets and validation can run in the same observed ladder. Do not scale the full autonomous OpenCode migration yet.

## Checkpoint: Joern sourcePath slice rejected, repaired, and converted into oracle hardening

A Joern `recipe-authoring/manual-source-path-inferable` active batch was run through Tend/OpenCode active packet mode after the FoldKit false-positive repair.
The batch selected 26 source-scoped targets across `packages/attune/joern-effect/src/**` and the fastpath reported `targetCountBefore: 26`, `targetCountAfter: 0`, and `cleared: 26`.
The packet scorer correctly used the bounded fastpath counts rather than the stale global DB delta, producing a tentative 35.78x token-improvement calculation from the linked implementation observation.

This run is rejected as migration evidence. The post-run validation observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:10:10.380Z` failed `joern-effect:typecheck` because `packages/attune/joern-effect/src/edge/runtime/errors.ts` still required a `sourcePath` field in a typed output shape.
That failure means the sourcePath packet oracle was still over-selecting required runtime metadata, so the apparent 26 clears and 35.78x score remain contaminated and must not be used as candidate or audit-promoted 20x evidence.

Tend/OpenCode then ran a narrow observed repair under `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:198b5b7e8684499b:2026-07-02T10:15:46.174Z`.
The repair restored the required Joern `sourcePath`, hardened the sourcePath eligibility oracle for projection output shapes whose required schema/type still includes `sourcePath`, and added a focused regression test.
The repair validated:

- `pnpm exec nx run joern-effect:typecheck --output-style=static`
- `pnpm exec nx run tend-opencode:typecheck --output-style=static`
- `pnpm exec vitest run test/opencode.test.ts -t sourcePath`

A follow-up Tend/OpenCode preview of the same Joern source set emitted `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:a4fdd73b9ba48d51:2026-07-02T10:21:56.083Z` and reported `selectedTotal: 0`, `selectedRemaining: 0`, `targetCountBefore: 0`, and `cleared: 0` for the repaired source set.
Strict OpenSpec validation then passed for all three changes under `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:22:02.773Z`.

Claim status: `insufficient-evidence`.
Optimization status: useful oracle hardening, not 20x evidence.
Next action: stop treating broad `sourcePath` removal as a mature packet family until previews prove selected targets are optional/generated-authoring metadata rather than required runtime output, schema, fixture, binding, or report-builder fields.

## Checkpoint: directory source-scope packet optimization and joern-effect-properties sourcePath slice

The packet harness was optimized so `--source <directory>` works as a normalized directory/prefix scope instead of exact-file-only filtering.
The initial preview `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ae50953246fcbc3b:2026-07-02T10:23:11.862Z` returned zero targets for `packages/attune/joern-effect-properties/src`, despite global status showing many nested targets.
Tend/OpenCode then implemented and validated directory source-scope support through observed harness work:

- Partial run `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ad7ce8cd0579cf19:2026-07-02T10:23:28.920Z` added the implementation but timed out with two stale test expectations.
- Completion run `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:bcff3f56ffc988e3:2026-07-02T10:30:34.938Z` corrected the tests after confirming handler `sourcePath` fields are intentionally blocked by the oracle.
- Focused validation passed: `tend-opencode:typecheck` and the sourcePath/source-scoped Tend/OpenCode test filter with 19 passing tests.

With directory scoping enabled, preview `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:a0c67e4958bb6743:2026-07-02T10:34:36.736Z` selected 49 `recipe-authoring/manual-source-path-inferable` targets under `packages/attune/joern-effect-properties/src` with source summaries across 44 files.
Tend/OpenCode active packet run `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:a0a448b81d81872f:2026-07-02T10:34:59.654Z` applied the directory-scoped fastpath, and immediate post-preview `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:44be55874ade875b:2026-07-02T10:35:05.929Z` showed zero remaining for that directory.

The run is not valid 20x evidence. Validation observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:35:11.998Z` failed `joern-effect-properties:typecheck` because `packages/attune/joern-effect-properties/src/fuzz/services/expectations.ts` still required `sourcePath` on `FuzzExpectation` objects.
Tend/OpenCode repair observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:22eaea7b1fc0feb7:2026-07-02T10:35:38.175Z` restored `sourcePath: file.path`, added a required-`FuzzExpectation` oracle guard, and validated:

- `pnpm exec nx run joern-effect-properties:typecheck --output-style=static`
- `pnpm exec nx run tend-opencode:typecheck --output-style=static`
- `pnpm exec vitest run test/opencode.test.ts -t "sourcePath|source-scoped|source scope"`

Final closure preview `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:fd86dda2ef5aeae2:2026-07-02T10:40:29.096Z` reported `selectedTotal: 0` and `selectedRemaining: 0` for the same directory under the repaired oracle.
Final validation observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:40:36.179Z` passed `joern-effect-properties:typecheck` and strict validation for all three OpenSpec changes.

Claim status: `insufficient-evidence`.
Migration progress: directory-scoped sourcePath cleanup completed for `joern-effect-properties/src` after restoring one required field and blocking that target class.
Optimization status: packet harness improved with reusable directory source scopes; sourcePath oracle improved for required `FuzzExpectation` metadata.
Next action: continue sourcePath only through directory-scoped previews plus immediate package validation; do not promote the 49-clear run because its original selected set contained a required typed metadata field.

## Checkpoint: target-aware directory preflight and validated pi-agent sourcePath slice

A directory-scoped preview for `packages/attune/pi-agent/src` selected 21 `recipe-authoring/manual-source-path-inferable` targets under observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:c2102f0db8f90476:2026-07-02T10:41:26.289Z`.
The first active run `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9f82b24607bf32d5:2026-07-02T10:41:47.213Z` blocked before editing because directory expansion included zero-target sibling files and the sourcePath fastpath preflight demanded eligibility proof for `packages/attune/pi-agent/src/artifacts/index.ts`, which had no selected targets.

Tend/OpenCode optimized the packet harness under `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:3c31589ad9de4b95:2026-07-02T10:42:18.889Z`.
The fix keeps directory `sourceSummaries` complete for reporting while proof-gating and editing only expanded files with `selectedTotal > 0`; exact zero-target file scopes remain explicit no-ops.
Focused validation passed for `tend-opencode:typecheck` and sourcePath/source-scope fastpath tests.

The corrected active run `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:32a76ee56e0ea916:2026-07-02T10:47:25.232Z` completed with `selectedTotal: 21`, `selectedRemaining: 0`, and `cleared: 21`.
Post-preview `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:b9f1e116d9b3d12d:2026-07-02T10:47:32.461Z` showed zero remaining for the same directory.
Validation observation `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:47:38.913Z` passed `attune-pi-agent:typecheck` plus strict validation for `compress-recipe-authoring-surface` and `coordinate-packetized-recipe-migration-goal`.

Claim status: `insufficient-evidence`.
Migration progress: validated 21-target sourcePath cleanup for `packages/attune/pi-agent/src`.
Optimization status: packet harness now supports directory source scopes and target-aware active preflight.
20x status: not claimable; the run is below the 30-clear reference and packet-loop control telemetry still lacks joined token-bearing implementation telemetry.
Next action: find a denser directory slice that can clear and validate without oracle repair, or improve token telemetry joining so active fastpath runs have non-zero measured command/token accounting.

## 2026-07-02 10:57Z - Tend/OpenCode sourcePath slice rejected, oracle hardened, and closed

### Phase

`compress-recipe-authoring-surface` packet optimization over the `recipe-authoring/manual-source-path-inferable` family.

### Slice

`packages/tend/opencode/src` was run through the Tend/OpenCode packetized apply harness with active mode enabled and local Postgres observation storage.

### DB-backed run evidence

- Active command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:a45120bc53ea20ab:2026-07-02T10:49:14.154Z`
- Active packet loop state: `complete`
- Active selected targets: `26`
- Active cleared targets reported by packet fastpath: `26`
- Active store path: `framework_event.recipe_observation`
- Active SQL pipeline: `openspec-packet-selected-target-delta-inputs`, statement hash `25a3ccb26d1f925e133869313c63d81e096aae0fae2ec27bdf9657ff1db4d516`
- Active token telemetry source: `packet-fastpath`
- Active token efficiency status: `control-only`
- Active token claim status: `insufficient-evidence`

### Validation outcome

The first validation after the active run failed `tend-opencode:typecheck`:

- `packages/tend/opencode/src/benchmark.ts` removed a `sourcePath` field required by `exactTargetId(...)` argument typing.
- `packages/tend/opencode/src/contracts.ts` removed a `sourcePath` field required by `TendOpenCodeContractCatalogSchema` output typing.

Therefore the active packet clear is rejected as 20x evidence. It remains useful packet-optimization evidence because it exposed two missing oracle boundaries.

### Harness repair

The repair was executed through observed Tend/OpenCode commands and emitted to the framework store:

- No-op/failed initial repair observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:cc4a72da472e7aa7:2026-07-02T10:51:52.465Z`
- Partial repair attempt observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:52:29.987Z`
- Completed idempotent repair observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:53:53.573Z`
- Type-narrowness fix observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:54:57.118Z`

The sourcePath oracle now blocks:

- required literal-schema projection outputs such as `TendOpenCodeContractCatalogSchema`;
- required sourcePath object arguments passed to identity helpers such as `exactTargetId(...)`.

### Validation after repair

Observed validation passed:

- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:56:24.876Z`
- `tend-opencode:typecheck`: passed
- Focused `packages/tend/opencode` sourcePath tests: 20 passed, 73 skipped
- `openspec validate compress-recipe-authoring-surface --strict`: passed
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`: passed

A too-broad root-level vitest invocation also ran and failed because it swept `.attune/state/benchmarks/**` worktrees with unresolved package aliases. That command is not evidence of live harness failure; the corrected package-root invocation above passed.

### Closure check

Post-repair preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0a482e19f0858f30:2026-07-02T10:57:00.467Z`

- Source scope: `packages/tend/opencode/src`
- Selected total: `0`
- Selected remaining: `0`
- Store health: `healthy`
- DB-backed target status: `true`

### Claim status

`insufficient-evidence`.

This slice must not be promoted to a 20x claim. The active clear failed validation before repair, and the subsequent valid state is a repaired/oracle-hardened state rather than a clean predeclared packet-arm run. The correct optimizer action is to treat this as packet-interface learning and avoid further blind sourcePath slicing until the prerequisite oracle/projection packet is stronger.

### Next action

Return to packet optimization rather than packet selection. Use Tend/OpenCode packet status and DB observations to choose whether the next useful step is `recipe-authoring/source-path-eligibility-oracle`, `recipe-authoring/generated-runtime-projection`, or another family with token-bearing implementation telemetry.

## 2026-07-02 11:01Z - SourcePath deletion packet proof-gated after rejected slices

### Phase

Packet optimization for `recipe-authoring/manual-source-path-inferable` and its prerequisite `recipe-authoring/source-path-eligibility-oracle`.

### Trigger

Repeated active sourcePath slices cleared targets quickly but exposed false positives during validation. The Tend/OpenCode source slice failed because some `sourcePath` fields were still part of required runtime output or identity-helper contracts. Continuing to select more sourcePath deletion packets without changing geometry would be gaming.

### Change

The manual sourcePath deletion selector now requires source-level proof before advertising deletion targets:

- explicit `@attune-packet-fastpath manual-source-path-inferable`; or
- `.framework` generated runtime projection proof for the source.

Unproven sourcePath fields remain in the `source-path-eligibility-oracle` family instead of being presented as deletion targets.

### Observed repair and validation

- Selector optimization observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T10:58:47.385Z`
- Fixture proof-marker repair observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:00:10.716Z`
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:00:50.466Z`

Validation passed:

- `tend-opencode:typecheck`
- focused Tend/OpenCode sourcePath tests: 20 passed, 73 skipped
- `openspec validate compress-recipe-authoring-surface --strict`
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`

### DB-backed geometry delta

Packet status before this optimization:

- Observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ccc28645b4e7f169:2026-07-02T10:57:32.791Z`
- `manual-source-path-inferable`: 242 selected
- Total selected: 2771

Packet status after this optimization:

- Observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:ccc28645b4e7f169:2026-07-02T11:01:22.385Z`
- `manual-source-path-inferable`: 215 selected
- Total selected: 2744

This is not migration progress and not 20x evidence. It is packet optimization: 27 unproven deletion targets moved out of the deletion packet and into prerequisite oracle/projection work.

### Claim status

`insufficient-evidence`.

The optimizer is improving packet truthfulness and selected-target quality, not claiming a win. Token telemetry remains non-claim-bearing for deterministic packet-control runs unless joined to token-bearing implementation observations.

### Next action

Focus on the next bottleneck that changes packet quality or enables safe high-density migration: source-path eligibility/projection, a packet-owned fastpath for another deterministic family, or token-bearing Tend/OpenCode implementation telemetry. Do not run broad active deletion over sourcePath until the selected targets are validated as proof-backed and the validation ladder is predeclared.

## 2026-07-02 11:02Z - External Tend/OpenCode proof gate refreshed

### Phase

Bootstrap proof refresh before further active packet migration.

### Commands

The required external proof commands were run through Tend/OpenCode observation:

```bash
nix run .#tend-opencode -- fingerprint --format json
nix run .#tend-opencode -- run-harness-test --format json
```

### DB observations

- Fingerprint observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:7a8673626045caeb:2026-07-02T11:01:58.930Z`
- Harness self-test observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:8325a2fc40f86ea0:2026-07-02T11:02:00.933Z`

### Proof status

Passed:

- flake-provided upstream OpenCode runtime: `opencode 1.17.11`
- runtime kind: `upstream-opencode`
- `/attune-fingerprint` installed
- OpenSpec command and skill configuration available
- plugin suite loaded:
  - `@attune/tend-opencode`
  - `@attune/magic-context-opencode`
  - `@attune/openrtk-opencode`
  - `@attune/tend-token-audit-opencode`
  - `@attune/tend-long-job-opencode`
  - `@attune/trellis-ls-opencode`
- upstream OpenCode plugin visibility proven
- plugin hooks exercised
- packet sidecar installed
- packet sidecar self-test passed
- store observations emitted to local Postgres via Tend/OpenCode command observations

### Gate result

The Phase B harness gate is available for active packet execution, subject to per-packet safety, explicit active mode, framework store health, validation ladder, and clean evidence classification.

### Claim status

`insufficient-evidence`.

This proof authorizes using the packetized harness; it does not itself claim 20x. The next active migration slice must still be predeclared, DB-backed, validation-clean, and joined to token-bearing implementation telemetry before it can become 20x candidate evidence.

## 2026-07-02 checkpoint: sourcePath slice on platform-alchemy-k8s rejected as claim evidence

Phase: Phase B packet-harness optimization slice
Child change statuses:
- `bootstrap-packetized-openspec-apply`: external Tend/OpenCode fingerprint and harness proof refreshed and passing.
- `compress-recipe-authoring-surface`: active packet migration may proceed only through the Tend/OpenCode packetized apply path.
- `coordinate-packetized-recipe-migration-goal`: continues to govern claim status and reject failed-validation clears.

Run summary:
- Packet family: `recipe-authoring/manual-source-path-inferable`
- Source scope: `packages/canopy/platform-alchemy-k8s/src`
- Active packet-loop observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:d3bb0d7fb6e3e03b:2026-07-02T11:03:09.563Z`
- Post-run preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e39db137644008a1:2026-07-02T11:03:16.120Z`
- Selected total: 35
- Selected remaining after active packet loop: 0
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:03:22.438Z`
- Validation result: failed

Failure learned:
- The packet selected a `sourcePath` field required by a runtime projection return schema in `packages/canopy/platform-alchemy-k8s/src/resources/common.ts`.
- The oracle had recognized `${ReturnType}Schema` naming but not same-name schema constants such as `K8sResourceModuleReport`.
- This was a real false positive, so the 35 clears are rejected as 20x evidence even though the post-run selector reported zero remaining targets.

Repair and hardening:
- Repair observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:19c01d4857a17ed8:2026-07-02T11:04:50.747Z`
- The required `sourcePath` field was restored in the platform projection output.
- The Tend/OpenCode sourcePath oracle was hardened to treat both `ReturnType` and `${ReturnType}Schema` schema constants as required runtime output contracts.
- A regression test now covers this same-name schema shape.

Post-repair validation:
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:05:34.575Z`
- `platform-alchemy-k8s:typecheck`: passed
- `tend-opencode:typecheck`: passed
- focused Tend/OpenCode sourcePath packet tests: passed
- `openspec validate compress-recipe-authoring-surface --strict`: passed
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`: passed
- Post-repair preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e50d14fbc1e9bc91:2026-07-02T11:06:17.233Z`
- Post-repair selected remaining in this source scope: 0

Claim status: insufficient-evidence

Why this is not promoted:
- The packet run required a post-run repair to restore a required runtime contract.
- Token telemetry for the deterministic fastpath remains control-only and is not a reasoning-bearing token efficiency measurement.
- The run is useful packet optimization evidence, not clean migration-performance evidence.

Next action:
- Continue optimizing packet oracles and selectors over DB-observed slices.
- Do not count failed-validation clears toward the 20x claim.
- Prefer the next source scope with enough density to test the hardened sourcePath oracle while keeping validation narrow and observed through Tend/OpenCode.

## 2026-07-02 checkpoint: clean home-deployment sourcePath active slice

Phase: Phase B packet-harness optimization slice
Child change statuses:
- `bootstrap-packetized-openspec-apply`: external Tend/OpenCode proof gate is passing.
- `compress-recipe-authoring-surface`: continuing only through Tend/OpenCode packetized apply.
- `coordinate-packetized-recipe-migration-goal`: records migration progress separately from claim evidence.

Run summary:
- Packet family: `recipe-authoring/manual-source-path-inferable`
- Packet variant: `v3-eligibility-gated-object-field-source-path`
- Source scope: `packages/canopy/home-deployment/src`
- Implementation title: `2026-07-02 home-deployment sourcePath v3 active slice`
- Preview observation before active run: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5ede537c136928cc:2026-07-02T11:07:49.885Z`
- Active packet-loop observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:c56a55989aa3a1f2:2026-07-02T11:08:07.483Z`
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:08:19.207Z`
- Post-validation preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:43e0862039d8b439:2026-07-02T11:08:29.673Z`

DB-backed target status:
- Store: `framework_event.recipe_observation`
- Baseline selected remaining: 11
- Current selected remaining: 0
- Derived clears: 11
- Stale: 0
- Flicker: 0
- Refused: 0
- Failed validation: 0

Validation:
- `home-deployment:typecheck`: passed
- `openspec validate compress-recipe-authoring-surface --strict`: passed
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`: passed

Telemetry and claim classification:
- Command observation was DB-emitted through Tend/OpenCode observe.
- Packet finalizer status: scored
- Token metric source: `packet-fastpath`
- Token efficiency status: `control-only`
- Measured tokens: 0
- Measured clears: 11
- Command improvement vs raw reference: 23.1x
- Claim status: insufficient-evidence

Interpretation:
- This is clean migration progress and packet-family candidate evidence for the sourcePath packet.
- It is not audit-promoted 20x evidence because token telemetry is deterministic-harness control telemetry, not provider/model token telemetry.
- The useful signal is that the hardened oracle produced a validation-clean slice after two rejected sourcePath learning slices.

Next action:
- Continue with another bounded Tend/OpenCode sourcePath slice to test consistency.
- Keep claim status below audit-promoted until token-bearing implementation telemetry or a clean paired accounting path is attached.

## 2026-07-02 checkpoint: clean joern-effect pure sourcePath active slice

Phase: Phase B packet-harness optimization slice
Child change statuses:
- `bootstrap-packetized-openspec-apply`: external Tend/OpenCode proof gate is passing.
- `compress-recipe-authoring-surface`: continuing only through Tend/OpenCode packetized apply.
- `coordinate-packetized-recipe-migration-goal`: records consistency evidence separately from audit-promoted claims.

Run summary:
- Packet family: `recipe-authoring/manual-source-path-inferable`
- Packet variant: `v3-eligibility-gated-object-field-source-path`
- Source scope: `packages/attune/joern-effect/src/pure`
- Implementation title: `2026-07-02 joern-effect pure sourcePath v3 active slice`
- Preview observation before active run: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:1555f687a2a90fe0:2026-07-02T11:07:49.941Z`
- Active packet-loop observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:d909e03ea0624d34:2026-07-02T11:08:58.604Z`
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:09:08.859Z`
- Post-validation preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:55f48198caba17a4:2026-07-02T11:09:20.814Z`

DB-backed target status:
- Store: `framework_event.recipe_observation`
- Baseline selected remaining: 10
- Current selected remaining: 0
- Derived clears: 10
- Stale: 0
- Flicker: 0
- Refused: 0
- Failed validation: 0

Validation:
- `joern-effect:typecheck`: passed, including `joern-effect:generate`
- `openspec validate compress-recipe-authoring-surface --strict`: passed
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`: passed

Telemetry and claim classification:
- Command observation was DB-emitted through Tend/OpenCode observe.
- Packet finalizer status: scored
- Token metric source: `packet-fastpath`
- Token efficiency status: `control-only`
- Measured tokens: 0
- Measured clears: 10
- Command improvement vs raw reference: 21x
- Claim status: insufficient-evidence

Interpretation:
- This is a second consecutive validation-clean sourcePath slice after oracle hardening.
- It supports packet-family consistency for a deterministic sourcePath deletion packet.
- It is still not audit-promoted 20x token evidence because the run has no provider/model token telemetry.

Next action:
- Re-check global packet status and decide whether to continue sourcePath consistency slices or shift to attaching token-bearing OpenCode telemetry to packet implementation runs.

## 2026-07-02 checkpoint: clean Tend-wide sourcePath active slice

Phase: Phase B packet-harness optimization slice
Child change statuses:
- `bootstrap-packetized-openspec-apply`: external Tend/OpenCode proof gate is passing.
- `compress-recipe-authoring-surface`: continuing only through Tend/OpenCode packetized apply.
- `coordinate-packetized-recipe-migration-goal`: records consistency and command-efficiency evidence separately from token-efficiency claims.

Run summary:
- Packet family: `recipe-authoring/manual-source-path-inferable`
- Packet variant: `v3-eligibility-gated-object-field-source-path`
- Source scope: `packages/tend`
- Implementation title: `2026-07-02 tend-wide sourcePath v3 active slice`
- Preview observation before active run: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e7bdca65b1e9d155:2026-07-02T11:09:57.528Z`
- Active packet-loop observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6019d673dc00f665:2026-07-02T11:10:22.736Z`
- Validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:11:17.097Z`
- Post-validation preview observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:dabc7f5b96e13280:2026-07-02T11:11:38.926Z`

DB-backed target status:
- Store: `framework_event.recipe_observation`
- Baseline selected remaining: 26
- Current selected remaining: 0
- Derived clears: 26
- Stale: 0
- Flicker: 0
- Refused: 0
- Failed validation: 0

Validation:
- `tend-core:typecheck`: passed
- `tend-db:typecheck`: passed
- `tend-long-job:typecheck`: passed
- `tend-policies:typecheck`: passed
- `tend-reporting:typecheck`: passed
- `tend-token-audit:typecheck`: passed
- `openspec validate compress-recipe-authoring-surface --strict`: passed
- `openspec validate coordinate-packetized-recipe-migration-goal --strict`: passed

Telemetry and claim classification:
- Command observation was DB-emitted through Tend/OpenCode observe.
- Packet finalizer status: scored
- Token metric source: `packet-fastpath`
- Token efficiency status: `control-only`
- Measured tokens: 0
- Measured clears: 26
- Command improvement vs raw reference: 54.6x
- Claim status: insufficient-evidence

Interpretation:
- This is the strongest clean consistency slice for the sourcePath packet so far: 26 selected targets cleared across six Tend packages with validation passing.
- The packet has now produced three consecutive validation-clean sourcePath slices after hardening: 11, 10, and 26 clears.
- It remains below audit-promoted 20x evidence because token-bearing provider/model telemetry is still absent for deterministic fastpath execution.

Next action:
- Continue broad-scope previewing to identify the next dense sourcePath cluster.
- In parallel, prioritize attaching provider/model token telemetry for delegated OpenCode implementation runs so future packet clears can be token-efficiency scored rather than command/control scored only.

## 2026-07-02 11:48 UTC - Harness telemetry hardening and Attune sourcePath slice

- Phase: packet harness hardening plus small Recipe API migration slice.
- Harness change: Tend/OpenCode command observations now persist structured `packetRunSummary` into `framework_event.recipe_observation.payload` for OpenSpec packet-loop runs.
- Harness change: Tend/OpenCode now emits a follow-up `measurement.benchmark.packet.completed` observation containing `packetRunFinalizer`, linked by `commandObservationId`, so token-efficiency/finalizer status is SQL-queryable instead of CLI-envelope-only.
- Selector change: manual sourcePath discovery now separates preview geometry from active edit eligibility. Preview can see dense candidate geometry; active fastpath still refuses without proof.
- Selector hardening: required runtime/protocol `sourcePath` fields are blocked for schema fields, function parameters including `readonly sourcePath`, required nested schema structs, typed/satisfies required object outputs, `defineRecipeHandler`/`defineRecipeLayer`, and identity helper arguments.

DB proof:

- `framework_event.recipe_observation` table was inspected directly through the local Postgres store.
- Command observation payload for preview packet loop persisted `packetRunSummary` with `selectedTotal: 4`, `selectedRemaining: 4`, `cleared: 0`, `tokenTotal: 0`, `toolCalls: 0`, `tokenMetricSource: packet-loop-control`, `rawOutputStored: true`.
- Active Attune packet command observation:
  - `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f35c0d9712d0671f:2026-07-02T11:42:35.159Z`
  - `packetRunSummary.state: complete`
  - `selectedTotal: 4`
  - `selectedRemaining: 0`
  - `cleared: 4`
  - `tokenTotal: 0`
  - `tokenMetricSource: packet-fastpath`
  - `rawOutputStored: true`
- Finalizer SQL proof:
  - `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:89a251b441705957:2026-07-02T11:47:11.438Z:packet-run-finalizer`
  - `observation_kind: measurement.benchmark.packet.completed`
  - payload contains `packetRunSummary`, `packetRunFinalizer`, `commandObservationId`, and token metric fields.

Validation:

- `tend-opencode:typecheck` passed in observed run `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:45:58.791Z`.
- `tend-opencode:test` passed 96/96 in the same observed run.
- Active Attune migration validation passed in observed run `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T11:42:49.389Z`:
  - `attune-foldkit:typecheck`
  - `joern-effect:typecheck`
  - `openspec validate compress-recipe-authoring-surface --strict`
  - `openspec validate coordinate-packetized-recipe-migration-goal --strict`

Claim status:

- `claimStatus: insufficient-evidence` for 20x token-efficiency.
- The Attune sourcePath slice is clean migration progress: 4 selected targets cleared, validation passed, DB-backed status present.
- It is not audit-promoted 20x evidence because measured model tokens remain `0` with `tokenEfficiencyStatus: control-only` / packet fastpath telemetry.
- Next useful loop should target a token-bearing/agentic packet path or provider-native token capture while preserving DB-backed selected-target status.

## 2026-07-02 12:20 UTC - Runtime sourcePath packet invalidation and selector hardening

Goal phase: Phase B packet optimization over Recipe API slices.
Claim status: insufficient-evidence.

What happened:
- Tend/OpenCode active packet run `runtime exact batch manual sourcePath active packet run` selected 9 runtime `recipe-authoring/manual-source-path-inferable` targets and reported 9 clears.
- Command observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:dff8ea10936fc960:2026-07-02T12:11:16.986Z`.
- Packet finalizer recorded `measuredTokens=4582`, `measuredClears=9`, `tokensPerClear=509.1111111111111`, `tokenMetricSource=packet-fastpath+delegated-stdio-estimate`, `tokenEfficiencyStatus=measured`, and explicitly did not make audit-promoted 20x evidence from delegated-stdio estimates.
- Runtime validation then failed on `framework-runtime:typecheck`; the removed `sourcePath` fields were still required by current framework runtime contracts.
- Failed validation observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T12:12:14.577Z`.

Interpretation:
- The 9 reported clears are invalid migration clears because the validation ladder failed.
- This run is packet-optimization evidence, not migration progress and not 20x claim evidence.
- The selector incorrectly treated current runtime contract fields as inferable authoring boilerplate.

Packet changes made from the failed slice:
- Restored required runtime `sourcePath` fields in the runtime source files touched by the active packet.
- Hardened `recipe-authoring/manual-source-path-inferable` to refuse:
  - function/interface parameters named `sourcePath`;
  - `computeRepairFindings({ sourcePath })` arguments;
  - objects returned from `readonly ProgramRepairFinding[]` projection functions, including spread `.map((...) => ({ sourcePath }))` branches;
  - lowered recipe handler override objects that spread `LoweredRecipe.handler`.
- Added Tend/OpenCode regression coverage for current runtime contract `sourcePath` fields.

Validation after repair:
- `framework-runtime:typecheck` passed.
  Observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T12:15:47.051Z`.
- `tend-opencode:typecheck` and `tend-opencode:test` passed, 100/100 tests.
  Observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T12:19:11.789Z`.

Replay proof:
- Replayed the exact runtime source batch in preview after hardening.
- Result: `selectedTotal=0`, `selectedRemaining=0`, `cleared=0`, `measuredTokens=3282`, `tokenMetricSource=packet-loop-control+delegated-stdio-estimate`.
- Observation: `recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:98c3d07fce9d21c2:2026-07-02T12:20:23.856Z`.

Next action:
- Do not count the invalid runtime active run as migration progress.
- Continue optimizing packet families over slices, but require validation-backed clears before treating a slice as migration progress.
- Prefer the next slice where the harness can demonstrate selected targets are authored boilerplate rather than current runtime contract fields.

## Analysis: sourcePath packet optimizer hardening after invalid active slice

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "packet-optimizer-hardening",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "externally-proven",
    "compress-recipe-authoring-surface": "in-progress-blocked-for-active-migration"
  },
  "gateStatus": {
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "activeModeCapability": "passed",
    "frameworkStoreHealth": "passed",
    "dbEmission": "passed",
    "packetFamilyActiveReadiness": "failed",
    "validation": "passed-after-rollback",
    "accountingEvidence": "insufficient"
  },
  "packetFamily": "recipe-authoring/manual-source-path-inferable",
  "packetLoopState": "blocked",
  "selectedTotal": 46,
  "selectedRemaining": 46,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 1,
  "invalidatedRun": {
    "implementationTitle": "trellis nx manual sourcePath active packet run after recipeId hardening",
    "sourceFile": "packages/trellis/nx/src/index.ts",
    "selectedTotal": 2,
    "reportedCleared": 2,
    "measuredTokens": 3629,
    "toolCalls": 1,
    "tokensPerClear": 1814.5,
    "tokenMetricSource": "packet-fastpath+delegated-stdio-estimate",
    "validationFailure": "framework-nx:typecheck failed because sourcePath remained required in Effect-wrapped runtime output types",
    "countedAsMigrationProgress": false,
    "countedAs20xEvidence": false
  },
  "optimizerRevision": {
    "summary": "Restored the invalid sourcePath removals and hardened the sourcePath selector to unwrap Effect.Effect<T> and Effect.Effect<T[]> runtime output return types before allowing manual sourcePath deletion.",
    "regressionTest": "refuses Effect-wrapped projection output sourcePath fields while required output schema types need them",
    "tests": "tend-opencode:test passed 104/104"
  },
  "currentPacketTopology": {
    "state": "unsafe",
    "selectedTotal": 2226,
    "families": [
      { "family": "recipe-authoring/manual-recipe-id-inferable", "total": 151, "active": false, "claim": "insufficient-evidence" },
      { "family": "recipe-authoring/manual-source-path-inferable", "total": 46, "active": false, "claim": "insufficient-evidence" },
      { "family": "recipe-authoring/source-path-eligibility-oracle", "total": 500, "active": false, "claim": "insufficient-evidence" },
      { "family": "recipe-authoring/manual-handler-id-inferable", "total": 9, "refused": 9, "active": false, "claim": "blocked" },
      { "family": "recipe-authoring/manual-project-id-inferable", "total": 500, "active": false, "claim": "insufficient-evidence" },
      { "family": "recipe-authoring/manual-resource-id-inferable", "total": 500, "active": false, "claim": "insufficient-evidence" },
      { "family": "recipe-authoring/root-catalog-thinness", "total": 20, "active": false, "claim": "insufficient-evidence" },
      { "family": "recipe-authoring/generated-runtime-projection-readiness", "total": 0, "active": false, "claim": "not-started" },
      { "family": "recipe-authoring/generated-runtime-projection", "total": 0, "active": false, "claim": "not-started" },
      { "family": "recipe-authoring/managed-recipe-review-policy", "total": 500, "refused": 500, "active": false, "claim": "insufficient-evidence" }
    ]
  },
  "commandTelemetry": {
    "observedCommands": [
      "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode active --family recipe-authoring/manual-source-path-inferable --source packages/trellis/nx/src/index.ts --implementation-title 'trellis nx manual sourcePath active packet run after recipeId hardening' --until complete --format json",
      "pnpm exec nx run framework-nx:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:test --output-style=static",
      "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/manual-source-path-inferable --source packages/trellis/nx/src/index.ts --implementation-title 'trellis nx sourcePath preview after effect-output classifier hardening' --until complete --format json",
      "nix run .#tend-opencode -- openspec packet-status --change compress-recipe-authoring-surface --format json",
      "nix run .#tend-opencode -- fingerprint --format json",
      "nix run .#tend-opencode -- run-harness-test --format json"
    ],
    "rawOutputStored": true,
    "dbTable": "framework_event.recipe_observation"
  },
  "validationTargets": [
    "framework-nx:typecheck",
    "tend-opencode:typecheck",
    "tend-opencode:test",
    "nix run .#tend-opencode -- fingerprint --format json",
    "nix run .#tend-opencode -- run-harness-test --format json"
  ],
  "validationStatus": "passed-after-rollback",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f4bd859b5a28702b:2026-07-02T14:47:08.243Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0c1fc9bb3b470e3d:2026-07-02T14:47:43.920Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0c1fc9bb3b470e3d:2026-07-02T14:50:10.260Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T14:50:27.245Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-02T14:50:36.756Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0ef773e7dc2f4a0f:2026-07-02T14:51:53.594Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T14:52:39.577Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:7a8673626045caeb:2026-07-02T14:52:59.038Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:8325a2fc40f86ea0:2026-07-02T14:53:08.060Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "The only active sourcePath run failed validation and was rolled back; it is optimizer evidence only.",
    "No current Recipe authoring family is eligible for honest active packet migration.",
    "Dense families require additional authoring/projection proof or packet-owned fastpaths before active mode.",
    "Delegated-stdio token estimates are useful for optimization but not audit-promoted 20x proof."
  ],
  "nextAction": "Optimize the dense preview family recipe-authoring/manual-project-id-inferable or add a hard economy guard that prevents active edits when the candidate economy decision is shadow/raw-task; do not count further Recipe migration clears until validation and DB-backed selected-target status agree."
}
```

## Analysis: economy guard prevents low-density active sourcePath clears

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "packet-optimizer-hardening",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "externally-proven",
    "compress-recipe-authoring-surface": "in-progress-blocked-for-active-migration"
  },
  "gateStatus": {
    "frameworkStoreHealth": "passed",
    "activeModeCapability": "passed",
    "packetEconomyGuard": "passed",
    "dbEmission": "passed",
    "validation": "passed",
    "accountingEvidence": "insufficient"
  },
  "packetFamily": "recipe-authoring/manual-source-path-inferable",
  "packetLoopState": "blocked",
  "selectedTotal": 2,
  "selectedRemaining": 2,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "optimizerRevision": {
    "summary": "Active sourcePath packet fastpaths now refuse to write unless the candidate economy decision is active.",
    "reason": "Prevents tiny proof-gated sourcePath edits from being counted as packet wins when packet overhead is not amortized.",
    "regressionTests": [
      "refuses active manual sourcePath directory scope when packet economy is too small",
      "refuses active sourcePath edits when packet economy remains shadow",
      "applies a source-scoped sourcePath packet fastpath when explicit gates are present",
      "applies a batch source-scoped sourcePath packet fastpath when explicit gates are present"
    ]
  },
  "blockedRun": {
    "implementationTitle": "trellis nx sourcePath active packet after economy guard hardening",
    "sourceFile": "packages/trellis/nx/src/index.ts",
    "economyDecision": "shadow",
    "targetCount": 2,
    "measuredTokens": 3543,
    "toolCalls": 1,
    "tokenMetricSource": "packet-loop-control+delegated-stdio-estimate",
    "packetFastpathApplied": false,
    "tokenEfficiencyStatus": "zero-clears",
    "countedAsMigrationProgress": false,
    "countedAs20xEvidence": false
  },
  "commandTelemetry": {
    "observedCommands": [
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:test --output-style=static",
      "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode active --family recipe-authoring/manual-source-path-inferable --source packages/trellis/nx/src/index.ts --implementation-title 'trellis nx sourcePath active packet after economy guard hardening' --until complete --format json"
    ],
    "rawOutputStored": true,
    "dbTable": "framework_event.recipe_observation"
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T14:56:10.398Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-02T14:58:39.974Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:b285775edd0d1bf9:2026-07-02T14:59:47.675Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "No current packet family has produced validated, DB-backed Recipe migration clears after the economy guard.",
    "manual-project-id-inferable is the densest safe preview family, but it lacks a packet-owned active fastpath/proof boundary.",
    "manual-resource-id-inferable and managed-review-policy remain unsafe or review-heavy."
  ],
  "nextAction": "Optimize recipe-authoring/manual-project-id-inferable next: add target classifications, explicit proof requirements, and a packet-owned fastpath only if package/project context makes the field deterministic and validation can prove it."
}
```

## Analysis: projectId selector refinement and finalizer anti-gaming guard

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "packet-optimizer-hardening",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "externally-proven",
    "compress-recipe-authoring-surface": "in-progress-preview-only"
  },
  "gateStatus": {
    "frameworkStoreHealth": "passed",
    "dbEmission": "passed",
    "selectorQualityImproved": "passed",
    "finalizerAntiGamingGuard": "passed",
    "validation": "passed",
    "accountingEvidence": "insufficient"
  },
  "packetFamily": "recipe-authoring/manual-project-id-inferable",
  "packetLoopState": "preview",
  "selectedTotal": 36,
  "selectedRemaining": 36,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "optimizerRevision": {
    "selectorChange": "manual-project-id-inferable now selects only object-field lines matching ^\\s*projectId\\s*: instead of any projectId mention.",
    "selectorDelta": "coverage-guided-fuzzer preview dropped from 99 broad mentions to 36 field-shaped selected targets.",
    "finalizerChange": "Packet-run finalizer caps DB-derived selected-target deltas by the observed packet-loop cleared count unless a source-scoped packetFastpath supplies exact clears.",
    "reason": "Selector refinements are packet-optimizer evidence, not migration clears or 20x evidence."
  },
  "previewRuns": [
    {
      "implementationTitle": "trellis testing coverage fuzzer manual projectId packet geometry preview",
      "selectedTotal": 99,
      "selectedRemaining": 99,
      "cleared": 0,
      "finalizerDerivedCleared": 0,
      "note": "Before selector narrowing; broad projectId mentions inflated target geometry."
    },
    {
      "implementationTitle": "trellis testing coverage fuzzer manual projectId field-only selector preview after finalizer guard",
      "selectedTotal": 36,
      "selectedRemaining": 36,
      "cleared": 0,
      "finalizerDerivedCleared": 0,
      "measuredTokens": 3077,
      "toolCalls": 1,
      "tokenEfficiencyStatus": "zero-clears",
      "note": "DB delta still reports historical selector delta internally, but finalizer refuses to score it as clears."
    }
  ],
  "commandTelemetry": {
    "observedCommands": [
      "rg -n '^\\s*projectId\\s*:' packages | cut -d: -f1 | sort | uniq -c | sort -nr | head -20",
      "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/manual-project-id-inferable --source packages/trellis/testing/src/coverage-guided-fuzzer.ts --implementation-title 'trellis testing coverage fuzzer manual projectId packet geometry preview' --until complete --format json",
      "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/manual-project-id-inferable --source packages/trellis/testing/src/coverage-guided-fuzzer.ts --implementation-title 'trellis testing coverage fuzzer manual projectId field-only selector preview after finalizer guard' --until complete --format json",
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:test --output-style=static"
    ],
    "rawOutputStored": true,
    "dbTable": "framework_event.recipe_observation"
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T15:00:43.003Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:d7e21b89da20c99d:2026-07-02T15:00:49.300Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:20c9e6ec5091f39c:2026-07-02T15:02:07.886Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T15:03:42.038Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-02T15:03:55.611Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:a69cc921b4652481:2026-07-02T15:05:02.454Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "manual-project-id-inferable now has cleaner dense geometry but still lacks target classifications and active fastpath proof.",
    "No projectId fields have been removed, validated, or counted as migration clears.",
    "20x evidence remains unavailable until a packet-owned active repair clears selected targets and validation confirms the result."
  ],
  "nextAction": "Add manual-project-id target classifications that distinguish deterministic package/project authoring boilerplate from schema/test/runtime data before considering any active fastpath."
}
```

## Analysis: projectId runtime filter and packet-run analysis clear cap

```json
{
  "schemaVersion": "goal-analysis.v1",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "packet-optimizer-hardening",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "externally-proven",
    "compress-recipe-authoring-surface": "in-progress-preview-only"
  },
  "gateStatus": {
    "frameworkStoreHealth": "passed",
    "dbEmission": "passed",
    "projectIdRuntimeFilter": "passed",
    "packetRunAnalysisClearCap": "passed",
    "validation": "passed",
    "accountingEvidence": "insufficient"
  },
  "packetFamily": "recipe-authoring/manual-project-id-inferable",
  "packetLoopState": "preview",
  "selectedTotal": 0,
  "selectedRemaining": 0,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "optimizerRevision": {
    "projectIdClassifier": "Filters schema fields, function parameters, test/testing paths, typed runtime outputs, identity/report/coverage-like builders, recipe handlers, recipe layers, and handler bindings from manual projectId migration targets.",
    "analysisCap": "deriveOpenSpecPacketRunAnalysis now caps DB selected-target delta clears by packet loop status.cleared when no source-scoped packetFastpath supplies exact clears.",
    "result": "coverage-guided-fuzzer projectId preview is now zero selected targets and zero scored clears."
  },
  "previewRun": {
    "implementationTitle": "trellis testing coverage fuzzer manual projectId preview after analysis cap",
    "sourceFile": "packages/trellis/testing/src/coverage-guided-fuzzer.ts",
    "selectedTotal": 0,
    "selectedRemaining": 0,
    "packetRunAnalysisDerivedCleared": 0,
    "finalizerDerivedCleared": 0,
    "measuredTokens": 2846,
    "toolCalls": 1,
    "tokenEfficiencyStatus": "zero-clears",
    "countedAsMigrationProgress": false,
    "countedAs20xEvidence": false
  },
  "commandTelemetry": {
    "observedCommands": [
      "pnpm exec nx run tend-opencode:typecheck --output-style=static",
      "pnpm exec nx run tend-opencode:test --output-style=static",
      "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/manual-project-id-inferable --source packages/trellis/testing/src/coverage-guided-fuzzer.ts --implementation-title 'trellis testing coverage fuzzer manual projectId preview after analysis cap' --until complete --format json"
    ],
    "rawOutputStored": true,
    "dbTable": "framework_event.recipe_observation"
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T15:10:26.800Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-02T15:10:43.412Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:931cfa654c6b2cd7:2026-07-02T15:11:51.072Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "The dense projectId-looking testing source was correctly rejected as non-migration runtime identity data.",
    "No current projectId active fastpath exists for authored recipe modules.",
    "The next dense surface must be selected from authored recipe declarations, not tests, runtime identity, or generated/projection data."
  ],
  "nextAction": "Refresh global packet status after classifier tightening, then search for authored non-test projectId candidates that remain needs-authoring-fact."
}
```

## Goal analysis: projectId returned-object selector hardening

```json
{
  "schemaVersion": "goal-analysis.v1",
  "recordedAt": "2026-07-02T15:20:21.421Z",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "in-progress",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapValidation": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "explicitActiveModeCapability": "passed",
    "storeHealth": "passed",
    "traceCapture": "passed",
    "accountingEvidence": "failed"
  },
  "packetFamily": "recipe-authoring/manual-project-id-inferable",
  "packetVariant": "v1-bootstrap-family",
  "optimizerIteration": 1,
  "packetLoopState": "preview",
  "sourceFile": "packages/trellis/nx/src/index.ts",
  "optimizationSummary": "Tightened the manual projectId selector after preview evidence showed returned-object runtime outputs were still selected. The selector now treats projectId fields inside returned typed object literals as current-runtime authoring requirements rather than compact recipe authoring targets.",
  "selectedTotal": 4,
  "selectedRemaining": 4,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "selectedTargetLines": [850, 873, 898, 917],
  "selectorEvidence": {
    "previousSelectedRemaining": 6,
    "currentSelectedRemaining": 4,
    "removedFalsePositiveShape": "block-bodied typed runtime output returned object fields",
    "selectorReductionCountsAsClear": false,
    "dbDeltaDerivedCleared": 6,
    "scoredDerivedCleared": 0,
    "reason": "Selector refinement changed candidate geometry only; no selected target was repaired or validated as cleared. The finalizer correctly caps scoring at packet status cleared=0."
  },
  "tokenTelemetry": {
    "packetPreviewMeasuredTokens": 3403,
    "measuredClears": 0,
    "tokenEfficiencyStatus": "zero-clears",
    "tokenMetricSource": "packet-loop-control+delegated-stdio-estimate"
  },
  "commandTelemetry": {
    "typecheckObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T15:19:00.078Z",
    "testObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-02T15:19:10.974Z",
    "packetPreviewCommandObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2d446dbb84c6cef5:2026-07-02T15:20:18.745Z",
    "typecheckDurationMs": 5705,
    "testDurationMs": 62053,
    "packetPreviewDurationMs": 2638,
    "packetPreviewToolCalls": 1
  },
  "baselineComparison": {
    "rawTokensPerClear": 124087.56666666667,
    "targetTokensPerClearFor20x": 6204.378333333333,
    "measuredTokensPerClear": null,
    "reaches20xTokenEfficiency": false,
    "reason": "No clears occurred in this preview run."
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test",
    "framework-protocol:typecheck",
    "framework-protocol:test",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "passed",
  "storeHealth": "healthy",
  "observationIds": [
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.sidecar.discovered:preview:2026-07-02T15:20:21.421Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.economy.estimated:preview:2026-07-02T15:20:21.421Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.loop.started:preview:2026-07-02T15:20:21.421Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.repair.planned:preview:2026-07-02T15:20:21.421Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T15:20:21.421Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.validation.started:preview:2026-07-02T15:20:21.421Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.delta.projected:preview:2026-07-02T15:20:21.421Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.benchmark.analyzed:preview:2026-07-02T15:20:21.421Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "manual-project-id remains preview-only because selected targets require defineRecipeModule authoring facts before safe active edits",
    "no implementation command was joined to this packet run",
    "no selected targets cleared",
    "paired accounting is absent for this packet variant"
  ],
  "nextAction": "Move from selector cleanup to a compact authoring/projection proof slice, then replay the four-target framework-nx projectId packet through Tend/OpenCode when a packet-owned repair path can actually clear selected targets."
}
```

## Goal analysis: compact proof projection active packet clears

```json
{
  "schemaVersion": "goal-analysis.v1",
  "recordedAt": "2026-07-02T15:49:28.463Z",
  "changeId": "coordinate-packetized-recipe-migration-goal",
  "phase": "migration-active",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "in-progress",
    "compress-recipe-authoring-surface": "in-progress"
  },
  "gateStatus": {
    "bootstrapValidation": "passed",
    "fingerprintProof": "passed",
    "harnessProof": "passed",
    "pluginProof": "passed",
    "packetSidecarProof": "passed",
    "explicitActiveModeCapability": "passed",
    "storeHealth": "passed",
    "traceCapture": "passed",
    "postPacketValidation": "passed",
    "pairedAccounting": "failed",
    "auditPromotion": "failed"
  },
  "optimizerSummary": "The broad OpenCode implementation run added compact managed Recipe authoring/projection proof coverage without manually migrating existing target declarations. Packet selector optimization then taught generated-runtime projection selectors and readiness fastpaths to recognize compact lowering/projection calls. Active packet-loop, not raw Codex, cleared selected targets by adding readiness markers and materializing a .framework generated runtime projection for the Tend/OpenCode proof source.",
  "implementationBoundary": {
    "opencodeImplementationObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T15:22:28.460Z",
    "rawCodexMigrationEdits": false,
    "codexHarnessOptimizationEdits": [
      "compact generated-runtime projection selector recognition",
      "compact generated-runtime readiness fastpath recognition"
    ],
    "packetLoopMigrationEdits": [
      "packages/tend/opencode/src/test-recipes.ts readiness markers",
      ".framework/generated/packetized-recipe-authoring/packages__tend__opencode__src__test-recipes.runtime.generated.ts"
    ]
  },
  "packetRuns": [
    {
      "packetFamily": "recipe-authoring/generated-runtime-projection-readiness",
      "packetVariant": "v2-deterministic-target-local-readiness-marker-fastpath",
      "packetLoopState": "complete",
      "sourceFile": "packages/tend/opencode/src/test-recipes.ts",
      "selectedTotal": 4,
      "selectedRemaining": 0,
      "cleared": 4,
      "stale": 0,
      "flicker": 0,
      "refused": 0,
      "failedValidation": 0,
      "packetFastpathApplied": true,
      "changedFiles": ["packages/tend/opencode/src/test-recipes.ts"],
      "commandObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f7fbc268c35b5a07:2026-07-02T15:46:58.317Z",
      "measuredTokens": 4064,
      "measuredClears": 4,
      "tokensPerClear": 1016,
      "tokenMetricSource": "packet-fastpath+delegated-stdio-estimate",
      "claimUse": "optimization-only"
    },
    {
      "packetFamily": "recipe-authoring/generated-runtime-projection",
      "packetVariant": "v4-target-local-projection-readiness-classifier",
      "packetLoopState": "complete",
      "sourceFile": "packages/tend/opencode/src/test-recipes.ts",
      "selectedTotal": 4,
      "selectedRemaining": 0,
      "cleared": 4,
      "stale": 0,
      "flicker": 0,
      "refused": 0,
      "failedValidation": 0,
      "packetFastpathApplied": true,
      "changedFiles": [".framework/generated/packetized-recipe-authoring/packages__tend__opencode__src__test-recipes.runtime.generated.ts"],
      "commandObservationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:1ac83b74a97983de:2026-07-02T15:47:56.677Z",
      "measuredTokens": 3923,
      "measuredClears": 4,
      "tokensPerClear": 980.75,
      "tokenMetricSource": "packet-fastpath+delegated-stdio-estimate",
      "claimUse": "optimization-only"
    }
  ],
  "tokenTelemetry": {
    "combinedPacketFastpathTokens": 7987,
    "combinedClears": 8,
    "combinedTokensPerClear": 998.375,
    "rawTokensPerClearReference": 124087.56666666667,
    "targetTokensPerClearFor20x": 6204.378333333333,
    "telemetryQuality": "delegated-stdio-estimate",
    "reaches20xOptimizationSignal": true,
    "auditPromotable": false,
    "reason": "The slice is tiny and token values are delegated stdio estimates without paired raw-arm accounting, so it is useful optimizer evidence only."
  },
  "validationTargets": [
    "tend-opencode:typecheck",
    "tend-opencode:test",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "passed",
  "validationObservationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T15:48:08.923Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:5d50302c6eaaaca9:2026-07-02T15:48:19.021Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2490836ce38bf143:2026-07-02T15:49:26.983Z"
  ],
  "storeHealth": "healthy",
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "No paired raw-arm baseline for this exact slice",
    "Token values are delegated stdio estimates, not provider-native implementation telemetry",
    "Slice is only 8 packet clears across two tiny proof families",
    "No holdout or negative-control confirmation for this packet variant",
    "Manual Recipe ID/projectId/sourcePath migration targets remain mostly preview-only"
  ],
  "nextAction": "Repeat the same readiness-plus-projection packet composition on a larger source batch through Tend/OpenCode, then require provider-native or trace-joined implementation telemetry before treating any 20x result as candidate evidence."
}
```

## Goal analysis: manual sourcePath false-positive optimization and repair

- schemaVersion: 1
- changeId: coordinate-packetized-recipe-migration-goal
- phase: phase-b-packet-optimization
- childChangeStatuses:
  - bootstrap-packetized-openspec-apply: externally gated and usable for packet loops
  - compress-recipe-authoring-surface: active packet migration in progress through Tend/OpenCode
- gateStatus: active packet mode allowed with local Postgres framework store health
- packetFamily: recipe-authoring/manual-source-path-inferable
- packetLoopState: repaired-after-failed-validation
- selectedTotal: 24
- selectedRemaining: 0 during the failed active run, then sourcePath active eligibility reduced to 0 after selector hardening
- cleared: 24 attempted packet clears
- stale: 0
- flicker: 0
- refused: 0 during the failed active run
- failedValidation: framework-protocol:typecheck and framework-protocol:test failed after the active sourcePath deletion batch
- tokenTelemetry:
  - status: missing-for-this-run
  - reason: the active packet-loop was wrapped in a dynamic bash source-selection command, so the outer observe finalizer did not classify it as a direct packet-loop run
- commandTelemetry:
  - active packet observation: recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T15:57:07.923Z
  - failed validation observations:
    - recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:905ce2ba7e63e849:2026-07-02T15:58:12.181Z
    - recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:b065fc54a0119e85:2026-07-02T15:58:11.965Z
  - repair run observation: recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:afd3779c3cff5501:2026-07-02T15:59:16.253Z
  - repair run durationMs: 450101
- baselineComparison: unavailable; this was packet optimization/repair, not an audit-paired packet-vs-raw comparison
- validationTargets:
  - framework-protocol:typecheck
  - framework-protocol:test
  - tend-opencode:typecheck
  - tend-opencode:test
  - openspec validate compress-recipe-authoring-surface --strict
- validationStatus: passed after OpenCode repair
- storeHealth: local Postgres framework_event.recipe_observation emission confirmed
- observationIds:
  - recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.loop.completed:complete:2026-07-02T15:57:11.888Z
  - recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.benchmark.analyzed:complete:2026-07-02T15:57:11.888Z
  - recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:afd3779c3cff5501:2026-07-02T15:59:16.253Z
- claimStatus: insufficient-evidence
- blockers:
  - active sourcePath fastpath initially over-selected required protocol fields
  - direct token-efficiency finalizer was lost for this run because of the dynamic bash wrapper
  - sourcePath family now has 22 remaining needs-projection targets and 0 active-safe targets
- nextAction: keep optimizing packet geometry; future active packet-loop runs must use direct tend-opencode packet-loop commands with explicit source arguments when token efficiency is claim-relevant

## Goal analysis: projectId eligible source-hints active packet slice

- schemaVersion: 1
- changeId: coordinate-packetized-recipe-migration-goal
- phase: phase-b-packet-optimization
- childChangeStatuses:
  - bootstrap-packetized-openspec-apply: externally gated and usable for packet loops
  - compress-recipe-authoring-surface: active packet migration in progress through Tend/OpenCode
- gateStatus: active packet mode allowed with local Postgres framework store health
- packetFamily: recipe-authoring/manual-project-id-inferable
- packetLoopState: complete
- packetVariant: v2-conservative-project-context-bookkeeping-proof
- selectedTotal: 37
- selectedRemaining: 0
- cleared: 37
- stale: 0
- flicker: 0
- refused: 0
- failedValidation: 0 after validation ladder
- tokenTelemetry:
  - measuredTokens: 8721
  - measuredClears: 37
  - tokensPerClear: 235.7027027027027
  - tokenImprovementVsRaw: 526.457971180675
  - tokenMetricSource: packet-fastpath+delegated-stdio-estimate
  - status: optimization-evidence-only
  - reason: delegated stdio estimates are useful for packet optimization but not audit-promoted 20x evidence
- commandTelemetry:
  - measuredCommands: 1 packet-loop command for the active slice
  - commandImprovementVsRaw: 77.7
  - active command observation: recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:429a5e1fd63d6d65:2026-07-02T16:44:10.040Z
  - preview command observation: recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2a08f516bec25572:2026-07-02T16:43:55.246Z
- baselineComparison:
  - corrected packet benchmark packet arm: 134431 tokens, 6 commands, about 45.7s, 30/30 exact source-scope clears
  - corrected packet benchmark raw arm: 3722627 tokens, 63 commands, about 184.6s, 30/30 exact source-scope clears
  - promoted reference result: 27.69x precision-adjusted reasoning-bearing improvement
  - current slice status: not paired against a fresh raw arm, therefore not audit-promoted
- validationTargets:
  - nx run-many --target=typecheck --projects=attune-pi-agent,tend-core,tend-db,tend-long-job,tend-opencode,tend-policies,tend-reporting,tend-token-audit
  - tend-opencode:test
  - openspec validate compress-recipe-authoring-surface --strict
- validationStatus: passed
- storeHealth: local Postgres framework_event.recipe_observation emission confirmed
- observationIds:
  - recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.loop.completed:complete:2026-07-02T16:44:11.219Z
  - recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:active:openspec.packet.benchmark.analyzed:complete:2026-07-02T16:44:11.219Z
  - recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:429a5e1fd63d6d65:2026-07-02T16:44:10.040Z
- claimStatus: candidate
- blockers:
  - remaining projectId targets are mostly needs-authoring-fact and no longer have high-density safe active hints
  - sourcePath has 22 needs-projection targets and 0 active-safe manual sourcePath targets
  - recipeId has only 1 safe target and is too small to support the 20x claim by itself
- nextAction: optimize the next packet family around sourcePath generated projection or authoring-fact expansion; do not scale projectId further until new safe source hints appear

## Goal analysis: recipeId conservative proof optimizer result

- schemaVersion: 1
- changeId: coordinate-packetized-recipe-migration-goal
- phase: phase-b-packet-optimization
- childChangeStatuses:
  - bootstrap-packetized-openspec-apply: externally gated and usable for packet loops
  - compress-recipe-authoring-surface: active packet migration in progress through Tend/OpenCode
- gateStatus: active packet mode allowed, but no recipeId active-safe source hints after conservative proof
- packetFamily: recipe-authoring/manual-recipe-id-inferable
- packetLoopState: shadow
- packetVariant: v3-conservative-recipe-context-bookkeeping-proof
- selectedTotal: 29
- selectedRemaining: 29
- cleared: 0
- stale: 0
- flicker: 0
- refused: 0
- failedValidation: 0
- tokenTelemetry:
  - optimizerRunDurationMs: 684700
  - commandObservationId: recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:20d03d148dc4ca35:2026-07-02T16:47:57.549Z
  - status: negative-optimizer-evidence
  - reason: conservative proof reduced noisy recipeId targets but produced no real repo active-safe source hints
- commandTelemetry:
  - tend-opencode:typecheck after optimizer: recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:0f4142441406609b:2026-07-02T17:00:23.629Z
  - compress OpenSpec strict validation after optimizer: recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2490836ce38bf143:2026-07-02T17:00:22.924Z
- baselineComparison: unavailable; this was packet optimization and did not clear selected targets
- validationTargets:
  - tend-opencode:typecheck
  - tend-opencode:test inside the measured OpenCode optimizer run
  - openspec validate compress-recipe-authoring-surface --strict
- validationStatus: passed for optimizer changes
- storeHealth: local Postgres framework_event.recipe_observation emission confirmed
- observationIds:
  - recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:20d03d148dc4ca35:2026-07-02T16:47:57.549Z
- claimStatus: insufficient-evidence
- blockers:
  - deterministic recipeId proof found no active-safe real repo source hints
  - remaining recipeId targets require deeper compact authoring/projection facts rather than selector expansion
- nextAction: deprioritize recipeId active migration until new authoring facts exist; optimize sourcePath/generated projection next

## 2026-07-02T17:33Z - Generated-runtime readiness optimizer negative evidence

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "compress-recipe-authoring-surface",
  "phase": "migration-packet-optimization",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "external-bootstrap-proof-passed; active-mode-store-observable; no active slice selected",
  "packetFamily": "recipe-authoring/generated-runtime-projection-readiness",
  "packetVariant": "v3-compact-authoring-target-local-readiness-fastpath",
  "packetLoopState": "preview",
  "selectedTotal": 119,
  "selectedRemaining": 119,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "tokenTelemetry": {
    "tokenTotal": 56543,
    "inputTokens": 1128,
    "outputTokens": 55415,
    "cachedTokens": 24,
    "effectiveTokens": 56519,
    "reasoningTokens": 32,
    "source": "tend-opencode.session-decoder"
  },
  "commandTelemetry": {
    "observedCommandDurationMs": 893026,
    "commandCount": 5,
    "toolCallCount": 116,
    "validationCount": 4,
    "tokensPerCommand": 11308.6,
    "tokensPerToolCall": 487.4396551724138,
    "tokensPerValidation": 14135.75
  },
  "baselineComparison": {
    "status": "not-applicable-zero-clears",
    "reason": "optimizer improved safety/classification but produced no active clears; tokensPerClear must remain null rather than 0"
  },
  "validationTargets": [
    "nx run tend-opencode:test",
    "nx run tend-opencode:typecheck",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "passed",
  "storeHealth": "local-postgres observations emitted to framework_event.recipe_observation",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f861b9627f6849b9:2026-07-02T17:17:40.791Z",
    "recipe-observation:tend-opencode.session-decoder:tend.token-efficiency:opencode:opencode-live-2026-07-02T17-17-41-719Z:2026-07-02T17:32:32.417Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.sidecar.discovered:preview:2026-07-02T17:31:44.796Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T17:31:44.796Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "All 119 real-repo readiness targets still require compact authoring facts or broader compiler projection design before active edits"
  ],
  "nextAction": "Move to the next dense bootstrap family and optimize classifier/fastpath geometry through Tend/OpenCode rather than forcing this family active"
}
```

### Analysis

Tend/OpenCode tightened `recipe-authoring/generated-runtime-projection-readiness` from `v2-deterministic-target-local-readiness-marker-fastpath` to `v3-compact-authoring-target-local-readiness-fastpath`. This is useful optimizer evidence because it removes a too-broad active readiness marker path: verbose runtime `define*Recipe` declarations now remain `needs-authoring-fact`, while active readiness markers require compact authoring/projection-local ownership such as `defineRecipeModule(import.meta.url)` with target-local `projectRecipeAuthoringRuntime(...)` or `lowerRecipeAuthoringFact(...)` calls.

The real repository preview remains `119` selected targets, `119` selected remaining, and `0` clears. This is not migration progress and not 20x evidence. It is safety/packet-quality progress: the packet now refuses to manufacture clears from verbose runtime declarations that still need the Recipe authoring/projection model.


## 2026-07-02T17:52Z - Manual resource-id classifier optimizer and preview evidence

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "compress-recipe-authoring-surface",
  "phase": "migration-packet-optimization",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "external-bootstrap-proof-passed; active-mode-store-observable; preview-only zero-clear classifier evidence",
  "packetFamily": "recipe-authoring/manual-resource-id-inferable",
  "packetVariant": "v1-conservative-resource-identity-classifier",
  "packetLoopState": "preview",
  "selectedTotal": 500,
  "selectedRemaining": 500,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "classificationCounts": {
    "blocked": 403,
    "human-review": 79,
    "needs-authoring-fact": 18
  },
  "tokenTelemetry": {
    "optimizerTokenTotal": 36006,
    "optimizerInputTokens": 1378,
    "optimizerOutputTokens": 34628,
    "optimizerCachedTokens": 48,
    "optimizerEffectiveTokens": 35958,
    "previewMeasuredTokens": 36624,
    "previewTokenMetricSource": "packet-loop-control+delegated-stdio-estimate"
  },
  "commandTelemetry": {
    "optimizerDurationMs": 989486,
    "optimizerCommandCount": 9,
    "optimizerToolCallCount": 154,
    "optimizerValidationCount": 8,
    "previewDurationMs": 1472,
    "previewToolCalls": 1
  },
  "baselineComparison": {
    "status": "not-applicable-zero-clears",
    "reason": "Preview classified targets but cleared none; finalizer correctly marked token efficiency zero-clears instead of reporting tokensPerClear 0"
  },
  "validationTargets": [
    "nx run tend-opencode:test",
    "nx run tend-opencode:typecheck",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "passed",
  "storeHealth": "local-postgres observations emitted to framework_event.recipe_observation",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:efeea30d80145063:2026-07-02T17:33:37.526Z",
    "recipe-observation:tend-opencode.session-decoder:tend.token-efficiency:opencode:opencode-live-2026-07-02T17-33-38-619Z:2026-07-02T17:50:05.325Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e0679657d780d3af:2026-07-02T17:51:21.181Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.benchmark.analyzed:preview:2026-07-02T17:51:22.725Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "403 resource identity targets are blocked as non-authoring/protocol/schema/model or outside deterministic projection-local declarations",
    "79 resource identity targets require managed/external lifecycle human review policy",
    "18 verbose runtime/resource declarations need compact authoring facts or compiler projection design before active edits"
  ],
  "nextAction": "Optimize managed-recipe-review-policy next because it explains the 79 human-review resource-id blockers and maps to the managed Recipe API cut"
}
```

### Analysis

Tend/OpenCode replaced the broad `manual-resource-id-inferable` bootstrap placeholder with a conservative classifier. This is packet-quality progress, not migration progress: the real repository preview selected `500` targets and cleared `0`.

The preview shows that resource IDs are not currently the high-confidence packet to activate. Most targets are explicitly blocked, and a meaningful subset routes to managed/external lifecycle review. The next useful packet optimization is therefore `recipe-authoring/managed-recipe-review-policy`, because it can determine whether the managed authoring API can safely absorb any of the `human-review` resource blockers or must keep them fully explicit.


## 2026-07-02T18:08Z - Managed-review classifier optimizer and needs-human preview evidence

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "compress-recipe-authoring-surface",
  "phase": "migration-packet-optimization",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "external-bootstrap-proof-passed; active-mode-store-observable; managed lifecycle packet requires human review",
  "packetFamily": "recipe-authoring/managed-recipe-review-policy",
  "packetVariant": "v2-conservative-managed-review-policy-classifier",
  "packetLoopState": "needs-human",
  "selectedTotal": 500,
  "selectedRemaining": 500,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 1,
  "failedValidation": 0,
  "classificationCounts": {
    "blocked": 178,
    "human-review": 236,
    "needs-authoring-fact": 86
  },
  "reasonCounts": {
    "protocol/schema/model/test fixture lifecycle or review-policy shape is not a Recipe authoring migration target": 178,
    "provider or external resource lifecycle ownership is visible and must remain human-reviewed rather than auto-migrated": 221,
    "managed-review candidate is ambiguous and requires explicit author intent before migration": 86,
    "apply/write/destroy/check lifecycle declaration is missing visible review policy and requires human review": 15
  },
  "tokenTelemetry": {
    "optimizerTokenTotal": 45138,
    "optimizerInputTokens": 1335,
    "optimizerOutputTokens": 43803,
    "optimizerCachedTokens": 36,
    "optimizerEffectiveTokens": 45102,
    "previewMeasuredTokens": 52138,
    "previewTokenMetricSource": "packet-loop-control+delegated-stdio-estimate"
  },
  "commandTelemetry": {
    "optimizerDurationMs": 869355,
    "optimizerCommandCount": 7,
    "optimizerToolCallCount": 120,
    "optimizerValidationCount": 6,
    "previewDurationMs": 2279
  },
  "baselineComparison": {
    "status": "not-applicable-zero-clears-needs-human",
    "reason": "Preview classified managed lifecycle risk and stopped with needs-human; zero clears cannot support a tokens-per-clear or 20x claim"
  },
  "validationTargets": [
    "nx run tend-opencode:test",
    "nx run tend-opencode:typecheck",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "passed",
  "storeHealth": "local-postgres observations emitted to framework_event.recipe_observation",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:6efa661dd92237ec:2026-07-02T17:52:11.817Z",
    "recipe-observation:tend-opencode.session-decoder:tend.token-efficiency:opencode:opencode-live-2026-07-02T17-52-12-821Z:2026-07-02T18:06:39.698Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:d64f0e87c8b8f18a:2026-07-02T18:07:48.216Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.loop.blocked:needs-human:2026-07-02T18:07:48.126Z"
  ],
  "claimStatus": "blocked",
  "blockers": [
    "236 selected targets require human review",
    "86 selected targets require explicit managed authoring intent before migration",
    "No active-safe source hints are available for managed-review policy"
  ],
  "nextAction": "Do not run managed-review active mode; either narrow to explicit visible-review-policy authoring fixtures later or optimize a different non-lifecycle packet family"
}
```

### Analysis

Tend/OpenCode converted `recipe-authoring/managed-recipe-review-policy` from a bootstrap placeholder into a concrete conservative classifier. This is important because it prevents managed/external lifecycle code from being treated as packet autofix material.

The current repository preview is not a migration opportunity: it selected `500` targets, cleared `0`, and stopped as `needs-human`. This is a safety gate, not a 20x candidate. The result also explains why `manual-resource-id-inferable` could not activate: many resource identity targets are entangled with provider or external lifecycle ownership and need explicit human review policy before any compact managed authoring migration can be scored.


## 2026-07-02T18:21Z - Root catalog classifier optimizer and preview evidence

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "compress-recipe-authoring-surface",
  "phase": "migration-packet-optimization",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "external-bootstrap-proof-passed; active-mode-store-observable; preview-only zero-clear classifier evidence",
  "packetFamily": "recipe-authoring/root-catalog-thinness",
  "packetVariant": "v2-conservative-root-catalog-classifier",
  "packetLoopState": "preview",
  "selectedTotal": 49,
  "selectedRemaining": 49,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "classificationCounts": {
    "needs-authoring-fact": 27,
    "human-review": 22
  },
  "tokenTelemetry": {
    "optimizerTokenTotal": 18831,
    "optimizerInputTokens": 1003,
    "optimizerOutputTokens": 17828,
    "optimizerCachedTokens": 12,
    "optimizerEffectiveTokens": 18819,
    "previewMeasuredTokens": 12680,
    "previewTokenMetricSource": "packet-loop-control+delegated-stdio-estimate"
  },
  "commandTelemetry": {
    "optimizerDurationMs": 659246,
    "optimizerCommandCount": 3,
    "optimizerToolCallCount": 74,
    "optimizerValidationCount": 2,
    "previewDurationMs": 1464,
    "previewToolCalls": 1
  },
  "baselineComparison": {
    "status": "not-applicable-zero-clears",
    "reason": "Preview classified root catalogs but cleared none; finalizer correctly reported zero-clears rather than tokensPerClear 0"
  },
  "validationTargets": [
    "nx run tend-opencode:test",
    "nx run tend-opencode:typecheck",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "passed",
  "storeHealth": "local-postgres observations emitted to framework_event.recipe_observation",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:dce369cdedfd2384:2026-07-02T18:08:54.871Z",
    "recipe-observation:tend-opencode.session-decoder:tend.token-efficiency:opencode:opencode-live-2026-07-02T18-08-55-850Z:2026-07-02T18:19:53.315Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2e85705f57ce656b:2026-07-02T18:21:08.759Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.benchmark.analyzed:preview:2026-07-02T18:21:10.269Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "27 root catalogs contain behavior, handlers, resource construction, or verbose runtime declarations that need file-local compact authoring facts",
    "22 root catalogs contain lifecycle/managed behavior requiring explicit review before catalog thinning",
    "No active-safe catalog-thinning source hints are available"
  ],
  "nextAction": "Do not run root-catalog active mode; optimize the remaining source-path eligibility oracle or prepare handoff that current packet set has only one clean active slice"
}
```

### Analysis

Tend/OpenCode upgraded `recipe-authoring/root-catalog-thinness` from a bootstrap placeholder to a conservative root catalog classifier. The classifier now finds package-level `src/recipes.ts`, `src/index-recipes.ts`, `src/config-recipes.ts`, and `src/test-recipes.ts` files and separates behavior-bearing catalogs from managed/lifecycle catalogs.

The flake-provided Tend/OpenCode preview is now fresh and DB-observed. It selected `49` root catalog targets and cleared `0`. This is not a migration win. It is useful negative evidence showing that current root catalogs are not thin aggregation-only surfaces; they require file-local compact authoring facts or managed-review policy before active catalog thinning would be honest.


## 2026-07-02T18:40Z - Source-path eligibility oracle optimizer and zero-clear preview evidence

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "compress-recipe-authoring-surface",
  "phase": "migration-packet-optimization",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "external-bootstrap-proof-passed; active-mode-store-observable; source-path active mode now gated by deterministic source-scoped oracle",
  "packetFamily": "recipe-authoring/source-path-eligibility-oracle",
  "packetVariant": "manual-source-path-v3-eligibility-gated-object-field-source-path with source-path-oracle-v1-preview",
  "packetLoopState": "preview",
  "selectedTotal": 500,
  "selectedRemaining": 500,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 0,
  "failedValidation": 0,
  "classificationCounts": {
    "blocked": 487,
    "eligible": 7,
    "needs-projection": 6
  },
  "reasonCounts": {
    "current runtime binding type still requires sourcePath for this enclosing declaration": 463,
    ".framework generated runtime projection proof is present for this source file": 7,
    "language-service/runtime projection declaration needs generated projection or writer support before sourcePath removal": 6,
    "protocol/schema/diagnostic/model/result or runtime binding sourcePath field must remain explicit": 24
  },
  "sourceSliceEvidence": {
    "activeSafeFiles": 0,
    "mixedEligibleFiles": [
      "packages/attune/foldkit/src/fixture-types.ts",
      "packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts",
      "packages/attune/foldkit/src/fixtures/app-site-fixture.ts",
      "packages/trellis/nx/src/index.ts"
    ],
    "needsProjectionFiles": [
      "packages/trellis/language-service/src/cli.ts",
      "packages/trellis/language-service/src/ids.ts",
      "packages/trellis/language-service/src/index-recipes.ts",
      "packages/trellis/language-service/src/project-loader.ts"
    ]
  },
  "tokenTelemetry": {
    "optimizerTokenTotal": 28128,
    "optimizerInputTokens": 1180,
    "optimizerOutputTokens": 26948,
    "optimizerCachedTokens": 30,
    "optimizerEffectiveTokens": 28098,
    "optimizerReasoningTokens": 40,
    "previewMeasuredTokens": 65718,
    "previewEffectiveTokens": 65718,
    "previewTokenMetricSource": "packet-loop-control+delegated-stdio-estimate",
    "previewTokenEfficiencyStatus": "zero-clears"
  },
  "commandTelemetry": {
    "optimizerDurationMs": 995487,
    "optimizerCommandCount": 6,
    "optimizerToolCallCount": 141,
    "optimizerValidationCount": 5,
    "optimizerTokensPerCommand": 4688,
    "optimizerTokensPerToolCall": 199.49,
    "optimizerTokensPerValidation": 5625.6,
    "previewDurationMs": 2373,
    "previewToolCalls": 1
  },
  "baselineComparison": {
    "status": "not-applicable-zero-clears",
    "reason": "The preview cleared zero selected targets, so tokens-per-clear and 20x scoring are intentionally unscoreable."
  },
  "validationTargets": [
    "nx run tend-opencode:test",
    "nx run tend-opencode:typecheck",
    "openspec validate compress-recipe-authoring-surface --strict",
    "framework-protocol:typecheck",
    "framework-protocol:test",
    "framework-runtime:test"
  ],
  "validationStatus": "optimizer validations passed; preview planned validation ladder but performed no source edits",
  "storeHealth": "local-postgres observations emitted to framework_event.recipe_observation",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:1827eb95560179d7:2026-07-02T18:21:48.225Z",
    "recipe-observation:tend-opencode.session-decoder:tend.token-efficiency:opencode:opencode-live-2026-07-02T18-21-49-145Z:2026-07-02T18:38:22.383Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e72f79574f625a52:2026-07-02T18:39:29.400Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:e72f79574f625a52:2026-07-02T18:39:29.400Z:packet-run-finalizer",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.sidecar.discovered:preview:2026-07-02T18:39:31.824Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.economy.estimated:preview:2026-07-02T18:39:31.824Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.loop.started:preview:2026-07-02T18:39:31.824Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.repair.planned:preview:2026-07-02T18:39:31.824Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T18:39:31.824Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.validation.started:preview:2026-07-02T18:39:31.824Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.delta.projected:preview:2026-07-02T18:39:31.824Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.benchmark.analyzed:preview:2026-07-02T18:39:31.824Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "487 sourcePath targets are still required explicit runtime/protocol/model/source binding fields",
    "6 language-service/runtime projection targets need generated projection or writer support before sourcePath removal",
    "7 eligible targets occur only inside mixed files that also contain blocked or unsafe sourcePath targets",
    "No active-safe sourcePath source slice is available after the oracle gate"
  ],
  "nextAction": "Reject broad sourcePath active migration for now; do not count the earlier sourcePath false positive; keep sourcePath removal blocked until compact authoring facts or projection writer support create a deterministic active-safe slice."
}
```

### Analysis

Tend/OpenCode added a source-scoped eligibility oracle after the earlier sourcePath false positive. That is the right optimizer move: the packet family is no longer allowed to treat file-level fastpath comments as active-safe proof when the enclosing declarations still require explicit `sourcePath` fields.

The fresh DB-observed preview selected `500` sourcePath targets and cleared `0`. The finalizer correctly marked token efficiency as `zero-clears` with `65718` measured delegated-estimate tokens. The oracle found a few locally eligible targets, but every eligible target was inside a mixed source file that also contained blocked or unsafe targets, so there is no honest active sourcePath slice yet.

This result improves packet quality by preventing denominator gaming. It is not migration progress and not 20x evidence.


## 2026-07-02T18:45Z - Remaining identity-family frontier previews

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "compress-recipe-authoring-surface",
  "phase": "migration-packet-optimization",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "external-bootstrap-proof-passed; active-mode-store-observable; remaining identity families preview-only after projectId active slice",
  "packetFamilies": [
    {
      "packetFamily": "recipe-authoring/manual-recipe-id-inferable",
      "packetVariant": "v3-conservative-recipe-context-bookkeeping-proof",
      "packetLoopState": "preview",
      "selectedTotal": 29,
      "selectedRemaining": 29,
      "cleared": 0,
      "classificationCounts": {
        "needs-authoring-fact": 29
      },
      "repairability": "astEdit",
      "risk": "safe",
      "economyDecision": "shadow",
      "activeModeEligible": false,
      "tokenTelemetry": {
        "measuredTokens": 6130,
        "tokenMetricSource": "packet-loop-control+delegated-stdio-estimate",
        "tokenEfficiencyStatus": "zero-clears"
      },
      "observationIds": [
        "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:c6ca35b31bc10611:2026-07-02T18:43:43.953Z",
        "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T18:43:45.444Z",
        "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.benchmark.analyzed:preview:2026-07-02T18:43:45.444Z"
      ],
      "nextAction": "Keep in shadow/preview until deterministic recipe identity proof exists from compact authoring facts."
    },
    {
      "packetFamily": "recipe-authoring/manual-handler-id-inferable",
      "packetVariant": "v2-blocked-unproven-runtime-handler-binding",
      "packetLoopState": "unsafe",
      "selectedTotal": 9,
      "selectedRemaining": 9,
      "cleared": 0,
      "classificationCounts": {
        "blocked": 9
      },
      "repairability": "refuse",
      "risk": "unsafe",
      "economyDecision": "raw-task",
      "activeModeEligible": false,
      "tokenTelemetry": {
        "measuredTokens": 4384,
        "tokenMetricSource": "packet-loop-control+delegated-stdio-estimate",
        "tokenEfficiencyStatus": "zero-clears"
      },
      "observationIds": [
        "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:43bc6781270c48bd:2026-07-02T18:43:55.938Z",
        "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:unsafe:2026-07-02T18:43:57.473Z",
        "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.loop.unsafe:unsafe:2026-07-02T18:43:57.473Z",
        "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.benchmark.analyzed:unsafe:2026-07-02T18:43:57.473Z"
      ],
      "nextAction": "Do not active-run handlerId removal; require lowerRecipeAuthoringFact or runtime RecipeHandler equivalence proof first."
    },
    {
      "packetFamily": "recipe-authoring/manual-project-id-inferable",
      "packetVariant": "v2-conservative-project-context-bookkeeping-proof",
      "packetLoopState": "preview",
      "selectedTotal": 311,
      "selectedRemaining": 311,
      "cleared": 0,
      "classificationCounts": {
        "needs-authoring-fact": 311
      },
      "repairability": "guided",
      "risk": "safe",
      "economyDecision": "preview",
      "activeModeEligible": false,
      "tokenTelemetry": {
        "measuredTokens": 35296,
        "tokenMetricSource": "packet-loop-control+delegated-stdio-estimate",
        "tokenEfficiencyStatus": "zero-clears"
      },
      "observationIds": [
        "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:8311c8c5a482fade:2026-07-02T18:44:07.034Z",
        "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T18:44:08.497Z",
        "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.benchmark.analyzed:preview:2026-07-02T18:44:08.497Z"
      ],
      "nextAction": "Do not rerun broad projectId active mode; the remaining frontier needs compact authoring facts, not another deletion fastpath."
    }
  ],
  "commandTelemetry": {
    "manualRecipeIdPreviewDurationMs": 1453,
    "manualRecipeIdToolCalls": 1,
    "manualHandlerIdPreviewDurationMs": 1491,
    "manualHandlerIdToolCalls": 1,
    "manualProjectIdPreviewDurationMs": 1419,
    "manualProjectIdToolCalls": 1
  },
  "baselineComparison": {
    "status": "not-applicable-zero-clears",
    "reason": "All three frontier previews cleared zero selected targets, so they do not produce tokens-per-clear or 20x candidate evidence."
  },
  "validationTargets": [
    "framework-protocol:typecheck",
    "framework-protocol:test",
    "openspec validate compress-recipe-authoring-surface --strict"
  ],
  "validationStatus": "preview-only; no source edits; validation ladders planned but not run",
  "storeHealth": "local-postgres observations emitted to framework_event.recipe_observation",
  "telemetryQualityNotes": [
    "family-level packet-loop stdout remains parseable and finalizers are DB-backed",
    "full packet-status stdout is currently too large or fragile for downstream jq parsing after observed capture",
    "future harness work should add a compact packet-status summary path rather than relying on external parsing scripts"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "manual recipe IDs need deterministic recipe identity proof from compact authoring facts",
    "manual handler IDs remain unsafe without runtime handler-binding proof",
    "remaining manual project IDs need defineRecipeModule/project-context authoring facts before active edits",
    "No remaining identity-family frontier produced active-safe source hints or selected-target clears"
  ],
  "nextAction": "Stop broad identity-family active runs; optimize the actual compact authoring/projection prerequisite or add a compact packet-status summary to the Tend/OpenCode harness before scaling more slices."
}
```

### Analysis

The remaining identity-family previews make the frontier much clearer. `manual-recipe-id-inferable` and the post-active `manual-project-id-inferable` family are no longer deletion packets; they are blocked on the new compact authoring fact surface. `manual-handler-id-inferable` is correctly marked unsafe because the current fields still carry diagnostic, target identity, or fallback metadata.

This means the earlier projectId active slice remains the only real migration-progress slice so far. The rest of the frontier is packet-quality evidence: it tells us not to keep scaling broad identity deletion. The next honest optimization target is the prerequisite machinery that can create deterministic compact authoring facts and generated projection evidence, or a harness improvement that makes compact status/telemetry summaries first-class rather than script-parsed.


## 2026-07-02T18:48Z - Harness compact packet-status summary path

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "bootstrap-packetized-openspec-apply",
  "phase": "migration-packet-optimization",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete-with-harness-followup",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "external-bootstrap-proof-passed; active-mode-store-observable; compact packet-status summary added after full status parsing proved fragile",
  "packetFamily": "all recipe-authoring packet families",
  "packetLoopState": "shadow",
  "selectedTotal": 2029,
  "selectedRemaining": 2029,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 2,
  "failedValidation": 0,
  "authoringSurfaceMetrics": {
    "manualRecipeIdTargets": 29,
    "manualSourcePathTargets": 6,
    "manualHandlerIdTargets": 9,
    "manualProjectIdTargets": 311,
    "manualResourceIdTargets": 500,
    "rootCatalogThinnessTargets": 49,
    "generatedRuntimeProjectionReadinessTargets": 119,
    "generatedRuntimeProjectionTargets": 6,
    "managedReviewPolicyTargets": 500,
    "authoredBoilerplateBeforeEstimate": 1029,
    "authoredBoilerplateAfterEstimate": 1029,
    "authoredBoilerplateDeltaEstimate": 0
  },
  "tokenTelemetry": {
    "packetStatusSummaryStdoutBytes": 66921,
    "tokenMetricSource": "command-output-size; packet-status is status telemetry, not implementation token efficiency"
  },
  "commandTelemetry": {
    "durationMs": 2381,
    "command": "nix run .#tend-opencode -- openspec packet-status --change compress-recipe-authoring-surface --summary --format json",
    "status": "succeeded"
  },
  "baselineComparison": {
    "status": "not-applicable-status-command",
    "reason": "The compact status command is telemetry infrastructure and does not clear selected targets."
  },
  "validationTargets": [
    "nix run .#tend-opencode -- openspec packet-status --change compress-recipe-authoring-surface --summary --format json"
  ],
  "validationStatus": "observed command passed through flake-provided Tend/OpenCode harness; typecheck/test not run in this slice",
  "storeHealth": "local-postgres command observation and packet sidecar observations emitted to framework_event.recipe_observation",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:539f19ec173c8580:2026-07-02T18:48:15.178Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:3b48b754968e9e15:2026-07-02T18:49:27.233Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.sidecar.discovered:unsafe:2026-07-02T18:48:17.132Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.economy.estimated:unsafe:2026-07-02T18:48:17.132Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.loop.started:unsafe:2026-07-02T18:48:17.132Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.loop.unsafe:unsafe:2026-07-02T18:48:17.132Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "packet-status summary is harness telemetry only and does not produce migration clears",
    "full packet-status remains too large for comfortable terminal display, but the new summary path gives a native bounded alternative",
    "all currently visible broad recipe-authoring families remain blocked, unsafe, or preview-only after the projectId slice"
  ],
  "nextAction": "Use `packet-status --summary` for future frontier reads; do not rely on external jq scripts over huge status stdout; target compact authoring/projection prerequisites before more active migration."
}
```

### Analysis

The Tend/OpenCode harness now has a native compact status path:

```bash
nix run .#tend-opencode -- openspec packet-status --change compress-recipe-authoring-surface --summary --format json
```

This is a harness improvement, not a migration clear. It exists because the full `packet-status` JSON is too bulky to be a reliable operational frontier in observed command output. The summary path preserves the packetized output schema and keeps the important status surfaces: `status`, `familyStatuses`, `authoringSurfaceMetrics`, claim status, store emission, sidecar proof, and bounded candidate evidence.

The fresh observed summary says the current broad frontier has `2029` selected targets and `0` clears in shadow status, with the same conclusion as the family-level previews: the next useful work is compact authoring/projection prerequisite machinery, not another broad active deletion packet.

The summary row was also parsed back through the framework DB path with SQL against `framework_event.recipe_observation`. The parse recovered `candidateCount: 10`, `familyStatusCount: 10`, `selectedTotal: 2029`, `selectedRemaining: 2029`, `manualProjectIdTargets: 311`, `managedReviewPolicyTargets: 500`, and `claimStatus: insufficient-evidence`.


## 2026-07-02T18:55Z - Compact packet-status harness validation

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "bootstrap-packetized-openspec-apply",
  "phase": "bootstrap-harness-followup-validation",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete-with-harness-followup",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "external-bootstrap-proof-passed; compact packet-status summary validated after proof-fixture fixes",
  "packetFamily": "all recipe-authoring packet families",
  "packetLoopState": "shadow",
  "selectedTotal": 2029,
  "selectedRemaining": 2029,
  "cleared": 0,
  "stale": 0,
  "flicker": 0,
  "refused": 2,
  "failedValidation": 0,
  "tokenTelemetry": {
    "typecheckTokenMetricSource": "observed command stdout/stderr only",
    "testTokenMetricSource": "observed command stdout/stderr only"
  },
  "commandTelemetry": {
    "typecheck": {
      "observationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2119a93837fb058d:2026-07-02T18:50:30.928Z",
      "durationMs": 5579,
      "status": "succeeded"
    },
    "testAttempt1": {
      "observationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2142416ca7ec9988:2026-07-02T18:50:42.355Z",
      "durationMs": 28720,
      "status": "failed",
      "reason": "compact summary proof fixture did not create enough bulky candidate evidence; JSON lengths were equal"
    },
    "testAttempt2": {
      "observationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2142416ca7ec9988:2026-07-02T18:52:49.252Z",
      "durationMs": 28926,
      "status": "failed",
      "reason": "resourceId proof fixture used inline object fields that did not match the packet selector"
    },
    "testAttempt3": {
      "observationId": "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2142416ca7ec9988:2026-07-02T18:54:25.446Z",
      "durationMs": 28602,
      "status": "succeeded",
      "testsPassed": 148
    }
  },
  "baselineComparison": {
    "status": "not-applicable-harness-validation",
    "reason": "This validation proves the compact status telemetry path; it is not a migration implementation slice."
  },
  "validationTargets": [
    "nx run tend-opencode:typecheck --output-style=static",
    "nx run tend-opencode:test --output-style=static"
  ],
  "validationStatus": "passed after two DB-observed proof-fixture failures and fixes",
  "storeHealth": "local-postgres command observations emitted to framework_event.recipe_observation",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2119a93837fb058d:2026-07-02T18:50:30.928Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2142416ca7ec9988:2026-07-02T18:50:42.355Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2142416ca7ec9988:2026-07-02T18:52:49.252Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2142416ca7ec9988:2026-07-02T18:54:25.446Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "Harness telemetry is now improved, but broad Recipe migration families still require compact authoring/projection prerequisites before further active slices",
    "No new selected-target clears were produced by this validation"
  ],
  "nextAction": "Use compact packet-status summaries as the DB-backed frontier input; target compact authoring/projection prerequisite work through Tend/OpenCode rather than running more broad identity deletion."
}
```

### Analysis

The compact packet-status summary path is now validated. The first two test attempts failed for useful reasons: the proof fixture did not initially create enough bulky target evidence, then it used inline `resourceId` fields that the real packet selector correctly ignored. The final fixture uses real multiline object-field `resourceId` targets, and `tend-opencode:test` passed with `148/148` tests.

This closes the harness-quality loop opened by the bulky `packet-status` output. It does not change the migration claim status: no Recipe migration clears were produced, and the broad frontier remains `insufficient-evidence`.


## 2026-07-02T18:56Z - Current migration frontier report

### GoalAnalysisRecord

```json
{
  "schemaVersion": 1,
  "changeId": "compress-recipe-authoring-surface",
  "phase": "migration-preview",
  "childChangeStatuses": {
    "bootstrap-packetized-openspec-apply": "complete",
    "compress-recipe-authoring-surface": "in-progress",
    "coordinate-packetized-recipe-migration-goal": "in-progress"
  },
  "gateStatus": "bootstrap proof passed; Tend/OpenCode implementor path works; DB store healthy; current broad frontier is preview/blocked",
  "implementationProgress": {
    "compactOrdinaryRecipeGoldenSlice": "implemented and validated",
    "compactManagedRecipeGoldenSlice": "implemented and validated",
    "generatedFrameworkProjection": "implemented and validated",
    "compactPacketStatusSummary": "implemented and validated"
  },
  "migrationProgress": {
    "projectIdActiveSlice": {
      "selectedTotal": 37,
      "selectedRemaining": 0,
      "cleared": 37,
      "measuredTokens": 8721,
      "tokensPerClear": 235.7,
      "tokenMetricSource": "packet-fastpath+delegated-stdio-estimate",
      "evidenceClass": "optimization-candidate-only"
    },
    "currentBroadFrontier": {
      "selectedTotal": 2029,
      "selectedRemaining": 2029,
      "cleared": 0,
      "claimStatus": "insufficient-evidence"
    },
    "sourcePathFalsePositive": {
      "status": "failed-then-repaired",
      "countedAsWin": false
    }
  },
  "packetFamilyEvidence": {
    "manualRecipeIdInferable": {
      "selectedTotal": 29,
      "selectedRemaining": 29,
      "cleared": 0,
      "state": "preview",
      "blocker": "needs deterministic recipe identity proof"
    },
    "manualSourcePathInferable": {
      "selectedTotal": 6,
      "selectedRemaining": 6,
      "cleared": 0,
      "state": "shadow",
      "blocker": "needs generated projection proof"
    },
    "sourcePathEligibilityOracle": {
      "selectedTotal": 500,
      "selectedRemaining": 500,
      "cleared": 0,
      "state": "preview",
      "blocker": "no all-eligible source slice"
    },
    "manualHandlerIdInferable": {
      "selectedTotal": 9,
      "selectedRemaining": 9,
      "cleared": 0,
      "state": "unsafe",
      "blocker": "runtime handler binding proof missing"
    },
    "manualProjectIdInferable": {
      "selectedTotal": 311,
      "selectedRemaining": 311,
      "cleared": 0,
      "state": "preview",
      "blocker": "remaining targets need compact authoring/project-context facts"
    },
    "manualResourceIdInferable": {
      "selectedTotal": 500,
      "selectedRemaining": 500,
      "cleared": 0,
      "state": "preview",
      "blocker": "resource identity targets are mixed with managed/human-review and non-authoring surfaces"
    },
    "rootCatalogThinness": {
      "selectedTotal": 49,
      "selectedRemaining": 49,
      "cleared": 0,
      "state": "preview",
      "blocker": "root catalogs are behavior-bearing or need managed review; keep package catalogs explicit for now"
    },
    "generatedRuntimeProjectionReadiness": {
      "selectedTotal": 119,
      "selectedRemaining": 119,
      "cleared": 0,
      "state": "preview",
      "blocker": "needs compact authoring facts before readiness markers"
    },
    "generatedRuntimeProjection": {
      "selectedTotal": 6,
      "selectedRemaining": 6,
      "cleared": 0,
      "state": "preview",
      "blocker": "needs authoring facts or projection writer support"
    },
    "managedRecipeReviewPolicy": {
      "selectedTotal": 500,
      "selectedRemaining": 500,
      "cleared": 0,
      "state": "needs-human",
      "blocker": "managed/external lifecycle ownership requires human review"
    }
  },
  "auditPromotedEvidence": {
    "exists": false,
    "reason": "No paired raw-vs-packet accounting, holdout/negative-control confirmation, or audit promotion exists for the Recipe API cut."
  },
  "autofixVsReasoningSeparation": {
    "projectIdActiveSlice": "source-scoped packet fastpath/guided bookkeeping clear; not audit-promoted reasoning-bearing evidence",
    "sourcePathFalsePositive": "failed validation and is excluded",
    "remainingFamilies": "zero-clear preview/classifier evidence only"
  },
  "validationTargets": [
    "nx run tend-opencode:typecheck --output-style=static",
    "nx run tend-opencode:test --output-style=static",
    "openspec validate bootstrap-packetized-openspec-apply --strict",
    "openspec validate compress-recipe-authoring-surface --strict",
    "openspec validate coordinate-packetized-recipe-migration-goal --strict"
  ],
  "validationStatus": "passed for latest harness changes and OpenSpec artifacts",
  "storeHealth": "healthy local-postgres observations emitted to framework_event.recipe_observation",
  "observationIds": [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2119a93837fb058d:2026-07-02T18:50:30.928Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:2142416ca7ec9988:2026-07-02T18:54:25.446Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:684a638997dac74e:2026-07-02T18:55:39.802Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:cf44264e7d5b14f1:2026-07-02T18:55:54.008Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:539f19ec173c8580:2026-07-02T18:48:15.178Z"
  ],
  "claimStatus": "insufficient-evidence",
  "blockers": [
    "The current broad Recipe API frontier has 2029 selected targets and zero clears",
    "Only the projectId active slice cleared targets, and it is not audit-promoted 20x evidence",
    "Root-catalog and managed lifecycle families are intentionally not active-safe",
    "A full autonomous OpenCode run should not be handed off yet"
  ],
  "nextAction": "Do not scale the current broad packets. Use Tend/OpenCode to optimize compact authoring/projection prerequisites or wait for human handoff decision with claim status still insufficient-evidence."
}
```

### Analysis

Current status is clean but not complete. The harness is operational, store-backed, and validated. The Recipe authoring surface has a compact ordinary golden slice, compact managed lifecycle proof slice, generated `.framework` projection, and packet selectors. The current broad migration frontier is not active-safe: `2029` selected targets remain, and every broad family is preview, unsafe, needs-human, or blocked on compact authoring/projection prerequisites.

The only real selected-target clear remains the earlier projectId active slice with `37` clears. That slice is useful optimizer evidence, but it is not enough to claim 20x for the Recipe API cut. The sourcePath false positive is explicitly excluded. There is no audit-promoted 20x result and no full-run handoff yet.

## 2026-07-02T19:08Z - Tend/OpenCode source-scope parser prerequisite slice

```ts
const record: GoalAnalysisRecord = {
  schemaVersion: "2026-07-02.goal-analysis.v1",
  changeId: "coordinate-packetized-recipe-migration-goal",
  phase: "migration-packet-optimization",
  childChangeStatuses: {
    "bootstrap-packetized-openspec-apply": "operational-with-follow-up-harness-fix",
    "compress-recipe-authoring-surface": "in-progress",
  },
  gateStatus: {
    phaseA: "passed",
    externalFingerprintHarness: "passed-earlier-this-session",
    phaseB: "tend-opencode-only",
    activeMode: "available-but-slice-remained-prerequisite/shadow",
    storeHealth: "healthy-local-postgres",
  },
  packetFamily: "recipe-authoring/manual-project-id-inferable",
  packetLoopState: "shadow",
  selectedTotal: 2,
  selectedRemaining: 2,
  cleared: 0,
  stale: 0,
  flicker: 0,
  refused: 0,
  failedValidation: 0,
  tokenTelemetry: {
    source: "framework_event.recipe_observation payload from tend-opencode observe wrapping upstream OpenCode run",
    observationId: "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:03cc17fc3e8167b9:2026-07-02T18:58:23.466Z",
    tokenMetricSource: "opencode-json-events",
    tokenTotal: 110319,
    inputTokens: 21220,
    outputTokens: 805,
    reasoningTokens: 287,
    cachedTokens: 108544,
    effectiveTokens: 1775,
    tokensPerClear: null,
    note: "No migration clear occurred, so tokensPerClear is intentionally null rather than zero.",
  },
  commandTelemetry: {
    toolCalls: 42,
    durationMs: 446079,
    exitCode: 0,
    rawOutputStored: true,
    stdoutByteLength: 528372,
    stdoutTruncatedInSummary: true,
  },
  baselineComparison: {
    status: "not-applicable",
    reason: "This was a harness/source-scope parser prerequisite, not a paired migration clear run.",
  },
  validationTargets: [
    "nx run tend-opencode:typecheck",
    "cd packages/tend/opencode && pnpm exec vitest run test/opencode.test.ts -t \"treats --source-file as an exact packet source path|emits compact packet status summaries\"",
    "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --family recipe-authoring/manual-project-id-inferable --source-file packages/tend/db/src/index.ts --summary --format json",
  ],
  validationStatus: "targeted-pass-full-test-timeout-reported-by-implementor",
  storeHealth: "healthy-local-postgres",
  observationIds: [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:03cc17fc3e8167b9:2026-07-02T18:58:23.466Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.sidecar.discovered:shadow:2026-07-02T19:03:54.941Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.economy.estimated:shadow:2026-07-02T19:03:54.941Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.loop.started:shadow:2026-07-02T19:03:54.941Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.selected-target.delta.projected:shadow:2026-07-02T19:03:54.941Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:shadow:openspec.packet.benchmark.analyzed:shadow:2026-07-02T19:03:54.941Z",
  ],
  claimStatus: "insufficient-evidence",
  blockers: [
    "No Recipe migration target cleared in this slice.",
    "Task 6.2 remains open: package-level recipes.ts files were not made thin by this slice.",
    "Full tend-opencode:test was reported by the implementor as timing out in existing long-running packet parser/shadow-preview tests; targeted regression coverage passed.",
    "The result improves packet source-scope precision but is not a 20x candidate run.",
  ],
  nextAction: "Use the repaired exact --source-file behavior to run one source-scoped prerequisite packet where all selected targets classify eligible; keep tokensPerClear null unless clears are nonzero.",
}
```

Interpretation: this run is valid Tend/OpenCode harness evidence, with DB-backed token, command, tool-call, and raw trace capture, but it is not migration progress evidence. It repaired a packet-harness source-scoping bug so subsequent source-scoped packet loops do not accidentally expand TypeScript file contents as list entries. The 20x claim remains unpromoted and should continue optimizing over packet definitions and slices rather than selecting a pre-baked packet.

## 2026-07-02T19:22Z - Eligibility-filtered selected-target queue optimizer

```ts
const record: GoalAnalysisRecord = {
  schemaVersion: "2026-07-02.goal-analysis.v1",
  changeId: "coordinate-packetized-recipe-migration-goal",
  phase: "migration-packet-optimization",
  childChangeStatuses: {
    "bootstrap-packetized-openspec-apply": "operational-with-eligibility-filter-follow-up",
    "compress-recipe-authoring-surface": "in-progress",
  },
  gateStatus: {
    phaseA: "passed",
    externalFingerprintHarness: "passed-earlier-this-session",
    phaseB: "tend-opencode-only",
    activeMode: "not-entered",
    storeHealth: "healthy-local-postgres",
  },
  packetFamily: "recipe-authoring/source-path-eligibility-oracle",
  packetLoopState: "preview",
  selectedTotal: 1,
  selectedRemaining: 1,
  cleared: 0,
  stale: 0,
  flicker: 0,
  refused: 0,
  failedValidation: 0,
  tokenTelemetry: {
    implementorObservationId: "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:4b5383a8c5cda3a5:2026-07-02T19:08:52.958Z",
    implementorTokenMetricSource: "opencode-json-events",
    implementorTokenTotal: 107964,
    implementorInputTokens: 84130,
    implementorOutputTokens: 912,
    implementorReasoningTokens: 405,
    implementorEffectiveTokens: 1468,
    previewObservationId: "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:70a831986dcd38db:2026-07-02T19:18:23.497Z",
    previewTokenMetricSource: "packet-loop-control+delegated-stdio-estimate",
    previewTokenTotal: 3962,
    tokensPerClear: null,
    note: "No target cleared; tokensPerClear remains null. Zero-clear previews are scored as insufficient evidence, not as 0 tokens/clear.",
  },
  commandTelemetry: {
    implementorToolCalls: 54,
    implementorDurationMs: 663458,
    previewToolCalls: 1,
    previewDurationMs: 2330,
    rawOutputStored: true,
  },
  baselineComparison: {
    status: "not-applicable",
    reason: "This optimized packet target-queue geometry; it did not perform a paired clear run.",
  },
  validationTargets: [
    "nx run tend-opencode:test",
    "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/source-path-eligibility-oracle --source packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts --eligibility eligible --implementation-title foldkit-app-mdx-source-path-oracle-eligibility-filtered-preview --until complete --format json",
    "nix run .#tend-opencode -- openspec packet-loop --change compress-recipe-authoring-surface --mode preview --family recipe-authoring/manual-source-path-inferable --source packages/attune/foldkit/src/fixtures/app-mdx-fixture.ts --eligibility eligible --implementation-title foldkit-app-mdx-manual-source-path-eligibility-preview --until complete --format json",
  ],
  validationStatus: "targeted-pass-zero-clear-repair-family-preview",
  storeHealth: "healthy-local-postgres",
  observationIds: [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:4b5383a8c5cda3a5:2026-07-02T19:08:52.958Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:70a831986dcd38db:2026-07-02T19:18:23.497Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:9e7ea494be702d52:2026-07-02T19:20:22.204Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.selected-target.checked:preview:2026-07-02T19:18:25.675Z",
    "recipe-observation:tend-opencode.openspec-packet-sidecar:compress-recipe-authoring-surface:preview:openspec.packet.benchmark.analyzed:preview:2026-07-02T19:20:23.390Z",
  ],
  claimStatus: "insufficient-evidence",
  blockers: [
    "Eligibility filtering improves selected-target accounting but does not itself clear migration targets.",
    "The oracle preview selected one eligible target and retained eight blocked targets in analysis: active-safe=true for the filtered oracle queue, cleared=0.",
    "The actual manual-source-path repair-family preview selected zero eligible targets on the same source: eight blocked sourcePath fields remained, selectedTotal=0, cleared=0.",
    "This confirms the next optimization target is prerequisite packet geometry/projection readiness, not a sourcePath active edit on this file.",
  ],
  nextAction: "Optimize a prerequisite packet family that can produce actual eligible repair targets, likely generated-runtime-projection-readiness or root-catalog-thinness source batching, then score with --implementation-title and DB-backed selected-target status.",
}
```

Interpretation: Tend/OpenCode added an internal `--eligibility eligible` selected-target filter for `openspec packet-loop`/`packet-status` without changing public slash commands. This is an important anti-gaming improvement because blocked targets remain visible in classifications and reason text while selectedTotal/selectedRemaining only describe the filtered queue. However, the first repair-family replay produced zero eligible `manual-source-path-inferable` targets, so there is still no migration-clear evidence and no 20x candidate.

## 2026-07-02T19:38Z - Root-catalog prerequisite implementor timeout

```ts
const record: GoalAnalysisRecord = {
  schemaVersion: "2026-07-02.goal-analysis.v1",
  changeId: "coordinate-packetized-recipe-migration-goal",
  phase: "migration-prerequisite-implementation-attempt",
  childChangeStatuses: {
    "bootstrap-packetized-openspec-apply": "operational",
    "compress-recipe-authoring-surface": "in-progress",
  },
  gateStatus: {
    phaseA: "passed",
    externalFingerprintHarness: "passed-earlier-this-session",
    phaseB: "tend-opencode-only",
    activeMode: "available-but-no-active-packet-entered",
    storeHealth: "healthy-local-postgres",
  },
  packetFamily: "recipe-authoring/root-catalog-thinness",
  packetLoopState: "budget-exhausted",
  selectedTotal: 1,
  selectedRemaining: 1,
  cleared: 0,
  stale: 0,
  flicker: 0,
  refused: 0,
  failedValidation: 0,
  tokenTelemetry: {
    source: "framework_event.recipe_observation payload from tend-opencode observe wrapping upstream OpenCode run",
    observationId: "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:1457a7e0fdc224de:2026-07-02T19:22:11.143Z",
    tokenMetricSource: "unavailable-timeout-no-opencode-json-events",
    tokenTotal: null,
    effectiveTokens: null,
    tokensPerClear: null,
    note: "The upstream run timed out at 900s before emitting JSON events/stdout, so token totals were not recoverable from the wrapper payload. The run still has command/time telemetry and rawOutputStored=true.",
  },
  commandTelemetry: {
    exitCode: 124,
    durationMs: 900082,
    stdoutBytes: 0,
    stderrBytes: 58,
    rawOutputStored: true,
  },
  baselineComparison: {
    status: "not-applicable",
    reason: "No implementation output, target edit, packet-loop score, or clear occurred.",
  },
  validationTargets: [],
  validationStatus: "not-run-timeout-before-result",
  storeHealth: "healthy-local-postgres",
  observationIds: [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:1457a7e0fdc224de:2026-07-02T19:22:11.143Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:1bdfa830e290a9dc:2026-07-02T19:21:53.793Z",
  ],
  claimStatus: "blocked",
  blockers: [
    "Tend/OpenCode implementation attempt timed out at 900s with no stdout/OpenCode JSON events.",
    "No root-catalog selected target cleared; selectedRemaining stayed 1 for packages/tend/opencode/src/recipes.ts.",
    "Narrow metadata check showed packages/tend/opencode/src/recipes.ts mtime remained 2026-07-01T23:53:47-04:00, so there is no evidence of a partial target edit from this timed-out run.",
    "This packet shape is too expensive/underspecified for a single-file agentic migration attempt; root-catalog-thinness needs a more deterministic prerequisite or fastpath before another active attempt.",
  ],
  nextAction: "Do not retry the same root-catalog implementor prompt. Use cheap packet-loop previews to locate a prerequisite family with active-safe clears, or implement a narrower deterministic root-catalog fastpath in Tend/OpenCode before attempting target edits.",
}
```

Interpretation: this run is negative evidence. It should reduce confidence in single-file agentic root-catalog thinning as the next efficient packet and should not be counted as migration progress. The clean pivot is to optimize prerequisite packet geometry or identify a predeclared active-safe family with actual clears.

## 2026-07-02T19:55Z - Eligibility-filtered batch accounting blocker

```ts
const record: GoalAnalysisRecord = {
  schemaVersion: "2026-07-02.goal-analysis.v1",
  changeId: "coordinate-packetized-recipe-migration-goal",
  phase: "migration-packet-accounting-blocker",
  childChangeStatuses: {
    "bootstrap-packetized-openspec-apply": "operational-with-accounting-bug",
    "compress-recipe-authoring-surface": "in-progress-blocked-for-claim-bearing-active-runs",
  },
  gateStatus: {
    phaseA: "passed",
    externalFingerprintHarness: "passed-earlier-this-session",
    phaseB: "tend-opencode-only",
    activeMode: "blocked-for-batch-accounting-invariant",
    storeHealth: "healthy-local-postgres",
  },
  packetFamily: "recipe-authoring/manual-project-id-inferable",
  packetLoopState: "blocked",
  selectedTotal: 2,
  selectedRemaining: 4,
  cleared: -2,
  stale: 0,
  flicker: 0,
  refused: 0,
  failedValidation: 0,
  tokenTelemetry: {
    failingPreviewObservationId: "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:d03728696f3bd3dc:2026-07-02T19:39:08.333Z",
    repairAttemptObservationId: "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f39d99a9355c99d6:2026-07-02T19:39:23.252Z",
    failingPreviewTokenTotal: 3656,
    repairAttemptTokenMetricSource: "unavailable-timeout-no-opencode-json-events",
    repairAttemptDurationMs: 900076,
    tokensPerClear: null,
    note: "Batch preview was measured, but accounting is invalid: selectedRemaining exceeded selectedTotal and cleared became negative. The repair attempt timed out without OpenCode JSON events.",
  },
  commandTelemetry: {
    failingPreviewToolCalls: 1,
    failingPreviewDurationMs: 1150,
    repairAttemptExitCode: 124,
    repairAttemptDurationMs: 900076,
    rawOutputStored: true,
  },
  baselineComparison: {
    status: "invalid-accounting",
    reason: "No claim-bearing comparison may use rows where selectedRemaining > selectedTotal or cleared < 0.",
  },
  validationTargets: [],
  validationStatus: "blocked-before-validation",
  storeHealth: "healthy-local-postgres",
  observationIds: [
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:d03728696f3bd3dc:2026-07-02T19:39:08.333Z",
    "recipe-observation:tend-opencode.command-observation:measurement.command.observed:measurement:2026-07-02:4ac244a5fdcc40fb:f39d99a9355c99d6:2026-07-02T19:39:23.252Z",
  ],
  claimStatus: "blocked",
  blockers: [
    "Two-source eligibility-filtered manual-project-id preview returned selectedTotal=2, selectedRemaining=4, and family cleared=-2.",
    "Negative clears are a metric-gaming hazard; all claim-bearing packet-loop scoring must block until fixed.",
    "Tend/OpenCode repair attempt for the accounting invariant timed out at 900s with no stdout/OpenCode JSON events.",
    "No further active packet claims should be attempted on eligibility-filtered multi-source batches until selected-target accounting is repaired and tested.",
  ],
  nextAction: "Hand off or implement a narrowly-scoped Tend/OpenCode harness repair for eligibility-filtered batch accounting before any more active/claim-bearing packet runs. Root-catalog migration remains blocked separately on deterministic file-local authoring facts.",
}
```

Interpretation: the current framework and DB pipeline are doing their job by exposing an invalid denominator/clear state. This is not a migration failure, but it is a scoring blocker. The next productive work is a deterministic harness accounting fix, not more migration target edits.

import { Schema as S } from "effect"

import { MutationObligation } from "./mutation.js"
import { PermissionProfile } from "./permission-profile.js"
import { PropertyObligation } from "./property-test.js"
import { PlannedTask } from "./task-plan.js"
import { SnapshotObligation, TestObligation } from "./test-obligation.js"

export const Boundary = S.Struct({
  id: S.String,
  description: S.String,
})
export type Boundary = typeof Boundary.Type

export const ValidationCommand = S.Struct({
  id: S.String,
  command: S.String,
  targetPackage: S.String,
  required: S.Boolean,
})
export type ValidationCommand = typeof ValidationCommand.Type

export const ReviewGate = S.Struct({
  id: S.String,
  description: S.String,
  requiredBefore: S.String,
})
export type ReviewGate = typeof ReviewGate.Type

export const ForbiddenAction = S.Struct({
  id: S.String,
  action: S.String,
  reason: S.String,
})
export type ForbiddenAction = typeof ForbiddenAction.Type

export const ArtifactPolicy = S.Struct({
  root: S.String,
  ignoredByGit: S.Boolean,
  promoteSelectedArtifactsOnly: S.Boolean,
  requiredFiles: S.Array(S.String),
})
export type ArtifactPolicy = typeof ArtifactPolicy.Type

export const ImplementationSpec = S.Struct({
  id: S.String,
  title: S.String,
  intent: S.String,
  scope: S.Array(S.String),
  nonGoals: S.Array(S.String),
  affectedPackages: S.Array(S.String),
  boundaries: S.Array(Boundary),
  tasks: S.Array(PlannedTask),
  testObligations: S.Array(TestObligation),
  propertyObligations: S.Array(PropertyObligation),
  mutationObligations: S.Array(MutationObligation),
  snapshotObligations: S.Array(SnapshotObligation),
  validationCommands: S.Array(ValidationCommand),
  reviewGates: S.Array(ReviewGate),
  forbiddenActions: S.Array(ForbiddenAction),
  permissionProfile: PermissionProfile,
  artifactPolicy: ArtifactPolicy,
})
export type ImplementationSpec = typeof ImplementationSpec.Type

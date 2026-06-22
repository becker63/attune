import { Schema } from "effect"

export interface FrameworkNxActionPlan {
  readonly actionId: string
  readonly title: string
  readonly sourcePath: string
  readonly packageId: string
  readonly operationId?: string
  readonly generatorOrTarget: string
  readonly options: Readonly<Record<string, unknown>>
  readonly validationTarget?: string
}

export const FrameworkNxActionPlanSchema = Schema.Struct({
  actionId: Schema.String,
  title: Schema.String,
  sourcePath: Schema.String,
  packageId: Schema.String,
  operationId: Schema.optional(Schema.String),
  generatorOrTarget: Schema.String,
  options: Schema.Record(Schema.String, Schema.Unknown),
  validationTarget: Schema.optional(Schema.String),
})

export const createFrameworkNxActionPlan = (
  plan: FrameworkNxActionPlan,
): FrameworkNxActionPlan => plan

const validationTargetFor = (packageId: string): string => `${packageId}:check`

export const protocolMaterializeAction = (
  packageId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.materialize",
    title: "Refresh protocol materialization",
    sourcePath,
    packageId,
    generatorOrTarget: "@attune/framework-nx:protocol-materialize",
    options: { packageId },
    validationTarget: validationTargetFor(packageId),
  })

export const operationRegistryAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.operation-registry",
    title: "Generate operation registry",
    sourcePath,
    packageId,
    ...(operationId === undefined ? {} : { operationId }),
    generatorOrTarget: "@attune/framework-nx:operation-registry",
    options: {
      packageId,
      ...(operationId === undefined ? {} : { operationId }),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const propertyEvidenceAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.property-evidence",
    title: "Generate property evidence scaffold",
    sourcePath,
    packageId,
    ...(operationId === undefined ? {} : { operationId }),
    generatorOrTarget: "@attune/framework-nx:protocol-evidence",
    options: {
      packageId,
      ...(operationId === undefined ? {} : { operationId }),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const atomViewEdgeAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.atom-view-edge",
    title: "Generate missing atom view edge",
    sourcePath,
    packageId,
    ...(operationId === undefined ? {} : { operationId }),
    generatorOrTarget: "@attune/framework-nx:atom-view-edge",
    options: {
      packageId,
      ...(operationId === undefined ? {} : { operationId }),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const typeGuidanceAction = (
  packageId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.type-guidance",
    title: "Refresh type-guidance partitions",
    sourcePath,
    packageId,
    generatorOrTarget: "@attune/framework-nx:type-guidance",
    options: { packageId },
    validationTarget: validationTargetFor(packageId),
  })

export const frameworkDiagnosticsAction = (
  packageId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.framework-diagnostics",
    title: "Run framework diagnostics",
    sourcePath,
    packageId,
    generatorOrTarget: "workspace:package-contracts-check",
    options: { packageId },
    validationTarget: "workspace:package-contracts-check",
  })

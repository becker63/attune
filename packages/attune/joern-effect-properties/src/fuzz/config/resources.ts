import { Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineExternalSchemaManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"

export type FuzzResourceConfig = Readonly<{
  readonly cpus: number
  readonly cpusPerWorker: number
  readonly tmpfsSize: string
  readonly workers: number
}>

export const defaultFuzzResources: FuzzResourceConfig = {
  cpus: 4,
  cpusPerWorker: 2,
  tmpfsSize: "10g",
  workers: 2,
}

const fuzzerResourceLifecycleRecipeId = "joern-effect-properties.fuzzer-resource-lifecycle" as const
const fuzzerResourceLifecycleSourcePath =
  "packages/attune/joern-effect-properties/src/fuzz/config/resources.ts" as const

export const FuzzerResourceConfigSchema = Schema.Struct({
  cpus: Schema.Number,
  cpusPerWorker: Schema.Number,
  tmpfsSize: Schema.String,
  workers: Schema.Number,
})

export const FuzzerResourceLifecycleInput = Schema.Struct({
  packageRoot: Schema.optional(Schema.String),
})
export type FuzzerResourceLifecycleInput = typeof FuzzerResourceLifecycleInput.Type

export const FuzzerResourceLifecycleOutput = FuzzerResourceConfigSchema
export type FuzzerResourceLifecycleOutput = typeof FuzzerResourceLifecycleOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const FuzzerResourceConfigResource = defineAlchemyResource({
  id: "joern-effect-properties.fuzzer-resource-lifecycle.resource",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  providerId: "effect-platform-filesystem",
  ownerRecipeId: fuzzerResourceLifecycleRecipeId,
  producedBy: [fuzzerResourceLifecycleRecipeId],
  consumedBy: [
    fuzzerResourceLifecycleRecipeId,
    "joern-effect-properties.worker-fuzzer",
  ],
  addressFields: ["packageRoot"],
  addressSchema: FuzzerResourceLifecycleInput as never,
  stateSchema: FuzzerResourceLifecycleOutput as never,
  modes: ["plan", "apply", "check", "destroy", "read"],
  programmaticResourceExport: "defaultFuzzResources",
  programmaticProviderExport: "FuzzerResourceLifecycleLayer",
  programmaticBridgeSourcePath: fuzzerResourceLifecycleSourcePath,
})

export const FuzzerResourceLifecycleLayer = defineRecipeLayer({
  id: "joern-effect-properties.fuzzer-resource-lifecycle.layer",
  sourcePath: fuzzerResourceLifecycleSourcePath,
  exportName: "defaultFuzzResources",
  layer: Layer.empty as never,
  provides: [{ id: "filesystem", service: "Effect.Platform.FileSystem" }],
})

export const FuzzerResourceLifecycleHandler = defineRecipeHandler<
  FuzzerResourceLifecycleInput,
  FuzzerResourceLifecycleOutput
>({
  id: "joern-effect-properties.fuzzer-resource-lifecycle.handler",
  recipeId: fuzzerResourceLifecycleRecipeId,
  sourcePath: fuzzerResourceLifecycleSourcePath,
  exportName: "defaultFuzzResources",
  layer: FuzzerResourceLifecycleLayer,
  emitsReceipts: ["joern-effect-properties.fuzzer-resource-lifecycle.checked"],
  handler: () => Effect.succeed(defaultFuzzResources) as never,
})

// @attune-packet-target generated-runtime-projection eligible
export const FuzzerResourceLifecycleAlchemyBinding = defineManagedRecipeAlchemyBinding({
  id: "joern-effect-properties.fuzzer-resource-lifecycle.alchemy",
  managedRecipeId: fuzzerResourceLifecycleRecipeId,
  alchemyResourceType: "attune:resource:Configuration",
  providerId: "effect-platform-filesystem",
  resource: FuzzerResourceConfigResource,
  lifecycle: {
    plan: "planFuzzerResources",
    apply: "applyFuzzerResources",
    check: "checkFuzzerResources",
    destroy: "destroyFuzzerResources",
    read: "readFuzzerResources",
    diff: "diffFuzzerResources",
  },
  bindings: ["defaultFuzzResources", "FuzzerResourceLifecycleLayer"],
})

export const FuzzerResourceLifecycleRecipe = defineExternalSchemaManagedRecipe({
  id: fuzzerResourceLifecycleRecipeId,
  projectId: "joern-effect-properties",
  title: "Own Joern fuzzer resource lifecycle configuration",
  inputSchema: FuzzerResourceLifecycleInput,
  outputSchema: FuzzerResourceLifecycleOutput,
  nxTarget: "joern-effect-properties:test",
  allowedFiles: [fuzzerResourceLifecycleSourcePath],
  validationEvidence: ["joern-effect-properties:test", "workspace:policy-proof-pressure"],
  io: {
    inputSchema: FuzzerResourceLifecycleInput as never,
    outputSchema: FuzzerResourceLifecycleOutput as never,
    inputResources: [FuzzerResourceConfigResource],
    outputResources: [FuzzerResourceConfigResource],
  },
  handler: FuzzerResourceLifecycleHandler as never,
  lifecycle: ["plan", "apply", "check", "destroy"],
  resourceKind: "joern-fuzzer-resource-config",
  observedState: defaultFuzzResources,
  humanReviewRequired: true,
  alchemy: FuzzerResourceLifecycleAlchemyBinding as never,
})

export const FuzzerResourceLifecycleRecipes = [FuzzerResourceLifecycleRecipe] as const

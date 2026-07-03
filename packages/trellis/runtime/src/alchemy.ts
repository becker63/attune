import type { Diff } from "alchemy/Diff"
import * as Provider from "alchemy/Provider"
import { Resource } from "alchemy/Resource"
import { Context, Effect, Layer, Schema } from "effect"
import {
  ManagedRecipeLifecycleActionSchema,
  ManagedRecipeAlchemyType,
  defineAlchemyResource,
  defineManagedRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  makeManagedRecipeAlchemyProvider,
  type ManagedRecipeAlchemyOutput,
  type ManagedRecipeAlchemyProps,
  type ManagedRecipeAlchemyResource,
  type ManagedRecipeLifecycleAction,
} from "./RecipeKernel.js"
import { LocalTimescaleManagedRecipeId } from "./LocalTimescaleRecipe.js"

const frameworkRuntimeAlchemyProviderRecipeId =
  "framework-runtime.managed-recipe-alchemy-provider" as const
const frameworkRuntimeAlchemyProviderBindingId =
  "framework-runtime.managed-recipe-alchemy-provider.binding" as const
const frameworkRuntimeAlchemySourcePath = "packages/trellis/runtime/src/alchemy.ts" as const

export const FrameworkRuntimeAlchemyProviderInput = Schema.Struct({
  providerId: Schema.optional(Schema.String),
  action: Schema.optional(ManagedRecipeLifecycleActionSchema),
})
export type FrameworkRuntimeAlchemyProviderInput =
  typeof FrameworkRuntimeAlchemyProviderInput.Type

export const FrameworkRuntimeAlchemyProviderOutput = Schema.Struct({
  providerId: Schema.String,
  managedRecipeAlchemyType: Schema.String,
  providerCollection: Schema.String,
  lifecycleAction: ManagedRecipeLifecycleActionSchema,
})
export type FrameworkRuntimeAlchemyProviderOutput =
  typeof FrameworkRuntimeAlchemyProviderOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimeAlchemyProviderResource = defineAlchemyResource({
  id: "framework-runtime.managed-recipe-alchemy-provider.resource",
  kind: "external-service",
  alchemyType: ManagedRecipeAlchemyType,
  ownerRecipeId: frameworkRuntimeAlchemyProviderRecipeId,
  producedBy: [frameworkRuntimeAlchemyProviderRecipeId],
  consumedBy: [frameworkRuntimeAlchemyProviderRecipeId, LocalTimescaleManagedRecipeId],
  addressFields: ["providerId", "action"],
  addressSchema: FrameworkRuntimeAlchemyProviderInput as never,
  stateSchema: FrameworkRuntimeAlchemyProviderOutput as never,
  modes: ["read", "plan", "apply", "check", "destroy"],
  providerId: frameworkRuntimeAlchemyProviderRecipeId,
  programmaticResourceExport: "ManagedRecipeAlchemy",
  programmaticProviderExport: "ManagedRecipeAlchemyProvider",
  programmaticBridgeSourcePath: frameworkRuntimeAlchemySourcePath,
})

export const ManagedRecipeAlchemy = Resource<ManagedRecipeAlchemyResource<any, any>>(
  ManagedRecipeAlchemyType,
)

export const managedRecipeAlchemyDiff = (
  output: ManagedRecipeAlchemyOutput | undefined,
  requestedAction?: ManagedRecipeLifecycleAction,
): Diff => {
  if (output === undefined) return { action: "update" }
  if (requestedAction !== undefined && output.run.action !== requestedAction) {
    return { action: "update" }
  }
  if (output.receipt.status === "failed" || output.receipt.status === "blocked") {
    return { action: "update" }
  }
  if (["failed", "blocked", "drifted", "stale", "unknown"].includes(output.health.status)) {
    return { action: "update" }
  }
  return { action: "noop" }
}

export const ManagedRecipeAlchemyProvider = () =>
  Provider.succeed(ManagedRecipeAlchemy, {
    ...makeManagedRecipeAlchemyProvider(),
    diff: ({ news, output }) =>
      Effect.succeed(
        managedRecipeAlchemyDiff(
          output,
          (news as ManagedRecipeAlchemyProps).action ?? "apply",
        ),
      ),
  })

export class FrameworkRuntimeAlchemyProviders extends Provider.ProviderCollection<
  FrameworkRuntimeAlchemyProviders
>()("FrameworkRuntimeAlchemy") {}

export interface FrameworkRuntimeAlchemyProviderRecipeService {
  readonly provide: (
    input: FrameworkRuntimeAlchemyProviderInput,
  ) => Effect.Effect<FrameworkRuntimeAlchemyProviderOutput>
}

export class FrameworkRuntimeAlchemyProviderRecipe extends Context.Service<
  FrameworkRuntimeAlchemyProviderRecipe,
  FrameworkRuntimeAlchemyProviderRecipeService
>()("@attune/framework-runtime/FrameworkRuntimeAlchemyProviderRecipe") {}

export const frameworkRuntimeAlchemyProviders = () =>
  Layer.effect(
    FrameworkRuntimeAlchemyProviders,
    Provider.collection([ManagedRecipeAlchemy]),
  ).pipe(
    Layer.provide(ManagedRecipeAlchemyProvider()),
  )

export const FrameworkRuntimeAlchemyProviderRecipeLive: Layer.Layer<
  FrameworkRuntimeAlchemyProviderRecipe
> = Layer.succeed(
  FrameworkRuntimeAlchemyProviderRecipe,
  {
    provide: (input) =>
      Effect.succeed({
        providerId: input.providerId ?? frameworkRuntimeAlchemyProviderRecipeId,
        managedRecipeAlchemyType: ManagedRecipeAlchemyType,
        providerCollection: "FrameworkRuntimeAlchemyProviders",
        lifecycleAction: input.action ?? "apply",
      }),
  },
)

export const FrameworkRuntimeAlchemyProviderRecipeLayer = defineRecipeLayer({
  id: "framework-runtime.managed-recipe-alchemy-provider.layer",
  sourcePath: frameworkRuntimeAlchemySourcePath,
  exportName: "FrameworkRuntimeAlchemyProviderRecipeLive",
  layer: FrameworkRuntimeAlchemyProviderRecipeLive as never,
  provides: [{
    id: "framework-runtime.managed-recipe-alchemy-provider.service",
    service: FrameworkRuntimeAlchemyProviderRecipe as never,
  }],
})

export const provideFrameworkRuntimeAlchemy = (
  input: FrameworkRuntimeAlchemyProviderInput,
): Effect.Effect<FrameworkRuntimeAlchemyProviderOutput> =>
  Effect.gen(function* provideFrameworkRuntimeAlchemyBody() {
    const provider = yield* FrameworkRuntimeAlchemyProviderRecipe
    return yield* provider.provide(input)
  }).pipe(Effect.provide(FrameworkRuntimeAlchemyProviderRecipeLive))

export const FrameworkRuntimeAlchemyProviderHandler = defineRecipeHandler<
  FrameworkRuntimeAlchemyProviderInput,
  FrameworkRuntimeAlchemyProviderOutput
>({
  id: "framework-runtime.managed-recipe-alchemy-provider.handler",
  recipeId: frameworkRuntimeAlchemyProviderRecipeId,
  sourcePath: frameworkRuntimeAlchemySourcePath,
  exportName: "provideFrameworkRuntimeAlchemy",
  layer: FrameworkRuntimeAlchemyProviderRecipeLayer,
  emitsReceipts: ["framework-runtime.managed-recipe-alchemy-provider.ready"],
  handler: provideFrameworkRuntimeAlchemy,
})

export const FrameworkRuntimeAlchemyProviderRecipeDefinition = defineManagedRecipe({
  id: frameworkRuntimeAlchemyProviderRecipeId,
  projectId: "framework-runtime",
  title: "Provide the Effect Alchemy ManagedRecipe resource bridge",
  inputSchema: FrameworkRuntimeAlchemyProviderInput,
  outputSchema: FrameworkRuntimeAlchemyProviderOutput,
  allowedFiles: [frameworkRuntimeAlchemySourcePath],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  lifecycle: ["plan", "apply", "check", "destroy"],
  resourceKind: "managed-recipe-alchemy-provider",
  io: {
    inputSchema: FrameworkRuntimeAlchemyProviderInput,
    outputSchema: FrameworkRuntimeAlchemyProviderOutput,
    inputResources: [FrameworkRuntimeAlchemyProviderResource],
    outputResources: [FrameworkRuntimeAlchemyProviderResource],
  },
  handler: FrameworkRuntimeAlchemyProviderHandler,
  alchemy: {
    id: frameworkRuntimeAlchemyProviderBindingId,
    managedRecipeId: frameworkRuntimeAlchemyProviderRecipeId,
    alchemyResourceType: ManagedRecipeAlchemyType,
    providerId: frameworkRuntimeAlchemyProviderRecipeId,
    resource: FrameworkRuntimeAlchemyProviderResource,
    lifecycle: {
      plan: "managed-recipe-alchemy-provider.plan",
      apply: "managed-recipe-alchemy-provider.apply",
      check: "managed-recipe-alchemy-provider.check",
      destroy: "managed-recipe-alchemy-provider.destroy",
      diff: "managed-recipe-alchemy-provider.diff",
    },
    bindings: [LocalTimescaleManagedRecipeId],
  },
  alchemyDag: [{
    fromRecipeId: frameworkRuntimeAlchemyProviderRecipeId,
    toRecipeId: LocalTimescaleManagedRecipeId,
    resource: FrameworkRuntimeAlchemyProviderResource,
    kind: "manages",
    modes: ["plan", "apply", "check", "destroy"],
  }],
})

export const FrameworkRuntimeAlchemyProviderRecipes = [
  FrameworkRuntimeAlchemyProviderRecipeDefinition,
] as const

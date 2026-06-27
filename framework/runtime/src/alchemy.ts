import type { Diff } from "alchemy/Diff"
import * as Provider from "alchemy/Provider"
import { Resource } from "alchemy/Resource"
import { Effect, Layer } from "effect"
import {
  ManagedRecipeAlchemyType,
  makeManagedRecipeAlchemyProvider,
  type ManagedRecipeAlchemyOutput,
  type ManagedRecipeAlchemyProps,
  type ManagedRecipeAlchemyResource,
  type ManagedRecipeLifecycleAction,
} from "./RecipeKernel.js"

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

export const frameworkRuntimeAlchemyProviders = () =>
  Layer.effect(
    FrameworkRuntimeAlchemyProviders,
    Provider.collection([ManagedRecipeAlchemy]),
  ).pipe(
    Layer.provide(ManagedRecipeAlchemyProvider()),
  )

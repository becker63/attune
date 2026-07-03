import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

const PlatformAlchemyK8sProjectId = "platform-alchemy-k8s" as const
export const LocalClusterPlanRecipeId =
  "platform-alchemy-k8s.local-cluster-plan" as const
const LocalComputeStackRecipeId =
  "platform-alchemy-k8s.local-compute-stack" as const
const LocalClusterPlanResourceId =
  "platform-alchemy-k8s.local-cluster-plan.resource" as const
const LocalClusterPlanHandlerId =
  "platform-alchemy-k8s.local-cluster-plan.handler" as const
const LocalClusterPlanSourcePath =
  "packages/canopy/platform-alchemy-k8s/src/cluster/local-cluster.ts" as const

export const LocalClusterDriver = Schema.Literals(["k3d", "kind"])
export type LocalClusterDriver = typeof LocalClusterDriver.Type

export const LocalClusterCommandAction = Schema.Literals(["create", "delete", "kubeconfig", "smoke"])
export type LocalClusterCommandAction = typeof LocalClusterCommandAction.Type

export const LocalClusterCommandIntent = Schema.Struct({
  intentId: Schema.String,
  action: LocalClusterCommandAction,
  driver: LocalClusterDriver,
  argv: Schema.Array(Schema.String),
  display: Schema.String,
  executionBoundary: Schema.Literal("rendered-only"),
})
export type LocalClusterCommandIntent = typeof LocalClusterCommandIntent.Type

export const LocalClusterPlan = Schema.Struct({
  name: Schema.String,
  driver: LocalClusterDriver,
  create: LocalClusterCommandIntent,
  delete: LocalClusterCommandIntent,
  kubeconfig: LocalClusterCommandIntent,
  smoke: LocalClusterCommandIntent,
})
export type LocalClusterPlan = typeof LocalClusterPlan.Type

export interface LocalClusterOptions {
  readonly name?: string
  readonly driver?: LocalClusterDriver
  readonly agents?: number
}

export const LocalClusterRecipeInput = Schema.Struct({
  name: Schema.optional(Schema.String),
  driver: Schema.optional(LocalClusterDriver),
  agents: Schema.optional(Schema.Number),
})
export type LocalClusterRecipeInput = typeof LocalClusterRecipeInput.Type

// @attune-packet-target generated-runtime-projection eligible
export const LocalClusterPlanResource = defineAlchemyResource({
  id: LocalClusterPlanResourceId,
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  ownerRecipeId: LocalClusterPlanRecipeId,
  producedBy: [LocalClusterPlanRecipeId],
  consumedBy: [LocalComputeStackRecipeId],
  addressFields: ["name", "driver"],
  addressSchema: LocalClusterRecipeInput as never,
  stateSchema: LocalClusterPlan as never,
  modes: ["plan", "read"],
  programmaticResourceExport: "LocalClusterPlanResource",
  programmaticProviderExport: "makeLocalClusterPlan",
  programmaticBridgeSourcePath: LocalClusterPlanSourcePath,
})

const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\"'\"'")}'`

const commandIntent = (
  driver: LocalClusterDriver,
  name: string,
  action: LocalClusterCommandAction,
  argv: readonly string[],
): LocalClusterCommandIntent =>
  Schema.decodeUnknownSync(LocalClusterCommandIntent)({
    intentId: `local-cluster:${driver}:${name}:${action}`,
    action,
    driver,
    argv,
    display: renderCommand(argv),
    executionBoundary: "rendered-only",
  })

export const makeLocalClusterPlan = (options: LocalClusterOptions = {}): LocalClusterPlan => {
  const name = options.name ?? "attune-local"
  const driver = options.driver ?? "k3d"
  const agents = options.agents ?? 1

  if (driver === "kind") {
    return {
      name,
      driver,
      create: commandIntent(driver, name, "create", ["kind", "create", "cluster", "--name", name]),
      delete: commandIntent(driver, name, "delete", ["kind", "delete", "cluster", "--name", name]),
      kubeconfig: commandIntent(driver, name, "kubeconfig", ["kind", "get", "kubeconfig", "--name", name]),
      smoke: commandIntent(driver, name, "smoke", ["kubectl", "cluster-info", "--context", `kind-${name}`]),
    }
  }

  return {
    name,
    driver,
    create: commandIntent(driver, name, "create", [
      "k3d",
      "cluster",
      "create",
      name,
      "--agents",
      String(agents),
      "--k3s-arg",
      "--disable=traefik@server:*",
    ]),
    delete: commandIntent(driver, name, "delete", ["k3d", "cluster", "delete", name]),
    kubeconfig: commandIntent(driver, name, "kubeconfig", ["k3d", "kubeconfig", "get", name]),
    smoke: commandIntent(driver, name, "smoke", ["kubectl", "cluster-info", "--context", `k3d-${name}`]),
  }
}

export const renderCommand = (
  command: readonly string[] | Pick<LocalClusterCommandIntent, "argv">,
): string => ("argv" in command ? command.argv : command).map(shellQuote).join(" ")

const localClusterOptionsFromInput = (input: LocalClusterRecipeInput): LocalClusterOptions => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.driver === undefined ? {} : { driver: input.driver }),
  ...(input.agents === undefined ? {} : { agents: input.agents }),
})

export const LocalClusterPlanHandler = defineRecipeHandler<LocalClusterRecipeInput, LocalClusterPlan>({
  id: LocalClusterPlanHandlerId,
  recipeId: LocalClusterPlanRecipeId,
  sourcePath: LocalClusterPlanSourcePath,
  exportName: "makeLocalClusterPlan",
  handler: (input) => Effect.succeed(makeLocalClusterPlan(localClusterOptionsFromInput(input))) as never,
  emitsReceipts: ["platform-alchemy-k8s.local-cluster-plan.rendered"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LocalClusterPlanRecipe = defineProjectionRecipe({
  id: LocalClusterPlanRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Render local Kubernetes cluster command plan",
  inputSchema: LocalClusterRecipeInput as never,
  outputSchema: LocalClusterPlan as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: ["packages/canopy/platform-alchemy-k8s/src/cluster/**"],
  validationEvidence: ["platform-alchemy-k8s:test"],
  io: {
    inputSchema: LocalClusterRecipeInput as never,
    outputSchema: LocalClusterPlan as never,
    inputResources: [LocalClusterPlanResource],
    outputResources: [LocalClusterPlanResource],
  },
  handler: LocalClusterPlanHandler,
  alchemyDag: [{
    fromRecipeId: LocalClusterPlanRecipeId,
    toRecipeId: LocalComputeStackRecipeId,
    resource: LocalClusterPlanResource,
    kind: "projects",
    modes: ["plan", "read"],
  }],
})

export const LocalClusterRecipes = [LocalClusterPlanRecipe] as const

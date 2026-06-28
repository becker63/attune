import { Schema } from "effect"

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

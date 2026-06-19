import { Schema } from "effect"

export const LocalClusterDriver = Schema.Literals(["k3d", "kind"])
export type LocalClusterDriver = typeof LocalClusterDriver.Type

export const LocalClusterPlan = Schema.Struct({
  name: Schema.String,
  driver: LocalClusterDriver,
  create: Schema.Array(Schema.String),
  delete: Schema.Array(Schema.String),
  kubeconfig: Schema.Array(Schema.String),
  smoke: Schema.Array(Schema.String),
})
export type LocalClusterPlan = typeof LocalClusterPlan.Type

export interface LocalClusterOptions {
  readonly name?: string
  readonly driver?: LocalClusterDriver
  readonly agents?: number
}

const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\"'\"'")}'`

export const makeLocalClusterPlan = (options: LocalClusterOptions = {}): LocalClusterPlan => {
  const name = options.name ?? "attune-local"
  const driver = options.driver ?? "k3d"
  const agents = options.agents ?? 1

  if (driver === "kind") {
    return {
      name,
      driver,
      create: ["kind", "create", "cluster", "--name", name],
      delete: ["kind", "delete", "cluster", "--name", name],
      kubeconfig: ["kind", "get", "kubeconfig", "--name", name],
      smoke: ["kubectl", "cluster-info", "--context", `kind-${name}`],
    }
  }

  return {
    name,
    driver,
    create: [
      "k3d",
      "cluster",
      "create",
      name,
      "--agents",
      String(agents),
      "--k3s-arg",
      "--disable=traefik@server:*",
    ],
    delete: ["k3d", "cluster", "delete", name],
    kubeconfig: ["k3d", "kubeconfig", "get", name],
    smoke: ["kubectl", "cluster-info", "--context", `k3d-${name}`],
  }
}

export const renderCommand = (command: readonly string[]): string => command.map(shellQuote).join(" ")

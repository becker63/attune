import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  CanopyDeployPlanResource,
  canopyDeployPlanRecipeId,
  canopyNixosBootstrapCommandPlanRecipeId,
  shellQuote,
  ThinkCentreHost as ThinkCentreHostSchema,
  type ThinkCentreHost,
} from "../../model.js"

export interface NixosBootstrapCommandPlanInput {
  readonly host: ThinkCentreHost
  readonly sshTarget: string
  readonly hostFlake?: string
  readonly tokenFile?: string
  readonly tokenSource?: string
  readonly sshKey?: string
}

export const NixosBootstrapCommandPlanInputSchema = Schema.Struct({
  host: ThinkCentreHostSchema,
  sshTarget: Schema.String,
  hostFlake: Schema.optional(Schema.String),
  tokenFile: Schema.optional(Schema.String),
  tokenSource: Schema.optional(Schema.String),
  sshKey: Schema.optional(Schema.String),
})

export const NixosBootstrapCommandPlanOutput = Schema.Struct({
  target: Schema.String,
  commandPlan: Schema.String,
  commandCount: Schema.Number,
})
export type NixosBootstrapCommandPlanOutput = typeof NixosBootstrapCommandPlanOutput.Type

export const renderNixosBootstrapCommandPlan = (input: NixosBootstrapCommandPlanInput): string => {
  const hostFlake = input.hostFlake ?? "./nix/hosts"
  const tokenFile = input.tokenFile ?? "/var/lib/attune/secrets/k3s-server-token"
  const tokenSource = input.tokenSource ?? "<token-source>"
  const postInstallTarget = input.host.postInstallSshTarget
  const sshProbeArgs = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=5"]
  const nixosAnywhereArgs: string[] = []
  const scpArgs: string[] = []

  if (input.sshKey !== undefined && input.sshKey.length > 0) {
    nixosAnywhereArgs.push("--ssh-option", `IdentityFile=${input.sshKey}`)
    sshProbeArgs.push("-i", input.sshKey)
    scpArgs.push("-i", input.sshKey)
  }

  return [
    `# Probe installer SSH for ${input.host.hostname}:`,
    renderCommand(["ssh", ...sshProbeArgs, input.sshTarget, "true"]),
    "",
    "# Probe the destructive install target disk before confirming the wipe gate:",
    renderCommand([
      "ssh",
      ...sshProbeArgs,
      input.sshTarget,
      `test -e '${input.host.expectedDisk.device}' && lsblk -o NAME,SIZE,MODEL,SERIAL,TYPE,MOUNTPOINTS '${input.host.expectedDisk.device}'`,
    ]),
    "",
    `# Evaluate ${input.host.hostname}:`,
    renderCommand([
      "nix",
      "eval",
      `${hostFlake}#nixosConfigurations.${input.host.nixosConfiguration}.config.networking.hostName`,
    ]),
    "",
    `# Build ${input.host.hostname} locally:`,
    renderCommand([
      "nix",
      "build",
      `${hostFlake}#nixosConfigurations.${input.host.nixosConfiguration}.config.system.build.toplevel`,
    ]),
    "",
    "# Build the minimal installer ISO:",
    renderCommand([
      "nix",
      "build",
      `${hostFlake}#nixosConfigurations.attune-installer.config.system.build.isoImage`,
    ]),
    "",
    "# Install with nixos-anywhere after hardware/disk config is ready:",
    renderCommand([
      "nixos-anywhere",
      ...nixosAnywhereArgs,
      "--flake",
      `${hostFlake}#${input.host.nixosConfiguration}`,
      input.sshTarget,
    ]),
    "",
    `# Copy the runtime K3s token to ${postInstallTarget} after install, before K3s is expected to settle:`,
    renderCommand(["ssh", ...sshProbeArgs, postInstallTarget, "sudo install -d -m 0700 /var/lib/attune/secrets"]),
    renderCommand(["scp", ...scpArgs, tokenSource, `${postInstallTarget}:/tmp/attune-k3s-server-token`]),
    renderCommand([
      "ssh",
      ...sshProbeArgs,
      postInstallTarget,
      `sudo install -m 0600 /tmp/attune-k3s-server-token '${tokenFile}' && sudo rm -f /tmp/attune-k3s-server-token`,
    ]),
    "",
    "# Probe post-install Tailscale and K3s readiness:",
    renderCommand([
      "ssh",
      ...sshProbeArgs,
      postInstallTarget,
      "systemctl is-active --quiet tailscaled && tailscale status --json >/dev/null",
    ]),
    renderCommand(["ssh", ...sshProbeArgs, postInstallTarget, "sudo systemctl is-active --quiet attune-k3s-server"]),
    renderCommand(["ssh", ...sshProbeArgs, postInstallTarget, `sudo k3s kubectl get node '${input.host.hostname}' -o wide`]),
  ].join("\n")
}

const renderCommand = (parts: readonly string[]): string => parts.map(shellQuote).join(" ")

export const renderNixosBootstrapCommandPlanOutput = (
  input: NixosBootstrapCommandPlanInput,
): NixosBootstrapCommandPlanOutput => {
  const commandPlan = renderNixosBootstrapCommandPlan(input)
  return {
    target: input.host.hostname,
    commandPlan,
    commandCount: commandPlan.split("\n").filter((line) => line.startsWith("'")).length,
  }
}

export const NixosBootstrapCommandPlanAddress = Schema.Struct({
  target: Schema.String,
})
export type NixosBootstrapCommandPlanAddress = typeof NixosBootstrapCommandPlanAddress.Type

// @attune-packet-target generated-runtime-projection eligible
export const NixosBootstrapCommandPlanInputResource = defineAlchemyResource({
  id: "canopy.nixos-bootstrap-command-plan.input.resource",
  kind: "configuration",
  alchemyType: "attune:canopy:NixosBootstrapCommandPlanInput",
  ownerRecipeId: "canopy.nixos-bootstrap-command-plan",
  producedBy: ["canopy.deploy-plan"],
  consumedBy: ["canopy.nixos-bootstrap-command-plan"],
  addressFields: ["target"],
  addressSchema: NixosBootstrapCommandPlanAddress as never,
  stateSchema: NixosBootstrapCommandPlanInputSchema as never,
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const NixosBootstrapCommandPlanResource = defineAlchemyResource({
  id: "canopy.nixos-bootstrap-command-plan.resource",
  kind: "workflow-target",
  alchemyType: "attune:canopy:NixosBootstrapCommandPlan",
  ownerRecipeId: "canopy.nixos-bootstrap-command-plan",
  producedBy: ["canopy.nixos-bootstrap-command-plan"],
  consumedBy: ["canopy.observed-state"],
  addressFields: ["target"],
  addressSchema: NixosBootstrapCommandPlanAddress as never,
  stateSchema: NixosBootstrapCommandPlanOutput as never,
  modes: ["invoke", "project", "read"],
  programmaticResourceExport: "renderNixosBootstrapCommandPlanOutput",
  programmaticBridgeSourcePath: "packages/canopy/home-deployment/src/internal/bootstrap/NixosBootstrapCommandPlan.ts",
})

export const NixosBootstrapCommandPlanHandler = defineRecipeHandler<
  NixosBootstrapCommandPlanInput,
  NixosBootstrapCommandPlanOutput
>({
  id: "canopy.nixos-bootstrap-command-plan.handler",
  recipeId: canopyNixosBootstrapCommandPlanRecipeId,
  sourcePath: "packages/canopy/home-deployment/src/internal/bootstrap/NixosBootstrapCommandPlan.ts",
  exportName: "renderNixosBootstrapCommandPlanOutput",
  handler: (input) => Effect.succeed(renderNixosBootstrapCommandPlanOutput(input)) as never,
  emitsReceipts: ["canopy.nixos-bootstrap-command-plan.projected"],
})

// @attune-packet-target generated-runtime-projection eligible
export const NixosBootstrapCommandPlanRecipe = defineProjectionRecipe({
  id: canopyNixosBootstrapCommandPlanRecipeId,
  projectId: "home-deployment",
  title: "Render NixOS bootstrap command plan without live host mutation",
  inputSchema: NixosBootstrapCommandPlanInputSchema as never,
  outputSchema: NixosBootstrapCommandPlanOutput as never,
  nxTarget: "home-deployment:check",
  allowedFiles: [
    "packages/canopy/home-deployment/src/internal/bootstrap/NixosBootstrapCommandPlan.ts",
    "nix/hosts/**",
  ],
  validationEvidence: ["home-deployment:test", "workspace:policy-fast"],
  io: {
    inputSchema: NixosBootstrapCommandPlanInputSchema as never,
    outputSchema: NixosBootstrapCommandPlanOutput as never,
    inputResources: [CanopyDeployPlanResource, NixosBootstrapCommandPlanInputResource],
    outputResources: [NixosBootstrapCommandPlanResource],
  },
  handler: NixosBootstrapCommandPlanHandler as never,
  alchemyDag: [{
    fromRecipeId: canopyDeployPlanRecipeId,
    toRecipeId: canopyNixosBootstrapCommandPlanRecipeId,
    resource: CanopyDeployPlanResource,
    kind: "invokes",
    modes: ["invoke", "read"],
  }],
})

export const HomeDeploymentBootstrapRecipes = [NixosBootstrapCommandPlanRecipe] as const

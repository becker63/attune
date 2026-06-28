import { shellQuote, type ThinkCentreHost } from "../../model.js"

export interface NixosBootstrapCommandPlanInput {
  readonly host: ThinkCentreHost
  readonly sshTarget: string
  readonly hostFlake?: string
  readonly tokenFile?: string
  readonly tokenSource?: string
  readonly sshKey?: string
}

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

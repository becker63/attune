import { Schema } from "effect"

export const shellQuote = (value: string): string => `'${value.replaceAll("'", "'\"'\"'")}'`

export const renderCommand = (command: readonly string[]): string => command.map(shellQuote).join(" ")

export interface CommandPlan {
  readonly argv: readonly string[]
  readonly display: string
}

export const commandPlan = (argv: readonly string[]): CommandPlan => ({
  argv,
  display: renderCommand(argv),
})

export const ThinkCentreRole = Schema.Literals(["network"])
export type ThinkCentreRole = typeof ThinkCentreRole.Type

export const ManualGateStatus = Schema.Literals(["waiting", "confirmed"])
export type ManualGateStatus = typeof ManualGateStatus.Type

export const ResourceStatus = Schema.Literals(["blocked", "ready", "planned"])
export type ResourceStatus = typeof ResourceStatus.Type

export const OperationClassification = Schema.Literals(["safe", "external", "irreversible"])
export type OperationClassification = typeof OperationClassification.Type

export const DeploymentPhase = Schema.Literals([
  "operator",
  "secrets",
  "discovery",
  "artifacts",
  "usb",
  "hosts",
  "tailscale",
  "comin",
  "smoke",
  "deferred",
])
export type DeploymentPhase = typeof DeploymentPhase.Type

export const ResourceKind = Schema.Literals([
  "OperatorMachine",
  "OperatorTailscale",
  "X86NixBuilder",
  "SopsKey",
  "SopsRecipientMetadata",
  "SopsSecretSet",
  "SopsRecipientRotation",
  "ThinkCentreMachine",
  "LanDiscoveryScan",
  "MachineBinding",
  "ManualGate",
  "NixBuild",
  "InstallerIso",
  "UsbInstallMedia",
  "UsbMediaWrite",
  "SshReachability",
  "DiskIdentityProbe",
  "DiskoLayout",
  "NixosAnywhereExtraFiles",
  "NixosAnywhereInstall",
  "TailscaleSecretAvailability",
  "TailscaleReadiness",
  "CominReadiness",
  "NetworkSmokeCheck",
  "DeferredCapability",
])
export type ResourceKind = typeof ResourceKind.Type

export const EvidenceSchemaName = Schema.Literals(["json", "file-ref", "operator-note", "redacted-secret-ref"])
export type EvidenceSchemaName = typeof EvidenceSchemaName.Type

export const ManualActionKind = Schema.Literals(["OpenUrl", "RunCommand", "InsertUsb", "BootUsb", "ConfirmEvidence"])
export type ManualActionKind = typeof ManualActionKind.Type

export const EvidenceRequirement = Schema.Struct({
  id: Schema.String,
  summary: Schema.String,
  schema: EvidenceSchemaName,
  secret: Schema.Boolean,
})
export type EvidenceRequirement = typeof EvidenceRequirement.Type

export const ManualAction = Schema.Struct({
  id: Schema.String,
  kind: ManualActionKind,
  summary: Schema.String,
  url: Schema.optional(Schema.String),
  command: Schema.optional(Schema.Array(Schema.String)),
  evidenceId: Schema.optional(Schema.String),
})
export type ManualAction = typeof ManualAction.Type

export const OperatorTailscaleConfig = Schema.Struct({
  tailnet: Schema.String,
  oauthClientIdEnv: Schema.String,
  oauthClientSecretEnv: Schema.String,
  authKeySecretName: Schema.String,
  authKeyAdminUrl: Schema.String,
  oauthDocsUrl: Schema.String,
  tags: Schema.Array(Schema.String),
})
export type OperatorTailscaleConfig = typeof OperatorTailscaleConfig.Type

export const X86BuilderConfig = Schema.Struct({
  targetSystem: Schema.String,
  setupGuideUrl: Schema.String,
  nixConfigPath: Schema.String,
  probePackage: Schema.String,
})
export type X86BuilderConfig = typeof X86BuilderConfig.Type

export const SopsConfig = Schema.Struct({
  sopsFile: Schema.String,
  recipientMetadataFile: Schema.String,
  encryptedSecretsFile: Schema.String,
  operatorAgeKeyPath: Schema.String,
  bootstrapAgeKeyPath: Schema.String,
  bootstrapAgeRecipientPath: Schema.String,
  runtimeSecretsPath: Schema.String,
  extraFilesRoot: Schema.String,
})
export type SopsConfig = typeof SopsConfig.Type

export const OperatorMachine = Schema.Struct({
  id: Schema.String,
  expectedSystem: Schema.String,
  nixConfigPath: Schema.String,
  localStateDir: Schema.String,
  allowedDiscoveryRanges: Schema.Array(Schema.String),
  installerUsbDevice: Schema.optional(Schema.String),
  tailscale: OperatorTailscaleConfig,
  x86Builder: X86BuilderConfig,
  sops: SopsConfig,
})
export type OperatorMachine = typeof OperatorMachine.Type

export const HostDisk = Schema.Struct({
  device: Schema.String,
  serial: Schema.optional(Schema.String),
})
export type HostDisk = typeof HostDisk.Type

export const HostLanDiscovery = Schema.Struct({
  bindingId: Schema.String,
  allowedRanges: Schema.Array(Schema.String),
  interfaceHint: Schema.optional(Schema.String),
})
export type HostLanDiscovery = typeof HostLanDiscovery.Type

export const HostSopsRecipient = Schema.Struct({
  metadataKey: Schema.String,
  publicKeyPath: Schema.String,
  bootstrapRecipientPath: Schema.String,
})
export type HostSopsRecipient = typeof HostSopsRecipient.Type

export const HostTailscale = Schema.Struct({
  nodeName: Schema.String,
  authSecretKey: Schema.String,
  authSecretPath: Schema.String,
  tags: Schema.Array(Schema.String),
})
export type HostTailscale = typeof HostTailscale.Type

export const HostComin = Schema.Struct({
  repositoryUrl: Schema.String,
  ref: Schema.String,
  flakeOutput: Schema.String,
})
export type HostComin = typeof HostComin.Type

export const ThinkCentreHost = Schema.Struct({
  hostname: Schema.String,
  role: ThinkCentreRole,
  targetSystem: Schema.String,
  nixosConfiguration: Schema.String,
  hostFlakeOutput: Schema.String,
  installerSshTarget: Schema.String,
  postInstallSshTarget: Schema.String,
  expectedDisk: HostDisk,
  lanDiscovery: HostLanDiscovery,
  sopsRecipient: HostSopsRecipient,
  tailscale: HostTailscale,
  comin: HostComin,
  machineIdPath: Schema.String,
})
export type ThinkCentreHost = typeof ThinkCentreHost.Type

export const HomeDeploymentConfig = Schema.Struct({
  name: Schema.String,
  hostFlakeUri: Schema.String,
  rootFlakeUri: Schema.String,
  operator: OperatorMachine,
  hosts: Schema.NonEmptyArray(ThinkCentreHost),
})
export type HomeDeploymentConfig = typeof HomeDeploymentConfig.Type

export interface ManualGate {
  readonly id: string
  readonly title: string
  readonly prompt: string
  readonly host?: string
  readonly status: ManualGateStatus
  readonly command?: CommandPlan
  readonly evidenceRequirements: readonly EvidenceRequirement[]
  readonly manualActions: readonly ManualAction[]
}

export interface PlannedResource {
  readonly id: string
  readonly phase: DeploymentPhase
  readonly kind: ResourceKind
  readonly provider: string
  readonly operation: OperationClassification
  readonly status: ResourceStatus
  readonly dependsOn: readonly string[]
  readonly summary: string
  readonly command?: CommandPlan
  readonly observeCommand?: CommandPlan
  readonly blockedReason?: string
  readonly destructive?: boolean
  readonly evidenceRequirements: readonly EvidenceRequirement[]
  readonly manualActions: readonly ManualAction[]
  readonly secretRefs: readonly string[]
  readonly observes: readonly string[]
  readonly deferred?: boolean
}

export interface HomeDeploymentPlan {
  readonly name: string
  readonly operator: OperatorMachine
  readonly hosts: readonly ThinkCentreHost[]
  readonly resources: readonly PlannedResource[]
}

const tailscaleAuthKeyAdminUrl = "https://login.tailscale.com/admin/settings/keys"
const tailscaleOauthDocsUrl = "https://tailscale.com/docs/features/oauth-clients"
const nixBuilderGuideUrl = "https://nixos.org/manual/nix/stable/advanced-topics/distributed-builds"

const defaultAllowedRanges: readonly string[] = []
const cominRepositoryUrl = "https://github.com/becker63/attune.git"
const cominRef = "main"

const host = (index: 1 | 2 | 3): ThinkCentreHost => {
  const hostname = `attune-cp-${index}`
  const upper = `ATTUNE_CP_${index}`
  return {
    hostname,
    role: "network",
    targetSystem: "x86_64-linux",
    nixosConfiguration: hostname,
    hostFlakeOutput: `nixosConfigurations.${hostname}`,
    installerSshTarget: `root@attune-installer-cp-${index}.local`,
    postInstallSshTarget: `attune@${hostname}`,
    expectedDisk: {
      device: `/dev/disk/by-id/REPLACE_ME_${upper}`,
    },
    lanDiscovery: {
      bindingId: `${hostname}:lan-binding`,
      allowedRanges: [...defaultAllowedRanges],
    },
    sopsRecipient: {
      metadataKey: hostname,
      publicKeyPath: `nix/hosts/secrets/recipients/${hostname}.age`,
      bootstrapRecipientPath: "nix/hosts/local/bootstrap-age-recipient.txt",
    },
    tailscale: {
      nodeName: hostname,
      authSecretKey: `${hostname}_tailscale_auth_key`,
      authSecretPath: `/run/secrets/tailscale/${hostname}/auth-key`,
      tags: ["tag:attune-thinkcentre"],
    },
    comin: {
      repositoryUrl: cominRepositoryUrl,
      ref: cominRef,
      flakeOutput: hostname,
    },
    machineIdPath: "/etc/machine-id",
  }
}

export const defaultHomeDeploymentConfig = (): HomeDeploymentConfig => ({
  name: "thinkcentre-day0",
  hostFlakeUri: "path:./nix/hosts",
  rootFlakeUri: ".",
  operator: {
    id: "asahi-operator",
    expectedSystem: "aarch64-linux",
    nixConfigPath: "/etc/nix/nix.conf",
    localStateDir: ".attune/day0",
    allowedDiscoveryRanges: [...defaultAllowedRanges],
    tailscale: {
      tailnet: "-",
      oauthClientIdEnv: "TAILSCALE_OAUTH_CLIENT_ID",
      oauthClientSecretEnv: "TAILSCALE_OAUTH_CLIENT_SECRET",
      authKeySecretName: "thinkcentre-oauth-or-auth-key",
      authKeyAdminUrl: tailscaleAuthKeyAdminUrl,
      oauthDocsUrl: tailscaleOauthDocsUrl,
      tags: ["tag:attune-thinkcentre"],
    },
    x86Builder: {
      targetSystem: "x86_64-linux",
      setupGuideUrl: nixBuilderGuideUrl,
      nixConfigPath: "/etc/nix/nix.conf",
      probePackage: "nixpkgs#hello",
    },
    sops: {
      sopsFile: ".sops.yaml",
      recipientMetadataFile: "nix/hosts/secrets/recipients.json",
      encryptedSecretsFile: "nix/hosts/local/thinkcentre-secrets.yaml",
      operatorAgeKeyPath: "~/.config/sops/age/keys.txt",
      bootstrapAgeKeyPath: "nix/hosts/local/bootstrap-age-key.txt",
      bootstrapAgeRecipientPath: "nix/hosts/local/bootstrap-age-recipient.txt",
      runtimeSecretsPath: "/etc/attune/sops/thinkcentre-secrets.yaml",
      extraFilesRoot: ".attune/day0/extra-files",
    },
  },
  hosts: [host(1), host(2), host(3)],
})

export interface GateConfirmationState {
  readonly confirmedGateIds: ReadonlySet<string>
  readonly completedResourceIds?: ReadonlySet<string>
  readonly failedResourceIds?: ReadonlySet<string>
}

export const emptyGateState: GateConfirmationState = {
  confirmedGateIds: new Set(),
}

const gateStatus = (state: GateConfirmationState, id: string): ManualGateStatus =>
  state.confirmedGateIds.has(id) ? "confirmed" : "waiting"

const isConfirmed = (state: GateConfirmationState, id: string): boolean => state.confirmedGateIds.has(id)

const isCompleted = (state: GateConfirmationState, id: string): boolean => state.completedResourceIds?.has(id) ?? false

const isFailed = (state: GateConfirmationState, id: string): boolean => state.failedResourceIds?.has(id) ?? false

const dependenciesSatisfied = (state: GateConfirmationState, ids: readonly string[]): boolean =>
  ids.every((id) => isConfirmed(state, id) || isCompleted(state, id))

const blockedUnlessSatisfied = (
  state: GateConfirmationState,
  dependencyIds: readonly string[],
): Pick<PlannedResource, "status" | "blockedReason"> => {
  const missing = dependencyIds.filter((id) => !isConfirmed(state, id) && !isCompleted(state, id))

  if (missing.length > 0) {
    return {
      status: "blocked",
      blockedReason: `Waiting for dependency resource(s): ${missing.join(", ")}`,
    }
  }

  return { status: "planned" }
}

const evidence = (
  id: string,
  summary: string,
  schema: EvidenceSchemaName = "json",
  secret = false,
): EvidenceRequirement => Schema.decodeUnknownSync(EvidenceRequirement)({ id, summary, schema, secret })

const action = (input: unknown): ManualAction => Schema.decodeUnknownSync(ManualAction)(input)

const resource = (
  input: Omit<PlannedResource, "evidenceRequirements" | "manualActions" | "secretRefs" | "observes"> &
    Partial<Pick<PlannedResource, "evidenceRequirements" | "manualActions" | "secretRefs" | "observes">>,
): PlannedResource => ({
  evidenceRequirements: [],
  manualActions: [],
  secretRefs: [],
  observes: [],
  ...input,
})

const statusFromDependencies = (
  state: GateConfirmationState,
  id: string,
  dependsOn: readonly string[],
): Pick<PlannedResource, "status" | "blockedReason"> => {
  if (isCompleted(state, id)) {
    return { status: "ready" }
  }
  if (isFailed(state, id)) {
    return { status: "blocked", blockedReason: `Resource ${id} previously failed.` }
  }
  return blockedUnlessSatisfied(state, dependsOn)
}

const manualGateResource = (gate: ManualGate, dependsOn: readonly string[]): PlannedResource =>
  resource({
    id: gate.id,
    phase: gate.id.includes(":usb-booted") || gate.id.includes(":disk-wipe-confirmed") ? "hosts" : "secrets",
    kind: "ManualGate",
    provider: "ManualGateProvider",
    operation: "safe",
    status: gate.status === "confirmed" ? "ready" : "blocked",
    dependsOn,
    summary: gate.prompt,
    ...(gate.command === undefined ? {} : { command: gate.command }),
    evidenceRequirements: gate.evidenceRequirements,
    manualActions: gate.manualActions,
    ...(gate.status === "waiting" ? { blockedReason: gate.title } : {}),
  })

const sshProbeCommand = (target: string, remoteCommand: string): CommandPlan =>
  commandPlan(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", target, remoteCommand])

const installerSshProbeCommand = (hostConfig: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(hostConfig.installerSshTarget, "true")

const operatorTailscaleCommand = (): CommandPlan =>
  commandPlan([
    "sh",
    "-c",
    "set -euo pipefail; status=\"$(tailscale status --json)\"; printf '%s\\n' \"$status\"; printf '%s\\n' \"$status\" | jq -e '.BackendState == \"Running\"' >/dev/null",
  ])

const diskProbeCommand = (hostConfig: ThinkCentreHost): CommandPlan => {
  const disk = shellQuote(hostConfig.expectedDisk.device)
  const serialCheck =
    hostConfig.expectedDisk.serial === undefined
      ? ""
      : ` && test "$(udevadm info --query=property --name=${disk} | sed -n 's/^ID_SERIAL=//p')" = ${shellQuote(hostConfig.expectedDisk.serial)}`

  return sshProbeCommand(
    hostConfig.installerSshTarget,
    `test -e ${disk}${serialCheck} && lsblk -J -o NAME,SIZE,MODEL,SERIAL,TYPE,MOUNTPOINTS ${disk}`,
  )
}

const tailscaleReadinessCommand = (hostConfig: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(
    hostConfig.postInstallSshTarget,
    [
      "systemctl is-active --quiet tailscaled",
      "status=\"$(tailscale status --json)\"",
      "printf '%s\\n' \"$status\" | jq -e '.BackendState == \"Running\"' >/dev/null",
      `printf '%s\\n' "$status" | jq -e --arg host ${shellQuote(hostConfig.tailscale.nodeName)} '((.Self.HostName // "") == $host) or ((.Self.DNSName // "") | contains($host))' >/dev/null`,
      ...hostConfig.tailscale.tags.map((tag) =>
        `printf '%s\\n' "$status" | jq -e --arg tag ${shellQuote(tag)} '(.Self.Tags // []) | index($tag)' >/dev/null`
      ),
    ].join(" && "),
  )

const tailscaleSecretCommand = (hostConfig: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(hostConfig.postInstallSshTarget, `test -r ${shellQuote(hostConfig.tailscale.authSecretPath)}`)

const cominReadinessCommand = (hostConfig: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(
    hostConfig.postInstallSshTarget,
    [
      "systemctl is-active --quiet comin",
      `jq -e --arg repo ${shellQuote(hostConfig.comin.repositoryUrl)} --arg ref ${shellQuote(hostConfig.comin.ref)} --arg output ${shellQuote(hostConfig.comin.flakeOutput)} '.repositoryUrl == $repo and .ref == $ref and .flakeOutput == $output' /etc/attune/day0.json >/dev/null`,
      "journalctl -u comin -n 20 --no-pager >/dev/null",
    ].join(" && "),
  )

const hostSmokeCommand = (hostConfig: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(
    hostConfig.postInstallSshTarget,
    [
      `test "$(hostname)" = ${shellQuote(hostConfig.hostname)}`,
      `test "$(uname -m)" = 'x86_64'`,
      `test -s ${shellQuote(hostConfig.machineIdPath)}`,
      "systemctl is-active --quiet tailscaled",
      "systemctl is-active --quiet comin",
    ].join(" && "),
  )

const installedHostObservationCommand = (hostConfig: ThinkCentreHost): CommandPlan =>
  sshProbeCommand(
    hostConfig.postInstallSshTarget,
    [
      `test "$(hostname)" = ${shellQuote(hostConfig.hostname)}`,
      `test "$(uname -m)" = 'x86_64'`,
      `test -s ${shellQuote(hostConfig.machineIdPath)}`,
      "test -r /etc/attune/day0.json",
      `jq -e --arg host ${shellQuote(hostConfig.hostname)} --arg output ${shellQuote(hostConfig.comin.flakeOutput)} --arg repo ${shellQuote(hostConfig.comin.repositoryUrl)} --arg ref ${shellQuote(hostConfig.comin.ref)} --arg disk ${shellQuote(hostConfig.expectedDisk.device)} --arg secret ${shellQuote(hostConfig.tailscale.authSecretPath.replace(/^\/run\/secrets\//, ""))} '.hostName == $host and .targetSystem == "x86_64-linux" and .flakeOutput == $output and .repositoryUrl == $repo and .ref == $ref and .diskDevice == $disk and .tailscaleSecretName == $secret' /etc/attune/day0.json >/dev/null`,
      `test -r ${shellQuote(hostConfig.tailscale.authSecretPath)}`,
      "test -r /etc/attune/sops/thinkcentre-secrets.yaml",
      "test -r /var/lib/sops-nix/key.txt",
      "test -e /run/current-system",
    ].join(" && "),
  )

const nixosAnywhereCommand = (config: HomeDeploymentConfig, hostConfig: ThinkCentreHost): CommandPlan =>
  commandPlan([
    "nixos-anywhere",
    "--flake",
    `${config.hostFlakeUri}#${hostConfig.nixosConfiguration}`,
    "--extra-files",
    `${config.operator.sops.extraFilesRoot}/${hostConfig.hostname}`,
    hostConfig.installerSshTarget,
  ])

const writeLocalDisksScript = (config: HomeDeploymentConfig): string => [
  "install -d nix/hosts/local",
  "cat > nix/hosts/local/disks.nix <<'EOF'",
  "{",
  ...config.hosts.map((hostConfig) => `  ${hostConfig.hostname} = ${JSON.stringify(hostConfig.expectedDisk.device)};`),
  "}",
  "EOF",
].join("\n")

const diskoValidateCommand = (config: HomeDeploymentConfig, hostConfig: ThinkCentreHost): CommandPlan =>
  commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      writeLocalDisksScript(config),
      `nix eval ${shellQuote(`${config.hostFlakeUri}#nixosConfigurations.${hostConfig.nixosConfiguration}.config.disko.devices.disk.main.device`)}`,
    ].join("\n"),
  ])

const hostClosureCommand = (config: HomeDeploymentConfig, hostConfig: ThinkCentreHost): CommandPlan =>
  commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      writeLocalDisksScript(config),
      `nix build ${shellQuote(`${config.hostFlakeUri}#nixosConfigurations.${hostConfig.nixosConfiguration}.config.system.build.toplevel`)}`,
    ].join("\n"),
  ])

const installerImageCommand = (config: HomeDeploymentConfig): CommandPlan =>
  commandPlan([
    "nix",
    "build",
    `${config.hostFlakeUri}#nixosConfigurations.attune-installer.config.system.build.isoImage`,
  ])

const x86BuilderProbeCommand = (config: HomeDeploymentConfig): CommandPlan =>
  commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      "activation='sudo nixos-rebuild switch --flake /home/becker/nixos-from-scratch#nixos-btw --option builders \"\"'",
      "platforms=$(nix config show extra-platforms 2>/dev/null || nix show-config 2>/dev/null | sed -n 's/^extra-platforms = //p')",
      `case " $platforms " in *" ${config.operator.x86Builder.targetSystem} "*) ;; *) echo "missing ${config.operator.x86Builder.targetSystem} in live Nix extra-platforms; activate with: $activation" >&2; exit 1 ;; esac`,
      "test -r /proc/sys/fs/binfmt_misc/x86_64-linux || { echo \"missing x86_64-linux binfmt registration; activate with: $activation\" >&2; exit 1; }",
      "grep -q '^enabled' /proc/sys/fs/binfmt_misc/x86_64-linux || { echo \"x86_64-linux binfmt registration is disabled; activate with: $activation\" >&2; exit 1; }",
      [
        "nix build --option builders '' --no-link --impure --expr",
        shellQuote([
          "let",
          `  flake = builtins.getFlake (toString ./${config.hostFlakeUri.replace(/^path:\.?\//, "")});`,
          `  pkgs = import flake.inputs.nixpkgs { system = ${JSON.stringify(config.operator.x86Builder.targetSystem)}; };`,
          "in pkgs.runCommand \"attune-x86-builder-probe\" {} \"printf attune-x86-builder-probe > $out\"",
        ].join("\n")),
      ].join(" "),
      `nix build --dry-run ${shellQuote(`${config.hostFlakeUri}#nixosConfigurations.attune-cp-1.config.system.build.toplevel`)} --option builders ''`,
    ].join("\n"),
  ])

const operatorAgeKeyCommand = (config: HomeDeploymentConfig): CommandPlan =>
  commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `test -r "$HOME/${config.operator.sops.operatorAgeKeyPath.replace(/^~\//, "")}" || test -r ${shellQuote(config.operator.sops.bootstrapAgeKeyPath)}`,
    ].join("; "),
  ])

const lanDiscoveryCommand = (config: HomeDeploymentConfig): CommandPlan => {
  const configuredRanges = config.operator.allowedDiscoveryRanges
  const discoverySteps =
    configuredRanges.length > 0
      ? ["ip -j route show scope link", ...configuredRanges.map((range) => `nmap -sn ${shellQuote(range)}`)]
      : [
          'routes="$(ip -j route show scope link)"',
          'printf \'%s\\n\' "$routes"',
          [
            'ranges="$(printf \'%s\\n\' "$routes" | jq -r \'',
            '[.[]',
            '| select(((.flags // []) | index("linkdown") | not))',
            '| .dst',
            '| select(test("^[0-9.]+/[0-9]+$"))',
            '| select((test("^(127|169\\\\.254)\\\\.") | not))',
            '] | unique | .[]',
            '\')"',
          ].join(" "),
          'test -n "$ranges" || { echo "no active IPv4 link-scope routes available for LAN discovery" >&2; exit 1; }',
          'printf \'%s\\n\' "$ranges" | while IFS= read -r range; do nmap -sn "$range"; done',
        ]

  return commandPlan(["sh", "-c", ["set -euo pipefail", ...discoverySteps].join("; ")])
}

const installerIsoCommand = (): CommandPlan =>
  commandPlan(["sh", "-c", "set -euo pipefail; readlink -f result/iso/*.iso"])

const tailscaleAuthMaterialCommand = (config: HomeDeploymentConfig): CommandPlan => {
  const hosts = config.hosts.map((hostConfig) => hostConfig.hostname).join(" ")
  const tagsJson = JSON.stringify(config.operator.tailscale.tags)
  const tailnet = config.operator.tailscale.tailnet
  const secretFile = config.operator.sops.encryptedSecretsFile
  const ageKey = config.operator.sops.bootstrapAgeKeyPath
  const ageRecipient = config.operator.sops.bootstrapAgeRecipientPath

  return commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `mkdir -p ${shellQuote(secretFile.replace(/\/[^/]+$/, ""))}`,
      `tmp="$(mktemp)"`,
      `trap 'rm -f "$tmp"' EXIT`,
      `recipient=""`,
      `if test -r ${shellQuote(ageRecipient)}; then recipient="$(tr -d '\\n' < ${shellQuote(ageRecipient)})"; fi`,
      `if test -z "$recipient" && test -r ${shellQuote(ageKey)}; then recipient="$(sed -n 's/^# public key: //p' ${shellQuote(ageKey)} | head -n 1)"; fi`,
      `test -n "$recipient" || { echo "missing bootstrap age recipient at ${ageRecipient}" >&2; exit 2; }`,
      `printf 'tailscale:\\n' > "$tmp"`,
      `token=""`,
      `if test -n "\${${config.operator.tailscale.oauthClientIdEnv}:-}" && test -n "\${${config.operator.tailscale.oauthClientSecretEnv}:-}"; then token="$(curl -fsS -d "client_id=\${${config.operator.tailscale.oauthClientIdEnv}}" -d "client_secret=\${${config.operator.tailscale.oauthClientSecretEnv}}" https://api.tailscale.com/api/v2/oauth/token | jq -r '.access_token')"; fi`,
      `for host in ${hosts}; do host_var="$(printf '%s_TAILSCALE_AUTH_KEY' "$host" | tr '[:lower:]-' '[:upper:]_')"; key="$(printenv "$host_var" || true)"; if test -z "$key" && test -n "$token"; then key="$(curl -fsS -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{"capabilities":{"devices":{"create":{"reusable":false,"ephemeral":false,"preauthorized":true,"tags":${tagsJson}}}},"expirySeconds":604800,"description":"Attune ThinkCentre day-0 bootstrap"}' ${shellQuote(`https://api.tailscale.com/api/v2/tailnet/${tailnet}/keys`)} | jq -r '.key')"; fi; if test -z "$key" && test -n "\${ATTUNE_TAILSCALE_AUTH_KEY:-}"; then key="$ATTUNE_TAILSCALE_AUTH_KEY"; fi; test -n "$key" || { echo "missing redacted auth key material for $host" >&2; exit 2; }; printf '  %s:\\n    auth-key: "%s"\\n' "$host" "$key" >> "$tmp"; done`,
      `SOPS_AGE_RECIPIENTS="$recipient" sops --encrypt --input-type yaml --output-type yaml "$tmp" > ${shellQuote(secretFile)}`,
      `chmod 0400 ${shellQuote(secretFile)}`,
      `echo "wrote encrypted Tailscale auth material for ${hosts} to ${secretFile}"`,
    ].join("; "),
  ])
}

const tailscaleAuthMaterialObservationCommand = (config: HomeDeploymentConfig): CommandPlan => {
  const hosts = config.hosts.map((hostConfig) => hostConfig.hostname).join(" ")
  const hostAuthKeyAwk = shellQuote([
    "$0 == \"  \" host \":\" { in_host = 1; next }",
    "in_host && $0 ~ /^  [^ ].*:$/ { in_host = 0 }",
    "in_host && $0 ~ /^[[:space:]]+auth-key:[[:space:]]*\".+\"/ { found = 1 }",
    "END { exit found ? 0 : 1 }",
  ].join(" "))

  return commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `secret_file=${shellQuote(config.operator.sops.encryptedSecretsFile)}`,
      `test -r "$secret_file"`,
      `plaintext="$(mktemp)"`,
      `trap 'rm -f "$plaintext"' EXIT`,
      `sops --decrypt --output-type yaml "$secret_file" > "$plaintext"`,
      `for host in ${hosts}; do awk -v host="$host" ${hostAuthKeyAwk} "$plaintext" || { echo "missing encrypted Tailscale auth material for $host" >&2; exit 1; }; done`,
      `echo "encrypted Tailscale auth material already has redacted host entries for ${hosts}"`,
    ].join("; "),
  ])
}

const sopsUpdateCommand = (config: HomeDeploymentConfig): CommandPlan =>
  commandPlan([
    "sh",
    "-c",
    `set -euo pipefail; sops --decrypt --output-type yaml ${shellQuote(config.operator.sops.encryptedSecretsFile)} >/dev/null`,
  ])

const stageExtraFilesCommand = (config: HomeDeploymentConfig, hostConfig: ThinkCentreHost): CommandPlan => {
  const root = `${config.operator.sops.extraFilesRoot}/${hostConfig.hostname}`
  return commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `root=${shellQuote(root)}`,
      `install -d -m 0700 "$root/var/lib/sops-nix" "$root/etc/attune/sops"`,
      `install -m 0400 ${shellQuote(config.operator.sops.bootstrapAgeKeyPath)} "$root/var/lib/sops-nix/key.txt"`,
      `install -m 0400 ${shellQuote(config.operator.sops.encryptedSecretsFile)} "$root${config.operator.sops.runtimeSecretsPath}"`,
      `find "$root" -type f -printf '%P\\n' | sort`,
    ].join("; "),
  ])
}

const stageExtraFilesObservationCommand = (config: HomeDeploymentConfig, hostConfig: ThinkCentreHost): CommandPlan => {
  const root = `${config.operator.sops.extraFilesRoot}/${hostConfig.hostname}`
  const runtimeSecretsPath = config.operator.sops.runtimeSecretsPath

  return commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `root=${shellQuote(root)}`,
      `key="$root/var/lib/sops-nix/key.txt"`,
      `secret="$root${runtimeSecretsPath}"`,
      `test -d "$root"`,
      `test -r "$key"`,
      `test -r "$secret"`,
      `cmp -s ${shellQuote(config.operator.sops.bootstrapAgeKeyPath)} "$key"`,
      `cmp -s ${shellQuote(config.operator.sops.encryptedSecretsFile)} "$secret"`,
      `test "$(stat -c %a "$key")" = "400"`,
      `test "$(stat -c %a "$secret")" = "400"`,
      `printf '%s\\n' "var/lib/sops-nix/key.txt" ${shellQuote(runtimeSecretsPath.replace(/^\//, ""))}`,
    ].join("; "),
  ])
}

const sopsRecipientRotationCommand = (config: HomeDeploymentConfig, hostConfig: ThinkCentreHost): CommandPlan => {
  const operatorAgeKeyRelativePath = config.operator.sops.operatorAgeKeyPath.replace(/^~\//, "")

  return commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `recipient_path=${shellQuote(hostConfig.sopsRecipient.publicKeyPath)}`,
      `secret_file=${shellQuote(config.operator.sops.encryptedSecretsFile)}`,
      `install -d "$(dirname "$recipient_path")"`,
      `ssh ${shellQuote(hostConfig.postInstallSshTarget)} 'sudo cat /etc/ssh/ssh_host_ed25519_key.pub' | ssh-to-age > "$recipient_path.tmp"`,
      `test -s "$recipient_path.tmp"`,
      `mv "$recipient_path.tmp" "$recipient_path"`,
      `plaintext="$(mktemp)"`,
      `trap 'rm -f "$plaintext" "$secret_file.tmp" "$recipient_path.tmp"' EXIT`,
      `sops --decrypt --output-type yaml "$secret_file" > "$plaintext"`,
      `operator_age_key="$HOME/${operatorAgeKeyRelativePath}"`,
      `recipients="$( { test -r "$operator_age_key" && sed -n 's/^# public key: //p' "$operator_age_key" | head -n 1; cat nix/hosts/secrets/recipients/*.age; } | awk 'NF' | sort -u | paste -sd, -)"`,
      `test -n "$recipients"`,
      `SOPS_AGE_RECIPIENTS="$recipients" sops --encrypt --input-type yaml --output-type yaml "$plaintext" > "$secret_file.tmp"`,
      `mv "$secret_file.tmp" "$secret_file"`,
      `echo "rotated SOPS recipients for ${hostConfig.hostname} without printing secret values"`,
    ].join("; "),
  ])
}

const sopsRecipientRotationObservationCommand = (
  config: HomeDeploymentConfig,
  hostConfig: ThinkCentreHost,
): CommandPlan =>
  commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `recipient_path=${shellQuote(hostConfig.sopsRecipient.publicKeyPath)}`,
      `secret_file=${shellQuote(config.operator.sops.encryptedSecretsFile)}`,
      `tmp="$(mktemp)"`,
      `trap 'rm -f "$tmp"' EXIT`,
      `test -s "$recipient_path"`,
      `ssh ${shellQuote(hostConfig.postInstallSshTarget)} 'sudo cat /etc/ssh/ssh_host_ed25519_key.pub' | ssh-to-age > "$tmp"`,
      `test -s "$tmp"`,
      `cmp -s "$tmp" "$recipient_path"`,
      `sops --decrypt --output-type yaml "$secret_file" >/dev/null`,
      `echo "SOPS recipient already matches ${hostConfig.hostname} host SSH key and encrypted secrets decrypt"`,
    ].join("; "),
  ])

const usbWriteCommand = (config: HomeDeploymentConfig): CommandPlan | undefined => {
  const device = config.operator.installerUsbDevice
  if (device === undefined || device.length === 0) {
    return undefined
  }

  return commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `device=${shellQuote(device)}`,
      `test -b "$device"`,
      `iso="$(readlink -f result/iso/*.iso)"`,
      `sudo dd if="$iso" of="$device" bs=4M status=progress conv=fsync`,
      `sync`,
      `echo "installer ISO written to $device"`,
    ].join("; "),
  ])
}

const usbWriteObservationCommand = (config: HomeDeploymentConfig): CommandPlan | undefined => {
  const device = config.operator.installerUsbDevice
  if (device === undefined || device.length === 0) {
    return undefined
  }

  return commandPlan([
    "sh",
    "-c",
    [
      "set -euo pipefail",
      `device=${shellQuote(device)}`,
      `test -b "$device"`,
      `iso="$(readlink -f result/iso/*.iso)"`,
      `size="$(stat -c%s "$iso")"`,
      `sudo cmp -n "$size" "$iso" "$device"`,
      `echo "approved installer USB already matches $iso on $device"`,
    ].join("; "),
  ])
}

const isPlaceholderDisk = (hostConfig: ThinkCentreHost): boolean => hostConfig.expectedDisk.device.includes("REPLACE_ME")

const assertFixedThinkCentreHosts = (config: HomeDeploymentConfig): void => {
  const expected = ["attune-cp-1", "attune-cp-2", "attune-cp-3"]
  const actual = config.hosts.map((item) => item.hostname).sort()
  if (actual.length !== expected.length || actual.some((hostname, index) => hostname !== expected[index])) {
    throw new Error(`ThinkCentre day-0 deployment requires exactly ${expected.join(", ")}.`)
  }
  for (const hostConfig of config.hosts) {
    if (hostConfig.targetSystem !== "x86_64-linux") {
      throw new Error(`${hostConfig.hostname} must target x86_64-linux.`)
    }
  }
}

export const manualGatesForHost = (hostConfig: ThinkCentreHost, state: GateConfirmationState): readonly ManualGate[] => [
  {
    id: `${hostConfig.hostname}:lan-binding-confirmed`,
    title: `${hostConfig.hostname} LAN discovery binding required`,
    prompt: `Bind one discovered installer candidate to ${hostConfig.hostname} before probing installer SSH.`,
    host: hostConfig.hostname,
    status: gateStatus(state, `${hostConfig.hostname}:lan-binding-confirmed`),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:lan-binding-evidence`, "Candidate IP, MAC, hostname hint, and SSH host key mapped to this ThinkCentre."),
    ],
    manualActions: [
      action({
        id: `${hostConfig.hostname}:inspect-lan-candidates`,
        kind: "ConfirmEvidence",
        summary: `Choose the LAN discovery candidate that physically corresponds to ${hostConfig.hostname}.`,
        evidenceId: `${hostConfig.hostname}:lan-binding-evidence`,
      }),
    ],
  },
  {
    id: `${hostConfig.hostname}:usb-booted`,
    title: `${hostConfig.hostname} booted from installer USB`,
    prompt: `Boot ${hostConfig.hostname} from the Attune NixOS installer USB and wait for SSH at ${hostConfig.installerSshTarget}.`,
    host: hostConfig.hostname,
    status: gateStatus(state, `${hostConfig.hostname}:usb-booted`),
    command: installerSshProbeCommand(hostConfig),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:usb-boot-evidence`, "Installer boot proof including observed SSH target and host identity hints."),
    ],
    manualActions: [
      action({
        id: `${hostConfig.hostname}:boot-installer-usb`,
        kind: "BootUsb",
        summary: `Physically boot ${hostConfig.hostname} from the prepared NixOS installer USB.`,
        evidenceId: `${hostConfig.hostname}:usb-boot-evidence`,
      }),
    ],
  },
  {
    id: `${hostConfig.hostname}:disk-wipe-confirmed`,
    title: `${hostConfig.hostname} destructive disk install confirmed`,
    prompt: `Confirm ${hostConfig.hostname} may be wiped at ${hostConfig.expectedDisk.device}.`,
    host: hostConfig.hostname,
    status: gateStatus(state, `${hostConfig.hostname}:disk-wipe-confirmed`),
    command: diskProbeCommand(hostConfig),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:disk-identity-evidence`, "Fresh disk probe with by-id path, size, model, serial, and host binding."),
      evidence(`${hostConfig.hostname}:destructive-approval`, "Host-scoped approval that this exact disk may be wiped.", "operator-note"),
    ],
    manualActions: [
      action({
        id: `${hostConfig.hostname}:review-disk-probe`,
        kind: "ConfirmEvidence",
        summary: `Review disk probe evidence for ${hostConfig.expectedDisk.device} and confirm it is safe to wipe.`,
        evidenceId: `${hostConfig.hostname}:destructive-approval`,
      }),
    ],
  },
]

export const createHomeDeploymentPlan = (
  input: HomeDeploymentConfig = defaultHomeDeploymentConfig(),
  state: GateConfirmationState = emptyGateState,
): HomeDeploymentPlan => {
  const config = Schema.decodeUnknownSync(HomeDeploymentConfig)(input)
  assertFixedThinkCentreHosts(config)

  const resources: PlannedResource[] = [
    ...operatorDeploymentResources(config, state),
    ...secretDeploymentResources(config, state),
    ...discoveryDeploymentResources(config, state),
    ...artifactDeploymentResources(config, state),
    ...usbDeploymentResources(config, state),
  ]

  for (const hostConfig of config.hosts) {
    resources.push(...hostDeploymentResources(config, hostConfig, state))
  }

  resources.push(...finalDeploymentResources(config, state))

  return {
    name: config.name,
    operator: config.operator,
    hosts: config.hosts,
    resources,
  }
}

const operatorDeploymentResources = (
  config: HomeDeploymentConfig,
  state: GateConfirmationState,
): readonly PlannedResource[] => [
  resource({
    id: "operator-machine",
    phase: "operator",
    kind: "OperatorMachine",
    provider: "OperatorMachineProvider",
    operation: "safe",
    dependsOn: [],
    summary: "Observe the Asahi operator laptop, local Nix daemon, Tailscale state, SOPS state, and local interfaces.",
    command: commandPlan(["uname", "-m"]),
    observes: [
      "builtins.currentSystem",
      config.operator.nixConfigPath,
      "tailscaled.service",
      config.operator.sops.operatorAgeKeyPath,
    ],
    ...statusFromDependencies(state, "operator-machine", []),
  }),
  resource({
    id: "operator-tailscale",
    phase: "operator",
    kind: "OperatorTailscale",
    provider: "TailscaleProvider",
    operation: "external",
    dependsOn: ["operator-machine"],
    summary: "Join or verify the Asahi laptop on Tailscale before generating ThinkCentre host auth material.",
    command: operatorTailscaleCommand(),
    manualActions: [
      action({
        id: "operator-tailscale-login",
        kind: "RunCommand",
        summary: "If the laptop is not logged in, run Tailscale login from the operator machine.",
        command: ["sudo", "tailscale", "up"],
      }),
    ],
    observes: ["tailscaled.service", "tailscale status --json"],
    ...statusFromDependencies(state, "operator-tailscale", ["operator-machine"]),
  }),
  resource({
    id: "operator-x86-nix-builder",
    phase: "operator",
    kind: "X86NixBuilder",
    provider: "NixProvider",
    operation: "safe",
    dependsOn: ["operator-machine"],
    summary: "Verify laptop-local x86_64-linux Nix building before installer ISO or host closures are built.",
    command: x86BuilderProbeCommand(config),
    manualActions: [
      action({
        id: "operator-x86-builder-activate",
        kind: "RunCommand",
        summary: "Activate the laptop-local NixOS x86 builder config if the live probe is blocked.",
        command: [
          "sudo",
          "nixos-rebuild",
          "switch",
          "--flake",
          "/home/becker/nixos-from-scratch#nixos-btw",
          "--option",
          "builders",
          "",
        ],
      }),
      action({
        id: "operator-x86-builder-nix-conf",
        kind: "ConfirmEvidence",
        summary: `Record supported systems or builders from ${config.operator.x86Builder.nixConfigPath}.`,
        evidenceId: "operator-x86-builder-evidence",
      }),
    ],
    evidenceRequirements: [
      evidence("operator-x86-builder-evidence", "Supported systems, builder declaration, and small x86_64-linux build probe output."),
    ],
    observes: ["nix show-config", "x86_64-linux build probe"],
    ...statusFromDependencies(state, "operator-x86-nix-builder", ["operator-machine"]),
  }),
]

const secretDeploymentResources = (
  config: HomeDeploymentConfig,
  state: GateConfirmationState,
): readonly PlannedResource[] => [
  resource({
    id: "operator-sops-age-key",
    phase: "secrets",
    kind: "SopsKey",
    provider: "SopsProvider",
    operation: "safe",
    dependsOn: ["operator-machine"],
    summary: "Verify the operator SOPS age key and bootstrap age recipient path without exposing private key material.",
    command: operatorAgeKeyCommand(config),
    manualActions: [
      action({
        id: "generate-bootstrap-age-key",
        kind: "RunCommand",
        summary: "Generate a bootstrap age key if host-specific recipients are not available before first boot.",
        command: [
          "sh",
          "-c",
          `install -d ${shellQuote(config.operator.sops.bootstrapAgeKeyPath.replace(/\/[^/]+$/, ""))} && age-keygen -o ${shellQuote(config.operator.sops.bootstrapAgeKeyPath)} && sed -n 's/^# public key: //p' ${shellQuote(config.operator.sops.bootstrapAgeKeyPath)} > ${shellQuote(config.operator.sops.bootstrapAgeRecipientPath)}`,
        ],
      }),
    ],
    evidenceRequirements: [
      evidence("operator-age-key-ref", "Reference to the local operator SOPS age key path.", "file-ref", true),
      evidence("bootstrap-age-recipient-ref", "Public bootstrap age recipient used only for first boot.", "file-ref"),
    ],
    secretRefs: [config.operator.sops.operatorAgeKeyPath, config.operator.sops.bootstrapAgeKeyPath],
    ...statusFromDependencies(state, "operator-sops-age-key", ["operator-machine"]),
  }),
  resource({
    id: "sops-recipient-metadata",
    phase: "secrets",
    kind: "SopsRecipientMetadata",
    provider: "SopsProvider",
    operation: "safe",
    dependsOn: ["operator-sops-age-key"],
    summary: "Validate public recipient metadata for the operator and all ThinkCentre bootstrap recipients.",
    command: commandPlan(["test", "-r", config.operator.sops.recipientMetadataFile]),
    evidenceRequirements: [
      evidence("sops-recipient-metadata", "Recipient metadata contains operator and attune-cp-* public recipients.", "file-ref"),
    ],
    ...statusFromDependencies(state, "sops-recipient-metadata", ["operator-sops-age-key"]),
  }),
  resource({
    id: "tailscale-auth-material",
    phase: "secrets",
    kind: "SopsSecretSet",
    provider: "TailscaleProvider",
    operation: "external",
    dependsOn: ["operator-tailscale", "sops-recipient-metadata"],
    summary: "Create or import Tailscale auth material through OAuth when configured, otherwise prompt for a manual auth key.",
    command: tailscaleAuthMaterialCommand(config),
    observeCommand: tailscaleAuthMaterialObservationCommand(config),
    manualActions: [
      action({
        id: "tailscale-oauth-docs",
        kind: "OpenUrl",
        summary: "Create a Tailscale OAuth client with the auth_keys scope and the configured ThinkCentre tag.",
        url: config.operator.tailscale.oauthDocsUrl,
      }),
      action({
        id: "tailscale-auth-key-admin",
        kind: "OpenUrl",
        summary: "Fallback: generate a reusable, pre-approved, tagged auth key in the Tailscale admin console.",
        url: config.operator.tailscale.authKeyAdminUrl,
      }),
      action({
        id: "tailscale-auth-key-evidence",
        kind: "ConfirmEvidence",
        summary: "Record only a redacted SOPS secret reference for the auth material.",
        evidenceId: "tailscale-auth-secret-ref",
      }),
    ],
    evidenceRequirements: [
      evidence("tailscale-oauth-env", "TAILSCALE_OAUTH_CLIENT_ID and TAILSCALE_OAUTH_CLIENT_SECRET availability, or explicit manual fallback.", "redacted-secret-ref", true),
      evidence("tailscale-auth-secret-ref", "Encrypted SOPS path containing host Tailscale auth material.", "redacted-secret-ref", true),
    ],
    secretRefs: [config.operator.tailscale.authKeySecretName],
    observes: [config.operator.tailscale.oauthClientIdEnv, config.operator.tailscale.oauthClientSecretEnv],
    ...statusFromDependencies(state, "tailscale-auth-material", ["operator-tailscale", "sops-recipient-metadata"]),
  }),
  resource({
    id: "sops-secret-set",
    phase: "secrets",
    kind: "SopsSecretSet",
    provider: "SopsProvider",
    operation: "external",
    dependsOn: ["tailscale-auth-material"],
    summary: "Validate or update the encrypted SOPS secret set consumed by sops-nix on first boot.",
    command: sopsUpdateCommand(config),
    evidenceRequirements: [
      evidence("sops-encrypted-secret-set", "Encrypted SOPS file with host Tailscale auth keys and no plaintext values.", "file-ref", true),
    ],
    secretRefs: [config.operator.sops.encryptedSecretsFile],
    ...statusFromDependencies(state, "sops-secret-set", ["tailscale-auth-material"]),
  }),
]

const discoveryDeploymentResources = (
  config: HomeDeploymentConfig,
  state: GateConfirmationState,
): readonly PlannedResource[] => [
  resource({
    id: "host-inventory",
    phase: "discovery",
    kind: "ThinkCentreMachine",
    provider: "MachineInventoryProvider",
    operation: "safe",
    dependsOn: ["operator-machine"],
    summary: "Record the fixed ThinkCentre machine inventory: attune-cp-1, attune-cp-2, attune-cp-3.",
    evidenceRequirements: [
      evidence("host-inventory-evidence", "Operator-checked inventory with hostnames, target systems, flake outputs, and disk slots."),
    ],
    observes: config.hosts.map((hostConfig) => hostConfig.hostname),
    ...statusFromDependencies(state, "host-inventory", ["operator-machine"]),
  }),
  resource({
    id: "lan-discovery-scan",
    phase: "discovery",
    kind: "LanDiscoveryScan",
    provider: "LanDiscoveryProvider",
    operation: "safe",
    dependsOn: ["operator-machine", "host-inventory"],
    summary: `Scan only configured local ranges for installer candidates: ${config.operator.allowedDiscoveryRanges.join(", ")}.`,
    command: lanDiscoveryCommand(config),
    evidenceRequirements: [
      evidence("lan-discovery-candidates", "Candidate IP, MAC, hostname hints, SSH reachability, and scan timestamp."),
    ],
    observes: config.operator.allowedDiscoveryRanges,
    ...statusFromDependencies(state, "lan-discovery-scan", ["operator-machine", "host-inventory"]),
  }),
]

const artifactDeploymentResources = (
  config: HomeDeploymentConfig,
  state: GateConfirmationState,
): readonly PlannedResource[] => [
  resource({
    id: "installer-image",
    phase: "artifacts",
    kind: "NixBuild",
    provider: "NixProvider",
    operation: "safe",
    dependsOn: ["operator-tailscale", "operator-x86-nix-builder", "sops-secret-set"],
    summary: "Build the x86_64-linux Attune NixOS installer image used for ThinkCentre bootstrap.",
    command: installerImageCommand(config),
    evidenceRequirements: [
      evidence("installer-image-build", "Store path and builder evidence for the x86_64-linux installer ISO."),
    ],
    ...statusFromDependencies(state, "installer-image", ["operator-tailscale", "operator-x86-nix-builder", "sops-secret-set"]),
  }),
  resource({
    id: "installer-iso",
    phase: "artifacts",
    kind: "InstallerIso",
    provider: "NixProvider",
    operation: "safe",
    dependsOn: ["installer-image"],
    summary: "Expose the built installer ISO as the USB media source artifact.",
    command: installerIsoCommand(),
    evidenceRequirements: [
      evidence("installer-iso-path", "Resolved ISO path, store path, and checksum when available.", "file-ref"),
    ],
    ...statusFromDependencies(state, "installer-iso", ["installer-image"]),
  }),
]

const usbDeploymentResources = (
  config: HomeDeploymentConfig,
  state: GateConfirmationState,
): readonly PlannedResource[] => {
  const writeCommand = usbWriteCommand(config)
  const observeCommand = usbWriteObservationCommand(config)
  return [
    manualGateResource({
      id: "usb-media-selected",
      title: "Installer USB media selection required",
      prompt: "Select the removable USB device that may be overwritten with the Attune installer ISO.",
      status: gateStatus(state, "usb-media-selected"),
      evidenceRequirements: [
        evidence("usb-media-evidence", "USB block device path, model, serial, and confirmation that it is removable."),
      ],
      manualActions: [
        action({
          id: "insert-installer-usb",
          kind: "InsertUsb",
          summary: "Insert the USB drive intended to become the installer media.",
          evidenceId: "usb-media-evidence",
        }),
      ],
    }, ["installer-iso"]),
    manualGateResource({
      id: "usb-media-write-approved",
      title: "Installer USB write approval required",
      prompt: "Approve overwriting the selected removable USB media with the installer image.",
      status: gateStatus(state, "usb-media-write-approved"),
      evidenceRequirements: [
        evidence("usb-write-approval", "Operator approval to overwrite the selected removable USB device.", "operator-note"),
      ],
      manualActions: [
        action({
          id: "approve-usb-write",
          kind: "ConfirmEvidence",
          summary: "Confirm the selected removable USB device can be overwritten.",
          evidenceId: "usb-write-approval",
        }),
      ],
    }, ["usb-media-selected"]),
    resource({
      id: "installer-usb-written",
      phase: "usb",
      kind: "UsbMediaWrite",
      provider: "UsbMediaProvider",
      operation: "irreversible",
      dependsOn: ["installer-iso", "usb-media-selected", "usb-media-write-approved"],
      summary: "Write the installer ISO to the approved removable USB device and record non-secret evidence.",
      ...(writeCommand === undefined ? {} : { command: writeCommand }),
      ...(observeCommand === undefined ? {} : { observeCommand }),
      destructive: true,
      evidenceRequirements: [
        evidence("installer-usb-write-result", "Write command identity, target USB device identity, and completion evidence."),
      ],
      ...statusFromDependencies(state, "installer-usb-written", [
        "installer-iso",
        "usb-media-selected",
        "usb-media-write-approved",
      ]),
    }),
  ]
}

const hostDeploymentResources = (
  config: HomeDeploymentConfig,
  hostConfig: ThinkCentreHost,
  state: GateConfirmationState,
): readonly PlannedResource[] => {
  const gates = manualGatesForHost(hostConfig, state)
  const lanBindingGate = `${hostConfig.hostname}:lan-binding-confirmed`
  const usbBootGate = `${hostConfig.hostname}:usb-booted`
  const diskApprovalGate = `${hostConfig.hostname}:disk-wipe-confirmed`
  const diskLayoutDeps = [`${hostConfig.hostname}:disk-identity-probe`, `${hostConfig.hostname}:host-closure`]
  const diskoBlocked = isPlaceholderDisk(hostConfig)
    ? {
        status: "blocked" as const,
        blockedReason: `Disko target for ${hostConfig.hostname} still uses placeholder disk ${hostConfig.expectedDisk.device}.`,
      }
    : statusFromDependencies(state, `${hostConfig.hostname}:disko-layout`, diskLayoutDeps)
  const hostClosureStatus = isPlaceholderDisk(hostConfig)
    ? {
        status: "blocked" as const,
        blockedReason: `Host closure for ${hostConfig.hostname} waits for an approved disk identity instead of ${hostConfig.expectedDisk.device}.`,
      }
    : statusFromDependencies(state, `${hostConfig.hostname}:host-closure`, [
        "operator-x86-nix-builder",
        "sops-secret-set",
        `${hostConfig.hostname}:machine-reference`,
      ])

  return [
    resource({
      id: `${hostConfig.hostname}:machine-reference`,
      phase: "discovery",
      kind: "ThinkCentreMachine",
      provider: "MachineInventoryProvider",
      operation: "safe",
      dependsOn: ["host-inventory"],
      summary: `Typed machine reference for ${hostConfig.hostname} targeting ${hostConfig.targetSystem}.`,
      evidenceRequirements: [
        evidence(`${hostConfig.hostname}:machine-reference`, "Host output, target architecture, LAN binding slot, SOPS slot, Tailscale slot, and comin slot."),
      ],
      observes: [
        hostConfig.targetSystem,
        hostConfig.hostFlakeOutput,
        hostConfig.lanDiscovery.bindingId,
        hostConfig.sopsRecipient.metadataKey,
        hostConfig.tailscale.nodeName,
        hostConfig.comin.flakeOutput,
      ],
      ...statusFromDependencies(state, `${hostConfig.hostname}:machine-reference`, ["host-inventory"]),
    }),
    resource({
      id: `${hostConfig.hostname}:host-closure`,
      phase: "artifacts",
      kind: "NixBuild",
      provider: "NixProvider",
      operation: "safe",
      dependsOn: ["operator-x86-nix-builder", "sops-secret-set", `${hostConfig.hostname}:machine-reference`],
      summary: `Evaluate and build the x86_64-linux NixOS closure for ${hostConfig.hostname}.`,
      command: hostClosureCommand(config, hostConfig),
      evidenceRequirements: [
        evidence(`${hostConfig.hostname}:host-closure-build`, "Host closure store path, flake ref, target system, and builder identity."),
      ],
      ...hostClosureStatus,
    }),
    manualGateResource(gates[0]!, ["lan-discovery-scan", `${hostConfig.hostname}:machine-reference`]),
    resource({
      id: `${hostConfig.hostname}:lan-binding`,
      phase: "discovery",
      kind: "MachineBinding",
      provider: "MachineInventoryProvider",
      operation: "safe",
      dependsOn: ["lan-discovery-scan", lanBindingGate],
      summary: `Bind a discovered LAN installer candidate to ${hostConfig.hostname}.`,
      evidenceRequirements: [
        evidence(`${hostConfig.hostname}:bound-installer-target`, "Bound installer candidate and SSH host key evidence."),
      ],
      ...statusFromDependencies(state, `${hostConfig.hostname}:lan-binding`, ["lan-discovery-scan", lanBindingGate]),
    }),
    manualGateResource(gates[1]!, ["installer-usb-written", `${hostConfig.hostname}:lan-binding`]),
    resource({
      id: `${hostConfig.hostname}:installer-ssh-reachability`,
      phase: "hosts",
      kind: "SshReachability",
      provider: "SshProvider",
      operation: "safe",
      dependsOn: [usbBootGate, `${hostConfig.hostname}:lan-binding`],
      summary: `Probe installer SSH reachability for ${hostConfig.hostname} at ${hostConfig.installerSshTarget}.`,
      command: installerSshProbeCommand(hostConfig),
      evidenceRequirements: [
        evidence(`${hostConfig.hostname}:installer-ssh`, "Installer SSH reachability and host key evidence."),
      ],
      ...statusFromDependencies(state, `${hostConfig.hostname}:installer-ssh-reachability`, [
        usbBootGate,
        `${hostConfig.hostname}:lan-binding`,
      ]),
    }),
    resource({
      id: `${hostConfig.hostname}:disk-identity-probe`,
      phase: "hosts",
      kind: "DiskIdentityProbe",
      provider: "DiskoProvider",
      operation: "safe",
      dependsOn: [`${hostConfig.hostname}:installer-ssh-reachability`],
      summary: `Probe and normalize disk identity for ${hostConfig.hostname} before any destructive Disko phase.`,
      command: diskProbeCommand(hostConfig),
      evidenceRequirements: [
        evidence(`${hostConfig.hostname}:disk-identity-evidence`, "Fresh disk by-id path, model, size, serial, and host binding."),
      ],
      ...statusFromDependencies(state, `${hostConfig.hostname}:disk-identity-probe`, [
        `${hostConfig.hostname}:installer-ssh-reachability`,
      ]),
    }),
    resource({
      id: `${hostConfig.hostname}:disko-layout`,
      phase: "hosts",
      kind: "DiskoLayout",
      provider: "DiskoProvider",
      operation: "safe",
      dependsOn: diskLayoutDeps,
      summary: `Validate the Disko whole-disk UEFI GPT layout for ${hostConfig.hostname} targets ${hostConfig.expectedDisk.device}.`,
      command: diskoValidateCommand(config, hostConfig),
      evidenceRequirements: [
        evidence(`${hostConfig.hostname}:disko-layout-evidence`, "Disko device path and whole-disk UEFI GPT layout evaluation evidence."),
      ],
      ...diskoBlocked,
    }),
    manualGateResource(gates[2]!, [`${hostConfig.hostname}:disk-identity-probe`, `${hostConfig.hostname}:disko-layout`]),
    resource({
      id: `${hostConfig.hostname}:nixos-anywhere-extra-files`,
      phase: "hosts",
      kind: "NixosAnywhereExtraFiles",
      provider: "NixosAnywhereProvider",
      operation: "external",
      dependsOn: ["sops-secret-set", `${hostConfig.hostname}:machine-reference`],
      summary: `Stage bootstrap SOPS/Tailscale material for ${hostConfig.hostname} through provider-owned extra-files inputs.`,
      command: stageExtraFilesCommand(config, hostConfig),
      observeCommand: stageExtraFilesObservationCommand(config, hostConfig),
      evidenceRequirements: [
        evidence(`${hostConfig.hostname}:extra-files-identity`, "Extra-files directory identity and redacted list of staged paths.", "redacted-secret-ref", true),
      ],
      secretRefs: [hostConfig.sopsRecipient.bootstrapRecipientPath, hostConfig.tailscale.authSecretPath],
      ...statusFromDependencies(state, `${hostConfig.hostname}:nixos-anywhere-extra-files`, [
        "sops-secret-set",
        `${hostConfig.hostname}:machine-reference`,
      ]),
    }),
    resource({
      id: `${hostConfig.hostname}:nixos-anywhere-install`,
      phase: "hosts",
      kind: "NixosAnywhereInstall",
      provider: "NixosAnywhereProvider",
      operation: "irreversible",
      dependsOn: [
        "installer-image",
        `${hostConfig.hostname}:host-closure`,
        `${hostConfig.hostname}:nixos-anywhere-extra-files`,
        `${hostConfig.hostname}:disko-layout`,
        diskApprovalGate,
      ],
      summary: `Install ${hostConfig.hostname} with nixos-anywhere using the embedded Disko layout.`,
      command: nixosAnywhereCommand(config, hostConfig),
      observeCommand: installedHostObservationCommand(hostConfig),
      destructive: true,
      evidenceRequirements: [
        evidence(`${hostConfig.hostname}:nixos-anywhere-result`, "Command identity, phase result, exit code, timing, and post-install proof."),
      ],
      ...statusFromDependencies(state, `${hostConfig.hostname}:nixos-anywhere-install`, [
        "installer-image",
        `${hostConfig.hostname}:host-closure`,
        `${hostConfig.hostname}:nixos-anywhere-extra-files`,
        `${hostConfig.hostname}:disko-layout`,
        diskApprovalGate,
      ]),
    }),
    postInstallResources(config, hostConfig, state),
  ].flat()
}

const postInstallResources = (
  config: HomeDeploymentConfig,
  hostConfig: ThinkCentreHost,
  state: GateConfirmationState,
): readonly PlannedResource[] => [
  resource({
    id: `${hostConfig.hostname}:post-install-ssh-reachability`,
    phase: "tailscale",
    kind: "SshReachability",
    provider: "SshProvider",
    operation: "safe",
    dependsOn: [`${hostConfig.hostname}:nixos-anywhere-install`],
    summary: `Probe post-install SSH reachability for ${hostConfig.hostname} at ${hostConfig.postInstallSshTarget}.`,
    command: sshProbeCommand(hostConfig.postInstallSshTarget, "true"),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:post-install-ssh`, "Post-install SSH reachability and host key evidence."),
    ],
    ...statusFromDependencies(state, `${hostConfig.hostname}:post-install-ssh-reachability`, [
      `${hostConfig.hostname}:nixos-anywhere-install`,
    ]),
  }),
  resource({
    id: `${hostConfig.hostname}:tailscale-secret-availability`,
    phase: "tailscale",
    kind: "TailscaleSecretAvailability",
    provider: "SopsProvider",
    operation: "safe",
    dependsOn: [`${hostConfig.hostname}:post-install-ssh-reachability`, "sops-secret-set"],
    summary: `Verify sops-nix decrypted Tailscale auth secret availability for ${hostConfig.hostname}.`,
    command: tailscaleSecretCommand(hostConfig),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:tailscale-secret-available`, "Runtime secret path exists without exposing auth key contents.", "redacted-secret-ref", true),
    ],
    secretRefs: [hostConfig.tailscale.authSecretPath],
    ...statusFromDependencies(state, `${hostConfig.hostname}:tailscale-secret-availability`, [
      `${hostConfig.hostname}:post-install-ssh-reachability`,
      "sops-secret-set",
    ]),
  }),
  resource({
    id: `${hostConfig.hostname}:tailscale-readiness`,
    phase: "tailscale",
    kind: "TailscaleReadiness",
    provider: "TailscaleProvider",
    operation: "safe",
    dependsOn: [
      `${hostConfig.hostname}:post-install-ssh-reachability`,
      `${hostConfig.hostname}:tailscale-secret-availability`,
    ],
    summary: `Verify host-level Tailscale and SSH readiness for ${hostConfig.hostname}.`,
    command: tailscaleReadinessCommand(hostConfig),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:tailscale-node`, "Tailscale node identity, MagicDNS, tailnet reachability, and SSH proof."),
    ],
    observes: [hostConfig.tailscale.nodeName, ...hostConfig.tailscale.tags],
    ...statusFromDependencies(state, `${hostConfig.hostname}:tailscale-readiness`, [
      `${hostConfig.hostname}:post-install-ssh-reachability`,
      `${hostConfig.hostname}:tailscale-secret-availability`,
    ]),
  }),
  resource({
    id: `${hostConfig.hostname}:comin-readiness`,
    phase: "comin",
    kind: "CominReadiness",
    provider: "CominProvider",
    operation: "safe",
    dependsOn: [`${hostConfig.hostname}:tailscale-readiness`],
    summary: `Verify comin steady-state convergence for ${hostConfig.hostname}.`,
    command: cominReadinessCommand(hostConfig),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:comin-status`, "Service health, repository URL, ref, host output, last activation, and failures."),
    ],
    observes: [hostConfig.comin.repositoryUrl, hostConfig.comin.ref, hostConfig.comin.flakeOutput],
    ...statusFromDependencies(state, `${hostConfig.hostname}:comin-readiness`, [
      `${hostConfig.hostname}:tailscale-readiness`,
    ]),
  }),
  resource({
    id: `${hostConfig.hostname}:sops-recipient-rotation`,
    phase: "secrets",
    kind: "SopsRecipientRotation",
    provider: "SopsProvider",
    operation: "external",
    dependsOn: [`${hostConfig.hostname}:post-install-ssh-reachability`, "sops-secret-set"],
    summary: `Rotate ${hostConfig.hostname} SOPS access from the bootstrap age recipient to host-specific recipients after first boot.`,
    command: sopsRecipientRotationCommand(config, hostConfig),
    observeCommand: sopsRecipientRotationObservationCommand(config, hostConfig),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:sops-recipient-rotation`, "Host SSH-derived age recipient and SOPS updatekeys evidence.", "redacted-secret-ref", true),
    ],
    secretRefs: [config.operator.sops.encryptedSecretsFile, hostConfig.sopsRecipient.publicKeyPath],
    observes: [hostConfig.sopsRecipient.publicKeyPath, config.operator.sops.encryptedSecretsFile],
    ...statusFromDependencies(state, `${hostConfig.hostname}:sops-recipient-rotation`, [
      `${hostConfig.hostname}:post-install-ssh-reachability`,
      "sops-secret-set",
    ]),
  }),
  resource({
    id: `${hostConfig.hostname}:network-smoke`,
    phase: "smoke",
    kind: "NetworkSmokeCheck",
    provider: "DeploymentJournal",
    operation: "safe",
    dependsOn: [`${hostConfig.hostname}:comin-readiness`, `${hostConfig.hostname}:sops-recipient-rotation`],
    summary: `Verify hostname, architecture, machine id, Tailscale, SOPS secret availability, and comin for ${hostConfig.hostname}.`,
    command: hostSmokeCommand(hostConfig),
    evidenceRequirements: [
      evidence(`${hostConfig.hostname}:network-smoke`, "Host network-bootstrap smoke evidence."),
    ],
    ...statusFromDependencies(state, `${hostConfig.hostname}:network-smoke`, [
      `${hostConfig.hostname}:comin-readiness`,
      `${hostConfig.hostname}:sops-recipient-rotation`,
    ]),
  }),
]

const finalDeploymentResources = (
  config: HomeDeploymentConfig,
  state: GateConfirmationState,
): readonly PlannedResource[] => {
  const hostSmokeIds = config.hosts.map((hostConfig: ThinkCentreHost) => `${hostConfig.hostname}:network-smoke`)

  return [
    resource({
      id: "thinkcentre-network-smoke",
      phase: "smoke",
      kind: "NetworkSmokeCheck",
      provider: "DeploymentJournal",
      operation: "safe",
      dependsOn: ["operator-tailscale", ...hostSmokeIds],
      summary: "Verify laptop Tailscale plus SSH, Tailscale, SOPS secret availability, comin, hostname, architecture, and machine id for all ThinkCentres.",
      command: commandPlan(["true"]),
      evidenceRequirements: [
        evidence("thinkcentre-network-smoke", "Accepted network-bootstrap smoke report across laptop and all three hosts."),
      ],
      ...statusFromDependencies(state, "thinkcentre-network-smoke", ["operator-tailscale", ...hostSmokeIds]),
    }),
    resource({
      id: "kubernetes-deferred",
      phase: "deferred",
      kind: "DeferredCapability",
      provider: "DeploymentJournal",
      operation: "safe",
      dependsOn: ["thinkcentre-network-smoke"],
      summary: "K3s, Kubernetes, kubeconfig, desktop worker, and public ingress are deferred until this network bootstrap passes.",
      deferred: true,
      ...statusFromDependencies(state, "kubernetes-deferred", ["thinkcentre-network-smoke"]),
    }),
  ]
}

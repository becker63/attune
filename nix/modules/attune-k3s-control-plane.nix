{ config, lib, pkgs, ... }:
let
  cfg = config.attune.k3sControlPlane;
  inherit (lib)
    concatMapStringsSep
    escapeShellArg
    mkEnableOption
    mkIf
    mkOption
    types
    ;

  baseFlags = [
    "server"
    "--node-name=${cfg.nodeName}"
    "--cluster-cidr=${cfg.clusterCidr}"
    "--service-cidr=${cfg.serviceCidr}"
    "--write-kubeconfig-mode=${cfg.writeKubeconfigMode}"
  ] ++ map (label: "--node-label=${label}") cfg.nodeLabels;

  roleFlags =
    if cfg.role == "init" then
      [ "--cluster-init" ]
    else
      [ "--server=${cfg.serverUrl}" ];

  k3sArgs = baseFlags ++ roleFlags ++ cfg.extraFlags;
in
{
  options.attune.k3sControlPlane = {
    enable = mkEnableOption "Attune K3s control-plane node";

    nodeName = mkOption {
      type = types.str;
      default = config.networking.hostName;
      description = "Kubernetes node name advertised to K3s.";
    };

    role = mkOption {
      type = types.enum [ "init" "join" ];
      description = "Whether this server initializes the K3s cluster or joins an existing server.";
    };

    serverUrl = mkOption {
      type = types.nullOr types.str;
      default = null;
      description = "K3s API URL used by joining control-plane servers.";
    };

    tokenFile = mkOption {
      type = types.str;
      description = "Runtime path containing the K3s shared server token. This file is not managed by Nix.";
    };

    nodeLabels = mkOption {
      type = types.listOf types.str;
      default = [ ];
      description = "Kubernetes labels passed to K3s at node registration.";
    };

    clusterCidr = mkOption {
      type = types.str;
      default = "10.42.0.0/16";
      description = "K3s pod CIDR.";
    };

    serviceCidr = mkOption {
      type = types.str;
      default = "10.43.0.0/16";
      description = "K3s service CIDR.";
    };

    writeKubeconfigMode = mkOption {
      type = types.str;
      default = "0640";
      description = "Mode for the K3s-generated kubeconfig.";
    };

    package = mkOption {
      type = types.package;
      default = pkgs.k3s;
      description = "K3s package to run.";
    };

    extraFlags = mkOption {
      type = types.listOf types.str;
      default = [ ];
      description = "Additional flags appended to `k3s server`.";
    };
  };

  config = mkIf cfg.enable {
    assertions = [
      {
        assertion = cfg.role == "init" || cfg.serverUrl != null;
        message = "attune.k3sControlPlane.serverUrl is required for joining control-plane nodes.";
      }
      {
        assertion = cfg.tokenFile != "";
        message = "attune.k3sControlPlane.tokenFile must point at an out-of-store runtime token file.";
      }
    ];

    environment.systemPackages = [
      cfg.package
      pkgs.curl
      pkgs.git
      pkgs.kubectl
      pkgs.vim
      pkgs.tailscale
    ];

    networking.firewall = {
      enable = true;
      allowedTCPPorts = [
        22
        6443
        9345
      ];
      allowedUDPPorts = [
        8472
        51820
      ];
      trustedInterfaces = [
        "cni0"
        "flannel.1"
        "tailscale0"
      ];
      checkReversePath = false;
    };

    services.openssh = {
      enable = true;
      settings = {
        PasswordAuthentication = false;
        PermitRootLogin = "prohibit-password";
      };
    };

    users.users.attune = {
      isNormalUser = true;
      extraGroups = [ "wheel" ];
      openssh.authorizedKeys.keys = config.attune.bootstrapSshKeys;
    };

    security.sudo.wheelNeedsPassword = false;

    services.tailscale.enable = true;

    systemd.tmpfiles.rules = [
      "d /var/lib/attune 0750 root root -"
      "d /var/lib/attune/secrets 0700 root root -"
    ];

    systemd.services.attune-k3s-server = {
      description = "Attune K3s control-plane server";
      after = [
        "network-online.target"
        "tailscaled.service"
      ];
      wants = [
        "network-online.target"
        "tailscaled.service"
      ];
      wantedBy = [ "multi-user.target" ];
      environment.K3S_TOKEN_FILE = cfg.tokenFile;
      path = [ cfg.package ];
      serviceConfig = {
        Type = "notify";
        KillMode = "process";
        Delegate = true;
        LimitNOFILE = 1048576;
        LimitNPROC = "infinity";
        Restart = "always";
        RestartSec = "5s";
        ExecStartPre = "${pkgs.coreutils}/bin/test -s ${cfg.tokenFile}";
        ExecStart = "${cfg.package}/bin/k3s ${concatMapStringsSep " " escapeShellArg k3sArgs}";
      };
    };
  };
}

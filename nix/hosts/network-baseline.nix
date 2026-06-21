{
  attuneHost,
  config,
  lib,
  pkgs,
  ...
}:
let
  tailscaleSecretPath = config.sops.secrets.${attuneHost.tailscaleSecretName}.path;
in
{
  networking.hostName = lib.mkDefault attuneHost.hostName;
  networking.useDHCP = lib.mkDefault true;

  time.timeZone = lib.mkDefault "America/New_York";
  services.timesyncd.enable = true;

  users.users.attune = {
    isNormalUser = true;
    extraGroups = [
      "wheel"
      "networkmanager"
    ];
    openssh.authorizedKeys.keys = config.attune.bootstrapSshKeys;
  };

  security.sudo.extraRules = lib.mkAfter [
    {
      groups = [ "wheel" ];
      commands = [
        {
          command = "ALL";
          options = [ "NOPASSWD" ];
        }
      ];
    }
  ];

  environment.systemPackages = [
    pkgs.age
    pkgs.curl
    pkgs.git
    pkgs.jq
    pkgs.sops
    pkgs.ssh-to-age
    pkgs.tailscale
    pkgs.vim
  ];

  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false;
      PermitRootLogin = "prohibit-password";
    };
  };

  networking.firewall = {
    enable = true;
    allowedTCPPorts = [ 22 ];
    allowedUDPPorts = [ 41641 ];
    trustedInterfaces = [ "tailscale0" ];
    checkReversePath = "loose";
  };

  services.tailscale.enable = true;

  sops = {
    defaultSopsFile = "/etc/attune/sops/thinkcentre-secrets.yaml";
    validateSopsFiles = false;
    age.keyFile = "/var/lib/sops-nix/key.txt";
    secrets.${attuneHost.tailscaleSecretName} = {
      owner = "root";
      group = "root";
      mode = "0400";
    };
  };

  systemd.services.tailscale-autoconnect = {
    description = "Enroll ${attuneHost.hostName} in Tailscale using the sops-nix auth secret";
    after = [
      "network-online.target"
      "tailscaled.service"
      "sops-nix.service"
    ];
    wants = [
      "network-online.target"
      "tailscaled.service"
    ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };
    path = [
      pkgs.coreutils
      pkgs.jq
      pkgs.tailscale
    ];
    script = ''
      if tailscale status --json 2>/dev/null | jq -e '.BackendState == "Running"' >/dev/null; then
        exit 0
      fi

      auth_key="$(cat ${tailscaleSecretPath})"
      tailscale up \
        --auth-key "$auth_key" \
        --hostname ${lib.escapeShellArg attuneHost.hostName} \
        --advertise-tags ${lib.escapeShellArg (lib.concatStringsSep "," attuneHost.tailscaleTags)} \
        --accept-dns=false \
        --ssh
    '';
  };

  services.comin = {
    enable = true;
    remotes = [
      {
        name = "origin";
        url = attuneHost.repositoryUrl;
        branches.main.name = attuneHost.ref;
      }
    ];
  };

  systemd.services.comin.after = [ "tailscale-autoconnect.service" ];
  systemd.services.comin.wants = [ "tailscale-autoconnect.service" ];

  environment.etc."attune/day0.json".text = builtins.toJSON {
    hostName = attuneHost.hostName;
    targetSystem = "x86_64-linux";
    flakeOutput = attuneHost.flakeOutput;
    repositoryUrl = attuneHost.repositoryUrl;
    ref = attuneHost.ref;
    tailscaleSecretName = attuneHost.tailscaleSecretName;
    diskDevice = attuneHost.diskDevice;
    deferred = {
      k3s = true;
      kubernetes = true;
      kubeconfig = true;
      desktopWorker = true;
      publicIngress = true;
    };
  };
}

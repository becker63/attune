{
  config,
  lib,
  pkgs,
  host,
  inventory,
  inputs,
  ...
}:
{
  networking.hostName = host.name;
  networking.useDHCP = true;
  networking.useNetworkd = true;
  systemd.network.networks."20-attune-wired" = {
    matchConfig.Name = "en* eth*";
    networkConfig.DHCP = "ipv4";
    address = lib.optionals host.enrolled [ "${host.address}/24" ];
    linkConfig.RequiredForOnline = "routable";
  };
  networking.hosts = lib.mapAttrs' (name: h: lib.nameValuePair h.address [ name ]) inventory;
  networking.firewall = {
    enable = true;
    allowedTCPPorts = [ 22 ];
  };
  boot.initrd.availableKernelModules = [
    "nvme"
    "xhci_pci"
    "ahci"
    "usb_storage"
    "sd_mod"
  ];
  boot.loader.systemd-boot = {
    enable = true;
    configurationLimit = 5;
  };
  boot.loader.efi.canTouchEfiVariables = false;
  hardware.enableRedistributableFirmware = true;
  nixpkgs.config.allowUnfree = true;
  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false;
      KbdInteractiveAuthentication = false;
      PermitRootLogin = "prohibit-password";
    };
    hostKeys = [
      {
        path = "/persist/ssh/ssh_host_ed25519_key";
        type = "ed25519";
      }
    ];
  };
  users.mutableUsers = false;
  users.users.root = {
    hashedPassword = "!";
    openssh.authorizedKeys.keys = [ (builtins.readFile ../keys/operator.pub) ];
  };
  environment.systemPackages = with pkgs; [
    age
    sops
    git
    jq
    btrfs-progs
    nvme-cli
  ];
  nix.settings = {
    experimental-features = [
      "nix-command"
      "flakes"
    ];
    max-jobs = 1;
    cores = 2;
    require-sigs = true;
  };
  nix.gc = {
    automatic = true;
    dates = "weekly";
    options = "--delete-older-than 30d";
  };
  systemd.coredump.settings.Coredump = {
    Storage = "none";
    ProcessSizeMax = 0;
  };
  services.journald.extraConfig = "SystemMaxUse=256M\nRuntimeMaxUse=64M";
  systemd.tmpfiles.rules = [
    "d /persist/ssh 0700 root root -"
    "d /persist/sops 0700 root root -"
  ];
  sops.age.keyFile = "/persist/sops/age-key.txt";
  sops.age.generateKey = true;
  sops.age.sshKeyPaths = [ ];
  systemd.services.attune-identity = {
    wantedBy = [ "multi-user.target" ];
    before = [ "comin.service" ];
    requires = [ "persist.mount" ];
    after = [ "persist.mount" ];
    serviceConfig.Type = "oneshot";
    path = [
      pkgs.age
      pkgs.coreutils
    ];
    script = ''
      umask 077
      test -s /persist/sops/age-key.txt || age-keygen -o /persist/sops/age-key.txt
      age-keygen -y /persist/sops/age-key.txt > /persist/sops/recipient.txt
    '';
  };
  services.comin = {
    enable = true;
    hostname = host.name;
    machineId = host.machineId;
    sshAllowedSignersPath = toString (
      pkgs.writeText "attune-deployment-signers" (builtins.readFile ../keys/allowed-signers)
    );
    deployConfirmer.mode = "manual";
    exporter.listen_address = if host.enrolled then host.address else "127.0.0.1";
    retention = {
      deployment_boot_entry_capacity = 5;
      deployment_successful_capacity = 8;
      deployment_any_capacity = 20;
    };
    repositorySubdir = "infra";
    remotes = [
      {
        name = "origin";
        url = "https://github.com/becker63/attune.git";
        branches.main = {
          name = "main";
          operation = "switch";
        };
        branches.testing = {
          name = "testing-${host.name}";
          operation = "test";
        };
      }
    ];
  };
  networking.firewall.allowedUDPPorts = [ 37077 ];
  systemd.services.attune-discovery = {
    description = "Public LAN enrollment discovery hints";
    wantedBy = [ "multi-user.target" ];
    after = [
      "attune-identity.service"
      "sshd.service"
    ];
    serviceConfig = {
      ExecStart = "${pkgs.python3}/bin/python3 ${../tools/discovery.py} --serve";
      Restart = "on-failure";
      RestartSec = 10;
      NoNewPrivileges = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      PrivateTmp = true;
      RestrictAddressFamilies = [ "AF_INET" ];
      CapabilityBoundingSet = "";
    };
  };
  system.stateVersion = "26.05";
  time.timeZone = "UTC";
}

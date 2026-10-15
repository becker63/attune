{
  config,
  lib,
  pkgs,
  modulesPath,
  target,
  host,
  authorizedKey ? builtins.readFile ./keys/operator.pub,
  ...
}:
let
  policy = pkgs.writeText "attune-install-policy.json" (builtins.toJSON host);
in
{
  imports = [ (modulesPath + "/installer/cd-dvd/installation-cd-minimal.nix") ];
  networking.hostName = "install-${host.name}";
  image.baseName = lib.mkForce "${host.name}-installer";
  image.fileName = "${host.name}-installer.iso";
  isoImage.volumeID = "ATTUNE_INSTALL";
  isoImage.squashfsCompression = "zstd -Xcompression-level 3";
  boot.kernelParams = [
    "console=tty0"
    "console=ttyS0,115200"
  ];
  boot.zfs.forceImportRoot = false;
  boot.supportedFilesystems = [
    "btrfs"
    "vfat"
  ];
  boot.initrd.availableKernelModules = [
    "nvme"
    "xhci_pci"
    "usb_storage"
    "sd_mod"
  ];
  hardware.enableRedistributableFirmware = true;
  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false;
      KbdInteractiveAuthentication = false;
      PermitRootLogin = "prohibit-password";
    };
  };
  users.users.root = {
    initialHashedPassword = lib.mkForce null;
    initialPassword = lib.mkForce null;
    hashedPassword = lib.mkForce "!";
    openssh.authorizedKeys.keys = [ authorizedKey ];
  };
  environment.etc."attune-install-signers".source = ./keys/install-signers;
  environment.systemPackages = [
    pkgs.python3
    pkgs.nvme-cli
    pkgs.btrfs-progs
    (pkgs.writeShellApplication {
      name = "attune-install-claim";
      runtimeInputs = [
        pkgs.python3
        pkgs.util-linux
        pkgs.openssh
        pkgs.efibootmgr
      ];
      text = "exec python3 ${./installer/guard.py} ${policy} --claim";
    })
  ];
  environment.etc."attune-installer".text = host.name;
  environment.etc."attune-install-authorized".text = host.name;

  # The complete target closure and formatter are included for offline installation.
  isoImage.storeContents = [
    target.config.system.build.toplevel
    target.config.system.build.diskoScript
  ];
  systemd.services.attune-install = {
    description = "Guarded offline installation of ${host.name}";
    wantedBy = [ "multi-user.target" ];
    after = [ "systemd-udev-settle.service" ];
    wants = [ "systemd-udev-settle.service" ];
    onFailure = [ "attune-install-failure.service" ];
    path = [
      pkgs.python3
      pkgs.util-linux
      pkgs.coreutils
      pkgs.nixos-install-tools
      pkgs.nix
      pkgs.systemd
      pkgs.efibootmgr
      pkgs.openssh
    ];
    serviceConfig = {
      Type = "oneshot";
      StandardOutput = "journal+console";
      StandardError = "journal+console";
    };
    script = ''
      set -euo pipefail
      exec 9>/run/attune-install.lock
      flock -n 9
      target=$(python3 ${./installer/guard.py} ${policy})
      test -b "$target"
      ln -s "$target" /dev/attune-install-target
      ${target.config.system.build.diskoScript}
      mkdir -p /mnt/persist/attune
      printf '%s\n' '${host.name}' > /mnt/persist/attune/install-started
      nixos-install --no-root-passwd --no-channel-copy --system ${target.config.system.build.toplevel}
      printf '%s\n' '${host.name}' > /mnt/persist/attune/install-complete
      python3 ${./installer/bootnext.py} "$target" ${lib.escapeShellArg host.name}
      sync
      umount -R /mnt
      systemctl reboot
    '';
  };
  systemd.services.attune-install-failure = {
    serviceConfig.Type = "oneshot";
    script = ''
      ${pkgs.util-linux}/bin/lsblk -f > /run/attune-install-diagnostics.txt
      ${pkgs.systemd}/bin/journalctl -u attune-install --no-pager >> /run/attune-install-diagnostics.txt
      echo 'Attune installation refused or failed. See journalctl -u attune-install and /run/attune-install-diagnostics.txt. Use SSH or the local installer shell.' > /dev/console
    '';
  };
  system.stateVersion = "26.05";
}

{
  config,
  lib,
  pkgs,
  ...
}:
{
  fileSystems."/persist".neededForBoot = true;
  fileSystems."/nix".neededForBoot = true;
  fileSystems."/data".neededForBoot = true;
  boot.initrd.systemd.enable = true;
  boot.initrd.systemd.storePaths = [ pkgs.btrfs-progs ];
  boot.initrd.systemd.services.attune-reset-root = {
    description = "Discard undeclared OS state before mounting root";
    wantedBy = [ "initrd.target" ];
    requiredBy = [ "sysroot.mount" ];
    before = [ "sysroot.mount" ];
    after = [ "dev-disk-by\\x2dlabel-attune\\x2dsystem.device" ];
    requires = [ "dev-disk-by\\x2dlabel-attune\\x2dsystem.device" ];
    unitConfig.DefaultDependencies = false;
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };
    path = [
      pkgs.btrfs-progs
      pkgs.util-linux
      pkgs.coreutils
    ];
    script = ''
      set -euo pipefail
      if mountpoint -q /sysroot; then
        echo "Refusing to reset an already mounted root" >&2
        exit 1
      fi
      mkdir -p /run/attune-root
      mount -t btrfs -o subvolid=5 /dev/disk/by-label/attune-system /run/attune-root
      cd /run/attune-root
      # No snapshots retained: durable subvolumes are siblings, never children.
      if test -e @root; then
        btrfs subvolume list -o @root | cut -d ' ' -f 9- | tac | while IFS= read -r child; do
          btrfs subvolume delete "$child"
        done
        btrfs subvolume delete @root
      fi
      btrfs subvolume create @root
      cd /
      umount /run/attune-root
    '';
  };
  environment.persistence."/persist" = {
    hideMounts = true;
    directories = [
      "/var/lib/nixos"
      "/var/lib/systemd"
      "/var/lib/comin"
    ];
    files = [ "/etc/machine-id" ];
  };
}

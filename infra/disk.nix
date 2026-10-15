{ lib, ... }:
{
  disko.devices.disk.system = {
    type = "disk";
    device = lib.mkDefault "/dev/attune-install-target";
    content = {
      type = "gpt";
      partitions = {
        ESP = {
          size = "1G";
          type = "EF00";
          content = {
            type = "filesystem";
            format = "vfat";
            mountpoint = "/boot";
            extraArgs = [
              "-n"
              "ATTUNE_EFI"
            ];
            mountOptions = [ "umask=0077" ];
          };
        };
        root = {
          size = "100%";
          content = {
            type = "btrfs";
            extraArgs = [
              "-L"
              "attune-system"
            ];
            subvolumes = {
              "@root" = {
                mountpoint = "/";
              };
              "@nix" = {
                mountpoint = "/nix";
                mountOptions = [
                  "compress=zstd"
                  "noatime"
                ];
              };
              "@persist" = {
                mountpoint = "/persist";
                mountOptions = [ "compress=zstd" ];
              };
              "@data" = {
                mountpoint = "/data";
                mountOptions = [
                  "compress=zstd"
                  "noatime"
                ];
              };
            };
          };
        };
      };
    };
  };
  # Runtime mounts must not depend on the installer-only device symlink.
  fileSystems."/".device = lib.mkForce "/dev/disk/by-label/attune-system";
  fileSystems."/nix".device = lib.mkForce "/dev/disk/by-label/attune-system";
  fileSystems."/persist".device = lib.mkForce "/dev/disk/by-label/attune-system";
  fileSystems."/data".device = lib.mkForce "/dev/disk/by-label/attune-system";
  fileSystems."/boot".device = lib.mkForce "/dev/disk/by-label/ATTUNE_EFI";
}

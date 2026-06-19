{ lib, ... }:
{
  boot.loader.grub.enable = lib.mkDefault false;

  fileSystems."/" = lib.mkDefault {
    device = "/dev/disk/by-label/nixos";
    fsType = "ext4";
  };
}

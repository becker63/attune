{
  config,
  lib,
  pkgs,
  ...
}:
{
  image.baseName = lib.mkForce "attune-installer";
  image.fileName = lib.mkForce "attune-installer.iso";
  isoImage.squashfsCompression = "zstd -Xcompression-level 6";

  networking.hostName = "attune-installer";

  environment.systemPackages = [
    pkgs.age
    pkgs.curl
    pkgs.git
    pkgs.jq
    pkgs.nixos-anywhere
    pkgs.sops
    pkgs.tailscale
    pkgs.vim
  ];

  services.openssh.enable = true;
  services.tailscale.enable = true;

  users.users.root.openssh.authorizedKeys.keys = config.attune.bootstrapSshKeys;

  system.stateVersion = "25.05";
}

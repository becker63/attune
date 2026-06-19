{ config, pkgs, ... }:
{
  isoImage.isoName = "attune-installer.iso";

  networking.hostName = "attune-installer";

  environment.systemPackages = [
    pkgs.curl
    pkgs.git
    pkgs.nixos-anywhere
    pkgs.tailscale
    pkgs.vim
  ];

  services.openssh.enable = true;
  services.tailscale.enable = true;

  users.users.root.openssh.authorizedKeys.keys = config.attune.bootstrapSshKeys;

  system.stateVersion = "25.05";
}

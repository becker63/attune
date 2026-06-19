{ lib, ... }:
let
  localKeysPath = ./local/bootstrap-ssh-keys.nix;
  localKeys = if builtins.pathExists localKeysPath then import localKeysPath else [ ];
in
{
  options.attune.bootstrapSshKeys = lib.mkOption {
    type = lib.types.listOf lib.types.str;
    default = localKeys;
    description = "Operator SSH public keys used for installer and first-boot host access.";
  };
}

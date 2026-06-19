{ nixpkgs, system ? "x86_64-linux" }:
let
  lib = nixpkgs.lib;
  cluster = import ../lib/attune-cluster.nix;

  hostModules = {
    attune-cp-1 = ./attune-cp-1.nix;
    attune-cp-2 = ./attune-cp-2.nix;
    attune-cp-3 = ./attune-cp-3.nix;
  };

  mkControlPlane = hostName: hostModule:
    lib.nixosSystem {
      inherit system;
      specialArgs = { inherit cluster; };
      modules = [
        ./bootstrap-keys.nix
        ../modules/attune-k3s-control-plane.nix
        ./hardware-placeholder.nix
        hostModule
        {
          system.stateVersion = "25.05";
        }
      ];
    };
in
{
  nixosConfigurations =
    lib.mapAttrs mkControlPlane hostModules
    // {
      attune-installer = lib.nixosSystem {
        inherit system;
        modules = [
          "${nixpkgs}/nixos/modules/installer/cd-dvd/installation-cd-minimal.nix"
          ./bootstrap-keys.nix
          ./installer-iso.nix
        ];
      };
    };
}

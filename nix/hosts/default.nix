{
  nixpkgs,
  disko,
  sops-nix,
  comin,
  system ? "x86_64-linux",
}:
let
  lib = nixpkgs.lib;
  cluster = import ../lib/attune-cluster.nix;
  localDisksPath = ./local/disks.nix;
  localDisks = if builtins.pathExists localDisksPath then import localDisksPath else { };

  hostModules = {
    attune-cp-1 = ./attune-cp-1.nix;
    attune-cp-2 = ./attune-cp-2.nix;
    attune-cp-3 = ./attune-cp-3.nix;
  };

  defaultDiskFor =
    hostName: "/dev/disk/by-id/REPLACE_ME_${lib.toUpper (lib.replaceStrings [ "-" ] [ "_" ] hostName)}";

  cominPackageFor =
    targetSystem:
    comin.packages.${targetSystem}.comin.overrideAttrs (old: {
      enableParallelBuilding = false;
      preBuild = (old.preBuild or "") + ''
        export CGO_ENABLED=0
        export GOMAXPROCS=1
        export GOGC=off
      '';
    });

  mkNetworkHost =
    hostName: hostModule:
    lib.nixosSystem {
      inherit system;
      specialArgs = {
        inherit cluster;
        attuneHost = {
          inherit hostName;
          diskDevice =
            if builtins.hasAttr hostName localDisks then
              builtins.getAttr hostName localDisks
            else
              defaultDiskFor hostName;
          repositoryUrl = "https://github.com/becker63/attune.git";
          ref = "main";
          flakeOutput = hostName;
          tailscaleSecretName = "tailscale/${hostName}/auth-key";
          tailscaleTags = [ "tag:attune-thinkcentre" ];
        };
      };
      modules = [
        disko.nixosModules.disko
        sops-nix.nixosModules.sops
        comin.nixosModules.comin
        (
          { ... }:
          {
            services.comin.package = lib.mkForce (cominPackageFor system);
          }
        )
        ./bootstrap-keys.nix
        ./network-baseline.nix
        ./disko-layout.nix
        ./hardware-placeholder.nix
        hostModule
        {
          system.stateVersion = "25.05";
        }
      ];
    };
in
{
  nixosConfigurations = lib.mapAttrs mkNetworkHost hostModules // {
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

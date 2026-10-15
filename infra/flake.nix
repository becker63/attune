{
  description = "Attune three-node research infrastructure";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    impermanence = {
      url = "github:nix-community/impermanence";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.home-manager.inputs.nixpkgs.follows = "nixpkgs";
    };
    sops-nix = {
      url = "github:Mic92/sops-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    comin = {
      url = "github:nlewo/comin";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs =
    inputs@{ self, nixpkgs, ... }:
    let
      lib = nixpkgs.lib;
      inventory = import ./hosts.nix;
      placement = lib.genAttrs [ "grafana" "clickhouse" "metrics" "ingestion" ] (
        role:
        let
          selected = lib.filterAttrs (_: h: builtins.elem role h.roles) inventory;
        in
        assert builtins.length (builtins.attrNames selected) == 1;
        builtins.head (builtins.attrValues selected)
      );
      systems = [
        "aarch64-linux"
        "x86_64-linux"
      ];
      each = lib.genAttrs systems;
      mkHost =
        name:
        lib.nixosSystem {
          system = "x86_64-linux";
          specialArgs = {
            inherit inputs inventory placement;
            host = inventory.${name} // {
              inherit name;
            };
          };
          modules = [
            inputs.disko.nixosModules.disko
            inputs.impermanence.nixosModules.impermanence
            inputs.sops-nix.nixosModules.sops
            inputs.comin.nixosModules.comin
            ./disk.nix
            ./modules/base.nix
            ./modules/persistence.nix
            ./modules/services.nix
          ];
        };
      hosts = lib.mapAttrs (name: _: mkHost name) inventory;
      bootstrapHosts = lib.mapAttrs (
        name: h:
        h.extendModules {
          specialArgs.host = inventory.${name} // {
            inherit name;
            enrolled = false;
            machineId = null;
          };
        }
      ) hosts;
      bootstrapComin =
        nixpkgs.legacyPackages.aarch64-linux.pkgsCross.gnu64.callPackage (inputs.comin + "/nix/package.nix")
          {
            git = nixpkgs.legacyPackages.x86_64-linux.git;
          };
      crossHosts = lib.mapAttrs (
        _: h:
        h.extendModules {
          modules = [
            ({ lib, ... }: {
              services.comin.package = lib.mkForce bootstrapComin;
            })
          ];
        }
      ) bootstrapHosts;
      fixtureTarget =
        system:
        (if system == "aarch64-linux" then crossHosts else bootstrapHosts).attune-a.extendModules {
          modules = [
            ({ lib, ... }: {
              users.users.root.openssh.authorizedKeys.keys = lib.mkForce [
                (builtins.readFile ./keys/fixture.pub)
              ];
            })
          ];
        };
      fixtureInstaller =
        system:
        lib.nixosSystem {
          system = "x86_64-linux";
          specialArgs = {
            inherit inputs;
            target = fixtureTarget system;
            host = inventory.attune-a // {
              name = "attune-a";
            };
            authorizedKey = builtins.readFile ./keys/fixture.pub;
          };
          modules = [ ./installer.nix ];
        };
      installers = lib.mapAttrs (
        name: _:
        lib.nixosSystem {
          system = "x86_64-linux";
          specialArgs = {
            inherit inputs;
            authorizedKey = builtins.readFile ./keys/operator.pub;
            target = bootstrapHosts.${name};
            host = inventory.${name} // {
              inherit name;
            };
          };
          modules = [ ./installer.nix ];
        }
      ) inventory;
      crossInstallers = lib.mapAttrs (
        name: _:
        lib.nixosSystem {
          system = "x86_64-linux";
          specialArgs = {
            inherit inputs;
            authorizedKey = builtins.readFile ./keys/operator.pub;
            target = crossHosts.${name};
            host = inventory.${name} // {
              inherit name;
            };
          };
          modules = [ ./installer.nix ];
        }
      ) inventory;
    in
    {
      nixosConfigurations = hosts;
      installerConfigurations = installers;
      packages = each (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        (lib.mapAttrs' (
          name: value: lib.nameValuePair "installer-${name}" value.config.system.build.isoImage
        ) (if system == "aarch64-linux" then crossInstallers else installers))
        // {
          comin-bootstrap =
            if system == "aarch64-linux" then
              bootstrapComin
            else
              bootstrapHosts.attune-a.config.services.comin.package;
          installer-test = (fixtureInstaller system).config.system.build.isoImage;
          discover = pkgs.writeShellApplication {
            name = "attune-discover";
            runtimeInputs = [ pkgs.python3 ];
            text = ''exec python3 ${./tools/discovery.py} "$@"'';
          };
          export = pkgs.writeShellApplication {
            name = "attune-export";
            runtimeInputs = [ (pkgs.python3.withPackages (p: [ p.ijson ])) ];
            text = ''exec python3 ${./ingest}/export.py "$@"'';
          };
          project = pkgs.writeShellApplication {
            name = "attune-project";
            runtimeInputs = [ (pkgs.python3.withPackages (p: [ p.boto3 ])) ];
            text = ''exec python3 ${./ingest}/index.py "$@"'';
          };
          backup = pkgs.writeShellApplication {
            name = "attune-backup";
            runtimeInputs = [
              pkgs.util-linux
              (pkgs.python3.withPackages (p: [ p.boto3 ]))
            ];
            text = ''exec python3 ${./ingest}/backup.py "$@"'';
          };
          ingest = pkgs.writeShellApplication {
            name = "attune-archive";
            runtimeInputs = [
              (pkgs.python3.withPackages (p: [
                p.pyarrow
                p.boto3
              ]))
            ];
            text = ''exec python3 ${./ingest}/archive.py "$@"'';
          };
          default = self.packages.${system}.validate;
          validate = pkgs.writeShellApplication {
            name = "attune-validate";
            runtimeInputs = [
              pkgs.python3
              pkgs.nix
              pkgs.git
            ];
            text = ''exec python3 ${./tools/validate.py} "$@"'';
          };
        }
      );
      formatter = each (system: nixpkgs.legacyPackages.${system}.nixfmt-tree);
      devShells = each (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nixfmt-rfc-style
              git
              age
              sops
              openssh
              qemu
              OVMF
              python3
              jq
            ];
          };
        }
      );
      checks = each (
        system:
        import ./tests {
          inherit
            self
            inputs
            system
            hosts
            installers
            ;
          pkgs = nixpkgs.legacyPackages.${system};
        }
      );
    };
}

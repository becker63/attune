{
  description = "Attune Nx + Nix development toolchain";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    nix2container.url = "github:nlewo/nix2container";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      nix2container,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        envVars = import ./nix/lib/env-vars.nix;
        joernTools = import ./nix/toolchains/joern.nix { inherit pkgs; };
        kubernetesTools = import ./nix/toolchains/kubernetes.nix { inherit pkgs; };
        openSpec = import ./nix/toolchains/openspec.nix { inherit pkgs; };
        inherit (joernTools) joern cpgSchemaSources cpgVersion;
        propertyTmpfsSize = "8g";
        propertyRuntime = import ./nix/modules/tmpfs-property-store.nix {
          inherit pkgs joern;
          tmpfsSize = propertyTmpfsSize;
        };
        propertyImage = import ./nix/containers/joern-effect-property.nix {
          inherit
            cpgSchemaSources
            cpgVersion
            envVars
            joern
            nix2container
            pkgs
            propertyRuntime
            system
            ;
        };
      in
      {
        packages = {
          inherit joern openSpec;
          joern-effect-property-image = propertyImage;
          default = joern;
        };

        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.git
            pkgs.jdk21
            pkgs.arion
            pkgs.docker-client
            kubernetesTools.k3d
            kubernetesTools.kind
            kubernetesTools.kubectl
            kubernetesTools.kubernetes-helm
            kubernetesTools.kustomize
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.nixfmt
            joern
            openSpec
          ];

          ${envVars.corepackEnableDownloadPrompt} = "0";
          NX_DAEMON = "false";
          TMPDIR = "/tmp";
          TEMP = "/tmp";
          TMP = "/tmp";
          ${envVars.joernBinary} = "${joern}/bin/joern";
          ${envVars.joernHome} = "${joern}";
          ${envVars.joernCpgVersion} = cpgVersion;
          ${envVars.joernCpgSchemaSources} = "${cpgSchemaSources}";
          ${envVars.joernEffectTestTmpdir} = "/dev/shm";
          JOERN_EFFECT_PROPERTY_TMPFS_SIZE = propertyTmpfsSize;

          shellHook = ''
            echo "Attune dev shell"
            echo "  pnpm install"
            echo "  pnpm exec nx show projects"
            echo "  pnpm exec nx run joern-effect:generate"
            echo "  pnpm exec nx run platform-alchemy-k8s:generate-crd-types"
          '';
        };

        formatter = pkgs.nixfmt;
      }
    );
}

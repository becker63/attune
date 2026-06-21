{
  description = "Attune Nx + Nix development toolchain";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    nix2container.url = "github:nlewo/nix2container";
    pre-commit-hooks = {
      url = "github:cachix/pre-commit-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      nix2container,
      pre-commit-hooks,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        cocoindexTools = import ./nix/toolchains/cocoindex.nix { inherit pkgs; };
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
        windowsDesktopGuard = import ./nix/containers/windows-desktop-guard.nix { inherit pkgs; };
        nxPolicyHook =
          name: script:
          {
            enable = true;
            inherit name;
            entry = "${pkgs.bash}/bin/bash ${script}";
            language = "system";
            pass_filenames = false;
          };
        preCommitCheck = pre-commit-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            nixfmt-rfc-style = {
              enable = true;
              name = "nixfmt";
              entry = "${pkgs.nixfmt}/bin/nixfmt --check";
              files = "\\.nix$";
              language = "system";
            };
            undeclared-workflow-policy =
              nxPolicyHook "undeclared-workflow-policy"
                ./nix/policy-hooks/undeclared-workflow-policy.sh;
            secret-path-hygiene =
              nxPolicyHook "secret-path-hygiene"
                ./nix/policy-hooks/secret-path-hygiene.sh;
            focused-architecture-lint =
              nxPolicyHook "focused-architecture-lint"
                ./nix/policy-hooks/focused-architecture-lint.sh;
            touched-source-bom-ownership =
              nxPolicyHook "touched-source-bom-ownership"
                ./nix/policy-hooks/touched-source-bom-ownership.sh;
            openspec-feasible-validation =
              nxPolicyHook "openspec-feasible-validation"
                ./nix/policy-hooks/openspec-feasible-validation.sh;
          };
        };
      in
      {
        checks.pre-commit = preCommitCheck;

        packages = {
          inherit joern openSpec;
          joern-effect-property-image = propertyImage;
          windows-desktop-guard = windowsDesktopGuard;
          default = joern;
        };

        apps.windows-desktop-guard = {
          type = "app";
          program = "${windowsDesktopGuard}/bin/attune-desktop-guard";
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
            cocoindexTools.ccc
            cocoindexTools.uv
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.nixfmt
            pkgs.pre-commit
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

          shellHook = preCommitCheck.shellHook + ''
            echo "Attune dev shell"
            echo "  pnpm install"
            echo "  pnpm exec nx show projects"
            echo "  pnpm exec nx run joern-effect:generate"
            echo "  pnpm exec nx run cocoindex-effect:generate"
            echo "  pnpm exec nx run platform-alchemy-k8s:generate-crd-types"
          '';
        };

        formatter = pkgs.nixfmt;
      }
    );
}

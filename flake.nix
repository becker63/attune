{
  description = "Attune development toolchain";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    git-hooks.url = "github:cachix/git-hooks.nix";
    git-hooks.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      git-hooks,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };

        nodejs = pkgs.nodejs_24;
        packageManager = pkgs.bun;

        scriptIfPresent = name: command: ''
          if [ -f package.json ]; then
            ${command}
          else
            echo "Skipping ${name}: package.json is not present yet."
          fi
        '';

        preCommitCheck = git-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            nixfmt.enable = true;

            package-lint = {
              enable = true;
              name = "package lint";
              entry = "${pkgs.bash}/bin/bash -c '${scriptIfPresent "lint" "${packageManager}/bin/bun run lint"}'";
              files = ".*\\.(ts|tsx|js|jsx|json|mjs|cjs)$|package.json|bun.lockb?";
              pass_filenames = false;
            };

            package-typecheck = {
              enable = true;
              name = "package typecheck";
              entry = "${pkgs.bash}/bin/bash -c '${scriptIfPresent "typecheck" "${packageManager}/bin/bun run typecheck"}'";
              files = ".*\\.(ts|tsx)$|tsconfig.*\\.json|package.json";
              pass_filenames = false;
            };

            package-test = {
              enable = true;
              name = "package test";
              entry = "${pkgs.bash}/bin/bash -c '${scriptIfPresent "test" "${packageManager}/bin/bun run test"}'";
              files = ".*\\.(ts|tsx|js|jsx)$|package.json";
              pass_filenames = false;
            };

            openspec-validate = {
              enable = true;
              name = "openspec validate";
              entry = "${pkgs.bash}/bin/bash -c 'if command -v openspec >/dev/null 2>&1; then openspec status --change add-event-sourced-astgrep-rule-workbench-spike >/dev/null; else echo \"Skipping openspec validate: openspec is not installed in the shell.\"; fi'";
              files = "^openspec/.*";
              pass_filenames = false;
            };
          };
        };
      in
      {
        checks.pre-commit = preCommitCheck;

        devShells.default = pkgs.mkShell {
          packages = [
            nodejs
            packageManager
            pkgs.ast-grep
            pkgs.chromium
            pkgs.pre-commit
            pkgs.nixfmt
          ]
          ++ preCommitCheck.enabledPackages;

          shellHook = ''
            ${preCommitCheck.shellHook}
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.chromium}
            echo "Attune dev shell: Node is the runtime contract; Bun is the local tool."
          '';
        };

        formatter = pkgs.nixfmt;
      }
    );
}

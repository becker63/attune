{
  description = "joern-effect: generated TypeScript and Effect bindings for Joern CPGQL";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    pre-commit-hooks.url = "github:cachix/pre-commit-hooks.nix";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      pre-commit-hooks,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        envVars = import ./nix/env-vars.nix;
        joernTools = import ./nix/joern.nix { inherit pkgs; };
        buck2 = import ./nix/toolchains/buck2.nix { inherit pkgs; };
        inherit (joernTools) joern joernVersion cpgVersion cpgSchemaSources;

        extractSchema = pkgs.writeShellApplication {
          name = "extract-joern-schema";
          runtimeInputs = [
            pkgs.jdk21
            pkgs.nodejs_22
            pkgs.unzip
            joern
          ];
          text = ''
            set -euo pipefail
            out="''${1:-packages/joern-effect/schema/joern-cpg-schema.${cpgVersion}.json}"
            mkdir -p "$(dirname "$out")"
            javac -proc:none -cp "${joern}/lib/*" packages/joern-effect/scripts/ExtractCpgSchema.java
            java -cp "packages/joern-effect/scripts:${joern}/lib/*" ExtractCpgSchema "${cpgVersion}" > "$out"
            schema_docs="$(mktemp -d)"
            unzip -q "${cpgSchemaSources}" -d "$schema_docs"
            node packages/joern-effect/scripts/enrichSchemaDocs.mjs "$out" "$schema_docs"
          '';
        };

        generate = pkgs.writeShellApplication {
          name = "generate-joern-effect";
          runtimeInputs = [
            pkgs.jdk21
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.unzip
            joern
            extractSchema
          ];
          text = ''
            set -euo pipefail
            export ${envVars.tmpdir}="''${${envVars.tmpdir}:-/tmp}"
            pnpm install --frozen-lockfile
            extract-joern-schema "packages/joern-effect/schema/joern-cpg-schema.${cpgVersion}.json"
            ${envVars.joernCpgSchemaJson}="packages/joern-effect/schema/joern-cpg-schema.${cpgVersion}.json" pnpm --filter joern-effect generate
            pnpm --filter joern-effect render-readme
          '';
        };

        checkGenerated = pkgs.writeShellApplication {
          name = "check-generated";
          runtimeInputs = [
            pkgs.diffutils
            generate
          ];
          text = ''
            set -euo pipefail
            tmp="$(mktemp -d)"
            cp -R packages/joern-effect/schema "$tmp/schema"
            cp -R packages/joern-effect/src/pure/generated "$tmp/generated"
            cp packages/joern-effect/README.md "$tmp/README.md"
            generate-joern-effect
            if ! diff -ru "$tmp/schema" packages/joern-effect/schema; then
              echo "Generated Joern schema snapshot is out of date." >&2
              echo "Run: nix run .#generate" >&2
              exit 1
            fi
            if ! diff -ru "$tmp/generated" packages/joern-effect/src/pure/generated; then
              echo "Generated Joern schema/API files are out of date." >&2
              echo "Run: nix run .#generate" >&2
              exit 1
            fi
            if ! diff -u "$tmp/README.md" packages/joern-effect/README.md; then
              echo "packages/joern-effect/README.md is out of date with packages/joern-effect/scripts/README.template.md or flake.nix." >&2
              echo "Run: nix run .#generate" >&2
              exit 1
            fi
          '';
        };

        attuneCheck = import ./nix/labs/check.nix { inherit pkgs buck2; };
        attuneProperty = import ./nix/labs/property.nix { inherit pkgs; };
        joernSourceSink = import ./nix/labs/joern-source-sink.nix { inherit pkgs joern; };
        attuneLab = import ./nix/labs/lab.nix {
          inherit pkgs;
          check = attuneCheck;
          property = attuneProperty;
          inherit joernSourceSink;
        };

        preCommit = pre-commit-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            joern-generated = {
              enable = true;
              name = "joern generated bindings are current";
              entry = "${checkGenerated}/bin/check-generated";
              language = "system";
              pass_filenames = false;
              stages = [ "pre-push" ];
            };
            typecheck = {
              enable = true;
              name = "typescript typecheck";
              entry = "pnpm typecheck";
              language = "system";
              pass_filenames = false;
              stages = [ "pre-push" ];
            };
            lint = {
              enable = true;
              name = "oxlint";
              entry = "pnpm lint";
              language = "system";
              pass_filenames = false;
              stages = [ "pre-push" ];
            };
          };
        };
      in
      {
        packages = {
          inherit joern buck2;
          fork = import ./nix/toolchains/fork.nix { inherit pkgs; };
          default = joern;
        };

        apps = {
          generate = {
            type = "app";
            program = "${generate}/bin/generate-joern-effect";
          };
          check-generated = {
            type = "app";
            program = "${checkGenerated}/bin/check-generated";
          };
          check = {
            type = "app";
            program = "${attuneCheck}/bin/attune-check";
          };
          property = {
            type = "app";
            program = "${attuneProperty}/bin/attune-property";
          };
          joern-source-sink = {
            type = "app";
            program = "${joernSourceSink}/bin/attune-joern-source-sink";
          };
          lab = {
            type = "app";
            program = "${attuneLab}/bin/attune-lab";
          };
        };

        checks = {
          pre-commit = preCommit;
          buck =
            pkgs.runCommand "joern-effect-buck-check"
              {
                nativeBuildInputs = [
                  buck2
                ];
              }
              ''
                mkdir -p "$out"
              '';
          fork =
            pkgs.runCommand "joern-effect-fork-check"
              {
                nativeBuildInputs = [
                  pkgs.nodejs_22
                  pkgs.pnpm
                ];
              }
              ''
                mkdir -p "$out"
              '';
          generated-schema =
            pkgs.runCommand "joern-effect-generated-schema-check"
              {
                nativeBuildInputs = [
                  pkgs.jdk21
                  pkgs.nodejs_22
                  pkgs.unzip
                  joern
                ];
              }
              ''
                cp -R ${./.} repo
                chmod -R u+w repo
                cd repo
                javac -proc:none -cp "${joern}/lib/*" packages/joern-effect/scripts/ExtractCpgSchema.java
                java -cp "packages/joern-effect/scripts:${joern}/lib/*" ExtractCpgSchema "${cpgVersion}" > generated.json
                schema_docs="$(mktemp -d)"
                unzip -q "${cpgSchemaSources}" -d "$schema_docs"
                node packages/joern-effect/scripts/enrichSchemaDocs.mjs generated.json "$schema_docs"
                cmp generated.json packages/joern-effect/schema/joern-cpg-schema.${cpgVersion}.json
                mkdir -p "$out"
              '';
        };

        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.git
            pkgs.jdk21
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.bun
            pkgs.nix
            pkgs.pre-commit
            pkgs.watchman
            buck2
            joern
            extractSchema
            generate
            checkGenerated
          ];

          ${envVars.joernBinary} = "${joern}/joern";
          ${envVars.joernHome} = "${joern}";
          ${envVars.joernCpgVersion} = cpgVersion;
          ${envVars.joernCpgSchemaSources} = "${cpgSchemaSources}";

          shellHook = ''
            ${preCommit.shellHook}
            ${import ./nix/lib/shell-env-hook.nix { inherit envVars joern; }}
            echo "  Install pre-push hook: pre-commit install --hook-type pre-push"
          '';
        };
      }
    );
}

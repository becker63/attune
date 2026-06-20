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
        overlays = [
          (final: prev: {
            attune-pi-agent-extension = final.stdenvNoCC.mkDerivation (finalAttrs: {
              pname = "attune-pi-agent-extension";
              version = "0.0.0";

              src = final.lib.fileset.toSource {
                root = ./.;
                fileset = final.lib.fileset.unions [
                  ./package.json
                  ./pnpm-lock.yaml
                  ./pnpm-workspace.yaml
                  ./tsconfig.base.json
                  ./packages/attune-pi-agent
                ];
              };

              pnpmDeps = final.fetchPnpmDeps {
                inherit (finalAttrs) pname version src;
                pnpm = final.pnpm_10;
                fetcherVersion = 3;
                hash = "sha256-1k6otpuBQlJmHKpZsywu5vGFf5KYQY2Ova+c6MyDoHM=";
              };

              nativeBuildInputs = [
                final.nodejs_22
                final.pnpm_10
                final.pnpmConfigHook
              ];

              buildPhase = ''
                runHook preBuild
                pnpm --filter @attune/pi-agent build
                runHook postBuild
              '';

              installPhase = ''
                runHook preInstall
                mkdir -p "$out"
                cp packages/attune-pi-agent/package.json "$out/package.json"
                cp -r packages/attune-pi-agent/dist "$out/dist"
                runHook postInstall
              '';

              meta = {
                description = "Private Attune Pi extension with Attune spec commands";
                platforms = final.lib.platforms.unix;
              };
            });

            pi-task-extension = final.buildNpmPackage rec {
              pname = "pi-task-extension";
              version = "0.14.2";

              nodejs = final.nodejs_22;

              src = final.fetchurl {
                url = "https://registry.npmjs.org/@mjasnikovs/pi-task/-/pi-task-${version}.tgz";
                hash = "sha512-/7KteEO/lhKFke489y1NIyoJEcKQ+m0E27GPfzSt/ZIlfVcWfEZKuRibJPyZ2a9VVuLH1ngidpSInUJimpYLQg==";
              };

              sourceRoot = "package";
              npmDepsHash = "sha256-rDlJ+Ui1f3kZ35lobvCMtsAeuHnkXYv+ieE8ir6VeR8=";
              dontNpmBuild = true;
              npmFlags = [
                "--omit=dev"
                "--legacy-peer-deps"
              ];

              postPatch = ''
                sed -i '/^    "peerDependencies": {/,/^    },$/d' package.json
                sed -i '/^    "devDependencies": {/,/^    },$/d' package.json
                cp ${./nix/pkgs/pi-task/package-lock.json} package-lock.json
              '';

              meta = {
                description = "pi-task Pi extension for conversational task specification";
                homepage = "https://github.com/mjasnikovs/pi-task";
                license = final.lib.licenses.mit;
                platforms = final.lib.platforms.unix;
              };
            };

            pi = final.buildNpmPackage rec {
              pname = "pi";
              version = "0.79.8";

              nodejs = final.nodejs_22;

              src = final.fetchurl {
                url = "https://registry.npmjs.org/@earendil-works/pi-coding-agent/-/pi-coding-agent-${version}.tgz";
                hash = "sha512-wr9oTS/yrwURDXnYrONQgFgV7QDlwslXL/rvKU5X7TRtrGxIhippsRApXqYlRwSeMjb2YzgHMfZ/kAhOqrzoFQ==";
              };

              sourceRoot = "package";
              npmDepsHash = "sha256-oUpGXPQ9yginezduxTkNzpuppmM6670GoNr//BvRWu0=";
              dontNpmBuild = true;
              npmFlags = [ "--omit=dev" ];

              nativeBuildInputs = [
                final.makeWrapper
              ];

              postPatch = ''
                sed -i '/^	"devDependencies": {/,/^	},$/d' package.json
                substituteInPlace npm-shrinkwrap.json \
                  --replace-fail \
                    '"resolved": "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.79.8.tgz",' \
                    '"resolved": "https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.79.8.tgz", "integrity": "sha512-8m5fcqRpoGpq3QY0I/tFXROSTmPwBb1dAuzYZO3XYgjsdCokkRMAGRjA9P8s/UD6Jy9yy69lyE4H6sz/5A1TmQ==",'
                substituteInPlace npm-shrinkwrap.json \
                  --replace-fail \
                    '"resolved": "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.79.8.tgz",' \
                    '"resolved": "https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.79.8.tgz", "integrity": "sha512-ZpSwaD7oNpsjn9vtEatZQNT9PSdDJXi6rFeY5Qv+OHQGFDKlmcrfJE4ypm4SAc/fBECPs4Rdi3l+YjVtXYrkKw==",'
                substituteInPlace npm-shrinkwrap.json \
                  --replace-fail \
                    '"resolved": "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-0.79.8.tgz",' \
                    '"resolved": "https://registry.npmjs.org/@earendil-works/pi-tui/-/pi-tui-0.79.8.tgz", "integrity": "sha512-QerB+0wUc6eEO8MwvzOQGtzcsbwo6y8VvdxYU6vGcakz6ofJZWhrmwrknp1dCGx3bEtCf+siUIxEzkqvFCzIsg==",'
              '';

              postInstall = ''
                wrapProgram "$out/bin/pi" \
                  --prefix PATH : "${
                    final.lib.makeBinPath [
                      final.git
                      final.nodejs_22
                      final.openssh
                    ]
                  }" \
                  --set-default PI_PACKAGE_DIR "$out/lib/node_modules/@earendil-works/pi-coding-agent"

                mv "$out/bin/pi" "$out/bin/.pi-attune-base"
                cat > "$out/bin/pi" <<'EOF'
                #!${final.runtimeShell}
                case "''${1-}" in
                  install|remove|uninstall|update|list|config)
                    exec "$0-attune-base" "$@"
                    ;;
                  *)
                    exec "$0-attune-base" \
                      --extension "${final.attune-pi-agent-extension}/dist/pi-extension.js" \
                      --extension "${final.pi-task-extension}/lib/node_modules/@mjasnikovs/pi-task/dist/index.js" \
                      "$@"
                    ;;
                esac
                EOF
                substituteInPlace "$out/bin/pi" \
                  --replace-fail '"$0-attune-base"' "\"$out/bin/.pi-attune-base\""
                chmod +x "$out/bin/pi"
              '';

              meta = {
                description = "Pi coding agent CLI with npm/git extension install support";
                homepage = "https://github.com/earendil-works/pi";
                license = final.lib.licenses.mit;
                mainProgram = "pi";
                platforms = final.lib.platforms.unix;
              };
            };
          })
        ];
        pkgs = import nixpkgs { inherit overlays system; };
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
      in
      {
        packages = {
          inherit joern openSpec;
          attune-pi-agent-extension = pkgs.attune-pi-agent-extension;
          pi-task-extension = pkgs.pi-task-extension;
          pi = pkgs.pi;
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
            pkgs.pi
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
                        export ATTUNE_PI_BIN="${pkgs.pi}/bin/pi"
                        export PATH="${pkgs.pi}/bin:${pkgs.nodejs_22}/bin:${pkgs.git}/bin:${pkgs.openssh}/bin:$PATH"
                        hash -r 2>/dev/null || true
                        rehash 2>/dev/null || true
                        pi() {
                          "${pkgs.pi}/bin/pi" "$@"
                        }
                        export -f pi 2>/dev/null || true
                        alias pi="${pkgs.pi}/bin/pi" 2>/dev/null || true
                        attune_install_pi_dev_shell_shim() {
                          local global_pi="$HOME/.npm-global/bin/pi"
                          local backup_pi="$HOME/.npm-global/bin/pi.attune-upstream"

                          if [ ! -d "$HOME/.npm-global/bin" ]; then
                            return 0
                          fi

                          if [ -e "$global_pi" ] && ! grep -q "ATTUNE_PI_DEV_SHELL_SHIM" "$global_pi" 2>/dev/null; then
                            if [ ! -e "$backup_pi" ]; then
                              mv "$global_pi" "$backup_pi"
                            else
                              rm -f "$global_pi"
                            fi
                          fi

                          if [ ! -e "$global_pi" ]; then
                            cat > "$global_pi" <<'ATTUNE_PI_DEV_SHELL_SHIM'
            #!/usr/bin/env bash
            # ATTUNE_PI_DEV_SHELL_SHIM
            if [ -n "''${ATTUNE_PI_BIN:-}" ] && [ -x "$ATTUNE_PI_BIN" ]; then
              exec "$ATTUNE_PI_BIN" "$@"
            fi

            backup_pi="$HOME/.npm-global/bin/pi.attune-upstream"
            if [ -x "$backup_pi" ]; then
              exec "$backup_pi" "$@"
            fi

            if [ -e "$backup_pi" ]; then
              exec /usr/bin/env node "$backup_pi" "$@"
            fi

            echo "Attune Pi shim could not find ATTUNE_PI_BIN or $backup_pi." >&2
            exit 127
            ATTUNE_PI_DEV_SHELL_SHIM
                            chmod +x "$global_pi"
                          fi
                        }
                        attune_install_pi_dev_shell_shim
                        echo "Attune dev shell"
                        echo "  pnpm install"
                        echo "  pi --version"
                        echo "  pi install npm:<package> --local --approve"
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

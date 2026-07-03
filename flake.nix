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
                  ./packages/attune/pi-agent
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
                cp packages/attune/pi-agent/package.json "$out/package.json"
                cp -r packages/attune/pi-agent/dist "$out/dist"
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

            opencode-upstream =
              let
                opencodeVersion = "1.17.11";
                platform = {
                  x86_64-linux = {
                    packageName = "opencode-linux-x64";
                    hash = "sha512-at2oODO6N4yMTlvtKOFECVDvj4Nz3iFygmSKyoVdokgpMhYt6l9ta63pEp1jAaTxLpjQGbCzpRYbY/QqRAeB9Q==";
                  };
                  aarch64-linux = {
                    packageName = "opencode-linux-arm64";
                    hash = "sha512-CN3LSlqSrC1LbYHXZs21B8hIB951ebCRowwC+p4SDwPPUKknRzGYi5V7FjXAp8xq5hx27/QGgmGjfauv6RbAiA==";
                  };
                  x86_64-darwin = {
                    packageName = "opencode-darwin-x64";
                    hash = "sha512-ZxQzLT92FT96Y8ahpHZiejD+m7vQYhAfskMwc0baDjkctEXy6UkZT5gY5jTDl+Bb74xgmKYJK6Lz20luhOXA==";
                  };
                  aarch64-darwin = {
                    packageName = "opencode-darwin-arm64";
                    hash = "sha512-WpBokL8RL8BvdPKzJhQlLbVigz4jT0uESDWgwLcsU2JAP8hOWc/bMgzf87C7VtJlcjUY9ao60UzbPlsUffb/0g==";
                  };
                }.${system} or (throw "Unsupported OpenCode platform for ${system}");
              in
              final.stdenvNoCC.mkDerivation {
                pname = "opencode-upstream";
                version = opencodeVersion;

                src = final.fetchurl {
                  url = "https://registry.npmjs.org/${platform.packageName}/-/${platform.packageName}-${opencodeVersion}.tgz";
                  inherit (platform) hash;
                };

                unpackPhase = ''
                  tar -xzf "$src"
                '';

                installPhase = ''
                  runHook preInstall
                  ${final.lib.optionalString final.stdenv.isLinux ''
                    install -Dm755 package/bin/opencode "$out/libexec/opencode-bin"
                    mkdir -p "$out/bin"
                    cat > "$out/bin/opencode" <<EOF
                    #!${final.runtimeShell}
                    exec "${final.stdenv.cc.bintools.dynamicLinker}" \
                      --library-path "${final.lib.makeLibraryPath [ final.glibc ]}" \
                      "$out/libexec/opencode-bin" "\$@"
                    EOF
                    chmod +x "$out/bin/opencode"
                  ''}
                  ${final.lib.optionalString final.stdenv.isDarwin ''
                    install -Dm755 package/bin/opencode "$out/bin/opencode"
                  ''}
                  runHook postInstall
                '';

                meta = {
                  description = "Pinned upstream OpenCode CLI";
                  homepage = "https://opencode.ai";
                  license = final.lib.licenses.mit;
                  mainProgram = "opencode";
                  platforms = final.lib.platforms.unix;
                };
              };

            attune-opencode-harness = final.stdenvNoCC.mkDerivation (finalAttrs: {
              pname = "attune-opencode-harness";
              version = "0.0.0";

              src = final.lib.fileset.toSource {
                root = ./.;
                fileset = final.lib.fileset.unions [
                  ./package.json
                  ./pnpm-lock.yaml
                  ./pnpm-workspace.yaml
                  ./tsconfig.base.json
                  ./.codex/skills/openspec-apply-change
                  ./.codex/skills/openspec-archive-change
                  ./.codex/skills/openspec-explore
                  ./.codex/skills/openspec-propose
                  ./.codex/skills/openspec-sync-specs
                  ./packages/trellis/protocol
                  ./packages/trellis/runtime
                  ./packages/tend/core
                  ./packages/tend/long-job
                  ./packages/tend/opencode
                  ./packages/tend/policies
                  ./packages/tend/reporting
                  ./packages/tend/token-audit
                ];
              };

              pnpmDeps = final.fetchPnpmDeps {
                inherit (finalAttrs) pname version src;
                pnpm = final.pnpm_10;
                fetcherVersion = 3;
                hash = "sha256-cqbftc8Qz3p1BChoQDKb1P0WEtLY46Pt4c1IO71+e8w=";
              };

              nativeBuildInputs = [
                final.makeWrapper
                final.nodejs_22
                final.pnpm_10
                final.pnpmConfigHook
              ];

              dontBuild = true;

              installPhase = ''
                runHook preInstall

                workspace="$out/share/attune-opencode-workspace"
                configDir="$out/share/attune-opencode-config"
                mkdir -p "$workspace" "$out/bin"
                cp package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json "$workspace/"
                mkdir -p "$workspace/packages/tend" "$workspace/packages/trellis" "$workspace/node_modules"
                cp -R packages/tend/core "$workspace/packages/tend/core"
                cp -R packages/tend/long-job "$workspace/packages/tend/long-job"
                cp -R packages/tend/opencode "$workspace/packages/tend/opencode"
                cp -R packages/tend/policies "$workspace/packages/tend/policies"
                cp -R packages/tend/reporting "$workspace/packages/tend/reporting"
                cp -R packages/tend/token-audit "$workspace/packages/tend/token-audit"
                cp -R packages/trellis/protocol "$workspace/packages/trellis/protocol"
                cp -R packages/trellis/runtime "$workspace/packages/trellis/runtime"
                cp -R node_modules/.pnpm "$workspace/node_modules/.pnpm"
                if [ -f node_modules/.modules.yaml ]; then
                  cp node_modules/.modules.yaml "$workspace/node_modules/.modules.yaml"
                fi
                node - "$workspace" <<'NODE'
                const fs = require("fs")
                const path = require("path")

                const workspace = process.argv[2]
                const pnpmStore = path.join(workspace, "node_modules", ".pnpm")
                const packageJsonPath = fs
                  .readdirSync(pnpmStore)
                  .filter((entry) => entry.startsWith("@alchemy.run+node-utils@"))
                  .map((entry) =>
                    path.join(
                      pnpmStore,
                      entry,
                      "node_modules",
                      "@alchemy.run",
                      "node-utils",
                      "package.json",
                    )
                  )
                  .find((candidate) => fs.existsSync(candidate))

                if (packageJsonPath) {
                  const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
                  if (manifest.type !== "module") {
                    manifest.type = "module"
                    fs.writeFileSync(
                      packageJsonPath,
                      JSON.stringify(manifest, null, 2) + "\n",
                    )
                  }
                }
                NODE
                mkdir -p "$configDir/commands" "$configDir/plugins" "$configDir/skills"
                cp packages/tend/opencode/opencode-config/commands/*.md "$configDir/commands/"
                cp packages/tend/opencode/opencode-config/plugins/*.js "$configDir/plugins/"
                cp -R packages/tend/opencode/opencode-config/plugin-packages "$configDir/plugin-packages"
                cp -R .codex/skills/openspec-apply-change "$configDir/skills/openspec-apply-change"
                cp -R .codex/skills/openspec-archive-change "$configDir/skills/openspec-archive-change"
                cp -R .codex/skills/openspec-explore "$configDir/skills/openspec-explore"
                cp -R .codex/skills/openspec-propose "$configDir/skills/openspec-propose"
                cp -R .codex/skills/openspec-sync-specs "$configDir/skills/openspec-sync-specs"
                node - "$configDir" <<'NODE'
                const fs = require("fs")
                const path = require("path")
                const { pathToFileURL } = require("url")

                const configDir = process.argv[2]
                const pluginPackageDir = path.join(configDir, "plugin-packages", "@attune")
                const pluginPackages = fs
                  .readdirSync(pluginPackageDir)
                  .sort()
                  .map((directory) => pathToFileURL(path.join(pluginPackageDir, directory)).href)
                const openSpecCommand = {
                  "attune-fingerprint": {
                    description: "Show the flake-installed Attune/Tend OpenCode harness fingerprint",
                    template: "!`tend-opencode fingerprint --format json`",
                  },
                  "openspec-propose": {
                    description: "Create a new OpenSpec change proposal, design, specs, and tasks",
                    template: "Use the `openspec-propose` skill to create an OpenSpec change.\n\nUser request:\n\n$ARGUMENTS",
                  },
                  "openspec-apply": {
                    description: "Apply tasks from an active OpenSpec change",
                    template: "Use the `openspec-apply-change` skill to implement an OpenSpec change.\n\nChange or request:\n\n$ARGUMENTS",
                  },
                  "openspec-explore": {
                    description: "Explore an OpenSpec idea or change without implementing it",
                    template: "Use the `openspec-explore` skill to investigate this OpenSpec topic.\n\nTopic:\n\n$ARGUMENTS",
                  },
                  "openspec-archive": {
                    description: "Archive a completed OpenSpec change",
                    template: "Use the `openspec-archive-change` skill to archive an OpenSpec change.\n\nChange:\n\n$ARGUMENTS",
                  },
                  "openspec-sync-specs": {
                    description: "Sync OpenSpec delta specs into main specs",
                    template: "Use the `openspec-sync-specs` skill to sync delta specs.\n\nChange:\n\n$ARGUMENTS",
                  },
                  "openspec-status": {
                    description: "Show OpenSpec status JSON for a change",
                    template: "Run the requested OpenSpec status command and summarize the result.\n\n!`openspec status --change \"$ARGUMENTS\" --json`",
                  },
                  "openspec-validate": {
                    description: "Validate an OpenSpec change strictly",
                    template: "Run the requested OpenSpec validation and summarize the result.\n\n!`openspec validate \"$ARGUMENTS\" --strict`",
                  },
                }
                fs.writeFileSync(
                  path.join(configDir, "opencode-config-content.json"),
                  JSON.stringify(
                    {
                      $schema: "https://opencode.ai/config.json",
                      plugin: pluginPackages,
                      skills: {
                        paths: [path.join(configDir, "skills")],
                      },
                      command: openSpecCommand,
                    },
                    null,
                    2,
                  ),
                )
                fs.copyFileSync(
                  path.join(configDir, "opencode-config-content.json"),
                  path.join(configDir, "opencode.json"),
                )
                fs.writeFileSync(
                  path.join(configDir, "tui.json"),
                  JSON.stringify(
                    {
                      $schema: "https://opencode.ai/config.json",
                      plugin: pluginPackages,
                    },
                    null,
                    2,
                  ),
                )
                NODE

                pluginPaths="$(find "$configDir/plugins" -maxdepth 1 -type f -name '*.js' | sort | paste -sd: -)"
                pluginPackagePaths="$(find "$configDir/plugin-packages/@attune" -mindepth 1 -maxdepth 1 -type d | sort | paste -sd: -)"

                runtimePath="${
                  final.lib.makeBinPath [
                    final.git
                    final.nodejs_22
                    final.pnpm_10
                    final.sqlite
                    (final.writeShellApplication {
                      name = "openspec";
                      runtimeInputs = [
                        final.nodejs_22
                      ];
                      text = ''
                        export npm_config_yes=true
                        exec npm exec --yes --package=@fission-ai/openspec@latest -- openspec "$@"
                      '';
                    })
                  ]
                }"

                makeWrapper "$workspace/packages/tend/opencode/node_modules/.bin/tsx" "$out/bin/tend-opencode-tools" \
                  --add-flags "$workspace/packages/tend/opencode/src/cli.ts" \
                  --prefix PATH : "$runtimePath" \
                  --set ATTUNE_OPENCODE_FLAKE_PROVIDED 1 \
                  --set ATTUNE_OPENCODE_FLAKE_SOURCE "$workspace" \
                  --set ATTUNE_OPENCODE_UPSTREAM_PATH "${final.opencode-upstream}/bin/opencode" \
                  --set ATTUNE_OPENCODE_UPSTREAM_VERSION "${final.opencode-upstream.version}" \
                  --set ATTUNE_OPENCODE_CONFIG_DIR "$configDir" \
                  --set ATTUNE_OPENCODE_PLUGIN_PATH "$configDir/plugins/attune-tend.js" \
                  --set ATTUNE_OPENCODE_PLUGIN_PATHS "$pluginPaths" \
                  --set ATTUNE_OPENCODE_PLUGIN_PACKAGE_PATHS "$pluginPackagePaths" \
                  --set ATTUNE_OPENCODE_CONFIG_CONTENT_FILE "$configDir/opencode-config-content.json" \
                  --set OPENCODE_CONFIG "$configDir/opencode.json" \
                  --set ATTUNE_OPENCODE_RUNTIME_PATH "$out/bin/tend-opencode-tools"

                makeWrapper "$workspace/packages/tend/opencode/node_modules/.bin/tsx" "$out/bin/tend-opencode" \
                  --add-flags "$workspace/packages/tend/opencode/src/attune-cli.ts" \
                  --prefix PATH : "$runtimePath" \
                  --set ATTUNE_OPENCODE_FLAKE_PROVIDED 1 \
                  --set ATTUNE_OPENCODE_FLAKE_SOURCE "$workspace" \
                  --set ATTUNE_OPENCODE_UPSTREAM_PATH "${final.opencode-upstream}/bin/opencode" \
                  --set ATTUNE_OPENCODE_UPSTREAM_VERSION "${final.opencode-upstream.version}" \
                  --set ATTUNE_OPENCODE_CONFIG_DIR "$configDir" \
                  --set ATTUNE_OPENCODE_PLUGIN_PATH "$configDir/plugins/attune-tend.js" \
                  --set ATTUNE_OPENCODE_PLUGIN_PATHS "$pluginPaths" \
                  --set ATTUNE_OPENCODE_PLUGIN_PACKAGE_PATHS "$pluginPackagePaths" \
                  --set ATTUNE_OPENCODE_CONFIG_CONTENT_FILE "$configDir/opencode-config-content.json" \
                  --set OPENCODE_CONFIG "$configDir/opencode.json" \
                  --set ATTUNE_OPENCODE_RUNTIME_PATH "$out/bin/tend-opencode"

                runHook postInstall
              '';

              meta = {
                description = "Flake-installed Attune OpenCode harness and Tend OpenCode CLI";
                license = final.lib.licenses.mit;
                platforms = final.lib.platforms.unix;
              };
            });
          })
        ];
        pkgs = import nixpkgs {
          inherit overlays system;
          config.allowUnfreePredicate = pkg: builtins.elem (nixpkgs.lib.getName pkg) [
            "timescaledb"
          ];
        };
        cocoindexTools = import ./nix/toolchains/cocoindex.nix { inherit pkgs; };
        envVars = import ./nix/lib/env-vars.nix;
        joernTools = import ./nix/toolchains/joern.nix { inherit pkgs; };
        kubernetesTools = import ./nix/toolchains/kubernetes.nix { inherit pkgs; };
        localTimescaleTools = import ./nix/toolchains/postgres-timescale.nix { inherit pkgs; };
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
        localTimescaleImage = import ./nix/containers/local-timescaledb.nix {
          inherit
            nix2container
            pkgs
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
          attune-pi-agent-extension = pkgs.attune-pi-agent-extension;
          opencode-upstream = pkgs.opencode-upstream;
          tend-opencode = pkgs.attune-opencode-harness;
          tend-opencode-tools = pkgs.attune-opencode-harness;
          pi-task-extension = pkgs.pi-task-extension;
          pi = pkgs.pi;
          joern-effect-property-image = propertyImage;
          local-timescaledb-image = localTimescaleImage;
          windows-desktop-guard = windowsDesktopGuard;
          default = joern;
        };

        apps.windows-desktop-guard = {
          type = "app";
          program = "${windowsDesktopGuard}/bin/attune-desktop-guard";
        };

        apps.tend-opencode = {
          type = "app";
          program = "${pkgs.attune-opencode-harness}/bin/tend-opencode";
        };

        apps.tend-opencode-tools = {
          type = "app";
          program = "${pkgs.attune-opencode-harness}/bin/tend-opencode-tools";
        };

        apps.opencode-upstream = {
          type = "app";
          program = "${pkgs.opencode-upstream}/bin/opencode";
        };

        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.attune-opencode-harness
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
            pkgs.sqlite
            localTimescaleTools.postgresWithTimescale
            pkgs.nixfmt
            pkgs.pre-commit
            pkgs.ssh-to-age
            joern
            openSpec
          ];

          NX_DAEMON = "false";
          TMPDIR = "/tmp";
          TEMP = "/tmp";
          TMP = "/tmp";
          ALCHEMY_TELEMETRY_DISABLED = "1";
          ${envVars.joernBinary} = "${joern}/bin/joern";
          ${envVars.joernHome} = "${joern}";
          ${envVars.joernCpgVersion} = cpgVersion;
          ${envVars.joernCpgSchemaSources} = "${cpgSchemaSources}";
          ${envVars.joernEffectTestTmpdir} = "/dev/shm";
          JOERN_EFFECT_PROPERTY_TMPFS_SIZE = propertyTmpfsSize;

          shellHook = preCommitCheck.shellHook + ''
            if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
              git config core.hooksPath .githooks
            fi
            export ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR="$PWD/.attune/state/local-timescaledb"
            export ATTUNE_RECIPE_STORE_URL="''${ATTUNE_RECIPE_STORE_URL:-postgresql://attune@127.0.0.1:54329/postgres}"
            export ATTUNE_RECIPE_STORE_MODE="''${ATTUNE_RECIPE_STORE_MODE:-local-postgres}"
            mkdir -p "$ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR"
            echo "Attune dev shell"
            echo "  pnpm install"
            echo "  pnpm exec nx show projects"
            echo "  pnpm exec nx run workspace:check"
            echo "  pnpm exec nx run workspace:policy-fast"
            echo "  pnpm exec nx run joern-effect:generate"
            echo "  pnpm exec nx run cocoindex-effect:generate"
            echo "  pnpm exec nx run platform-alchemy-k8s:generate"
            echo "  local recipe store: $ATTUNE_RECIPE_STORE_MODE at $ATTUNE_RECIPE_STORE_URL"
            echo "  local recipe store data: $ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR"
            echo "  tend-opencode fingerprint --format json"
            echo "  tend-opencode run-harness-test --format json"
          '';
        };

        formatter = pkgs.nixfmt;
      }
    );
}

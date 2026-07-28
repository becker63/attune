{
  description = "Attune investigation capability service";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    pyproject-nix = {
      url = "github:pyproject-nix/pyproject.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    uv2nix = {
      url = "github:pyproject-nix/uv2nix";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
    };

    pyproject-build-systems = {
      url = "github:pyproject-nix/build-system-pkgs";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.uv2nix.follows = "uv2nix";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      pyproject-build-systems,
      pyproject-nix,
      uv2nix,
      ...
    }:
    let
      systems = [
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: import nixpkgs { inherit system; };
      joernToolsFor = system: import ./nix/joern.nix { pkgs = pkgsFor system; };
      agentFsFor = system: import ./nix/agentfs.nix { pkgs = pkgsFor system; };
      workspaceFor =
        system:
        import ./nix/workspace.nix {
          pkgs = pkgsFor system;
          src = self;
          agentfs = agentFsFor system;
          joernTools = joernToolsFor system;
          pnpmHash = "sha256-HdX8QJdNA+lB8w29K/Rkb4kWixS7zcW1pPbVgOuQ+iM=";
          inherit
            pyproject-build-systems
            pyproject-nix
            uv2nix
            ;
        };
    in
    {
      formatter = forAllSystems (system: (pkgsFor system).nixfmt);

      packages = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          agentfs = agentFsFor system;
          tools = joernToolsFor system;
          workspace = workspaceFor system;
        in
        {
          inherit agentfs;
          "agentfs-overlay-contract" = workspace.agentFsOverlayContract;
          "ast-grep" = pkgs.ast-grep;
          "attune-activegraph" = workspace.attuneActiveGraph;
          "attune-activegraph-check-env" = workspace.attuneActiveGraphCheckEnv;
          "attune-activegraph-runtime-env" = workspace.attuneActiveGraphRuntimeEnv;
          "attune-lab" = workspace.attuneLab;
          "attune-golden-investigation-contract" = workspace.goldenInvestigationContract;
          "attune-mcp" = workspace.attuneMcp;
          "cpg-schema-sources" = tools.cpgSchemaSources;
          "effect-joern" = workspace.effectJoern;
          maude = pkgs.maude;
          inherit (tools) astgen joern;
          default = workspace.attuneMcp;
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          agentfs = agentFsFor system;
          tools = joernToolsFor system;
          workspace = workspaceFor system;
        in
        {
          default = pkgs.mkShell {
            buildInputs = [
              pkgs.fuse3.dev
              pkgs.fuse3.out
            ];
            packages = [
              agentfs
              workspace.attuneActiveGraph
              workspace.attuneActiveGraphCheckEnv
              pkgs.ast-grep
              pkgs.git
              pkgs.jq
              pkgs.maude
              pkgs.nixfmt
              pkgs.nodejs_24
              pkgs.pnpm
              pkgs.scc
              pkgs.uv
              pkgs.util-linux
              tools.astgen
              tools.joern
            ];
            shellHook = ''
              export ATTUNE_FUSERMOUNT3=/run/wrappers/bin/fusermount3
            '';
          };
        }
      );

      checks = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          agentfs = agentFsFor system;
          tools = joernToolsFor system;
          workspace = workspaceFor system;
          expectedElf = if system == "aarch64-linux" then "ARM aarch64" else "x86-64";

          agentFsOverlay = pkgs.testers.runNixOSTest {
            name = "attune-agentfs-overlay-${system}";
            nodes.machine =
              { ... }:
              {
                boot.kernelModules = [ "fuse" ];
                environment.systemPackages = [ workspace.agentFsOverlayContract ];
                programs.fuse.enable = true;
                virtualisation.cores = 2;
                virtualisation.diskSize = 4096;
                virtualisation.memorySize = 2048;
              };
            testScript = ''
              machine.wait_for_unit("multi-user.target")
              machine.succeed("test -c /dev/fuse")
              machine.succeed(
                "ATTUNE_FUSERMOUNT3=/run/wrappers/bin/fusermount3 "
                + "${workspace.agentFsOverlayContract}/bin/"
                + "attune-agentfs-overlay-contract",
                timeout=300,
              )
            '';
          };

          goldenInvestigation = pkgs.testers.runNixOSTest {
            name = "attune-golden-investigation-${system}";
            nodes.machine =
              { ... }:
              {
                boot.kernelModules = [ "fuse" ];
                environment.systemPackages = [
                  workspace.goldenInvestigationContract
                ];
                programs.fuse.enable = true;
                users.users.attune = {
                  isNormalUser = true;
                  home = "/home/attune";
                  createHome = true;
                };
                virtualisation.cores = 2;
                virtualisation.diskSize = 12288;
                virtualisation.memorySize = 5120;
              };
            testScript = ''
              machine.wait_for_unit("multi-user.target")
              machine.succeed("test -c /dev/fuse")
              machine.succeed(
                "runuser -u attune -- "
                + "env ATTUNE_FUSERMOUNT3=/run/wrappers/bin/fusermount3 "
                + "${workspace.goldenInvestigationContract}/bin/"
                + "attune-golden-investigation-contract",
                timeout=1200,
              )
            '';
          };

          applicationRuntime =
            pkgs.runCommand "attune-runtime-${system}"
              {
                nativeBuildInputs = [
                  pkgs.file
                  pkgs.gnugrep
                  pkgs.jq
                  workspace.attuneMcp
                ];
              }
              ''
                root="${workspace.attuneMcp}"
                environment="$root/share/attune/environment-v1.json"
                test -x "$root/bin/attune-mcp"
                test -s "$environment"
                test -s "$root/share/attune/contracts/attune-tools.schema.json"
                test -s "$root/share/attune/contracts/attune-tools.sha256"
                jq -e \
                  '.schemaVersion == 1
                   and .versions.effect == "4.0.0-beta.101"
                   and .versions.fastCheck == "4.9.0"
                   and .versions.joern == "${tools.joernVersion}"
                   and .versions.cpgSchema == "${tools.cpgVersion}"
                   and (.flakeLockDigest | test("^[0-9a-f]{64}$"))
                   and (.versions.cpgSchemaHash | test("^[0-9a-f]{64}$"))' \
                  "$environment" >/dev/null
                for executable in \
                  "${pkgs.nodejs_24}/bin/node" \
                  "${pkgs.git}/bin/git" \
                  "${pkgs.maude}/bin/.maude-wrapped" \
                  "${pkgs.ast-grep}/bin/ast-grep" \
                  "${tools.astgen}/bin/astgen" \
                  "${agentfs}/bin/agentfs"; do
                  file -L "$executable" | grep -Fq "${expectedElf}"
                done
                touch "$out"
              '';

          locBudget =
            pkgs.runCommand "attune-typescript-loc-${system}"
              {
                nativeBuildInputs = [
                  pkgs.jq
                  pkgs.scc
                ];
              }
              ''
                report="$TMPDIR/scc.json"
                scc \
                  "${self}/packages/effect-joern" \
                  "${self}/packages/attune-mcp" \
                  --exclude-dir dist,node_modules \
                  --format json > "$report"
                code="$(
                  jq '[.[] | select(.Name == "TypeScript") | .Code] | add // 0' \
                    "$report"
                )"
                echo "Attune V0 TypeScript: $code code lines (target 10000; hard cap 15000)"
                test "$code" -lt 15000
                mkdir -p "$out"
                cp "$report" "$out/scc.json"
                printf '%s\n' "$code" > "$out/typescript-code-lines"
              '';

          activeGraphLoc =
            pkgs.runCommand "attune-activegraph-loc-${system}"
              {
                nativeBuildInputs = [
                  pkgs.jq
                  pkgs.scc
                ];
              }
              ''
                mkdir -p "$out"

                count_python() {
                  report="$1"
                  shift
                  scc \
                    "$@" \
                    --exclude-dir .venv,.pytest_cache,.ruff_cache,__pycache__,dist,attune_activegraph.egg-info \
                    --format json > "$report"
                  jq '[.[] | select(.Name == "Python") | .Code] | add // 0' \
                    "$report"
                }

                production="$(
                  count_python \
                    "$out/production-scc.json" \
                    "${self}/python/attune-activegraph/src/attune_activegraph" \
                    --exclude-dir generated,.venv,.pytest_cache,.ruff_cache,__pycache__,dist,attune_activegraph.egg-info
                )"
                tests_build="$(
                  count_python \
                    "$out/tests-build-scc.json" \
                    "${self}/python/attune-activegraph/tests" \
                    "${self}/python/attune-activegraph/scripts"
                )"
                generated="$(
                  count_python \
                    "$out/generated-scc.json" \
                    "${self}/python/attune-activegraph/src/attune_activegraph/generated"
                )"

                echo "Attune ActiveGraph legacy handwritten production: $production code lines (reported)"
                echo "Attune ActiveGraph legacy handwritten tests/build: $tests_build code lines (reported)"
                echo "Attune ActiveGraph generated Python: $generated code lines (reported, uncapped)"
                echo "Researchbench enforces its scoped 2,200-line budget in activeGraphProjectCheck."

                printf '%s\n' "$production" > "$out/production-code-lines"
                printf '%s\n' "$tests_build" > "$out/tests-build-code-lines"
                printf '%s\n' "$generated" > "$out/generated-code-lines"
                jq -n \
                  --argjson production "$production" \
                  --argjson testsBuild "$tests_build" \
                  --argjson generated "$generated" \
                  '{
                    production: $production,
                    testsBuild: $testsBuild,
                    generated: $generated
                  }' > "$out/summary.json"
              '';

          suite = pkgs.runCommand "attune-investigation-suite-${system}" { } ''
            for contract in \
              "${agentfs.tests."overlay-remount"}" \
              "${workspace.activeGraphBridgeCheck}" \
              "${activeGraphLoc}" \
              "${workspace.activeGraphProjectCheck}" \
              "${agentFsOverlay}" \
              "${applicationRuntime}" \
              "${goldenInvestigation}" \
              "${locBudget}" \
              "${workspace.mcpContractCheck}" \
              "${workspace.nativeToolsCheck}" \
              "${workspace.workspaceCheck}"; do
              test -e "$contract"
            done
            touch "$out"
          '';
        in
        {
          activegraph-bridge = workspace.activeGraphBridgeCheck;
          activegraph-loc = activeGraphLoc;
          activegraph-project = workspace.activeGraphProjectCheck;
          agentfs-overlay = agentFsOverlay;
          agentfs-overlay-regression = agentfs.tests."overlay-remount";
          application-runtime = applicationRuntime;
          golden-investigation = goldenInvestigation;
          investigation-mcp-suite = suite;
          mcp-contracts = workspace.mcpContractCheck;
          native-tools = workspace.nativeToolsCheck;
          typescript-loc = locBudget;
          workspace = workspace.workspaceCheck;
        }
      );
    };
}

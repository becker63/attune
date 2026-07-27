{
  description = "Attune clean-slate Nx monorepo";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    {
      self,
      nixpkgs,
      ...
    }:
    let
      systems = [
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: import nixpkgs { inherit system; };
      effectJoernManifest = builtins.fromJSON (builtins.readFile ./packages/effect-joern/package.json);
      joernToolsFor =
        system:
        import ./nix/joern.nix {
          pkgs = pkgsFor system;
        };
      effectJoernFor =
        system:
        let
          pkgs = pkgsFor system;
        in
        pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
          pname = "effect-joern";
          inherit (effectJoernManifest) version;
          src = self;

          nativeBuildInputs = [
            pkgs.nixfmt
            pkgs.nodejs_24
            pkgs.pnpm
            pkgs.pnpmConfigHook
          ];

          pnpmDeps = pkgs.fetchPnpmDeps {
            pname = "${finalAttrs.pname}-pnpm-deps";
            inherit (finalAttrs) src version;
            fetcherVersion = 4;
            hash = "sha256-ssefBygLNf/v+C1HvIeavqww8CoRtrfLbODqH+lfs6I=";
          };

          buildPhase = ''
            runHook preBuild
            export CI=true
            export NX_DAEMON=false
            export NX_DEFAULT_OUTPUT_STYLE=static
            export NX_TASKS_RUNNER_DYNAMIC_OUTPUT=false
            pnpm check
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            packageRoot="$out/lib/node_modules/joern-effect"
            mkdir -p "$packageRoot"
            cp -R packages/effect-joern/dist "$packageRoot/dist"
            cp packages/effect-joern/package.json "$packageRoot/package.json"
            cp packages/effect-joern/README.md "$packageRoot/README.md"
            runHook postInstall
          '';
        });
    in
    {
      formatter = forAllSystems (system: (pkgsFor system).nixfmt);

      packages = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          tools = joernToolsFor system;
        in
        {
          "effect-joern" = effectJoernFor system;
          nodejs = pkgs.nodejs_24;
          pnpm = pkgs.pnpm;
          inherit (tools) astgen joern;
          "cpg-schema-sources" = tools.cpgSchemaSources;
          default = effectJoernFor system;
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          tools = joernToolsFor system;
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.git
              pkgs.jq
              pkgs.nixfmt
              pkgs.nodejs_24
              pkgs.pnpm
              tools.astgen
              tools.joern
            ];
          };
        }
      );

      checks = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          tools = joernToolsFor system;
          expectedElf = if system == "aarch64-linux" then "ARM aarch64" else "x86-64";
        in
        {
          joern-javascript-smoke =
            pkgs.runCommand "joern-javascript-smoke-${system}"
              {
                nativeBuildInputs = [ tools.joern ];
              }
              ''
                export HOME="$TMPDIR/home"
                mkdir -p "$HOME" source
                cp \
                  "${self}/packages/effect-joern/examples/dangerous-calls.ts" \
                  source/input.ts

                joern-parse \
                  --language jssrc \
                  --nooverlays \
                  --output cpg.bin \
                  source
                test -s cpg.bin

                touch "$out"
              '';

          workspace = effectJoernFor system;

          toolchain = pkgs.runCommand "attune-toolchain-check-${system}" { } ''
            test "$("${pkgs.nodejs_24}/bin/node" --version)" = "v${pkgs.nodejs_24.version}"
            test "$("${pkgs.pnpm}/bin/pnpm" --version)" = "${pkgs.pnpm.version}"
            test "$("${tools.astgen}/bin/astgen" --version)" = "${tools.astgenVersion}"

            "${pkgs.file}/bin/file" "${tools.astgen}/bin/astgen" \
              | "${pkgs.gnugrep}/bin/grep" -Fq "${expectedElf}"

            test -x "${tools.joern}/bin/joern"
            test -x "${tools.joern}/bin/joern-parse"
            test -e "${tools.cpgSchemaSources}"

            test -f \
              "${self}/packages/effect-joern/schema/joern-cpg-schema.${tools.cpgVersion}.json"

            test "$(
              "${pkgs.jq}/bin/jq" -r .packageManager "${self}/package.json"
            )" = "pnpm@${pkgs.pnpm.version}"

            touch "$out"
          '';
        }
      );
    };
}

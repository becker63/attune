{
  description = "Attune OCaml and TypeScript toolchain";

  inputs.nixpkgs.url =
    "github:NixOS/nixpkgs/2f87ae01e829895aa90254d07eb4a5ab431fe8f7";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: import nixpkgs { inherit system; };
    in
    {
      formatter = forAllSystems (system: (pkgsFor system).nixfmt);

      packages = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          ocamlPackages = pkgs.ocaml-ng.ocamlPackages_5_5;

          toolchain = pkgs.symlinkJoin {
            name = "attune-toolchain";
            paths = [
              ocamlPackages.ocaml
              ocamlPackages."ocaml-lsp"
              ocamlPackages.ocamlformat
              pkgs.dune_3
              pkgs.nodejs_24
              pkgs.pnpm
              pkgs.typescript-go
            ];
          };
        in
        {
          inherit toolchain;
          default = toolchain;
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          ocamlPackages = pkgs.ocaml-ng.ocamlPackages_5_5;
        in
        {
          default = pkgs.mkShellNoCC {
            packages = [
              # OCaml 5.5 toolchain and editor support.
              ocamlPackages.ocaml
              ocamlPackages."ocaml-lsp"
              ocamlPackages.ocamlformat
              pkgs.dune_3

              # Native TypeScript 7 compiler and LSP.
              # Editor command: tsgo --lsp --stdio
              pkgs.typescript-go
              pkgs.nodejs_24
              pkgs.pnpm

              # Repository tooling.
              pkgs.git
              pkgs.jq
              pkgs.nil
              pkgs.nixfmt
            ];

            shellHook = ''
              export OCAMLRUNPARAM=b
              echo "Attune: OCaml $(ocamlc -version), TypeScript $(tsgo --version)"
            '';
          };
        }
      );

      checks = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          ocamlPackages = pkgs.ocaml-ng.ocamlPackages_5_5;
        in
        {
          toolchain = pkgs.runCommand "attune-toolchain-contract" {
            nativeBuildInputs = [
              ocamlPackages.ocaml
              ocamlPackages."ocaml-lsp"
              pkgs.typescript-go
            ];
          } ''
            test "$(ocamlc -version)" = "5.5.0"
            test "$(tsgo --version)" = "Version 7.0.2"
            command -v ocamllsp >/dev/null
            command -v tsgo >/dev/null
            mkdir -p "$out"
          '';
        }
      );
    };
}

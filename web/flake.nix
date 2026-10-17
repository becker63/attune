{
  description = "Attune Studio and retained research website";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs =
    { nixpkgs, ... }:
    let
      systems = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
      ];
      core = (import ../attune/flake.nix).outputs { inherit nixpkgs; };
      appsFor =
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          command = name: action: {
            type = "app";
            program = toString (
              pkgs.writeShellScript "attune-web-${name}" ''
                set -eu
                if [ -f "$PWD/web/site/index.html" ]; then cd web; fi
                if [ ! -f "$PWD/site/index.html" ] || [ ! -f "$PWD/../MODULE.bazel" ]; then
                  echo "Run from the Attune checkout or web/." >&2
                  exit 1
                fi
                ${action}
              ''
            );
          };
          bazel = ''nix develop --command bazel --output_base="$HOME/.cache/attune-v2-bootstrap-bazel"'';
        in
        {
          default = command "studio" ''exec node toolchain/dev.mjs "$@"'';
          test = command "test" ''cd ..; exec ${bazel} test //web:layout_test //web:studio_transport_test //web:browser_parity_test --test_env=CHROMIUM_PATH=${pkgs.chromium}/bin/chromium --test_output=errors "$@"'';
          deploy = command "deploy" ''exec node deploy/publish.mjs "$@"'';
        };
    in
    {
      apps = systems appsFor;
      devShells = core.devShells;
    };
}

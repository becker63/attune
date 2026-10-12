{
  description = "Attune website: preview, check, and publish the retained static site";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ];
      perSystem = system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          bazel = pkgs.writeShellScriptBin "bazel" ''
            exec ${pkgs.coreutils}/bin/env -i \
              HOME="$HOME" USER="''${USER:-unknown}" \
              BAZELISK_SKIP_WRAPPER=true USE_BAZEL_VERSION=8.6.0 \
              PATH=${pkgs.lib.makeBinPath [ pkgs.bash pkgs.bazelisk pkgs.coreutils pkgs.git pkgs.gnugrep pkgs.gnused pkgs.which ]}:/usr/bin:/bin \
              SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt \
              ${pkgs.bazelisk}/bin/bazelisk "$@"
          '';
          command = name: action: pkgs.writeShellScript "attune-web-${name}" ''
            set -eu
            if [ -f "$PWD/web/MODULE.bazel" ]; then cd web; fi
            if [ ! -f "$PWD/site/index.html" ] || [ ! -f "$PWD/MODULE.bazel" ]; then
              echo "Run from the Attune checkout or its web/ directory." >&2
              exit 1
            fi
            ${action}
          '';
          runBazel = "${bazel}/bin/bazel --output_base=\"$HOME/.cache/attune-website-deploy\"";
          preview = command "preview" ''exec ${runBazel} run //:preview -- "$@"'';
          test = command "test" ''exec ${runBazel} test //... "$@"'';
          deploy = command "deploy" ''
            launcher=$(${pkgs.coreutils}/bin/mktemp -d -t attune-web-launcher.XXXXXX)
            trap '${pkgs.coreutils}/bin/rm -rf -- "$launcher"' EXIT
            ${runBazel} test //...
            ${runBazel} run --script_path="$launcher/deploy" //:deploy
            # Credentials enter only the publisher, after Bazel has finished.
            "$launcher/deploy" "$@"
          '';
        in {
          inherit preview test deploy;
          devShell = pkgs.mkShell { packages = [ bazel pkgs.bazel-buildtools ]; };
        };
    in {
      apps = forAllSystems (system: {
        default = { type = "app"; program = "${(perSystem system).preview}"; };
        test = { type = "app"; program = "${(perSystem system).test}"; };
        deploy = { type = "app"; program = "${(perSystem system).deploy}"; };
      });
      devShells = forAllSystems (system: { default = (perSystem system).devShell; });
    };
}

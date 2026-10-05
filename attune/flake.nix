{
  description = "Attune v2 bootstrap developer shell; Bazel owns project derivation";

  # Developer bootstrap only. Every pinned input is a non-secret, git-aware
  # remote (github:). This flake lives in the nested `attune/` workspace, so Nix
  # collects the *Git-tracked* checkout tree only: the ignored credential `.env`,
  # the untracked preserved editor checkout and the read-only `attuneflix/`
  # reference (a separate repository) are filtered out by Git collection and
  # never become store inputs. The wrapper below passes the checkout root to the
  # credential helper explicitly rather than relying on the environment.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      perSystem = system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          # BuildBuddy authentication stays outside Bazel's declared action
          # inputs. A Factory Computer Secret in BUILDBUDDY_API_KEY or the
          # ignored checkout-root .env value is returned only to the credential
          # request and is never exported into the client environment.
          buildbuddyCredential = pkgs.writeShellScriptBin
            "attune-buildbuddy-credential" ''
              set -eu
              if [ "''${1:-}" != get ]; then
                echo "unsupported credential-helper command" >&2
                exit 1
              fi
              read -r _request || true

              # Factory managed Droid Computers inject BUILDBUDDY_API_KEY as a
              # Computer Secret. Use it directly when present; the ignored
              # checkout-root .env remains the local-development fallback.
              key="''${BUILDBUDDY_API_KEY:-}"
              if [ -z "$key" ]; then
                # The ignored credential file lives at the checkout root, beside
                # this nested workspace. The wrapper passes that root explicitly
                # as ATTUNE_CHECKOUT, so the helper never searches the caller's
                # environment or guesses a path.
                checkout="''${ATTUNE_CHECKOUT:-$PWD}"
                if [ ! -f "$checkout/.env" ]; then
                  echo "checkout-root .env not found" >&2
                  exit 1
                fi
                key=$(
                  ${pkgs.gawk}/bin/awk '
                    /^BUILDBUDDY_API_KEY=/ {
                      if (found) exit 2
                      sub(/^[^=]*=/, "")
                      print
                      found = 1
                    }
                    END { if (!found) exit 1 }
                  ' "$checkout/.env"
                )
              fi
              case "$key" in
                ""|*[!A-Za-z0-9._~-]*)
                  echo "BUILDBUDDY_API_KEY is missing or malformed" >&2
                  exit 1
                  ;;
              esac
              printf '{"headers":{"x-buildbuddy-api-key":["%s"]}}\n' "$key"
            '';

          # Bazel receives a small allowlisted client environment rather than
          # the caller's desktop, Nix shell, SSH agent, or provider secrets.
          #
          # util-linux and binutils/glibc are on PATH because the declared
          # local_unshare repository rule resolves the pinned unshare binary
          # and its dynamic-library closure with `unshare`, `ldd` and `readelf`.
          #
          # The `:/usr/bin:/bin` suffix is the declared action PATH's
          # container-valid half. Bazel passes this PATH to actions and to test
          # actions, which Bazel's own `test-setup.sh`/`generate-xml.sh`
          # wrappers resolve `bash` and the coreutils through. In the pinned
          # local shell the Nix entries come first; on a remote BuildBuddy
          # worker those store paths simply do not exist, and `/usr/bin:/bin`
          # is what resolves there. Without it no remote action can find even
          # `bash`, and a host-only action kept on the client would lose its
          # shell if a test-only PATH override replaced the client PATH
          # wholesale. No secret is added here.
          bazel = pkgs.writeShellScriptBin "bazel" ''
            set -eu
            workspace="$PWD"
            while [ "$workspace" != / ] && [ ! -f "$workspace/MODULE.bazel" ]; do
              workspace="$(${pkgs.coreutils}/bin/dirname -- "$workspace")"
            done
            # The checkout root holds this nested workspace (`attune/`), the
            # ignored `.env` and the read-only reference checkout. Only the
            # credential helper is told that root, and only to read `.env`.
            checkout="$(${pkgs.coreutils}/bin/dirname -- "$workspace")"
            # Forward a Factory Computer Secret to the credential helper when
            # present. The validated key charset has no separators, so the
            # conditional-argument shape is safe.
            buildbuddy_key_environment=
            if [ -n "''${BUILDBUDDY_API_KEY:-}" ]; then
              buildbuddy_key_environment=BUILDBUDDY_API_KEY="''${BUILDBUDDY_API_KEY}"
            fi
            exec ${pkgs.coreutils}/bin/env -i \
              HOME="$HOME" \
              USER="''${USER:-unknown}" \
              ATTUNE_CHECKOUT="$checkout" \
              $buildbuddy_key_environment \
              BAZELISK_SKIP_WRAPPER=true \
              USE_BAZEL_VERSION=8.6.0 \
              PATH=${pkgs.lib.makeBinPath [
                pkgs.bash
                pkgs.bazelisk
                pkgs.coreutils
                pkgs.findutils
                pkgs.gawk
                pkgs.gcc
                pkgs.git
                pkgs.gnugrep
                pkgs.gnused
                pkgs.which
                pkgs.util-linux
                pkgs.binutils
                pkgs.glibc.bin
              ]}:/usr/bin:/bin \
              SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt \
              ${pkgs.bazelisk}/bin/bazelisk "$@" \
                --credential_helper=remote.buildbuddy.io=${buildbuddyCredential}/bin/attune-buildbuddy-credential
          '';

          # Smallest deterministic law for the credential helper: a Factory
          # Computer Secret wins, the ignored checkout-root .env stays a working
          # fallback, and malformed keys are still rejected. Dummy values only;
          # the real checkout-root .env is never read by this check.
          credentialHelperCheck = pkgs.runCommand "attune-credential-helper-check" { } ''
            set -eu
            helper=${buildbuddyCredential}/bin/attune-buildbuddy-credential
            envelope() { printf '{"headers":{"x-buildbuddy-api-key":["%s"]}}' "$1"; }
            expect() {
              expected=$1
              shift
              actual=$(printf 'remote.buildbuddy.io\n' | env "$@" $helper get)
              if [ "$actual" != "$expected" ]; then
                echo "credential helper produced: $actual" >&2
                exit 1
              fi
            }

            # Factory Computer Secret path: an environment key wins over .env.
            mkdir env-first
            printf 'BUILDBUDDY_API_KEY=dotenv-value\n' > env-first/.env
            expect "$(envelope env-secret-value)" \
              BUILDBUDDY_API_KEY=env-secret-value ATTUNE_CHECKOUT=$PWD/env-first

            # Local fallback: the ignored checkout-root .env still supplies the key.
            mkdir fallback
            printf 'BUILDBUDDY_API_KEY=dotenv-value\n' > fallback/.env
            expect "$(envelope dotenv-value)" ATTUNE_CHECKOUT=$PWD/fallback

            # A malformed environment key is rejected instead of forwarded.
            if printf 'remote.buildbuddy.io\n' | env BUILDBUDDY_API_KEY='bad key' ATTUNE_CHECKOUT=$PWD $helper get >/dev/null 2>&1; then
              echo "malformed key was accepted" >&2
              exit 1
            fi
            touch $out
          '';
        in {
          devShell = pkgs.mkShell {
            packages = [
              bazel
              pkgs.bazel-buildtools
              pkgs.git
              pkgs.jq
              pkgs.util-linux
            ];
          };
          inherit credentialHelperCheck;
        };
    in {
      devShells = forAllSystems (system: { default = (perSystem system).devShell; });
      checks = forAllSystems (system: { credential-helper = (perSystem system).credentialHelperCheck; });
    };
}

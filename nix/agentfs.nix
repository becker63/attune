{ pkgs }:

let
  version = "0.6.4";
  revision = "3a5ed2b88e5d5a5f9b2c7fe02d012b50fd19e3c0";
  patch = ./patches/agentfs-overlay-remount-origin.patch;
  src = pkgs.fetchFromGitHub {
    owner = "tursodatabase";
    repo = "agentfs";
    rev = revision;
    hash = "sha256-wIBSMcuMXDgXieu4NzC/XSAJH6OqiNsXH5jAJPiMTqw=";
  };

  agentfs = pkgs.rustPlatform.buildRustPackage {
    pname = "agentfs";
    inherit src version;

    patches = [ patch ];

    cargoRoot = "cli";
    buildAndTestSubdir = "cli";
    cargoHash = "sha256-vshjtLfjAhrbIPB36et2KuAnEE2qoKRP6a/Lm9gVXQk=";

    nativeBuildInputs = [ pkgs.pkg-config ];
    buildInputs = [
      pkgs.libunwind
      pkgs.openssl
    ];
    RUSTC_BOOTSTRAP = "1";

    # The separately exposed test derivation uses the SDK's own dependency
    # graph so its dev-dependencies are available for the exact regression.
    doCheck = false;

    meta = {
      description = "AgentFS copy-on-write filesystem CLI";
      homepage = "https://github.com/tursodatabase/agentfs";
      license = pkgs.lib.licenses.mit;
      mainProgram = "agentfs";
      platforms = [
        "aarch64-linux"
        "x86_64-linux"
      ];
      sourceProvenance = [ pkgs.lib.sourceTypes.fromSource ];
    };
  };

  overlayRemountTest = pkgs.rustPlatform.buildRustPackage {
    pname = "agentfs-overlay-remount-regression";
    inherit src version;

    patches = [ patch ];

    cargoRoot = "sdk/rust";
    buildAndTestSubdir = "sdk/rust";
    cargoHash = "sha256-Vtc8sqjplR44Om21dCqBzurA3SMrdPPH6SqLuvZXSmI=";
    nativeBuildInputs = [ pkgs.pkg-config ];
    buildInputs = [ pkgs.openssl ];
    doCheck = true;
    cargoTestFlags = [
      "test_overlay_remount_rejects_stale_origin_inode_collision"
    ];

    installPhase = ''
      runHook preInstall
      mkdir -p "$out"
      printf '%s\n' \
        test_overlay_remount_rejects_stale_origin_inode_collision \
        > "$out/contract"
      runHook postInstall
    '';
  };
in
agentfs.overrideAttrs (previous: {
  passthru = (previous.passthru or { }) // {
    inherit patch revision;
    tests = (previous.passthru.tests or { }) // {
      overlay-remount = overlayRemountTest;
    };
  };
})

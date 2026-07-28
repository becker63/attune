# Select and patch the upstream astgen artifact native to the target platform.
# The derivation never relies on cross-architecture emulation.
{ pkgs }:

let
  joernVersion = "4.0.555";
  cpgVersion = "1.7.70";
  astgenVersion = "3.46.0";
  system = pkgs.stdenv.hostPlatform.system;
  astgenReleases = {
    aarch64-linux = {
      asset = "astgen-linux-arm";
      hash = "sha256-6u0ie+FnTANBjbN4Tm2g0MiLyBEqiDXMgiYNYuIMmGw=";
    };
    x86_64-linux = {
      asset = "astgen-linux";
      hash = "sha256-jFTARNXnWctJ9L8G5sCHIbqILKSj8dS0eXBvGqPRYDs=";
    };
  };
  astgenRelease =
    astgenReleases.${system} or (throw "astgen ${astgenVersion} is not packaged for ${system}");
  astgen = pkgs.stdenvNoCC.mkDerivation {
    pname = "astgen";
    version = astgenVersion;

    src = pkgs.fetchurl {
      url = "https://github.com/joernio/astgen-monorepo/releases/download/javascript-astgen/v${astgenVersion}/${astgenRelease.asset}";
      hash = astgenRelease.hash;
    };

    dontUnpack = true;
    # astgen is produced by pkg; stripping its ELF removes the appended
    # JavaScript snapshot that the executable reads from itself at runtime.
    dontStrip = true;

    nativeBuildInputs = [
      pkgs.autoPatchelfHook
      pkgs.gzip
    ];

    buildInputs = [
      pkgs.glibc
      pkgs.stdenv.cc.cc.lib
    ];

    installPhase = ''
      runHook preInstall
      mkdir -p "$out/bin"
      skip="$(sed -n 's/^skip=//p' "$src")"
      test -n "$skip"
      tail -n +"$skip" "$src" | gzip -cd > "$out/bin/astgen"
      chmod 755 "$out/bin/astgen"
      runHook postInstall
    '';

    doInstallCheck = true;
    installCheckPhase = ''
      runHook preInstallCheck
      test "$("$out/bin/astgen" --version)" = "${astgenVersion}"
      runHook postInstallCheck
    '';
  };
  joernRuntimePath = pkgs.lib.makeBinPath [
    astgen
    pkgs.coreutils
    pkgs.findutils
    pkgs.gawk
    pkgs.gnugrep
    pkgs.gnused
    pkgs.gzip
    pkgs.jdk21
  ];
in
{
  inherit
    astgen
    astgenVersion
    joernVersion
    cpgVersion
    ;

  cpgSchemaSources = pkgs.fetchurl {
    url = "https://repo1.maven.org/maven2/io/shiftleft/codepropertygraph-schema_3/${cpgVersion}/codepropertygraph-schema_3-${cpgVersion}-sources.jar";
    hash = "sha256-aXEPEtBJK1cKn2zIPSuUFHCiTH2jLoWYm8eF/yFn8Ak=";
  };

  joern = pkgs.stdenvNoCC.mkDerivation {
    pname = "joern-cli";
    version = joernVersion;
    # Some bundled frontends contain self-reading executables. Keep the
    # upstream distribution intact, just as for astgen above.
    dontStrip = true;

    src = pkgs.fetchurl {
      url = "https://github.com/joernio/joern/releases/download/v${joernVersion}/joern-cli.zip";
      hash = "sha256-EpiYg9a1rqzJey3A7MTilRv1DkjLJE+MjzM9Eai+DH4=";
    };

    nativeBuildInputs = [
      pkgs.makeWrapper
      pkgs.unzip
    ];

    unpackPhase = ''
      unzip -q "$src"
    '';

    installPhase = ''
      mkdir -p "$out/bin" "$out/share"
      cp -R joern-cli "$out/share/joern"

      wrapJoernProgram() {
        wrapProgram "$1" \
          --set JAVA_HOME "${pkgs.jdk21}" \
          --set ASTGEN_BIN "${astgen}/bin/astgen" \
          --prefix PATH : "${joernRuntimePath}"
      }

      # Keep Joern's internal bin directory untouched: the top-level scripts
      # delegate to launchers with the same names there.
      for tool in joern joern-parse joern-export joern-flow joern-scan joern-slice c2cpg.sh jssrc2cpg.sh; do
        if [ -f "$out/share/joern/$tool" ]; then
          wrapJoernProgram "$out/share/joern/$tool"
          ln -s "../share/joern/$tool" "$out/bin/$tool"
        fi
      done
    '';

    doInstallCheck = true;
    installCheckPhase = ''
      runHook preInstallCheck

      for tool in joern joern-parse joern-export joern-flow joern-scan joern-slice c2cpg.sh jssrc2cpg.sh; do
        test "$(readlink "$out/bin/$tool")" = "../share/joern/$tool"
      done

      test -x "$out/share/joern/bin/joern-parse"
      grep -q 'SCRIPT=.*bin/joern-parse' "$out/share/joern/.joern-parse-wrapped"
      "$out/bin/joern-parse" --help >/dev/null

      runHook postInstallCheck
    '';
  };
}

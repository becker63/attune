{ pkgs }:

let
  joernVersion = "4.0.555";
  cpgVersion = "1.7.70";
in
{
  inherit joernVersion cpgVersion;

  cpgSchemaSources = pkgs.fetchurl {
    url = "https://repo1.maven.org/maven2/io/shiftleft/codepropertygraph-schema_3/${cpgVersion}/codepropertygraph-schema_3-${cpgVersion}-sources.jar";
    hash = "sha256-aXEPEtBJK1cKn2zIPSuUFHCiTH2jLoWYm8eF/yFn8Ak=";
  };

  joern = pkgs.stdenvNoCC.mkDerivation {
    pname = "joern-cli";
    version = joernVersion;

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
      mkdir -p "$out"
      cp -R joern-cli/. "$out/"
      mkdir -p "$out/bin"

      for tool in joern joern-parse joern-export joern-flow joern-scan joern-slice; do
        if [ -f "$out/$tool" ]; then
          wrapProgram "$out/$tool" \
            --set JAVA_HOME "${pkgs.jdk21}" \
            --prefix PATH : "${pkgs.lib.makeBinPath [ pkgs.jdk21 ]}"
          ln -sf "../$tool" "$out/bin/$tool"
        fi
      done

      for tool in c2cpg.sh jssrc2cpg.sh; do
        if [ -f "$out/$tool" ]; then
          wrapProgram "$out/$tool" \
            --set JAVA_HOME "${pkgs.jdk21}" \
            --prefix PATH : "${pkgs.lib.makeBinPath [ pkgs.jdk21 ]}"
          ln -sf "../$tool" "$out/bin/$tool"
        fi
      done
    '';
  };
}

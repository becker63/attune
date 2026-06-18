{
  cpgSchemaSources,
  cpgVersion,
  envVars,
  joern,
  nix2container,
  pkgs,
  propertyRuntime,
  system,
}:

let
  joernTools = import ../toolchains/joern.nix { inherit pkgs; };
  nxTarget =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_NX_TARGET";
    in
    if configured == "" then "joern-effect-properties:property-joern" else configured;
  cpuCount =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_CPUS";
    in
    if configured == "" then "4" else configured;
  cpusPerWorker =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER";
    in
    if configured == "" then "2" else configured;
  workerCount =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_WORKERS";
    in
    if configured == "" then "2" else configured;
  fuzzCaseCount =
    let
      configured = builtins.getEnv "JOERN_EFFECT_FUZZ_CASES";
    in
    if configured == "" then "40" else configured;
  fuzzSeed =
    let
      configured = builtins.getEnv "JOERN_EFFECT_FUZZ_SEED";
    in
    if configured == "" then "1337" else configured;
  imageRoot = pkgs.buildEnv {
    name = "joern-effect-property-root";
    paths = propertyRuntime.runtimeInputs ++ [
      joernTools.astgen
      joernTools.linuxLoaderCompat
      pkgs.bash
      pkgs.cacert
      pkgs.coreutils
      pkgs.findutils
      pkgs.gawk
      pkgs.git
      pkgs.gnugrep
      pkgs.gnused
      pkgs.gnutar
      pkgs.gzip
    ];
    pathsToLink = [
      "/bin"
      "/lib64"
    ];
  };
in
nix2container.packages.${system}.nix2container.buildImage {
  name = "attune/joern-effect-property";
  tag = "dev";
  copyToRoot = [ imageRoot ];
  config = {
    Cmd = [
      "/bin/bash"
      "-lc"
      "rm -rf /work/attune && mkdir -p /work/attune && cd /workspace && tar --exclude='./.git' --exclude='./.nx' --exclude='./imports' --exclude='./node_modules' --exclude='./reports' --exclude='./result' --exclude='./workspace' -cf - . | tar -C /work/attune -xf - && ln -s /workspace/node_modules /work/attune/node_modules && cd /work/attune && ./node_modules/.bin/nx run ${nxTarget}"
    ];
    Env = [
      "${envVars.corepackEnableDownloadPrompt}=0"
      "${envVars.joernBinary}=${joern}/bin/joern"
      "${envVars.joernHome}=${joern}"
      "${envVars.joernCpgVersion}=${cpgVersion}"
      "${envVars.joernCpgSchemaSources}=${cpgSchemaSources}"
      "${envVars.joernEffectTestTmpdir}=/work/property-inputs"
      "${envVars.joernEffectWorkspace}=/work/joern-workspace"
      "JOERN_EFFECT_PROPERTY_TMPFS_SIZE=${propertyRuntime.tmpfsSize}"
      "JOERN_EFFECT_PROPERTY_CPUS=${cpuCount}"
      "JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER=${cpusPerWorker}"
      "JOERN_EFFECT_PROPERTY_WORKERS=${workerCount}"
      "JAVA_TOOL_OPTIONS=-XX:ActiveProcessorCount=${cpuCount} -Djava.io.tmpdir=/tmp"
      "LD_LIBRARY_PATH=${joernTools.astgenLibraryPath}"
      "NODE_EXTRA_CA_CERTS=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
      "JOERN_EFFECT_FUZZ_CASES=${fuzzCaseCount}"
      "JOERN_EFFECT_FUZZ_SEED=${fuzzSeed}"
      "JOERN_EFFECT_PROPERTY_NX_TARGET=${nxTarget}"
      "NX_DAEMON=false"
      "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
      "TMPDIR=/tmp"
      "TEMP=/tmp"
      "TMP=/tmp"
    ];
    WorkingDir = "/work/attune";
  };
}

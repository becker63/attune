{ pkgs, ... }:

let
  envVars = import ../lib/env-vars.nix;
  joernTools = import ../toolchains/joern.nix { inherit pkgs; };
  inherit (joernTools)
    astgen
    astgenLibraryPath
    linuxLoaderCompat
    joern
    cpgSchemaSources
    cpgVersion
    ;
  tmpfsSize =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_TMPFS_SIZE";
    in
    if configured == "" then "10g" else configured;
  workerCount =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_WORKERS";
    in
    if configured == "" then "2" else configured;
  cpusPerWorker =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER";
    in
    if configured == "" then "2" else configured;
  cpuCount =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_CPUS";
    in
    if configured == "" then "4" else configured;
  nxTarget =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_NX_TARGET";
    in
    if configured == "" then "joern-effect-properties:property-joern" else configured;
  fuzzCaseCount =
    let
      configured = builtins.getEnv "JOERN_EFFECT_FUZZ_CASES";
    in
    if configured == "" then "40" else configured;
  fuzzBatchCount =
    let
      configured = builtins.getEnv "JOERN_EFFECT_FUZZ_BATCHES";
    in
    if configured == "" then "1" else configured;
  fuzzJoernShardSize =
    let
      configured = builtins.getEnv "JOERN_EFFECT_FUZZ_JOERN_SHARD_SIZE";
    in
    if configured == "" then "9007199254740991" else configured;
  fuzzMaxMutators =
    let
      configured = builtins.getEnv "JOERN_EFFECT_FUZZ_MAX_MUTATORS";
    in
    if configured == "" then "4" else configured;
  fuzzSeed =
    let
      configured = builtins.getEnv "JOERN_EFFECT_FUZZ_SEED";
    in
    if configured == "" then "1337" else configured;
  propertyRunId =
    let
      configured = builtins.getEnv "JOERN_EFFECT_PROPERTY_RUN_ID";
    in
    if configured == "" then "joern-effect-harness-property" else configured;
  axiomEnvFile = "${toString ../../..}/both/joern-effect/.env";
  axiomEnvFiles = if builtins.pathExists axiomEnvFile then [ axiomEnvFile ] else [ ];
in

{
  project.name = "joern-effect-property";
  services.property.out.service.cpus = cpuCount;
  services.property.out.service.env_file = axiomEnvFiles;

  services.property.image.name = "attune/joern-effect-property";
  services.property.image.contents = [
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
    pkgs.jdk21
    pkgs.nodejs_22
    pkgs.pnpm
    astgen
    linuxLoaderCompat
    joern
  ];
  services.property.image.rawConfig = {
    Env = [
      "${envVars.corepackEnableDownloadPrompt}=0"
      "${envVars.joernBinary}=${joern}/bin/joern"
      "${envVars.joernHome}=${joern}"
      "${envVars.joernCpgVersion}=${cpgVersion}"
      "${envVars.joernCpgSchemaSources}=${cpgSchemaSources}"
      "${envVars.joernEffectTestTmpdir}=/work/property-inputs"
      "${envVars.joernEffectWorkspace}=/work/joern-workspace"
      "JOERN_EFFECT_PROPERTY_TMPFS_SIZE=${tmpfsSize}"
      "JOERN_EFFECT_PROPERTY_WORKERS=${workerCount}"
      "JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER=${cpusPerWorker}"
      "JOERN_EFFECT_PROPERTY_CPUS=${cpuCount}"
      "LD_LIBRARY_PATH=${astgenLibraryPath}"
      "NODE_EXTRA_CA_CERTS=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
      "JOERN_EFFECT_FUZZ_CASES=${fuzzCaseCount}"
      "JOERN_EFFECT_FUZZ_BATCHES=${fuzzBatchCount}"
      "JOERN_EFFECT_FUZZ_JOERN_SHARD_SIZE=${fuzzJoernShardSize}"
      "JOERN_EFFECT_FUZZ_MAX_MUTATORS=${fuzzMaxMutators}"
      "JOERN_EFFECT_FUZZ_SEED=${fuzzSeed}"
      "JOERN_EFFECT_PROPERTY_RUN_ID=${propertyRunId}"
      "JOERN_EFFECT_PROPERTY_NX_TARGET=${nxTarget}"
      "NX_DAEMON=false"
      "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
      "TMPDIR=/tmp"
      "TEMP=/tmp"
      "TMP=/tmp"
    ];
    WorkingDir = "/work/attune";
  };

  services.property.service = {
    command = ''
      bash -lc "rm -rf /work/attune && mkdir -p /work/attune && cd /workspace && tar --exclude='./.git' --exclude='./.nx' --exclude='./imports' --exclude='./node_modules' --exclude='./reports' --exclude='./result' --exclude='./workspace' -cf - . | tar -C /work/attune -xf - && ln -s /workspace/node_modules /work/attune/node_modules && cd /work/attune && ./node_modules/.bin/nx run ${nxTarget}"
    '';
    environment = {
      COREPACK_ENABLE_DOWNLOAD_PROMPT = "0";
      JAVA_TOOL_OPTIONS = "-XX:ActiveProcessorCount=${cpuCount} -Djava.io.tmpdir=/tmp";
      JOERN_EFFECT_FUZZ_CASES = fuzzCaseCount;
      JOERN_EFFECT_FUZZ_BATCHES = fuzzBatchCount;
      JOERN_EFFECT_FUZZ_JOERN_SHARD_SIZE = fuzzJoernShardSize;
      JOERN_EFFECT_FUZZ_MAX_MUTATORS = fuzzMaxMutators;
      JOERN_EFFECT_FUZZ_SEED = fuzzSeed;
      JOERN_EFFECT_PROPERTY_RUN_ID = propertyRunId;
      JOERN_EFFECT_PROPERTY_CPUS = cpuCount;
      JOERN_EFFECT_PROPERTY_CPUS_PER_WORKER = cpusPerWorker;
      JOERN_EFFECT_PROPERTY_WORKERS = workerCount;
      JOERN_EFFECT_TEST_TMPDIR = "/work/property-inputs";
      JOERN_EFFECT_WORKSPACE = "/work/joern-workspace";
      JOERN_EFFECT_PROPERTY_TMPFS_SIZE = tmpfsSize;
      JOERN_EFFECT_PROPERTY_NX_TARGET = nxTarget;
      LD_LIBRARY_PATH = astgenLibraryPath;
      NODE_EXTRA_CA_CERTS = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
      NX_DAEMON = "false";
      SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
      TEMP = "/tmp";
      TMP = "/tmp";
      TMPDIR = "/tmp";
    };
    tmpfs = [
      "/dev/shm:rw,exec,nosuid,size=${tmpfsSize}"
      "/work:rw,exec,nosuid,size=${tmpfsSize}"
      "/tmp:rw,exec,nosuid,size=2g"
    ];
    volumes = [
      "${toString ../..}:/workspace:ro"
    ];
    working_dir = "/work/attune";
  };
}

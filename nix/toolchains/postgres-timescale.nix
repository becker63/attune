{ pkgs }:

let
  postgresWithTimescale = pkgs.postgresql_16.withPackages (postgresPackages: [
    postgresPackages.timescaledb
  ]);
  containerEtc = pkgs.runCommand "attune-local-timescaledb-etc" { } ''
    mkdir -p "$out/etc"
    cat > "$out/etc/passwd" <<'EOF'
postgres:x:70:70:PostgreSQL:/tmp:/bin/sh
EOF
    cat > "$out/etc/group" <<'EOF'
postgres:x:70:
EOF
  '';
in
{
  inherit containerEtc postgresWithTimescale;

  serviceName = "attune-local-timescaledb";
  database = "postgres";
  user = "attune";
  port = 54329;
  databaseUrl = "postgresql://attune@127.0.0.1:54329/postgres";

  runtimeInputs = [
    containerEtc
    postgresWithTimescale
    pkgs.bash
    pkgs.coreutils
    pkgs.findutils
    pkgs.gnugrep
    pkgs.gnused
  ];
}

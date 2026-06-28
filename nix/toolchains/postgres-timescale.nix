{ pkgs }:

let
  postgresWithTimescaleBundle = pkgs.postgresql_16.withPackages (postgresPackages: [
    postgresPackages.timescaledb
  ]);
  postgresWithTimescale = pkgs.symlinkJoin {
    name = "attune-postgresql-and-timescaledb-${postgresWithTimescaleBundle.version}";
    paths = [ postgresWithTimescaleBundle ];
    nativeBuildInputs = [ pkgs.makeBinaryWrapper ];
    postBuild = ''
      rm -f "$out/bin/postgres" "$out/bin/.postgres-wrapped"
      cp "${pkgs.postgresql_16}/bin/postgres" "$out/bin/.postgres-wrapped"
      chmod 0555 "$out/bin/.postgres-wrapped"
      makeBinaryWrapper "$out/bin/.postgres-wrapped" "$out/bin/postgres" --argv0 postgres
    '';
  };
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
    pkgs.util-linux
  ];
}

{ pkgs, ... }:

let
  db = import ../toolchains/postgres-timescale.nix { inherit pkgs; };
in
{
  project.name = "attune-local-timescaledb";

  services.timescaledb.image.name = "attune/local-timescaledb";
  services.timescaledb.image.contents = db.runtimeInputs;
  services.timescaledb.image.rawConfig = {
    Env = [
      "PGDATA=/tmp/attune-pgdata"
      "POSTGRES_USER=${db.user}"
      "POSTGRES_DB=${db.database}"
    ];
    ExposedPorts = {
      "5432/tcp" = { };
    };
    WorkingDir = "/tmp";
    User = "postgres";
  };

  services.timescaledb.service = {
    command = ''
      bash -lc " \
        set -eu
        export PGDATA=/tmp/attune-pgdata
        if [ ! -s \"/tmp/attune-pgdata/PG_VERSION\" ]; then
          initdb -D \"/tmp/attune-pgdata\" --username=${db.user} --auth=trust
          printf '%s\n' \"shared_preload_libraries = 'timescaledb'\" \"listen_addresses = '*'\" \"port = 5432\" \"unix_socket_directories = '/tmp'\" >> \"/tmp/attune-pgdata/postgresql.conf\"
          printf '%s\n' \"host all all 0.0.0.0/0 trust\" >> \"/tmp/attune-pgdata/pg_hba.conf\"
        fi
        exec postgres -D \"/tmp/attune-pgdata\"
      "
    '';
    environment = {
      PGDATA = "/tmp/attune-pgdata";
      POSTGRES_DB = db.database;
      POSTGRES_USER = db.user;
    };
    ports = [
      "127.0.0.1:${toString db.port}:5432"
    ];
    tmpfs = [
      "/tmp:rw,exec,nosuid,mode=1777,size=1g"
    ];
  };
}

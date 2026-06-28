{ pkgs, ... }:

let
  db = import ../toolchains/postgres-timescale.nix { inherit pkgs; };
  dataDir = "\${ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR:-.attune/state/local-timescaledb}";
in
{
  project.name = "attune-local-timescaledb";

  services.timescaledb.image.name = "attune/local-timescaledb";
  services.timescaledb.image.contents = db.runtimeInputs;
  services.timescaledb.image.rawConfig = {
    Env = [
      "PGDATA=/var/lib/postgresql/data"
      "POSTGRES_USER=${db.user}"
      "POSTGRES_DB=${db.database}"
    ];
    ExposedPorts = {
      "5432/tcp" = { };
    };
    WorkingDir = "/tmp";
    User = "0";
  };

  services.timescaledb.service = {
    command = ''
      bash -lc " \
        set -eu
        export PGDATA=/var/lib/postgresql/data
        chmod u+w '${pkgs.postgresql_16}/share/postgresql/extension' '${pkgs.postgresql_16}/lib'
        cp -L '${db.postgresWithTimescale}/share/postgresql/extension'/timescaledb* '${pkgs.postgresql_16}/share/postgresql/extension'/
        cp -L '${db.postgresWithTimescale}/lib'/timescaledb*.so '${pkgs.postgresql_16}/lib'/
        chown -R postgres:postgres "$$PGDATA"
        if [ ! -s \"$$PGDATA/PG_VERSION\" ]; then
          setpriv --reuid=70 --regid=70 --clear-groups initdb -D \"$$PGDATA\" --username=${db.user} --auth=trust
        fi
        sed -i '/^# attune-local-timescaledb managed config$/,+5d' \"$$PGDATA/postgresql.conf\"
        printf '%s\n' \"# attune-local-timescaledb managed config\" >> \"$$PGDATA/postgresql.conf\"
        printf '%s\n' \"dynamic_library_path = '${pkgs.postgresql_16}/lib:${db.postgresWithTimescale}/lib'\" >> \"$$PGDATA/postgresql.conf\"
        printf '%s\n' \"shared_preload_libraries = 'timescaledb'\" >> \"$$PGDATA/postgresql.conf\"
        printf '%s\n' \"listen_addresses = '*'\" >> \"$$PGDATA/postgresql.conf\"
        printf '%s\n' \"port = 5432\" >> \"$$PGDATA/postgresql.conf\"
        printf '%s\n' \"unix_socket_directories = '/tmp'\" >> \"$$PGDATA/postgresql.conf\"
        if ! grep -q \"attune-local-timescaledb trust\" \"$$PGDATA/pg_hba.conf\"; then
          printf '%s\n' \"# attune-local-timescaledb trust\" >> \"$$PGDATA/pg_hba.conf\"
          printf '%s\n' \"host all all 0.0.0.0/0 trust\" >> \"$$PGDATA/pg_hba.conf\"
        fi
        exec setpriv --reuid=70 --regid=70 --clear-groups postgres -D \"$$PGDATA\" -c dynamic_library_path='${pkgs.postgresql_16}/lib:${db.postgresWithTimescale}/lib' -c shared_preload_libraries=timescaledb
      "
    '';
    environment = {
      PGDATA = "/var/lib/postgresql/data";
      POSTGRES_DB = db.database;
      POSTGRES_USER = db.user;
    };
    ports = [
      "127.0.0.1:${toString db.port}:5432"
    ];
    tmpfs = [
      "/tmp:rw,exec,nosuid,mode=1777,size=1g"
    ];
    volumes = [
      "${dataDir}:/var/lib/postgresql/data"
    ];
  };
}

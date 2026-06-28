{
  nix2container,
  pkgs,
  system,
}:

let
  db = import ../toolchains/postgres-timescale.nix { inherit pkgs; };
  imageRoot = pkgs.buildEnv {
    name = "attune-local-timescaledb-root";
    paths = db.runtimeInputs;
    pathsToLink = [
      "/bin"
      "/etc"
      "/share"
    ];
  };
in
nix2container.packages.${system}.nix2container.buildImage {
  name = "attune/local-timescaledb";
  tag = "dev";
  copyToRoot = [ imageRoot ];
  config = {
    Cmd = [
      "/bin/bash"
      "-lc"
      ''
        set -eu
        export PGDATA=/var/lib/postgresql/data
        if [ ! -s "$PGDATA/PG_VERSION" ]; then
          initdb -D "$PGDATA" --username=${db.user} --auth=trust
          {
            echo "shared_preload_libraries = 'timescaledb'"
            echo "listen_addresses = '*'"
            echo "port = 5432"
            echo "unix_socket_directories = '/tmp'"
          } >> "$PGDATA/postgresql.conf"
          echo "host all all 0.0.0.0/0 trust" >> "$PGDATA/pg_hba.conf"
        fi
        exec postgres -D "$PGDATA"
      ''
    ];
    Env = [
      "PGDATA=/var/lib/postgresql/data"
      "POSTGRES_USER=${db.user}"
      "POSTGRES_DB=${db.database}"
    ];
    ExposedPorts = {
      "5432/tcp" = { };
    };
    User = "postgres";
    WorkingDir = "/tmp";
  };
}

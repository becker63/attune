{ pkgs }:
{
  package = pkgs.postgresql;
  extensions = [ "pgvector" ];
}

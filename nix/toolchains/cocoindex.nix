{ pkgs }:

let
  ccc = pkgs.writeShellApplication {
    name = "ccc";
    runtimeInputs = [ pkgs.uv ];
    text = ''
      exec uvx --from cocoindex-code ccc "$@"
    '';
  };
in
{
  inherit ccc;
  uv = pkgs.uv;
}

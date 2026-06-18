{ pkgs }:

pkgs.writeShellApplication {
  name = "openspec";
  runtimeInputs = [
    pkgs.nodejs_22
  ];
  text = ''
    export npm_config_yes=true
    exec npm exec --yes --package=@fission-ai/openspec@latest -- openspec "$@"
  '';
}

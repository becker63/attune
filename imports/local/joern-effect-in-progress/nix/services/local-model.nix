{ pkgs }:
{
  package = pkgs.writeShellApplication {
    name = "attune-local-model-placeholder";
    text = "echo local model service not configured yet";
  };
}

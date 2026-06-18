{ pkgs, joern }:
{
  runtimeInputs = [ pkgs.nodejs_22 pkgs.pnpm pkgs.jdk21 joern ];
  tmpfsWorkspace = true;
}

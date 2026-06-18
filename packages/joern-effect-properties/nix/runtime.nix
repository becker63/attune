{ pkgs, joern, tmpfsSize ? "8g" }:
{
  runtimeInputs = [ pkgs.nodejs_22 pkgs.pnpm pkgs.jdk21 joern ];
  inherit tmpfsSize;
  tmpfsWorkspace = true;
}

{ tmpfsSize ? "8g" }:
{
  composeFile = "../../../nix/compose/joern-effect-property.arion.nix";
  inherit tmpfsSize;
}

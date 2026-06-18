{ pkgs }:
{
  mkAttuneApp = name: runtimeInputs: text:
    pkgs.writeShellApplication {
      inherit name runtimeInputs text;
    };
}

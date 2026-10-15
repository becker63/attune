{ lib }:
let
  c = import ../dashboards/contracts.nix { inherit lib; };
  p = {
    id = 1;
    title = "fixture";
    kind = "stat";
    datasource = "operations";
    metric = "up";
    operation = "raw";
    unit = "short";
  };
  fails =
    panels: !(builtins.tryEval (builtins.deepSeq (c.render "fixture" "Fixture" panels) true)).success;
in
lib.all fails [
  [ (p // { kind = "unknown"; }) ]
  [ (p // { datasource = "unknown"; }) ]
  [ (builtins.removeAttrs p [ "title" ]) ]
  [ (p // { w = 25; }) ]
  [
    (
      p
      // {
        x = 23;
        w = 2;
      }
    )
  ]
  [
    p
    p
  ]
  [ (p // { metric = "unknown"; }) ]
  [ (p // { dimensions = [ "source_path" ]; }) ]
  [ (p // { operation = "mean"; }) ]
  [ (p // { unit = "bytes"; }) ]
  [ (p // { unexpectedOption = true; }) ]
]

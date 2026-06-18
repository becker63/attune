{ envVars, joern }:
''
  export ${envVars.tmpdir}="''${${envVars.tmpdir}:-/tmp}"
  echo "joern-effect dev shell"
  echo "  Joern: ${joern}/joern"
  echo "  Buck: buck2 test //..."
  echo "  Generate: nix run .#generate"
''

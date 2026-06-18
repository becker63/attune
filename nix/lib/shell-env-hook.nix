{ envVars, joern }:
''
  export ${envVars.tmpdir}="''${${envVars.tmpdir}:-/tmp}"
  echo "joern-effect dev shell"
  echo "  Joern: ${joern}/joern"
  echo "  Nx: pnpm exec nx show projects"
  echo "  Generate: nix run .#generate"
''

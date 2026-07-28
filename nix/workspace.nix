{
  agentfs,
  joernTools,
  pkgs,
  pnpmHash,
  pyproject-build-systems,
  pyproject-nix,
  src,
  uv2nix,
}:

let
  buildEnvironment = ''
    export CI=true
    export NX_DAEMON=false
    export NX_PARALLEL=1
    export NX_DEFAULT_OUTPUT_STYLE=static
    export NX_TASKS_RUNNER_DYNAMIC_OUTPUT=false
  '';

  pnpmDeps = pkgs.fetchPnpmDeps {
    pname = "attune-workspace-pnpm-deps";
    version = "0.0.0";
    inherit src;
    fetcherVersion = 4;
    hash = pnpmHash;
  };

  commonAttrs = {
    inherit pnpmDeps src;
    CI = "true";
    nativeBuildInputs = [
      pkgs.nodejs_24
      pkgs.pnpm
      pkgs.pnpmConfigHook
    ];
    strictDeps = true;
  };

  activeGraphWorkspace = uv2nix.lib.workspace.loadWorkspace {
    workspaceRoot = src + "/python/attune-activegraph";
  };

  activeGraphOverlay = activeGraphWorkspace.mkPyprojectOverlay {
    sourcePreference = "wheel";
  };

  activeGraphPythonSet =
    (pkgs.callPackage pyproject-nix.build.packages {
      python = pkgs.python312;
    }).overrideScope
      (
        pkgs.lib.composeManyExtensions [
          pyproject-build-systems.overlays.wheel
          activeGraphOverlay
        ]
      );

  attuneActiveGraphRuntimeEnv = activeGraphPythonSet.mkVirtualEnv "attune-activegraph-runtime-env" (
    activeGraphWorkspace.deps.default
  );

  attuneActiveGraphCheckEnv = activeGraphPythonSet.mkVirtualEnv "attune-activegraph-check-env" (
    activeGraphWorkspace.deps.all
  );

  attuneActiveGraph =
    let
      inherit (pkgs.callPackages pyproject-nix.build.util { }) mkApplication;
    in
    mkApplication {
      venv = attuneActiveGraphRuntimeEnv;
      package = activeGraphPythonSet."attune-activegraph";
    };

  effectJoern = pkgs.stdenvNoCC.mkDerivation (
    commonAttrs
    // {
      pname = "effect-joern";
      version = "0.1.0";

      buildPhase = ''
        runHook preBuild
        ${buildEnvironment}
        pnpm nx run joern-effect:typecheck
        pnpm nx run joern-effect:test -- --maxWorkers=1
        pnpm nx run joern-effect:build
        pnpm nx run joern-effect:package:check
        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        packageRoot="$out/lib/node_modules/joern-effect"
        mkdir -p "$packageRoot"
        cp -R packages/effect-joern/dist "$packageRoot/dist"
        cp packages/effect-joern/package.json "$packageRoot/package.json"
        cp packages/effect-joern/README.md "$packageRoot/README.md"
        runHook postInstall
      '';
    }
  );

  runtimeTools = [
    agentfs
    joernTools.astgen
    joernTools.joern
    pkgs.ast-grep
    pkgs.git
    pkgs.maude
    pkgs.nodejs_24
    pkgs.util-linux
  ];

  attuneMcp = pkgs.stdenvNoCC.mkDerivation (
    commonAttrs
    // {
      pname = "attune-mcp";
      version = "0.0.0";
      nativeBuildInputs = commonAttrs.nativeBuildInputs ++ [
        pkgs.git
        pkgs.jq
        pkgs.makeWrapper
        pkgs.util-linux
      ];

      buildPhase = ''
        runHook preBuild
        ${buildEnvironment}
        pnpm nx run attune-mcp:typecheck
        pnpm --filter attune-mcp exec vitest run --maxWorkers=1
        pnpm nx run attune-mcp:build
        pnpm --filter attune-mcp run schema:check
        pnpm --filter attune-mcp run smoke
        pnpm --filter attune-mcp run stdio:check
        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        packageRoot="$out/lib/node_modules/attune-mcp"
        contractRoot="$out/share/attune/contracts"
        environmentPath="$out/share/attune/environment-v1.json"

        pnpm --offline \
          --config.inject-workspace-packages=true \
          --filter attune-mcp deploy \
          --prod \
          "$packageRoot"
        mkdir -p "$out/bin" "$contractRoot" "$(dirname "$environmentPath")"
        cp contracts/attune-tools.schema.json "$contractRoot/"
        cp contracts/attune-tools.sha256 "$contractRoot/"

        flakeLockDigest="$(sha256sum flake.lock | cut -d ' ' -f 1)"
        cpgSchemaHash="$(
          sha256sum \
            "packages/effect-joern/schema/joern-cpg-schema.${joernTools.cpgVersion}.json" \
            | cut -d ' ' -f 1
        )"
        "${pkgs.jq}/bin/jq" --null-input \
          --arg agentFsVersion "${agentfs.version}+attune-remount-origin.1" \
          --arg astGrepVersion "${pkgs.ast-grep.version}" \
          --arg attuneMcpVersion "0.0.0" \
          --arg cpgSchemaHash "$cpgSchemaHash" \
          --arg cpgSchemaVersion "${joernTools.cpgVersion}" \
          --arg effectVersion "4.0.0-beta.101" \
          --arg fastCheckVersion "4.9.0" \
          --arg flakeLockDigest "$flakeLockDigest" \
          --arg joernVersion "${joernTools.joernVersion}" \
          --arg maudeVersion "${pkgs.maude.version}" \
          --arg nodeVersion "${pkgs.nodejs_24.version}" \
          --arg agentfs "${agentfs}" \
          --arg astGrep "${pkgs.ast-grep}" \
          --arg astgen "${joernTools.astgen}" \
          --arg cpgSchemaSources "${joernTools.cpgSchemaSources}" \
          --arg git "${pkgs.git}" \
          --arg joern "${joernTools.joern}" \
          --arg maude "${pkgs.maude}" \
          --arg nodejs "${pkgs.nodejs_24}" \
          '{
            schemaVersion: 1,
            attuneMcpVersion: $attuneMcpVersion,
            flakeLockDigest: $flakeLockDigest,
            versions: {
              effect: $effectVersion,
              agentfs: $agentFsVersion,
              joern: $joernVersion,
              cpgSchema: $cpgSchemaVersion,
              cpgSchemaHash: $cpgSchemaHash,
              maude: $maudeVersion,
              node: $nodeVersion,
              fastCheck: $fastCheckVersion,
              astGrep: $astGrepVersion
            },
            storePaths: {
              agentfs: $agentfs,
              astGrep: $astGrep,
              astgen: $astgen,
              cpgSchemaSources: $cpgSchemaSources,
              git: $git,
              joern: $joern,
              maude: $maude,
              nodejs: $nodejs
            }
          }' > "$environmentPath"
        toolchainDigest="$(sha256sum "$environmentPath" | cut -d ' ' -f 1)"

        makeWrapper "${pkgs.nodejs_24}/bin/node" \
          "$out/bin/attune-mcp" \
          --add-flags "$packageRoot/dist/main.mjs" \
          --prefix PATH : "${pkgs.lib.makeBinPath runtimeTools}" \
          --set ATTUNE_AGENTFS_BIN "${agentfs}/bin/agentfs" \
          --set ATTUNE_AST_GREP_BIN "${pkgs.ast-grep}/bin/ast-grep" \
          --set ATTUNE_CONTRACT_BUNDLE \
            "$contractRoot/attune-tools.schema.json" \
          --set ATTUNE_CONTRACT_DIGEST \
            "$contractRoot/attune-tools.sha256" \
          --set ATTUNE_FLOCK_BIN "${pkgs.util-linux}/bin/flock" \
          --set ATTUNE_FUSERMOUNT3 "/run/wrappers/bin/fusermount3" \
          --set ATTUNE_GIT_BIN "${pkgs.git}/bin/git" \
          --set ATTUNE_JOERN_BIN "${joernTools.joern}/bin/joern" \
          --set ATTUNE_LOCK_HOLDER "$packageRoot/dist/lock-holder.mjs" \
          --set ATTUNE_MAUDE_BIN "${pkgs.maude}/bin/maude" \
          --set ATTUNE_NODE_BIN "${pkgs.nodejs_24}/bin/node" \
          --set ATTUNE_PROPERTY_RUNNER "$packageRoot/dist/property-runner.mjs" \
          --set ATTUNE_TOOLCHAIN_DIGEST "$toolchainDigest"
        runHook postInstall
      '';
    }
  );

  workspaceCheck = pkgs.stdenvNoCC.mkDerivation (
    commonAttrs
    // {
      pname = "attune-workspace-check";
      version = "0.0.0";
      nativeBuildInputs = commonAttrs.nativeBuildInputs ++ [
        pkgs.git
        pkgs.nixfmt
        pkgs.util-linux
      ];

      buildPhase = ''
        runHook preBuild
        ${buildEnvironment}
        pnpm check:typescript
        runHook postBuild
      '';

      installPhase = ''
        mkdir -p "$out"
        touch "$out/passed"
      '';
    }
  );

  mcpContractCheck =
    pkgs.runCommand "attune-mcp-contract-check"
      {
        nativeBuildInputs = [
          attuneMcp
          pkgs.gnugrep
          pkgs.nodejs_24
        ];
      }
      ''
        test -x "${attuneMcp}/bin/attune-mcp"
        test -s "${attuneMcp}/share/attune/contracts/attune-tools.schema.json"
        test -s "${attuneMcp}/share/attune/contracts/attune-tools.sha256"
        "${attuneMcp}/bin/attune-mcp" --smoke
        ATTUNE_HOME="$TMPDIR/attune" \
          "${pkgs.nodejs_24}/bin/node" \
          "${src}/packages/attune-mcp/scripts/check-stdio.mjs" \
          "${attuneMcp}/bin/attune-mcp"
        mkdir -p "$out"
        touch "$out/passed"
      '';

  activeGraphBridgeCheck =
    pkgs.runCommand "attune-activegraph-bridge-check"
      {
        nativeBuildInputs = [
          attuneActiveGraph
          attuneActiveGraphCheckEnv
          attuneMcp
        ];
      }
      ''
        export ATTUNE_ACTIVEGRAPH_RUN_ID="nix-host-bridge-check"
        export ATTUNE_HOME="$TMPDIR/attune"
        export ATTUNE_MCP_COMMAND="${attuneMcp}/bin/attune-mcp"
        export HOME="$TMPDIR/home"
        mkdir -p "$ATTUNE_HOME" "$HOME"
        attune-activegraph-smoke
        mkdir -p "$out"
        touch "$out/passed"
      '';

  activeGraphProjectCheck =
    pkgs.runCommand "attune-activegraph-project-check"
      {
        nativeBuildInputs = [ attuneActiveGraphCheckEnv ];
      }
      ''
        export HOME="$TMPDIR/home"
        export PYTHONPATH="${src}/python/attune-activegraph/src"
        export RUFF_CACHE_DIR="$TMPDIR/ruff-cache"
        export VIRTUAL_ENV="${attuneActiveGraphCheckEnv}"
        mkdir -p "$HOME" "$RUFF_CACHE_DIR"
        cd "${src}/python/attune-activegraph"
        python scripts/generate_contract_models.py check
        ruff format --check .
        ruff check .
        basedpyright
        pytest -o "cache_dir=$TMPDIR/pytest-cache"
        mkdir -p "$out"
        touch "$out/passed"
      '';

  nativeToolsCheck =
    pkgs.runCommand "attune-native-tools-check"
      {
        nativeBuildInputs = runtimeTools ++ [
          pkgs.coreutils
          pkgs.gnugrep
        ];
      }
      ''
        export HOME="$TMPDIR/home"
        mkdir -p "$HOME" maude-fixture ast-grep-fixture/rules \
          ast-grep-fixture/rule-tests/__snapshots__ joern-fixture

        cat > maude-fixture/check.maude <<'EOF'
        mod ATTUNE-SMOKE is
          sort Nat2 .
          ops zero one : -> Nat2 [ctor] .
          op flip : Nat2 -> Nat2 .
          eq flip(zero) = one .
          rl [back] : one => zero .
        endm
        reduce in ATTUNE-SMOKE : flip(zero) .
        rewrite in ATTUNE-SMOKE : one .
        search in ATTUNE-SMOKE : one =>* zero .
        EOF
        maude -no-banner -no-advise -batch maude-fixture/check.maude \
          > maude-fixture/output.txt
        grep -Fq "result Nat2: one" maude-fixture/output.txt
        grep -Fq "Solution 1" maude-fixture/output.txt

        cat > ast-grep-fixture/sgconfig.yml <<'EOF'
        ruleDirs:
          - rules
        testConfigs:
          - testDir: rule-tests
        EOF
        cat > ast-grep-fixture/rules/no-var.yml <<'EOF'
        id: no-var
        language: TypeScript
        rule:
          pattern: var $NAME = $VALUE
        fix: let $NAME = $VALUE
        severity: warning
        message: Prefer let
        EOF
        cat > ast-grep-fixture/rule-tests/no-var-test.yml <<'EOF'
        id: no-var
        valid:
          - let answer = 42
        invalid:
          - var answer = 42
        EOF
        cat > ast-grep-fixture/rule-tests/__snapshots__/no-var-snapshot.yml <<'EOF'
        id: no-var
        snapshots:
          var answer = 42:
            fixed: let answer = 42
            labels:
            - source: var answer = 42
              style: primary
              start: 0
              end: 15
        EOF
        printf '%s\n' 'var answer = 42' > ast-grep-fixture/input.ts
        (cd ast-grep-fixture && ast-grep test)
        (cd ast-grep-fixture && ast-grep scan --json input.ts) \
          > ast-grep-fixture/findings.json
        grep -Eq '"ruleId"[[:space:]]*:[[:space:]]*"no-var"' \
          ast-grep-fixture/findings.json
        (cd ast-grep-fixture && ast-grep scan --update-all input.ts)
        grep -Fq 'let answer = 42' ast-grep-fixture/input.ts

        printf '%s\n' 'export const dangerous = eval("40 + 2")' \
          > joern-fixture/input.ts
        joern-parse --language jssrc --nooverlays --output cpg.bin joern-fixture
        test -s cpg.bin

        test "$(agentfs --version)" = "agentfs ${agentfs.version}"
        test "$(astgen --version)" = "${joernTools.astgenVersion}"
        joern --version </dev/null 2>&1 \
          | grep -Fq "Version: ${joernTools.joernVersion}"
        touch "$out"
      '';

  agentFsOverlayContract = pkgs.writeShellApplication {
    name = "attune-agentfs-overlay-contract";
    runtimeInputs = [
      agentfs
      pkgs.coreutils
      pkgs.fuse3
      pkgs.gawk
      pkgs.git
    ];
    text = ''
      contract_root="$(mktemp -d /tmp/attune-agentfs-contract-XXXXXX)"
      fusermount_executable="''${ATTUNE_FUSERMOUNT3:-fusermount3}"
      mount_pid=""
      active_mount=""

      is_mounted() {
        awk -v path="$1" \
          '$5 == path { found=1 } END { exit found ? 0 : 1 }' \
          /proc/self/mountinfo
      }

      cleanup_mount() {
        if test -n "$active_mount" && is_mounted "$active_mount"; then
          "$fusermount_executable" -u "$active_mount" || true
        fi
        if test -n "$mount_pid" && kill -0 "$mount_pid" 2>/dev/null; then
          kill -TERM "$mount_pid" 2>/dev/null || true
          sleep 0.1
        fi
        if test -n "$mount_pid" && kill -0 "$mount_pid" 2>/dev/null; then
          kill -KILL "$mount_pid" 2>/dev/null || true
        fi
        if test -n "$mount_pid"; then
          wait "$mount_pid" 2>/dev/null || true
        fi
        mount_pid=""
        active_mount=""
      }

      cleanup() {
        cleanup_mount
        rm -rf -- "$contract_root"
      }
      trap cleanup EXIT

      mount_capsule() {
        capsule="$1"
        active_mount="$2"
        mkdir -p "$active_mount"
        HOME="$contract_root/home" \
          TMPDIR="$contract_root" \
          agentfs mount --foreground "$capsule" "$active_mount" \
          >"$contract_root/mount.stdout" \
          2>"$contract_root/mount.stderr" &
        mount_pid="$!"
        for _attempt in $(seq 1 500); do
          if is_mounted "$active_mount"; then
            return
          fi
          if ! kill -0 "$mount_pid" 2>/dev/null; then
            break
          fi
          sleep 0.02
        done
        cat "$contract_root/mount.stdout" >&2
        cat "$contract_root/mount.stderr" >&2
        return 1
      }

      unmount_capsule() {
        "$fusermount_executable" -u "$active_mount"
        for _attempt in $(seq 1 50); do
          if ! is_mounted "$active_mount"; then
            break
          fi
          sleep 0.02
        done
        if is_mounted "$active_mount"; then
          return 1
        fi
        cleanup_mount
      }

      export GIT_CONFIG_NOSYSTEM=1
      export GIT_TERMINAL_PROMPT=0
      export HOME="$contract_root/home"
      export LANG=C
      export LC_ALL=C
      mkdir -p \
        "$HOME" \
        "$contract_root/base/repo/modules/refund-policy" \
        "$contract_root/base/artifacts" \
        "$contract_root/first" \
        "$contract_root/second"

      git -C "$contract_root/base/repo" init --initial-branch=attune/base
      git -C "$contract_root/base/repo" config user.name "Attune Nix Check"
      git -C "$contract_root/base/repo" config user.email \
        "attune-check@example.invalid"
      printf '%s\n' "base copy-up bytes" \
        > "$contract_root/base/repo/copy-up.txt"
      printf '%s\n' "base whiteout bytes" \
        > "$contract_root/base/repo/delete-me.txt"
      printf '%s\n' "policy-v1" \
        > "$contract_root/base/repo/modules/refund-policy/policy.txt"
      git -C "$contract_root/base/repo" add --all
      git -C "$contract_root/base/repo" commit -m "immutable base"
      base_head="$(git -C "$contract_root/base/repo" rev-parse HEAD)"

      (
        cd "$contract_root/first"
        agentfs init --base "$contract_root/base" first
      )
      first_db="$contract_root/first/.agentfs/first.db"
      mount_capsule "$first_db" "$contract_root/mount-first"
      test "$(cat "$active_mount/repo/copy-up.txt")" = "base copy-up bytes"
      stat "$active_mount/repo/.git" >/dev/null
      : > "$active_mount/repo/.git/attune-copy-up"
      printf '%s\n' "first delta" > "$active_mount/repo/copy-up.txt"
      rm "$active_mount/repo/delete-me.txt"
      printf '%s\n' "first created" > "$active_mount/repo/created.txt"
      git -C "$active_mount/repo" add --all
      git -C "$active_mount/repo" commit -m "first investigation"
      first_head="$(git -C "$active_mount/repo" rev-parse HEAD)"
      test "$first_head" != "$base_head"
      unmount_capsule

      mount_capsule "$first_db" "$contract_root/remount-first"
      stat "$active_mount/repo/modules" >/dev/null
      ls -la "$active_mount/repo" >/dev/null
      test "$(cat "$active_mount/repo/modules/refund-policy/policy.txt")" = \
        "policy-v1"
      test "$(cat "$active_mount/repo/copy-up.txt")" = "first delta"
      test "$(cat "$active_mount/repo/created.txt")" = "first created"
      test ! -e "$active_mount/repo/delete-me.txt"
      test "$(git -C "$active_mount/repo" rev-parse HEAD)" = "$first_head"
      test "$(git -C "$active_mount/repo" log -1 --format=%s)" = \
        "first investigation"
      unmount_capsule

      (
        cd "$contract_root/second"
        agentfs init --base "$contract_root/base" second
      )
      second_db="$contract_root/second/.agentfs/second.db"
      mount_capsule "$second_db" "$contract_root/mount-second"
      test "$(cat "$active_mount/repo/copy-up.txt")" = "base copy-up bytes"
      printf '%s\n' "second delta" > "$active_mount/repo/copy-up.txt"
      test ! -e "$active_mount/repo/created.txt"
      unmount_capsule

      mount_capsule "$first_db" "$contract_root/remount-first-again"
      test "$(cat "$active_mount/repo/copy-up.txt")" = "first delta"
      unmount_capsule

      test "$(cat "$contract_root/base/repo/copy-up.txt")" = \
        "base copy-up bytes"
      test "$(cat "$contract_root/base/repo/delete-me.txt")" = \
        "base whiteout bytes"
      test ! -e "$contract_root/base/repo/created.txt"
      test "$(git -C "$contract_root/base/repo" rev-parse HEAD)" = "$base_head"
      test -z "$(git -C "$contract_root/base/repo" status --porcelain)"
    '';
  };

  goldenInvestigationContract = pkgs.writeShellApplication {
    name = "attune-golden-investigation-contract";
    runtimeInputs = runtimeTools ++ [
      attuneMcp
      pkgs.coreutils
    ];
    text = ''
      environment="${attuneMcp}/share/attune/environment-v1.json"
      export ATTUNE_AGENTFS_BIN="${agentfs}/bin/agentfs"
      export ATTUNE_AST_GREP_BIN="${pkgs.ast-grep}/bin/ast-grep"
      export ATTUNE_CONTRACT_BUNDLE="${attuneMcp}/share/attune/contracts/attune-tools.schema.json"
      export ATTUNE_CONTRACT_DIGEST="${attuneMcp}/share/attune/contracts/attune-tools.sha256"
      export ATTUNE_FLOCK_BIN="${pkgs.util-linux}/bin/flock"
      export ATTUNE_FUSERMOUNT3="''${ATTUNE_FUSERMOUNT3:-/run/wrappers/bin/fusermount3}"
      export ATTUNE_GIT_BIN="${pkgs.git}/bin/git"
      export ATTUNE_JOERN_BIN="${joernTools.joern}/bin/joern"
      export ATTUNE_LOCK_HOLDER="${attuneMcp}/lib/node_modules/attune-mcp/dist/lock-holder.mjs"
      export ATTUNE_MAUDE_BIN="${pkgs.maude}/bin/maude"
      export ATTUNE_MCP_BIN="${attuneMcp}/bin/attune-mcp"
      export ATTUNE_NODE_BIN="${pkgs.nodejs_24}/bin/node"
      export ATTUNE_PROPERTY_RUNNER="${attuneMcp}/lib/node_modules/attune-mcp/dist/property-runner.mjs"
      toolchain_digest="$(sha256sum "$environment" | cut -d ' ' -f 1)"
      export ATTUNE_TOOLCHAIN_DIGEST="$toolchain_digest"
      exec "${pkgs.nodejs_24}/bin/node" \
        "${attuneMcp}/lib/node_modules/attune-mcp/scripts/golden-investigation.mjs"
    '';
  };

  attuneLab = pkgs.buildEnv {
    name = "attune-lab";
    paths = runtimeTools ++ [
      attuneActiveGraph
      attuneMcp
      effectJoern
      pkgs.fuse3.out
    ];
  };
in
{
  inherit
    activeGraphBridgeCheck
    activeGraphProjectCheck
    agentFsOverlayContract
    attuneActiveGraph
    attuneActiveGraphCheckEnv
    attuneActiveGraphRuntimeEnv
    attuneLab
    attuneMcp
    effectJoern
    goldenInvestigationContract
    mcpContractCheck
    nativeToolsCheck
    pnpmDeps
    runtimeTools
    workspaceCheck
    ;
}

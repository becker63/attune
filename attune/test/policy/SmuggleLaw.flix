// Laws for the anti-smuggling content scan's no-over-refusal guarantees and
// allowlist boundaries. Refusal shapes are not inlined here: the manifested
// adversarial corpus (policy data class adversarial-corpus) is the single
// shape authority, asserted end-to-end and against the pure detector by the
// corpus runner, so this law source itself stays free of smuggle shapes.
use Attune.Frozen.Smuggle

@Test
def benignSystemdAndPackageSeamsPass(): Unit \ Assert =
    List.forEach(body -> Assert.assertEq(expected = Nil,
        Smuggle.scanCarrier("service.nix", body)),
        List#{
            "{ pkgs }: {\n  systemd.services.attune-demo = {\n    description = \"Demo service\";\n    serviceConfig.ExecStart = \"\${pkgs.coreutils}/bin/echo started\";\n  };\n}",
            "pkgs.writeShellScript \"attune-demo\" ''echo started''",
            "policy = pkgs.writeText \"attune-install-policy.json\" (builtins.toJSON host);",
            "path = pkgs.writeText \"\${name}.json\" (builtins.toJSON d);"
        })

@Test
def benignProseAndQueriesPass(): Unit \ Assert =
    List.forEach(match (path, body) -> Assert.assertEq(expected = Nil,
        Smuggle.scanCarrier(path, body)),
        List#{
            ("notes/design.md", "The boundary launches a subprocess with a watchdog; the word subprocess in prose is not a program."),
            ("infra/tests/default.nix", "querySql = pkgs.writeText \"attune-dashboard-queries.sql\" (builtins.toJSON queries);"),
            ("real-data/default.nix", "path = pkgs.writeText \"\${name}.json\" (builtins.toJSON d);"),
            ("src/New.flix", "def main(): Unit \\ IO = println(\"the doc mentions fetchurl but imports nothing\")")
        })

@Test
def pinnedFetchGitWithRevisionPasses(): Unit \ Assert =
    Assert.assertEq(expected = Nil,
        Smuggle.scanCarrier("pins.nix", "src = builtins.fetchGit { url = \"https://attune.example/repo\"; rev = \"d268c9b2b236e229fdcec352c9116dbb7f8c801d\"; };"))

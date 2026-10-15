{ pkgs, inputs }:
pkgs.testers.runNixOSTest {
  name = "attune-comin-signed-reconciliation";
  globalTimeout = 420;
  nodes.machine = { lib, ... }: {
    imports = [ inputs.comin.nixosModules.comin ];
    nix.enable = true;
    nix.settings = {
      substituters = lib.mkForce [ ];
      experimental-features = [
        "nix-command"
        "flakes"
      ];
      max-jobs = 1;
      cores = 1;
    };
    services.comin = {
      enable = true;
      deployConfirmer.mode = "manual";
      sshAllowedSignersPath = "/srv/fixture/allowed";
      remotes = [
        {
          name = "fixture";
          url = "/srv/fixture";
          poller.period = 2;
          branches.testing.name = "testing-machine";
        }
      ];
      exporter.listen_address = "127.0.0.1";
    };
    systemd.services.comin.wantedBy = lib.mkForce [ ];
    environment.systemPackages = [
      pkgs.python3
      pkgs.git
      pkgs.openssh
      pkgs.curl
    ];
    system.extraDependencies = [
      pkgs.coreutils
      pkgs.bash
    ];
    environment.etc = {
      "comin_fixture.py".source = ./comin_fixture.py;
      "comin-flake.nix.in".source = ./fixtures/comin-flake.nix.in;
      "comin-fixture.json".text = builtins.toJSON {
        bash = toString pkgs.bash;
        coreutils = toString pkgs.coreutils;
        system = pkgs.stdenv.hostPlatform.system;
      };
    };
    virtualisation.memorySize = 2048;
    virtualisation.writableStore = true;
  };
  testScript = ''
    machine.start(allow_reboot=True)
    machine.wait_for_unit("multi-user.target")
    machine.succeed("python3 /etc/comin_fixture.py initial; systemctl start comin")
    machine.wait_until_succeeds("comin confirmation show | grep 'Confirmation needed for deploying'")
    machine.fail("test -f /var/lib/comin/fixture-activation")
    machine.succeed("comin confirmation accept")
    machine.wait_until_succeeds("grep 'initial switch' /var/lib/comin/fixture-activation", timeout=90)
    initial_profile = machine.succeed("readlink -f /nix/var/nix/profiles/system")
    machine.succeed("git -C /srv/fixture switch -c testing-machine; python3 /etc/comin_fixture.py candidate")
    machine.wait_until_succeeds("comin confirmation show | grep 'Confirmation needed for deploying'")
    machine.succeed("grep 'initial switch' /var/lib/comin/fixture-activation; comin confirmation accept")
    machine.wait_until_succeeds("grep 'candidate test' /var/lib/comin/fixture-activation", timeout=120)
    assert machine.succeed("readlink -f /nix/var/nix/profiles/system") == initial_profile
    stamp = machine.succeed("stat -c %Y /var/lib/comin/fixture-activation")
    machine.sleep(5)
    assert machine.succeed("stat -c %Y /var/lib/comin/fixture-activation") == stamp
    machine.succeed("python3 /etc/comin_fixture.py failed-activation --bad-activation")
    machine.wait_until_succeeds("comin confirmation show | grep 'Confirmation needed for deploying'")
    machine.succeed("comin confirmation accept")
    machine.wait_until_succeeds("curl -fsS localhost:4243/metrics | grep 'comin_last_deployment_failed 1'")
    machine.succeed("grep 'candidate test' /var/lib/comin/fixture-activation")
    assert machine.succeed("readlink -f /nix/var/nix/profiles/system") == initial_profile
    machine.succeed("python3 /etc/comin_fixture.py unsigned --unsigned")
    machine.sleep(5)
    machine.succeed("grep 'candidate test' /var/lib/comin/fixture-activation")
    machine.succeed("python3 /etc/comin_fixture.py untrusted --untrusted")
    machine.sleep(5)
    machine.succeed("grep 'candidate test' /var/lib/comin/fixture-activation")
    machine.succeed("python3 /etc/comin_fixture.py broken --bad-build")
    machine.wait_until_succeeds("curl -fsS localhost:4243/metrics | grep 'comin_last_build_failed 1'", timeout=120)
    machine.succeed("grep 'candidate test' /var/lib/comin/fixture-activation")
    machine.succeed("python3 /etc/comin_fixture.py wrong-identity --wrong-machine")
    machine.sleep(5)
    machine.succeed("grep 'candidate test' /var/lib/comin/fixture-activation")
    machine.succeed("git -C /srv/fixture switch main; git -C /srv/fixture branch -D testing-machine; python3 /etc/comin_fixture.py production")
    machine.wait_until_succeeds("comin confirmation show | grep 'Confirmation needed for deploying'")
    machine.succeed("grep 'candidate test' /var/lib/comin/fixture-activation; comin confirmation accept")
    machine.wait_until_succeeds("grep 'production switch' /var/lib/comin/fixture-activation", timeout=90)
    history = machine.succeed("comin deployment list")
    assert "done" in history
    machine.reboot()
    machine.wait_for_unit("multi-user.target")
    machine.succeed("systemctl start comin")
    machine.wait_for_unit("comin.service")
    machine.wait_until_succeeds("comin deployment list | grep done")
  '';
}

{ pkgs, inputs }:
pkgs.testers.runNixOSTest {
  name = "attune-btrfs-root-reset";
  globalTimeout = 300;
  nodes.machine = { lib, ... }: {
    imports = [
      inputs.impermanence.nixosModules.impermanence
      inputs.sops-nix.nixosModules.sops
      ../modules/persistence.nix
    ];
    nix.enable = true;
    specialisation.candidate.configuration.environment.etc."attune-generation".text = "candidate";
    virtualisation.useDefaultFilesystems = false;
    virtualisation.diskSize = 4096;
    virtualisation.memorySize = 3072;
    virtualisation.fileSystems = {
      "/" = {
        device = "/dev/disk/by-label/attune-system";
        fsType = "btrfs";
        options = [ "subvol=@root" ];
      };
      "/persist" = {
        device = "/dev/disk/by-label/attune-system";
        fsType = "btrfs";
        options = [ "subvol=@persist" ];
        neededForBoot = true;
      };
      "/data" = {
        device = "/dev/disk/by-label/attune-system";
        fsType = "btrfs";
        options = [ "subvol=@data" ];
        neededForBoot = true;
      };
    };
    boot.supportedFilesystems = [ "btrfs" ];
    boot.initrd.availableKernelModules = [
      "virtio_blk"
      "virtio_pci"
    ];
    boot.initrd.systemd.services.fixture-format = {
      wantedBy = [ "initrd.target" ];
      before = [ "attune-reset-root.service" ];
      after = [ "systemd-udev-settle.service" ];
      wants = [ "systemd-udev-settle.service" ];
      requiredBy = [ "attune-reset-root.service" ];
      unitConfig.DefaultDependencies = false;
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [
        pkgs.btrfs-progs
        pkgs.util-linux
        pkgs.coreutils
        pkgs.systemd
        pkgs.age
        pkgs.sops
      ];
      script = ''
        set -euxo pipefail
        udevadm settle
        test -b /dev/vda
        if ! blkid /dev/vda; then
          mkfs.btrfs -L attune-system /dev/vda
          mkdir -p /run/fixture-format
          mount -t btrfs /dev/vda /run/fixture-format
          for subvolume in @root @persist @data; do
            btrfs subvolume create "/run/fixture-format/$subvolume"
          done
          set +x
          age-keygen -o /run/fixture-format/@persist/test-age-key
          recipient=$(age-keygen -y /run/fixture-format/@persist/test-age-key)
          printf 'fixture: retained\ngarage-rpc: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n' | sops --encrypt --age "$recipient" --input-type yaml --output-type yaml /dev/stdin > /run/fixture-format/@persist/test-secret.yaml
          set -x
          umount /run/fixture-format
          udevadm trigger --action=change /sys/class/block/vda
          udevadm settle
        fi
      '';
    };
    sops = {
      validateSopsFiles = false;
      age = {
        keyFile = "/persist/test-age-key";
        sshKeyPaths = [ ];
      };
      secrets.garage-rpc = {
        sopsFile = "/persist/test-secret.yaml";
        format = "yaml";
        owner = "garage";
      };
      secrets.fixture = {
        restartUnits = [ "fixture-secret-reader.service" ];
        sopsFile = "/persist/test-secret.yaml";
        format = "yaml";
      };
    };
    services.garage = {
      enable = true;
      package = pkgs.garage_2;
      settings = {
        metadata_dir = "/data/garage/meta";
        data_dir = "/data/garage/blocks";
        replication_factor = 1;
        db_engine = "lmdb";
        rpc_bind_addr = "127.0.0.1:3901";
        rpc_public_addr = "127.0.0.1:3901";
        rpc_secret_file = "/run/secrets/garage-rpc";
        s3_api = {
          api_bind_addr = "127.0.0.1:3900";
          s3_region = "attune";
        };
      };
    };
    users.users.garage = {
      isSystemUser = true;
      group = "garage";
    };
    users.groups.garage = { };
    systemd.services.garage.serviceConfig = {
      DynamicUser = lib.mkForce false;
      User = "garage";
      Group = "garage";
    };
    services.clickhouse = {
      enable = true;
      serverConfig.path = "/data/clickhouse/";
    };
    services.grafana = {
      enable = true;
      dataDir = "/data/grafana";
      settings = {
        server.http_addr = "127.0.0.1";
        security.secret_key = "disposable-vm-key";
      };
    };
    services.victoriametrics = {
      enable = true;
      listenAddress = "127.0.0.1:8428";
    };
    users.users.victoriametrics = {
      isSystemUser = true;
      group = "victoriametrics";
    };
    users.groups.victoriametrics = { };
    systemd.services.victoriametrics.serviceConfig = {
      DynamicUser = lib.mkForce false;
      User = "victoriametrics";
      Group = "victoriametrics";
    };
    environment.persistence."/persist".directories = [
      {
        directory = "/var/lib/victoriametrics";
        user = "victoriametrics";
        group = "victoriametrics";
        mode = "0700";
      }
    ];
    environment.etc."garage-client.py".source = ./garage_client.py;
    environment.etc."attune-ingest".source = ../ingest;
    time.timeZone = "UTC";
    services.openssh = {
      enable = true;
      hostKeys = [
        {
          path = "/persist/ssh/ssh_host_ed25519_key";
          type = "ed25519";
        }
      ];
    };
    systemd.tmpfiles.rules = [
      "d /persist/ssh 0700 root root -"
      "d /data/garage 0700 garage garage -"
      "d /data/garage/meta 0700 garage garage -"
      "d /data/garage/blocks 0700 garage garage -"
      "d /data/clickhouse 0700 clickhouse clickhouse -"
    ];
    environment.systemPackages = [
      pkgs.age
      pkgs.sops
      pkgs.btrfs-progs
      pkgs.curl
      pkgs.garage_2
      (pkgs.python3.withPackages (p: [ p.boto3 ]))
    ];
    systemd.services.fixture-secret-reader = {
      wantedBy = [ "multi-user.target" ];
      unitConfig.RequiresMountsFor = [ "/data" ];
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
      path = [ pkgs.coreutils ];
      script = "cat /run/secrets/fixture > /data/fixture-secret-seen";
    };
    systemd.services.deliberately-failed = {
      unitConfig.ConditionPathExists = "!/run/skip-fixture-failure";
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = "${pkgs.coreutils}/bin/false";
      };
    };
  };
  testScript = ''
    machine.start(allow_reboot=True)
    machine.wait_for_unit("sshd.service")
    for unit in ["garage", "clickhouse", "grafana", "victoriametrics"]:
        machine.wait_for_unit(unit + ".service")
    machine.wait_until_succeeds("curl -fsS localhost:3000/api/health")
    machine.succeed("garage layout assign -z fixture -c 1G $(garage node id -q | cut -d@ -f1); garage layout apply --version 1; garage bucket create fixture")
    machine.succeed("python3 /etc/garage-client.py setup http://127.0.0.1:3900")
    machine.succeed("clickhouse-client --multiquery --query='CREATE DATABASE durable; CREATE TABLE durable.fixture (x UInt8) ENGINE=MergeTree ORDER BY x; INSERT INTO durable.fixture VALUES (7)'")
    machine.succeed("curl -fsS -u admin:admin -X PUT -H 'Content-Type: application/json' -d '{\"theme\":\"dark\"}' localhost:3000/api/user/preferences")
    machine.succeed("curl -fsS --data-binary 'persistence_probe 7' localhost:8428/api/v1/import/prometheus")
    identity = machine.succeed("cat /etc/machine-id; cat /persist/ssh/ssh_host_ed25519_key.pub")
    machine.succeed("touch /etc/undeclared; echo retained > /data/evidence; echo deployment > /var/lib/comin/retained")
    machine.succeed("btrfs subvolume create /root/nested")
    machine.succeed("echo fixture | age -r $(age-keygen -y /persist/test-age-key) > /data/fixture.age; grep retained /run/secrets/fixture")
    machine.succeed("mv /var/lib/fixture-s3.json /persist/fixture-s3.json")
    machine.reboot()
    machine.wait_for_unit("sshd.service")
    for unit in ["garage", "clickhouse", "grafana", "victoriametrics"]:
        machine.wait_for_unit(unit + ".service")
    machine.succeed("cp /persist/fixture-s3.json /var/lib/fixture-s3.json; python3 /etc/garage-client.py read http://127.0.0.1:3900")
    machine.succeed("clickhouse-client --query='SELECT x FROM durable.fixture' | grep 7")
    machine.wait_until_succeeds("curl -fsS -u admin:admin localhost:3000/api/user/preferences | grep dark")
    machine.wait_until_succeeds("curl -fsS 'localhost:8428/api/v1/query?query=persistence_probe' | grep '7'")
    machine.fail("test -e /etc/undeclared")
    machine.fail("test -e /root/nested")
    assert machine.succeed("cat /etc/machine-id; cat /persist/ssh/ssh_host_ed25519_key.pub") == identity
    machine.succeed("grep retained /data/evidence; grep deployment /var/lib/comin/retained")
    machine.succeed("age -d -i /persist/test-age-key /data/fixture.age | grep fixture")
    machine.succeed("grep retained /run/secrets/fixture")
    machine.fail("systemctl is-active deliberately-failed")
    machine.succeed("touch /run/skip-fixture-failure; systemctl reset-failed deliberately-failed")
    # Both generations are full prebuilt NixOS closures. No in-guest builds.
    machine.succeed("grep retained /data/fixture-secret-seen")
    machine.succeed("printf 'fixture: rotated\\ngarage-rpc: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\\n' | sops --encrypt --age $(age-keygen -y /persist/test-age-key) --input-type yaml --output-type yaml /dev/stdin > /persist/test-secret.yaml.pending; mv /persist/test-secret.yaml.pending /persist/test-secret.yaml")
    original = machine.succeed("readlink -f /run/current-system").strip()
    machine.succeed(f"nix-env -p /nix/var/nix/profiles/system --set {original}")
    candidate = machine.succeed(f"readlink -f {original}/specialisation/candidate").strip()
    machine.succeed(f"nix-env -p /nix/var/nix/profiles/system --set {candidate}; {candidate}/bin/switch-to-configuration switch")
    machine.succeed("grep candidate /etc/attune-generation; grep rotated /run/secrets/fixture; grep rotated /data/fixture-secret-seen")
    assert machine.succeed("readlink -f /nix/var/nix/profiles/system").strip() == candidate
    machine.succeed("nix-env -p /nix/var/nix/profiles/system --rollback; /nix/var/nix/profiles/system/bin/switch-to-configuration switch")
    machine.fail("test -f /etc/attune-generation")
    machine.wait_for_unit("clickhouse.service")
    machine.succeed("clickhouse-client --query='SELECT x FROM durable.fixture' | grep 7; grep retained /data/evidence")
  '';
}

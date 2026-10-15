{ pkgs }:
let
  node = { lib, config, ... }: {
    services.garage = {
      enable = true;
      package = pkgs.garage_2;
      settings = {
        replication_factor = 3;
        consistency_mode = "consistent";
        rpc_timeout_msec = 3000;
        rpc_ping_timeout_msec = 1000;
        data_fsync = true;
        metadata_fsync = true;
        db_engine = "lmdb";
        rpc_bind_addr = "[::]:3901";
        rpc_public_addr = "${config.networking.hostName}:3901";
        rpc_secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        s3_api = {
          api_bind_addr = "[::]:3900";
          s3_region = "attune";
        };
      };
    };
    networking.firewall.enable = false;
    virtualisation.memorySize = 512;
    environment.systemPackages = [
      pkgs.garage_2
      pkgs.nftables
      (pkgs.python3.withPackages (p: [ p.boto3 ]))
    ];
    environment.etc."attune-ingest".source = ../ingest;
    environment.etc."garage-client.py".source = ./garage_client.py;
    environment.etc."garage-bootstrap.py".source = ../tools/garage-bootstrap.py;
  };
in
pkgs.testers.runNixOSTest {
  name = "attune-garage-three-node";
  globalTimeout = 600;
  nodes = {
    a = node;
    b = node;
    c = node;
  };
  testScript = ''
    start_all()
    for node in [a, b, c]:
        node.wait_for_unit("garage.service")
    ids = {}
    for node in [a, b, c]:
        node.wait_for_open_port(3901)
        node.wait_until_succeeds("garage node id -q")
        ids[node.name] = node.succeed("garage node id -q").strip()
    import json, shlex
    inventory = {name: {"roles": ["garage"], "garageId": identity.split("@")[0], "garageCapacity": "1G", "address": name} for name, identity in ids.items()}
    payload = shlex.quote(json.dumps(inventory))
    a.succeed(f"printf '%s' {payload} > /var/lib/fixture-inventory.json")
    a.succeed("python3 /etc/garage-bootstrap.py /var/lib/fixture-inventory.json --marker /var/lib/fixture-bootstrap.json")
    a.succeed("python3 /etc/garage-bootstrap.py /var/lib/fixture-inventory.json --marker /var/lib/fixture-bootstrap.json")
    a.succeed("garage bucket create fixture")
    a.succeed("garage bucket info fixture")
    a.succeed("python3 /etc/garage-client.py setup http://a:3900")
    a.succeed("python3 /etc/garage-client.py read http://b:3900")
    a.succeed("python3 /etc/garage-client.py multipart http://a:3900")
    c.shutdown()
    a.succeed("python3 /etc/garage-client.py write http://b:3900 --label degraded")
    a.succeed("python3 /etc/garage-client.py read http://b:3900")
    a.succeed("python3 /etc/garage-client.py read http://b:3900 --label degraded")
    c.start()
    c.wait_for_unit("garage.service")
    a.wait_until_succeeds("python3 /etc/garage-client.py read http://c:3900 --label degraded")
    a.wait_until_succeeds("garage health -q")
    c.succeed("nft 'add table inet partition; add chain inet partition input { type filter hook input priority -10; policy accept; }; add chain inet partition output { type filter hook output priority -10; policy accept; }; add rule inet partition input tcp dport 3901 drop; add rule inet partition output tcp dport 3901 drop'")
    a.succeed("python3 /etc/garage-client.py write http://b:3900 --label partition")
    a.fail("python3 /etc/garage-client.py read http://c:3900 --label partition")
    c.succeed("nft delete table inet partition")
    a.wait_until_succeeds("python3 /etc/garage-client.py read http://c:3900 --label partition")
    c.shutdown()
    b.shutdown()
    a.fail("python3 /etc/garage-client.py write http://a:3900 --label noquorum")
    b.start()
    c.start()
    for node in [b, c]:
        node.wait_for_unit("garage.service")
    a.wait_until_succeeds("garage health -q")
    a.succeed("python3 /etc/garage-client.py read http://a:3900")
    for node in [a,b,c]:
        node.succeed("systemctl stop garage; mount -t tmpfs -o size=8m,mode=0777 tmpfs /var/lib/garage/data; dd if=/dev/zero of=/var/lib/garage/data/fill bs=1M count=8; systemctl start garage")
    a.fail("python3 /etc/garage-client.py large http://a:3900")
    for node in [a,b,c]:
        node.succeed("systemctl stop garage; umount /var/lib/garage/data; systemctl start garage")
    a.wait_until_succeeds("garage health -q")
    a.succeed("python3 /etc/garage-client.py read http://b:3900")
  '';
}

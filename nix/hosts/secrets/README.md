# ThinkCentre Day 0 Secrets

Committed files in this directory are public metadata or placeholders only.

The live Day 0 workflow writes real bootstrap material under ignored paths:

- `nix/hosts/local/bootstrap-age-key.txt`
- `nix/hosts/local/bootstrap-age-recipient.txt`
- `nix/hosts/local/thinkcentre-secrets.yaml`
- `nix/hosts/local/disks.nix`

`packages/home-deployment` models those files as SOPS and evidence resources in
the native Alchemy graph. Plaintext Tailscale auth keys and private age keys
must not be committed.

# ThinkCentre Day 0 SOPS Recipients

Committed files in this directory are public recipient metadata only.

The live Day 0 workflow writes runtime bootstrap material under ignored paths:

- `nix/hosts/local/bootstrap-age-key.txt`
- `nix/hosts/local/bootstrap-age-recipient.txt`
- `nix/hosts/local/thinkcentre-secrets.yaml`
- `nix/hosts/local/disks.nix`

Plaintext Tailscale auth keys and private age keys must not be committed.

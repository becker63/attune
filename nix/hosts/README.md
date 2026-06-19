# Attune Home Cluster Hosts

This directory is a self-contained flake for the first home-cluster NixOS slice.
It defines three ThinkCentre K3s control-plane nodes:

- `attune-cp-1`: initializes the K3s server cluster.
- `attune-cp-2`: joins `attune-cp-1` as a server.
- `attune-cp-3`: joins `attune-cp-1` as a server.

All three nodes enable SSH, Tailscale, baseline operator packages, firewall
ports for SSH/K3s/flannel/Tailscale, and the node label
`attune.dev/worker-class=thinkcentre-cpu`.

The K3s shared token is intentionally not stored in this repository. Place it on
each node at:

```text
/var/lib/attune/secrets/k3s-server-token
```

The `hardware-placeholder.nix` file is only a bootstrap placeholder. Replace or
override it with each host's generated hardware config and disk layout before a
real install.

## Local bootstrap SSH keys

Create this local, untracked file before building the installer ISO:

```bash
mkdir -p nix/hosts/local
printf '[ "%s" ]\n' "$(cat ~/.ssh/id_ed25519.pub)" > nix/hosts/local/bootstrap-ssh-keys.nix
```

The installer ISO grants those keys to `root`. Installed hosts grant those keys
to the `attune` wheel user.

## Commands

Show the constructed host commands:

```bash
scripts/infra/attune-nixos-bootstrap attune-cp-1 root@attune-installer-cp-1.local
```

The helper prints installer SSH, destructive disk, remote token copy,
post-install Tailscale, and K3s readiness probes. It does not create secrets or
install hosts by itself.

Evaluate a host:

```bash
nix eval ./nix/hosts#nixosConfigurations.attune-cp-1.config.networking.hostName
```

Build a host closure:

```bash
nix build ./nix/hosts#nixosConfigurations.attune-cp-1.config.system.build.toplevel
```

Build the minimal installer ISO:

```bash
nix build ./nix/hosts#nixosConfigurations.attune-installer.config.system.build.isoImage
```

Run nixos-anywhere after preparing hardware/disk config:

```bash
nixos-anywhere --flake ./nix/hosts#attune-cp-1 root@attune-installer-cp-1.local
```

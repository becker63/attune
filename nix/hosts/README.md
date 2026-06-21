# Attune ThinkCentre Day 0 Hosts

This flake defines the network-bootstrap NixOS baseline for:

- `attune-cp-1`
- `attune-cp-2`
- `attune-cp-3`

The accepted Day 0 baseline is SSH, Tailscale, sops-nix, Disko, comin, the
`attune` wheel user, and local repair access. K3s, Kubernetes, kubeconfig,
desktop worker setup, and public ingress are deferred.

`packages/home-deployment` owns the Day 0 lifecycle through native
Effect/Alchemy resources. This flake owns the installed host shape.

## Local Evidence

Real machine-specific files are local and ignored:

```text
nix/hosts/local/bootstrap-ssh-keys.nix
nix/hosts/local/bootstrap-age-key.txt
nix/hosts/local/bootstrap-age-recipient.txt
nix/hosts/local/thinkcentre-secrets.yaml
nix/hosts/local/disks.nix
```

`disks.nix` should map hostnames to operator-approved stable by-id paths:

```nix
{
  attune-cp-1 = "/dev/disk/by-id/nvme-...";
  attune-cp-2 = "/dev/disk/by-id/nvme-...";
  attune-cp-3 = "/dev/disk/by-id/nvme-...";
}
```

Until those paths exist, the Alchemy Disko resources stay blocked.

The live SOPS file is staged by Alchemy/nixos-anywhere at
`/etc/attune/sops/thinkcentre-secrets.yaml`; it is intentionally not copied
into the Nix store during evaluation.

## Evaluation

Evaluate a host:

```bash
nix eval path:./nix/hosts#nixosConfigurations.attune-cp-1.config.networking.hostName
```

Build the installer ISO through the verified x86 builder:

```bash
nix build path:./nix/hosts#nixosConfigurations.attune-installer.config.system.build.isoImage
```

Live install is driven by the `ThinkCentreDay0Deployment` Alchemy resources,
which gate USB media, LAN binding, disk identity, Disko layout, SOPS extra
files, and `nixos-anywhere` execution.

# Attune Home Cluster Bootstrap

This runbook is the operator path for the Effect/Alchemy-focused bootstrap. The
source of truth is the typed Alchemy deployment surface exposed by
`packages/home-deployment`.

## 1. Prepare local SSH access

Create an ignored local key file before building the installer ISO:

```bash
mkdir -p nix/hosts/local
printf '[ "%s" ]\n' "$(cat ~/.ssh/id_ed25519.pub)" > nix/hosts/local/bootstrap-ssh-keys.nix
```

The installer grants these keys to `root`. Installed hosts grant them to the
`attune` wheel user.

## 2. Inspect the deployment plan

```bash
node scripts/codex/pnpm.mjs exec nx run home-deployment:plan
node scripts/codex/pnpm.mjs exec nx run home-deployment:status
node scripts/codex/pnpm.mjs exec nx run home-deployment:reconcile
```

`reconcile` is a dry-run by default. It selects runnable Alchemy resources,
prints the underlying commands, and does not mutate state unless `--apply` is
passed.

Useful direct CLI forms:

```bash
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts phases
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts status --json
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts reconcile --phase artifacts
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts state --json
```

The Alchemy plan covers:

- installer ISO build
- Tailscale auth readiness
- K3s token readiness
- per-node USB boot and destructive disk confirmation gates
- `nixos-anywhere` install commands
- Tailscale readiness checks
- K3s init/join/readiness
- kubeconfig fetch
- typed Kubernetes graph apply
- Windows desktop guard artifact and install

## 3. Build the installer ISO

Requires a machine with Nix available:

```bash
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts reconcile --phase artifacts --apply
```

This runs the Alchemy `NixBuild` resources, including the installer ISO and
Windows guard artifact. Write the resulting ISO to a USB stick with your
preferred imaging tool.

## 4. Prepare secrets outside git

Create a K3s shared token and keep it outside the repository:

```bash
openssl rand -hex 32 > /path/to/k3s-server-token
```

Prepare a Tailscale auth plan. The current Nix module enables Tailscale but does
not commit auth keys; use an auth key, interactive login, or a local secret path.
The typed plan treats this as a hard install gate so a host install cannot move
to `planned` until the gate is confirmed.

Confirm those gates in the local plan state when ready:

```bash
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts confirm tailscale-auth-ready
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts confirm k3s-token-ready
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts status
```

## 5. Install each ThinkCentre

For each node:

1. Boot the ThinkCentre from the Attune installer USB.
2. Wait until SSH is reachable.
3. Run the printed installer SSH probe, then confirm the USB boot gate.
4. Run the printed `lsblk` disk probe, then confirm the destructive disk gate
   only after verifying the target disk.
5. Run the printed `nixos-anywhere` command.
6. Copy the K3s token to the installed host outside git.
7. Run the printed Tailscale and K3s readiness probes.

Example for `attune-cp-1`:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=5 root@attune-installer-cp-1.local true
ssh -o BatchMode=yes -o ConnectTimeout=5 root@attune-installer-cp-1.local \
  "test -e '/dev/disk/by-id/REPLACE_ME_ATTUNE_CP_1' && lsblk -o NAME,SIZE,MODEL,SERIAL,TYPE,MOUNTPOINTS '/dev/disk/by-id/REPLACE_ME_ATTUNE_CP_1'"

node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts confirm attune-cp-1:usb-booted
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts confirm attune-cp-1:disk-wipe-confirmed

node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts reconcile \
  --resource attune-cp-1:nixos-anywhere-install \
  --apply \
  --allow-destructive

ssh -o BatchMode=yes -o ConnectTimeout=5 attune@attune-cp-1 \
  "sudo install -d -m 0700 /var/lib/attune/secrets"
scp /path/to/k3s-server-token attune@attune-cp-1:/tmp/attune-k3s-server-token
ssh -o BatchMode=yes -o ConnectTimeout=5 attune@attune-cp-1 \
  "sudo install -m 0600 /tmp/attune-k3s-server-token '/var/lib/attune/secrets/k3s-server-token' && sudo rm -f /tmp/attune-k3s-server-token"
```

Repeat with `attune-cp-2` and `attune-cp-3`.

The legacy helper prints the same command shape, but it is not the primary
orchestration surface:

```bash
scripts/infra/attune-nixos-bootstrap attune-cp-1 root@attune-installer-cp-1.local
```

## 6. Verify K3s and fetch kubeconfig

After `attune-cp-1` returns:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=5 attune@attune-cp-1 \
  "systemctl is-active --quiet tailscaled && tailscale status --json >/dev/null"
ssh -o BatchMode=yes -o ConnectTimeout=5 attune@attune-cp-1 \
  "sudo systemctl is-active --quiet attune-k3s-server"
ssh -o BatchMode=yes -o ConnectTimeout=5 attune@attune-cp-1 \
  "sudo k3s kubectl get node 'attune-cp-1' -o wide"
ssh attune@attune-cp-1 sudo cat /etc/rancher/k3s/k3s.yaml
```

Or let Alchemy run the readiness probes as they become unblocked:

```bash
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts reconcile --phase tailscale --apply
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts reconcile --phase k3s --apply
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts reconcile --phase kubeconfig --apply
```

After all three nodes are installed:

```bash
kubectl get nodes -o wide
```

## 7. Build and install the Windows desktop guard

Build the generated Windows guard artifact:

```bash
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts reconcile --phase desktop
```

The desktop phase is blocked until the platform graph and guard artifact are
ready. Once unblocked, use `--apply` from the Windows-capable operator context.
The generated command is:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\windows\Install-AttuneDesktopGuardTask.ps1 -Force
```

The generated config points at the `attune-runs/desktop-gpu` worker pool and has
`interactive` and `vacation-capacity` profiles.

## Current limitations

- Hardware disk layouts are still placeholders until real ThinkCentre inventory
  is captured.
- This Codex environment could not run `nix build` or `nix eval`; validate those
  on a Nix-capable machine before wiping disks.
- Tailscale auth and K3s token material are intentionally out of repo and must be
  provided locally.

## 8. ATT-38 lifecycle and agent stepper surface

ATT-38 makes Alchemy the lifecycle owner and keeps the CLI thin. Prefer the new
agent-facing commands when stepping through the deployment with Taylor:

```bash
node scripts/codex/pnpm.mjs exec nx run home-deployment:next-step
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts plan --json
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts status --json
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts confirm <gate-id> --evidence <json-or-file>
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts deploy --target home --dry-run
node scripts/codex/pnpm.mjs --dir packages/home-deployment exec tsx src/cli.ts destroy --target smoke --dry-run
```

`next-step --json` returns one deterministic step with one of these variants:

- `SafeProbe`: an agent may run the probe automatically because it is non-mutating.
- `ManualGate`: Taylor must provide typed evidence before dependent resources proceed.
- `Apply`: a single transition is ready, but external or irreversible transitions require explicit approval.
- `Blocked`: nothing can proceed; the output lists blockers and required operator action.

Do not free-run `Apply` steps for host activation, Kubernetes mutation, desktop
registration, or any irreversible/external operation. Re-run `plan`, `status`, or
`next-step` after each confirmation or applied transition.

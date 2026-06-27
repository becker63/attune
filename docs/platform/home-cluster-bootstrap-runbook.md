# Attune ThinkCentre Day-0 Bootstrap

This runbook mirrors the native Effect/Alchemy deployment model. It is not an
alternate CLI workflow and it must not grow phase runners, wrapper commands, or
local state machines. The source of truth is the Alchemy stack exported by
`packages/home-deployment`.

## Operator Experience

Tell the agent to use Effect Alchemy to step through
`ThinkCentreDay0Deployment`.

The Alchemy graph owns:

- Asahi laptop observation and Tailscale readiness.
- Laptop-local `x86_64-linux` Nix builder readiness.
- SOPS recipient and encrypted Tailscale secret readiness.
- ThinkCentre machine inventory for exactly `attune-cp-1`, `attune-cp-2`, and
  `attune-cp-3`.
- Installer ISO artifact readiness.
- USB boot and destructive disk approval gates.
- `nixos-anywhere` host activation.
- Host-level Tailscale readiness.
- comin steady-state convergence.
- Final SSH, Tailscale, and comin network smoke checks.

Agents should use Alchemy plan, preview/diff, apply, state, blockers, and manual
gate semantics directly. Safe observations can advance automatically. External
or irreversible resources such as laptop configuration, USB writes, and disk
installs require Alchemy approval evidence.

## Native Alchemy Entry

Preview the native Alchemy stack from the repo root before any apply:

```bash
nix develop -c alchemy plan packages/home-deployment/alchemy.run.ts
```

Apply the accepted plan with the same stack:

```bash
nix develop -c alchemy deploy packages/home-deployment/alchemy.run.ts --yes
```

The dev shell provides Node, pnpm, OpenSpec, Alchemy on `PATH`, and disables
Alchemy telemetry. The Day-0 entrypoint defaults to Live provider mode and local
evidence state at `.attune/day0/state.json`. Alchemy v2 stores its own stack
state under `.alchemy/state/thinkcentre-day0/<stage>/`; older ignored
`.alchemy/thinkcentre-day0/<stage>/` files are pre-v2 validation artifacts and
do not make the v2 stack deployed.

If OAuth is unavailable, the Tailscale auth material resource prompts for the
manual auth-key path and records only redacted SOPS evidence. The provider writes
encrypted material to `nix/hosts/local/thinkcentre-secrets.yaml`.

## Day-0 Prompts

The graph exposes manual actions as resource metadata:

- Tailscale OAuth setup opens `https://tailscale.com/docs/features/oauth-clients`
  when `TAILSCALE_OAUTH_CLIENT_ID` and `TAILSCALE_OAUTH_CLIENT_SECRET` are not
  available.
- Manual Tailscale auth fallback opens
  `https://login.tailscale.com/admin/settings/keys` and records only a redacted
  SOPS secret reference.
- x86 builder setup uses the local Asahi NixOS config at
  `/home/becker/nixos-from-scratch`; if the live laptop is not ready, the
  Alchemy resource reports this activation command:
  `sudo nixos-rebuild switch --flake /home/becker/nixos-from-scratch#nixos-btw --option builders ""`.
- x86 builder evidence records live `extra-platforms`, live `x86_64-linux`
  binfmt registration, a tiny local x86 derivation build, and the
  ThinkCentre host closure dry-run before any ISO or host closure build is
  eligible.
- USB media selection and USB write approval are separate Alchemy gates.
- Per-host LAN binding, installer SSH, disk identity, Disko layout validation,
  and destructive install approval are separate resources for each ThinkCentre.

## Non-Goals For Day 0

K3s, Kubernetes object application, kubeconfig routing, desktop GPU workers, and
public ingress are deferred until the network-bootstrap smoke check passes.

## Local Secrets

Plaintext Tailscale keys, SOPS private age keys, SSH private keys, host keys,
and local deployment evidence stay outside git. Only encrypted SOPS files,
public recipient metadata, schemas, and source code belong in the repository.

Live local inputs are expected under ignored paths:

```text
nix/hosts/local/bootstrap-ssh-keys.nix
nix/hosts/local/bootstrap-age-key.txt
nix/hosts/local/bootstrap-age-recipient.txt
nix/hosts/local/thinkcentre-secrets.yaml
nix/hosts/local/disks.nix
.attune/day0/
```

`nix/hosts/local/disks.nix` maps each host to the stable by-id disk path that
Disko may wipe. The Alchemy Disko and host-closure commands generate this file
from the approved `ATTUNE_CP_*_DISK` inputs before evaluating the host flake.

## Physical Gates

The operator still has to perform physical actions:

- Select and approve the USB device before any write.
- Boot each ThinkCentre from the installer USB.
- Bind the discovered installer target to the intended host.
- Approve the probed disk identity before destructive Disko or
  `nixos-anywhere` operations.

Those are Alchemy gates, not runbook-only checklist items.

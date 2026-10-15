# Reconnaissance (2026-10-15)

Inspected the worktree before editing: branch `studio/cold-grit-2026-10-13`, with
substantial existing tracked and untracked scientific changes. Created
`infra/three-node-research`; only `infra/` is part of this implementation.

| Repository | Evidence inspected | Reused lesson |
|---|---|---|
| `~/projects/designing-for-two` | KCL readiness helpers and composition pipeline, Cloudcoil generator and Buck rule, pytest discovery, root/toolchain flakes | Keep a small constrained inventory over expressive implementation; explicit readiness dependencies; validate generated projections; observed identity requires deliberate adoption. No Kubernetes/KCL/Buck dependencies imported. |
| `~/projects/home_lab` | Actual spelling differs from requested `home-lab`; flake, Disko module, installer, shared Nix settings, basic host, Colmena inventory | Shared layout and thin hosts; existing operator SSH public key. Replaced arbitrary SATA selection, reusable installer passwords, and old remote-builder/cache assumptions. No old private key or password copied. |
| `~/projects/libnet` | flake composition, runtimeShared, process-schedule, container/Grafana provisioning and microVM layout | One endpoint/path inventory; distinguish completed builds from service readiness; persistent service paths. Production uses native systemd services. |
| `~/nixos-from-scratch` | AGENTS safeguards, flake, host/base modules, live daemon config, BuildBuddy reader client | Existing age admin identity, SSH operator identity, binfmt setup and bounded read-only BuildBuddy requests. Asahi pins and laptop configuration unchanged. |
| Attune | Git state/remotes, root flake and Bazel boundary | Independent infrastructure flake, no scientific-core changes, no live infrastructure dependency added to Bazel actions. |

## Observed development host

- `uname`: aarch64 Linux 7.1.5; NixOS 26.11.20260810.2fcb964, Apple Silicon.
- Nix 2.34.8; sandbox enabled; trusted user `becker`; no configured remote builders.
- `/dev/kvm` exists and `KVM_GET_API_VERSION` returned 12. Actual aarch64 NixOS
  guests subsequently booted with KVM and ran services and reboot tests.
- `/proc/sys/fs/binfmt_misc/x86_64-linux` enabled, interpreter
  `/run/binfmt/x86_64-linux`, preserve-argv0 flag. The interpreter store path and
  `/run/binfmt` are visible in the daemon sandbox; extra-platforms includes x86.
  A sandboxed derivation actually executed the x86_64 `hello` binary.
- Daemon caches: cache.nixos.org and nixos-apple-silicon.cachix.org. Its existing
  `require-sigs=false` was observed; cluster configurations explicitly require
  substitute signatures. No laptop settings were changed.
- QEMU system executables were absent from the ordinary shell PATH. Pinned QEMU
  and x86 OVMF firmware are declared dependencies of the installer acceptance
  check. x86 system emulation uses TCG, never cross-architecture KVM.
- About 86 GiB initially free, 16 GiB RAM plus swap. Builds use one job/two cores;
  disposable virtual NVMe files are sparse, not 256 GB physical allocations.
- Uncached x86 Go 1.26 builds crashed under user emulation (GC pointer and parser
  panics). Native Go vendoring worked. Aarch64 installer outputs cross-build only
  comin with Nix's Go cross toolchain; all inputs use the same locked nixpkgs.
  This additional package evaluation exists specifically to avoid the measured
  emulator failure. Canonical x86 production configurations build comin natively.
- Existing `~/.ssh/colmena` public identity reused. Existing
  `~/.config/sops/age/keys.txt` retained (owner-only permissions); only its age
  public recipient is used in a disposable encrypted evaluation fixture.
- Anonymous GitHub repository API access confirms Attune is public. The existing
  owner-private BuildBuddy bearer file authenticated SearchInvocation,
  GetExecution and GetLog. See `reports/buildbuddy-probe.json`; no token or raw
  response was retained. CAS retrieval and JVM profiles remain unverified.

See `VALIDATION.md` and generated reports for runtime coverage and limitations.

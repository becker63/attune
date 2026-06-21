## 1. Scope Existing Home Deployment To Network Bootstrap

- [x] 1.1 Update the default home deployment target to make K3s, Kubernetes, kubeconfig, desktop GPU, and public ingress resources deferred for this change.
- [x] 1.2 Add a network-bootstrap lifecycle target that accepts the Asahi laptop plus exactly three ThinkCentre hosts with SSH, Tailscale, sops-nix, comin, and smoke checks.
- [x] 1.3 Preserve future extension points so the later Kubernetes change can depend on the completed network-bootstrap resources.

## 2. Operator Laptop Bootstrap

- [x] 2.1 Add an `OperatorMachine` model for the Asahi `aarch64-linux` laptop and its local Nix daemon/build configuration.
- [x] 2.2 Add a laptop Tailscale lifecycle resource that can install/configure Tailscale, verify `tailscaled`, and record tailnet identity through the Tailscale provider.
- [x] 2.3 Add an `X86NixBuilder` lifecycle resource that verifies an `x86_64-linux` builder capability configured from this laptop.
- [x] 2.4 Implement Nix provider DryRun/Test/Live methods for observing supported systems, checking builder configuration, and running a small `x86_64-linux` build probe.
- [x] 2.5 Block all ThinkCentre ISO and host closure builds when laptop Tailscale or the `x86_64-linux` builder capability is missing or unverified.
- [x] 2.6 Document the chosen laptop-local x86 builder setup path and the exact evidence the Alchemy provider records.

## 3. SOPS And Secret Bootstrap

- [x] 3.1 Add SOPS provider contracts for operator age key readiness, public recipient metadata, encrypted secret file validation, secret creation/update, and redacted evidence.
- [x] 3.2 Add `.sops.yaml`, encrypted secret templates, and public recipient metadata for laptop and ThinkCentre Tailscale auth material.
- [x] 3.3 Decide and implement the first-boot host decrypt path: preseeded host age key, bootstrap age key copied by `nixos-anywhere --extra-files`, or host SSH key conversion after first boot.
- [x] 3.4 Add lifecycle resources for Tailscale auth key import or generation, SOPS encryption/updatekeys, and post-first-boot recipient rotation when bootstrap recipients are used.
- [x] 3.5 Ensure plaintext Tailscale keys, SOPS private age keys, SSH private keys, host keys, and local deployment state remain ignored or external.

## 4. Typed Machine And Local Discovery Model

- [x] 4.1 Add typed machine resources for exactly `attune-cp-1`, `attune-cp-2`, and `attune-cp-3`.
- [x] 4.2 Add inventory fields for target architecture, host flake output, bootstrap SSH target, post-install SSH target, LAN discovery binding, SOPS recipient, Tailscale identity slot, comin identity slot, hardware facts, network facts, and disk evidence.
- [x] 4.3 Add a LAN discovery provider that scans only configured local interfaces/ranges and records candidate IP, MAC, hostname, installer identity hints, and SSH reachability.
- [x] 4.4 Add machine binding gates that map discovered candidates to `attune-cp-*` hosts before installer SSH or destructive install can proceed.
- [x] 4.5 Add local state/evidence schemas for builder probes, LAN scans, machine binding, USB media selection, disk identity probes, destructive approvals, Tailscale auth references, and comin access references.

## 5. NixOS Network Baseline With Disko

- [x] 5.1 Split the current ThinkCentre NixOS host modules so a minimal network baseline builds without K3s.
- [x] 5.2 Add Disko and sops-nix flake inputs/modules to `nix/hosts`.
- [x] 5.3 Define all `attune-cp-*` host outputs with explicit target system `x86_64-linux`.
- [x] 5.4 Add a shared whole-disk UEFI GPT Disko layout that uses operator-approved per-host disk identities rather than placeholders.
- [x] 5.5 Add SSH, `attune` wheel user, Tailscale, sops-nix, base operator packages, time sync, and firewall policy for SSH/Tailscale to the shared base module.
- [x] 5.6 Wire Tailscale enrollment to a sops-nix decrypted runtime secret path without leaking auth keys to the Nix store or logs.
- [x] 5.7 Add comin configuration for repository URL, ref, and per-host flake output without committing plaintext credentials.
- [x] 5.8 Keep K3s modules available for a later change but out of the network-bootstrap acceptance path.

## 6. USB And NixOS-anywhere Lifecycle

- [x] 6.1 Add lifecycle resources for installer ISO artifact, USB media selection, USB media write approval, and USB media write observation.
- [x] 6.2 Add per-host USB boot confirmation, LAN discovery binding, and installer SSH reachability resources.
- [x] 6.3 Add per-host disk identity probe and destructive install approval gates that reject stale or wrong-host evidence.
- [x] 6.4 Add Disko layout validation resources that block unknown, placeholder, stale, or wrong-host disk paths.
- [x] 6.5 Implement the `nixos-anywhere` provider transition with typed dependencies, Disko mode/phase inputs, optional hardware config generation, extra-files bundle identity, operation classification, command/result evidence, and immediate proof checks before mutation.
- [x] 6.6 Stage bootstrap SOPS keys, Tailscale secret material, SSH keys, or first-boot files through provider-owned `nixos-anywhere` extra-files inputs when required.
- [x] 6.7 Add Test provider coverage for successful gated install planning and every blocked destructive path.

## 7. Tailscale And Comin Providers

- [x] 7.1 Add a Tailscale provider contract for laptop auth, host auth readiness, node identity observation, tailnet reachability, and SSH over Tailscale checks.
- [x] 7.2 Add Tailscale DryRun/Test/Live provider methods that never expose auth keys, login URLs, or node secrets in lifecycle output.
- [x] 7.3 Add a comin provider contract for service health, configured repo/ref, configured host output, last activation, and activation failures.
- [x] 7.4 Add comin DryRun/Test/Live provider methods and blockers for missing repo access, wrong ref, wrong host output, or failed activation.
- [x] 7.5 Make per-host network readiness depend on post-install SSH, Tailscale readiness, SOPS secret readiness, and comin readiness.

## 8. Native Alchemy Surface, Runbook, And Smoke Checks

- [x] 8.1 Export native Alchemy resources/stacks for `ThinkCentreDay0Deployment` that compose the operator laptop, SOPS, LAN discovery, Disko, `nixos-anywhere`, Tailscale, comin, and smoke resources.
- [x] 8.2 Remove local helper orchestration, wrapper CLIs, phase runners, command-runner facades, and compatibility state machines from the canonical network-bootstrap workflow.
- [x] 8.3 Ensure agents step the deployment only through Alchemy plan/preview, resource state, apply, blockers, and manual gates, with no custom `attune-home` commands.
- [x] 8.4 Update `docs/platform/home-cluster-bootstrap-runbook.md` so it mirrors the Alchemy lifecycle and identifies native Alchemy as the source of truth.
- [x] 8.5 Add smoke resources/checks for the laptop and all three hosts covering laptop Tailscale, SSH, Tailscale reachability, sops-nix secret availability, comin readiness, hostname, target architecture, and machine id.
- [x] 8.6 Report K3s, Kubernetes, kubeconfig, desktop worker, and public ingress as deferred in network-bootstrap smoke output.


## 9. Codebase Pattern And Generators

- [x] 9.1 Add or update codebase guidance documenting native Alchemy as the only lifecycle automation abstraction.
- [x] 9.2 Ensure every new external capability in this change is represented as an Effect service with Live, DryRun, and Test layers.
- [x] 9.3 Ensure resource props, service inputs/outputs, evidence records, provider errors, and serialized state use Effect Schema.
- [x] 9.4 Inventory existing `@attune/nx` generators and use them for any matching Effect service or Alchemy resource shape.
- [x] 9.5 Create or extend `@attune/nx` generators for repeated Alchemy resource, Effect service, provider layer, schema, and test fixture shapes introduced by this change.
- [x] 9.6 Add tests that run the native Alchemy graph over Effect Test layers and simulated worlds instead of invoking local helpers.
- [x] 9.7 Add a focused Attune architecture lint target wired through Nx and the root architecture scan.
- [x] 9.8 Add architecture lint tests for local lifecycle helper rejection and Nx generator coverage.

## 10. Validation

- [x] 10.1 Run OpenSpec validation for `bootstrap-thinkcentre-network`.
- [x] 10.2 Run `home-deployment` tests and typecheck for the provider/resource changes.
- [x] 10.3 Run Nix flake evaluation for `nix/hosts` targeting `x86_64-linux` once the laptop builder capability is available.
- [x] 10.4 Run the small `x86_64-linux` builder probe from the Asahi laptop and record the non-secret evidence path.
- [x] 10.5 Build the installer ISO and at least one host closure through the verified laptop x86 builder before live install.
- [x] 10.6 Run a full Alchemy preview/dry-run of `ThinkCentreDay0Deployment` showing laptop prep, SOPS, LAN discovery, Disko, `nixos-anywhere`, Tailscale, comin, and smoke resources in dependency order.
- [x] 10.7 Migrate the Day-0 stack and custom Alchemy resources from `alchemy@0.93` to actual Alchemy v2 `Stack`, `Resource`, `Provider`, native `plan`, and `.alchemy/state/<stack>/<stage>` semantics.

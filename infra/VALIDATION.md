# Validation and coverage

Run from the repository root, using the existing Nix daemon (no remote builder):

```sh
nix run path:./infra#validate -- --runtime --installer --iso
```

This runs checks sequentially with one Nix job and two build cores, builds the
three operator-key ISOs, and writes `reports/validation.json` and `validation.md`.
Logs are under `reports/logs/` (ignored by Git); successful VM derivations retain
their own test logs. Reports record source/lock hashes, Git revision, derivations,
store paths, platform, versions, image SHA-256s and elapsed times. A report made
before the delivery commit identifies the tested source separately from HEAD.

Statuses mean **PASS** (command succeeded), **FAIL** (command failed), **NOT RUN**
(no command executed), **BLOCKED** (external prerequisite unavailable), and
**SKIPPED** (deliberately omitted with a recorded reason). Unrun VM checks never
count as passes. Pure evaluation is not proof of runtime behavior or hardware
readiness. Read the current generated report for actual results.

## Named checks

All names below appear under `checks.aarch64-linux` and `checks.x86_64-linux`.
Native VM tests use the platform of their output; the installer always emulates
x86 with TCG. Avoid evaluating every output with `flake check --all-systems` while VMs are running:
that aggregate evaluation retained about 5 GiB on this laptop. The reporter resolves
one check at a time and snapshots its source once.

The development laptop has working aarch64 KVM; x86 KVM is impossible
on its ARM CPU. x86 user-mode execution inside the Nix sandbox is tested separately.

| Check | What executes | Coverage limits |
|---|---|---|
| evaluation | Evaluate all three hosts, enrolled service variants and installer assertions; force system derivations; reject malformed dashboard contracts | No services or disks boot |
| installer-guard | Python disk-policy matrix, nonzero raw-data detection and real disposable SSH-signed one-boot tickets | Inventory fixtures, not every failure booted from ISO |
| science | Real Parquet, canonical hashes, immutable manifest publication, replay, missing/corrupt evidence, undefined metrics and exact fractions | Local object destination |
| worker | Persistent spool checkpoint, bounded processing, retry/index failure and completed-source skipping; completed-cache purge refuses missing archives and unarchived files | Application fixtures |
| export | Actual native quality-task report format → pinned source/protocol export → Parquet archive; exact/undefined/unavailable metrics, signed utility deltas, no invented physical execution, bad-hash rejection | Synthetic source rows matching the inspected producer; explicitly selected windows |
| receipts | BuildBuddy/BEP receipt decoding, execution/science separation, resumable bounded polling | Synthetic API responses; no production CAS download |
| dashboards | Nix rendering, provisioned UIDs and JSON structural checks | Does not prove every Grafana visualization option |
| queries | Pinned promtool parses dashboard/alert PromQL; pinned ClickHouse creates schema and executes contract SQL | No Grafana macros are used; no production data |
| secrets | Source private-key/plaintext credential and binary/large-artifact scanner; disposable SOPS age recipient decrypts while unrelated identity fails | Heuristic, not a proof against every secret encoding |
| git-signatures | Disposable SSH signing/trust repository, signed acceptance and unsigned/untrusted rejection | Direct Git verification |
| emulation | Execute cached x86 hello in a native Nix build sandbox | Not a general guarantee all x86 builds emulate correctly |
| services | Native NixOS Grafana, ClickHouse and VictoriaMetrics readiness, query and reboot | Smaller fixture topology |
| garage | Three native NixOS nodes, actual bootstrap twice, S3 write/list/read/hash, fresh writes with one down, rejoin, RPC partition, two-node loss and data-volume ENOSPC | Tests surviving S3 endpoints separately from quorum; simulated capacity |
| persistence | Boot production Btrfs initrd reset with impermanence, actual reboot; undeclared /etc and nested roots disappear; machine/SSH/age/SOPS/comin state, activation-time secret rotation/restart, and Garage/ClickHouse/Grafana/VictoriaMetrics data survive; failed unit remains harmless; full prebuilt NixOS generation switch and rollback retain ClickHouse/data | Test disk formatter replaces Disko; comin history fixture rather than real deployment |
| science-integration | Real Parquet → Garage → sealed manifest → ClickHouse → actual Grafana plugin query; exact/null metrics; replay; interrupted import; independent local backup/restore; service restart/reboot; read-only query rejection | Synthetic evidence, one-node Garage; multi-node behavior is separate |
| gitops | Real comin daemon, disposable signed Git repository; main switch/testing test, untrusted/unsigned rejection, failed build and failed test activation, manual confirmation, identity mismatch, repeated polling and retained history after reboot | Small activation derivations record operations; does not switch a full NixOS service closure |
| installer | Actual fixture ISO/UEFI boot; sparse 256,000,000,000-byte NVMe; automatic Disko/install; NVMe boot; SSH/comin, stable unique identities, actual reboot/root reset and USB reinstallation refusal | Public fixture key; physical Lenovo firmware/USB boot priority not tested |

Negative disk-policy cases include absent/ambiguous NVMe, wrong size/serial,
removable or read-only media, active mounts, filesystems/partition tables,
Attune markers including interrupted installation, absent/mismatched image
authorization, invalid/expired/wrong-boot signed replacement claims and repeat
installation. No check may write to a real device. The acceptance harness refuses
to reuse a disk image and creates a regular sparse file exclusively.

## Scientific contracts

Source `extension_json` may carry `logical_step` and `elapsed_seconds` for R3
progression. Missing coordinates remain NULL; the dashboard does not manufacture
a timeline. Treatment comparison uses explicit lowercase `jev`/`uniform` labels.
Tables show seed/repository/population/metric-version/aggregation identities.
Undefined measurements retain nullable values and availability counts. Aggregate
fractions are shown alongside means; an unweighted mean is not relabeled as a
pooled ratio. Cost/quality rows require both measurements in the same study/trial.

## Additional audits before delivery

```sh
nix develop path:./infra -c bash -c 'nixfmt infra/*.nix infra/modules/*.nix infra/dashboards/*.nix infra/tests/*.nix'
python3 infra/tools/secret_scan.py infra
python3 infra/tools/secret_scan.py --staged
git diff --cached --check
git diff --cached --stat
```

The staged audit refuses paths outside `infra/`, private keys, unexpected binaries,
and disk images. Test credentials are disposable; SOPS's evaluation fixture is
ciphertext to the existing administrator recipient. Real host identities are
created only at first boot outside the Nix store. Operational secrets require
subsequent verified enrollment. Installer closures contain no operational secret.

## Remaining external acceptance

Verify firmware UEFI/NVMe/USB support, actual single-drive capacity/emptiness,
wired interface matching, the unused private subnet, DHCP management reachability,
and RAM/service headroom on each ThinkCentre. Software cannot guarantee USB-first
firmware boot order. BootNext is best effort; USB repeat boots must refuse a wipe.

Production signed-commit rollout, enrollment identities, measured Garage role
capacities, operational backup destination and notification receiver require
operator enrollment. Replication is not an independent backup. Local fixtures
prove copy/hash/restore logic but not a remote provider's durability policy.

Authenticated BuildBuddy SearchInvocation/GetExecution/GetLog probe results live
in `reports/buildbuddy-probe.json`; API access does not establish CAS byte access,
per-action CPU/heap profiling, or complete Cloud archival ingestion. Local exported
evidence bytes and BEP/action/JFR artifacts are the complete supported input.

The persistence VM activates and rolls back full prebuilt NixOS generations and
checks retained ClickHouse/data afterward. Root and data are separate Btrfs
siblings and no normal deployment invokes Disko. This does not establish that
every future schema migration is backward-compatible; retain backups and test
changes before physical rollout. Nix evaluation, a successful ISO build,
and successful disposable tests do not certify production availability.

## Temporary artifacts and cleanup

Nix builds place disposable disks/logs in their private build directories. A
successful installer check copies only logs/result JSON into its output, never
the raw disk or fixture private key. Nix cleans temporary build directories.
`infra/result-*` links can retain images for USB writing. Remove only those links
and explicitly chosen failed-test artifacts after inspecting their paths. Do not
run broad store cleanup, delete another checkout, or remove any physical data disk.

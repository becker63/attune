# Attune research appliances

An independent NixOS 26.05 flake for three x86 ThinkCentres. Nix defines machines,
images, deployment, storage and visualization. Bazel/BuildBuddy continue doing
scientific computation. No production containers or distributed scheduler.

| Host | Roles after enrollment |
|---|---|
| attune-a | Garage, Grafana, node exporter, comin |
| attune-b | Garage, ClickHouse, node exporter, comin |
| attune-c | Garage, VictoriaMetrics/vmalert/Alertmanager, archival/indexing worker, optional backup, node exporter, comin |

`hosts.nix` declares roles and a private cluster subnet. `identities/*.json`
contains reviewed public enrollment constraints. Initial systems use DHCP and
expose SSH plus public UDP discovery hints; scientific services stay disabled
until `enrolled=true` and encrypted per-host secrets exist. The enrolled wired
interface receives its inventory address as an additional LAN address. Verify
that `10.77.0.0/24` is unused on the installation LAN or change it before enrollment.
No router, fixed DHCP lease, mDNS or external DNS is needed for cluster references.

## Outputs

From the repository root (`path:` includes new files before the first commit):

```sh
nix flake show path:./infra
nix build path:./infra#checks.aarch64-linux.evaluation --no-link
nix build path:./infra#installer-attune-a --max-jobs 1 --cores 2 --builders ''
nix run path:./infra#discover
nix run path:./infra#validate -- --runtime
```

- `nixosConfigurations.attune-{a,b,c}`: canonical x86_64 systems.
- `installerConfigurations.attune-{a,b,c}`: canonical x86 installer evaluations.
- `packages.{aarch64-linux,x86_64-linux}.installer-attune-{a,b,c}`: x86 UEFI ISOs.
  On aarch64 only comin is cross-built; cached target packages and emulation build
  the remaining x86 closure. Both variants install an enrollment-only system.
- `packages.<system>.installer-test`: disposable public-key fixture ISO. Never
  deploy this image to physical hardware; its RFC 8032 SSH key is public.
- `packages.<system>.{discover,ingest,export,project,backup,validate,comin-bootstrap}`.
- `devShells.<system>.default`, `formatter.<system>`.
- `checks.<system>.{evaluation,installer-guard,science,worker,receipts,export,dashboards,queries,secrets,
  git-signatures,emulation,services,garage,persistence,science-integration,gitops,installer}`.

Native tests are available for aarch64 and x86 Linux. Installer tests always run
x86 QEMU with TCG against a sparse NVMe. The aarch64 `comin-bootstrap` artifact cross-compiles x86 comin for
Asahi-produced images; its x86 counterpart builds comin natively. Dependencies and service/plugin versions are pinned in `flake.lock`.

## Source

- `disk.nix`, `installer.nix`, `installer/guard.py`: offline installation and guards.
- `modules/base.nix`, `persistence.nix`: identity, network, comin, Btrfs root reset.
- `modules/services.nix`, `monitoring.nix`, `ingestion.nix`, `backup.nix`: native
  services, dependency ordering, runtime credentials and timers.
- `dashboards/`: Nix panel contracts, operational/scientific queries and alerts.
- `ingest/`: immutable archive, Parquet schema, ClickHouse projection, spool worker,
  verified backups and bounded BuildBuddy read client.
- `tools/`: authenticated enrollment, encrypted provisioning, bootstrap, discovery,
  ISO acceptance, source audit and report generation.
- `tests/`: pure contracts, synthetic data, native boot/service/cluster fixtures,
  and actual ISO acceptance.

## Persistence

One GPT disk: 1 GiB ESP, remaining Btrfs shared allocation. Sibling subvolumes
`@root`, `@nix`, `@persist`, `@data` mount at `/`, `/nix`, `/persist`, `/data`.
A required initrd service deletes root (including nested subvolumes) and creates a
new root before `sysroot.mount`. No old root snapshots accumulate. Failure blocks
root mounting; it cannot quietly boot with incidental state retained.

Impermanence retains machine-id, NixOS state, systemd state and comin history.
SSH and age identities live directly under `/persist`. Garage, ClickHouse,
Grafana and ingestion use explicit `/data` directories. VictoriaMetrics uses a
retained native StateDirectory with an explicit static user, avoiding the
DynamicUser/private-directory bind-mount trap. Services require persistent mounts.
Boot generations and the Nix store persist independently. Root reset and Nix GC
never traverse the scientific archive. Disko is invoked only by the installer.

## Scientific evidence

Local producers supply a version-1 evidence JSON next to immutable artifacts
(the exact fixture is `tests/test_science.py`). Required provenance includes
immutable 40/64-hex source revision, protocol digest, study/run identities and artifact SHA-256s.
Records distinguish evaluations from logical feedback. Measurements carry metric
version, population, aggregation, nullable value, exact optional fraction,
status, coverage counts and producing artifact digest. Domain extensions survive
as JSON inside Parquet rather than being discarded.

The worker verifies local bytes, creates Parquet, stores content-addressed objects
under a persistent single-writer lock with existing-object conflict checks, reads them back, then publishes an immutable manifest
at `studies/<study>/runs/<run>/manifest.json`. Failed imports cannot publish a new
complete manifest. SQLite checkpoints survive restarts. Completed sources are
skipped; interrupted archive/index work retries. Completed inbox caches expire
after seven days only after local and sealed remote integrity checks; archives do
not expire. The optional `export` tool streams retained native quality-task reports
with pinned ijson, preserving exact fractions and source records without inferring
physical execution. ClickHouse ReplacingMergeTree
and FINAL views make projection replay logically idempotent. Its entire content
can be reconstructed from sealed archived Parquet. Grafana's user is read-only.

The production service processes an explicit local evidence spool. Cloud metadata/log API probing is implemented and authenticated. Optional bounded
receipt polling is enabled with `host.buildbuddy = true` and an enrolled runtime
API token. Receipts are explicitly distinct from sealed scientific evidence;
automatic Cloud artifact discovery
and CAS download are not a verified path. Keep BEP/action/profile/JFR files with
the exported artifact bytes; opaque receipt extensions preserve unavailable fields
without inventing measurements. No cacheable Bazel action contacts this service.

Three replicas consume roughly three times the unique archive bytes; 768 GB raw
is **not** 768 GB scientific capacity. Choose layout capacities only after
measuring OS/database headroom. Alerts, bounded journal retention and Nix GC help
manage pressure; archive deletion has no automatic retention policy. Replication
is not a backup: configure an independently mounted destination or remote S3
archive and run the verification/restore workflow in `OPERATIONS.md`.

## Trust and rollout

Comin fetches public configuration, verifies SSH Git signatures, selects the
host's configuration under `infra/`, uses `test` for `testing-<hostname>` and
`switch` for main. Every activation needs manual confirmation. Enrolled machine
IDs block accidental migrations. Confirm one host only after Garage health and
available quorum have been checked. Comin supplies no distributed rollout lock.

Read `OPERATIONS.md` before making physical media. `VALIDATION.md` distinguishes
pure evaluation, mocked guards, native runtime tests and actual installer tests.
The presence of an image definition alone establishes no hardware readiness.

Garage does not enforce WORM or reliable conditional PUT creation. Archive credentials
are restricted to the single ingestion node; every authorized importer must use
the same persistent checkpoint/lock path. The application rejects an existing key
with different bytes. An administrator or another writer bypassing this application
can still overwrite objects; independent verified backups address that threat.

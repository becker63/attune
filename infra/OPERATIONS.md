# Operations

Commands run at the Attune repository root unless marked as node commands.
Read the current generated validation report before deploying. The fixture ISO
is deliberately insecure and must never be used on physical hardware.

## 1. Build and verify an installer

```sh
nix build path:./infra#checks.aarch64-linux.evaluation --no-link
nix build path:./infra#checks.aarch64-linux.installer-guard --no-link
nix build path:./infra#installer-attune-a --out-link infra/result-attune-a --max-jobs 1 --cores 2 --builders ''
sha256sum infra/result-attune-a/iso/attune-a-installer.iso
nix build path:./infra#checks.aarch64-linux.installer --no-link --max-jobs 1 --cores 2 --builders ''
```

Build `installer-attune-b` and `installer-attune-c` for the other two machines.
Record the hash independently of the USB. The acceptance check uses the same
installer module and disk guards with a disposable SSH fixture identity; it
installs onto an emulated 256,000,000,000-byte NVMe and boots the installed system.
No x86 builder is required. Existing binfmt registration and sandbox visibility
are prerequisites on Asahi; see reconnaissance. Keep at least 30 GiB free while
building. Do not add a missing remote builder.

## 2. Write USB (destructive to the explicitly selected USB only)

These commands are instructions for the operator, never an automatic dev-host action.

```sh
lsblk -o NAME,PATH,SIZE,TRAN,RM,MODEL,SERIAL,MOUNTPOINTS
# Set this only after physically identifying the USB. Never use the internal NVMe.
usb=/dev/disk/by-id/usb-REPLACE_WITH_VERIFIED_USB_ID
lsblk -o NAME,SIZE,TRAN,RM,MOUNTPOINTS "$usb"
# Unmount that USB's mounted partitions individually first, then review again.
sudo dd if=infra/result-attune-a/iso/attune-a-installer.iso of="$usb" bs=4M conv=fsync status=progress
bytes=$(stat -Lc %s infra/result-attune-a/iso/attune-a-installer.iso)
sudo cmp -n "$bytes" infra/result-attune-a/iso/attune-a-installer.iso "$usb"
sync
```

## 3. Boot and install

Use A's USB on the intended A machine. A disk serial is **not** required. A single
zero-filled internal NVMe in the 240–270 GB tolerance installs automatically.
The entire namespace is read to verify emptiness; this may take several minutes.
Signature-free raw data is not treated as empty. Firmware
must support x86 UEFI USB boot; enable it/select the USB if necessary. Software
cannot universally change firmware USB priorities or Secure Boot settings.

The ISO contains a host-specific authorization marker, not a shared secret.
The installer checks it, the environment, disk count/capacity, transport,
removability, mounts, known layouts, signatures and any configured identity pin.
It includes the system closure and Disko for offline installation. Installation
completion is recorded at `/persist/attune/install-complete`. The installer attempts a one-time UEFI BootNext selection without changing
BootOrder. Firmware may ignore or reject that request. Remove USB as the
machine reboots if necessary, or configure NVMe first in firmware boot order. If USB wins
again it refuses reinstallation and stays in recovery; it never wipes again.

On failure, use the local installer shell or key-only SSH and inspect:

```sh
journalctl -u attune-install -b --no-pager
cat /run/attune-install-diagnostics.txt
lsblk -f
```

Existing partitions are deliberately not treated as blank. An existing Attune
label, partial installation or completion marker requires separate recovery.
Do not restart Disko manually to bypass these checks.

## 4. Serial-free approval for a nonempty, non-Attune disk

This authorizes destruction of the selected disk; perform it only after verifying
that no data on that ThinkCentre needs retaining. Record the installer's SSH
fingerprint at its physical console (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`).
Pin the matching public key in a dedicated known-hosts file before SSH.

```sh
# NODE is the discovered installer address, already pinned in infra-known-hosts.
ssh -i ~/.ssh/colmena -o StrictHostKeyChecking=yes -o UserKnownHostsFile=infra-known-hosts root@NODE attune-install-claim > /tmp/attune-replacement.json
cat /tmp/attune-replacement.json
ssh-keygen -Y sign -f ~/.ssh/colmena -n attune-install /tmp/attune-replacement.json
scp -i ~/.ssh/colmena -o StrictHostKeyChecking=yes -o UserKnownHostsFile=infra-known-hosts /tmp/attune-replacement.json /tmp/attune-replacement.json.sig root@NODE:/run/
ssh -i ~/.ssh/colmena -o StrictHostKeyChecking=yes -o UserKnownHostsFile=infra-known-hosts root@NODE 'systemctl reset-failed attune-install; systemctl start attune-install'
```

The claim expires after 30 minutes of installer uptime and binds to that boot,
temporary SSH host identity, target device/capacity and first/last MiB hash.
Verification uses the approved operator public key and separate `attune-install`
signature namespace. It cannot authorize another boot or override Attune labels.
A wrong/expired/unsigned ticket grants nothing. Optional disk-serial replacement
pins are also supported, but not required for this procedure. LAN announcements
cannot approve destruction.

## 5. Discover and enroll public identities

```sh
nix run path:./infra#discover
# A directed subnet broadcast or unicast can be used if limited broadcast is blocked:
nix run path:./infra#discover -- --broadcast 192.168.1.255
```

Replies are public **UNVERIFIED** hints, not cluster membership. New installed
SSH identities differ from installer identities. At the node console compare:

```sh
ssh-keygen -lf /persist/ssh/ssh_host_ed25519_key.pub
cat /etc/machine-id
cat /persist/sops/recipient.txt
```

Use `ssh-keyscan -t ed25519 NODE` to collect a key, compare its fingerprint at the
console, then place the verified line into your owner-controlled known-hosts
file. Do not blindly trust a scan. Enrollment refuses changed recorded identities.

```sh
python3 infra/tools/enroll.py attune-a --address NODE --known-hosts /absolute/infra-known-hosts --key ~/.ssh/colmena
```

Repeat for B and C with their own USB images and verified SSH identities. Three
machines may install independently, without serial inventory or an existing
cluster. Preserve independent offline backups of the administrative age key at
`~/.config/sops/age/keys.txt`; never copy it into Git or an ISO. Do not reuse a
machine's private host identity on another simultaneously running machine.

## 6. Prepare the first signed configuration

Confirm the private subnet is free; change inventory addresses if needed.
Check wired interfaces match `en*`/`eth*`; an unusual interface name needs a
reviewed match rule. Initial DHCP management remains usable before enrollment.

```sh
python3 infra/tools/provision-secrets.py
# Edit hosts.nix: set enrolled=true for all three, after public identities exist.
nix build path:./infra#checks.aarch64-linux.evaluation --no-link
nix run path:./infra#validate -- --runtime
# Sign only this task's files. Never stage unrelated scientific work.
git add infra
git -c gpg.format=ssh -c user.signingkey="$HOME/.ssh/colmena" commit -S -m 'Enroll Attune research nodes'
```

`provision-secrets.py` refuses to overwrite existing secret files. It creates
per-node SOPS ciphertext, shared Garage RPC credentials, paired ClickHouse/Grafana
and metrics credentials, Grafana encryption/admin secrets and an archive S3 key.
No plaintext is written to the repository. The Git deployment signer is the
operator key in `keys/allowed-signers`. Configure your Git SSH signing identity
accordingly. Backup admin recovery material before relying on node decryption.

The delivered feature branch is not a production deployment branch. Review and
merge a signed approved configuration to `main` deliberately. Initial comin
fetches public Git with signature verification; unsigned existing main commits
are rejected until an approved signed configuration is published.

## 7. Test and activate one host

Publish a signed candidate to `testing-attune-a` (a forward descendant/rebase of
approved main). This operation changes live desired configuration for A only.

```sh
git push origin HEAD:testing-attune-a
ssh root@NODE 'comin status; comin confirmation show'
# Confirm the displayed candidate SHA and target host before accepting.
ssh root@NODE comin confirmation accept
```

The testing branch uses `test`: no new boot generation. Check services and SSH.
Reboot restores the boot generation until approved production activation.
Remove/advance stale testing branches after review; they otherwise take priority.
Use `comin deployment list`, `comin deployment latest`, and `journalctl -u comin`
for failures. Default history retention is 20 attempts, 8 successes, 5 boot entries.

For production merge the reviewed signed candidate into `main`. Comin builds but
waits for activation confirmation on each node. Freeze main at the reviewed SHA
until the entire rollout finishes; do not publish another production candidate
during confirmation. A human coordinator must ensure
only one node is confirmed at a time. No distributed lock is implied.

## 8. Bootstrap Garage

After enrolled configurations start Garage on each node, collect public RPC IDs:

```sh
python3 infra/tools/enroll.py attune-a --address NODE_A --known-hosts /absolute/infra-known-hosts --key ~/.ssh/colmena --garage
# Repeat B/C.
ssh root@NODE_A 'df -B1 /data; garage status'
```

Set each `garageCapacity` in `hosts.nix` to a measured capacity string such as
`"150G"` only if that node actually has the required free space and database/OS
headroom. This is a layout weight, not a Btrfs hard partition/quota. Keep distinct
zones A/B/C. Commit public IDs/capacity, test, deploy one host at a time.

On A, **this changes cluster membership/layout**:

```sh
attune-garage-bootstrap
garage status
garage health
garage layout show
```

The command requires all three verified IDs/capacities, connects the expected
peers, refuses an unrelated/nonempty initial layout and applies layout version 1.
It records the desired membership under `/data/garage/bootstrap.json`; repeating
it checks the same desired identity and health. It is never an activation script.
If interrupted after layout apply but before the marker, inspect actual layout
and recover/adopt the matching marker deliberately rather than reinitializing.

On C, reconcile the previously encrypted archive key/bucket without printing it:

```sh
attune-garage-credentials
systemctl start attune-ingest
```

Do not print `garage key info` into shared logs: it may reveal credentials.
Garages's RPC secret stays in an owner-only runtime file. The S3 key is delivered
only to the archival worker; no operational credentials are in the installer.

## 9. Grafana, ClickHouse and science

ClickHouse initializes the versioned schema declaratively. Its default database
user is loopback-only; `grafana` is read-only and source-restricted to A; `ingest`
is source-restricted to C. Password hashes come from a runtime SOPS XML file.
Grafana listens on loopback. Use an authenticated trusted SSH endpoint:

```sh
ssh -N -L 3000:127.0.0.1:3000 root@NODE_A
# Visit http://127.0.0.1:3000; admin password is in the enrolled encrypted file.
# To inspect it locally without storing it in shell history:
sops decrypt --extract '["grafana-admin"]' infra/secrets/attune-a.yaml
```

The three dashboards are provisioned from Nix; empty scientific panels indicate
no matching evidence. Alertmanager is loopback-only on C; there is initially no
external notification receiver. Tunnel port 9093 to inspect active alerts and
configure a secret-backed receiver before expecting off-machine notifications.

Export a completed experiment into a directory with `evidence.json`, versioned
records and referenced artifact bytes, following `tests/test_science.py`.
Preserve raw BEP/action logs, invocation/CAS references and separately generated
JFR files as artifacts or record extensions. No automatic CPU/heap profile is
assumed. Copy the directory over verified SSH to C's `/data/ingest/inbox/<run>`;
set ownership to `attune-ingest:attune-ingest`, then:

```sh
systemctl start attune-ingest
journalctl -u attune-ingest --no-pager
cat /data/metrics/ingestion.prom
```

For an explicit manual import, the named `ingest` package accepts `--endpoint`,
`--credentials`, `--bucket`, `--state`, or a disposable `--local-store`. Credentials
are JSON runtime files with `access_key` and `secret_key`. Never put their values
into Nix expressions or command-line literals. Cloud metadata/log API access is
probed; verified Cloud CAS-byte retrieval is not implemented. Local evidence
export is the supported complete archival input.

## 10. Health and rolling production updates

```sh
ssh root@NODE_A 'garage health; garage status; garage layout show'
ssh root@NODE_B 'systemctl is-active clickhouse; df -h /data'
ssh root@NODE_C 'systemctl list-timers attune-ingest attune-backup; systemctl --failed'
```

Evaluate/build/test first. Test A (or another designated canary) on its testing
branch. Before confirming a production node, ensure the other two Garage replicas
are healthy and no other upgrade/replacement is in progress. Confirm the exact
candidate SHA on that node. Reboot if needed, wait for Garage to rejoin and verify
reads/writes through a surviving S3 endpoint. Stop on failure. Only then confirm
the next node. Grafana/ClickHouse/ingestion/metrics have no application HA; a
Garage quorum test says nothing about those services' availability.

## 11. Rollback and interrupted installation

At the node console choose a retained NixOS boot generation, or on an accessible
node run `nixos-rebuild switch --rollback`. Inspect comin history and suspend
reconciliation if needed (`comin --help`/`comin status` list current commands).
Publish a signed forward revert; do not force-reset approved Git history.
Database/archive paths are independent from OS generations. Schema migrations
must remain compatible with rollback; rollback does not undo data migrations.

A partial installation is **not blank**. Boot recovery media, inspect/mount the
Btrfs subvolumes read-only, retain diagnostics and any evidence. For a partially
installed first system, mount the existing root/Nix/persist/data and ESP in the
original layout, then run `nixos-install --system <the ISO's target closure>` to
resume without formatting. Obtain that exact path from
`systemctl cat attune-install`. Finish the host-named completion marker only after
successful installation. Never label an interrupted disk empty.

For that **confirmed partial first installation only**, these commands resume
writes without running Disko. Inspect labels and the started marker first; if the
host identity differs or valuable data exists, stop and recover it independently.

```sh
# Recovery installer shell: read-only inspection first.
mkdir -p /mnt
mount -t btrfs -o ro,subvol=@persist /dev/disk/by-label/attune-system /mnt
cat /mnt/attune/install-started
umount /mnt
# The next commands modify the existing installation. Verify the host above.
mount -t btrfs -o subvol=@root /dev/disk/by-label/attune-system /mnt
mkdir -p /mnt/nix /mnt/persist /mnt/data /mnt/boot
mount -t btrfs -o subvol=@nix /dev/disk/by-label/attune-system /mnt/nix
mount -t btrfs -o subvol=@persist /dev/disk/by-label/attune-system /mnt/persist
mount -t btrfs -o subvol=@data /dev/disk/by-label/attune-system /mnt/data
mount /dev/disk/by-label/ATTUNE_EFI /mnt/boot
systemctl cat attune-install
# Replace TARGET_CLOSURE with the exact --system store path shown above.
nixos-install --no-root-passwd --no-channel-copy --system TARGET_CLOSURE
# Only after exit status zero; choose the host matching the verified started marker.
printf '%s\n' attune-a > /mnt/persist/attune/install-complete
sync
umount -R /mnt
poweroff
```

Remove USB and boot NVMe. If GPT/subvolumes are incomplete, these mounts must fail;
do not improvise formatting over the partially written device. Retain diagnostics
and use a deliberate local recovery with verified backups before starting over.

If a clean reinstall is truly necessary, back up all subvolumes and identities,
verify the exact physical target locally, and use a separate recovery session to
remove/recreate the old layout. Automatic signed replacement intentionally cannot
override Attune labels. No generic wipe command is supplied for an unknown disk.

## 12. Replace a failed node or disk

Do not remove the surviving two replicas or change replication factor. Back up
healthy cluster metadata and archives. Record the failed node's Garage public ID
and current layout version. Install the replacement using an enrollment-only ISO
onto its blank disk. Move the old public enrollment record to a reviewed recovery
record outside active inventory; explicitly enroll the new machine/age/SSH keys.
Use the administrator identity to re-encrypt that host's secrets to its new age
recipient; remove the old recipient. Never copy an old active private node key.
Set the new expected machine ID in approved inventory before comin activation.

Replacing Garage membership is a live data operation: use `garage layout show`,
`garage layout remove OLD_ID`, `garage layout assign -z HOST -c MEASURED NEW_ID`,
and `garage layout apply --version NEXT_VERSION` only after reviewing the staged
layout and retaining quorum. Wait for full replication/health and verify archived
hashes. Update the bootstrap adoption marker deliberately; ordinary bootstrap
refuses a changed desired identity. Do not delete metadata directories to force a
node to join. If two disks are lost, stop writes and use the independent backup.

## 13. Independent backup and restore

For an external disk, declare its known UUID/mount under NixOS and provide an
independently mounted target (for example `/mnt/attune-backup`). Set C's
`backupPath` to that mountpoint, commit, test and deploy. The daily job refuses a
directory or subvolume on the same physical disk as `/data`, copies only sealed manifests and
verified referenced objects, verifies the destination, and updates backup-age
metrics. It never deletes source objects or propagates deletes.

The `backup` package also supports independent S3 endpoints with separate runtime
credentials. The destination bucket must already exist. For a local rehearsal:

```sh
nix run path:./infra#backup -- --source-local /tmp/source-archive --destination-local /tmp/test-backup --allow-test-destination
nix run path:./infra#backup -- --source-local /tmp/test-backup --destination-local /tmp/test-restore --allow-test-destination
```

For a real restore, use the off-cluster archive as source and a freshly initialized
Garage bucket as destination, passing runtime source/destination credential paths.
The same verified-copy routine restores objects before manifests. Then replay
`attune-project` for each sealed manifest into an empty initialized
ClickHouse database. Authoritative raw evidence and Parquet require no ClickHouse
backup. Test restoration periodically; replication alone is not a backup.

## 14. Rotation and recovery

Use SOPS with the existing administrator key to recover ciphertext when a node
key is lost. Add the replacement node recipient, run `sops updatekeys`, remove the
lost recipient, and deploy signed updates. Back up the administrator key offline
before deleting any old identity. SSH host-key replacement requires fingerprint
verification and known-hosts updates; never auto-accept a changed enrollment key.

For actual credential rotation, edit SOPS ciphertext, apply matching provider and
client changes in a maintenance window, verify access, then revoke the old key.
Garage RPC rotation needs coordinated cluster maintenance; do not independently
regenerate it on one node. Grafana's encryption key is state, not a disposable
admin password: changing it requires re-encrypting stored runtime secrets. Keep
the old key for recovery until Grafana migration is verified. ClickHouse password
hashes and paired Grafana/ingest passwords must change together. Never rerun the
initial generator to rotate an already deployed cluster.

Disposable acceptance files live in Nix build temporary directories and retained
logs in `infra/reports/logs` (ignored). For manual QEMU runs choose a fresh directory
under `$XDG_CACHE_HOME/attune-infra` or `~/.cache/attune-infra`. Delete only the exact
completed test directory after confirming QEMU exited. Never run global Nix GC,
remove unrelated roots, or delete user experiment directories for cleanup.


## Projection rebuild and optional Cloud receipts

After restoring an archive into a separate verified bucket and initializing an
empty ClickHouse schema, rebuild the disposable projection (on C or through an
explicit private endpoint):

```sh
nix run path:./infra#project -- --all \
  --archive-endpoint http://10.77.0.13:3900 --bucket attune-science \
  --archive-credentials /run/secrets/archive-s3 \
  --clickhouse http://10.77.0.12:8123 --credentials /run/secrets/archive-clickhouse
```

This modifies only the query projection, reading and verifying every sealed
manifest and its referenced Parquet. Repeated projection is logically idempotent
through FINAL views; it can add physical duplicate parts until ClickHouse merges.

Optional BuildBuddy receipt polling requires `buildbuddy = true` on the ingestion
host and `buildbuddy-api` in its encrypted SOPS file. Its timer retrieves bounded
completed invocation/execution metadata into the persistent evidence spool.
Access tokens remain runtime files; use the existing owner-private credential
only through the provisioning tool's credential-file option. This collector does
not fetch CAS output bytes and cannot mark an experiment scientifically complete.
A manually retained BEP/action-log export plus artifact bytes remains supported.

Moving a service means changing role membership in `hosts.nix`, evaluating all
systems, provisioning that host's corresponding encrypted secrets, and explicitly
copying/verifying its persistent data before one-node-at-a-time activation.
Endpoint references derive from roles. Nix does not migrate database directories
or encrypted recipients automatically. Keep the old data until recovery is tested.

Grafana's ClickHouse account has `readonly=1`. The pinned upstream plugin sets
`max_execution_time` per query, so only that setting is changeable while read-only;
SQL writes remain rejected. The integration test exercises the real plugin and
rejects a mutation through those credentials.

## Export an existing native Attune quality report

The named `export` tool supports the actual `quality-task-responses.json.gz`
format written by `attune/experiments/native_patterns/search/quality_analyze.py`.
It streams a bounded selected window with pinned ijson, retains original gzip
bytes, protocol bytes, producer records and exact metric fractions. It does not
execute search, recalculate R3, infer physical actions, or turn report observations
into online feedback. Reported Studio utility deltas remain signed deltas.

Use hashes and source identity from the sealed Bazel/BuildBuddy output receipt,
including an immutable source-tree digest if the producing checkout was dirty.
Do not substitute a moving branch name or assume current HEAD describes old bytes.

```sh
nix run path:./infra#export -- /path/quality-task-responses.json.gz \
  --sha256 EXPECTED_ARTIFACT_SHA256 \
  --protocol /path/protocol.json --protocol-sha256 EXPECTED_PROTOCOL_SHA256 \
  --source-revision IMMUTABLE_PRODUCING_SOURCE_DIGEST \
  --study attune-quality --run task-records-000000 --population DECLARED_TASK_POPULATION \
  --offset 0 --count 1000 --output /tmp/attune-export/task-records-000000
scp -r /tmp/attune-export/task-records-000000 root@NODE_C:/data/ingest/inbox/
ssh root@NODE_C 'chown -R attune-ingest:attune-ingest /data/ingest/inbox/task-records-000000; systemctl start attune-ingest'
```

Use distinct run IDs for additional windows, advancing offset by selected count.
A sealed window explicitly records its scope and does not claim the entire source
has been indexed. The full original source remains recoverable as an archived
content-addressed artifact. Source bytes repeated in windows deduplicate in Garage;
local export/spool copies still consume space. Choose windows and available staging
space deliberately. The adapter rejects an existing destination and cannot silently
replace a prior export. Other Attune formats use the generic versioned evidence
contract until an explicitly tested adapter exists.

## Completed inbox cache retention

The Nix ingestion service retains completed local bundles for seven days, then
examines at most ten old bundles per timer tick. It deletes a bundle only after
successful archival/projection, unchanged source and local artifact hashes, no
unarchived extra files/symlinks, and fresh verification of every sealed remote
object. Failed/unpublished/changed bundles remain local and observable. The
scientific archive is never deleted by this policy. Checkpoints and verified-byte
counters persist. `--retain-completed-days 0` disables this application cache
cleanup when set deliberately in the Nix service configuration.


Rotation applies runtime file contents through declared SOPS `restartUnits` for
Garage, ClickHouse, Grafana, VictoriaMetrics and vmalert. Paired provider/client
changes require a maintenance window; RPC secret rotation is not an ordinary
quorum-preserving software rollout. Keep old S3 credentials enabled while importing
and verifying a new key with `attune-garage-credentials`; revoke the old public key
ID only after the worker succeeds using its replacement. Timer jobs read their
credential files at each invocation and safely retry interrupted work.

Removing a lost age recipient does not revoke its ability to decrypt historical
Git ciphertext. If the old private identity may be compromised, rotate the actual
service credentials as well as re-encrypting current files. Preserve independent
administrative recovery backups before making either change.

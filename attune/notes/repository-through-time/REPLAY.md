# Replay the retained Attune signatures

These commands use existing immutable inputs and typed Flix evaluators. They do not invoke Grit, a provider, or the shared Bazel output base. Run from a shell; keep every output in a fresh temporary directory. The research bundle is input only.

## Verify the frozen input and result bytes

From this directory, after the bundle has been finalized:

```bash
sha256sum --check SHA256SUMS
```

The source hashes inside the Grit source tables were independently compared with `jj file show -r REV root:PATH` in the historical repository. [source-verification.json](source-verification.json) records zero source mismatches and zero invalid facts for all three input pairs. [source-manifests.json.gz](source-manifests.json.gz) carries the historical path/byte hashes and the new repository census. These are input identities, not signature definitions.

## Replay the published world

The retained native launcher resolves its pinned JDK and fat JAR through its existing runfiles tree. Its location is recorded in [published-replay-argv.json](published-replay-argv.json). Use the following values in this environment:

```bash
bundle=/home/becker/projects/attune/attune/notes/repository-through-time
tool_dir=/tmp/attuneflix-oracle-fab7e731/execroot/_main/bazel-out/aarch64-opt-exec-ST-cbdd3fe8ffb5/bin/experiments/atlas-swe-explore
replay_dir=$(mktemp -d /tmp/attune-signature-replay.XXXXXX)

"$tool_dir/signature" \
  --jvm_flag=-Dattune.command=signature \
  --jvm_flag=-Dattune.repository=attuneflix \
  --jvm_flag=-Dattune.base_revision=88f97599901df1be52ce8cb06f2a701c464cbbbe \
  --jvm_flag=-Dattune.source_tree_identity=attuneflix-source-tree-v2:88f97599901df1be52ce8cb06f2a701c464cbbbe \
  --jvm_flag=-Dattune.fact_identity=repository-facts-v2:51fd0342852e771b588edcd4ef89b105b57e8ec400741aa562c7fbabfb6c95a5 \
  --jvm_flag=-Dattune.snapshot_id=repository-snapshot-v1:6bae5cbc218b494824fd4dbdd23e62cdad23301dc9243ee7040a32728daef59a \
  "--jvm_flag=-Dattune.world_metadata=$bundle/inputs/published/metadata.parquet" \
  "--jvm_flag=-Dattune.world_entities=$bundle/inputs/published/entities.parquet" \
  "--jvm_flag=-Dattune.world_relations=$bundle/inputs/published/relations.parquet" \
  "--jvm_flag=-Dattune.output_observations=$replay_dir/observations.parquet" \
  "--jvm_flag=-Dattune.output_physical=$replay_dir/physical.parquet" \
  "--jvm_flag=-Dattune.output_snapshot=$replay_dir/snapshot.parquet" \
  --jvm_flag=-Dattune.manifest_case_count=1

"$tool_dir/summary" \
  "--jvm_flag=-Dattune.input_observations=$replay_dir/observations.parquet" \
  "--jvm_flag=-Dattune.output_summary=$replay_dir/summary.parquet"

"$tool_dir/report" \
  "--jvm_flag=-Dattune.input_summaries=$replay_dir/summary.parquet" \
  "--jvm_flag=-Dattune.input_snapshots=$replay_dir/snapshot.parquet" \
  "--jvm_flag=-Dattune.input_physical=$replay_dir/physical.parquet" \
  "--jvm_flag=-Dattune.output_report=$replay_dir/REPORT.md" \
  "--jvm_flag=-Dattune.output_repository_summaries=$replay_dir/repositories.parquet"

cmp "$replay_dir/observations.parquet" "$bundle/measurements/published/observations.parquet"
cmp "$replay_dir/physical.parquet" "$bundle/measurements/published/physical.parquet"
cmp "$replay_dir/repositories.parquet" "$bundle/measurements/published/repositories.parquet"
```

The original execution passed exact headline comparisons, immutable input hashes, and panel-to-all-seed physical counters. The published all-seed table is retained separately; replaying the 16-seed panel does not regenerate the whole 2,616-seed census.

## Replay the historical Grit fact pairs

The existing `ControlSignature` instrument was compiled once from its canonical source closure, without modifying the algorithm. Its JAR is retained outside the repository; exact artifact and input hashes are in [evaluator-manifest.json](evaluator-manifest.json). Run each of `baseline`, `cleaned`, and `control` sequentially:

```bash
bundle=/home/becker/projects/attune/attune/notes/repository-through-time
java_bin=/tmp/attuneflix-oracle-fab7e731/external/rules_java++toolchains+remotejdk25_linux_aarch64/bin/java
instrument=/tmp/attune-longitudinal/control-replay-project/artifact/control-replay-project.jar
specimen=control
replay_dir=$(mktemp -d /tmp/attune-fact-signature-replay.XXXXXX)

"$java_bin" -Xmx1536m \
  --add-opens=java.base/java.nio=ALL-UNNAMED \
  --enable-native-access=ALL-UNNAMED \
  -Dattune.command=compute \
  "-Dattune.sources=$bundle/inputs/$specimen/sources.parquet" \
  "-Dattune.facts=$bundle/inputs/$specimen/facts.parquet" \
  "-Dattune.revision=$bundle/inputs/$specimen/revision.txt" \
  "-Dattune.output_signatures=$replay_dir/observations.parquet" \
  "-Dattune.output_summaries=$replay_dir/summaries.parquet" \
  "-Dattune.output_identity=$replay_dir/identity.json" \
  -jar "$instrument"

cmp "$replay_dir/observations.parquet" "$bundle/measurements/$specimen/observations.parquet"
cmp "$replay_dir/summaries.parquet" "$bundle/measurements/$specimen/summaries.parquet"
```

The control result also byte-matches the original committed tables. The adapter is expressly for AttuneFlix and labels that repository; do not feed newer Attune snapshots to it while retaining that identity.

The 512 MiB initial attempt exhausted its heap during the adapter's typed Parquet round trip. Successful runs used the shown 1,536 MiB cap, sequentially. This is replay resource information, not a measured cold/warm cost comparison.

## Reconstruct the cached instrument if the temporary JAR is lost

Extract [canonical-instrument-source.tar.gz](canonical-instrument-source.tar.gz) into a fresh external directory. Restore its `lib/external/{0..15}.jar` files from the retained pinned closure, checking each against the evaluator manifest. The archive's `flix.toml` names only those local jars and has no Maven coordinates to resolve. Then run the pinned Flix 0.76.1 compiler, also checking its recorded digest:

```bash
"$java_bin" -Xmx768m -jar /tmp/flix-0.76.1.jar \
  build-fatjar --no-install --threads 2
```

Run that command from the extracted project directory. The generated fat JAR name follows the directory name. Compare result Parquet bytes; a rebuilt JAR's ZIP metadata need not reproduce the original fat-JAR digest. If the cached dependency closure is absent, rebuilding the existing Bazel targets needs a coordinated owner window or a fully isolated output base. Do not run the historical `compute_control_signatures` shell wrapper against the frozen reference: it writes its source-tree outputs.

## Read the temporal dataset without recomputation

`signature-summary-rows.parquet` contains the canonical reductions, including depth, final-atom direction, extinction, survival, expansion and recurrence. `measurements/*/observations.parquet` retains each exact typed route response. `signature-points.json` supplies compact normalized measurements and physical counters; `remapping-series.json` supplies the controlled oracle curves. `temporal-atlas.json` groups them by protocol and repository for a future slider.

The two time-series protocols remain distinct. No command above acquires a modern polyglot self-world, proves full coverage, or regenerates unsupported missing values. Missing facts are a gap rather than a request to replay external SWE-rebench acquisition.

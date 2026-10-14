# Replay the higher resolution checkpoints

Run signature reductions directly over the frozen source and fact tables. Native Grit is needed only for absent acquisition inputs; these 30 checkpoints already retain their facts. The old AttuneFlix reference checkout and shared Bazel output base remain untouched.

## Verify the bundle

```bash
cd /home/becker/projects/attune/attune/notes/repository-through-time/checkpoints-v2
sha256sum --check SHA256SUMS
```

## Replay one checkpoint downstream

The same command works for every point, with its explicit repository, revision, source identity and acquisition identity. Read those identities from that checkpoint's `receipt.json`; never derive them from the build clock or current working tree.

```bash
bundle=/home/becker/projects/attune/attune/notes/repository-through-time/checkpoints-v2
checkpoint=attune-140d1b2d1805
java_bin=/tmp/attuneflix-oracle-fab7e731/external/rules_java++toolchains+remotejdk25_linux_aarch64/bin/java
instrument=/tmp/attune-checkpoints-v2/instrument/artifact/instrument.jar
replay_dir=$(mktemp -d /tmp/attune-checkpoint-replay.XXXXXX)
```

A mechanical example using the receipt, with no acquisition or independent signature algorithm:

```python
import json, pathlib, subprocess
bundle = pathlib.Path('/home/becker/projects/attune/attune/notes/repository-through-time/checkpoints-v2')
checkpoint = bundle / 'checkpoints/attune-140d1b2d1805'
receipt = json.loads((checkpoint / 'receipt.json').read_text())
out = pathlib.Path('/tmp/attune-checkpoint-downstream-replay')
out.mkdir(exist_ok=False)
properties = {
    'attune.stage': 'signature', 'attune.command': 'compute',
    'attune.repository': receipt['repository'],
    'attune.source_tree_identity': receipt['source_tree_identity'],
    'attune.acquisition_identity': receipt['acquisition_identity'],
    'attune.sources': checkpoint / 'sources.parquet',
    'attune.facts': checkpoint / 'facts.parquet',
    'attune.revision': checkpoint / 'revision.txt',
    'attune.output_signatures': out / 'observations.parquet',
    'attune.output_summaries': out / 'summaries.parquet',
    'attune.output_identity': out / 'identity-map.json',
}
subprocess.run([
    '/tmp/attuneflix-oracle-fab7e731/external/rules_java++toolchains+remotejdk25_linux_aarch64/bin/java',
    '-Xmx1536m', '--add-opens=java.base/java.nio=ALL-UNNAMED',
    '--enable-native-access=ALL-UNNAMED',
    *[f'-D{k}={v}' for k, v in properties.items()],
    '-jar', '/tmp/attune-checkpoints-v2/instrument/artifact/instrument.jar',
], check=True)
for name in ['observations.parquet', 'summaries.parquet', 'identity-map.json']:
    assert (out / name).read_bytes() == (checkpoint / name).read_bytes(), name
```

The chosen output directory must be absent. Use a fresh directory for each replay. The bundle itself is input only. `execution-receipts.json` retains the exact stage arguments and measured elapsed times.

## Restore the canonical instrument if its temporary JAR is lost

Extract `canonical-instrument-source.tar.gz` outside the repository. Restore the pinned local JAR closure `lib/external/{0..16}.jar`, checking every hash in `evaluator-manifest.json`. The 17th JAR is the mechanical Grit bridge: the archive includes its two Java sources and query resources, so it can also be recompiled with the retained pinned JDK 25. No Maven coordinate is resolved.

From the extracted Flix project directory:

```bash
"$java_bin" -Xmx768m -jar /tmp/flix-0.76.1.jar build-fatjar --no-install --threads 2
```

The output JAR name follows the temporary project directory. Its ZIP metadata may differ after compilation; verify the result Parquet bytes. The authentic `Atlas.Signature`, `Atlas`, `Radii`, admission and reductions are copied from the existing canonical closure. Only metadata properties and dispatch are adapted, as recorded in `instrument-adapter.diff.txt`.

## Acquisition provenance and reuse

The frozen selection is `plan.json`. Each selected source was materialized with the real Jujutsu CLI at its exact revision and independently checked against its source SHA-256 and byte count. `sources.tar.gz` retains only that declared common-language slice. No credentials, current-tree graph or frozen sibling checkout is an input.

A cache key is `(normalized source path, exact source SHA-256, language)` under the pinned query inventory. Matching retained historical facts are reused with their original acquisition identity. Every absent key goes through the historical acquisition logic and cached native Grit ABI; the bounded producer selects one original program per file and serializes genuinely empty results through an explicit marker and the existing Arrow schema (`producer-adapter.diff.txt`); newly acquired facts are reused only under exact key equality. Changed paths require new acquisition. Composite acquisition identities record the set of actual acquisition origins; receipts retain the per-source origin.

The common frontend query files were byte-identical to the retained control and published-revision query inventories. Baseline/cleaned query bodies are unavailable, and none of their facts was reused in this batch. The native shared library is frozen outside the project at `/tmp/attune-checkpoints-v2/native/libattune_grit_abi.so`; `stack.json` records its exact hash and upstream/grammar pins. The newer Ruby fixtures are excluded explicitly from this three-language measurement slice, along with JS/TS in the published old world. Successful query execution does not establish complete semantic extraction.

Upstream acquisition commands are retained as provenance, not required replay steps. Do not rerun them merely to refresh downstream statistics. If a missing future checkpoint requires native Grit, use the declared budget, a fresh isolated directory and a coordinated resource window; never invoke the shared Bazel output base concurrently.

## Verification completed

`downstream-replay-verification.json` records a fresh replay of the latest checkpoint: observations, summaries and identity map are byte-identical. `control-parity.json` records exact equality of all 52,464 original control responses after four explicit identity/protocol metadata changes.

## Directory/location assets

`location-export-receipts.json` contains the exact commands for the existing canonical location exporter. Every checkpoint has `locations.parquet`, including directory prefixes, alongside its world metadata, entities and relations. `locations-instrument-source.tar.gz` preserves that existing exporter closure; its evaluator identity is in `producer-evaluator-manifest.json`. Replaying needs only world tables, never Grit. Replace output paths with a fresh directory before using a retained command.

The temporal JSON is a versioned sidecar intended to power a future Atlas Live revision slider. It does not modify the published viewer. The current viewer has not been asserted to accept the temporal schema directly.

# Frozen public result tables

These are copies of existing native Flix output tables, retained for inspection
without model access or corpus acquisition. They add no measurement. All four
ReviewBench quality-count rows use the corrected 224-positive-reference
population; micro rows retain all 24 tasks. Final-only and checkpoint-inclusive
views remain separate.

`reviewbench/` comes from `//test/reviewbench_pilot:reviewbench_publication`.
`localization/` comes from `//test/localization_runtime:metrics`, covering the
runtime-capped four deterministic arms (88 tasks, 85 eligible, 22 groups).
`SHA256.json` records each table's exact bytes. Compare the tables with the
repository's `LOCALIZATION_REPORT.md`; no raw secret, credential, private
research directory, or corpus archive is included.

The canonical reducers and corpus-free laws are in the active workspace.
Re-materialization of the ReviewBench publication is provider-free:

```sh
cd attune
nix develop --command bazel --output_base="$HOME/.cache/attune-v2-bootstrap-bazel" \
  --host_jvm_args=-Xmx3g build //test/reviewbench_pilot:reviewbench_publication --nofetch
```

It requires the declared pinned golden inputs already available in the local
Bazel repository cache; `--nofetch` fails rather than acquiring an absent input.
The larger localization producer graphs additionally require retained source
archives and external embedding fixtures at the paths declared in
`MODULE.bazel`. They are not supplied by this release. The committed summaries
and law suite can be inspected without them. Mission-library paths and older
source revision IDs in the report refer to the development archive, which is
not part of this curated replacement snapshot.

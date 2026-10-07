"""The declared downstream E ranking and metric cohort (`VAL-EMBED-003`, `VAL-EMBED-004`).

Owner-approved POST-HOC EXPLORATORY EMBEDDING extension (2026-10-07). The
expansion here is downstream-only: it binds the already-declared immutable
embedding fixtures (`//test/embedding:queries` and the per-world code shards),
the frozen runtime-capped deterministic rank trees and the admitted evaluator
labels, and it redeclares no producer. It runs no inference, re-executes no world
extraction, Theory lowering or variant ranking, and touches no model byte.

The two stages the macro declares are the complete standalone E ranking of every
surviving task and the one canonical P/P+A/E metric table with the frozen
A32/E32 overlap. The rank stage reads its declared fixture set through the
launcher's whole-set manifest, so it resolves no path and parses no target name
of its own.
"""

load("//platform/build:native.bzl", "native_study_stage")

def attune_localization_embedding(
        name,
        analysis,
        world_sources,
        exclusions,
        stage_srcs,
        query_fixture,
        shard_template,
        rank_template,
        derived,
        mapped,
        published,
        label_template,
        shard_size = 32):
    """Expand the surviving cohort into the E ranking stages and the metric stage.

    Args:
      name: the metric stage target name, which also names its declared tree.
      analysis: the admitted mapped localization manifest records.
      world_sources: the admitted `{world: [path, ...]}` frozen candidate inventory.
      exclusions: the declared runtime-cutoff entries; every task of an excluded
        group is outside the E population.
      stage_srcs: the explicit Flix sources both stages compile.
      query_fixture: the declared query fixture producer of the surviving cohort.
      shard_template: the declared code-shard producer label, world and index.
      rank_template: the frozen deterministic rank tree of one task.
      derived: the declared derived-population record of the runtime-capped cohort.
      mapped: the admitted mapped localization manifest.
      published: the published runtime-capped metric tree (the cache-check baseline).
      label_template: the admitted evaluator label artifact of one task.
      shard_size: the declared files per code shard.

    Returns:
      The declared `rank_e_<task>` target labels, in manifest order.
    """
    excluded = [entry["group"] for entry in exclusions]
    tasks = [row for row in analysis if len(row) > 3 and row[0] == "task"]
    surviving = [row for row in tasks if row[2] not in excluded]

    # The complete standalone E ranking of one surviving task (`VAL-EMBED-003`).
    # The declared fixture set is the task's one query fixture plus its candidate
    # world's code shards; the frozen deterministic rank tree of the same task is
    # the declared universe witness. No label is a declared input.
    rank_targets = []
    for task in surviving:
        world = task[3]
        shards = [
            shard_template % (world, start // shard_size)
            for start in range(0, len(world_sources[world]), shard_size)
        ]
        native_study_stage(
            name = "rank_e_%s" % task[1],
            stage = "rank_e",
            srcs = stage_srcs,
            inputs = [rank_template % task[1]],
            input_names = ["deterministic"],
            world_sources = [query_fixture] + shards,
            tags = ["manual"],
        )
        rank_targets.append(":rank_e_%s" % task[1])

    # The one canonical metric table and the frozen overlap (`VAL-EMBED-003`,
    # `VAL-EMBED-004`): a scoring consumer over the frozen rankings, the admitted
    # labels and the declared derived population. It reproduces the published P
    # and P+A cells as a cache check rather than recomputing the baseline.
    metric_inputs = [derived, mapped, published]
    metric_names = ["derived", "mapped", "published"]
    for task in tasks:
        metric_inputs.append(label_template % task[1])
        metric_names.append("label_%s" % task[1])
    for task in surviving:
        metric_inputs.append(rank_template % task[1])
        metric_names.append("deterministic_%s" % task[1])
        metric_inputs.append(":rank_e_%s" % task[1])
        metric_names.append("embedding_%s" % task[1])
    native_study_stage(
        name = name,
        stage = "embedding_metrics",
        srcs = stage_srcs,
        inputs = metric_inputs,
        input_names = metric_names,
        tags = ["manual"],
    )
    return rank_targets

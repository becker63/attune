"""The declared downstream hosted-Qwen ranking and metric cohort (`VAL-QWEN-002`,
`VAL-QWEN-003`).

Owner-approved hosted-Qwen continuation (2026-10-07). The expansion here is
downstream-only: it binds the admitted immutable hosted fixtures
(`@attune_qwen_fixtures`), the frozen runtime-capped deterministic rank trees and
the admitted evaluator labels, and it redeclares no producer. It runs no model,
calls no provider, re-executes no world extraction, Theory lowering or variant
ranking, and touches no credential.

The two stages the macro declares are the complete standalone Q ranking of every
surviving task and the one canonical P/P+A/E/Q metric table with the exact
Q−P/Q−PA/Q−E contrasts and the frozen A/E/Q overlap and three-way gold
decomposition. The rank stage reads its declared fixture set through the
launcher's whole-set manifest, so it resolves no path and parses no target name
of its own.
"""

load("//platform/build:native.bzl", "native_study_stage")

def attune_localization_qwen(
        name,
        analysis,
        world_sources,
        exclusions,
        stage_srcs,
        query_fixture,
        shard_template,
        rank_template,
        embedding_rank_template,
        derived,
        mapped,
        published,
        label_template,
        shard_size = 32):
    """Expand the surviving cohort into the Q ranking stages and the metric stage.

    Args:
      name: the metric stage target name, which also names its declared tree.
      analysis: the admitted mapped localization manifest records.
      world_sources: the admitted `{world: [path, ...]}` frozen candidate inventory.
      exclusions: the declared runtime-cutoff entries; every task of an excluded
        group is outside the Q population.
      stage_srcs: the explicit Flix sources both stages compile.
      query_fixture: the admitted hosted query fixture of the surviving cohort.
      shard_template: the admitted hosted code-shard label, world and index.
      rank_template: the frozen deterministic rank tree of one task.
      embedding_rank_template: the frozen CodeRankEmbed rank tree of one task,
        consumed only by the metric stage's cache-checked E arm.
      derived: the declared derived-population record of the runtime-capped cohort.
      mapped: the admitted mapped localization manifest.
      published: the published embedding metric tree (the cache-check baseline).
      label_template: the admitted evaluator label artifact of one task.
      shard_size: the declared files per code shard.

    Returns:
      The declared `rank_q_<task>` target labels, in manifest order.
    """
    excluded = [entry["group"] for entry in exclusions]
    tasks = [row for row in analysis if len(row) > 3 and row[0] == "task"]
    surviving = [row for row in tasks if row[2] not in excluded]

    # The complete standalone Q ranking of one surviving task (`VAL-QWEN-002`).
    # The declared fixture set is the task's one hosted query fixture plus its
    # candidate world's hosted code shards; the frozen deterministic rank tree of
    # the same task is the declared universe witness. No label is a declared input.
    rank_targets = []
    for task in surviving:
        world = task[3]
        shards = [
            shard_template % (world, start // shard_size)
            for start in range(0, len(world_sources[world]), shard_size)
        ]
        native_study_stage(
            name = "rank_q_%s" % task[1],
            stage = "rank_q",
            srcs = stage_srcs,
            inputs = [rank_template % task[1]],
            input_names = ["deterministic"],
            world_sources = [query_fixture] + shards,
            tags = ["manual"],
        )
        rank_targets.append(":rank_q_%s" % task[1])

    # The one canonical metric table, the exact contrasts and the frozen overlap
    # (`VAL-QWEN-003`): a scoring consumer over the frozen rankings, the admitted
    # labels and the declared derived population. It reproduces the published P,
    # P+A and E cells as a cache check rather than recomputing the earlier arms.
    metric_inputs = [derived, mapped, published]
    metric_names = ["derived", "mapped", "published"]
    for task in tasks:
        metric_inputs.append(label_template % task[1])
        metric_names.append("label_%s" % task[1])
    for task in surviving:
        metric_inputs.append(rank_template % task[1])
        metric_names.append("deterministic_%s" % task[1])
        metric_inputs.append(embedding_rank_template % task[1])
        metric_names.append("embedding_%s" % task[1])
        metric_inputs.append(":rank_q_%s" % task[1])
        metric_names.append("qwen_%s" % task[1])
    native_study_stage(
        name = name,
        stage = "qwen_metrics",
        srcs = stage_srcs,
        inputs = metric_inputs,
        input_names = metric_names,
        tags = ["manual"],
    )
    return rank_targets

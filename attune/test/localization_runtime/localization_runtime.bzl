"""The runtime-capped localization cohort (`VAL-LOC-002`, `VAL-LOC-005`).

Owner-approved runtime cutoff, 2026-10-06. The original admitted panel
`attune-panel-2026-10-06` stays immutable: this package derives a smaller cohort
from it by excluding whole canonical repository groups whose world extraction was
still unfinished at the 22:44:04Z continuation start of the multi-hour post-fix
invocation. Only runtime/status excludes a group; no quality or outcome threshold
is applied, no fast revision is substituted, and the original freeze is not
rewritten.

The derived graph is deliberately tiny and downstream-only. It binds the existing
`//test/localization` world, Theory, issue and variant targets rather than
redeclaring them, so the warm deterministic upstream work is reused and no
extraction, Theory lowering or variant ranking is recomputed. It declares only
the two stages the cutoff actually changes: the one development-only policy
selection over the surviving development groups, and the four complete immutable
arm rankings of each surviving task. The declared stage source is the existing
`LocalizationStages.flix` compiled byte-identically; the stage identities and the
binding names are unchanged, so only new output trees and new actions appear.

The evaluator-label firewall is unchanged: the selection names only the surviving
development labels, one file at a time, and no ranking stage reads a label. The
metrics leaf is a separate scoring consumer that reads frozen rankings and
admitted labels and never writes, edits or reorders a ranking.
"""

load("//platform/build:native.bzl", "native_study_stage")

def _attune_declared_rows_impl(ctx):
    out = ctx.actions.declare_file(ctx.label.name + ".tsv")
    ctx.actions.write(out, "\n".join(ctx.attr.rows) + "\n")
    return [DefaultInfo(files = depset([out]))]

_attune_declared_rows = rule(
    implementation = _attune_declared_rows_impl,
    doc = """Materialize a small declared record set as one declared TSV file.

    The runtime-capped cohort's population record is generated from the admitted
    manifest's own world/group/task rows plus the declared exclusion decision, so
    the record cannot drift from the manifest and no second hand-authored
    population exists. The action writes exactly the declared rows; it decides
    nothing.
    """,
    attrs = {"rows": attr.string_list(mandatory = True)},
)

# The declared runtime cutoff. Each entry names one whole canonical repository
# group that the cutoff excludes, its split, its exact world and task identities,
# the status that triggered the exclusion and the runtime evidence recorded for
# it. The trigger is the group's world extraction being unfinished at the
# continuation start; the recorded runtime is the observed console elapsed, which
# is explicitly NOT claimed to be pure execution time.
RUNTIME_CAPPED_EXCLUSIONS = [
    {
        "group": "prettier",
        "split": "development",
        "worlds": "w38,w39,w40,w41",
        "tasks": "jlongster__prettier-101,jlongster__prettier-107,jlongster__prettier-113,jlongster__prettier-142",
        "status": "unfinished-at-continuation-start",
        "runtime": "w41 console elapsed 14148s; queue+execution+download, actual execution not separable",
        "reason": "world extraction unfinished at continuation start after the multi-hour post-fix run",
    },
    {
        "group": "lighthouse",
        "split": "final",
        "worlds": "w81,w82,w83,w84",
        "tasks": "googlechrome__lighthouse-10184,googlechrome__lighthouse-10189,googlechrome__lighthouse-10295,googlechrome__lighthouse-10460",
        "status": "unfinished-at-continuation-start",
        "runtime": "w84 actual runtime unknown; prior console elapsed 4147s not separable into execution vs queue vs download",
        "reason": "world extraction unfinished at continuation start after the multi-hour post-fix run",
    },
]

def localization_rows(analysis, kind):
    """The records of one declared kind in an admitted manifest."""
    return [row for row in analysis if len(row) > 0 and row[0] == kind]

def _excluded_names(exclusions):
    return [entry["group"] for entry in exclusions]

def _derived_population_rows(analysis, exclusions, expected_eligible):
    """The declared derived-population record of the runtime-capped cohort."""
    groups = localization_rows(analysis, "group")
    tasks = localization_rows(analysis, "task")
    worlds = localization_rows(analysis, "world")
    excluded = _excluded_names(exclusions)
    splits = {row[1]: row[2] for row in groups}
    world_group = {row[3]: row[2] for row in tasks}
    derived_groups = [row for row in groups if row[1] not in excluded]
    derived_worlds = [row for row in worlds if world_group.get(row[1], "") not in excluded]
    derived_tasks = [row for row in tasks if row[2] not in excluded]

    rows = [
        "bounds\tgroups\t%d" % len(derived_groups),
        "bounds\tworlds\t%d" % len(derived_worlds),
        "bounds\ttasks\t%d" % len(derived_tasks),
        "bounds\tdevelopment\t%d" % len([row for row in derived_tasks if splits.get(row[2], "") == "development"]),
        "bounds\tcalibration\t%d" % len([row for row in derived_tasks if splits.get(row[2], "") == "calibration"]),
        "bounds\tfinal\t%d" % len([row for row in derived_tasks if splits.get(row[2], "") == "final"]),
        "bounds\teligible-gold-tasks\t%d" % expected_eligible,
        "bounds\truntime-unavailable-tasks\t%d" % len([row for row in tasks if row[2] in excluded]),
    ]
    for row in derived_groups:
        group_worlds = ",".join(sorted([w[1] for w in derived_worlds if world_group.get(w[1], "") == row[1]]))
        rows.append("population\tgroup\t%s\t%s\t%s" % (row[1], row[2], group_worlds))
    for row in derived_tasks:
        rows.append("population\ttask\t%s\t%s\t%s\t%s" % (row[1], row[2], splits.get(row[2], ""), row[3]))
    for entry in exclusions:
        rows.append("excluded\t%s\t%s\t%s\t%s\t%s\t%s\t%s" % (
            entry["group"],
            entry["split"],
            entry["worlds"],
            entry["tasks"],
            entry["status"],
            entry["runtime"],
            entry["reason"],
        ))
    return rows

def attune_localization_runtime(
        name,
        analysis,
        stage_srcs,
        metric_srcs,
        java_deps,
        exclusions,
        expected_eligible,
        upstream_package = "//test/localization",
        label_package = "//test/study",
        manifest_package = "//test/study"):
    """Expand the runtime-capped cohort into the derived selection and rankings.

    Args:
      name: the graph name; it also names the derived-population record.
      analysis: the admitted mapped localization manifest records.
      stage_srcs: the explicit Flix sources the two derived stages compile; this
        is the existing stage source compiled byte-identically.
      metric_srcs: the explicit Flix sources of the metrics leaf.
      java_deps: the explicit dependency jars the derived stages compile against.
      exclusions: the declared runtime cutoff entries (group/split/worlds/tasks/
        status/runtime/reason).
      expected_eligible: the declared eligible-gold task count of the derived
        cohort, asserted by the metrics leaf against the computed population.
      upstream_package: the package holding the warm world/Theory/issue/variant
        targets this cohort binds rather than redeclares.
      label_package: the package holding the admitted evaluator label artifacts.
      manifest_package: the package holding the admitted mapped manifest.
    """
    excluded = _excluded_names(exclusions)
    groups = localization_rows(analysis, "group")
    tasks = localization_rows(analysis, "task")
    splits = {row[1]: row[2] for row in groups}
    derived_tasks = [row for row in tasks if row[2] not in excluded]
    development = [row for row in derived_tasks if splits.get(row[2], "") == "development"]

    _attune_declared_rows(
        name = name,
        rows = _derived_population_rows(analysis, exclusions, expected_eligible),
        tags = ["manual"],
    )

    # The one development-only selection over the surviving development groups:
    # it binds the warm variant rankings and the surviving development labels,
    # one file at a time. No calibration or final label is bound here.
    selection_inputs = []
    selection_names = []
    for task in development:
        selection_inputs.append("%s:rank_variants_%s" % (upstream_package, task[1]))
        selection_names.append("variant_%s" % task[1])
    for task in development:
        selection_inputs.append("%s:manifest/localization/label_%s.tsv" % (label_package, task[1]))
        selection_names.append("label_%s" % task[1])
    native_study_stage(
        name = "select_policy",
        stage = "select_policy",
        srcs = stage_srcs,
        inputs = selection_inputs,
        input_names = selection_names,
        java_deps = java_deps,
        tags = ["manual"],
    )

    # The four complete immutable arm rankings of each surviving task, under the
    # frozen selected policy. No label artifact is a declared input here.
    rank_targets = []
    for task in derived_tasks:
        task_id = task[1]
        world_id = task[3]
        native_study_stage(
            name = "rank_%s" % task_id,
            stage = "rank",
            srcs = stage_srcs,
            inputs = [
                "%s:world_extract_%s" % (upstream_package, world_id),
                "%s:theory_world_%s" % (upstream_package, world_id),
                "%s:issue_text" % upstream_package,
                ":select_policy",
            ],
            input_names = ["worldfacts", "witnesses", "issue", "selected"],
            java_deps = java_deps,
            tags = ["manual"],
        )
        rank_targets.append(":rank_%s" % task_id)

    # The metrics leaf: a separate scoring consumer over the frozen rankings, the
    # admitted labels and the declared derived population.
    metric_inputs = [
        ":" + name,
        "%s:manifest/localization/mapped.tsv" % manifest_package,
    ]
    metric_names = ["derived", "mapped"]
    for task in derived_tasks:
        metric_inputs.append(":rank_%s" % task[1])
        metric_names.append("rank_%s" % task[1])
    for task in tasks:
        metric_inputs.append("%s:manifest/localization/label_%s.tsv" % (label_package, task[1]))
        metric_names.append("label_%s" % task[1])
    native_study_stage(
        name = "metrics",
        stage = "localization_metrics",
        srcs = metric_srcs,
        inputs = metric_inputs,
        input_names = metric_names,
        tags = ["manual"],
    )

"""The declared real localization study graph (`VAL-LOC-002`).

The admitted mapped localization manifest (`//test/study:manifest/localization/mapped.bzl`,
emitted by the reference-label stage and admitted by the integration owner) is the
one declared authority for the real selected panel: its world rows name each
exact world's canonical repository and pinned revision, its group rows name each
group's split, and its task rows name each real task's group and world. This
macro expands that manifest into the complete real localization graph:

- `archives_prepare` turns the admitted verified export identities into the
  declared archive identity record the acquisition repository rule consumes.
- `issue_text` projects the whitelisted public `problem_statement` column of the
  same immutable pinned catalog, one bounded batch at a time, for exactly the
  selected tasks.
- `world_extract_<world>` materializes one exact world's earned Repository facts
  and index once, from the world's real declared clean-source bytes, through the
  shared `Attune.Repository` owner and the pinned native Grit engine.
- `theory_world_<world>` lowers that world's bounded descriptor population into
  its theory witnesses once, through the shared `Attune.Theory` owner.
- `rank_variants_<task>` ranks one task under the P+A arm for every member of the
  declared anchor-policy family; it reads no evaluator artifact.
- `select_policy` is the one development-only selection: it reads only the
  development split's variant rankings and development label artifacts and
  selects at most one declared policy.
- `rank_<task>` materializes the four complete immutable arm rankings of one task
  under the frozen selected policy; it reads no evaluator artifact at all.

Every target is `manual`, so the ordinary `bazel test //...` gate never fetches,
extracts or ranks the corpus. The evaluator labels stay a separate declared
population: `select_policy` names only the development labels, one file at a
time, and no ranking stage reads any label at all.
"""

load("//platform/build:native.bzl", "attune_declared_record_file", "native_flix_consumer_test", "native_study_stage")

def localization_rows(analysis, kind):
    """The records of one declared kind in an admitted manifest."""
    return [row for row in analysis if len(row) > 0 and row[0] == kind]

def _group_splits(analysis):
    return {row[1]: row[2] for row in localization_rows(analysis, "group")}

def attune_localization_study(
        name,
        analysis,
        stage_srcs,
        label_package,
        java_deps,
        grit_libs,
        law_srcs = [],
        manifest_package = "//test/study",
        world_repo = "@attune_worlds"):
    """Expand the admitted mapped localization manifest into the real graph.

    Args:
      name: the graph name; it also names the declared test suite.
      analysis: the admitted mapped localization manifest records.
      stage_srcs: the explicit Flix sources every declared stage compiles.
      label_package: the package holding the admitted evaluator label artifacts.
      java_deps: the explicit dependency jars every stage compiles against: the
        Arrow projection seam and the pinned Grit adapter, because the one stage
        dispatcher references both owners.
      grit_libs: the prepared pinned Grit shared library the extraction stage loads.
      law_srcs: the explicit Flix sources of the ranking-artifact law; when given,
        the macro also declares a consumer test over every produced ranking tree.
      manifest_package: the package holding the admitted verified export records.
      world_repo: the declared acquisition repository of the world archives.
    """
    worlds = localization_rows(analysis, "world")
    tasks = localization_rows(analysis, "task")
    splits = _group_splits(analysis)
    development = [task for task in tasks if splits.get(task[2], "") == "development"]
    world_targets = []
    rank_targets = []

    native_study_stage(
        name = "archives_prepare",
        stage = "archives_prepare",
        srcs = stage_srcs,
        inputs = [manifest_package + ":manifest/catalog/export_records.tsv"],
        input_names = ["exports"],
        java_deps = java_deps,
        tags = ["manual"],
    )

    native_study_stage(
        name = "issue_text",
        stage = "issue_text",
        srcs = stage_srcs,
        inputs = [
            "@swe_rebench_v2_catalog//file:file",
            manifest_package + ":manifest/catalog/panel_public.tsv",
        ],
        input_names = ["catalog", "panel"],
        java_deps = java_deps,
        tags = ["manual"],
    )

    for world in worlds:
        world_id = world[1]
        # The admitted manifest's own world row is the declared authority for this
        # node's world identity; the record is generated here rather than parsed
        # out of the target name, so the declaration can never drift from the
        # manifest.
        attune_declared_record_file(
            name = "worlddecl_%s" % world_id,
            kind = "world",
            fields = [world_id],
        )
        native_study_stage(
            name = "world_extract_%s" % world_id,
            stage = "world_extract",
            srcs = stage_srcs,
            inputs = [":worlddecl_%s" % world_id],
            input_names = ["world"],
            world_sources = ["%s//:%s" % (world_repo, world_id)],
            java_deps = java_deps,
            native_libs = grit_libs,
            tags = ["manual"],
        )
        native_study_stage(
            name = "theory_world_%s" % world_id,
            stage = "theory_world",
            srcs = stage_srcs,
            inputs = [":world_extract_%s" % world_id, ":worlddecl_%s" % world_id],
            input_names = ["worldfacts", "world"],
            java_deps = java_deps,
            tags = ["manual"],
        )
        world_targets.append(":world_extract_%s" % world_id)

    for task in tasks:
        task_id = task[1]
        world_id = task[3]
        native_study_stage(
            name = "rank_variants_%s" % task_id,
            stage = "rank_variants",
            srcs = stage_srcs,
            inputs = [
                ":world_extract_%s" % world_id,
                ":theory_world_%s" % world_id,
                ":issue_text",
            ],
            input_names = ["worldfacts", "witnesses", "issue"],
            java_deps = java_deps,
            tags = ["manual"],
        )

    selection_inputs = []
    selection_names = []
    for task in development:
        task_id = task[1]
        selection_inputs.append(":rank_variants_%s" % task_id)
        selection_names.append("variant_%s" % task_id)
    for task in development:
        task_id = task[1]
        selection_inputs.append("%s:manifest/localization/label_%s.tsv" % (label_package, task_id))
        selection_names.append("label_%s" % task_id)
    native_study_stage(
        name = "select_policy",
        stage = "select_policy",
        srcs = stage_srcs,
        inputs = selection_inputs,
        input_names = selection_names,
        java_deps = java_deps,
        tags = ["manual"],
    )

    for task in tasks:
        task_id = task[1]
        world_id = task[3]
        native_study_stage(
            name = "rank_%s" % task_id,
            stage = "rank",
            srcs = stage_srcs,
            inputs = [
                ":world_extract_%s" % world_id,
                ":theory_world_%s" % world_id,
                ":issue_text",
                ":select_policy",
            ],
            input_names = ["worldfacts", "witnesses", "issue", "selected"],
            java_deps = java_deps,
            tags = ["manual"],
        )
        rank_targets.append(":rank_%s" % task_id)

    if law_srcs:
        # The ranking-artifact law consumes every produced ranking tree, the one
        # selection tree and every world's materialized candidate inventory, so
        # the audit is over the real materialized bytes rather than a declaration.
        native_flix_consumer_test(
            name = "ranking_artifact_test",
            srcs = law_srcs,
            produced = world_targets + rank_targets + [":select_policy"],
            declared_files = [manifest_package + ":manifest/localization/mapped.tsv"],
            tags = ["manual"],
        )

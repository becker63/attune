"""The one tiny declarative study graph.

The admitted analysis manifest is a bounded, gold-free, deterministic record set
that native preparation emitted to a declared output and the integration owner
admitted back into the workspace. This macro expands that manifest into the
complete world/task/pair fan-out at analysis time: each exact world materializes
its source, facts/index and bounded theory shards once, and each task and pair
consumes those already-materialized trees through cheap joins. No target is
discovered at execution time and no nested Bazel loop or scheduler exists.

The macro also refuses to expand an out-of-bound manifest. The declared caps
(`<=24` groups, `<=4` tasks per group, `<=32` ordered pairs across `<=8` included
groups, `<=256` candidate descriptors, `<=8` shards per world) are enforced here
and reported by the preparation, not silently truncated at load time.

Dependency directions the wiring makes explicit:

- `world_facts_<world>` consumes only its own world source tree and declared
  facts; it has no task, prediction or evaluator dependency.
- `theory_shard_<world>_<n>` consumes the shared world facts and its descriptor
  shard; it is materialized once per world.
- `task_join_<task>` consumes the shared shard witnesses and one application
  anchor; it re-lowers nothing.
- `prediction_<task>` consumes the joined context and the shared world index; it
  never consumes a reference patch, a test patch or an outcome.
- `check_<pair>_<branch>` (baseline/A/B) is independent and speculative: it
  consumes only its own immutable variant tree.
- `joint_<pair>_<environment>` consumes the AB variant tree plus the two frozen
  pair predictions. It deliberately depends on no individual check, so a
  successful A or B result is never a prerequisite for joint dispatch.
"""

load(
    "//platform/build:native.bzl",
    "attune_source_tree",
    "native_flix_consumer_test",
    "native_study_stage",
)

def _label(package, path):
    return "//%s:%s" % (package, path)

def _rows(analysis, kind):
    return [row for row in analysis if len(row) > 0 and row[0] == kind]

_DEFAULT_CAPS = {
    "candidates": 256,
    "groups": 24,
    "pair_groups": 8,
    "pairs": 32,
    "shard_size": 32,
    "shards_per_world": 8,
    "tasks_per_group": 4,
}

def _bounds(analysis):
    caps = dict(_DEFAULT_CAPS)
    caps.update({row[1]: int(row[2]) for row in _rows(analysis, "bounds")})
    return caps

def _world_shards(shards, world):
    return [shard for shard in shards if shard[1] == world]

def _enforce_bounds(name, analysis, bounds):
    if not analysis:
        return
    exceeded = _rows(analysis, "exceeded")
    if exceeded:
        fail("%s: admitted manifest reports exceeded bounds: %s" % (name, exceeded))

    groups = _rows(analysis, "group")
    tasks = _rows(analysis, "task")
    pairs = _rows(analysis, "pair")
    if len(groups) > bounds["groups"]:
        fail("%s: admitted manifest has %d groups, over the declared %d" % (name, len(groups), bounds["groups"]))
    if len(tasks) > bounds["groups"] * bounds["tasks_per_group"]:
        fail("%s: admitted manifest has %d tasks, over the declared %d" % (
            name,
            len(tasks),
            bounds["groups"] * bounds["tasks_per_group"],
        ))
    if len(pairs) > bounds["pairs"]:
        fail("%s: admitted manifest has %d pairs, over the declared %d" % (name, len(pairs), bounds["pairs"]))
    pair_groups = len({pair[2]: True for pair in pairs})
    if pair_groups > bounds["pair_groups"]:
        fail("%s: admitted manifest spans %d pair groups, over the declared %d" % (
            name,
            pair_groups,
            bounds["pair_groups"],
        ))

def attune_study(
        name,
        analysis,
        stage_srcs,
        law_srcs,
        variant_files,
        task_fixtures,
        plan,
        package = None):
    """Expand the admitted analysis manifest into the complete study graph.

    Args:
      name: the graph name; it also names the two declared study suites.
      analysis: the admitted manifest records, loaded from `manifest.bzl`.
      stage_srcs: the explicit Flix sources every declared stage compiles.
      law_srcs: the explicit Flix law source for each declared consumer test.
      variant_files: the package-relative baseline/A/B/AB variant source files.
      task_fixtures: the package-relative directory holding one anchor per task.
      plan: the package-relative declared obligation plan.
      package: the calling package; defaults to the current package.
    """
    package = package or native.package_name()
    bounds = _bounds(analysis)
    _enforce_bounds(name, analysis, bounds)

    worlds = _rows(analysis, "world")
    shards = _rows(analysis, "shard")
    tasks = _rows(analysis, "task")
    pairs = _rows(analysis, "pair")
    produced = []

    for world in worlds:
        world_id = world[1]
        attune_source_tree(
            name = "world_source_%s" % world_id,
            srcs = [_label(package, world[5])],
        )
        native_study_stage(
            name = "world_facts_%s" % world_id,
            stage = "world_facts",
            srcs = stage_srcs,
            inputs = [":world_source_%s" % world_id, _label(package, world[6])],
            input_names = ["source", "facts"],
        )
        produced.append(":world_facts_%s" % world_id)
        for shard in _world_shards(shards, world_id):
            native_study_stage(
                name = "theory_shard_%s_%s" % (world_id, shard[2]),
                stage = "theory_shard",
                srcs = stage_srcs,
                inputs = [":world_facts_%s" % world_id, _label(package, world[7])],
                input_names = ["worldfacts", "descriptors"],
            )
            produced.append(":theory_shard_%s_%s" % (world_id, shard[2]))

    for task in tasks:
        task_id = task[1]
        world_id = task[3]
        witness_labels = [
            ":theory_shard_%s_%s" % (world_id, shard[2])
            for shard in _world_shards(shards, world_id)
        ]
        witness_names = ["witnesses%d" % index for index in range(len(witness_labels))]
        native_study_stage(
            name = "task_join_%s" % task_id,
            stage = "task_join",
            srcs = stage_srcs,
            inputs = witness_labels + [_label(package, "%s/%s.tsv" % (task_fixtures, task_id))],
            input_names = witness_names + ["task"],
        )
        produced.append(":task_join_%s" % task_id)
        native_study_stage(
            name = "prediction_%s" % task_id,
            stage = "prediction",
            srcs = stage_srcs,
            inputs = [":task_join_%s" % task_id, ":world_facts_%s" % world_id],
            input_names = ["join", "index"],
        )
        produced.append(":prediction_%s" % task_id)

    for pair in pairs:
        pair_id = pair[1]
        first = pair[3]
        second = pair[4]
        for variant, path in variant_files.items():
            attune_source_tree(
                name = "variant_%s_%s" % (pair_id, variant),
                srcs = [_label(package, path)],
            )
        native_study_stage(
            name = "check_%s_baseline" % pair_id,
            stage = "check",
            srcs = stage_srcs,
            inputs = [":variant_%s_baseline" % pair_id, _label(package, plan)],
            input_names = ["variant", "plan"],
        )
        native_study_stage(
            name = "check_%s_ownA" % pair_id,
            stage = "check",
            srcs = stage_srcs,
            inputs = [":variant_%s_a" % pair_id, _label(package, plan)],
            input_names = ["variant", "plan"],
        )
        native_study_stage(
            name = "check_%s_ownB" % pair_id,
            stage = "check",
            srcs = stage_srcs,
            inputs = [":variant_%s_b" % pair_id, _label(package, plan)],
            input_names = ["variant", "plan"],
        )
        for environment in ["ownA", "ownB"]:
            native_study_stage(
                name = "joint_%s_%s" % (pair_id, environment),
                stage = "joint",
                srcs = stage_srcs,
                inputs = [
                    ":variant_%s_ab" % pair_id,
                    _label(package, plan),
                    ":prediction_%s" % first,
                    ":prediction_%s" % second,
                ],
                input_names = ["variant", "plan", "predictionA", "predictionB"],
            )
        produced.append(":check_%s_baseline" % pair_id)
        produced.append(":check_%s_ownA" % pair_id)
        produced.append(":check_%s_ownB" % pair_id)
        produced.append(":joint_%s_ownA" % pair_id)
        produced.append(":joint_%s_ownB" % pair_id)

    native_flix_consumer_test(
        name = "manifest_test",
        srcs = [law_srcs["manifest_test"]],
        produced = [":analysis_prepare"],
        declared_files = ["manifest/analysis.tsv"],
        tags = ["manual"],
    )
    native_flix_consumer_test(
        name = "bounds_test",
        srcs = [law_srcs["bounds_test"]],
        produced = [":analysis_prepare_overflow"],
        declared_files = ["manifest/panel_overflow.tsv"],
        tags = ["manual"],
    )
    native_flix_consumer_test(
        name = "dag_test",
        srcs = [law_srcs["dag_test"]],
        produced = produced,
        tags = ["manual"],
    )

    native.test_suite(
        name = "remote_fixture",
        tests = [
            ":manifest_test",
            ":dag_test",
        ],
    )
    native.test_suite(
        name = "all",
        tests = [
            ":bounds_test",
            ":dag_test",
            ":manifest_test",
        ],
    )

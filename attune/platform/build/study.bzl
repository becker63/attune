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
groups, `<=256` candidate descriptors, `<=8` shards per world of `<=32`
descriptors) are enforced here, and a manifest that still carries a `truncated`
or `exceeded` finding is refused rather than admitted: the preparation reports
clipping explicitly, so an admitted manifest must be clean. Only the declared
record kinds are admitted.

Dependency directions the wiring makes explicit:

- `world_facts_<world>` consumes only its own world source tree and declared
  facts; it has no task, prediction or evaluator dependency.
- `theory_shard_<world>_<n>` consumes the shared world facts, its descriptor shard
  and one generated record of its own declared index and count, so the node
  lowers exactly its own bounded slice; it is materialized once per world.
- `task_join_<task>` consumes the shared shard witnesses and one application
  anchor; it re-lowers nothing.
- `prediction_<task>` consumes the joined context and the shared world index; it
  never consumes a reference patch, a test patch or an outcome.
- `reduce_<task>` is the declared evaluator join: it consumes the frozen
  prediction tree and one separately declared label artifact, and nothing else.
  The label is a distinct declared input, so a gold-only change can invalidate
  only this join, never the prediction it reads. A legal empty prediction or
  empty eligible label is a typed empty result, not a failed action.
- `check_<pair>_<branch>` (baseline/A/B) is independent and speculative: it
  consumes only its own immutable variant tree, its declared obligation plan and
  its declared bounded argv receipt plan, which the launcher executes through the
  mechanical process-receipt boundary before the law reduces the real receipts.
- `joint_<pair>_<environment>` consumes the AB variant tree, the obligation plan,
  the receipt plan and the two frozen pair predictions. It depends on no
  individual check, so a successful A or B result is never a prerequisite for
  joint dispatch, and it runs under each original environment.
- `results` is the one Flix reducer: it consumes every frozen reduction and every
  measured branch tree, materializes the declared Parquet artifact through the
  typed Arrow seam and renders the bounded ASCII report.
"""

load(
    "//platform/build:native.bzl",
    "attune_source_tree",
    "native_flix_anchor_file",
    "native_flix_consumer_test",
    "native_flix_shard_file",
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

# The declared record kinds an admitted manifest may carry. A record outside this
# vocabulary is not a bounded analysis input, so the admission refuses it rather
# than letting an unknown row reach the graph. `truncated` and `exceeded` are
# deliberately absent: the preparation reports clipping with `truncated`, so an
# admitted manifest that carries either kind was not cleanly admitted.
_SAFE_KINDS = {
    "generation": 2,
    "bounds": 3,
    "world": 8,
    "group": 4,
    "shard": 4,
    "task": 6,
    "pair": 6,
    "descriptors": 3,
}

def _bounds(analysis):
    caps = dict(_DEFAULT_CAPS)
    caps.update({row[1]: int(row[2]) for row in _rows(analysis, "bounds")})
    return caps

def _world_shards(shards, world):
    return [shard for shard in shards if shard[1] == world]

def _bound_violations(name, analysis, bounds):
    """Return the exact bound violations of one admitted manifest, without failing.

    The preparation emits `truncated` findings for anything it clipped and never
    an `exceeded` row, so an admitted manifest that carries either kind was not
    cleanly admitted and is refused. The same contract then checks the declared
    per-group task, world candidate, pair and world-shard bounds, so no manifest
    can reach the analysis graph over any of them. Returning the violations
    (rather than failing) lets the bounded admission regression exercise the
    exact production predicate on a declared over-bound record set.
    """
    violations = []
    for row in analysis:
        if not row:
            violations.append("empty record")
            continue
        kind = row[0]
        if kind in ("truncated", "exceeded"):
            violations.append("admitted manifest reports %s bounds: %s" % (kind, row))
            continue
        required = _SAFE_KINDS.get(kind)
        if required == None:
            violations.append("record kind %r is outside the safe manifest vocabulary" % kind)
        elif len(row) < required:
            violations.append("record kind %r has %d fields, fewer than the declared %d" % (
                kind,
                len(row),
                required,
            ))
    if violations:
        return violations

    groups = _rows(analysis, "group")
    tasks = _rows(analysis, "task")
    pairs = _rows(analysis, "pair")
    shards = _rows(analysis, "shard")

    if len(groups) > bounds["groups"]:
        violations.append("admitted manifest has %d groups, over the declared %d" % (
            len(groups),
            bounds["groups"],
        ))
    for group in groups:
        owned = [task for task in tasks if task[2] == group[1]]
        if len(owned) > bounds["tasks_per_group"]:
            violations.append("group %s has %d tasks, over the declared %d" % (
                group[1],
                len(owned),
                bounds["tasks_per_group"],
            ))

    # The admitted candidate population is exactly the descriptors the shard
    # rows materialize: the manifest carries shards, not a second descriptor
    # count, so this is the one honest denominator.
    candidates = 0
    for shard in shards:
        candidates += int(shard[3])
    if candidates > bounds["candidates"]:
        violations.append("admitted manifest declares %d candidate descriptors, over the declared %d" % (
            candidates,
            bounds["candidates"],
        ))
    if len(pairs) > bounds["pairs"]:
        violations.append("admitted manifest has %d pairs, over the declared %d" % (
            len(pairs),
            bounds["pairs"],
        ))
    pair_groups = len({pair[2]: True for pair in pairs})
    if pair_groups > bounds["pair_groups"]:
        violations.append("admitted manifest spans %d pair groups, over the declared %d" % (
            pair_groups,
            bounds["pair_groups"],
        ))
    for world in sorted({shard[1]: True for shard in shards}.keys()):
        owned = [shard for shard in shards if shard[1] == world]
        if len(owned) > bounds["shards_per_world"]:
            violations.append("world %s has %d shards, over the declared %d" % (
                world,
                len(owned),
                bounds["shards_per_world"],
            ))
        for shard in owned:
            if int(shard[3]) > bounds["shard_size"]:
                violations.append("world %s shard %s has %d descriptors, over the declared %d" % (
                    world,
                    shard[2],
                    int(shard[3]),
                    bounds["shard_size"],
                ))
    return violations

def _enforce_bounds(name, analysis, bounds):
    if not analysis:
        return
    violations = _bound_violations(name, analysis, bounds)
    if violations:
        fail("%s: admitted manifest violates its declared bounds:\n  %s" % (
            name,
            "\n  ".join(violations),
        ))

_ADMISSION_STRICT = "attune_admission_strict"

def _admission_probe_impl(ctx):
    analysis = [row.split("\t") for row in ctx.attr.rows]
    bounds = _bounds(analysis)
    violations = _bound_violations(ctx.label.name, analysis, bounds)
    out = ctx.actions.declare_file(ctx.label.name + ".txt")
    ctx.actions.write(out, "".join([violation + "\n" for violation in violations]))
    if violations and ctx.var.get(_ADMISSION_STRICT, "") == "1":
        fail("%s: admitted manifest violates its declared bounds:\n  %s" % (
            ctx.label.name,
            "\n  ".join(violations),
        ))
    return [DefaultInfo(files = depset([out]))]

attune_admission_probe = rule(
    implementation = _admission_probe_impl,
    doc = """Exercise the production admission predicate over a declared record set.

    This is the one bounded macro-admission regression, not a validation
    framework. It runs the exact `_bound_violations` contract the study macro
    enforces, over the declared `rows`, and writes the violations it found. Under
    `--define=attune_admission_strict=1` it also fails, so a controlled fixture
    invocation can prove that a truncated row and each over-bound declaration are
    refused in analysis. Without the define it only records, so the target can
    never break the ordinary offline gate.
    """,
    attrs = {
        "rows": attr.string_list(mandatory = True),
    },
)

def attune_study(
        name,
        analysis,
        stage_srcs,
        result_srcs,
        law_srcs,
        variant_files,
        branch_plans,
        label_fixtures,
        plan,
        parquet_deps = [],
        package = None):
    """Expand the admitted analysis manifest into the complete study graph.

    Args:
      name: the graph name; it also names the two declared study suites.
      analysis: the admitted manifest records, loaded from `manifest.bzl`.
      stage_srcs: the explicit Flix sources every declared stage compiles.
      result_srcs: the explicit Flix sources of the Parquet/ASCII result reducer.
      law_srcs: the explicit Flix law source for each declared consumer test.
      variant_files: the package-relative baseline/A/B/AB variant source files.
      branch_plans: the package-relative bounded argv receipt plan for each
        measured branch (`baseline`/`a`/`b`/`ab`).
      label_fixtures: the package-relative directory holding one evaluator label
        artifact per task, joined to the frozen prediction only by `reduce_<task>`.
      plan: the package-relative declared obligation plan.
      parquet_deps: the explicit dependency jars the result reducer compiles against.
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
    reduced = []
    branches = []

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
            # The admitted manifest's own shard row is the declared authority for
            # this node's index: the record is generated here rather than parsed
            # out of the target name, so the node lowers exactly its own bounded
            # slice and the declaration can never drift from the manifest.
            native_flix_shard_file(
                name = "shard_%s_%s" % (world_id, shard[2]),
                world = world_id,
                index = shard[2],
                count = shard[3],
            )
            native_study_stage(
                name = "theory_shard_%s_%s" % (world_id, shard[2]),
                stage = "theory_shard",
                srcs = stage_srcs,
                inputs = [
                    ":world_facts_%s" % world_id,
                    _label(package, world[7]),
                    ":shard_%s_%s" % (world_id, shard[2]),
                ],
                input_names = ["worldfacts", "descriptors", "shard"],
            )
            produced.append(":theory_shard_%s_%s" % (world_id, shard[2]))

    for task in tasks:
        task_id = task[1]
        world_id = task[3]

        # The admitted manifest is the one declared authority for this task's
        # anchor token; its anchor record is generated here rather than
        # hand-authored a second time, so the two can never drift.
        native_flix_anchor_file(
            name = "anchor_%s" % task_id,
            token = task[5],
        )
        witness_labels = [
            ":theory_shard_%s_%s" % (world_id, shard[2])
            for shard in _world_shards(shards, world_id)
        ]
        witness_names = ["witnesses%d" % index for index in range(len(witness_labels))]
        native_study_stage(
            name = "task_join_%s" % task_id,
            stage = "task_join",
            srcs = stage_srcs,
            inputs = witness_labels + [":anchor_%s" % task_id],
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
        native_study_stage(
            name = "reduce_%s" % task_id,
            stage = "reduce",
            srcs = stage_srcs,
            inputs = [
                ":prediction_%s" % task_id,
                _label(package, "%s/label_%s.tsv" % (label_fixtures, task_id)),
            ],
            input_names = ["prediction", "reference"],
        )
        produced.append(":reduce_%s" % task_id)
        reduced.append(":reduce_%s" % task_id)

    for pair in pairs:
        pair_id = pair[1]
        first = pair[3]
        second = pair[4]
        for variant, path in variant_files.items():
            attune_source_tree(
                name = "variant_%s_%s" % (pair_id, variant),
                srcs = [_label(package, path)],
            )
        for branch, variant, plan_key in [
            ("baseline", "baseline", "baseline"),
            ("ownA", "a", "a"),
            ("ownB", "b", "b"),
        ]:
            native_study_stage(
                name = "check_%s_%s" % (pair_id, branch),
                stage = "check",
                srcs = stage_srcs,
                inputs = [":variant_%s_%s" % (pair_id, variant), _label(package, plan)],
                input_names = ["variant", "plan"],
                receipt_plan = _label(package, branch_plans[plan_key]),
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
                receipt_plan = _label(package, branch_plans["ab"]),
            )
        produced.append(":check_%s_baseline" % pair_id)
        produced.append(":check_%s_ownA" % pair_id)
        produced.append(":check_%s_ownB" % pair_id)
        produced.append(":joint_%s_ownA" % pair_id)
        produced.append(":joint_%s_ownB" % pair_id)
        branches.append(":check_%s_baseline" % pair_id)
        branches.append(":check_%s_ownA" % pair_id)
        branches.append(":check_%s_ownB" % pair_id)
        branches.append(":joint_%s_ownA" % pair_id)
        branches.append(":joint_%s_ownB" % pair_id)

    # The one Flix reducer: it consumes every frozen per-task reduction and every
    # measured branch tree and materializes the declared Parquet artifact and the
    # bounded ASCII report. It creates no truth; it re-states the already
    # materialized fixture rows through the Arrow seam and the one writer.
    result_inputs = reduced + branches
    result_names = [label.split(":")[1] for label in result_inputs]
    native_study_stage(
        name = "results",
        stage = "results",
        srcs = result_srcs,
        inputs = result_inputs,
        input_names = result_names,
        java_deps = parquet_deps,
    )
    produced.append(":results")

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
    native_flix_consumer_test(
        name = "firewall_test",
        srcs = [law_srcs["firewall_test"]],
        produced = produced,
        tags = ["manual"],
    )
    native_flix_consumer_test(
        name = "results_test",
        srcs = [law_srcs["results_test"]],
        produced = [":results"],
        tags = ["manual"],
    )

    native.test_suite(
        name = "remote_fixture",
        tests = [
            ":manifest_test",
            ":dag_test",
            ":firewall_test",
            ":results_test",
        ],
        tags = ["manual"],
    )
    native.test_suite(
        name = "all",
        tests = [
            ":bounds_test",
            ":dag_test",
            ":firewall_test",
            ":manifest_test",
            ":results_test",
        ],
        tags = ["manual"],
    )

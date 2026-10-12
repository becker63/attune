"""The declared embedding producer: the remote BuildBuddy inference actions.

Owner-approved POST-HOC EXPLORATORY EMBEDDING extension (2026-10-07). ALL
embedding inference runs REMOTELY on BuildBuddy RBE (owner: "actually this
should just run in rbe") — never host-local, never a hosted embedding API. This
Starlark rule is the mechanical declared producer: it resolves a declared rows
manifest (either derived from declared inputs here, or produced by the
Study-owned embedding stage), runs the minimal inference adapter
(`//platform/tools/embedding:adapter.py`) with the pinned runtime on the action
PATH's CPython, and materializes one declared vector fixture file plus its
report.

It carries no scientific policy. The model, tokenizer and runtime bytes are
declared digest-pinned inputs (`//platform/embedding:runtime-lock.tsv`); the
recipe constants (query prefix, context, truncation, pooling) are declared
attributes, so a recipe change is a declared input change. The logical fixture
identity (model revision, recipe, exact input bytes) travels on every emitted
row; the vector payload is data, never identity.
"""

def _world_relative(path, world):
    marker = "/worlds/" + world + "/"
    if marker not in path:
        fail("declared world source %r is not under world %s" % (path, world))
    tail = path.split(marker, 1)[1]
    parts = tail.split("/", 1)
    if len(parts) != 2:
        fail("declared world source %r carries no repository-relative path" % path)
    return parts[1]

def _impl(ctx):
    out = ctx.actions.declare_file(ctx.label.name + ".tsv")
    report = ctx.actions.declare_file(ctx.label.name + ".report.json")

    model_files = ctx.files.model
    model_roots = [
        file
        for file in model_files
        if file.basename == "config.json" and file.dirname.split("/")[-1] == "model"
    ]
    if len(model_roots) != 1:
        fail("expected exactly one declared model root config.json, found %d" % len(model_roots))
    site_packages = ctx.file.runtime_marker.dirname

    inputs = [ctx.file.adapter, ctx.file.runtime_marker] + model_files
    prior_args = []
    for prior in ctx.files.prior:
        # Only the vector fixture rows carry logical identities; the sibling
        # report is deliberately not an input, so a report-format edit can never
        # invalidate the memo.
        if not prior.basename.endswith(".tsv"):
            continue
        inputs.append(prior)
        prior_args.extend(["--prior", prior.path])
    if ctx.file.rows_tree:
        rows_path = ctx.file.rows_tree.path + "/" + ctx.attr.rows_name
        text_root = ctx.file.rows_tree.path
        inputs.append(ctx.file.rows_tree)
    else:
        if not (len(ctx.attr.keys) == len(ctx.attr.sides) and
                len(ctx.attr.keys) == len(ctx.attr.paths)):
            fail("embedding fixture metadata must align with its declared rows")
        text_files = []
        if ctx.attr.world:
            index = {}
            for file in ctx.files.texts:
                index[_world_relative(file.path, ctx.attr.world)] = file
            for path in ctx.attr.paths:
                if path not in index:
                    fail("declared world source %r is absent from the materialized tree" % path)
                text_files.append(index[path])
        else:
            if len(ctx.files.texts) != len(ctx.attr.paths):
                fail("embedding fixture text inputs must align with its declared paths")
            text_files = ctx.files.texts

        rows = ctx.actions.declare_file(ctx.label.name + ".rows.tsv")
        lines = []
        for i in range(len(ctx.attr.paths)):
            lines.append("\t".join([
                ctx.attr.keys[i],
                ctx.attr.sides[i],
                ctx.attr.paths[i],
                text_files[i].path,
            ]))
        ctx.actions.write(rows, "\n".join(lines) + "\n")
        rows_path = rows.path
        text_root = ""
        inputs.append(rows)
        inputs.extend(text_files)

    ctx.actions.run(
        executable = ctx.attr.python,
        arguments = [
            ctx.file.adapter.path,
            "--model-dir",
            model_roots[0].dirname,
            "--rows",
            rows_path,
            "--out",
            out.path,
            "--report",
            report.path,
            "--text-root",
            text_root,
            "--model-revision",
            ctx.attr.model_revision,
            "--recipe",
            ctx.attr.recipe,
            "--query-prefix",
            ctx.attr.query_prefix,
            "--max-length",
            str(ctx.attr.max_length),
            "--pooling",
            ctx.attr.pooling,
        ] + prior_args,
        inputs = depset(inputs, transitive = [ctx.attr.runtime.files]),
        outputs = [out, report],
        env = {
            "PYTHONPATH": site_packages,
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "PYTHONDONTWRITEBYTECODE": "1",
        },
        mnemonic = "AttuneEmbed",
        progress_message = "Pinned CodeRankEmbed inference for %s" % ctx.label,
        use_default_shell_env = False,
    )
    return [DefaultInfo(files = depset([out, report]))]

attune_embedding_fixture = rule(
    implementation = _impl,
    doc = """Run the pinned CodeRankEmbed adapter over declared text inputs.

    Three declared modes, exactly one of which applies:

    * `rows_tree` names a Study-owned stage tree carrying the declared rows
      manifest `rows_name`; the manifest is followed verbatim.
    * `world` names one exact world and `paths` names that world's declared
      repository-relative source paths; the rule selects exactly those files from
      the materialized world tree and embeds them as code rows.
    * otherwise `texts` names the declared input files directly and
      `keys`/`sides`/`paths` are their aligned per-row metadata.

    Every mode emits one vector TSV (`<name>.tsv`) and one report JSON
    (`<name>.report.json`).
    """,
    attrs = {
        "adapter": attr.label(allow_single_file = True, mandatory = True),
        "model": attr.label(mandatory = True),
        "runtime": attr.label(mandatory = True),
        "runtime_marker": attr.label(allow_single_file = True, mandatory = True),
        "texts": attr.label_list(allow_files = True),
        "keys": attr.string_list(),
        "sides": attr.string_list(),
        "paths": attr.string_list(),
        "world": attr.string(default = ""),
        "rows_tree": attr.label(allow_single_file = True),
        "rows_name": attr.string(default = "rows.tsv"),
        "python": attr.string(default = "/usr/bin/python3"),
        "model_revision": attr.string(mandatory = True),
        "recipe": attr.string(mandatory = True),
        "query_prefix": attr.string(mandatory = True),
        "max_length": attr.int(mandatory = True),
        "pooling": attr.string(default = "cls"),
        "prior": attr.label_list(
            allow_files = True,
            doc = """Declared prior fixture TSVs whose logical rows are reused.

            The logical key is `(model revision, recipe, exact embedded input
            bytes)`; a row whose key is declared by a prior fixture is copied
            verbatim and never re-inferred, while a row whose key is new is
            inferred. The prior fixture is an ordinary declared input, so the
            memo is a function of declared bytes rather than a hidden mutable
            action cache.
            """,
        ),
    },
)

def _task_list_impl(ctx):
    out = ctx.actions.declare_file(ctx.label.name + ".tsv")
    ctx.actions.write(out, "\n".join(ctx.attr.tasks) + "\n")
    return [DefaultInfo(files = depset([out]))]

attune_embedding_task_list = rule(
    implementation = _task_list_impl,
    doc = """Materialize the declared surviving-task list as one record file.

    The list is derived from the same admitted manifest the cohort macro consumes,
    so the query population cannot drift from the deterministic cohort it
    extends. The rule writes exactly the declared identities and decides nothing.
    """,
    attrs = {"tasks": attr.string_list(mandatory = True)},
)

# The admitted source extensions. On every world whose `world_extract` inventory
# is materialized this reduction is byte-identical to that world's own declared
# `sources.tsv` (see `//test/embedding:world_sources.bzl`), so the fixture
# population is the frozen candidate inventory rather than an approximation.
CODE_EXTENSIONS = ["js", "jsx", "ts", "tsx", "mjs", "cjs"]

def attune_embedding_code_fixtures(
        name,
        world_sources,
        world_repo,
        shard_size = 32,
        **kwargs):
    """Expand each surviving world's declared source inventory into shard targets.

    `world_sources` is the admitted `{world: [path, ...]}` inventory record; each
    world is emitted as one `attune_embedding_fixture` target per `shard_size`
    declared source files. The filegroup `world_repo//:<world>` supplies the exact
    source bytes; the rule selects the declared shard's paths from it.

    Args:
      name: the target-name prefix for the shard targets.
      world_sources: the admitted per-world source inventory.
      world_repo: the declared acquisition repository of the world archives.
      shard_size: the declared files per shard.
      **kwargs: forwarded to every generated rule.
    """
    targets = []
    for world in sorted(world_sources.keys()):
        paths = world_sources[world]
        for start in range(0, len(paths), shard_size):
            shard = paths[start:start + shard_size]
            shard_id = "%s_%s_%d" % (name, world, start // shard_size)
            attune_embedding_fixture(
                name = shard_id,
                texts = ["%s//:%s" % (world_repo, world)],
                keys = shard,
                sides = ["code" for _ in shard],
                paths = shard,
                world = world,
                **kwargs
            )
            targets.append(":" + shard_id)
    native.filegroup(
        name = name + "_all",
        srcs = targets,
    )

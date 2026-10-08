"""The declared Sol localization arm's mechanical Starlark producers.

Owner-authorized standalone Sol scientific arm (`library/sol-medium.md`, binding).
Nothing here is a Factory worker route: these rules expand the frozen
runtime-capped cohort into one declared remote action per task, each running the
mechanical Java app-server driver (`//platform/tools/sol:sol_driver`) against the
pinned Codex 0.160.1 binary on the dedicated BuildBuddy RBE platform.

The task expansion decides nothing scientific. The prompt bytes, the public
issue text and the clean world source are declared inputs; the driver emits one
sanitized receipt per task and the raw structured result, and the downstream
Flix owners validate and rank. The arm is a strictly downstream consumer: it
redeclares no world extraction, Theory lowering, variant ranking or selection,
and it reads no evaluator artifact at all.
"""

load("@rules_java//java/common:java_info.bzl", "JavaInfo")

_LOCALE_ENV = {
    "LANG": "C.UTF-8",
    "LC_ALL": "C.UTF-8",
}

def _classpath(deps):
    return depset(transitive = [dependency[JavaInfo].transitive_runtime_jars for dependency in deps]).to_list()

def _driver_arguments(deps, mode, extra):
    classpath = _classpath(deps)
    arguments = ["-cp", ":".join([jar.path for jar in classpath]), "attune.tools.sol.SolLocalizeDriver",
                 "--mode", mode]
    arguments.extend(extra)
    return classpath, arguments

def _sol_route_check_impl(ctx):
    runtime = ctx.toolchains["@bazel_tools//tools/jdk:runtime_toolchain_type"].java_runtime
    out = ctx.actions.declare_file(ctx.label.name + ".json")
    classpath, arguments = _driver_arguments(ctx.attr.deps, "route-check", ["--out", out.path])
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = arguments,
        inputs = depset(classpath, transitive = [runtime.files]),
        outputs = [out],
        env = _LOCALE_ENV,
        execution_requirements = {"no-local": "1"},
        mnemonic = "SolRouteCheck",
        progress_message = "Sol route check %{label}",
        use_default_shell_env = False,
    )
    return [DefaultInfo(files = depset([out]))]

attune_sol_route_check = rule(
    implementation = _sol_route_check_impl,
    doc = """Report the observable, non-secret state of the injected SIWC token.

    It makes no provider call and touches no corpus: it only reports whether the
    platform's declared `ACCESS_TOKEN` secret is present and, when it is a
    well-formed JWT, its expiry instant. The token value itself is never written.
    `no-local` keeps the check on the declared remote platform, so the secret
    boundary it reports on is the one the arm actually uses.
    """,
    attrs = {
        "deps": attr.label_list(
            default = ["//platform/tools/sol:sol_driver"],
            providers = [JavaInfo],
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

def _world_source_manifest(ctx, world):
    """One declared `action-path <TAB> repository-relative-path` line per world file."""
    lines = []
    marker = "/worlds/" + world + "/"
    for file in ctx.files.repo:
        if marker not in file.path:
            fail("declared world source %r is not under world %s" % (file.path, world))
        tail = file.path.split(marker, 1)[1]
        parts = tail.split("/", 1)
        if len(parts) != 2:
            fail("declared world source %r carries no repository-relative path" % file.path)
        lines.append(file.path + "\t" + parts[1])
    if not lines:
        fail("world %s declares no source files" % world)
    return "\n".join(sorted(lines)) + "\n"

def attune_sol_cohort(
        name,
        tasks,
        prompt,
        prompt_identity,
        codex,
        issue_tree,
        world_repo):
    """Expand one declared task population into one Sol remote action per task.

    Args:
      name: the aggregating filegroup name; each task target is `<name>__<id>`.
      tasks: the admitted task rows `[kind, task, group, world, ...]`.
      prompt: the frozen prompt file, byte-identical for every task.
      prompt_identity: the declared identity of the frozen prompt bytes.
      codex: the pinned Codex CLI binary target.
      issue_tree: the declared public issue projection tree.
      world_repo: the declared acquisition repository of the clean world archives.
    """
    targets = []
    for task in tasks:
        target_name = "%s__%s" % (name, task[1])
        attune_sol_task(
            name = target_name,
            codex = codex,
            issue_tree = issue_tree,
            prompt = prompt,
            prompt_identity = prompt_identity,
            repo = "%s//:%s" % (world_repo, task[3]),
            tags = ["manual"],
            task = task[1],
            world = task[3],
        )
        targets.append(":" + target_name)
    native.filegroup(
        name = name,
        srcs = targets,
        tags = ["manual"],
    )

def _sol_task_impl(ctx):
    runtime = ctx.toolchains["@bazel_tools//tools/jdk:runtime_toolchain_type"].java_runtime
    out = ctx.actions.declare_file(ctx.label.name + ".receipt.json")
    manifest = ctx.actions.declare_file(ctx.label.name + ".world.tsv")
    ctx.actions.write(manifest, _world_source_manifest(ctx, ctx.attr.world))
    classpath, arguments = _driver_arguments(ctx.attr.deps, "run", [
        "--out", out.path,
        "--task", ctx.attr.task,
        "--world", ctx.attr.world,
        "--model", ctx.attr.model,
        "--effort", ctx.attr.effort,
        "--timeout", str(ctx.attr.timeout),
        "--prompt", ctx.file.prompt.path,
        "--prompt-identity", ctx.attr.prompt_identity,
        "--issue-tree", ctx.file.issue_tree.path + "/issues.tsv",
        "--repo", manifest.path,
        "--codex", ctx.file.codex.path,
    ])
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = arguments,
        inputs = depset(
            [manifest, ctx.file.prompt, ctx.file.issue_tree, ctx.file.codex] + ctx.files.repo,
            transitive = [depset(classpath), ctx.attr.codex.files, runtime.files],
        ),
        outputs = [out],
        env = _LOCALE_ENV,
        # `no-local` keeps the turn on the declared remote platform (never a host
        # fallback). Caching stays ON: a retained receipt is reused exactly, which
        # is the contract's "a retained success is never rerun" rule, and the
        # declared execution platform is part of the action key so no host or
        # other-platform result can be substituted. Resuming after an outage
        # means deleting only the unfinished tasks' receipts and rebuilding;
        # retrying one task (the single authorized transient retry) means
        # deleting exactly that task's receipt and rebuilding it alone.
        execution_requirements = {"no-local": "1"},
        mnemonic = "SolLocalize",
        progress_message = "Sol localization %{label}",
        use_default_shell_env = False,
    )
    return [DefaultInfo(files = depset([out]))]

attune_sol_task = rule(
    implementation = _sol_task_impl,
    doc = """Run one task's Sol localization turn on the dedicated remote platform.

    Exactly one clean world source tree, the frozen prompt bytes and the public
    issue projection are declared inputs; the reference patch, gold paths, test
    patch, interface oracle, catalog metadata, Attune E/Q ranks, JEV fixtures and
    report/metrics are physically absent from the closure. The rule emits one
    sanitized receipt; it classifies nothing.
    """,
    attrs = {
        "codex": attr.label(allow_single_file = True, mandatory = True),
        "prompt": attr.label(allow_single_file = True, mandatory = True),
        "issue_tree": attr.label(allow_single_file = True, mandatory = True),
        "repo": attr.label(mandatory = True),
        "task": attr.string(mandatory = True),
        "world": attr.string(mandatory = True),
        "model": attr.string(default = "gpt-6.1-sol"),
        "effort": attr.string(default = "medium"),
        "timeout": attr.int(default = 300),
        "prompt_identity": attr.string(mandatory = True),
        "deps": attr.label_list(
            default = ["//platform/tools/sol:sol_driver"],
            providers = [JavaInfo],
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

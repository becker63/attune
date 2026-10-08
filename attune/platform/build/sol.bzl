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
    env = dict(_LOCALE_ENV)

    # The injected `ACCESS_TOKEN` is a BuildBuddy execution secret, not a declared
    # input, so its value is deliberately absent from this action's key. A cached
    # verdict would therefore survive the owner's secret update and keep
    # reporting the previous token's expiry, which defeats the pre-flight exactly
    # when it is needed. When `fresh`, fold the repo's declared measurement
    # freshness token into the action so a new token gives a new key and re-reads
    # the secret actually injected, exactly like the other live measurement
    # surfaces. It makes no provider call, so re-running is free.
    if ctx.attr.fresh:
        env["ATTUNE_MEASUREMENT_FRESHNESS"] = ctx.var.get("attune_measurement_freshness", "unset")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = arguments,
        inputs = depset(classpath, transitive = [runtime.files]),
        outputs = [out],
        env = env,
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

    `fresh` additionally keys the verdict on the declared measurement freshness
    token (`--define=attune_measurement_freshness=...`), so a re-run after the
    owner replaces the secret reports the newly injected token instead of
    replaying the previous one's expiry; pass a new token for each check. It
    stays off by default, so the published original arm's route check is
    unchanged.
    """,
    attrs = {
        "deps": attr.label_list(
            default = ["//platform/tools/sol:sol_driver"],
            providers = [JavaInfo],
        ),
        "fresh": attr.bool(
            default = False,
            doc = "Key this diagnostic on the measurement freshness token so " +
                  "each new token re-reads the currently injected secret.",
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

def _declared_member(files, name):
    """Resolve one declared member path of a rule attribute.

    A directly declared file is matched by basename; a study stage's single tree
    artifact is bound whole and the member is named under its root. Returns
    `None` when no declared file or tree could carry the name, so the caller
    fails closed instead of binding a path that does not exist.
    """
    for file in files:
        if file.basename == name:
            return file.path
    for file in files:
        if file.is_directory:
            return file.path + "/" + name
    return None

def _world_source_manifest(files, world):
    """One declared `action-path <TAB> repository-relative-path` line per world file."""
    lines = []
    marker = "/worlds/" + world + "/"
    for file in files:
        if marker not in file.path:
            fail("declared world source %r is not under world %s" % (file.path, world))
        tail = file.path.split(marker, 1)[1]
        # Every declared world tree carries exactly one leading top-level
        # directory: a pinned archive's `<repo>-<revision>` directory, or the
        # authored corpus-free bring-up fixture's own wrapper directory. Dropping
        # it yields the repository-relative path the model inspects.
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
        world_repo,
        inspect = False,
        code_mode_host = None,
        bwrap = None):
    """Expand one declared task population into one Sol remote action per task.

    Args:
      name: the aggregating filegroup name; each task target is `<name>__<id>`.
      tasks: the admitted task rows `[kind, task, group, world, ...]`.
      prompt: the frozen prompt file, byte-identical for every task.
      prompt_identity: the declared identity of the frozen prompt bytes.
      codex: the pinned Codex CLI binary target.
      issue_tree: the declared public issue projection tree.
      world_repo: the declared acquisition repository of the clean world archives.
      inspect: opt in to the distinct enforced read-only inspection arm for
        every expanded task. Default `False` is the published original arm.
      code_mode_host: the pinned companion `codex-code-mode-host` binary the
        inspected arm stages as the app-server's tool executor sibling. Required
        when `inspect` is set; ignored by the original arm.
    """
    targets = []
    for task in tasks:
        target_name = "%s__%s" % (name, task[1])
        attune_sol_task(
            name = target_name,
            code_mode_host = code_mode_host,
            bwrap = bwrap,
            codex = codex,
            inspect = inspect,
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

def attune_reviewbench_review_cohort(
        name,
        tasks,
        prompt,
        prompt_identity,
        codex,
        code_mode_host,
        bwrap,
        world_repo,
        measure,
        issues,
        contexts):
    """Expand the frozen ReviewBench cohort into one declared review per task and arm.

    `VAL-REVIEW-003`: the planned cohort is 24 tasks x 2 arms = 48 planned arm
    reviews; the ACTUAL reviewed set is the same paired structurally admitted
    subset, and both arms read the same head world and the same base-to-head
    change. Every review carries the same frozen prompt, tools and budgets; the
    assisted arm additionally declares the combined Qwen/JEV structural context
    and source witnesses of its task. Failures are retained in the planned
    denominator: no task is replaced and no structurally excluded task is forced.

    Args:
      name: the aggregating filegroup name; each target is `<name>__<task>_<arm>`.
      tasks: the admitted cohort rows `[kind, task, group, head_world, ...]`.
      prompt: the frozen review prompt, byte-identical for every task and arm.
      prompt_identity: the declared identity of the frozen prompt bytes.
      codex: the pinned Codex CLI binary target.
      code_mode_host: the pinned companion `codex-code-mode-host` binary.
      bwrap: the pinned bundled sandbox helper.
      world_repo: the declared acquisition repository of the base/head archives.
      measure: the admitted measurement tree holding each task's changed record.
      issues: the declared metadata tree holding `issues.tsv` (title + body per task).
      contexts: the declared assisted-context tree holding `context-<task>.txt`.
    """
    targets = []
    for task in tasks:
        key = task[1]
        head_world = task[3]
        base_world = head_world[:-len("-head")] + "-base"
        pr = int(key.rsplit("-", 1)[1])
        for arm in ("A", "B"):
            target_name = "%s__%s_%s" % (name, key, arm.lower())
            attune_sol_task(
                name = target_name,
                arm_name = arm,
                base_repo = "%s//:%s" % (world_repo, base_world),
                base_world = base_world,
                bwrap = bwrap,
                changed = measure,
                code_mode_host = code_mode_host,
                codex = codex,
                context = contexts if arm == "B" else None,
                inspect = True,
                pr = pr,
                prompt = prompt,
                review_issues = issues,
                prompt_identity = prompt_identity,
                repo = "%s//:%s" % (world_repo, head_world),
                review = True,
                tags = ["manual"],
                task = key,
                world = head_world,
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
    projections = ctx.actions.declare_file(ctx.label.name + ".predictions.tsv")
    manifest = ctx.actions.declare_file(ctx.label.name + ".world.tsv")
    ctx.actions.write(manifest, _world_source_manifest(ctx.files.repo, ctx.attr.world))

    # Exactly one declared public-issue input: the arm's admitted public
    # projection tree, a frozen corpus-free fixture's own issue file, or (review
    # mode) the declared metadata projection of the paired review study.
    issue_inputs = []
    issue_arguments = []
    if ctx.attr.issue_tsv:
        issue_inputs = [ctx.file.issue_tsv]
        issue_arguments = ["--issue-tsv", ctx.file.issue_tsv.path]
    elif ctx.attr.issue_tree:
        issue_inputs = [ctx.file.issue_tree]
        issue_arguments = ["--issue-tree", ctx.file.issue_tree.path + "/issues.tsv"]
    outputs = [out, projections]

    # The opt-in inspected path: the same driver and route, plus the declared
    # observation surface (parsed item events, observed read bytes) and the
    # frozen client-mechanical budgets. The original arm's targets declare none
    # of this and keep their published argument list exactly.
    inspect_arguments = []
    if ctx.attr.inspect:
        if not ctx.attr.code_mode_host:
            fail("the inspected arm requires the pinned code-mode host artifact")
        if not ctx.attr.bwrap:
            fail("the inspected arm requires the pinned bundled bwrap artifact")
        reads = ctx.actions.declare_file(ctx.label.name + ".reads.tsv")
        outputs.append(reads)
        inspect_arguments = [
            "--inspect",
            "true",
            "--code-mode-host",
            ctx.file.code_mode_host.path,
            "--bwrap",
            ctx.file.bwrap.path,
            "--max-tool-rounds",
            str(ctx.attr.max_tool_rounds),
            "--max-tokens",
            str(ctx.attr.max_tokens),
            "--reads",
            reads.path,
        ]

    # The opt-in ReviewBench review path (`VAL-REVIEW-003`): the same verified
    # inspected runner plus a minimal finding-schema extension. It adds the
    # bounded base-to-head change block (the permitted PR diff + metadata) and,
    # for the assisted arm only, the combined Qwen/JEV structural context and
    # source witnesses. The head world stays the full read-only checkout; the base
    # world is bound only so the driver can render the change and is never exposed
    # to the sandbox. Both arms carry the SAME frozen prompt, tools and budgets.
    review_inputs = []
    review_arguments = []
    if ctx.attr.review:
        if not ctx.attr.base_repo:
            fail("the review path requires the declared base world")
        if not ctx.attr.changed:
            fail("the review path requires the declared measured change record")
        wanted = "changed-%d.tsv" % ctx.attr.pr
        changed_path = _declared_member(ctx.files.changed, wanted)
        if changed_path == None:
            fail("the measured change record %s is not in the declared tree" % wanted)
        issue_path = _declared_member(ctx.files.review_issues, "issues.tsv")
        if issue_path == None:
            fail("the review path requires an issues.tsv in the declared issue tree")
        base_manifest = ctx.actions.declare_file(ctx.label.name + ".base-world.tsv")
        ctx.actions.write(base_manifest, _world_source_manifest(ctx.files.base_repo, ctx.attr.base_world))
        findings = ctx.actions.declare_file(ctx.label.name + ".findings.tsv")
        diff = ctx.actions.declare_file(ctx.label.name + ".diff.txt")
        outputs.extend([findings, diff])
        review_inputs = [base_manifest] + ctx.files.changed + ctx.files.review_issues + ctx.files.base_repo
        review_arguments = [
            "--review",
            "true",
            "--arm-name",
            ctx.attr.arm_name,
            "--changed",
            changed_path,
            "--pr",
            str(ctx.attr.pr),
            "--base-repo",
            base_manifest.path,
            "--issue-tsv",
            issue_path,
            "--findings",
            findings.path,
            "--diff",
            diff.path,
        ]
        if ctx.attr.context:
            wanted_context = "context-%s.txt" % ctx.attr.task
            context_path = _declared_member(ctx.files.context, wanted_context)
            if context_path == None:
                fail("the assisted arm requires %s in the declared context tree" % wanted_context)
            review_inputs += ctx.files.context
            review_arguments.extend(["--context", context_path])

    classpath, arguments = _driver_arguments(ctx.attr.deps, "run", [
        "--out", out.path,
        "--predictions", projections.path,
        "--task", ctx.attr.task,
        "--world", ctx.attr.world,
        "--model", ctx.attr.model,
        "--effort", ctx.attr.effort,
        "--timeout", str(ctx.attr.timeout),
        "--prompt", ctx.file.prompt.path,
        "--prompt-identity", ctx.attr.prompt_identity,
        "--repo", manifest.path,
        "--codex", ctx.file.codex.path,
    ] + issue_arguments + inspect_arguments + review_arguments)
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = arguments,
        inputs = depset(
            [manifest, ctx.file.prompt, ctx.file.codex] + issue_inputs + ctx.files.repo + review_inputs,
            transitive = [depset(classpath), ctx.attr.codex.files, ctx.attr.code_mode_host.files,
                          ctx.attr.bwrap.files, runtime.files],
        ),
        outputs = outputs,
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
    return [DefaultInfo(files = depset(outputs + [manifest]))]

attune_sol_task = rule(
    implementation = _sol_task_impl,
    doc = """Run one task's Sol localization turn on the dedicated remote platform.

    Exactly one clean world source tree, the frozen prompt bytes and the public
    issue projection are declared inputs; the reference patch, gold paths, test
    patch, interface oracle, catalog metadata, Attune E/Q ranks, JEV fixtures and
    report/metrics are physically absent from the closure. The rule emits one
    sanitized receipt plus the mechanical projection of that task's raw
    structured result; it classifies nothing. With `inspect = True` it is the
    distinct enforced read-only inspection arm: it additionally emits the
    mechanical projection of the observed inspection actions and enforces the
    frozen client-mechanical budgets inside the driver.
    """,
    attrs = {
        "codex": attr.label(allow_single_file = True, mandatory = True),
        "code_mode_host": attr.label(allow_single_file = True),
        "bwrap": attr.label(allow_single_file = True),
        "prompt": attr.label(allow_single_file = True, mandatory = True),
        "issue_tree": attr.label(allow_single_file = True),
        "issue_tsv": attr.label(allow_single_file = True),
        "repo": attr.label(mandatory = True),
        "task": attr.string(mandatory = True),
        "world": attr.string(mandatory = True),
        "model": attr.string(default = "gpt-6.1-sol"),
        "effort": attr.string(default = "medium"),
        "timeout": attr.int(default = 300),
        "inspect": attr.bool(default = False),
        "review": attr.bool(default = False),
        "arm_name": attr.string(default = "A"),
        "base_repo": attr.label(),
        "base_world": attr.string(default = ""),
        "changed": attr.label(),
        "context": attr.label(),
        "review_issues": attr.label(),
        "pr": attr.int(default = 0),
        "max_tool_rounds": attr.int(default = 32),
        "max_tokens": attr.int(default = 256000),
        "prompt_identity": attr.string(mandatory = True),
        "deps": attr.label_list(
            default = ["//platform/tools/sol:sol_driver"],
            providers = [JavaInfo],
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

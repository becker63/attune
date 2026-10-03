"""Bazel rule for the hermetic declared-source policy check.

The declared-source check is hermetic: Starlark writes the manifest of declared
inputs, and the Flix-owned evaluator runs over exactly those declared records.
The action must reach the declared verdict or it fails; the companion test only
accepts the verdict the action actually recorded.

The separate local workspace audit shares the same evaluator but walks the live
tree instead, which is why it stays an explicitly invoked, uncached command
(`//tools/policy:workspace_audit`) rather than an ordinary cached test.
"""

def _policy_check_impl(ctx):
    manifest = ctx.actions.declare_file(ctx.label.name + ".manifest.tsv")
    lines = []
    for source in ctx.files.srcs:
        lines.append(source.short_path + "\t" + source.short_path)
    ctx.actions.write(manifest, "\n".join(lines) + "\n")

    records = ctx.actions.declare_file(ctx.label.name + ".records.tsv")
    evidence = ctx.actions.declare_file(ctx.label.name + ".verdict.txt")
    ctx.actions.run(
        inputs = ctx.files.srcs + [manifest, ctx.file._policy_jar],
        outputs = [records, evidence],
        executable = ctx.executable._tool,
        arguments = [
            "--mode",
            "declared",
            "--manifest",
            manifest.path,
            "--records",
            records.path,
            "--policy-jar",
            ctx.file._policy_jar.path,
            "--evidence",
            evidence.path,
            "--expect",
            ctx.attr.expect,
        ],
        mnemonic = "AttunePolicyCheck",
        progress_message = "Checking declared-source policy for %{label}",
    )
    return [DefaultInfo(files = depset([evidence]))]

policy_check = rule(
    implementation = _policy_check_impl,
    doc = "Evaluate the compact Flix-owned declared-source policy over the declared inputs.",
    attrs = {
        "srcs": attr.label_list(
            allow_files = True,
            doc = "Declared inputs; a filegroup label is accepted, as in the spine rules.",
        ),
        "expect": attr.string(
            default = "accept",
            doc = "Verdict the evaluator must reach for this action to succeed.",
        ),
        "_policy_jar": attr.label(
            default = Label("//tools/policy:policy_jar"),
            allow_single_file = True,
        ),
        "_tool": attr.label(
            default = Label("//tools/policy:policy_check"),
            executable = True,
            cfg = "exec",
        ),
    },
)

def policy_verdict_test(name, evidence, size = "small", tags = []):
    """Accept the verdict recorded by a prerequisite `policy_check` action.

    The check itself already ran in the build action; this test confirms the
    recorded evidence, so the ordinary suite stays green while the check is
    genuinely enforced.
    """
    native.java_test(
        name = name,
        size = size,
        main_class = "attune.tools.policy.PolicyVerdict",
        use_testrunner = False,
        runtime_deps = ["//tools/policy:policy_java"],
        data = [evidence],
        jvm_flags = ["-Dattune.evidence=$(rlocationpath %s)" % evidence],
        tags = tags,
    )

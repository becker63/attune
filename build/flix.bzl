"""Bazel-owned Flix rules for the Attune v2 bootstrap.

The inherited reference rules invoked the compiler through `run_shell`. These
rules replace every shell action with `ctx.actions.run` plus a minimal Java
boundary (`//tools:flix_tool`) that selects the declared project
directory, because the pinned Flix compiler resolves its project from the
process working directory rather than from an argument.

Programs are compiled in prerequisite build actions (`build-fatjar`). Their
compiled JARs are executed later by isolated tests, never by `flix run/test`.
"""

def flix_project_relative(source):
    """Map a declared source into the generated project's `src/` tree.

    Files under a `src/` root keep their relative path so module names match
    their file paths; every other source is placed by basename. This mirrors
    the reference projection and keeps `src/` authoritative.
    """
    path = source.short_path
    if path.startswith("src/"):
        return path[len("src/"):]
    if "/src/" in path:
        return path.split("/src/", 1)[1]
    return source.basename

def _flix_project(ctx, description):
    project = ctx.label.name + ".flixproj"
    package_name = ctx.label.name.replace("_", "-")
    manifest = ctx.actions.declare_file(project + "/flix.toml")
    ctx.actions.write(
        manifest,
        """[package]
name = "%s"
description = "%s"
version = "0.0.0"
flix = "0.76.1"
authors = ["Attune"]
""" % (package_name, description),
    )

    inputs = [manifest]
    for source in ctx.files.srcs:
        relative = flix_project_relative(source)
        link = ctx.actions.declare_file(project + "/src/" + relative)
        ctx.actions.symlink(output = link, target_file = source)
        inputs.append(link)

    return struct(
        inputs = inputs,
        manifest = manifest,
        name = project,
    )

def _flix_fatjar_impl(ctx):
    project = _flix_project(ctx, "Bazel-owned Flix executable")
    output_jar = ctx.actions.declare_file(project.name + "/artifact/" + project.name + ".jar")

    ctx.actions.run(
        inputs = project.inputs + [ctx.file._flix_jar],
        outputs = [output_jar],
        executable = ctx.executable._flix_tool,
        arguments = [
            "run",
            project.manifest.dirname,
            ctx.file._flix_jar.path,
            "build-fatjar",
            "--threads",
            str(ctx.attr.threads),
        ],
        mnemonic = "FlixFatJar",
        progress_message = "Compiling Flix executable %{label}",
    )
    return [
        DefaultInfo(files = depset([output_jar])),
        JavaInfo(output_jar = output_jar, compile_jar = output_jar),
    ]

flix_fatjar = rule(
    implementation = _flix_fatjar_impl,
    doc = "Compile a Flix project into a standalone fat JAR with the pinned compiler.",
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "threads": attr.int(default = 2),
        "_flix_jar": attr.label(
            default = Label("@flix_compiler//jar"),
            allow_single_file = True,
        ),
        "_flix_tool": attr.label(
            default = Label("//tools:flix_tool"),
            executable = True,
            cfg = "exec",
        ),
    },
)

def _flix_reject_impl(ctx):
    project = _flix_project(ctx, "Pinned compiler negative fixture")
    evidence = ctx.actions.declare_file(ctx.label.name + ".diagnostics.txt")

    ctx.actions.run(
        inputs = project.inputs + [ctx.file._flix_jar],
        outputs = [evidence],
        executable = ctx.executable._flix_tool,
        arguments = [
            "reject",
            project.manifest.dirname,
            ctx.file._flix_jar.path,
            evidence.path,
            ctx.attr.expected,
            "build-fatjar",
            "--threads",
            str(ctx.attr.threads),
        ],
        mnemonic = "FlixReject",
        progress_message = "Checking that the pinned compiler rejects %{label}",
    )
    return [DefaultInfo(files = depset([evidence]))]

flix_reject = rule(
    implementation = _flix_reject_impl,
    doc = "Compile an intentionally invalid Flix fixture and fail unless the pinned compiler rejects it with the expected diagnostic.",
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "expected": attr.string(
            doc = "Substring that must appear in the compiler diagnostic.",
        ),
        "threads": attr.int(default = 2),
        "_flix_jar": attr.label(
            default = Label("@flix_compiler//jar"),
            allow_single_file = True,
        ),
        "_flix_tool": attr.label(
            default = Label("//tools:flix_tool"),
            executable = True,
            cfg = "exec",
        ),
    },
)

def recorded_verdict_test(name, evidence, tags = [], size = "small"):
    """Accept a recorded negative compiler verdict from a prerequisite action.

    The rejection itself already happened in `flix_reject`; this test confirms
    the recorded evidence so the ordinary suite stays green while the negative
    case is genuinely enforced.
    """
    native.java_test(
        name = name,
        size = size,
        main_class = "attune.tools.spine.NegativeVerdict",
        use_testrunner = False,
        runtime_deps = ["//tools:isolated_run"],
        data = [evidence],
        jvm_flags = ["-Dattune.evidence=$(rlocationpath %s)" % evidence],
        tags = tags,
    )

def isolated_jvm_test(name, jar, tags = [], data = [], jvm_flags = [], size = "small"):
    """Run a compiled Flix fat JAR in a fresh user/network namespace.

    The compiled program is already built; this test only launches the
    standalone JVM behind the declared pinned `unshare` boundary with an
    allowlisted environment. No compiler or dependency resolver runs here and
    there is no fallback if isolation fails.
    """
    native.java_test(
        name = name,
        size = size,
        main_class = "attune.tools.spine.IsolatedRun",
        use_testrunner = False,
        runtime_deps = ["//tools:isolated_run"],
        data = [jar, "@unshare//:bin/unshare", "@unshare//:closure"] + data,
        jvm_flags = [
            "-Dattune.jar=$(rlocationpath %s)" % jar,
            "-Dattune.unshare=$(rlocationpath @unshare//:bin/unshare)",
        ] + jvm_flags,
        tags = tags,
    )

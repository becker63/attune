"""Declared Flix sources become isolated JVM programs, tests, or artifact actions.

The pinned compiler owns compilation and native @Test execution.
Bazel owns the graph. This file contains no experiment policy.
"""

load("@rules_java//java/common:java_info.bzl", "JavaInfo")

_UNSHARE = "@unshare//:bin/unshare"
_CLOSURE = "@unshare//:closure"
_PLATFORM = "//platform/build:platform_native_isolation"
_LAUNCHER = "//platform/tools/boundary:native_launch"
_JAVA = "@bazel_tools//tools/jdk:runtime_toolchain_type"

def _isolation(host = False, force_platform = False):
    if host:
        data = [_UNSHARE, _CLOSURE]
        return data, ["-Dattune.isolation=unshare", "-Dattune.unshare=$(rlocationpath %s)" % _UNSHARE]
    if force_platform:
        # Explicit platform isolation: no user namespace. Required by the
        # source-policy fail-closed controls — the unshare namespace grants
        # DAC override, under which every unreadable file would be readable
        # and an unreadable-input control could never fail closed.
        return [], ["-Dattune.isolation=platform"]
    data = [_UNSHARE, _CLOSURE]
    flags = ["-Dattune.isolation=unshare", "-Dattune.unshare=$(rlocationpath %s)" % _UNSHARE]
    return (
        select({_PLATFORM: [], "//conditions:default": data}),
        select({_PLATFORM: ["-Dattune.isolation=platform"], "//conditions:default": flags}),
    )

def _locations(labels):
    return ",".join(["$(rlocationpath %s)" % label for label in labels])

def _jars(deps):
    return depset(transitive = [dep[JavaInfo].transitive_runtime_jars for dep in deps]).to_list()

def _jar_manifest_impl(ctx):
    jars = _jars(ctx.attr.deps)
    out = ctx.actions.declare_file(ctx.label.name + ".jars")
    ctx.actions.write(out, "\n".join([jar.short_path for jar in jars]) + "\n")
    return [DefaultInfo(files = depset([out]), runfiles = ctx.runfiles(files = jars))]

_jar_manifest = rule(
    implementation = _jar_manifest_impl,
    attrs = {"deps": attr.label_list(providers = [JavaInfo])},
)

def _declared_manifest_impl(ctx):
    out = ctx.actions.declare_file(ctx.label.name + ".txt")

    # Logical names stay workspace-relative when this library is an external
    # module of the Studio build. Runfiles locations retain their repo prefix.
    lines = []
    for file in ctx.files.srcs:
        if file.owner.workspace_name != ctx.label.workspace_name:
            fail("declared inputs must belong to this workspace: %s" % file.owner)
        name = file.short_path.split("/", 2)[2] if file.short_path.startswith("../") else file.short_path
        lines.append(name + "\t" + file.short_path)
    ctx.actions.write(out, "\n".join(sorted(lines)) + "\n")
    return [DefaultInfo(files = depset([out]))]

declared_manifest = rule(
    implementation = _declared_manifest_impl,
    attrs = {"srcs": attr.label_list(allow_files = True)},
)

def _compile_sources_impl(ctx):
    # The declared compiler source list of one launcher program, recorded as
    # a real declared-action-input fact: one symlink action per source makes
    # the aquery dump name exactly the files the pinned compiler compiles
    # for this program. The program's runfile closure (which also carries
    # data, bindings and fixtures) never implies compilation; only this
    # manifest does. The manifest text mirrors the recorded list.
    out = ctx.actions.declare_file(ctx.label.name + ".txt")
    lines = []
    for file in ctx.files.srcs:
        if file.owner.workspace_name != ctx.label.workspace_name:
            fail("compile sources must belong to this workspace: %s" % file.owner)
        name = file.short_path.split("/", 2)[2] if file.short_path.startswith("../") else file.short_path
        lines.append(name)
        link = ctx.actions.declare_file(ctx.label.name + ".sources/" + file.short_path)
        ctx.actions.symlink(output = link, target_file = file)
    ctx.actions.write(out, "\n".join(sorted(lines)) + "\n")
    return [DefaultInfo(files = depset([out]))]

compile_sources = rule(
    implementation = _compile_sources_impl,
    attrs = {"srcs": attr.label_list(allow_files = [".flix"])},
)

def _program(name, srcs, java_deps = [], declared_files = [], native_libs = [], mode = "test", flags = [], data = [], tags = [], host = False, binary = False, size = "small", platform_isolation = False):
    boundary, isolation_flags = _isolation(host, platform_isolation)

    # The compile-source manifest records this program's exact Flix source
    # list as declared action inputs (one Symlink action per source), so the
    # source-policy coverage rule reads the real compiler sources from the
    # aquery dump instead of the runfile closure.
    compile_sources(name = name + "_sources", srcs = srcs)
    extra = list(data) + native_libs
    properties = flags + ["-Dattune.mode=" + mode, "-Dattune.tests=" + _locations(srcs)]
    if java_deps:
        _jar_manifest(name = name + "_jars", deps = java_deps)
        extra.append(":" + name + "_jars")
        properties.append("-Dattune.jars=$(rlocationpath :%s_jars)" % name)
    if declared_files:
        declared_manifest(name = name + "_inputs", srcs = declared_files)
        extra += declared_files + [":" + name + "_inputs"]
        properties.append("-Dattune.fixtures=$(rlocationpath :%s_inputs)" % name)
    if native_libs:
        properties.append("-Dattune.libs=" + _locations(native_libs))
    if host and "no-remote" not in tags:
        fail("host isolation requires no-remote")
    attributes = dict(
        name = name,
        main_class = "attune.tools.boundary.NativeLaunch",
        runtime_deps = [_LAUNCHER],
        data = srcs + boundary + extra,
        jvm_flags = properties + isolation_flags,
        tags = tags,
    )
    if binary:
        native.java_binary(**attributes)
    else:
        native.java_test(size = size, use_testrunner = False, env = {"LANG": "C.UTF-8"}, **attributes)

def native_flix_binary(name, srcs, java_deps = [], declared_files = []):
    _program(name, srcs, java_deps = java_deps, declared_files = declared_files, mode = "run", binary = True)

def native_flix_test(name, srcs, java_deps = [], declared_files = [], native_libs = [], tags = [], host_isolation = False, size = "small"):
    _program(name, srcs, java_deps, declared_files, native_libs, tags = tags, host = host_isolation, size = size)

def native_flix_reject_test(name, srcs, expected):
    _program(name, srcs, flags = ["-Dattune.expect=" + expected.replace(" ", "_")])

def native_flix_declared_test(name, srcs, declared):
    declared_manifest(name = name + "_manifest", srcs = [declared])
    _program(
        name,
        srcs,
        mode = "declared",
        flags = ["-Dattune.manifest=$(rlocationpath :%s_manifest)" % name],
        data = [declared, ":" + name + "_manifest"],
    )

def native_flix_audit_test(name, srcs, workspace_root, data = []):
    # local prevents remote execution; external forces a fresh scan every time.
    _program(
        name,
        srcs,
        mode = "audit",
        flags = ["-Dattune.root=$(rlocationpath %s)" % workspace_root],
        data = data + [workspace_root],
        tags = ["local", "external"],
    )

def _binding_manifest_impl(ctx):
    # Logical names bind by file basename; unlike `declared_manifest`, the
    # source may come from an external repository rule such as the live
    # checkout root. The launcher resolves each runfile path to an absolute
    # location before the Flix program sees it.
    out = ctx.actions.declare_file(ctx.label.name + ".txt")
    lines = []
    for file in ctx.files.srcs:
        lines.append(file.basename + "\t" + file.short_path)
    ctx.actions.write(out, "\n".join(sorted(lines)) + "\n")
    return [DefaultInfo(files = depset([out]))]

_binding_manifest = rule(
    implementation = _binding_manifest_impl,
    attrs = {"srcs": attr.label_list(allow_files = True)},
)

def native_flix_checkout_test(name, srcs, checkout_root, git_bin, extra_data = [], declared_files = [], size = "medium", platform_isolation = False):
    """The live checkout gate: an uncached, local test that scans the whole
    checkout as data. The root and git bindings may come from an external
    repository rule; the Flix program itself never resolves runfiles.
    `extra_data` carries additional declared bindings, such as the pinned
    Flix compiler jar, by file basename; `declared_files` are ordinary
    declared test fixtures. `platform_isolation` opts out of the user
    namespace: the fail-closed unreadable-input controls need a process
    with no DAC override.
    """
    _binding_manifest(name = name + "_bindings", srcs = [checkout_root, git_bin] + extra_data)
    _program(
        name,
        srcs,
        declared_files = declared_files,
        data = [checkout_root, git_bin] + extra_data + [":" + name + "_bindings"],
        flags = ["-Dattune.fixtures=$(rlocationpath :%s_bindings)" % name],
        tags = ["local", "external"],
        size = size,
        platform_isolation = platform_isolation,
    )

def native_flix_checkout_binary(name, srcs, checkout_root, git_bin, extra_data = [], platform_isolation = False):
    """The live checkout gate as a runnable CLI, with the same declared
    bindings and uncached, local re-scan semantics as the checkout test."""
    _binding_manifest(name = name + "_bindings", srcs = [checkout_root, git_bin] + extra_data)
    _program(
        name,
        srcs,
        data = [checkout_root, git_bin] + extra_data + [":" + name + "_bindings"],
        flags = ["-Dattune.fixtures=$(rlocationpath :%s_bindings)" % name],
        mode = "run",
        binary = True,
        tags = ["local", "external"],
        platform_isolation = platform_isolation,
    )

def _action_impl(ctx):
    runtime = ctx.toolchains[_JAVA].java_runtime
    launcher = _jars([ctx.attr._launcher])
    jars = _jars(ctx.attr.java_deps)
    jar_manifest = ctx.actions.declare_file(ctx.label.name + ".jars")
    ctx.actions.write(jar_manifest, "\n".join([jar.path for jar in jars]) + "\n")
    bindings = ctx.actions.declare_file(ctx.label.name + ".inputs")
    lines = []
    inputs = []
    for target, name in ctx.attr.inputs.items():
        files = target.files.to_list()
        if len(files) != 1:
            fail("each named input must produce one file: %s" % target.label)
        inputs += files
        lines.append(name + "\t" + files[0].path)
    ctx.actions.write(bindings, "\n".join(lines) + "\n")
    out = ctx.actions.declare_file(ctx.label.name + ".json")
    jfr = ctx.actions.declare_file(ctx.label.name + ".jfr") if ctx.attr.profile_jfr else None
    args = ctx.actions.args()
    args.add("-cp")
    args.add_joined(launcher, join_with = ":")
    for name, value in {
        "mode": "compiled" if ctx.attr.compiled else "run",
        "tests": ",".join([file.path for file in ctx.files.srcs]),
        "jars": jar_manifest.path,
        "fixtures": bindings.path,
        "output": out.path,
        "isolation": ctx.attr.isolation,
        "libs": ",".join([file.path for file in ctx.files.native_libs]),
        "timeoutSeconds": str(ctx.attr.timeout_seconds),
    }.items():
        args.add("-Dattune." + name + "=" + value)
    if jfr:
        args.add("-Dattune.jfrOutput=" + jfr.path)
    if ctx.file.unshare:
        args.add("-Dattune.unshare=" + ctx.file.unshare.path)
        inputs += [ctx.file.unshare] + ctx.files.closure
    args.add("attune.tools.boundary.NativeLaunch")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = [args],
        inputs = depset(inputs + ctx.files.srcs + ctx.files.native_libs + launcher + jars + [jar_manifest, bindings], transitive = [runtime.files]),
        outputs = [out] + ([jfr] if jfr else []),
        env = {"LANG": "C.UTF-8"},
        mnemonic = "FlixArtifact",
        progress_message = "Computing %{label}",
    )
    return [DefaultInfo(files = depset([out] + ([jfr] if jfr else [])))]

_flix_action = rule(
    implementation = _action_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "inputs": attr.label_keyed_string_dict(allow_files = True),
        "java_deps": attr.label_list(providers = [JavaInfo]),
        "native_libs": attr.label_list(allow_files = True),
        "timeout_seconds": attr.int(default = 0),
        "compiled": attr.bool(default = False),
        "profile_jfr": attr.bool(default = False),
        "isolation": attr.string(values = ["unshare", "platform"]),
        "unshare": attr.label(allow_single_file = True),
        "closure": attr.label(allow_files = True),
        "_launcher": attr.label(default = _LAUNCHER, providers = [JavaInfo]),
    },
    toolchains = [_JAVA],
)

def flix_action(name, srcs, inputs = {}, java_deps = [], native_libs = [], timeout_seconds = 0, tags = [], compiled = False, profile_jfr = False):
    """An ordinary Flix main writes JSON and optionally an inner-JVM JFR recording."""
    if len(inputs.values()) != len({label: True for label in inputs.values()}):
        fail("input aliases must name distinct artifacts")
    _flix_action(
        name = name,
        srcs = srcs,
        inputs = {label: key for key, label in inputs.items()},
        java_deps = java_deps,
        native_libs = native_libs,
        timeout_seconds = timeout_seconds,
        compiled = compiled,
        profile_jfr = profile_jfr,
        tags = tags,
        isolation = select({_PLATFORM: "platform", "//conditions:default": "unshare"}),
        unshare = select({_PLATFORM: None, "//conditions:default": _UNSHARE}),
        closure = select({_PLATFORM: None, "//conditions:default": _CLOSURE}),
    )

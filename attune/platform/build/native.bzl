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

def _isolation(host = False):
    data = [_UNSHARE, _CLOSURE]
    flags = ["-Dattune.isolation=unshare", "-Dattune.unshare=$(rlocationpath %s)" % _UNSHARE]
    if host:
        return data, flags
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
    ctx.actions.write(out, "\n".join(sorted([file.short_path for file in ctx.files.srcs])) + "\n")
    return [DefaultInfo(files = depset([out]))]

declared_manifest = rule(
    implementation = _declared_manifest_impl,
    attrs = {"srcs": attr.label_list(allow_files = True)},
)

def _program(name, srcs, java_deps = [], declared_files = [], native_libs = [], mode = "test", flags = [], data = [], tags = [], host = False, binary = False, size = "small"):
    boundary, isolation_flags = _isolation(host)
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
    args = ctx.actions.args()
    args.add("-cp")
    args.add_joined(launcher, join_with = ":")
    for name, value in {
        "mode": "run",
        "tests": ",".join([file.path for file in ctx.files.srcs]),
        "jars": jar_manifest.path,
        "fixtures": bindings.path,
        "output": out.path,
        "isolation": ctx.attr.isolation,
    }.items():
        args.add("-Dattune." + name + "=" + value)
    if ctx.file.unshare:
        args.add("-Dattune.unshare=" + ctx.file.unshare.path)
        inputs += [ctx.file.unshare] + ctx.files.closure
    args.add("attune.tools.boundary.NativeLaunch")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = [args],
        inputs = depset(inputs + ctx.files.srcs + launcher + jars + [jar_manifest, bindings], transitive = [runtime.files]),
        outputs = [out],
        env = {"LANG": "C.UTF-8"},
        mnemonic = "FlixArtifact",
        progress_message = "Computing %{label}",
    )
    return [DefaultInfo(files = depset([out]))]

_flix_action = rule(
    implementation = _action_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "inputs": attr.label_keyed_string_dict(allow_files = True),
        "java_deps": attr.label_list(providers = [JavaInfo]),
        "isolation": attr.string(values = ["unshare", "platform"]),
        "unshare": attr.label(allow_single_file = True),
        "closure": attr.label(allow_files = True),
        "_launcher": attr.label(default = _LAUNCHER, providers = [JavaInfo]),
    },
    toolchains = [_JAVA],
)

def flix_action(name, srcs, inputs = {}, java_deps = []):
    """An ordinary Flix main reads named inputs and writes one declared JSON file."""
    if len(inputs.values()) != len({label: True for label in inputs.values()}):
        fail("input aliases must name distinct artifacts")
    _flix_action(
        name = name,
        srcs = srcs,
        inputs = {label: key for key, label in inputs.items()},
        java_deps = java_deps,
        isolation = select({_PLATFORM: "platform", "//conditions:default": "unshare"}),
        unshare = select({_PLATFORM: None, "//conditions:default": _UNSHARE}),
        closure = select({_PLATFORM: None, "//conditions:default": _CLOSURE}),
    )

"""Compile and run explicit Flix sources inside declared Bazel actions.

The default demo runs main; tests use the pinned compiler's native test engine.
Local actions use a pinned user/network namespace. The opt-in remote profile
uses the BuildBuddy container's network isolation. Java resolves paths and
launches processes; Flix owns policy, assertions, and results.
"""

load("@rules_java//java/common:java_info.bzl", "JavaInfo")

_UNSHARE = "@unshare//:bin/unshare"
_CLOSURE = "@unshare//:closure"
_FLIX = "@flix_compiler//jar"

# Java must accept UTF-8 paths here and in NativeLaunch's child process.
_LOCALE_ENV = {"LANG": "C.UTF-8"}

# Local: pinned user/network namespace. Remote: network-disabled container.
# Remote actions must never receive the host-only Nix binary or its closure.
_PLATFORM_ISOLATION = "//platform/build:platform_native_isolation"

def attune_isolation_data(host_isolation):
    if host_isolation:
        return [_UNSHARE, _CLOSURE]
    return select({
        _PLATFORM_ISOLATION: [],
        "//conditions:default": [_UNSHARE, _CLOSURE],
    })

def attune_isolation_flags(host_isolation):
    unshare = "-Dattune.unshare=$(rlocationpath %s)" % _UNSHARE
    if host_isolation:
        return ["-Dattune.isolation=unshare", unshare]
    return select({
        _PLATFORM_ISOLATION: ["-Dattune.isolation=platform"],
        "//conditions:default": ["-Dattune.isolation=unshare", unshare],
    })

def _rlocation(labels):
    return ",".join(["$(rlocationpath %s)" % label for label in labels])

def _native_test(name, srcs, flags, extra_data, size, tags, data, host_isolation = False):
    native.java_test(
        name = name,
        size = size,
        main_class = "attune.tools.boundary.NativeLaunch",
        use_testrunner = False,
        runtime_deps = ["//platform/tools/boundary:native_launch"],
        env = _LOCALE_ENV,
        data = srcs + attune_isolation_data(host_isolation) + [_FLIX] + extra_data + data,
        jvm_flags = flags + [
            "-Dattune.tests=" + _rlocation(srcs),
            "-Dattune.flix=$(rlocationpath %s)" % _FLIX,
        ] + attune_isolation_flags(host_isolation),
        tags = tags,
    )

def native_flix_binary(name, srcs):
    """Run one ordinary Flix main inside the same offline boundary as the tests."""
    native.java_binary(
        name = name,
        main_class = "attune.tools.boundary.NativeLaunch",
        runtime_deps = ["//platform/tools/boundary:native_launch"],
        data = srcs + attune_isolation_data(False) + [_FLIX],
        jvm_flags = [
            "-Dattune.mode=run",
            "-Dattune.tests=" + _rlocation(srcs),
            "-Dattune.flix=$(rlocationpath %s)" % _FLIX,
        ] + attune_isolation_flags(False),
    )

def _java_jar_manifest_impl(ctx):
    jars = depset(transitive = [
        dependency[JavaInfo].transitive_runtime_jars
        for dependency in ctx.attr.deps
    ]).to_list()
    out = ctx.actions.declare_file(ctx.label.name + ".jars.txt")
    ctx.actions.write(out, "\n".join([jar.short_path for jar in jars]) + "\n")
    return [DefaultInfo(
        files = depset([out]),
        runfiles = ctx.runfiles(files = jars),
    )]

java_jar_manifest = rule(
    implementation = _java_jar_manifest_impl,
    doc = "Write the transitive runtime jar runfiles paths of a Java dependency set.",
    attrs = {"deps": attr.label_list(providers = [JavaInfo])},
)

def native_flix_test(
        name,
        srcs,
        java_deps = [],
        declared_files = [],
        native_libs = [],
        produced = [],
        size = "small",
        tags = [],
        data = [],
        host_isolation = False,
        checkout_files = [],
        workspace_root = None):
    """Compile explicit Flix sources and run their native @Test declarations.

    Optional jars, libraries, fixtures, and produced trees are declared inputs.
    Live checkout documents require local, uncached execution. Host-isolation
    fixtures must be tagged no-remote; ordinary tests use the selected platform.
    """
    flags = ["-Dattune.mode=native"]
    extra_data = list(produced)
    if java_deps or native_libs or declared_files or checkout_files:
        manifest = name + "_jars"
        java_jar_manifest(name = manifest, deps = java_deps)
        flags = ["-Dattune.mode=java", "-Dattune.jars=$(rlocationpath :%s)" % manifest]
        extra_data.append(":" + manifest)
    if produced:
        flags.append("-Dattune.produced=" + _rlocation(produced))
    if host_isolation and "no-remote" not in tags:
        fail("host isolation requires the no-remote tag")
    if declared_files:
        files_manifest = name + "_declared"
        declared_manifest(name = files_manifest, srcs = declared_files)
        flags.append("-Dattune.fixtures=$(rlocationpath :%s)" % files_manifest)
        extra_data.append(":" + files_manifest)

        extra_data.extend(declared_files)
    if native_libs:
        flags.append("-Dattune.libs=" + _rlocation(native_libs))
        extra_data.extend(native_libs)
    if checkout_files:
        if workspace_root == None:
            fail("checkout_files needs the recorded workspace_root file")
        flags.append("-Dattune.workspace_root=$(rlocationpath %s)" % workspace_root)
        flags.append("-Dattune.checkout_files=" + ",".join(checkout_files))
        extra_data.append(workspace_root)
        tags = tags + ["local", "external"]
    _native_test(
        name,
        srcs,
        flags,
        extra_data,
        size,
        tags,
        data,
        host_isolation,
    )

def native_flix_reject_test(name, srcs, expected, size = "small", tags = []):
    """Require the pinned compiler to reject an isolated invalid fixture.

    The rejection happens in the pinned compiler with no `main` required; the
    launcher only checks the recorded exit status and diagnostic substring. The
    expected diagnostic spells each space as `_` because Bazel splits
    `jvm_flags` on whitespace.
    """
    _native_test(
        name,
        srcs,
        ["-Dattune.mode=check", "-Dattune.expect=" + expected.replace(" ", "_")],
        [],
        size,
        tags,
        [],
    )

def _declared_manifest_impl(ctx):
    lines = [source.short_path for source in ctx.files.srcs]
    out = ctx.actions.declare_file(ctx.label.name + ".txt")
    ctx.actions.write(out, "\n".join(sorted(lines)) + "\n")
    return [DefaultInfo(files = depset([out]))]

declared_manifest = rule(
    implementation = _declared_manifest_impl,
    doc = "Write the declared-source population as a manifest of relative paths.",
    attrs = {"srcs": attr.label_list(allow_files = True)},
)

def native_flix_declared_test(name, srcs, declared, size = "small", tags = [], data = []):
    """Run the hermetic declared-source policy over exactly the declared inputs."""
    manifest_name = name + "_manifest"
    declared_manifest(name = manifest_name, srcs = [declared])
    _native_test(
        name,
        srcs,
        [
            "-Dattune.mode=declared",
            "-Dattune.manifest=$(rlocationpath :%s)" % manifest_name,
        ],
        [":" + manifest_name, declared],
        size,
        tags,
        data,
    )

def native_flix_audit_test(name, srcs, workspace_root, skip = [], size = "small", tags = [], data = []):
    """Run the live read-only uncached workspace audit as a normal test.

    The target is local and uncached so `bazel test //...` always re-reads the
    current tree instead of trusting a declared or cached inventory.

    Two tags matter, and they are different mechanisms:

    - `local` keeps the test out of the sandbox and off remote execution and the
      remote cache, so it reads the real live workspace tree;
    - `external` makes Bazel execute the test unconditionally, regardless of
      `--cache_test_results`. This is the documented tag for that. The
      `no-cache` tag is *not* sufficient here: it excludes the disk and remote
      action caches only, and does not affect the in-memory (Skyframe) test
      result cache, so a cached verdict would still be replayed.

    Ordinary native tests stay cacheable; only these live checks opt out.
    """
    _native_test(
        name,
        srcs,
        [
            "-Dattune.mode=audit",
            "-Dattune.root=$(rlocationpath %s)" % workspace_root,
            "-Dattune.skip=" + ",".join(skip),
        ],
        [workspace_root],
        size,
        tags + ["local", "external"],
        data,
    )

def _runtime_jars(dependencies):
    return depset(transitive = [dep[JavaInfo].transitive_runtime_jars for dep in dependencies]).to_list()

_LAUNCHER = attr.label(default = "//platform/tools/boundary:native_launch", providers = [JavaInfo])
_JAVA_TOOLCHAINS = ["@bazel_tools//tools/jdk:runtime_toolchain_type"]

def _java_action(ctx, mode, inputs, properties, mnemonic):
    """Launch one JVM action with declared inputs and one output directory."""
    runtime = ctx.toolchains[_JAVA_TOOLCHAINS[0]].java_runtime
    classpath = _runtime_jars([ctx.attr._launcher])
    out = ctx.actions.declare_directory(ctx.label.name)
    args = ctx.actions.args()
    args.add("-cp")
    args.add_joined(classpath, join_with = ":")
    args.add("-Dattune.mode=" + mode)
    args.add("-Dattune.outputs=" + out.path)
    for key, value in properties.items():
        args.add("-Dattune." + key + "=" + value)
    args.add("attune.tools.boundary.NativeLaunch")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = [args],
        inputs = depset(inputs + classpath, transitive = [runtime.files]),
        outputs = [out],
        env = _LOCALE_ENV,
        mnemonic = mnemonic,
        progress_message = "Running %{label}",
    )
    return [DefaultInfo(files = depset([out]))]

def _paths(files):
    return ",".join([file.path for file in files])

def _native_producer_impl(ctx):
    jars = _runtime_jars(ctx.attr.java_deps)
    return _java_action(ctx, "produce", ctx.files.srcs + ctx.files.export + ctx.files.declared_files + jars, {
        "tests": _paths(ctx.files.srcs),
        "export": _paths(ctx.files.export),
        "bindings": _paths(ctx.files.declared_files),
        "jars": _paths(jars),
    }, "AttuneNativeProducer")

_native_flix_producer = rule(
    implementation = _native_producer_impl,
    doc = "Run the pinned native Tester over explicit sources and jars and emit one declared tree.",
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "export": attr.label_list(allow_files = True),
        "declared_files": attr.label_list(allow_files = True),
        "java_deps": attr.label_list(providers = [JavaInfo]),
        "_launcher": _LAUNCHER,
    },
    toolchains = _JAVA_TOOLCHAINS,
)

def native_flix_producer(name, srcs, export = [], declared_files = [], java_deps = [], **kwargs):
    """Test explicit sources, then export accepted files and their closure listing.

    A failed assertion fails the action. Consumers receive only accepted trees.
    Export defaults to srcs; producer-only laws can be omitted from the export.
    """
    _native_flix_producer(
        name = name,
        srcs = srcs,
        export = export or srcs,
        declared_files = declared_files,
        java_deps = java_deps,
        **kwargs
    )

def _native_receipt_impl(ctx):
    # Only measurement actions read freshness. Reuse of predictions is unaffected.
    properties = {"plan": ctx.file.plan.path}
    freshness = ctx.var.get("attune_measurement_freshness", "")
    if freshness:
        properties["freshness"] = freshness
    return _java_action(ctx, "receipt", [ctx.file.plan], properties, "AttuneProcessReceipt")

native_process_receipt = rule(
    implementation = _native_receipt_impl,
    doc = "Execute one declared bounded argv plan and emit the raw receipt tree.",
    attrs = {
        "plan": attr.label(allow_single_file = True, mandatory = True),
        "_launcher": _LAUNCHER,
    },
    toolchains = _JAVA_TOOLCHAINS,
)

def _native_drain_probe_impl(ctx):
    return _java_action(ctx, "drainprobe", [], {}, "AttuneDrainProbe")

native_drain_probe = rule(
    implementation = _native_drain_probe_impl,
    doc = "Emit the test-only bounded-drain fault fixture over deterministic faulty streams.",
    attrs = {
        "_launcher": _LAUNCHER,
    },
    toolchains = _JAVA_TOOLCHAINS,
)

def _native_study_stage_impl(ctx):
    inputs = ctx.files.inputs
    if len(inputs) != len(ctx.attr.input_names):
        fail("%s: each stage input needs exactly one name" % ctx.label.name)
    jars = _runtime_jars(ctx.attr.java_deps)
    declared = ctx.files.srcs + inputs + jars + ctx.files.native_libs
    properties = {
        "stage": ctx.attr.stage,
        "label": ctx.label.name,
        "tests": _paths(ctx.files.srcs),
        "inputs": ",".join([name + "=" + file.path for name, file in zip(ctx.attr.input_names, inputs)]),
        "jars": _paths(jars),
        "libs": _paths(ctx.files.native_libs),
        "isolation": ctx.attr.isolation,
    }
    if ctx.file.receipt_plan:
        declared.append(ctx.file.receipt_plan)
        properties["plan"] = ctx.file.receipt_plan.path
        freshness = ctx.var.get("attune_measurement_freshness", "")
        if freshness:
            properties["freshness"] = freshness
    if ctx.attr.isolation == "unshare":
        declared += [ctx.file.unshare_binary] + ctx.files.unshare_closure
        properties["unshare"] = ctx.file.unshare_binary.path
    return _java_action(ctx, "stage", declared, properties, "AttuneStudyStage")

_native_study_stage = rule(
    implementation = _native_study_stage_impl,
    doc = "Run the pinned native Tester over explicit stage sources and emit one declared tree.",
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "inputs": attr.label_list(allow_files = True),
        "input_names": attr.string_list(),
        "stage": attr.string(mandatory = True),
        "receipt_plan": attr.label(allow_single_file = True),
        "java_deps": attr.label_list(providers = [JavaInfo]),
        "native_libs": attr.label_list(allow_files = True),
        "isolation": attr.string(values = ["unshare", "platform"], default = "unshare"),
        "unshare_binary": attr.label(allow_single_file = True),
        "unshare_closure": attr.label(allow_files = True),
        "_launcher": _LAUNCHER,
    },
    toolchains = _JAVA_TOOLCHAINS,
)

def native_study_stage(name, stage, srcs, inputs = [], input_names = [], receipt_plan = None, java_deps = [], native_libs = [], host_isolation = False, **kwargs):
    """Run a Flix artifact-writing stage with named inputs and one output tree.

    Args:
      name: target and output tree name.
      stage: operation selected by the Flix stage.
      srcs: explicit Flix sources.
      inputs: one artifact per name in input_names.
      input_names: names the stage uses to open its declared inputs.
      receipt_plan: optional bounded process plan, executed before the stage.
      java_deps: dependency jars for the compiler.
      native_libs: prepared shared libraries for a native boundary.
      host_isolation: require the local user/network namespace.
      **kwargs: forwarded to the underlying rule.
    """
    if len(inputs) != len(input_names):
        fail("native_study_stage %s: %d inputs but %d names" % (name, len(inputs), len(input_names)))
    unshare_binary = _UNSHARE
    unshare_closure = _CLOSURE
    if host_isolation:
        isolation = "unshare"
    else:
        isolation = select({
            _PLATFORM_ISOLATION: "platform",
            "//conditions:default": "unshare",
        })
        unshare_binary = select({
            _PLATFORM_ISOLATION: None,
            "//conditions:default": _UNSHARE,
        })
        unshare_closure = select({
            _PLATFORM_ISOLATION: None,
            "//conditions:default": _CLOSURE,
        })
    _native_study_stage(
        name = name,
        stage = stage,
        srcs = srcs,
        inputs = inputs,
        input_names = input_names,
        receipt_plan = receipt_plan,
        java_deps = java_deps,
        native_libs = native_libs,
        isolation = isolation,
        unshare_binary = unshare_binary,
        unshare_closure = unshare_closure,
        **kwargs
    )

def _attune_source_tree_impl(ctx):
    return _java_action(ctx, "copytree", ctx.files.srcs, {"sources": _paths(ctx.files.srcs)}, "AttuneSourceTree")

attune_source_tree = rule(
    implementation = _attune_source_tree_impl,
    doc = "Copy explicit declared regular files into one declared immutable tree.",
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "_launcher": _LAUNCHER,
    },
    toolchains = _JAVA_TOOLCHAINS,
)

def _attune_declared_record_impl(ctx):
    out = ctx.actions.declare_file(ctx.label.name + ".tsv")
    ctx.actions.write(out, "\t".join([ctx.attr.kind] + ctx.attr.fields) + "\n")
    return [DefaultInfo(files = depset([out]))]

attune_declared_record_file = rule(
    implementation = _attune_declared_record_impl,
    doc = "Write one declared TSV record without inferring fields from target names.",
    attrs = {
        "kind": attr.string(mandatory = True),
        "fields": attr.string_list(mandatory = True),
    },
)

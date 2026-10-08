"""Bazel-owned native Flix test rules for the Attune v2 bootstrap.

Native Flix `@Test` declarations are the only first-party executable
entrypoints. Each test target compiles explicit declared Flix sources with the
pinned 0.76.1 compiler's authentic native test engine, inside the declared
pinned user/network namespace, with no synthesized `flix.toml` project mode, no
authored application main, no fat JAR, no custom test engine and no registry.

Isolation has exactly two declared modes, and the mechanical boundary never
claims one it did not create. The ordinary gate leaves the isolation condition
unset and runs inside the pinned util-linux `unshare` user/network namespace.
The opt-in `--config=remote` profile sets `platform_native_isolation`, so a
remote action declares neither that Nix-store binary nor its closure and runs
directly in the declared provider container, whose own `dockerNetwork=off`
property denies the guest network.

The only Java involved is the small mechanical launcher in
`//platform/tools/boundary`, which prepares the metadata manifest and the
process boundary. Policy,
classification, verdict formatting, fixture cases and isolation assertions live
in Flix.
"""

load("@rules_java//java/common:java_info.bzl", "JavaInfo")

_UNSHARE = "@unshare//:bin/unshare"
_CLOSURE = "@unshare//:closure"
_FLIX = "@flix_compiler//jar"

# The one declared locale boundary for every action that runs the mechanical
# launcher. A JVM derives `sun.jnu.encoding` from the process locale, and the
# C/POSIX locale maps to `ANSI_X3.4-1968`, where `Path.of` rejects any path that
# is not representable in ASCII. The pinned corpus carries arbitrary valid
# UTF-8 source paths, so the boundary names the one locale that is UTF-8 while
# staying byte-transparent: `C.UTF-8` is provided by glibc itself from 2.35 on,
# needs no generated locale archive, and changes no collation or classification
# rule relative to `C`. The same locale is set for the launcher's inner step in
# `NativeLaunch`, so the parent and the child resolve declared paths under the
# identical encoding. Nothing about the filenames or the source bytes is
# normalized, renamed or excluded: only the boundary is named.
_LOCALE_ENV = {"LANG": "C.UTF-8"}

# The declared isolation condition. Left unset, the native actions run inside
# the pinned util-linux user/network namespace and carry its binary and library
# closure as declared inputs. The opt-in `--config=remote` profile sets it, so
# a remotely executed native action instead relies on the declared execution
# platform's own container and its `dockerNetwork=off` property: the action
# then declares neither the host Nix `unshare` binary nor its closure, because
# that binary is a Nix-store ELF that cannot execute in the provider image, and
# claiming the local namespace would be false there.
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

def native_flix_test(name, srcs, size = "small", tags = [], data = [], host_isolation = False):
    """Run explicit declared Flix `@Test` declarations under the declared isolation mode.

    `host_isolation` pins a target to the host `unshare` boundary in every
    configuration, for the one fixture family whose assertions are about that
    local boundary. Such a target must also be tagged `no-remote`, and it can
    never be the evidence for a remote native run.
    """
    _native_test(name, srcs, ["-Dattune.mode=native"], [], size, tags, data, host_isolation)

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

def native_flix_java_test(name, srcs, java_deps, declared_files = [], native_libs = [], size = "small", tags = [], data = [], checkout_files = [], workspace_root = None):
    """Run native Flix `@Test` declarations against explicit prepared JVM jars.

    The declared Flix sources are compiled and executed by the pinned compiler's
    authentic native test engine with the dependency jars passed explicitly as
    the compiler's class path. No `flix.toml` project is synthesized and no
    dependency resolver runs; this is the explicit source/dependency route.

    `declared_files` names the data files the fixture may read, by their
    workspace-relative paths, and `native_libs` the prepared shared libraries it
    may load. Both are declared inputs: the launcher resolves them and binds the
    names on JVM properties, so no fixture reaches for a path of its own.

    `checkout_files` names documents that live at the checkout root *outside*
    this nested workspace (the maintained `README.md` and `LICENSE`). The
    launcher derives the checkout root from the recorded `workspace_root` file
    and binds each name to that real path, so a live document check reads the
    actual checked-in bytes. The target that uses it is local and uncached.
    """
    manifest = name + "_jars"
    java_jar_manifest(name = manifest, deps = java_deps)
    flags = [
        "-Dattune.mode=java",
        "-Dattune.jars=$(rlocationpath :%s)" % manifest,
    ]
    extra_data = [":" + manifest]
    if declared_files:
        files_manifest = name + "_declared"
        declared_manifest(name = files_manifest, srcs = declared_files)
        flags.append("-Dattune.fixtures=$(rlocationpath :%s)" % files_manifest)
        extra_data.append(":" + files_manifest)

        # The declared files themselves are data too: the launcher resolves each
        # one inside the runfiles tree, so the fixture reads exactly the bytes
        # the build declared rather than a path of its own.
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
    _native_test(
        name,
        srcs,
        flags,
        extra_data,
        size,
        tags,
        data,
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

def _native_producer_impl(ctx):
    runtime = ctx.toolchains["@bazel_tools//tools/jdk:runtime_toolchain_type"].java_runtime
    out = ctx.actions.declare_directory(ctx.label.name)
    classpath = depset(transitive = [
        ctx.attr._launcher[JavaInfo].transitive_runtime_jars,
    ]).to_list()
    jars = depset(transitive = [
        dependency[JavaInfo].transitive_runtime_jars
        for dependency in ctx.attr.java_deps
    ]).to_list()
    sources = [source.path for source in ctx.files.srcs]
    export = [source.path for source in ctx.files.export]
    bindings = [binding.path for binding in ctx.files.declared_files]
    args = ctx.actions.args()
    args.add("-cp")
    args.add_joined(classpath, join_with = ":")
    args.add("-Dattune.mode=produce")
    args.add("-Dattune.outputs=" + out.path)
    args.add("-Dattune.tests=" + ",".join(sources))
    args.add("-Dattune.export=" + ",".join(export))
    if jars:
        args.add("-Dattune.jars=" + ",".join([jar.path for jar in jars]))
    if bindings:
        args.add("-Dattune.bindings=" + ",".join(bindings))
    args.add("attune.tools.boundary.NativeLaunch")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = [args],
        inputs = depset(
            ctx.files.srcs + ctx.files.export + ctx.files.declared_files + jars + classpath,
            transitive = [runtime.files],
        ),
        outputs = [out],
        env = _LOCALE_ENV,
        mnemonic = "AttuneNativeProducer",
        progress_message = "Materializing declared native tree %{label}",
    )
    return [DefaultInfo(files = depset([out]))]

_native_flix_producer = rule(
    implementation = _native_producer_impl,
    doc = "Run the pinned native Tester over explicit sources and jars and emit one declared tree.",
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "export": attr.label_list(allow_files = True),
        "declared_files": attr.label_list(allow_files = True),
        "java_deps": attr.label_list(providers = [JavaInfo]),
        "_launcher": attr.label(
            default = "//platform/tools/boundary:native_launch",
            providers = [JavaInfo],
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

def native_flix_producer(name, srcs, export = [], declared_files = [], java_deps = [], **kwargs):
    """Run the pinned native Tester and emit a declared immutable source tree.

    The action compiles and executes the explicit declared Flix `@Test` sources
    with the pinned compiler's authentic native test engine over the explicit
    declared dependency jars, then materializes one declared tree artifact: an
    immutable regular-file copy of each exported source under `sources/` beside a
    mechanical `closure.tsv` naming the exact source, jar and binding closure.
    The `export` files are the sources the tree carries (defaulting to `srcs`);
    `srcs` also covers any producer law that must run but must not be exported.

    A non-zero Tester verdict fails the action, so a downstream consumer can only
    depend on a tree the pinned engine actually accepted. This is a build action,
    not an authored application main: the compiler's own engine decides the
    verdict, and the mechanical launcher only resolves declared paths and copies
    bytes.

    Args:
      name: the producer target name, which also names its declared tree output.
      srcs: the explicit declared Flix sources the pinned Tester compiles.
      export: the sources the emitted tree carries (defaults to `srcs`).
      declared_files: the declared data bindings named in the closure.
      java_deps: the explicit dependency jar closure passed to the Tester.
      **kwargs: forwarded to the underlying rule.
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
    runtime = ctx.toolchains["@bazel_tools//tools/jdk:runtime_toolchain_type"].java_runtime
    out = ctx.actions.declare_directory(ctx.label.name)
    classpath = depset(transitive = [
        ctx.attr._launcher[JavaInfo].transitive_runtime_jars,
    ]).to_list()
    args = ctx.actions.args()
    args.add("-cp")
    args.add_joined(classpath, join_with = ":")
    args.add("-Dattune.mode=receipt")
    args.add("-Dattune.outputs=" + out.path)
    args.add("-Dattune.plan=" + ctx.file.plan.path)

    # The scoped freshness token is a declared measurement identity only: it is
    # read from `--define=attune_measurement_freshness=...` and changes this
    # action's key, so a fresh remote run is not served from cache. No world or
    # prediction action reads it, so deterministic scientific artifacts stay
    # cacheable and are never invalidated by a fresh measurement.
    freshness = ctx.var.get("attune_measurement_freshness", "")
    if freshness:
        args.add("-Dattune.freshness=" + freshness)
    args.add("attune.tools.boundary.NativeLaunch")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = [args],
        inputs = depset([ctx.file.plan] + classpath, transitive = [runtime.files]),
        outputs = [out],
        env = _LOCALE_ENV,
        mnemonic = "AttuneProcessReceipt",
        progress_message = "Recording bounded process receipts %{label}",
    )
    return [DefaultInfo(files = depset([out]))]

_native_process_receipt = rule(
    implementation = _native_receipt_impl,
    doc = "Execute one declared bounded argv plan and emit the raw receipt tree.",
    attrs = {
        "plan": attr.label(allow_single_file = True, mandatory = True),
        "_launcher": attr.label(
            default = "//platform/tools/boundary:native_launch",
            providers = [JavaInfo],
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

def native_process_receipt(name, plan, **kwargs):
    """Execute one declared bounded argv plan and emit its receipt tree.

    The action runs the existing mechanical launcher in `receipt` mode over the
    declared plan file: it executes each declared command with concurrent bounded
    log draining, a finite declared timeout and process-tree cleanup, then emits
    one declared tree holding `receipts.tsv` and the bounded per-stream log files.
    A measured nonzero child exit is ordinary receipt data, so the action succeeds
    whenever the receipt was written; it fails only when no receipt could be
    produced. The plan and the interpretation are Flix/Study concerns, not this
    mechanical action's.

    Args:
      name: the producer target name, which also names its declared tree output.
      plan: the declared bounded argv plan, one tab-separated record per command.
      **kwargs: forwarded to the underlying rule.
    """
    _native_process_receipt(name = name, plan = plan, **kwargs)

def _native_drain_probe_impl(ctx):
    runtime = ctx.toolchains["@bazel_tools//tools/jdk:runtime_toolchain_type"].java_runtime
    out = ctx.actions.declare_directory(ctx.label.name)
    classpath = depset(transitive = [
        ctx.attr._launcher[JavaInfo].transitive_runtime_jars,
    ]).to_list()
    args = ctx.actions.args()
    args.add("-cp")
    args.add_joined(classpath, join_with = ":")
    args.add("-Dattune.mode=drainprobe")
    args.add("-Dattune.outputs=" + out.path)
    args.add("attune.tools.boundary.NativeLaunch")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = [args],
        inputs = depset(classpath, transitive = [runtime.files]),
        outputs = [out],
        env = _LOCALE_ENV,
        mnemonic = "AttuneDrainProbe",
        progress_message = "Recording bounded drain fault fixture %{label}",
    )
    return [DefaultInfo(files = depset([out]))]

_native_drain_probe = rule(
    implementation = _native_drain_probe_impl,
    doc = "Emit the test-only bounded-drain fault fixture over deterministic faulty streams.",
    attrs = {
        "_launcher": attr.label(
            default = "//platform/tools/boundary:native_launch",
            providers = [JavaInfo],
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

def native_drain_probe(name, **kwargs):
    """Emit the test-only bounded-drain fault fixture tree.

    The action runs the existing mechanical launcher in `drainprobe` mode: it
    drives the *production* bounded drain over a stream that fails after a
    bounded prefix and over a log store that cannot be opened, beside an
    ordinary clean drain, and emits one declared tree holding the production
    receipt records for those cases. It is a declared fault fixture for the
    native laws, not a production fault endpoint or a new entrypoint: the
    launcher decides no policy and the Flix consumer owns the interpretation.

    Args:
      name: the producer target name, which also names its declared tree output.
      **kwargs: forwarded to the underlying rule.
    """
    _native_drain_probe(name = name, **kwargs)

def _native_study_stage_impl(ctx):
    runtime = ctx.toolchains["@bazel_tools//tools/jdk:runtime_toolchain_type"].java_runtime
    out = ctx.actions.declare_directory(ctx.label.name)
    classpath = depset(transitive = [
        ctx.attr._launcher[JavaInfo].transitive_runtime_jars,
    ]).to_list()
    sources = [source.path for source in ctx.files.srcs]
    inputs = ctx.files.inputs
    if len(inputs) != len(ctx.attr.input_names):
        fail("native_study_stage %s: %d declared inputs but %d names" % (
            ctx.label.name,
            len(inputs),
            len(ctx.attr.input_names),
        ))
    specs = [ctx.attr.input_names[index] + "=" + inputs[index].path for index in range(len(inputs))]
    jars = depset(transitive = [
        dependency[JavaInfo].transitive_runtime_jars
        for dependency in ctx.attr.java_deps
    ]).to_list()

    # The declared isolation flags match the native test route: an ordinary
    # action runs inside the pinned `unshare` namespace, while the opt-in remote
    # profile runs directly in the provider container and declares neither the
    # Nix-store binary nor its closure.
    declared_inputs = list(ctx.files.srcs) + list(inputs) + list(classpath) + jars
    declared_inputs.extend(ctx.files.world_sources)
    declared_inputs.extend(ctx.files.native_libs)
    # A population a stage opens through a declared path manifest carries no
    # binding name of its own, so its bytes are declared here: the manifest names
    # the action paths, and these are the artifacts those paths name. Without
    # this the action would name a path it never declared as an input.
    declared_inputs.extend(ctx.files.extra_inputs)
    args = ctx.actions.args()
    if jars:
        args.add("-Dattune.jars=" + ",".join([jar.path for jar in jars]))
    if ctx.attr.native_libs:
        # A stage law that drives the pinned native Grit engine names the prepared
        # shared library here, exactly as the native Java test route does. The
        # launcher only makes the declared paths absolute and forwards them; it
        # loads nothing and decides nothing.
        args.add("-Dattune.libs=" + ",".join([library.path for library in ctx.files.native_libs]))
    if ctx.files.world_sources:
        # A whole-world stage (the clean-source extraction) declares every source
        # byte of one exact world here. A world can carry thousands of files, so
        # the declared list is written to a declared manifest file and bound as
        # `world_manifest` rather than joined onto the command line: a single
        # argument would exceed the platform's argument-length limit. The
        # launcher rewrites that manifest into the absolute-path `worldsources`
        # binding, so the stage law reads the exact declared source set rather
        # than a path of its own.
        world_manifest = ctx.actions.declare_file(ctx.label.name + ".worldsources.txt")
        ctx.actions.write(
            world_manifest,
            "\n".join([source.path for source in ctx.files.world_sources]) + "\n",
        )
        args.add("-Dattune.world_manifest=" + world_manifest.path)
        declared_inputs.append(world_manifest)
    if ctx.file.receipt_plan:
        # A declared measurement stage: the launcher executes this bounded argv
        # plan through the mechanical receipt boundary before the stage law runs,
        # so the law reduces real receipts rather than a fabricated record. The
        # scoped freshness token is a measurement identity only; without it the
        # stage stays cacheable.
        args.add("-Dattune.plan=" + ctx.file.receipt_plan.path)
        declared_inputs.append(ctx.file.receipt_plan)
        freshness = ctx.var.get("attune_measurement_freshness", "")
        if freshness:
            args.add("-Dattune.freshness=" + freshness)
    if ctx.attr.isolation == "unshare":
        args.add("-Dattune.isolation=unshare")
        args.add("-Dattune.unshare=" + ctx.file.unshare_binary.path)
        declared_inputs.append(ctx.file.unshare_binary)
        declared_inputs.extend(ctx.files.unshare_closure)
    else:
        args.add("-Dattune.isolation=platform")
    args.add("-cp")
    args.add_joined(classpath, join_with = ":")
    args.add("-Dattune.mode=stage")
    args.add("-Dattune.stage=" + ctx.attr.stage)
    args.add("-Dattune.label=" + ctx.label.name)
    if ctx.attr.deadline_seconds > 0:
        # A stage that declares a bounded wall-clock deadline hands it to the
        # existing mechanical launcher, which kills the stage's child worker
        # out-of-process when the declared bound is exceeded. No in-process
        # cancellation is created or claimed; the world stays a partial UNKNOWN.
        args.add("-Dattune.stage_deadline=" + str(ctx.attr.deadline_seconds))
    args.add("-Dattune.outputs=" + out.path)
    args.add("-Dattune.tests=" + ",".join(sources))
    if specs:
        args.add("-Dattune.inputs=" + ",".join(specs))
    args.add("attune.tools.boundary.NativeLaunch")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = [args],
        inputs = depset(declared_inputs, transitive = [runtime.files]),
        outputs = [out],
        env = _LOCALE_ENV,
        mnemonic = "AttuneStudyStage",
        progress_message = "Materializing declared study stage %{label}",
    )
    return [DefaultInfo(files = depset([out]))]

_native_study_stage = rule(
    implementation = _native_study_stage_impl,
    doc = "Run the pinned native Tester over explicit stage sources and emit one declared tree.",
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "inputs": attr.label_list(allow_files = True),
        "input_names": attr.string_list(),
        "stage": attr.string(mandatory = True),
        "receipt_plan": attr.label(allow_single_file = True),
        "deadline_seconds": attr.int(default = 0),
        "java_deps": attr.label_list(providers = [JavaInfo]),
        "native_libs": attr.label_list(allow_files = True),
        "world_sources": attr.label_list(allow_files = True),
        "extra_inputs": attr.label_list(allow_files = True),
        "isolation": attr.string(values = ["unshare", "platform"], default = "unshare"),
        "unshare_binary": attr.label(allow_single_file = True),
        "unshare_closure": attr.label(allow_files = True),
        "_launcher": attr.label(
            default = "//platform/tools/boundary:native_launch",
            providers = [JavaInfo],
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

def native_study_stage(name, stage, srcs, inputs = [], input_names = [], receipt_plan = None, java_deps = [], native_libs = [], world_sources = [], extra_inputs = [], host_isolation = False, deadline_seconds = 0, **kwargs):
    """Materialize one declared study stage tree through the authentic native Tester.

    The action runs the pinned compiler's authentic native test engine over the
    explicit declared stage sources with the declared input artifacts bound by
    name, then materializes the declared output tree that stage's law wrote into.
    The launcher decides no policy: it creates the output directory, binds the
    inputs and the exact output location, and fails when the engine failed or the
    law wrote nothing.

    `inputs` and `input_names` are positional pairs: each declared input artifact
    is bound under the matching name, so the stage law resolves a declared name
    rather than a path of its own. Each input must resolve to exactly one
    artifact.

    `receipt_plan` names a declared bounded argv plan the launcher executes
    through the mechanical process-receipt boundary before the stage law runs;
    the law then reduces the real receipts. `java_deps` names the explicit
    dependency jars a Java-backed stage law (the Arrow Parquet reducer) compiles
    and runs against. `native_libs` names the prepared shared libraries a stage
    law that drives the pinned native Grit engine loads. `world_sources` names a
    whole declared world source set: the launcher rewrites it into an
    absolute-path manifest bound as `worldsources`, so a clean-source extraction
    stage reads exactly the declared source bytes.

    Args:
      name: the stage target name, which also names its declared tree output.
      stage: the declared stage identity the law dispatches on.
      srcs: the explicit declared Flix stage sources.
      inputs: the declared input artifacts, in the same order as `input_names`.
      input_names: the declared binding name of each input.
      receipt_plan: the declared bounded argv plan this measurement stage executes.
      java_deps: the explicit dependency jars a Java-backed stage law consumes.
      native_libs: the prepared shared libraries a native-engine stage law loads.
      world_sources: the declared whole-world source set a stage reads by path.
      extra_inputs: declared artifacts the stage opens through a declared path
        manifest. They carry no binding name of their own, so a population a
        stage names by manifest declares its own bytes here.
      host_isolation: pins the host `unshare` boundary instead of the portable route.
      deadline_seconds: the declared out-of-process wall-clock bound, or 0 for the
        ordinary unbounded wait; a stage that declares one is killed by the
        launcher when it exceeds the bound and stays a partial UNKNOWN.
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
        deadline_seconds = deadline_seconds,
        java_deps = java_deps,
        native_libs = native_libs,
        world_sources = world_sources,
        extra_inputs = extra_inputs,
        isolation = isolation,
        unshare_binary = unshare_binary,
        unshare_closure = unshare_closure,
        **kwargs
    )

def _attune_source_tree_impl(ctx):
    runtime = ctx.toolchains["@bazel_tools//tools/jdk:runtime_toolchain_type"].java_runtime
    out = ctx.actions.declare_directory(ctx.label.name)
    classpath = depset(transitive = [
        ctx.attr._launcher[JavaInfo].transitive_runtime_jars,
    ]).to_list()
    sources = [source.path for source in ctx.files.srcs]
    args = ctx.actions.args()
    args.add("-cp")
    args.add_joined(classpath, join_with = ":")
    args.add("-Dattune.mode=copytree")
    args.add("-Dattune.outputs=" + out.path)
    args.add("-Dattune.sources=" + ",".join(sources))
    args.add("attune.tools.boundary.NativeLaunch")
    ctx.actions.run(
        executable = runtime.java_executable_exec_path,
        arguments = [args],
        inputs = depset(ctx.files.srcs + classpath, transitive = [runtime.files]),
        outputs = [out],
        env = _LOCALE_ENV,
        mnemonic = "AttuneSourceTree",
        progress_message = "Materializing immutable source tree %{label}",
    )
    return [DefaultInfo(files = depset([out]))]

_attune_source_tree = rule(
    implementation = _attune_source_tree_impl,
    doc = "Copy explicit declared regular files into one declared immutable tree.",
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "_launcher": attr.label(
            default = "//platform/tools/boundary:native_launch",
            providers = [JavaInfo],
        ),
    },
    toolchains = ["@bazel_tools//tools/jdk:runtime_toolchain_type"],
)

def attune_source_tree(name, srcs, **kwargs):
    """Declare one immutable regular-file source tree.

    The action copies each explicit declared regular file into one declared
    output directory and records the mechanical listing. A baseline/A/B/AB
    variant is therefore an immutable tree artifact, not a mutable shared
    worktree; the rule decides nothing about the content.

    Args:
      name: the tree target name, which also names its declared tree output.
      srcs: the explicit declared regular files the tree carries.
      **kwargs: forwarded to the underlying rule.
    """
    _attune_source_tree(name = name, srcs = srcs, **kwargs)

def _attune_declared_record_impl(ctx):
    out = ctx.actions.declare_file(ctx.label.name + ".tsv")
    ctx.actions.write(out, "\t".join([ctx.attr.kind] + ctx.attr.fields) + "\n")
    return [DefaultInfo(files = depset([out]))]

attune_declared_record_file = rule(
    implementation = _attune_declared_record_impl,
    doc = """Materialize one declared record from the admitted manifest's authority.

    The admitted manifest is the single declared authority for the small records
    the study graph derives from it: one task's anchor token and one declared
    theory shard's world, index and candidate count. This rule writes exactly
    those declared cells as the declared stage input the consumer reads, so no
    second hand-authored record can drift from the manifest and the consumer
    never parses a path or target name to recover a declared value.
    """,
    attrs = {
        "kind": attr.string(mandatory = True),
        "fields": attr.string_list(mandatory = True),
    },
)

def native_flix_anchor_file(name, token):
    """Emit one task's declared anchor record.

    The admitted gold-free manifest is the single declared authority for each
    task's anchor token; this helper writes that one token as the declared stage
    input the cheap join consumes, so no second hand-authored anchor file can
    drift from the manifest.

    Args:
      name: the target name.
      token: the anchor token the manifest declared for this task.
    """
    attune_declared_record_file(name = name, kind = "anchor", fields = [token])

def native_flix_shard_file(name, world, index, count):
    """Emit one declared shard record from the admitted manifest's authority.

    The admitted manifest's own `shard` row is the single declared authority for
    a declared per-index theory node: the world it belongs to, the node's own
    index and the candidate count declared for that slice. The index is declared
    data, not a guess parsed out of the target's own name.

    Args:
      name: the target name.
      world: the world the declared shard row belongs to.
      index: the declared shard index this node materializes.
      count: the candidate count the manifest declared for that slice.
    """
    attune_declared_record_file(name = name, kind = "shard", fields = [world, index, count])

def native_flix_consumer_test(name, srcs, produced, java_deps = [], declared_files = [], native_libs = [], size = "small", tags = [], data = []):
    """Run native `@Test` laws over the declared trees a producer emitted.

    Each `produced` tree is a declared input, not an undeclared test output: the
    launcher walks it and writes the measured listing, records the declared
    `name=path` bindings, and appends the tree's own Flix sources to the pinned
    Tester's file list. The consumer therefore compiles the producer's exported
    source and asserts the tree's contract over the actual declared bytes.

    When `java_deps` is given the consumer compiles through the same explicit
    JVM class path route the producer did, so a consumer whose laws import a
    source owner that reaches a prepared Java seam (the pinned Grit engine) still
    resolves it; without `java_deps` the consumer stays on the pure native route.

    Args:
      name: the consumer test target name.
      srcs: the consumer's own explicit declared Flix law sources.
      produced: the producer targets whose declared trees this test consumes.
      java_deps: the explicit dependency jars the consumer compiles against.
      declared_files: the declared sources the laws compare the trees against.
      native_libs: the prepared shared libraries the consumer may load.
      size: the Bazel test size.
      tags: the Bazel test tags.
      data: additional declared test data.
    """
    flags = ["-Dattune.produced=" + _rlocation(produced)]
    extra_data = list(produced)
    if java_deps:
        manifest = name + "_jars"
        java_jar_manifest(name = manifest, deps = java_deps)
        flags.append("-Dattune.mode=java")
        flags.append("-Dattune.jars=$(rlocationpath :%s)" % manifest)
        extra_data.append(":" + manifest)
    else:
        flags.append("-Dattune.mode=native")
    if native_libs:
        flags.append("-Dattune.libs=" + _rlocation(native_libs))
        extra_data.extend(native_libs)
    if declared_files:
        files_manifest = name + "_declared"
        declared_manifest(name = files_manifest, srcs = declared_files)
        flags.append("-Dattune.fixtures=$(rlocationpath :%s)" % files_manifest)
        extra_data.append(":" + files_manifest)
        extra_data.extend(declared_files)
    _native_test(name, srcs, flags, extra_data, size, tags, data)

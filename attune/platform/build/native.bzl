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

# The declared isolation condition. Left unset, the native actions run inside
# the pinned util-linux user/network namespace and carry its binary and library
# closure as declared inputs. The opt-in `--config=remote` profile sets it, so
# a remotely executed native action instead relies on the declared execution
# platform's own container and its `dockerNetwork=off` property: the action
# then declares neither the host Nix `unshare` binary nor its closure, because
# that binary is a Nix-store ELF that cannot execute in the provider image, and
# claiming the local namespace would be false there.
_PLATFORM_ISOLATION = "//platform/build:platform_native_isolation"

def _isolation_data(host_isolation):
    if host_isolation:
        return [_UNSHARE, _CLOSURE]
    return select({
        _PLATFORM_ISOLATION: [],
        "//conditions:default": [_UNSHARE, _CLOSURE],
    })

def _isolation_flags(host_isolation):
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
        data = srcs + _isolation_data(host_isolation) + [_FLIX] + extra_data + data,
        jvm_flags = flags + [
            "-Dattune.tests=" + _rlocation(srcs),
            "-Dattune.flix=$(rlocationpath %s)" % _FLIX,
        ] + _isolation_flags(host_isolation),
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

def native_flix_consumer_test(name, srcs, produced, declared_files = [], size = "small", tags = [], data = []):
    """Run native `@Test` laws over the declared trees a producer emitted.

    Each `produced` tree is a declared input, not an undeclared test output: the
    launcher walks it and writes the measured listing, records the declared
    `name=path` bindings, and appends the tree's own Flix sources to the pinned
    Tester's file list. The consumer therefore compiles the producer's exported
    source and asserts the tree's contract over the actual declared bytes.

    Args:
      name: the consumer test target name.
      srcs: the consumer's own explicit declared Flix law sources.
      produced: the producer targets whose declared trees this test consumes.
      declared_files: the declared sources the laws compare the trees against.
      size: the Bazel test size.
      tags: the Bazel test tags.
      data: additional declared test data.
    """
    flags = ["-Dattune.mode=native", "-Dattune.produced=" + _rlocation(produced)]
    extra_data = list(produced)
    if declared_files:
        files_manifest = name + "_declared"
        declared_manifest(name = files_manifest, srcs = declared_files)
        flags.append("-Dattune.fixtures=$(rlocationpath :%s)" % files_manifest)
        extra_data.append(":" + files_manifest)
        extra_data.extend(declared_files)
    _native_test(name, srcs, flags, extra_data, size, tags, data)

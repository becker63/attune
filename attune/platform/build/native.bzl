"""Bazel-owned native Flix test rules for the Attune v2 bootstrap.

Native Flix `@Test` declarations are the only first-party executable
entrypoints. Each test target compiles explicit declared Flix sources with the
pinned 0.76.1 compiler's authentic native test engine, inside the declared
pinned user/network namespace, with no synthesized `flix.toml` project mode, no
authored application main, no fat JAR, no custom test engine and no registry.

The only Java involved is the small mechanical launcher in
`//platform/tools/boundary`, which prepares the metadata manifest and the
process boundary. Policy,
classification, verdict formatting, fixture cases and isolation assertions live
in Flix.
"""

_UNSHARE = "@unshare//:bin/unshare"
_CLOSURE = "@unshare//:closure"
_FLIX = "@flix_compiler//jar"

def _rlocation(labels):
    return ",".join(["$(rlocationpath %s)" % label for label in labels])

def _native_test(name, srcs, flags, extra_data, size, tags, data):
    native.java_test(
        name = name,
        size = size,
        main_class = "attune.tools.boundary.NativeLaunch",
        use_testrunner = False,
        runtime_deps = ["//platform/tools/boundary:native_launch"],
        data = srcs + [_UNSHARE, _CLOSURE, _FLIX] + extra_data + data,
        jvm_flags = flags + [
            "-Dattune.tests=" + _rlocation(srcs),
            "-Dattune.flix=$(rlocationpath %s)" % _FLIX,
            "-Dattune.unshare=$(rlocationpath %s)" % _UNSHARE,
        ],
        tags = tags,
    )

def native_flix_test(name, srcs, size = "small", tags = [], data = []):
    """Run explicit declared Flix `@Test` declarations in the pinned namespace."""
    _native_test(name, srcs, ["-Dattune.mode=native"], [], size, tags, data)

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

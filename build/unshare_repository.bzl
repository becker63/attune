"""Declares the pinned util-linux `unshare` tool and its runtime closure.

The tool comes from the pinned Nix developer shell (`flake.nix`), which is the
only place `unshare`, `ldd` and `readelf` are provisioned. This rule resolves
`unshare` on PATH, verifies the pinned util-linux version, and symlinks the
binary plus every shared object the dynamic linker reports into the external
repository, so Bazel tracks the real runtime closure as declared inputs. No
readiness cache path is hardcoded and no workspace file is read.
"""

# util-linux 2.42.x is the pinned developer-shell series.
_PINNED_VERSION_PREFIX = "unshare from util-linux 2.42."

def _symlink_closure(repository_ctx, unshare, paths):
    """Symlink each absolute library path under lib/, keeping the basename."""
    seen = {}
    index = 0
    for path in paths:
        name = path.split("/")[-1]
        if name in seen or name == "":
            continue
        seen[name] = True
        repository_ctx.symlink(path, "lib/%d-%s" % (index, name))
        index += 1

def _closure_from_ldd(repository_ctx, ldd, unshare):
    result = repository_ctx.execute([ldd, unshare])
    if result.return_code != 0:
        return []
    paths = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if "=>" not in line:
            continue
        # "libc.so.6 => /nix/store/.../libc.so.6 (0x...)"
        target = line.split("=>", 1)[1].strip().split(" ")[0]
        if target.startswith("/"):
            paths.append(target)
    return paths

def _closure_from_readelf(repository_ctx, readelf, unshare):
    result = repository_ctx.execute([readelf, "-d", unshare])
    if result.return_code != 0:
        return []
    runpaths = []
    needed = []
    for line in result.stdout.splitlines():
        if "(RUNPATH)" in line or "(RPATH)" in line:
            for part in line.split("Library runpath:")[1:]:
                for entry in part.replace("[", " ").replace("]", " ").split(":"):
                    entry = entry.strip()
                    if entry.startswith("/"):
                        runpaths.append(entry)
        elif "(NEEDED)" in line and "Shared library:" in line:
            name = line.split("Shared library:", 1)[1].strip().strip("[]")
            needed.append(name)
    paths = []
    for name in needed:
        for directory in runpaths:
            paths.append("%s/%s" % (directory, name))
    return paths

def _local_unshare_impl(repository_ctx):
    unshare = repository_ctx.which("unshare")
    if unshare == None:
        fail("pinned util-linux `unshare` not found on PATH; run Bazel from the Nix developer shell (`services.yaml`)")

    version_result = repository_ctx.execute([unshare, "--version"])
    if version_result.return_code != 0:
        fail("`unshare --version` failed: %s" % version_result.stderr)
    version = version_result.stdout.strip().splitlines()[0]
    if not version.startswith(_PINNED_VERSION_PREFIX):
        fail("unexpected unshare version %r; expected a pinned util-linux %s series" % (version, _PINNED_VERSION_PREFIX))

    repository_ctx.symlink(unshare, "bin/unshare")

    paths = []
    ldd = repository_ctx.which("ldd")
    if ldd != None:
        paths = _closure_from_ldd(repository_ctx, ldd, unshare)
    if not paths:
        readelf = repository_ctx.which("readelf")
        if readelf != None:
            paths = _closure_from_readelf(repository_ctx, readelf, unshare)
    if not paths:
        fail("could not resolve the util-linux `unshare` runtime closure; `ldd` and `readelf` are both unavailable")

    _symlink_closure(repository_ctx, unshare, paths)

    repository_ctx.file("BUILD.bazel", """\
package(default_visibility = ["//visibility:public"])

exports_files(["bin/unshare"])

filegroup(
    name = "closure",
    srcs = glob(["lib/*"]),
)
""")

local_unshare = repository_rule(
    implementation = _local_unshare_impl,
    doc = "Pinned util-linux unshare binary and its declared runtime closure.",
    environ = ["PATH"],
)

"""Exposes the live Bazel workspace root to the local read-only audit test.

The live workspace audit must re-read the current tree on every public
`bazel test //...` invocation instead of trusting a declared or cached
inventory. A test action cannot discover the absolute workspace root on its own,
so this repository rule records it once at fetch time. It is the only place the
root path enters the build, and it carries no source content.

Because the value is recorded at fetch time, relocating this workspace requires
refreshing the fetch (for example `bazel sync --configure`, or removing the
fetched `local_workspace` repository from the output base) so the recorded root
matches the live one. The nested-workspace migration performed exactly that.
"""

def _local_workspace_impl(repository_ctx):
    root = str(repository_ctx.workspace_root)
    repository_ctx.file("workspace_root.txt", root + "\n")
    repository_ctx.file("BUILD.bazel", """\
package(default_visibility = ["//visibility:public"])

exports_files(["workspace_root.txt"])
""")

local_workspace = repository_rule(
    implementation = _local_workspace_impl,
    doc = "The live root workspace path, for the local read-only workspace audit.",
)

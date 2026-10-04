"""Exposes the live Bazel workspace root to the local read-only audit test.

The live workspace audit must re-read the current tree on every public
`bazel test //...` invocation instead of trusting a declared or cached
inventory. A test action cannot discover the absolute workspace root on its own,
so this repository rule records it once at fetch time. It is the only place the
root path enters the build, and it carries no source content.
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

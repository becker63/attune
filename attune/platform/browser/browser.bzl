"""Two ordinary actions: Flix sources -> JVM jar -> browser WASM.

Inputs are declared and network-free; eligible actions can run on BuildBuddy.
No provider or native filesystem implementation enters the browser closure.
"""

load("@rules_java//java/common:java_info.bzl", "JavaInfo")

def _jars(deps):
    return depset(transitive = [dep[JavaInfo].transitive_runtime_jars for dep in deps])

def _flix_impl(ctx):
    jars = _jars(ctx.attr.deps)
    out = ctx.actions.declare_file(ctx.label.name + ".jar")
    args = ctx.actions.args()
    args.add(out.path)
    args.add(":".join([jar.path for jar in jars.to_list()]))
    args.add_all(ctx.files.srcs)
    ctx.actions.run(
        executable = ctx.executable._compiler,
        arguments = [args],
        inputs = depset(ctx.files.srcs, transitive = [jars]),
        tools = [ctx.attr._compiler[DefaultInfo].files_to_run],
        outputs = [out],
        mnemonic = "FlixLibrary",
    )
    return [DefaultInfo(files = depset([out])), JavaInfo(output_jar = out, compile_jar = out)]

flix_library = rule(
    implementation = _flix_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = [".flix"]),
        "deps": attr.label_list(providers = [JavaInfo]),
        "_compiler": attr.label(default = ":compile_flix", executable = True, cfg = "exec"),
    },
)

def _wasm_impl(ctx):
    jars = _jars(ctx.attr.deps)
    out = ctx.actions.declare_directory(ctx.label.name)
    args = ctx.actions.args()
    args.add(out.path)
    args.add_joined(jars, join_with = ":")
    ctx.actions.run(
        executable = ctx.executable._compiler,
        arguments = [args],
        inputs = jars,
        tools = [ctx.attr._compiler[DefaultInfo].files_to_run],
        outputs = [out],
        mnemonic = "FlixWasm",
    )
    return [DefaultInfo(files = depset([out]))]

browser_wasm = rule(
    implementation = _wasm_impl,
    attrs = {
        "deps": attr.label_list(providers = [JavaInfo]),
        "_compiler": attr.label(default = ":compile_wasm", executable = True, cfg = "exec"),
    },
)

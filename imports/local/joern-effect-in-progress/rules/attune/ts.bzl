def ts_check(name, command = "pnpm typecheck:direct", srcs = []):
    _ts_check(
        name = name,
        command = command,
        srcs = srcs,
    )

def _ts_check_impl(ctx):
    out = ctx.actions.declare_output(ctx.label.name + ".tscheck.txt")
    ctx.actions.write(out, ctx.attrs.command + "\n")
    return [DefaultInfo(default_output = out)]

_ts_check = rule(
    impl = _ts_check_impl,
    attrs = {
        "command": attrs.string(default = "pnpm typecheck:direct"),
        "srcs": attrs.list(attrs.source(), default = []),
    },
)

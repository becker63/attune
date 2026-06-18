load(":providers.bzl", "AttunePropertyInfo")
load(":validation.bzl", "validate_phase_deps", "validate_phase_name")

def _property_impl(ctx):
    validate_phase_name(ctx.attrs.phase)
    validate_phase_deps(ctx.attrs.phase, ctx.attrs.deps)
    out = ctx.actions.declare_output(ctx.label.name + ".property.json")
    ctx.actions.write_json(out, {
        "cases": ctx.attrs.cases,
        "mode": ctx.attrs.mode,
        "phase": ctx.attrs.phase,
        "requires": ctx.attrs.requires,
    })
    return [DefaultInfo(default_output = out), AttunePropertyInfo(phase = ctx.attrs.phase, mode = ctx.attrs.mode, cases = ctx.attrs.cases)]

attune_property = rule(
    impl = _property_impl,
    attrs = {
        "phase": attrs.string(),
        "mode": attrs.string(default = "property"),
        "srcs": attrs.list(attrs.source(), default = []),
        "deps": attrs.list(attrs.dep(), default = []),
        "contracts": attrs.list(attrs.dep(), default = []),
        "requires": attrs.list(attrs.string(), default = []),
        "cases": attrs.int(default = 100),
    },
)

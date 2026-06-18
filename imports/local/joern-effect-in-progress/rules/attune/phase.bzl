load(":providers.bzl", "AttunePhaseInfo", "AttuneSchemaInfo")
load(":validation.bzl", "validate_phase_deps", "validate_phase_name")

def _phase_manifest_impl(ctx):
    validate_phase_name(ctx.attrs.phase)
    validate_phase_deps(ctx.attrs.phase, ctx.attrs.deps)
    out = ctx.actions.declare_output(ctx.label.name + ".phase.json")
    srcs = [str(src.short_path) for src in ctx.attrs.srcs]
    ctx.actions.write_json(out, {
        "contract": ctx.attrs.contract,
        "phase": ctx.attrs.phase,
        "srcs": srcs,
    })
    return [
        DefaultInfo(default_output = out),
        AttunePhaseInfo(phase = ctx.attrs.phase, contract = ctx.attrs.contract, srcs = ctx.attrs.srcs),
        AttuneSchemaInfo(manifest = out),
    ]

_phase_manifest = rule(
    impl = _phase_manifest_impl,
    attrs = {
        "phase": attrs.string(),
        "srcs": attrs.list(attrs.source(), default = []),
        "contract": attrs.option(attrs.string(), default = None),
        "deps": attrs.list(attrs.dep(), default = []),
    },
)

def _phase_schema_impl(ctx):
    validate_phase_name(ctx.attrs.phase)
    out = ctx.actions.declare_output(ctx.label.name + ".schema.json")
    ctx.actions.write_json(out, {
        "contract": ctx.attrs.contract,
        "phase": ctx.attrs.phase,
    })
    return [DefaultInfo(default_output = out), AttuneSchemaInfo(manifest = out)]

_phase_schema = rule(
    impl = _phase_schema_impl,
    attrs = {
        "phase": attrs.string(),
        "contract": attrs.option(attrs.string(), default = None),
    },
)

def _phase_text_impl(ctx):
    validate_phase_name(ctx.attrs.phase)
    out = ctx.actions.declare_output(ctx.label.name + ".txt")
    ctx.actions.write(out, "{}:{}\n".format(ctx.attrs.kind, ctx.attrs.phase))
    return [DefaultInfo(default_output = out)]

_phase_text = rule(
    impl = _phase_text_impl,
    attrs = {
        "phase": attrs.string(),
        "kind": attrs.string(),
        "srcs": attrs.list(attrs.source(), default = []),
    },
)

def attune_phase(name, phase, srcs = [], contract = None, deps = []):
    validate_phase_name(phase)
    validate_phase_deps(phase, deps)
    _phase_manifest(
        name = name,
        phase = phase,
        srcs = srcs,
        contract = contract,
        deps = deps,
        visibility = ["PUBLIC"],
    )
    _phase_schema(
        name = name + "_schema_manifest",
        phase = phase,
        contract = contract,
        visibility = ["PUBLIC"],
    )
    _phase_text(
        name = name + "_typecheck",
        phase = phase,
        kind = "typecheck",
        srcs = srcs,
        visibility = ["PUBLIC"],
    )
    _phase_text(
        name = name + "_fork",
        phase = phase,
        kind = "fork",
        srcs = srcs,
        visibility = ["PUBLIC"],
    )

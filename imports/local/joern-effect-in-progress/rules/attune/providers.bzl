AttunePhaseInfo = provider(fields = {
    "phase": provider_field(typing.Any, default = None),
    "contract": provider_field(typing.Any, default = None),
    "srcs": provider_field(typing.Any, default = None),
})

AttuneSchemaInfo = provider(fields = {
    "manifest": provider_field(typing.Any, default = None),
})

AttunePropertyInfo = provider(fields = {
    "phase": provider_field(typing.Any, default = None),
    "mode": provider_field(typing.Any, default = None),
    "cases": provider_field(typing.Any, default = None),
})

ForkCheckInfo = provider(fields = {
    "phase": provider_field(typing.Any, default = None),
    "command": provider_field(typing.Any, default = None),
})

_PHASE_ORDER = {
    "pure": 0,
    "bridge": 1,
    "harness": 2,
    "edge": 3,
}

def validate_phase_name(phase):
    if phase not in _PHASE_ORDER:
        fail("unknown Attune phase '{}'; expected pure, bridge, harness, or edge".format(phase))

def phase_from_label(label):
    text = str(label)
    for phase in _PHASE_ORDER:
        if text.endswith(":{}".format(phase)):
            return phase
    return None

def validate_phase_deps(phase, deps):
    validate_phase_name(phase)
    current = _PHASE_ORDER[phase]
    for dep in deps:
        dep_phase = phase_from_label(dep)
        if dep_phase != None and _PHASE_ORDER[dep_phase] > current:
            fail("{} phase cannot depend on {} phase target {}".format(phase, dep_phase, dep))

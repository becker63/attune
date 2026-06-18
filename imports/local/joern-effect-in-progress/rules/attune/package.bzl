load(":phase.bzl", "attune_phase")

def attune_package(
        name,
        pure = [],
        bridge = [],
        harness = [],
        edge = [],
        pure_deps = [],
        bridge_deps = [],
        harness_deps = [],
        edge_deps = []):
    attune_phase(
        name = "pure",
        phase = "pure",
        srcs = pure,
        contract = "src/pure/phase.contract.ts",
        deps = pure_deps,
    )
    attune_phase(
        name = "bridge",
        phase = "bridge",
        srcs = bridge,
        contract = "src/bridge/phase.contract.ts",
        deps = pure_deps + bridge_deps,
    )
    attune_phase(
        name = "harness",
        phase = "harness",
        srcs = harness,
        contract = "src/harness/phase.contract.ts",
        deps = pure_deps + bridge_deps + harness_deps,
    )
    attune_phase(
        name = "edge",
        phase = "edge",
        srcs = edge,
        contract = "src/edge/phase.contract.ts",
        deps = pure_deps + bridge_deps + harness_deps + edge_deps,
    )

"""The admitted analysis manifest: one bounded, gold-free record set.

Native preparation emitted this file beside `analysis.tsv`; the integration
owner admitted it back into the workspace, and the study macro expands it
into the complete world/task/pair fan-out at analysis time. No record here
names an evaluator, a reference patch or an outcome.
"""

ANALYSIS = [
    ["generation", "attune-fixture-panel-2"],
    ["bounds", "groups", "24"],
    ["bounds", "tasks_per_group", "4"],
    ["bounds", "pairs", "32"],
    ["bounds", "pair_groups", "8"],
    ["bounds", "candidates", "256"],
    ["bounds", "shards_per_world", "8"],
    ["bounds", "shard_size", "32"],
    ["world", "w1", "acme/shop", "rev-shop", "gr1t-filetree", "fixtures/world/Shop.flix", "fixtures/world/w1.tsv", "fixtures/descriptors.tsv"],
    ["world", "w2", "acme/tools", "rev-tools", "gr1t-filetree", "fixtures/world/Shop.flix", "fixtures/world/w2.tsv", "fixtures/descriptors.tsv"],
    ["world", "w3", "acme/late", "rev-late", "gr1t-filetree", "fixtures/world/Shop.flix", "fixtures/world/w3.tsv", "fixtures/descriptors_late.tsv"],
    ["group", "g1", "acme/shop", "development"],
    ["group", "g2", "acme/tools", "calibration"],
    ["group", "g3", "acme/lab", "final"],
    ["shard", "w1", "0", "3"],
    ["shard", "w2", "0", "3"],
    ["shard", "w3", "0", "32"],
    ["shard", "w3", "1", "8"],
    ["task", "t1", "g1", "w1", "localization", "File:Shop.flix"],
    ["task", "t2", "g1", "w1", "coordination", "Symbol:Shop.Receipt.render"],
    ["task", "t5", "g1", "w1", "localization", "Symbol:Shop.Absent.render"],
    ["task", "t6", "g1", "w1", "coordination", "Widget:Shop.widget"],
    ["task", "t3", "g2", "w2", "localization", "File:Shop.flix"],
    ["task", "t4", "g2", "w2", "coordination", "Symbol:Shop.Receipt.render"],
    ["task", "t7", "g3", "w3", "localization", "File:Src/Alpha.flix"],
    ["pair", "p1", "g1", "t1", "t2", "w1"],
    ["pair", "p2", "g2", "t3", "t4", "w2"],
]

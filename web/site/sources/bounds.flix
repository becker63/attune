// Source: attune/src/Attune/Theory.flix:100–122
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
    /// The declared bound on positive binary atoms.
    pub def maxAtoms(): Int32 = 3

    /// The declared bound on typed role slots.
    pub def maxRoles(): Int32 = 4

    /// The declared bound on projected output slots.
    pub def maxOutputs(): Int32 = 2

    /// The declared bound on bound inequalities.
    pub def maxInequalities(): Int32 = 1

    /// The declared bound on consistent role renamings canonicalization may use.
    pub def maxRenamings(): Int32 = 24

    /// The declared bound on canonical candidates in one deterministic population.
    pub def maxCandidates(): Int32 = 256

    /// The declared starting shard granularity.
    pub def shardSize(): Int32 = 32

    /// The declared bound on theory shards per world.
    pub def maxShards(): Int32 = 8

// Source: attune/src/Attune/Theory.flix:532–538
// Source SHA-256: 84fcd542f39af9eea12f26ce60c4c539fd53fe64d7ed6be94b9f315d245fad2c
    /// Split one population into world-level shards at the declared granularity.
    pub def shards(population: Population): Shards = {
        let all = if (List.isEmpty(population#kept)) Nil else chunks(shardSize(), population#kept);
        let bounded = List.take(maxShards(), all);
        let total = List.foldLeft((count, shard) -> count + List.length(shard), 0, bounded);
        { shards = bounded, dropped = List.length(population#kept) - total, truncated = List.length(all) > maxShards() }
    }

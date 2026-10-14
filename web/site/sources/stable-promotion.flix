
    /// Whether an outcome promotes its candidate. Only `Relevant` does.
    pub def promotes(outcome: JevOutcome): Bool = outcome == JevOutcome.Relevant

    /// The frozen stable promotion key `(Relevant ? 0 : 1, original base rank)`.
    pub def promotionKey(outcome: JevOutcome, baseRank: Int32): (Int32, Int32) =
        (if (promotes(outcome)) 0 else 1, baseRank)

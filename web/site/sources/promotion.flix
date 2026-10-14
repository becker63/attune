// Source: attune/src/Attune/Study/Jev.flix:56–61
// Source SHA-256: 60f83928cf911830b85c3c2fb7ea3c19145ea7db38449633ba44b959a065d129
    /// Whether an outcome promotes its candidate. Only `Relevant` does.
    pub def promotes(outcome: JevOutcome): Bool = outcome == JevOutcome.Relevant

    /// The frozen stable promotion key `(Relevant ? 0 : 1, original base rank)`.
    pub def promotionKey(outcome: JevOutcome, baseRank: Int32): (Int32, Int32) =
        (if (promotes(outcome)) 0 else 1, baseRank)

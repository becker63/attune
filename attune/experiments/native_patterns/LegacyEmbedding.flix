/// Exact pure ranking excerpt from 1becd02; test-only compatibility reference.
pub mod LegacyEmbedding {
    pub type alias Components = List[Float64]
    pub def dot(left: Components, right: Components): Float64 =
        List.foldLeft2((acc, x, y) -> acc + x * y, 0.0f64, left, right)

    /// The Euclidean norm of one vector: the declared square root `x^0.5` of the
    /// exact inner product with itself. The pinned platform's power primitive is
    /// the one declared route to the square root, so the value is reproducible
    /// from the declared bytes without a second numeric engine.
    pub def norm(vector: Components): Float64 = Float64.pow({base = dot(vector, vector)}, 0.5f64)

    /// The frozen similarity of one query and one candidate vector: cosine on the
    /// two unnormalized vectors. A zero norm would make the ratio undefined, so a
    /// zero-norm side yields zero rather than a fabricated value.
    pub def cosine(searchVector: Components, candidate: Components): Float64 = {
        let denominator = norm(searchVector) * norm(candidate);
        if (denominator == 0.0f64) 0.0f64 else dot(searchVector, candidate) / denominator
    }

    // -------------------------------------------------------------- ranking

    /// One scored candidate: the exact similarity of one candidate path.
    pub type alias Scored = (String, Float64)

    /// The frozen order of two scored candidates: higher similarity first, then
    /// ascending path. The comparison is on the exact `Float64` values, so a
    /// genuinely equal similarity is broken by the path and a similarity that only
    /// differs in its last representable place is still ordered by that difference.
    pub def similarityOrder(left: Scored, right: Scored): Comparison = {
        let leftPath = fst(left);
        let leftScore = snd(left);
        let rightPath = fst(right);
        let rightScore = snd(right);
        if (leftScore > rightScore) Comparison.LessThan
        else if (leftScore < rightScore) Comparison.GreaterThan
        else if (leftPath < rightPath) Comparison.LessThan
        else if (leftPath > rightPath) Comparison.GreaterThan
        else Comparison.EqualTo
    }

    /// One ranked candidate: its 1-based original rank, its path and its exact
    /// similarity.
    pub type alias Entry = { rank = Int32, path = String, similarity = Float64 }

    def numberEntries(rank: Int32, scored: List[Scored], acc: List[Entry]): List[Entry] = match scored {
        case Nil => List.reverse(acc)
        case entry :: rest => numberEntries(rank + 1, rest,
            { rank = rank, path = fst(entry), similarity = snd(entry) } :: acc)
    }

    /// The complete standalone E ranking of one candidate population against one
    /// query: every declared candidate, ordered by exact similarity descending and
    /// ascending path, each carrying its original 1-based rank. No candidate is
    /// dropped and no rank is invented.
    pub def rankBySimilarity(searchVector: Components, candidates: List[(String, Components)]): List[Entry] = {
        let scored = List.map(pair -> (fst(pair), cosine(searchVector, snd(pair))), candidates);
        numberEntries(1, List.sortWith(similarityOrder, scored), Nil)
    }

}

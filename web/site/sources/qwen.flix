// Source: attune/src/Attune/Study/Qwen.flix:226–236
// Source SHA-256: 2233079fe110d58aca47a7cd202977b6539dad0628b85f3cc5a10df9577c6b78
    /// The frozen similarity of one query and one candidate vector: cosine on the
    /// two unnormalized hosted vectors, computed by the shared declared statement
    /// of the embedding branch.
    pub def cosine(searchVector: List[Float64], candidate: List[Float64]): Float64 =
        Embedding.cosine(searchVector, candidate)

    /// The complete standalone Q ranking of one candidate population against one
    /// query, under the same frozen similarity/order statement as every other
    /// embedding arm. No candidate is dropped and no rank is invented.
    pub def rankBySimilarity(searchVector: List[Float64], candidates: List[(String, List[Float64])]): List[Embedding.Entry] =
        Embedding.rankBySimilarity(searchVector, candidates)

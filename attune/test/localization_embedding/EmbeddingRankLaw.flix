use Attune.Study
use Attune.Study.Embedding
use Attune.Study.Metrics

/// The corpus-free embedding retrieval laws (`VAL-EMBED-003`, `VAL-EMBED-004`).
///
/// They drive the Study-owned embedding submodule with hand-built declared
/// fixtures: the exact cosine, the frozen similarity-descending/ascending-path
/// order, the rank column and exact sidecar separation, the `Schema.Embedding`
/// bridge and its refusal of a gold artifact, the row/vector admission errors and
/// the exact top-k overlap, gold decomposition, median and aggregate. The
/// corpus-bound halves of the same assertions live in the E ranking audit over
/// the produced trees; these laws pin the semantics without touching the corpus,
/// the model or a provider, so the ordinary offline gate runs them.

// -------------------------------------------------------------- the similarity

/// The frozen similarity is cosine on the two unnormalized vectors: parallel
/// vectors score exactly `1`, orthogonal vectors exactly `0` and antiparallel
/// vectors exactly `-1`. No lexical or anchor evidence enters the value, so the
/// E score is a genuine embedding similarity rather than a blend.
@Test
def theSimilarityIsCosineOnTheUnnormalizedVectors(): Unit \ Assert = {
    let search = 3.0f64 :: 4.0f64 :: Nil;
    Assert.assertEq(expected = 1.0f64, Embedding.cosine(search, 3.0f64 :: 4.0f64 :: Nil));
    Assert.assertEq(expected = 0.0f64, Embedding.cosine(search, 4.0f64 :: -3.0f64 :: Nil));
    Assert.assertEq(expected = -1.0f64, Embedding.cosine(search, -3.0f64 :: -4.0f64 :: Nil));
    Assert.assertEq(expected = 0.0f64, Embedding.cosine(0.0f64 :: 0.0f64 :: Nil, 1.0f64 :: 0.0f64 :: Nil));
    Assert.assertEq(expected = Embedding.declaredDimension(), 768);
    Assert.assertEq(expected = "similarity-descending-path-ascending", Embedding.orderingIdentity())
}

// ------------------------------------------------------------------- ranking

/// The complete ranking is similarity descending then path ascending, and every
/// entry carries its own 1-based original rank beside the exact similarity. A
/// genuinely equal similarity is broken by the path, so no tie is dropped and no
/// candidate is reordered by a quantized key.
@Test
def theRankingIsSimilarityDescendingThenPathAscending(): Unit \ Assert = {
    let search = 3.0f64 :: 4.0f64 :: Nil;
    let candidates = List#{
        ("c.js", -3.0f64 :: -4.0f64 :: Nil),
        ("a.js", 3.0f64 :: 4.0f64 :: Nil),
        ("b.js", 4.0f64 :: -3.0f64 :: Nil),
        ("a2.js", 3.0f64 :: 4.0f64 :: Nil)
    };
    let ranking = Embedding.rankBySimilarity(search, candidates);
    let ranked = List.map(entry -> (entry#rank, entry#path, entry#similarity), ranking);
    Assert.assertEq(expected = List#{
        (1, "a.js", 1.0f64),
        (2, "a2.js", 1.0f64),
        (3, "b.js", 0.0f64),
        (4, "c.js", -1.0f64)
    }, ranked);
    Assert.assertEq(expected = 4, List.length(ranking));
    Assert.assertEq(expected = List#{"a.js", "a2.js", "b.js", "c.js"}, Embedding.rankedPaths(ranking))
}

/// The frozen order is a total order on the exact `Float64` values: a similarity
/// that differs only in a representable place still orders ahead of the smaller
/// one, so a quantized or truncated key cannot silently merge two distinct scores.
@Test
def aRepresentableSimilarityDifferenceIsStillOrdered(): Unit \ Assert = {
    let high = ("high.js", 0.30000000000000004f64);
    let low = ("low.js", 0.3f64);
    Assert.assertEq(expected = Comparison.LessThan, Embedding.similarityOrder(high, low));
    Assert.assertEq(expected = Comparison.GreaterThan, Embedding.similarityOrder(low, high));
    Assert.assertEq(expected = Comparison.EqualTo, Embedding.similarityOrder(low, ("low.js", 0.3f64)));
    Assert.assertEq(expected = Comparison.LessThan, Embedding.similarityOrder(("a.js", 0.3f64), ("b.js", 0.3f64)))
}

// ------------------------------------------------------- declared row admission

/// One declared row's vector is admitted only when its declared dimension is the
/// frozen dimension, its producer recorded a finite vector and its payload carries
/// exactly that many parsable components. A malformed or truncated row is an error
/// rather than a silently shortened candidate.
@Test
def aMalformedRowIsNotAVector(): Unit \ Assert = {
    let good = List.join(",", List.map(Float64.toString, List.repeat(Embedding.declaredDimension(), 0.5f64)));
    Assert.assertEq(expected = true, Result.isOk(Embedding.vectorOf(rowOf(768, true, good))));
    Assert.assertEq(expected = true, Result.isErr(Embedding.vectorOf(rowOf(2, true, "1.0,2.0"))));
    Assert.assertEq(expected = true, Result.isErr(Embedding.vectorOf(rowOf(768, false, good))));
    Assert.assertEq(expected = true, Result.isErr(Embedding.vectorOf(rowOf(768, true, "1.0,2.0"))));
    Assert.assertEq(expected = true, Result.isErr(Embedding.vectorOf(rowOf(768, true, "1.0,nope"))))
}

/// One row bridges through the existing `Schema.Embedding` boundary: it admits a
/// typed prediction input, while a gold-schema artifact has no route to one. The
/// replay boundary accepts a re-read row only on exact `(schema, producer, input)`
/// identity, so a different model revision, recipe or input bytes rejects.
@Test
def theEmbeddingBridgeAdmitsOnlyEmbeddingSchemaRows(): Unit \ Assert = {
    let row = rowOf(768, true, "0.5");
    Assert.assertEq(expected = true, not Option.isEmpty(Embedding.predictionInputOf(row)));
    Assert.assertEq(expected = true, Embedding.admitsAs(row, row));
    Assert.assertEq(expected = false, Embedding.admitsAs(row, { inputSha = "other" | row }));
    Assert.assertEq(expected = false, Embedding.admitsAs(row, { recipe = "other" | row }));
    Assert.assertEq(expected = true, Option.isEmpty(Study.predictInput({
        schema = Study.Schema.Gold,
        producer = "evaluator",
        input = "task",
        payload = "gold"
    })));
    Assert.assertEq(expected = true, Option.isEmpty(Study.predictInput({
        schema = Study.Schema.Prediction,
        producer = "producer",
        input = "task",
        payload = "prediction"
    })))
}

/// One declared row's logical fixture identity is `(model revision, recipe, exact
/// input bytes)`: the vector payload is data and never part of the identity.
@Test
def theRowIdentityIsTheLogicalFixtureKey(): Unit \ Assert = {
    let row = rowOf(768, true, "0.5");
    Assert.assertEq(expected = ("3c4b60807d71f79b43f3c4363786d9493691f8b1", "recipe-v1", "sha"),
        Embedding.rowIdentity(row));
    Assert.assertEq(expected = Embedding.rowIdentity(row), Embedding.rowIdentity({ values = "0.9" | row }))
}

// ----------------------------------------------------------- overlap and gold

/// The top-k overlap counts the shared candidates, the union of the two top-k
/// populations and the population difference, and the gold decomposition
/// partitions the task's eligible gold paths into A-only, E-only, both and
/// neither. The four counts always sum to the gold path count.
@Test
def theTopKOverlapPartitionsTheGoldPaths(): Unit \ Assert = {
    let a = List#{"x.js", "y.js", "z.js"};
    let e = List#{"y.js", "w.js", "x.js"};
    let gold = List#{"x.js", "w.js", "q.js"};
    let top2 = Embedding.overlapOf(2, a, e, gold);
    Assert.assertEq(expected = 1, top2#intersection);
    Assert.assertEq(expected = 3, top2#union);
    Assert.assertEq(expected = 1, top2#aOnlyCandidates);
    Assert.assertEq(expected = 1, top2#eOnlyCandidates);
    Assert.assertEq(expected = 1, top2#goldAOnly);
    Assert.assertEq(expected = 1, top2#goldEOnly);
    Assert.assertEq(expected = 0, top2#goldBoth);
    Assert.assertEq(expected = 1, top2#goldNeither);
    Assert.assertEq(expected = List.length(gold),
        top2#goldAOnly + top2#goldEOnly + top2#goldBoth + top2#goldNeither);
    let top1 = Embedding.overlapOf(1, a, e, gold);
    Assert.assertEq(expected = 0, top1#intersection);
    Assert.assertEq(expected = 2, top1#union);
    Assert.assertEq(expected = 1, top1#goldAOnly);
    Assert.assertEq(expected = 0, top1#goldEOnly);
    Assert.assertEq(expected = 2, top1#goldNeither);
    Assert.assertEq(expected = List.length(gold),
        top1#goldAOnly + top1#goldEOnly + top1#goldBoth + top1#goldNeither)
}

/// The median of a non-empty integer population is exact: the middle value for an
/// odd count, the mean of the two middle values for an even count, and undefined
/// for an empty population rather than zero.
@Test
def theMedianIsExactForOddAndEvenPopulations(): Unit \ Assert = {
    Assert.assertEq(expected = Some((2, 1)), ratioPairOf(Embedding.medianOf(3 :: 1 :: 2 :: Nil)));
    Assert.assertEq(expected = Some((5, 2)), ratioPairOf(Embedding.medianOf(4 :: 1 :: 3 :: 2 :: Nil)));
    Assert.assertEq(expected = Some((1, 1)), ratioPairOf(Embedding.medianOf(1 :: Nil)));
    Assert.assertEq(expected = true, Option.isEmpty(Embedding.medianOf(Nil)))
}

/// The aggregate is the exact sum of the per-task rows: the task count, the summed
/// intersection and union, the exact mean and median intersection size and the
/// summed gold decomposition. The mean is an exact rational, so a population mean
/// never drifts.
@Test
def theAggregateIsTheExactSumOfTheRows(): Unit \ Assert = {
    let rows = List#{
        { intersection = 1, union = 3, aOnlyCandidates = 1, eOnlyCandidates = 1,
          goldAOnly = 1, goldEOnly = 1, goldBoth = 0, goldNeither = 1 },
        { intersection = 2, union = 2, aOnlyCandidates = 0, eOnlyCandidates = 0,
          goldAOnly = 0, goldEOnly = 0, goldBoth = 2, goldNeither = 0 }
    };
    let summary = Embedding.summarize(rows);
    Assert.assertEq(expected = 2, summary#tasks);
    Assert.assertEq(expected = 3, summary#totalIntersection);
    Assert.assertEq(expected = 5, summary#totalUnion);
    Assert.assertEq(expected = Some((3, 2)), ratioPairOf(summary#meanIntersection));
    Assert.assertEq(expected = Some((3, 2)), ratioPairOf(summary#medianIntersection));
    Assert.assertEq(expected = 1, summary#totalGoldAOnly);
    Assert.assertEq(expected = 1, summary#totalGoldEOnly);
    Assert.assertEq(expected = 2, summary#totalGoldBoth);
    Assert.assertEq(expected = 1, summary#totalGoldNeither);
    Assert.assertEq(expected = 0, Embedding.summarize(Nil)#tasks);
    Assert.assertEq(expected = true, Option.isEmpty(Embedding.summarize(Nil)#meanIntersection))
}

/// One optional exact rational as its integer pair, so a law compares the exact
/// value without needing an `Eq` instance on the ratio record itself.
def ratioPairOf(value: Option[Metrics.Ratio]): Option[(Int32, Int32)] =
    Option.map(Metrics.ratioPair, value)

/// One declared fixture row with the given dimension, finiteness and payload.
def rowOf(dim: Int32, finite: Bool, values: String): Embedding.Row = {    key = "task",
    side = "code",
    path = "a.js",
    modelRevision = "3c4b60807d71f79b43f3c4363786d9493691f8b1",
    recipe = "recipe-v1",
    inputSha = "sha",
    dim = dim,
    finite = finite,
    values = values
}

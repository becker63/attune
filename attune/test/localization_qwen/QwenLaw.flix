use Attune.Study
use Attune.Study.Embedding
use Attune.Study.Metrics
use Attune.Study.Qwen

/// The corpus-free hosted-Qwen laws (`VAL-QWEN-001`, `VAL-QWEN-002`,
/// `VAL-QWEN-003`).
///
/// They drive the Study-owned hosted-Qwen submodule with hand-built declared
/// fixtures: the frozen route/recipe identity, the exact cosine and frozen
/// similarity-descending/ascending-path order, the rank column and exact sidecar
/// separation, the `Schema.Embedding` bridge and its refusal of a gold artifact,
/// the row/vector admission errors, the exact three-way gold partition and the
/// exact signed contrast. The corpus-bound halves of the same statements live in
/// the Q audit over the produced trees; these laws pin the semantics without
/// touching the corpus, the model or a provider, so the ordinary offline gate
/// runs them.

// ------------------------------------------------------------- route and recipe

/// The hosted branch uses exactly the intended provider and model, the frozen
/// documented recipe identity, the documented native dimension and the same
/// frozen ordering identity as every other embedding arm. No substitute model,
/// second provider or local deployment is named anywhere in the branch.
@Test
def theHostedRouteAndRecipeAreFrozenExactly(): Unit \ Assert = {
    Assert.assertEq(expected = "openrouter", Qwen.provider());
    Assert.assertEq(expected = "qwen/qwen3-embedding-8b", Qwen.declaredModel());
    Assert.assertEq(expected = 4096, Qwen.declaredDimension());
    Assert.assertEq(expected = "Qwen/Qwen3-Embedding-8B", Qwen.resolvedModel());
    Assert.assertEq(expected = "qwen3-embedding-8b-instruct-queryprefix-rawtrunc32768cu-native4096-unnormalized-cosine-v1",
        Qwen.recipeIdentity());
    Assert.assertEq(expected = 32768, Qwen.capCodeUnits());
    Assert.assertEq(expected = "openrouter|qwen/qwen3-embedding-8b|Qwen/Qwen3-Embedding-8B", Qwen.modelIdentity());
    Assert.assertEq(expected = "Given a bug report, retrieve relevant source files that must be modified",
        Qwen.queryInstruction());
    Assert.assertEq(expected = "similarity-descending-path-ascending", Qwen.orderingIdentity());
    Assert.assertEq(expected = Embedding.orderingIdentity(), Qwen.orderingIdentity());
    Assert.assertEq(expected = true, String.length(Qwen.queryInstruction()) > 0)
}

// -------------------------------------------------------------- the similarity

/// The frozen similarity is cosine on the two unnormalized hosted vectors:
/// parallel vectors score exactly `1`, orthogonal exactly `0` and antiparallel
/// exactly `-1`. No lexical, anchor or structural evidence enters the value, so
/// the Q score is a genuine embedding similarity rather than a blend.
@Test
def theHostedSimilarityIsCosineOnTheUnnormalizedVectors(): Unit \ Assert = {
    let search = 3.0f64 :: 4.0f64 :: Nil;
    Assert.assertEq(expected = 1.0f64, Qwen.cosine(search, 3.0f64 :: 4.0f64 :: Nil));
    Assert.assertEq(expected = 0.0f64, Qwen.cosine(search, 4.0f64 :: -3.0f64 :: Nil));
    Assert.assertEq(expected = -1.0f64, Qwen.cosine(search, -3.0f64 :: -4.0f64 :: Nil));
    Assert.assertEq(expected = 0.0f64, Qwen.cosine(0.0f64 :: 0.0f64 :: Nil, 1.0f64 :: 0.0f64 :: Nil))
}

/// The complete ranking is similarity descending then path ascending, and every
/// entry carries its own 1-based original rank beside the exact similarity. A
/// genuinely equal similarity is broken by the path, so no tie is dropped and no
/// candidate is reordered by a quantized key.
@Test
def theHostedRankingIsSimilarityDescendingThenPathAscending(): Unit \ Assert = {
    let search = 3.0f64 :: 4.0f64 :: Nil;
    let candidates = List#{
        ("c.js", -3.0f64 :: -4.0f64 :: Nil),
        ("a.js", 3.0f64 :: 4.0f64 :: Nil),
        ("b.js", 4.0f64 :: -3.0f64 :: Nil),
        ("a2.js", 3.0f64 :: 4.0f64 :: Nil)
    };
    let ranking = Qwen.rankBySimilarity(search, candidates);
    Assert.assertEq(expected = List#{
        (1, "a.js", 1.0f64),
        (2, "a2.js", 1.0f64),
        (3, "b.js", 0.0f64),
        (4, "c.js", -1.0f64)
    }, List.map(entry -> (entry#rank, entry#path, entry#similarity), ranking));
    Assert.assertEq(expected = List#{"a.js", "a2.js", "b.js", "c.js"}, Embedding.rankedPaths(ranking));
    Assert.assertEq(expected = 0, List.length(Qwen.orderViolations(List.map(entry -> {
        rank = entry#rank, path = entry#path, similarity = entry#similarity, measured = true
    }, ranking))))
}

/// The order check is on the exact `Float64` values and catches a swapped pair, a
/// broken tie and a non-contiguous rank, so a ranking that the producer accepted
/// cannot silently drift from the frozen order.
@Test
def theOrderCheckCatchesASwappedPairAndABrokenTie(): Unit \ Assert = {
    let swapped = List#{
        { rank = 1, path = "b.js", similarity = 0.1f64, measured = true },
        { rank = 2, path = "a.js", similarity = 0.9f64, measured = true }
    };
    Assert.assertEq(expected = 1, List.length(Qwen.orderViolations(swapped)));
    let mistied = List#{
        { rank = 1, path = "b.js", similarity = 0.5f64, measured = true },
        { rank = 2, path = "a.js", similarity = 0.5f64, measured = true }
    };
    Assert.assertEq(expected = 1, List.length(Qwen.orderViolations(mistied)));
    let misnumbered = List#{
        { rank = 2, path = "a.js", similarity = 0.9f64, measured = true },
        { rank = 1, path = "b.js", similarity = 0.1f64, measured = true }
    };
    Assert.assertEq(expected = 2, List.length(Qwen.orderViolations(misnumbered)));
    Assert.assertEq(expected = 0, List.length(Qwen.orderViolations(
        { rank = 1, path = "a.js", similarity = 0.9f64, measured = true }
            :: { rank = 2, path = "b.js", similarity = 0.1f64, measured = true } :: Nil)))
}

// ------------------------------------------------------- declared row admission

/// One declared hosted row's vector is admitted only when its declared dimension
/// is the frozen 4096, its producer recorded a finite vector and its payload
/// carries exactly that many parsable components. A CodeRankEmbed-shaped 768-wide
/// row is rejected, so the two embedding arms cannot be confused.
@Test
def aMalformedHostedRowIsNotAVector(): Unit \ Assert = {
    let good = List.join(",", List.map(Float64.toString, List.repeat(Qwen.declaredDimension(), 0.5f64)));
    let coderank = List.join(",", List.map(Float64.toString, List.repeat(768, 0.5f64)));
    Assert.assertEq(expected = true, Result.isOk(Qwen.vectorOf(rowOf(4096, true, good))));
    Assert.assertEq(expected = true, Result.isErr(Qwen.vectorOf(rowOf(768, true, coderank))));
    Assert.assertEq(expected = true, Result.isErr(Qwen.vectorOf(rowOf(4096, false, good))));
    Assert.assertEq(expected = true, Result.isErr(Qwen.vectorOf(rowOf(4096, true, "1.0,2.0"))));
    Assert.assertEq(expected = true, Result.isErr(Qwen.vectorOf(rowOf(4096, true, "1.0,nope"))))
}

/// One hosted row bridges through the existing `Schema.Embedding` boundary: it
/// admits a typed prediction input, while a gold-schema artifact has no route to
/// one. The replay boundary accepts a re-read row only on exact
/// `(schema, producer, input)` identity, so a different provider/model identity,
/// recipe or input bytes rejects.
@Test
def theHostedBridgeAdmitsOnlyMatchingEmbeddingSchemaRows(): Unit \ Assert = {
    let row = rowOf(4096, true, "0.5");
    Assert.assertEq(expected = true, not Option.isEmpty(Qwen.predictionInputOf(row)));
    Assert.assertEq(expected = true, Qwen.admitsAs(row, row));
    Assert.assertEq(expected = false, Qwen.admitsAs(row, { inputSha = "other" | row }));
    Assert.assertEq(expected = false, Qwen.admitsAs(row, { recipe = "other" | row }));
    Assert.assertEq(expected = false, Qwen.admitsAs(row, { modelRevision = "openrouter|other" | row }));    Assert.assertEq(expected = true, Option.isEmpty(Study.predictInput({
        schema = Study.Schema.Gold,
        producer = "evaluator",
        input = "task",
        payload = "gold"
    })))
}

/// The logical fixture key of one hosted row is `(provider/resolved model,
/// recipe, exact input bytes)`: the vector payload is data and never part of the
/// identity.
@Test
def theHostedRowIdentityIsTheLogicalFixtureKey(): Unit \ Assert = {
    let row = rowOf(4096, true, "0.5");
    Assert.assertEq(expected = ("openrouter|qwen/qwen3-embedding-8b|Qwen/Qwen3-Embedding-8B", Qwen.recipeIdentity(), "sha"),
        Qwen.rowIdentity(row));
    Assert.assertEq(expected = Qwen.rowIdentity(row), Qwen.rowIdentity({ values = "0.9" | row }))
}

/// A declared hosted row carries the frozen recipe and provider/model identity or
/// it is not admitted: a row from another recipe, provider or model is rejected
/// rather than silently ranked. The declared fixture row keeps the exact identity
/// of the raw bytes it was derived from beside the exact identity of the bytes
/// that were embedded, so the recipe's frozen truncation step is auditable.
@Test
def theHostedRowMustCarryTheFrozenRecipeAndModelIdentity(): Unit \ Assert = {
    let row = rowOf(4096, true, "0.5");
    Assert.assertEq(expected = true, Qwen.hasFrozenRecipe(row));
    Assert.assertEq(expected = true, Qwen.hasFrozenModel(row));
    Assert.assertEq(expected = false, Qwen.hasFrozenRecipe({ recipe = "other" | row }));
    Assert.assertEq(expected = false, Qwen.hasFrozenModel({ modelRevision = "openrouter|qwen/qwen3-embedding-8b" | row }));
    let fixture = fixtureOf("raw-identity", "embedded-identity");
    Assert.assertEq(expected = true, Qwen.asRow(fixture)#inputSha == "embedded-identity");
    Assert.assertEq(expected = "raw-identity", fixture#rawSha);
    Assert.assertEq(expected = Qwen.modelIdentity(), Qwen.asRow(fixture)#modelRevision);
    Assert.assertEq(expected = Qwen.recipeIdentity(), Qwen.asRow(fixture)#recipe)
}

/// One declared hosted fixture row with the given raw-bytes and embedded-bytes
/// identities.
def fixtureOf(raw: String, embedded: String): Qwen.FixtureRow = {
    key = "task",
    side = "code",
    path = "a.js",
    modelRevision = Qwen.modelIdentity(),
    recipe = Qwen.recipeIdentity(),
    rawSha = raw,
    inputSha = embedded,
    dim = Qwen.declaredDimension(),
    marker = Qwen.measuredMarker(),
    values = "0.5"
}

/// The declared admission markers are the frozen vocabulary, and the empty-input
/// identity is the declared identity of the one input this provider route cannot
/// embed: a declared row is either measured or the empty declared input, and a
/// row with any other marker is not a row of this branch.
@Test
def theDeclaredAdmissionMarkersAreTheFrozenVocabulary(): Unit \ Assert = {
    Assert.assertEq(expected = "finite", Qwen.measuredMarker());
    Assert.assertEq(expected = "unmeasured", Qwen.unmeasuredMarker());
    Assert.assertEq(expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        Qwen.emptyInputIdentity());
    let measured = fixtureOf("raw", "embedded");
    Assert.assertEq(expected = true, Qwen.isMeasured(measured));
    Assert.assertEq(expected = false, Qwen.isUnmeasured(measured));
    Assert.assertEq(expected = true, Qwen.hasDeclaredMarker(measured));
    let unmeasured = { marker = Qwen.unmeasuredMarker(), rawSha = Qwen.emptyInputIdentity(),
        inputSha = Qwen.emptyInputIdentity() | measured };
    Assert.assertEq(expected = false, Qwen.isMeasured(unmeasured));
    Assert.assertEq(expected = true, Qwen.isUnmeasured(unmeasured));
    Assert.assertEq(expected = true, Qwen.hasDeclaredMarker(unmeasured));
    Assert.assertEq(expected = true, Qwen.isEmptyInput(unmeasured));
    Assert.assertEq(expected = false, Qwen.isEmptyInput(measured));
    Assert.assertEq(expected = false, Qwen.hasDeclaredMarker({ marker = "other" | measured }));
    // An unmeasured row is never admitted as a finite row, so it can never be read
    // as a vector.
    Assert.assertEq(expected = false, Qwen.asRow(unmeasured)#finite)
}

/// The complete Q ranking keeps every candidate of the declared universe, orders
/// every measured candidate by exact similarity descending then path ascending,
/// then orders every unmeasurable candidate by path ascending with the explicit
/// `undefined` similarity cell, and numbers the whole list with contiguous
/// 1-based ranks. No similarity is fabricated for an unmeasurable candidate, and
/// the order check catches a measured candidate placed after an unmeasured one.
@Test
def theUnmeasurableCandidateIsOrderedAfterEveryMeasuredOne(): Unit \ Assert = {
    let search = 3.0f64 :: 4.0f64 :: Nil;
    let measured = List#{
        ("c.js", -3.0f64 :: -4.0f64 :: Nil),
        ("b.js", 4.0f64 :: -3.0f64 :: Nil)
    };
    let ranking = Qwen.rankCandidates(search, measured, "z.js" :: "a.js" :: Nil);
    Assert.assertEq(expected = List#{
        (1, "b.js", true),
        (2, "c.js", true),
        (3, "a.js", false),
        (4, "z.js", false)
    }, List.map(entry -> (entry#rank, entry#path, entry#measured), ranking));
    Assert.assertEq(expected = List#{"0.0", "-1.0", "undefined", "undefined"},
        List.map(Qwen.similarityCell, ranking));
    Assert.assertEq(expected = 0, List.length(Qwen.orderViolations(ranking)));
    Assert.assertEq(expected = List#{"b.js", "c.js", "a.js", "z.js"}, Qwen.rankedPaths(ranking));
    // A measured candidate after an unmeasured one, and an unmeasured pair that is
    // not ascending, are both violations.
    let swapped = List#{
        { rank = 1, path = "a.js", similarity = 0.0f64, measured = false },
        { rank = 2, path = "b.js", similarity = 0.9f64, measured = true }
    };
    Assert.assertEq(expected = 1, List.length(Qwen.orderViolations(swapped)));
    let unsorted = List#{
        { rank = 1, path = "z.js", similarity = 0.0f64, measured = false },
        { rank = 2, path = "a.js", similarity = 0.0f64, measured = false }
    };
    Assert.assertEq(expected = 1, List.length(Qwen.orderViolations(unsorted)));
    // An empty universe and an all-unmeasured universe are both well formed.
    Assert.assertEq(expected = 0, List.length(Qwen.rankCandidates(search, Nil, Nil)));
    Assert.assertEq(expected = List#{1, 2}, List.map(entry -> entry#rank, Qwen.rankCandidates(search, Nil, "a.js" :: "b.js" :: Nil)))
}

// ------------------------------------------------------- three-way gold partition

/// The three-way gold decomposition partitions the task's eligible gold paths
/// across the eight membership classes, so the eight counts always sum to the
/// gold path count and no path is counted twice or invented.
@Test
def theThreeWayGoldPartitionPartitionsTheEligibleGoldPaths(): Unit \ Assert = {
    let a = List#{"x.js", "y.js", "z.js"};
    let e = List#{"y.js", "w.js", "x.js"};
    let q = List#{"z.js", "q.js", "x.js"};
    let gold = List#{"x.js", "w.js", "z.js", "q.js", "r.js"};
    let partition = Qwen.goldPartition(a, e, q, gold);
    Assert.assertEq(expected = 0, partition#aOnly);
    Assert.assertEq(expected = 1, partition#eOnly);
    Assert.assertEq(expected = 1, partition#qOnly);
    Assert.assertEq(expected = 0, partition#aE);
    Assert.assertEq(expected = 1, partition#aQ);
    Assert.assertEq(expected = 0, partition#eQ);
    Assert.assertEq(expected = 1, partition#allThree);
    Assert.assertEq(expected = 1, partition#none);
    Assert.assertEq(expected = List.length(gold),
        partition#aOnly + partition#eOnly + partition#qOnly + partition#aE + partition#aQ
            + partition#eQ + partition#allThree + partition#none);
    Assert.assertEq(expected = 0, Qwen.sumGoldPartitions(Nil)#aOnly);
    let summed = Qwen.sumGoldPartitions(partition :: partition :: Nil);
    Assert.assertEq(expected = 2 * List.length(gold),
        summed#aOnly + summed#eOnly + summed#qOnly + summed#aE + summed#aQ
            + summed#eQ + summed#allThree + summed#none)
}

// ------------------------------------------------------------------- contrasts

/// The contrast is the exact signed `left - right`: the sign is carried
/// separately from the non-negative magnitude, the magnitude is the exact
/// reduced rational difference in 64-bit, a large-denominator metric difference
/// still reduces exactly, and either undefined side leaves the whole contrast
/// undefined rather than fabricating a zero delta.
@Test
def theContrastIsExactAndUndefinedWhenEitherSideIsUndefined(): Unit \ Assert = {
    Assert.assertEq(expected = Some((1, 1i64, 2i64)), contrastOf(Qwen.contrast(Some(Metrics.ratio(3, 4)), Some(Metrics.ratio(1, 4)))));
    Assert.assertEq(expected = Some((-1, 1i64, 2i64)), contrastOf(Qwen.contrast(Some(Metrics.ratio(1, 4)), Some(Metrics.ratio(3, 4)))));
    Assert.assertEq(expected = Some((0, 0i64, 1i64)), contrastOf(Qwen.contrast(Some(Metrics.ratio(3, 4)), Some(Metrics.ratio(3, 4)))));
    Assert.assertEq(expected = Some((1, 1i64, 1i64)), contrastOf(Qwen.contrast(Some(Metrics.ratio(1, 1)), Some(Metrics.ratio(0, 1)))));
    // Two individually small ratios whose cross-products exceed 32 bits: the
    // difference must still be exact and reduced rather than silently wrapped.
    // 1/99991 - 3/100003 = -199970/9999399973, and the reduced denominator itself
    // exceeds the 32-bit range.
    Assert.assertEq(expected = Some((-1, 199970i64, 9999399973i64)),
        contrastOf(Qwen.contrast(Some(Metrics.ratio(1, 99991)), Some(Metrics.ratio(3, 100003)))));
    Assert.assertEq(expected = true, Option.isEmpty(Qwen.contrast(None, Some(Metrics.ratio(1, 1)))));
    Assert.assertEq(expected = true, Option.isEmpty(Qwen.contrast(Some(Metrics.ratio(1, 1)), None)))
}

/// One optional contrast as its three exact cells: the sign and the 64-bit
/// reduced magnitude.
def contrastOf(value: Option[Qwen.Contrast]): Option[(Int32, Int64, Int64)] =
    Option.map(contrast -> (contrast#sign, contrast#numerator, contrast#denominator), value)

/// One declared hosted fixture row with the given dimension, finiteness and
/// payload.
def rowOf(dim: Int32, finite: Bool, values: String): Qwen.Row = {
    key = "task",
    side = "code",
    path = "a.js",
    modelRevision = Qwen.modelIdentity(),
    recipe = Qwen.recipeIdentity(),
    inputSha = "sha",
    dim = dim,
    finite = finite,
    values = values
}

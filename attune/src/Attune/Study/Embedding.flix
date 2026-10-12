/// Shared vector comparison and admission of recorded embedding rows.
///
///     exact request -> recorded vector -> similarity -> ranking -> metrics
///
/// Cosine compares vector direction. Files sort by similarity, then by path to
/// break ties reproducibly. Scores stay unrounded until presentation.
/// Request identity includes model revision, recipe, and exact input; the vector
/// is a value, never its own cache key. The 768-wide row recipe belongs to the
/// historical CodeRankEmbed arm; Qwen reuses the comparison with its own recipe.
pub mod Attune.Study.Embedding {

    use Attune.Study
    use Attune.Study.Metrics

    /// The declared output dimension of the pinned recipe. A row that does not
    /// carry exactly this width is not a usable fixture row.
    pub def declaredDimension(): Int32 = 768

    /// The declared ordering identity of the E ranking: exact similarity
    /// descending, then candidate path ascending.
    pub def orderingIdentity(): String = "similarity-descending-path-ascending"

    // ---------------------------------------------------------- declared rows

    /// One declared embedding fixture row: the producer's own record vocabulary.
    /// `key` is the logical row name (`side` decides what it means), `path` the
    /// candidate's repository-relative source path (or the task identity on the
    /// query side), `modelRevision`/`recipe`/`inputSha` the logical fixture key,
    /// and `values` the comma-joined vector payload.
    pub type alias Row = {
        key           = String,
        side          = String,
        path          = String,
        modelRevision = String,
        recipe        = String,
        inputSha      = String,
        dim           = Int32,
        finite        = Bool,
        values        = String
    }

    /// The declared logical fixture key of one row: the model revision, the
    /// recipe identity and the exact bytes that were embedded. The vector payload
    /// is not part of the identity.
    pub def rowIdentity(row: Row): (String, String, String) =
        (row#modelRevision, row#recipe, row#inputSha)

    /// One row admitted as an artifact through the existing `Schema.Embedding`
    /// boundary. The producer identity names the frozen model revision and recipe
    /// together, so two recipes of the same model are different producers; the
    /// input identity is the exact embedded bytes and the payload is the vector
    /// data.
    pub def artifactOf(row: Row): Study.Artifact = {
        schema = Study.Schema.Embedding,
        producer = row#modelRevision + "|" + row#recipe,
        input = row#inputSha,
        payload = row#values
    }

    /// The existing typed prediction-input entry point applied to one row. Only an
    /// `Embedding`-schema artifact yields a prediction input, so a gold- or
    /// prediction-schema record has no route here and a malformed row cannot
    /// masquerade as a prediction input.
    pub def predictionInputOf(row: Row): Option[Study.PredictionInput] =
        Study.predictInput(artifactOf(row))

    /// The replay boundary applied to one row: a re-read row is admitted only when
    /// its exact `(schema, producer, input)` identity equals the stored one, so a
    /// wrong schema, model, recipe or input bytes rejects instead of silently
    /// becoming a candidate.
    pub def admitsAs(stored: Row, candidate: Row): Bool =
        match Study.accept(artifactOf(stored), artifactOf(candidate)) {
            case Ok(_)  => true
            case Err(_) => false
        }

    // -------------------------------------------------------------- vectors

    /// One embedded vector: the exact unnormalized components the pinned recipe
    /// emitted.
    pub type alias Components = List[Float64]

    def parseComponents(parts: List[String], acc: List[Float64]): Result[String, Components] = match parts {
        case Nil => Ok(List.reverse(acc))
        case part :: rest => match Float64.fromString(part) {
            case Some(value) => parseComponents(rest, value :: acc)
            case None        => Err("malformed embedding component")
        }
    }

    /// The exact vector of one declared row. A row whose declared dimension is not
    /// the frozen dimension, whose producer recorded a non-finite vector, or whose
    /// payload does not carry exactly that many parsable components is an error
    /// rather than a silently shortened candidate.
    pub def vectorOf(row: Row): Result[String, Components] =
        if (row#dim != declaredDimension()) Err("embedding dimension mismatch")
        else if (not row#finite) Err("non-finite embedding row")
        else match parseComponents(String.split(regex = ",", row#values), Nil) {
            case Ok(values) => if (List.length(values) == declaredDimension()) Ok(values) else Err("embedding width mismatch")
            case Err(error) => Err(error)
        }

    /// The exact inner product of two vectors.
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

    /// The candidate paths of one complete E ranking, in rank order.
    pub def rankedPaths(entries: List[Entry]): List[String] =
        List.map(entry -> entry#path, entries)

    // ----------------------------------------------------- A/E overlap and gold

    /// One task's top-k overlap between the A (P+A) population and the E
    /// population, with the task's eligible gold paths partitioned by membership.
    /// `aOnlyCandidates`/`eOnlyCandidates` are the population differences and the
    /// four `gold*` counts are the decomposition of the task's gold paths: the
    /// four counts always sum to the task's eligible gold path count.
    pub type alias Overlap = {
        intersection      = Int32,
        union             = Int32,
        aOnlyCandidates   = Int32,
        eOnlyCandidates   = Int32,
        goldAOnly         = Int32,
        goldEOnly         = Int32,
        goldBoth          = Int32,
        goldNeither       = Int32
    }

    /// The exact top-k overlap and gold decomposition of one task. The candidate
    /// populations are the ranked path lists themselves, so the reduction follows
    /// the frozen order rather than re-sorting anything.
    pub def overlapOf(k: Int32, aPaths: List[String], ePaths: List[String], gold: List[String]): Overlap = {
        let aTop = List.take(k, aPaths);
        let eTop = List.take(k, ePaths);
        let shared = List.filter(path -> List.memberOf(path, eTop), aTop);
        let inA = path -> List.memberOf(path, aTop);
        let inE = path -> List.memberOf(path, eTop);
        {
            intersection = List.length(shared),
            union = List.length(List.distinct(aTop ::: eTop)),
            aOnlyCandidates = List.length(aTop) - List.length(shared),
            eOnlyCandidates = List.length(eTop) - List.length(shared),
            goldAOnly = List.length(List.filter(path -> inA(path) and not inE(path), gold)),
            goldEOnly = List.length(List.filter(path -> inE(path) and not inA(path), gold)),
            goldBoth = List.length(List.filter(path -> inA(path) and inE(path), gold)),
            goldNeither = List.length(List.filter(path -> not inA(path) and not inE(path), gold))
        }
    }

    /// The exact median of a non-empty integer population, as an exact rational:
    /// the middle value for an odd count and the mean of the two middle values for
    /// an even count. An empty population has no median, so it is undefined rather
    /// than zero.
    pub def medianOf(values: List[Int32]): Option[Metrics.Ratio] = {
        let sorted = List.sortBy(value -> value, values);
        let count = List.length(sorted);
        if (count == 0) None
        else if (Int32.modulo(count, 2) == 1) Option.map(value -> Metrics.ratio(value, 1), List.head(List.drop(count / 2, sorted)))
        else match List.splitAt(count / 2, sorted) {
            case (left, right) => match (List.last(left), List.head(right)) {
                case (Some(low), Some(high)) => Some(Metrics.ratio(low + high, 2))
                case _                       => None
            }
        }
    }

    /// One population's aggregated overlap record: the task count, the summed
    /// intersection and union, the exact mean and median intersection size and the
    /// summed gold decomposition. Every count is an integer over the whole
    /// population, and the mean/median are exact rationals so no rounding enters
    /// the record.
    pub type alias OverlapSummary = {
        tasks              = Int32,
        totalIntersection  = Int32,
        totalUnion         = Int32,
        meanIntersection   = Option[Metrics.Ratio],
        medianIntersection = Option[Metrics.Ratio],
        totalGoldAOnly     = Int32,
        totalGoldEOnly     = Int32,
        totalGoldBoth      = Int32,
        totalGoldNeither   = Int32
    }

    /// The exact aggregate of one population's overlap rows.
    pub def summarize(rows: List[Overlap]): OverlapSummary = {
        let sizes = List.map(row -> row#intersection, rows);
        {
            tasks = List.length(rows),
            totalIntersection = List.foldLeft((total, row) -> total + row#intersection, 0, rows),
            totalUnion = List.foldLeft((total, row) -> total + row#union, 0, rows),
            meanIntersection = Metrics.meanRatio(List.map(size -> Metrics.ratio(size, 1), sizes)),
            medianIntersection = medianOf(sizes),
            totalGoldAOnly = List.foldLeft((total, row) -> total + row#goldAOnly, 0, rows),
            totalGoldEOnly = List.foldLeft((total, row) -> total + row#goldEOnly, 0, rows),
            totalGoldBoth = List.foldLeft((total, row) -> total + row#goldBoth, 0, rows),
            totalGoldNeither = List.foldLeft((total, row) -> total + row#goldNeither, 0, rows)
        }
    }
}

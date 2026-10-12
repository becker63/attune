/// Rank files by how closely their Qwen vectors match an issue's vector.
///
///     issue vector + file vectors -> cosine similarity -> ordered paths
///                                                         |
///                                                   tied score: path order
///
/// This module keeps the frozen provider recipe, admits recorded rows, and ranks
/// them. Model, recipe, and exact input identify a request; its vector is the
/// answer. Unmeasured files stay in the ranking with an explicit marker.
/// Provider acquisition lives in the archived study. Nothing here calls a model.
pub mod Attune.Study.Qwen {

    use Attune.Study
    use Attune.Study.Embedding
    use Attune.Study.Metrics

    /// The declared hosted provider of the Q branch. OpenRouter is the ONLY Q
    /// route: no substitute provider and no local deployment exists.
    pub def provider(): String = "openrouter"

    /// The exact intended hosted model identifier the request carries.
    pub def declaredModel(): String = "qwen/qwen3-embedding-8b"

    /// The resolved model identity the tiny compatibility probe observed the
    /// provider return for the configured model. It is part of the fixture key, so
    /// a routing change to another identity is a declared identity change rather
    /// than a silent substitution.
    pub def resolvedModel(): String = "Qwen/Qwen3-Embedding-8B"

    /// The declared native output dimension of the frozen recipe. The probe
    /// confirmed the returned width is the model's own highest normal output, so
    /// no dimension tuning is applied.
    pub def declaredDimension(): Int32 = 4096

    /// The frozen recipe identity. It carries the documented Qwen Instruct query
    /// form, the frozen truncation of the declared raw bytes, the native output
    /// dimension, the unnormalized output convention and the frozen cosine on
    /// normalized vectors, so a recipe change is a declared identity change rather
    /// than a silent re-interpretation.
    pub def recipeIdentity(): String =
        "qwen3-embedding-8b-instruct-queryprefix-rawtrunc32768cu-native4096-unnormalized-cosine-v1"

    /// Historical input cap, in UTF-16 code units, before the query prefix.
    /// This bounds text length, not model tokens. Recorded rows retain both raw
    /// and prepared-input identities so truncation is visible.
    pub def capCodeUnits(): Int32 = 32768

    /// The frozen query instruction. It is applied to the query side only; the
    /// declared issue and source bytes stay exactly the frozen E bytes.
    pub def queryInstruction(): String =
        "Given a bug report, retrieve relevant source files that must be modified"

    /// The declared admission marker of a row whose exact embedded bytes the
    /// provider measured and whose finite vector is recorded.
    pub def measuredMarker(): String = "finite"

    /// The declared admission marker of a row whose exact declared bytes this
    /// provider route cannot embed at all. The single such input is the empty
    /// string: the route rejects an empty input outright (`20015 The parameter is
    /// invalid`, observed as `Too small: expected string to have >=1 characters`),
    /// so no embedding of it exists on this route. Such a row keeps its exact
    /// logical identity and carries no vector; no payload is fabricated for it and
    /// its candidate is ordered explicitly after every measured candidate.
    pub def unmeasuredMarker(): String = "unmeasured"

    /// The exact declared identity of the empty input: the SHA-256 of the empty
    /// byte string. The rows that carry it are exactly the rows this route cannot
    /// measure, so the reason for an unmeasured row is checkable rather than
    /// asserted.
    pub def emptyInputIdentity(): String =
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    /// The declared ordering identity of every Q ranking: exact similarity
    /// descending, then candidate path ascending.
    pub def orderingIdentity(): String = "similarity-descending-path-ascending"

    /// The provenance identity one declared Q row carries: the declared provider,
    /// the configured model and the resolved model identity the provider actually
    /// returned. All three are part of the fixture key, so a second provider, a
    /// substitute model or a routing change is visible in the identity itself.
    pub def modelIdentity(): String = provider() + "|" + declaredModel() + "|" + resolvedModel()

    // ---------------------------------------------------------- declared rows

    /// One declared hosted embedding fixture row: the producer's own record
    /// vocabulary, unchanged from the pinned CodeRankEmbed producer.
    pub type alias Row = Embedding.Row

    /// One declared hosted fixture row exactly as the Q acquirer records it: the
    /// shared row vocabulary plus the exact identity of the declared raw bytes the
    /// row was derived from and the declared admission marker. Carrying both
    /// identities keeps the recipe's frozen truncation step auditable: the raw
    /// identity is the unchanged frozen E input identity, and the embedded
    /// identity is the fixture key's input component.
    pub type alias FixtureRow = {
        key           = String,
        side          = String,
        path          = String,
        modelRevision = String,
        recipe        = String,
        rawSha        = String,
        inputSha      = String,
        dim           = Int32,
        marker        = String,
        values        = String
    }

    /// One declared hosted fixture row viewed as the shared embedding row
    /// vocabulary, so the hosted branch reuses the one cosine/ranking statement
    /// instead of restating it. Only a measured row is a finite row here, so an
    /// unmeasured row can never be read as a vector.
    pub def asRow(fixture: FixtureRow): Row = {
        key = fixture#key,
        side = fixture#side,
        path = fixture#path,
        modelRevision = fixture#modelRevision,
        recipe = fixture#recipe,
        inputSha = fixture#inputSha,
        dim = fixture#dim,
        finite = isMeasured(fixture),
        values = fixture#values
    }

    /// Whether one declared hosted fixture row was measured by the provider.
    pub def isMeasured(fixture: FixtureRow): Bool = fixture#marker == measuredMarker()

    /// Whether one declared hosted fixture row is a declared input this provider
    /// route cannot embed, and so carries no vector.
    pub def isUnmeasured(fixture: FixtureRow): Bool = fixture#marker == unmeasuredMarker()

    /// Whether one declared hosted fixture row carries a marker the frozen recipe
    /// declares. An unknown marker is not a row of this branch.
    pub def hasDeclaredMarker(fixture: FixtureRow): Bool =
        isMeasured(fixture) or isUnmeasured(fixture)

    /// Whether one declared unmeasured row carries exactly the empty-input
    /// identity on both sides: the declared raw bytes and the recipe's embedded
    /// bytes are the same empty string, so the row records why it is unmeasured.
    pub def isEmptyInput(fixture: FixtureRow): Bool =
        fixture#rawSha == emptyInputIdentity() and fixture#inputSha == emptyInputIdentity()

    /// Whether one declared hosted row carries the frozen recipe identity. A row
    /// from a different recipe is rejected rather than silently ranked.
    pub def hasFrozenRecipe(row: Row): Bool = row#recipe == recipeIdentity()

    /// Whether one declared hosted row carries the declared provider and model
    /// identity. A row from another provider or model is rejected.
    pub def hasFrozenModel(row: Row): Bool = row#modelRevision == modelIdentity()

    /// The declared logical fixture key of one row: the model identity, the recipe
    /// identity and the exact embedded bytes. The vector payload is not part of
    /// the identity.
    pub def rowIdentity(row: Row): (String, String, String) =
        Embedding.rowIdentity(row)

    /// One row admitted as an artifact through the existing `Schema.Embedding`
    /// boundary. The producer identity is the resolved provider/model identity
    /// plus the frozen recipe, so the hosted branch cannot collide with the
    /// pinned CodeRankEmbed producer even for identical input bytes.
    pub def artifactOf(row: Row): Study.Artifact = {
        schema = Study.Schema.Embedding,
        producer = row#modelRevision + "|" + row#recipe,
        input = row#inputSha,
        payload = row#values
    }

    /// The existing typed prediction-input entry point applied to one row. Only an
    /// `Embedding`-schema artifact yields a prediction input.
    pub def predictionInputOf(row: Row): Option[Study.PredictionInput] =
        Study.predictInput(artifactOf(row))

    /// The replay boundary applied to one row: a re-read row is admitted only when
    /// its exact `(schema, producer, input)` identity equals the stored one, so a
    /// wrong provider, model, recipe or input bytes rejects instead of silently
    /// becoming a candidate.
    pub def admitsAs(stored: Row, candidate: Row): Bool =
        match Study.accept(artifactOf(stored), artifactOf(candidate)) {
            case Ok(_)  => true
            case Err(_) => false
        }

    // -------------------------------------------------------------- vectors

    def parseComponents(parts: List[String], acc: List[Float64]): Result[String, List[Float64]] = match parts {
        case Nil => Ok(List.reverse(acc))
        case part :: rest => match Float64.fromString(part) {
            case Some(value) => parseComponents(rest, value :: acc)
            case None        => Err("malformed hosted embedding component")
        }
    }

    /// The exact vector of one declared hosted row. A row whose returned width is
    /// not the frozen dimension, whose producer recorded a non-finite vector, or
    /// whose payload does not carry exactly that many parsable components is an
    /// error rather than a silently shortened candidate.
    pub def vectorOf(row: Row): Result[String, List[Float64]] =
        if (row#dim != declaredDimension()) Err("hosted embedding dimension mismatch")
        else if (not row#finite) Err("non-finite hosted embedding row")
        else match parseComponents(String.split(regex = ",", row#values), Nil) {
            case Ok(values) => if (List.length(values) == declaredDimension()) Ok(values) else Err("hosted embedding width mismatch")
            case Err(error) => Err(error)
        }

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

    /// One declared Q ranking entry: its 1-based rank, its candidate path, its
    /// exact measured similarity when the provider measured the candidate, and
    /// whether the candidate was measurable at all.
    pub type alias QEntry = { rank = Int32, path = String, similarity = Float64, measured = Bool }

    /// The complete standalone Q ranking of one task: every candidate the provider
    /// measured, ordered by exact similarity descending then path ascending, and
    /// then every candidate this route cannot embed, ordered by path ascending.
    /// Every candidate of the declared universe appears exactly once, the ranks
    /// are the contiguous 1-based positions, and no similarity is fabricated for
    /// an unmeasurable candidate — its declared similarity cell is reported
    /// undefined by the consumer instead.
    pub def rankCandidates(
        searchVector: List[Float64],
        measured: List[(String, List[Float64])],
        unmeasured: List[String]): List[QEntry] = {
        let ranked = Embedding.rankBySimilarity(searchVector, measured);
        let head = List.map(entry -> {
            rank = entry#rank, path = entry#path, similarity = entry#similarity, measured = true
        }, ranked);
        let ordered = List.sort(unmeasured);
        head ::: numberUnmeasured(List.length(head) + 1, ordered, Nil)
    }

    def numberUnmeasured(rank: Int32, paths: List[String], acc: List[QEntry]): List[QEntry] = match paths {
        case Nil => List.reverse(acc)
        case path :: rest => numberUnmeasured(rank + 1, rest,
            { rank = rank, path = path, similarity = 0.0f64, measured = false } :: acc)
    }

    /// The ordered candidate paths of one complete Q ranking.
    pub def rankedPaths(entries: List[QEntry]): List[String] =
        List.map(entry -> entry#path, entries)

    /// The declared similarity cell of one Q ranking entry: the exact measured
    /// similarity, or the explicit `undefined` marker for a candidate this route
    /// could not embed. The marker is never a number, so an unmeasured candidate
    /// cannot be read as a measured zero.
    pub def similarityCell(entry: QEntry): String =
        if (entry#measured) Float64.toString(entry#similarity) else "undefined"

    /// The ordering violations of one complete Q ranking: a rank that is not its
    /// own 1-based position; an adjacent measured pair whose similarity increases
    /// or whose tie is not ascending by path; a measured candidate after an
    /// unmeasured one; or an adjacent unmeasured pair that is not ascending by
    /// path. The check is on the exact similarity value, so a quantized order would
    /// be visible here.
    pub def orderViolations(entries: List[QEntry]): List[String] = {
        let numbering = List.filterMap(pair -> match pair {
            case (entry, position) =>
                if (entry#rank == position) None
                else Some("rank " + Int32.toString(entry#rank) + " is not position " + Int32.toString(position))
        }, List.zip(entries, List.range(1, List.length(entries) + 1)));
        let order = List.filterMap(pair -> match pair {
            case (left, right) =>
                if (left#measured and not right#measured) None
                else if (not left#measured and right#measured)
                    Some("measured candidate follows an unmeasured one at " + left#path)
                else if (left#measured)
                    if (left#similarity < right#similarity)
                        Some("similarity increases at " + left#path + " -> " + right#path)
                    else if (left#similarity == right#similarity and left#path > right#path)
                        Some("tie is not ascending at " + left#path + " -> " + right#path)
                    else None
                else if (left#path >= right#path)
                    Some("unmeasured candidates are not ascending at " + left#path + " -> " + right#path)
                else None
        }, List.zip(entries, List.drop(1, entries)));
        numbering ::: order
    }

    // -------------------------------------------------- overlap and gold (A/E/Q)

    /// One task's three-way top-k gold decomposition between the A (P+A), E and Q
    /// populations. Every eligible gold path of the task lands in exactly one of
    /// the eight classes, so the eight counts always sum to the task's eligible
    /// gold path count and no path is counted twice or invented.
    pub type alias GoldPartition = {
        aOnly    = Int32,
        eOnly    = Int32,
        qOnly    = Int32,
        aE       = Int32,
        aQ       = Int32,
        eQ       = Int32,
        allThree = Int32,
        none     = Int32
    }

    /// One task's exact three-way gold decomposition under the three top-k
    /// populations, evaluated only after every ranking is frozen.
    pub def goldPartition(aTop: List[String], eTop: List[String], qTop: List[String], gold: List[String]): GoldPartition = {
        let inA = path -> List.memberOf(path, aTop);
        let inE = path -> List.memberOf(path, eTop);
        let inQ = path -> List.memberOf(path, qTop);
        {
            aOnly = List.length(List.filter(path -> inA(path) and not inE(path) and not inQ(path), gold)),
            eOnly = List.length(List.filter(path -> not inA(path) and inE(path) and not inQ(path), gold)),
            qOnly = List.length(List.filter(path -> not inA(path) and not inE(path) and inQ(path), gold)),
            aE = List.length(List.filter(path -> inA(path) and inE(path) and not inQ(path), gold)),
            aQ = List.length(List.filter(path -> inA(path) and not inE(path) and inQ(path), gold)),
            eQ = List.length(List.filter(path -> not inA(path) and inE(path) and inQ(path), gold)),
            allThree = List.length(List.filter(path -> inA(path) and inE(path) and inQ(path), gold)),
            none = List.length(List.filter(path -> not inA(path) and not inE(path) and not inQ(path), gold))
        }
    }

    /// The summed three-way gold decomposition of one population's task rows.
    pub def sumGoldPartitions(rows: List[GoldPartition]): GoldPartition = {
        aOnly = List.foldLeft((total, row) -> total + row#aOnly, 0, rows),
        eOnly = List.foldLeft((total, row) -> total + row#eOnly, 0, rows),
        qOnly = List.foldLeft((total, row) -> total + row#qOnly, 0, rows),
        aE = List.foldLeft((total, row) -> total + row#aE, 0, rows),
        aQ = List.foldLeft((total, row) -> total + row#aQ, 0, rows),
        eQ = List.foldLeft((total, row) -> total + row#eQ, 0, rows),
        allThree = List.foldLeft((total, row) -> total + row#allThree, 0, rows),
        none = List.foldLeft((total, row) -> total + row#none, 0, rows)
    }

    // ------------------------------------------------------------- contrasts

    /// One exact signed contrast between two metric values: a sign in
    /// `{-1, 0, 1}` and the exact magnitude as a reduced ratio. The canonical
    /// `Ratio` vocabulary is strictly non-negative, so the sign is carried
    /// separately rather than smuggled through an absolute value. The magnitude is
    /// carried in 64 bits because two metric denominators can multiply past the
    /// 32-bit range even when both are individually small.
    pub type alias Contrast = { sign = Int32, numerator = Int64, denominator = Int64 }

    /// The exact signed difference `left - right` of two optional metric values,
    /// reduced to lowest terms. A genuinely undefined side leaves the contrast
    /// undefined rather than fabricating a zero, so a contrast row can never be
    /// read as a real delta. The cross-products run in 64-bit and the reduction is
    /// an exact gcd, so a large-denominator metric cannot silently wrap.
    pub def contrast(left: Option[Metrics.Ratio], right: Option[Metrics.Ratio]): Option[Contrast] =
        match (left, right) {
            case (Some(l), Some(r)) =>
                let leftNumerator = Int32.toInt64(l#numerator);
                let leftDenominator = Int32.toInt64(l#denominator);
                let rightNumerator = Int32.toInt64(r#numerator);
                let rightDenominator = Int32.toInt64(r#denominator);
                let common = leftDenominator * rightDenominator;
                let difference = leftNumerator * rightDenominator - rightNumerator * leftDenominator;
                let magnitude = if (difference < 0i64) 0i64 - difference else difference;
                let divisor = gcd64(magnitude, common);
                Some({
                    sign = if (difference > 0i64) 1 else if (difference < 0i64) -1 else 0,
                    numerator = magnitude / divisor,
                    denominator = common / divisor
                })
            case _ => None
        }

    /// The exact greatest common divisor of two non-negative 64-bit integers, with
    /// `gcd(0, n) = n` so a zero difference reduces to `0/1`.
    def gcd64(a: Int64, b: Int64): Int64 =
        if (b == 0i64) (if (a == 0i64) 1i64 else a) else gcd64(b, Int64.modulo(a, b))
}

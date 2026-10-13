/// A small browser-facing research library. JSON is transport; the questions,
/// admission rules, ranking and effect replay are ordinary Flix functions.
pub mod Attune.Studio {
    use Util.Json
    use Util.Json.Json.{JObject, JString, JBool, JNull}
    use Util.Json.FromJson
    use Util.Json.ToJson.toJson
    use Attune.{Atom, Fact, Frontier, World, Theory, Effects, Repository}

    pub def version(): String = "studio-v4"
    pub type alias Hit = {path = String, score = Float64, witnesses = List[String]}

    pub def evaluate(input: String): String =
        match forM (
            json <- Result.mapErr(_ -> "Invalid JSON.", Json.parse(input));
            operation <- field("operation", json);
            answer <- match operation {
                case "probe" => Ok(probe())
                case "index" => index(json)
                case "query" => answer(json)
                case "rerank" => rerank(json)
                case "judgment" => judgment(json)
                case _ => Err("Unknown Studio operation.")
            }
        ) yield answer {
            case Ok(answer) => Json.toCompactString(answer)
            case Err(message) => Json.toCompactString(JObject(Map#{"error" => JString(message)}))
        }

    def field(key: String, json: Json.Json): Result[String, a] with FromJson.FromJson[a] =
        Result.mapErr(_ -> "Invalid field: " + key, FromJson.decodeAtKey(key, json))

    def observation(json: Json.Json): Result[String, Repository.Observation] = forM (
        path <- field("path", json); source <- field("source", json);
        defines <- field("defines", json); imports <- field("imports", json); calls <- field("calls", json)
    ) yield {path = path, source = source, defines = defines, imports = imports, calls = calls}

    def index(json: Json.Json): Result[String, Json.Json] = forM (
        origin <- field("origin", json); revision <- field("revision", json); digest <- field("digest", json); semantics <- field("semantics", json);
        raw <- field("observations", json);
        observations <- Result.traverse(observation, raw);
        _ <- validFiles(List.map(o -> (o#path, o#source), observations));
        repository <- Result.mapErr(error -> "Source admission failed: ${error}", Repository.fromObservations(observations))
    ) yield {
        let identity = JObject(Map#{"origin" => JString(origin), "content" => JString(revision + ":" + digest), "semantics" => JString(version() + ":" + semantics)});
        let world = Attune.worldId({origin = origin, content = revision + ":" + digest, semantics = version() + ":" + semantics});
        JObject(Map#{
            "version" => JString(version()), "identity" => identity,
            "facts" => toJson(List.map(f -> (f#source, Attune.atomName(f#atom), f#target), Repository.worldFacts(world, repository))),
            "witnesses" => toJson(List.map(w -> JObject(Map#{
                "path" => JString(w#file), "start" => toJson(w#startByte), "end" => toJson(w#endByte),
                "source" => JString(w#source), "relation" => JString(Attune.atomName(w#atom)), "target" => JString(w#target)
            }), repository#witnesses)),
            "declarations" => toJson(List.map(d -> JObject(Map#{
                "symbol" => JString(d#symbol), "name" => JString(d#name), "path" => JString(d#file),
                "start" => toJson(d#startByte), "end" => toJson(d#endByte)
            }), repository#declarations)),
            "refusals" => toJson(List.map(r -> JObject(Map#{
                "path" => JString(Repository.refusalSite(r)), "reason" => JString(Repository.refusalCode(r)),
                "subject" => JString(Repository.refusalSubject(r))
            }), repository#refusals))
        })
    }

    def validFiles(files: List[(String, String)]): Result[String, Unit] =
        if (List.length(files) > 120 or List.exists(match (path, source) ->
            String.length(path) > 512 or String.length(source) > 131072 or path == "" or
            String.startsWith(prefix = "/", path) or List.memberOf("..", String.split(regex = "/", path)), files))
            Err("Source inventory exceeds Studio bounds.")
        else if (List.length(List.distinct(List.map(fst, files))) != List.length(files)) Err("Duplicate source path.")
        else Ok(())

    def atom(name: String): Result[String, Atom] = match name {
        case "defines" => Ok(Atom.Defines)
        case "defined_in" => Ok(Atom.DefinedIn)
        case "imports" => Ok(Atom.Imports)
        case "imported_by" => Ok(Atom.ImportedBy)
        case "calls" => Ok(Atom.Calls)
        case "callers" => Ok(Atom.Callers)
        case _ => Err("Unknown relationship.")
    }

    def facts(json: Json.Json): Result[String, (World, List[Fact])] = forM (
        identity <- field("identity", json); origin <- field("origin", identity);
        content <- field("content", identity); semantics <- field("semantics", identity);
        _ <- if (String.startsWith(prefix = version() + ":", semantics)) Ok(()) else Err("Index semantics changed. Reindex this repository.");
        edges <- field("facts", json);
        result <- Result.traverse(match (source, name, target) ->
            Result.map(relation -> {world = Attune.worldId({origin = origin, content = content, semantics = semantics}),
                source = source, atom = relation, target = target}, atom(name)), edges)
    ) yield (Attune.worldId({origin = origin, content = content, semantics = semantics}), result)

    /// A word scores once per file: three points in its path, one in its source.
    /// This is a transparent baseline, not BM25 or the historical localization recipe.
    pub def lexical(question: String, files: List[(String, String)]): List[Hit] = {
        let words = words(question);
        sorted(List.filterMap(match (path, source) -> {
            let inPath = List.filter(word -> contains(word, String.toLowerCase(path)), words);
            let inSource = List.filter(word -> contains(word, String.toLowerCase(source)), words);
            let score = Int32.toFloat64(3 * List.length(inPath) + List.length(inSource));
            if (score == 0.0f64) None else Some({path = path, score = score,
                witnesses = List.map(word -> "path contains " + word, inPath) ::: List.map(word -> "source contains " + word, inSource)})
        }, files))
    }

    def words(question: String): List[String] =
        String.map(character -> if (Char.isLetterOrDigit(character) or character == '_') character else ' ', String.toLowerCase(question))
            |> String.split(regex = " +")
            |> List.filter(word -> String.length(word) > 1 and not List.memberOf(word,
                List#{"the", "where", "which", "what", "with", "from", "this", "that", "are", "does", "how", "for", "and", "would", "can"}))
            |> List.distinct

    def contains(needle: String, haystack: String): Bool =
        String.indexOf(substr = needle, haystack) != None

    /// Embeddings supply the starting files. Routes add source-grounded context.
    /// Each route casts one vote per reached file; Flix never guesses an anchor.
    pub def structural(anchors: List[String], world: World, edges: List[Fact]): List[Hit] = {
        let routes = List#{
            ("embedding candidate", Nil),
            ("imports", List#{Atom.Imports}),
            ("imported by", List#{Atom.ImportedBy}),
            ("defines → calls → defined in", List#{Atom.Defines, Atom.Calls, Atom.DefinedIn}),
            ("defines → callers → defined in", List#{Atom.Defines, Atom.Callers, Atom.DefinedIn})
        };
        let votes = List.flatMap(seed -> List.flatMap(match (label, route) ->
            List.map(path -> (path, seed + " → " + label), fileAnswers(Theory.follow(edges, Attune.files(world, seed :: Nil), route))), routes), anchors);
        sorted(List.map(path -> {
            let witnesses = List.distinct(List.filterMap(match (candidate, witness) -> if (candidate == path) Some(witness) else None, votes));
            {path = path, score = Int32.toFloat64(List.length(witnesses)), witnesses = witnesses}
        }, List.distinct(List.map(fst, votes))))
    }

    def fileAnswers(answer: Result[String, Frontier]): List[String] = match answer {
        case Ok(Frontier.Files(_, members)) => List.map(match Attune.FileId.FileId(path) -> path, Set.toList(members))
        case _ => Nil
    }

    pub def sorted(hits: List[Hit]): List[Hit] = List.sortWith((a, b) ->
        if (a#score > b#score) Comparison.LessThan else if (a#score < b#score) Comparison.GreaterThan
        else Order.compare(a#path, b#path), hits)

    /// Equal-weight reciprocal rank fusion. A missing method adds no votes.
    /// Kept separate from the archived Atlas signature and localization campaigns.
    def rankVote(rank: Int32): Float64 =
        if (rank == 0) 0.0f64 else 1.0f64 / (60.0f64 + Int32.toFloat64(rank))

    pub def combine(left: List[Hit], right: List[Hit]): List[Hit] = {
        def votes(hits) = List.mapWithIndex((i, hit) -> (hit#path, rankVote(i + 1)), hits);
        let scores = votes(left) ::: votes(right);
        sorted(List.map(path -> {path = path, score = List.foldLeft((total, pair) ->
            if (fst(pair) == path) total + snd(pair) else total, 0.0f64, scores), witnesses =
                List#{"equal-weight reciprocal rank fusion (k = 60)"} :::
                List.flatMap(hit -> if (hit#path == path) hit#witnesses else Nil, left ::: right)}, List.distinct(List.map(fst, scores))))
    }

    def hitJson(hit: Hit): Json.Json = JObject(Map#{"path" => JString(hit#path), "score" => toJson(hit#score), "witnesses" => toJson(hit#witnesses)})

    def stage(label: String, detail: String, paths: List[String]): Json.Json =
        JObject(Map#{"label" => JString(label), "detail" => JString(detail), "paths" => toJson(paths)})

    /// Expose the two actual votes for the fixed-graph overlay. The browser
    /// draws their proportions; it does not recalculate or change the ranking.
    def mergeStage(left: List[Hit], right: List[Hit], combined: List[Hit]): Json.Json = {
        def rankIn(path, hits) = List.foldLeft((rank, pair) ->
            if (fst(pair) == path) snd(pair) else rank, 0,
            List.mapWithIndex((i, hit) -> (hit#path, i + 1), hits));
        def rankJson(rank) = if (rank == 0) JNull else toJson(rank);
        let contributions = List.map(hit -> {
            let a = rankIn(hit#path, left); let b = rankIn(hit#path, right);
            JObject(Map#{"path" => JString(hit#path), "ranks" => toJson(List#{rankJson(a), rankJson(b)}),
                "votes" => toJson(List#{rankVote(a), rankVote(b)}), "score" => toJson(hit#score)})
        }, combined);
        JObject(Map#{"label" => JString("Merge rankings"),
            "detail" => JString("Qwen’s contribution + Atlas’s contribution = combined score. Hover for the calculation."),
            "paths" => toJson(paths(combined)), "merge" => toJson(contributions)})
    }

    def paths(hits: List[Hit]): List[String] = List.map(h -> h#path, hits)

    def method(name: String, status: String, detail: String, count: Int32, hits: List[Hit], stages: List[Json.Json]): Json.Json = JObject(Map#{
        "method" => JString(name), "version" => JString(version()), "status" => JString(status),
        "detail" => JString(detail), "candidateCount" => toJson(count), "results" => toJson(List.map(hitJson, List.take(10, hits))),
        "stages" => toJson(stages ::: (if (status == "complete")
            stage("Top 10", "Keep at most ten files in the method's ranked order.", paths(List.take(10, hits))) :: Nil else Nil))
    })

    def answer(json: Json.Json): Result[String, Json.Json] = forM (
        question <- field("question", json); files <- field("files", json);
        _ <- validFiles(files);
        _ <- if (String.length(question) <= 2000) Ok(()) else Err("Question is too long.");
        index <- field("index", json); pair <- facts(index);
        saved <- field("saved", json)
    ) yield {
        let (world, edges) = pair;
        let text = lexical(question, files);
        let answers = List.map(match ((model, recipe, input), vector) -> (Effects.Request.Request(model, recipe, input), vector), saved);
        let embedding = Effects.withSavedAnswers(() -> Effects.locate(question, files), answers);
        let embeddingHits = match embedding {
            case Ok(scores) => List.map(match (path, score) -> {path = path, score = score, witnesses = List#{"cosine similarity to the question embedding"}}, scores)
            case Err(_) => Nil
        };
        let requests = List.map(input -> (Effects.modelIdentity(), Effects.recipeIdentity(), input),
            Effects.queryText(question) :: List.map(match (_, source) -> String.take(Effects.capCodeUnits(), source), files));
        let embeddingStatus = match embedding { case Ok(_) => "complete" case Err(_) => "unavailable" };
        let seeds = paths(List.take(5, embeddingHits));
        let structure = structural(seeds, world, edges);
        let combined = if (embeddingStatus == "complete") combine(embeddingHits, structure) else Nil;
        let inventory = stage("Indexed files", "The admitted source inventory; excluded files are not candidates.", List.map(fst, files)) :: Nil;
        let embeddingStages = if (embeddingStatus == "complete") List#{
            stage("Qwen ranking", "Order every indexed file by cosine similarity. This step ranks, rather than removes, files.", paths(embeddingHits))} else Nil;
        let structureStages = if (embeddingStatus == "complete") embeddingStages ::: List#{
            stage("Five starting files", "Keep the first five embedding results as structural anchors.", seeds),
            stage("Follow relationships", "Expand through imports, callers and callees. Only admitted relationships count.", paths(structure)),
            mergeStage(embeddingHits, structure, combined)} else Nil;
        JObject(Map#{
            "methods" => toJson(List#{
                method("lexical", "complete", "Words in paths and source.", List.length(files), text,
                    inventory ::: List#{stage("Text matches", "Keep files with matching words; order by path and source scores.", paths(text))}),
                method("embeddings", embeddingStatus, match embedding {case Ok(_) => "Qwen vectors; cosine similarity." case Err(error) => error}, List.length(files), embeddingHits,
                    inventory ::: embeddingStages),
                method("embeddings+atlas", embeddingStatus, "Qwen's first five files seed five structural routes, then the rankings are merged.", List.length(files), combined,
                    inventory ::: structureStages)
            }),
            "requests" => toJson(requests),
            "pools" => JObject(Map#{"lexical" => toJson(List.map(hitJson, List.take(30, text))), "embeddings" => toJson(List.map(hitJson, List.take(30, embeddingHits))), "combined" => toJson(List.map(hitJson, List.take(30, combined)))})
        })
    }

    /// Send a bounded excerpt of each candidate, with optional structural
    /// witnesses. The provider observes this fixed pool; it cannot add files.
    def judgment(json: Json.Json): Result[String, Json.Json] = forM (
        question <- field("question", json); files <- field("files", json);
        pool <- (field("pool", json): Result[String, List[(String, List[String])]]);
        _ <- validFiles(files);
        _ <- if (String.length(question) <= 2000 and List.length(pool) <= 30 and
            List.length(List.distinct(List.map(fst, pool))) == List.length(pool) and
            List.forAll(match (path, _) -> List.memberOf(path, List.map(fst, files)), pool))
            Ok(()) else Err("Invalid judgment candidate pool.")
    ) yield JObject(Map#{
        "model" => JString("openrouter|typesafe/jev-1.13|typesafe/jev-1.13-20260917"), "recipe" => JString("studio-judgment:source-700:witness-200:v1"),
        "state" => JObject(Map#{"question" => JString(question), "candidates" => toJson(List.map(match (path, witnesses) -> {
            let source = List.foldLeft((before, pair) -> if (fst(pair) == path) snd(pair) else before, "", files);
            JObject(Map#{"path" => JString(path), "source" => JString(String.take(700, source)),
                "relationships" => JString(String.take(200, List.join("; ", witnesses)))})}, pool))})
    })

    /// Judgment can reorder only the supplied candidates. Missing, duplicate,
    /// unknown or non-finite scores fail the entire observation.
    def rerank(json: Json.Json): Result[String, Json.Json] = forM (
        pool <- field("pool", json); scores <- field("scores", json);
        _ <- if (List.length(pool) <= 30 and List.length(List.distinct(pool)) == List.length(pool) and
            List.sort(pool) == List.sort(List.map(fst, scores)) and
            List.forAll(match (_, score) -> Float64.isFinite(score) and score >= 0.0f64 and score <= 1.0f64, scores))
            Ok(()) else Err("Judgment must score every candidate exactly once, between 0 and 1.")
    ) yield toJson(List.map(hitJson, List.take(10, sorted(List.map(match (path, score) ->
        {path = path, score = score, witnesses = List#{"judgment over this fixed candidate pool"}}, scores)))))

    /// Also executed on the JVM. Authored vectors are a fixture, not a measurement.
    pub def probe(): Json.Json = {
        let world = Attune.worldId({origin = "fixture", content = "v1", semantics = version()});
        let edges = {world = world, source = "cart.js", atom = Atom.Imports, target = "store.js"} :: Nil;
        let traversal = Theory.follow(edges, Attune.files(world, "cart.js" :: Nil), Atom.Imports :: Nil);
        let request = Effects.Request.Request(Effects.modelIdentity(), Effects.recipeIdentity(), "cart");
        let answer = Effects.withSavedAnswers(() -> Effects.vectorFor("cart"), (request, List#{1.0f64, 0.0f64}) :: Nil);
        JObject(Map#{"traversal" => JBool(traversal == Ok(Attune.files(world, "store.js" :: Nil))),
            "savedEffect" => JBool(answer == Ok(List#{1.0f64, 0.0f64})), "datalog" => JBool(false),
            "lexical" => JBool(List.length(lexical("cart", List#{("cart.js", "cart")})) == 1),
            "number" => toJson(1.234f64)})
    }
}

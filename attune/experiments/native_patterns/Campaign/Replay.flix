/// Identity-preserving historical adapter. No provider module is linked.
pub mod Campaign.Replay {
    use Attune.Effects
    pub def model(): String = "openrouter|qwen/qwen3-embedding-8b|Qwen/Qwen3-Embedding-8B"
    pub def recipe(): String = "qwen3-embedding-8b-instruct-queryprefix-rawtrunc32768cu-native4096-unnormalized-cosine-v1"
    pub def prepared(side: String, source: String): String =
        (if (side == "query") "Instruct: Given a bug report, retrieve relevant source files that must be modified\nQuery: " else "") + String.take(32768, source)
    pub def rows(text: String): List[List[String]] =
        List.map(s -> String.split(regex = "\t", s), List.filter(s -> s != "", String.lines(text)))
    pub def vector(row: List[String], side: String, path: String, source: String): Result[String, Option[List[Float64]]] \ IO = {
        let raw = Campaign.sha(source);
        let digest = Campaign.sha(prepared(side, source));
        match row {
            case _ :: savedSide :: savedPath :: savedModel :: savedRecipe :: savedRaw :: savedDigest :: dimension :: marker :: values :: Nil =>
                if ((savedSide, savedPath, savedModel, savedRecipe, savedRaw, savedDigest) != (side, path, model(), recipe(), raw, digest)) Err("Saved vector identity mismatch: " + path)
                else if (marker == "unmeasured" and source == "" and side == "code") Ok(None)
                else if (marker != "finite" or dimension != "4096") Err("Unsupported saved vector: " + path)
                else forM (
                    vector <- Option.toOk("Malformed vector: " + path, Option.traverse(Float64.fromString, String.split(regex = ",", values)));
                    _ <- if (List.length(vector) == 4096 and Effects.valid(vector)) Ok(()) else Err("Invalid vector: " + path)
                ) yield Some(vector)
            case _ => Err("Malformed saved vector row: " + path)
        }
    }
    pub def saved(text: String, side: String, path: String, source: String): Result[String, Option[List[Float64]]] \ IO =
        match List.filter(r -> match r { case _ :: s :: p :: _ => s == side and p == path case _ => false }, rows(text)) {
            case row :: Nil => vector(row, side, path, source)
            case _ => Err("Missing or duplicated saved vector: " + path)
        }
}

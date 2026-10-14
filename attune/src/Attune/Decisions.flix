/// Native Decisions requests: transport returns the full body, never a chat reply.
pub mod Attune.Decisions {
    use Util.Json
    use Util.Json.FromJson
    use Util.Json.Json.{JObject, JNull}
    pub enum Request with Eq, ToString { case Request(String, String, String, String) }
    pub eff Choice { def decide(request: Request): Result[String, String] }

    /// Exact replay cannot acquire a missing answer or resolve conflicting receipts.
    pub def withSaved(program: Unit -> a \ ef, saved: List[(Request, String)]): a \ ef - Choice =
        run { program() } with handler Choice {
            def decide(request, continueWith) = continueWith(match List.filter(match(r,_) -> r == request,saved) {
                case (_,body)::Nil => Ok(body)
                case Nil => Err("Missing native Choice replay.")
                case _ => Err("Conflicting native Choice replay.")
            })
        }

    /// Provider models and confidence survive decoding; probabilities are not winners.
    pub def decode(body: String, legal: List[String]): Result[String,(String,Map[String,Float64],Float64)] = forM (
        root <- Result.mapErr(_ -> "Malformed native Decisions body.",Json.parse(body));
        model <- field("model",root);
        kind <- field("type",at("prior",at("answers",root)));
        probabilities <- field("probabilities",at("prior",at("answers",root)));
        confidence <- field("confidence",at("prior",at("answers",root)));
        valid <- if(kind == "choice" and validDistribution(legal,probabilities) and finite(confidence) and confidence >= 0.0f64 and confidence <= 1.0f64) Ok((model,probabilities,confidence)) else Err("Invalid legal Choice distribution.")
    ) yield valid

    pub def validDistribution(legal: List[String], probabilities: Map[String,Float64]): Bool = {
        let values=Map.toList(probabilities) |> List.map(snd);
        // Sum map entries, not unique probability values: equal option weights matter.
        let total=List.foldLeft((s,v) -> s+snd(v),0.0f64,Map.toList(probabilities));
        not List.isEmpty(legal) and List.length(legal) == Set.size(List.toSet(legal)) and (Map.toList(probabilities) |> List.map(fst) |> List.toSet) == List.toSet(legal) and
        List.forAll(p -> finite(p) and p >= 0.0f64,values) and Float64.abs(total-1.0f64) <= 0.000001f64
    }
    pub def smoothed(legal: List[String], probabilities: Map[String,Float64]): Map[String,Float64] =
        List.map(id -> (id,0.8f64*Map.getWithDefault(id,0.0f64,probabilities)+0.2f64/Int32.toFloat64(List.length(legal))),legal) |> List.toMap
    pub def uniform(legal: List[String]): Map[String,Float64] =
        List.map(id -> (id,1.0f64/Int32.toFloat64(List.length(legal))),legal) |> List.toMap
    def at(key: String, json: Json.Json): Json.Json = match json { case JObject(fields) => Map.getWithDefault(key,JNull,fields) case _ => JNull }
    def field(key: String, json: Json.Json): Result[String,a] with FromJson.FromJson[a] = Result.mapErr(_ -> "Missing native field: "+key,FromJson.decodeAtKey(key,json))
    def finite(p: Float64): Bool = Float64.isFinite(p)
}

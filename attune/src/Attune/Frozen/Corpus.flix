/// The adversarial corpus data model: the manifested corpus JSON parsed as
/// typed cases. The corpus file is hash-frozen policy data (class
/// adversarial-corpus); its case bodies are inert strings, materialized only
/// into disposable synthetic checkouts, never executed.
pub mod Attune.Frozen.Corpus {

    /// One corpus case: name, planted path, planted body, expected verdict,
    /// the seed mutation it applies ("" means none), and the pure content
    /// scan shape that must flag it ("" means the case is not a smuggle
    /// shape, so the pure detector is not asserted for it). Cases may
    /// declare a synthetic aquery dump (`declaredInputs`): the declared
    /// compilation group that covers the planted file, exercising the
    /// coverage rule. `expectedFinding` names a finding prefix the report
    /// must contain ("" means any rejection counts).
    pub type alias Case = {
        name = String,
        path = String,
        body = String,
        expected = String,
        mutation = String,
        expectedShape = String,
        declaredInputs = List[String],
        expectedFinding = String
    }

    def obj(value: Util.Json.Json): Result[String, Map[String, Util.Json.Json]] = match value {
        case Util.Json.Json.JObject(fields) => Ok(fields)
        case _ => Err("expected a JSON object")
    }

    def str(fields: Map[String, Util.Json.Json], key: String): String = match Map.get(key, fields) {
        case Some(Util.Json.Json.JString(value)) => value
        case _ => ""
    }

    def strList(fields: Map[String, Util.Json.Json], key: String): List[String] = match Map.get(key, fields) {
        case Some(Util.Json.Json.JArray(values)) =>
            List.filterMap(v -> match v {
                case Util.Json.Json.JString(s) => Some(s)
                case _ => None
            }, Vector.toList(values))
        case _ => Nil
    }

    def parseCase(value: Util.Json.Json): Result[String, Case] = forM (
        fields <- obj(value)
    ) yield {
        name = str(fields, "name"),
        path = str(fields, "path"),
        body = str(fields, "body"),
        expected = str(fields, "expected"),
        mutation = str(fields, "mutation"),
        expectedShape = str(fields, "expectedShape"),
        declaredInputs = strList(fields, "declaredInputs"),
        expectedFinding = str(fields, "expectedFinding")
    }

    def parseCases(values: List[Util.Json.Json], acc: Result[String, List[Case]]): Result[String, List[Case]] =
        match (acc, values) {
            case (Err(reason), _) => Err(reason)
            case (Ok(parsed), Nil) => Ok(List.reverse(parsed))
            case (Ok(parsed), value :: rest) => match parseCase(value) {
                case Ok(one) => parseCases(rest, Ok(one :: parsed))
                case Err(reason) => Err(reason)
            }
        }

    /// Parse the whole corpus; a malformed case fails the corpus.
    pub def parse(text: String): Result[String, List[Case]] = forM (
        parsed <- Result.mapErr(_ -> "corpus is not valid JSON", Util.Json.parse(text));
        fields <- obj(parsed);
        _schema <- if (str(fields, "schema") == "attune-source-policy/1") Ok(()) else Err("corpus schema mismatch");
        _kind <- if (str(fields, "kind") == "adversarial-corpus") Ok(()) else Err("corpus kind mismatch");
        caseValues <- match Map.get("cases", fields) {
            case Some(Util.Json.Json.JArray(values)) => Ok(Vector.toList(values))
            case _ => Err("corpus has no cases array")
        };
        cases <- parseCases(caseValues, Ok(Nil))
    ) yield cases

    /// The one case with this name; the corpus is the shape authority for
    /// the law tests, which never inline smuggle shapes as literals.
    pub def caseNamed(cases: List[Case], name: String): Option[Case] =
        List.find(one -> one#name == name, cases)
}

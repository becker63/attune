// Frozen wire v2 cold campaign: explicit failures; unchanged admission and pattern semantics.
pub mod Campaign {
    use Attune.{Artifacts, Atom, World}
    use Util.Json
    use Util.Json.FromJson
    import java.security.MessageDigest
    import java.nio.charset.StandardCharsets
    import java.util.HexFormat
    pub type alias Source = List[(String, String)]
    pub type alias Observations = List[(String, String, String, String, String)]
    pub type alias Admitted = (String, List[(String, String, String)], List[(String, String, String)], List[(String, String, String, String, Int32, Int32)], List[(String, String, String, Int32, Int32)], String, List[String])
    pub type alias Ranked = List[(String, Option[Float64])]
    pub def input(name: String): a \ IO with FromJson.FromJson[a] =
        Artifacts.required(Result.mapErr(_ -> "Malformed declared JSON: " + name, Json.decode(Artifacts.input(name))))
    pub def sha(text: String): String \ IO =
        HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)))
    pub def fact(world: World, value: (String, String, String)): Attune.Fact = {
        let (atom, source, target) = value;
        let relation = match atom {
            case "defines" => Atom.Defines
            case "defined_in" => Atom.DefinedIn
            case "imports" => Atom.Imports
            case "imported_by" => Atom.ImportedBy
            case "calls" => Atom.Calls
            case _ => Atom.Callers
        };
        {world = world, source = source, atom = relation, target = target}
    }
}

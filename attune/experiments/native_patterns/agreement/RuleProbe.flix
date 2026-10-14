// Scratch rule invalidation probe; never a fitted intervention.
pub mod RuleProbe {
    use Attune.{FileId,  SymbolId}
    use Attune.Patterns.Participant
    pub type alias Witness = (String,  String,  List[(String,  String)])
    pub type alias Bound = (FileId,  SymbolId,  FileId,  SymbolId,  Int32,  Int32)
    pub type alias Rules = #{ Seed(FileId),  I(FileId,  FileId),  D(FileId,  SymbolId),  C(SymbolId,  SymbolId),  B(FileId,  SymbolId,  FileId,  SymbolId,  Int32,  Int32),  Hit(FileId,  FileId,  List[Participant]) }
    // These are native first-class fragments,  selected by an ordinary typed function.
    pub def rules(template: String): Rules = match template {
        case "Import" => #{ Hit(a, b, List#{}) :- Seed(a),  I(a, b),  if(a != b). }
        case "Call" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  D(a, s),  C(s, t),  D(b, t),  if(a != b). }
        case "Union" => #{
            Hit(a, b, List#{}) :- Seed(a),  I(a, b),  if(a != b).
            Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  D(a, s),  C(s, t),  D(b, t),  if(a != b).
        }
        case "Agreement" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  I(b, a),  D(a, s),  C(s, t),  D(b, t),  if(a != b). }
        case "Importer" => #{ Hit(a, b, List#{}) :- Seed(a),  I(b, a),  if(a != b). }
        case "Caller" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  D(b, s),  C(s, t),  D(a, t),  if(a != b). }
        case "ReverseAgreement" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  I(b, a),  D(b, s),  C(s, t),  D(a, t),  if(a != b). }
        case "ChainImport" => #{ Hit(a, b, List#{Participant.File(m)}) :- Seed(a),  I(a, m),  I(m, b),  if(a != b). }
        case "ChainAgreement" => #{ Hit(a, b, List#{Participant.File(m), Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  I(a, m),  I(m, b),  D(a, s),  C(s, t),  D(b, t),  if(a != b). }
        case "DistinctChainAgreement" => #{ Hit(a, b, List#{Participant.File(m), Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  I(a, m),  I(m, b),  D(a, s),  C(s, t),  D(b, t),  if(a != b),  if(m != a),  if(m != b). }
        case "TwoTargetsSameCaller" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t), Participant.Symbol(u)}) :- Seed(a),  I(a, b),  D(a, s),  C(s, t),  C(s, u),  D(b, t),  D(b, u),  if(a != b),  if(t != u). }
        case "TwoTargetsSameFile" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(v), Participant.Symbol(t), Participant.Symbol(u)}) :- Seed(a),  I(a, b),  D(a, s),  D(a, v),  C(s, t),  C(v, u),  D(b, t),  D(b, u),  if(a != b),  if(t != u). }
        case "BoundAgreement" => #{ Hit(a, b, List#{Participant.Symbol(s), Participant.Symbol(t)}) :- Seed(a),  I(a, b),  B(a, s, b, t, lo, hi),  if(a != b). }
        case _ => #{}
    }
    pub def matches(template: String,  admitted: Campaign.Admitted,  anchors: List[String],  bound: List[Bound]): List[Witness] = {
        let (_,  triples,  _,  _,  _,  state,  _) = admitted;
        if (state != "Completed") Nil else {
            let ii = List.filterMap(match (kind, a, b) -> if(kind == "imports") Some((FileId.FileId(a), FileId.FileId(b))) else None,  triples);
            let dd = List.filterMap(match (kind, a, b) -> if(kind == "defines") Some((FileId.FileId(a), SymbolId.SymbolId(b))) else None,  triples);
            let cc = List.filterMap(match (kind, a, b) -> if(kind == "calls") Some((SymbolId.SymbolId(a), SymbolId.SymbolId(b))) else None,  triples);
            let seeds = List.map(FileId.FileId,  anchors);
            let facts = inject seeds, ii, dd, cc, bound into Seed/1, I/2, D/2, C/2, B/6;
            query facts, rules(template) select (a, b, rest) from Hit(a, b, rest) |> Vector.toList |> List.map(match (FileId.FileId(a), FileId.FileId(b), rest) -> (a, b, List.map(p -> match p {case Participant.File(FileId.FileId(f)) => ("File", f) case Participant.Symbol(SymbolId.SymbolId(s)) => ("Symbol", s)}, rest))) |> List.toSet |> Set.toList
        }
    }
}

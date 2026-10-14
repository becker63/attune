// A stricter certificate for ambiguous lexical scope or reassignment.
// The original binding-v1 artifacts remain unchanged and separately reported.
pub mod Qualified {
    use Attune.Repository.Grit
    import java.util.regex.Pattern
    pub type alias Wire = (String, String, String, String, Int32, Int32)
    pub def moduleScope(source: String, position: Int32): Bool = {
        let prefix = Grit.substring(source, 0, position);
        def scan(index: Int32, depth: Int32): Bool = if (index >= String.length(prefix)) depth == 0 else {
            let c = String.charAt(index, prefix);
            let code = Binding.codeAt(prefix, index);
            let previous = if (index > 0) String.charAt(index - 1, prefix) else ' ';
            let next = if (index + 1 < String.length(prefix)) String.charAt(index + 1, prefix) else ' ';
            if (code and c == '/' and next != '/' and next != '*' and previous != '*') false // Regex/division prefixes are deliberately unknown.
            else scan(index + 1, depth + (if (code and c == '{') 1 else if (code and c == '}') -1 else 0))
        };
        scan(0, 0)
    }
    pub def stableAlias(source: String, localName: String, fact: Grit.Fact, kind: String): Bool \ IO = {
        let before = Grit.substring(source, 0, fact#startByte);
        let line = String.lines(before) |> List.last |> Option.getWithDefault("");
        let immutable = kind != "require" or Binding.capture("^[ \\t]*const[ \\t]+[A-Za-z_$][A-Za-z0-9_$]*[ \\t]*=[ \\t]*$", line, 0) != None;
        let tail = Grit.substring(source, fact#endByte, Vector.length(String.toBytes(source)));
        immutable and Binding.capture("(?<![.\\w$])" + Pattern.quote(localName) + "\\s*=(?!=|>)", tail, 0) == None
    }
    pub def certify(raw: Campaign.Observations, admitted: Campaign.Admitted, existing: List[Wire]): (List[Wire], List[(Wire, String)]) \ IO = {
        let (_, triples, _, earned, declarations, state, _) = admitted;
        if (state != "Completed") (Nil, Nil) else {
            let indexed = List.toMap(List.map(match (path, source, defs, imports, calls) -> (path, (source, defs, imports, calls)), raw));
            let decisions = List.map(w -> {
                let (a, _, b, target, lo, hi) = w;
                let (source, _, imports, _) = Map.getWithDefault(a, ("", "", "", ""), indexed);
                let fs = Attune.Artifacts.required(Result.mapErr(ToString.toString, Grit.facts(a, source, imports)));
                let imported = List.filterMap(match (kind, sourceFile, to) -> if (kind == "imports" and sourceFile == a) Some(to) else None, triples);
                let bs = Binding.bindings(a, source, fs, imported, earned);
                let localName = String.split(regex = "\\.", Grit.substring(source, lo, hi)) |> List.head |> Option.getWithDefault("");
                let qualified = List.exists(match (_, local, to, kind, position) -> {
                    let fact = List.find(f -> f#valueStart == position, fs);
                    let topLevel = moduleScope(source, position) and not List.exists(match (_, file, _, start, end) -> file == a and start <= position and position <= end, declarations);
                    local == localName and to == b and topLevel and match fact {
                        case None => false
                        case Some(f) => stableAlias(source, local, f, kind)
                    }
                }, bs);
                let (targetSource, _, _, _) = Map.getWithDefault(b, ("", "", "", ""), indexed);
                let targetDeclarations = List.filter(match (symbol, file, _, _, _) -> symbol == target and file == b, declarations);
                let stableTarget = match targetDeclarations {
                    case (_, _, name, start, end) :: Nil => {
                        let prefix = Grit.substring(targetSource, 0, start);
                        let suffix = Grit.substring(targetSource, end, Vector.length(String.toBytes(targetSource)));
                        let assignment = "(?<![.\\w$])" + Pattern.quote(name) + "\\s*=(?!=|>)";
                        let definition = Grit.substring(targetSource, start, end);
                        let namedFunction = Binding.capture("^(?:export\\s+(?:default\\s+)?)?(?:async\\s+)?function\\s+" + Pattern.quote(name) + "\\b", definition, 0) != None;
                        Binding.capture(assignment, prefix, 0) == None and Binding.capture(assignment, suffix, 0) == None
                            and (not namedFunction or Binding.capture(assignment, targetSource, 0) == None)
                    }
                    case _ => false
                };
                (w, if (qualified and stableTarget) "CertifiedModuleBinding" else "UnknownScopeOrReassignment")
            }, existing);
            (List.filterMap(match (w, status) -> if (status == "CertifiedModuleBinding") Some(w) else None, decisions), decisions)
        }
    }
}

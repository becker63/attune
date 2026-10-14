// Bounded source-supported calls,  separate from nominal admitted call identity.
pub mod Binding {
    use Attune.{FileId,  SymbolId,  Artifacts}
    use Attune.Repository.Grit
    import java.util.regex.Pattern
    pub type alias Declaration = (String, String, String, Int32, Int32)
    pub type alias Binding = (String, String, String, String, Int32)
    pub type alias Decision = (String, Int32, Int32, String, String, String, String)
    /// Conservative code-position check, not a JavaScript resolver or compiler.
    /// Grit already owns syntax spans; this only rejects text inside comments/strings.
    pub def codeAt(source: String, position: Int32): Bool = {
        def scan(index: Int32, state: Int32, escaped: Bool): Bool =
            if (index >= position) state == 0 else {
                let c = String.charAt(index, source);
                let next = if (index + 1 < String.length(source)) String.charAt(index + 1, source) else ' ';
                if (state == 4) scan(index + 1, if (c == '\n') 0 else 4, false)
                else if (state == 5) if (c == '*' and next == '/') scan(index + 2, 0, false) else scan(index + 1, 5, false)
                else if (state != 0) if (escaped) scan(index + 1, state, false)
                    else if (c == '\\') scan(index + 1, state, true)
                    else if ((state == 1 and c == '\'') or (state == 2 and c == '"') or (state == 3 and c == '`')) scan(index + 1, 0, false)
                    else scan(index + 1, state, false)
                else if (c == '/' and next == '/') scan(index + 2, 4, false)
                else if (c == '/' and next == '*') scan(index + 2, 5, false)
                else scan(index + 1, if (c == '\'') 1 else if (c == '"') 2 else if (c == '`') 3 else 0, false)
            };
        scan(0, 0, false)
    }
    pub def capture(regex: String,  source: String,  group: Int32): Option[String] \ IO = {
        let matcher = Pattern.compile(regex).matcher(source);
        def next(): Option[String] \ IO = if (matcher.find())
            if (codeAt(source, matcher.start())) Some(matcher.group(group)) else next()
            else None;
        next()
    }
    def occurrences(regex: String,  source: String): Int32 \ IO = {
        let matcher = Pattern.compile(regex).matcher(source);
        def count(n) = if(matcher.find()) count(n+(if(codeAt(source,matcher.start()))1 else 0)) else n;
        count(0)
    }
    pub def unshadowed(localName: String,  source: String): Bool \ IO = {
        let name = Pattern.quote(localName);
        occurrences("\\b(?:const|let|var|class|function)\\s+" + name + "\\b", source) <= 1
            and capture("(?:function[^()]*\\([^)]*\\b"+name+"\\b|\\([^)]*\\b"+name+"\\b[^)]*\\)\\s*=>)", source, 0) == None
    }
    // Literal Grit import spans delimit the module source; one-line bindings only.
    pub def bindings(path: String,  source: String,  facts: List[Grit.Fact],  imported: List[String],  witnesses: List[(String, String, String, String, Int32, Int32)]): List[Binding] \ IO =
        List.flatMap(f -> {
            let targets = List.filterMap(match (kind, a, b, file, lo, hi) -> if(kind == "imports" and a == path and file == path and lo == f#valueStart and hi == f#valueEnd and List.memberOf(b, imported)) Some(b) else None, witnesses) |> List.distinct;
            let line = Grit.substring(source, 0, f#startByte) |> String.lines |> List.last |> Option.getWithDefault("");
            let construct = Grit.substring(source, f#startByte, f#endByte);
            let required = capture("^[ \\t]*(?:const|let|var)[ \\t]+([A-Za-z_$][A-Za-z0-9_$]*)[ \\t]*=[ \\t]*$", line, 1);
            let importedAlias = capture("^import\\s+(?:\\*\\s+as\\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\\s+from\\s", construct, 1);
            let named = capture("^import\\s*\\{([^}]*)\\}\\s*from", construct, 1);
            let locals: List[(String,String)] = match required {case Some(localName) => List#{(localName, "require")} case None => match importedAlias {case Some(localName) => List#{(localName, "default")} case None => match named {
                case None => Nil
                case Some(items) => List.filterMap(item -> {
                    let clean=String.trim(item);
                    let localName=capture("^([A-Za-z_$][A-Za-z0-9_$]*)$", clean, 1);
                    match localName {case Some(a) => Some((a, a)) case None => match capture("^([A-Za-z_$][A-Za-z0-9_$]*)\\s+as\\s+([A-Za-z_$][A-Za-z0-9_$]*)$", clean, 1) {
                        case None => None case Some(remote) => Option.map(local -> (local, remote), capture("^[A-Za-z_$][A-Za-z0-9_$]*\\s+as\\s+([A-Za-z_$][A-Za-z0-9_$]*)$", clean, 1))
                    }}
                }, String.split(regex=",", items))
            }}};
            List.flatMap(match (localName, kind) -> if(unshadowed(localName, source)) List.map(target -> (path, localName, target, kind, f#valueStart), targets) else Nil, locals)
        }, facts)
    pub def exported(source: String,  name: String,  direct: Bool): Bool \ IO = {
        let quoted=Pattern.quote(name);
        if(direct) capture("module\\.exports\\s*=\\s*"+quoted+"\\s*;", source, 0) != None
            or capture("export\\s+default\\s+function\\s+"+quoted+"\\b", source, 0) != None
        else capture("export\\s+(?:function|const|let|var|class)\\s+"+quoted+"\\b", source, 0) != None
            or capture("(?:module\\.exports|exports)\\."+quoted+"\\s*=", source, 0) != None
            or match capture("module\\.exports\\s*=\\s*\\{([^}]*)\\}", source, 1) {
                case None => false
                case Some(items) => capture("(?:^|,)\\s*"+quoted+"(?:\\s*:\\s*"+quoted+")?\\s*(?:,|$)", items, 0) != None
            }
    }
    pub def analyze(raw: Campaign.Observations,  admitted: Campaign.Admitted): (List[Rules.Bound], List[Decision]) \ IO = {
        let (_, triples, _, earned, declarations, state, _) = admitted;
        if(state != "Completed") (Nil, Nil) else {
            let sourceIndex: Map[String,String]=List.toMap(List.map(match (path, source, _, _, _) -> (path, source), raw));
            let byFile: Map[String,List[Declaration]]=List.toMap(List.map(match (path, _, _, _, _) -> (path, List.filter(match (_, file, _, _, _) -> file == path, declarations)), raw));
            let byTarget: Map[(String,String),List[Declaration]]=List.foldLeft((m, d) -> {let (_, file, name, _, _)=d;Map.insert((file, name), d :: Map.getWithDefault((file, name), Nil, m), m)}, Map.empty(), declarations);
            let decisions: List[Decision]=List.flatMap(match (path, source, _, imports, calls) -> {
                let imported=List.filterMap(match (kind, a, b) -> if(kind == "imports" and a == path) Some(b) else None, triples);
                let fs=Artifacts.required(Result.mapErr(ToString.toString, Grit.facts(path, source, imports)));
                let bs=bindings(path, source, fs, imported, earned);
                let cs=Artifacts.required(Result.mapErr(ToString.toString, Grit.facts(path, source, calls)));
                List.map(f -> {
                    let owners=Map.getWithDefault(path, Nil, byFile) |> List.filter(match (_, _, _, lo, hi) -> lo <= f#startByte and f#endByte <= hi) |> List.sortBy(match (_, _, _, lo, hi) -> hi-lo);
                    let owner=List.head(owners) |> Option.map(match (s, _, _, _, _) -> s) |> Option.getWithDefault("");
                    let parts=String.split(regex="\\.", f#value);
                    let candidates: List[(String,String,String)]=List.filterMap(match (_, localName, target, kind, _) -> {
                        let targetName=match parts {case local :: member :: Nil if local == localName and kind == "require" => Some((member, false)) case local :: Nil if local == localName => Some((if(kind == "require" or kind == "default") "" else kind, true)) case _ => None};
                        match targetName {
                            case None => None
                            case Some((name, direct)) => {
                                let ds=if(name == "") Map.getWithDefault(target, Nil, byFile) |> List.filter(match (_, _, n, _, _) -> exported(Map.getWithDefault(target, "", sourceIndex), n, true))
                                    else Map.getWithDefault((target, name), Nil, byTarget) |> List.filter(match (_, _, n, _, _) -> exported(Map.getWithDefault(target, "", sourceIndex), n, direct and kind == "require"));
                                match ds {case (symbol, _, _, _, _) :: Nil if owner != "" => Some((owner, target, symbol)) case _ => None}
                            }
                        }
                    }, bs) |> List.distinct;
                    match candidates {
                        case (caller, target, callee) :: Nil => (path, f#valueStart, f#valueEnd, caller, target, callee, if(List.memberOf(("calls", caller, callee), triples)) "Supported" else "SourceSupportedButUnadmitted")
                        case _ => (path, f#valueStart, f#valueEnd, owner, "", f#value, "UnknownBindingOrOwnership")
                    }
                }, cs)
            }, raw);
            let bound=List.filterMap(match (path, lo, hi, caller, target, callee, status) -> if(status == "Supported")Some((FileId.FileId(path), SymbolId.SymbolId(caller), FileId.FileId(target), SymbolId.SymbolId(callee), lo, hi))else None, decisions);
            (bound, decisions)
        }
    }
}

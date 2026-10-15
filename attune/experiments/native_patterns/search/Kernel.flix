/// First-class fact preparation and native composition, scoped to one validated world.
pub mod Kernel {
    use Attune.{FileId, SymbolId}
    pub type alias Ready = { identity = String, facts = Fragments.Rules, fileNames = Map[FileId,String], fileIds = Map[String,FileId], symbolNames = Map[SymbolId,String], fileIndex = Map[String,Int32], index = Index }
    /// Admitted relations by integer id: (kind, forward) -> source -> targets. Built once per world.
    pub type alias Index = Map[(Int32,Bool),Map[Int32,Set[Int32]]]
    pub def prepare(expected: String, admitted: Campaign.Admitted, universes: List[Campaign.Ranked]): Result[String,Ready] = {
        let(identity,triples,_,_,_,state,_)=admitted;
        if(identity != expected or state != "Completed")Err("Unavailable or mismatched source world.")else {
            let fileNames=List.flatMap(match(k,a,b) -> match k {case "imports" => List#{a,b} case "defines" => a::Nil case _ => Nil},triples) ::: List.flatMap(q -> List.map(fst,q),universes) |> List.distinct |> List.sort;
            let symbolNames=List.flatMap(match(k,a,b) -> match k {case "calls" => List#{a,b} case "defines" => b::Nil case _ => Nil},triples) |> List.distinct |> List.sort;
            let fm=List.mapWithIndex((i,n) -> (n,FileId.FileId("${i}")),fileNames) |> List.toMap;
            let sm=List.mapWithIndex((i,n) -> (n,SymbolId.SymbolId("${i}")),symbolNames) |> List.toMap;
            let ii=List.filterMap(match(k,a,b) -> if(k == "imports")Some((Map.getWithDefault(a,FileId.FileId("-1"),fm),Map.getWithDefault(b,FileId.FileId("-1"),fm)))else None,triples);
            let dd=List.filterMap(match(k,a,b) -> if(k == "defines")Some((Map.getWithDefault(a,FileId.FileId("-1"),fm),Map.getWithDefault(b,SymbolId.SymbolId("-1"),sm)))else None,triples);
            let cc=List.filterMap(match(k,a,b) -> if(k == "calls")Some((Map.getWithDefault(a,SymbolId.SymbolId("-1"),sm),Map.getWithDefault(b,SymbolId.SymbolId("-1"),sm)))else None,triples);
            let facts: Fragments.Rules = inject ii,dd,cc into I/2,D/2,C/2;
            let fi=List.mapWithIndex((i,n) -> (n,i),fileNames) |> List.toMap;
            let si=List.mapWithIndex((i,n) -> (n,i),symbolNames) |> List.toMap;
            let edges=List.filterMap(match(k,a,b) -> match k {
                case "imports" => Option.flatMap(x -> Option.map(y -> (0,x,y),Map.get(b,fi)),Map.get(a,fi))
                case "defines" => Option.flatMap(x -> Option.map(y -> (1,x,y),Map.get(b,si)),Map.get(a,fi))
                case "calls" => Option.flatMap(x -> Option.map(y -> (2,x,y),Map.get(b,si)),Map.get(a,si))
                case _ => None
            },triples);
            def add(m: Index, direction: (Int32,Bool), x: Int32, y: Int32): Index = {
                let adjacent=Map.getWithDefault(direction,Map.empty(),m);
                Map.insert(direction,Map.insert(x,Set.insert(y,Map.getWithDefault(x,Set.empty(),adjacent)),adjacent),m)
            };
            let index=List.foldLeft((m,edge) -> {let(k,x,y)=edge;add(add(m,(k,true),x,y),(k,false),y,x)},Map.empty(),edges);
            Ok({identity=identity,facts=facts,fileIndex=fi,index=index,fileNames=Map.toList(fm) |> List.map(match(n,id) -> (id,n)) |> List.toMap,fileIds=fm,symbolNames=Map.toList(sm) |> List.map(match(n,id) -> (id,n)) |> List.toMap})
        }
    }
    pub def construct(identity: String, program: Language.Program): Fragments.Rules = {
        let ordered=Language.execution(program);
        List.foldLeft((acc,entry) -> {let(i,(atom,mask))=entry;let(kind,a,b)=atom;acc <+> (if(kind == 3)Fragments.different(a,b,identity,i)else Fragments.atom(kind,a,b,mask,identity,i))},Fragments.finish(identity,List.length(ordered)),List.mapWithIndex((i,v) -> (i,v),ordered))
    }
    pub def pairs(ready: Ready, programs: List[(String,Language.Program)], anchors: List[String]): List[(String,String,String)] = {
        let zeroF=FileId.FileId("-1");let zeroS=SymbolId.SymbolId("-1");
        let seeds=List.flatMap(match(p,_) -> List.map(a -> (p,0,Map.getWithDefault(a,zeroF,ready#fileIds),zeroF,zeroF,zeroS,zeroS,zeroS,zeroS),anchors),programs);
        let steps=List.flatMap(match(p,q) -> List.map(i -> (p,i,i+1),List.range(0,List.length(q))),programs);
        let start: Fragments.Rules=inject seeds,steps into St/9,Step/3;
        let fragments=List.foldLeft((acc,entry) -> {let(p,q)=entry;acc <+> construct(p,q)},start,programs);
        let rows=query ready#facts,fragments select(p,a,b) from Out(p,a,b);
        Vector.toList(rows) |> List.filterMap(match(p,a,b) -> match (Map.get(a,ready#fileNames),Map.get(b,ready#fileNames)) {case (Some(x),Some(y)) => Some((p,x,y)) case _ => None}) |> List.toSet |> Set.toList
    }

    /// World-specific emptiness proof: bounded arc consistency over admitted relation
    /// membership (never symbol names). Each variable keeps the ids that still have a
    /// partner on every atom; an empty domain means no assignment, so the native join
    /// returns nothing for this anchor.
    ///
    //   Defines(anchor, caller)  Calls(caller, callee)  Defines(candidate, callee)
    //   caller ∈ symbols the anchor defines ∩ symbols that call something
    //   callee ∈ callees of those callers  ∩ symbols some file defines
    //
    /// Sound by construction: values are removed only without support, large domains are
    /// treated as unconstrained, and rounds are capped. Failure to prove means execute.
    /// Requires a Ready world, so failed or partial admissions can never be proven empty.
    pub def provenEmpty(ready: Ready, p: Language.Program, anchors: List[String]): Bool =
        not List.isEmpty(anchors) and List.forAll(a -> match Map.get(a,ready#fileIndex) {
            case Some(i) => emptyFrom(ready#index,p,i)
            case None => false
        },anchors)
    def emptyFrom(index: Index, p: Language.Program, anchor: Int32): Bool = {
        let relations=List.filter(match(k,_,_) -> k != 3,p);
        def adjacent(k: Int32, forward: Bool): Map[Int32,Set[Int32]] = Map.getWithDefault((k,forward),Map.empty(),index);
        // Ids that can stand on one side, given the other side's domain (None = any id).
        def support(k: Int32, forward: Bool, other: Option[Set[Int32]]): Set[Int32] = match other {
            case None => Map.foldLeftWithKey((acc,v,_) -> Set.insert(v,acc),Set.empty(),adjacent(k,forward))
            case Some(d) => Set.foldLeft((acc,v) -> Set.union(acc,Map.getWithDefault(v,Set.empty(),adjacent(k,not forward))),Set.empty(),d)
        };
        def view(d: Map[Int32,Set[Int32]], v: Int32): Option[Set[Int32]] = Option.filter(s -> Set.size(s) <= 256,Map.get(v,d));
        def narrow(d: Map[Int32,Set[Int32]], v: Int32, s: Set[Int32]): Map[Int32,Set[Int32]] =
            Map.insert(v,match Map.get(v,d) {case Some(old) => Set.intersection(old,s) case None => s},d);
        def round(d: Map[Int32,Set[Int32]]): Map[Int32,Set[Int32]] = List.foldLeft((acc,atom) -> {
            let(k,x,y)=atom;
            let left=narrow(acc,x,support(k,true,view(acc,y)));
            narrow(left,y,support(k,false,view(left,x)))
        },d,relations);
        def settle(d: Map[Int32,Set[Int32]], left: Int32): Map[Int32,Set[Int32]] = {let next=round(d);if(next == d or left == 0)next else settle(next,left-1)};
        let domains=settle(Map#{0 => Set#{anchor}},6);
        let pinned=List.exists(match(k,x,y) -> k == 3 and (x == y or (match (Map.get(x,domains),Map.get(y,domains)) {
            case (Some(a),Some(b)) => Set.size(a) == 1 and a == b
            case _ => false
        })),p);
        pinned or Map.exists((_,d) -> Set.isEmpty(d),domains)
    }

    /// Empty-prefix reuse for one world and anchor set. If a literal positive prefix of p
    /// was empty here, p only adds conjuncts, so p is empty too. Removing, reversing or
    /// relaxing atoms is not an extension and never matches a stored prefix.
    ///
    //   Imports(anchor, helper)  Imports(helper, candidate)                  empty here
    //   Imports(anchor, helper)  Imports(helper, candidate)  Defines(helper, s)   empty too
    pub def emptyByPrefix(empty: Set[String], p: Language.Program): Bool = {
        let ordered=List.filter(match(k,_,_) -> k != 3,List.map(fst,Language.execution(p)));
        List.exists(n -> {let prefix=List.take(n,ordered);Language.valid(prefix) and Set.memberOf(Language.coreKey(prefix),empty)},List.range(1,List.length(ordered)))
    }
}

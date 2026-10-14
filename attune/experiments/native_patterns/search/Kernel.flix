/// First-class fact preparation and native composition, scoped to one validated world.
pub mod Kernel {
    use Attune.{FileId, SymbolId}
    pub type alias Ready = { identity = String, facts = Fragments.Rules, fileNames = Map[FileId,String], fileIds = Map[String,FileId], symbolNames = Map[SymbolId,String] }
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
            Ok({identity=identity,facts=facts,fileNames=Map.toList(fm) |> List.map(match(n,id) -> (id,n)) |> List.toMap,fileIds=fm,symbolNames=Map.toList(sm) |> List.map(match(n,id) -> (id,n)) |> List.toMap})
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
}

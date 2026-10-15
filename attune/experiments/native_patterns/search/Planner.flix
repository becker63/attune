/// Execution order only: canonical programs and admitted facts remain unchanged.
pub mod Planner {
    use Attune.{FileId,SymbolId}
    pub type alias Statistics = List[(Int32,Int32,Int32,Int32)]
    pub def statistics(triples: List[(String,String,String)]): Statistics = List.map(k -> {
        let name=List.get(k,List#{"imports","defines","calls"});
        let rows=List.filterMap(match(kind,a,b) -> if(kind == name)Some((a,b))else None,triples) |> List.distinct;
        (k,List.length(rows),List.length(List.distinct(List.map(fst,rows))),List.length(List.distinct(List.map(snd,rows))))
    },List.range(0,3))
    pub def execution(p: Language.Program, stats: Statistics): List[(Language.Atom,Int32)] = {
        def loop(left, bound, acc) = if(List.isEmpty(left))List.reverse(acc)else {
            let legal=List.filter(match(k,a,b) -> if(k == 3)Set.memberOf(a,bound) and Set.memberOf(b,bound)else Set.memberOf(a,bound) or Set.memberOf(b,bound),left);
            def priority(atom)={
                let(k,a,b)=atom;let both=Set.memberOf(a,bound) and Set.memberOf(b,bound);
                let(_,card,l,r)=Option.getWithDefault((k,0,0,0),List.find(match(kind,_,_,_) -> kind == k,stats));
                let count=if(Set.memberOf(a,bound))l else r;
                let fanout=if(count == 0)0.0f64 else Int32.toFloat64(card)/Int32.toFloat64(count);
                (if(k == 3)0 else if(both)1 else 2,if(both)0.0f64 else fanout,atom)
            };
            match List.head(List.sortWith((a,b) -> Order.compare(priority(a),priority(b)),legal)) {
                case None => Nil // Valid connected/range-restricted inputs never reach this case.
                case Some(atom) => {
                    let(k,a,b)=atom;
                    let mask=(if(Set.memberOf(a,bound))List.get(a,List#{1,2,4,8,16,32,64})else 0)+(if(b != a and Set.memberOf(b,bound))List.get(b,List#{1,2,4,8,16,32,64})else 0);
                    loop(List.filter(v -> v != atom,left),if(k == 3)bound else Set.insert(a,Set.insert(b,bound)),(atom,mask)::acc)
                }
            }
        };
        loop(p,Set.singleton(0),Nil)
    }
    pub def construct(id: String, ordered: List[(Language.Atom,Int32)]): Fragments.Rules =
        List.foldLeft((acc,entry) -> {let(i,(atom,mask))=entry;let(k,a,b)=atom;acc <+> (if(k == 3)Fragments.different(a,b,id,i)else Fragments.atom(k,a,b,mask,id,i))},Fragments.finish(id,List.length(ordered)),List.mapWithIndex((i,v) -> (i,v),ordered))
    pub def pairs(ready: Kernel.Ready, programs: List[(String,Language.Program)], anchors: List[String], plans: List[(String,List[(Language.Atom,Int32)])]): List[(String,String,String)] = {
        let zeroF=FileId.FileId("-1");let zeroS=SymbolId.SymbolId("-1");
        let seeds=List.flatMap(match(p,_) -> List.map(a -> (p,0,Map.getWithDefault(a,zeroF,ready#fileIds),zeroF,zeroF,zeroS,zeroS,zeroS,zeroS),anchors),programs);
        let steps=List.flatMap(match(p,q) -> List.map(i -> (p,i,i+1),List.range(0,List.length(q))),programs);
        let start: Fragments.Rules=inject seeds,steps into St/9,Step/3;
        let fragments=List.foldLeft((acc,entry) -> {let(p,ordered)=entry;acc <+> construct(p,ordered)},start,plans);
        let rows=query ready#facts,fragments select(p,a,b) from Out(p,a,b);
        Vector.toList(rows) |> List.filterMap(match(p,a,b) -> match (Map.get(a,ready#fileNames),Map.get(b,ready#fileNames)) {case (Some(x),Some(y)) => Some((p,x,y)) case _ => None}) |> List.toSet |> Set.toList
    }

    /// Experimental bounded-query execution after sound world/anchor-specific emptiness proofs.
    /// Program ids of skipped empty relations contribute no rows; nonempty identities stay intact.
    pub def pairsPartitionedPruned(ready: Kernel.Ready, programs: List[(String,Language.Program)], anchors: List[String], plans: List[(String,List[(Language.Atom,Int32)])], width: Int32): List[(String,String,String)] = {
        let active = List.filter(match (_, p) -> not Kernel.provenEmpty(ready, p, anchors), programs);
        pairsPartitioned(ready, active, anchors, plans, width)
    }

    /// Experimental bounded-query execution. Each batch keeps its original program ids
    /// and plan; the result relation is the set union of the independent query outputs.
    pub def pairsPartitioned(ready: Kernel.Ready, programs: List[(String,Language.Program)], anchors: List[String], plans: List[(String,List[(Language.Atom,Int32)])], width: Int32): List[(String,String,String)] = {
        if (width <= 0) Nil else {
            def loop(left, acc) = if (List.isEmpty(left)) acc else {
                let batch = List.take(width, left);
                let ids = List.map(fst, batch);
                let batchPlans = List.filter(match (id, _) -> List.memberOf(id, ids), plans);
                loop(List.drop(width, left), pairs(ready, batch, anchors, batchPlans) ::: acc)
            };
            List.toSet(loop(programs, Nil)) |> Set.toList
        }
    }
}

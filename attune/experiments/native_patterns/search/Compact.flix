pub mod Compact {
    pub type alias Row = (String,String,List[(Int32,Option[Float64])],List[(Int32,Float64)],List[(Int32,Int32)],String,List[String])
    pub def encode(task: String, identity: String, baseline: Campaign.Ranked, ranking: Campaign.Ranked, support: List[(String,Float64)], pairs: List[(String,String)], state: String, errors: List[String]): Row = {
        let ids=List.mapWithIndex((i,row) -> (fst(row),i),baseline) |> List.toMap;
        def id(path)=Map.getWithDefault(path,-1,ids);
        (task,identity,List.map(match(path,score) -> (id(path),score),List.take(32,ranking)),List.map(match(path,v) -> (id(path),v),support),List.map(match(a,b) -> (id(a),id(b)),pairs),state,errors)
    }
    pub def decode(row: Row, baseline: Campaign.Ranked): (String,String,Campaign.Ranked,List[(String,Float64)],List[(String,String)],String,List[String]) = {
        let(task,identity,head,support,pairs,state,errors)=row;
        def path(id)=fst(List.get(id,baseline));
        let prefix=List.map(match(id,score) -> (path(id),score),head);
        let paths=List.map(fst,prefix) |> List.toSet;
        let ranking=prefix ::: List.filter(match(p,_) -> not Set.memberOf(p,paths),baseline);
        (task,identity,ranking,List.map(match(id,v) -> (path(id),v),support),List.map(match(a,b) -> (path(a),path(b)),pairs),state,errors)
    }
}

/// Exact signed development rewards. This module is evaluator-only.
pub mod Reward {
    use Specialization.{Signed, Pair, zero, plus, minus, mean, scale, compare, wire}
    pub type alias Task = (String,String,Pair)
    pub def positive(value: Signed): Signed = if(compare(value,zero()) == Comparison.GreaterThan)value else zero()
    pub def maximum(values: List[Signed]): Signed = List.foldLeft((a,b) -> if(compare(a,b) == Comparison.GreaterThan)a else b,zero(),values)
    pub def calculate(tasks: List[Task], eligible: List[String], atoms: Int32): (Pair,Pair,Pair,Pair,Pair,List[(String,Pair,Pair)]) \ IO = {
        let groups=List.map(match(_,r,_) -> r,tasks) |> List.distinct |> List.sort;
        let responses=List.map(r -> {
            let deltas=List.filterMap(match(_,repo,d) -> if(repo == r)Some(d)else None,tasks) |> List.map(Specialization.read);
            (r,mean(deltas),mean(List.map(d -> positive(minus(zero(),d)),deltas)))
        },groups);
        let benefits=List.filter(match(r,_,_) -> List.memberOf(r,eligible),responses) |> List.sortWith((a,b) -> {let(_,x,_)=a;let(_,y,_)=b;compare(y,x)});
        let best=List.take(2,benefits);
        let g=scale(List.foldLeft((s,row) -> {let(_,d,_)=row;plus(s,positive(d))},zero(),best),1,2);
        let l=mean(List.map(match(_,d,_) -> positive(d),List.drop(2,benefits)));
        let h=mean(List.map(match(_,_,v) -> v,responses));
        let w=maximum(List.map(match(_,_,v) -> v,responses));
        let reward=minus(minus(minus(minus(g,scale(l,1,4)),scale(h,2,1)),scale(w,1,2)),Specialization.signed(Int32.toBigInt(atoms),500ii));
        (wire(reward),wire(g),wire(l),wire(h),wire(w),List.map(match(r,d,v) -> (r,wire(d),wire(v)),responses))
    }
}

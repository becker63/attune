/// R3 is a separate objective over canonical metric values, never R2 history.
pub mod Quality {
    use Specialization.{Pair,Metric,Signed,zero,plus,minus,scale,mean,wire,compare}
    pub type alias Row = (String,String,List[Metric])
    pub type alias Wire = (Pair,Pair,Pair,Pair,Pair,Pair,Pair,Pair,List[(String,Pair,Pair)])
    pub def utility(values: List[Metric]): Signed \ IO =
        plus(plus(scale(Specialization.metric("Recall@10",values),1,2),scale(Specialization.metric("FileAcc@10",values),1,5)),plus(scale(Specialization.metric("Hit@1",values),1,5),scale(Specialization.metric("MRR@10",values),1,10)))
    pub def positive(value: Signed): Signed = if(compare(value,zero()) == Comparison.GreaterThan)value else zero()
    pub def score(rows: List[Row], studio: List[Row], atoms: Int32): (Wire,List[(String,Pair)]) \ IO = {
        use Attune.Artifacts;
        let identities=List.map(match(t,r,_) -> (t,r),rows) |> List.toSet;
        let expected=List.map(match(t,r,_) -> (t,r),studio) |> List.toSet;
        Artifacts.required(if(not List.isEmpty(rows) and List.length(rows) == Set.size(identities) and identities == expected and List.length(studio) == Set.size(expected))Ok(())else Err("Incompatible or empty R3 population."));
        let observations=List.map(match(task,repo,values) -> {
            let(_,_,baseline)=Artifacts.required(Option.toOk("Missing exact Studio task.",List.find(match(t,r,_) -> t == task and r == repo,studio)));
            let u=utility(values);let d=minus(u,utility(baseline));
            let hit=positive(minus(Specialization.metric("Hit@1",baseline),Specialization.metric("Hit@1",values)));
            let mrr=positive(minus(Specialization.metric("MRR@10",baseline),Specialization.metric("MRR@10",values)));
            (repo,u,d,positive(minus(zero(),d)),hit,mrr)
        },rows);
        let groups=List.map(match(_,r,_) -> r,rows) |> List.distinct |> List.sort;
        def aggregate(index) = mean(List.map(r -> mean(List.filterMap(match(repo,u,d,h,hit,mrr) -> if(repo != r)None else Some(match index {case 0 => u case 1 => d case 2 => h case 3 => hit case _ => mrr}),observations)),groups));
        let gain=aggregate(1);let harm=aggregate(2);
        let reward=minus(minus(gain,scale(harm,1,2)),Specialization.signed(Int32.toBigInt(atoms),500ii));
        let responses=List.map(r -> {let ds=List.filterMap(match(repo,_,d,_,_,_) -> if(repo == r)Some(d)else None,observations);(r,wire(mean(ds)),wire(mean(List.map(d -> positive(minus(zero(),d)),ds))))},groups);
        let metricMeans=List.map(name -> (name,wire(mean(List.map(r -> mean(List.filterMap(match(_,repo,v) -> if(repo == r)Some(Specialization.metric(name,v))else None,rows)),groups)))),List#{"Recall@10","FileAcc@10","Hit@1","MRR@10"});
        ((wire(reward),wire(gain),wire(harm),wire(aggregate(0)),wire(harm),("0","1"),wire(aggregate(3)),wire(aggregate(4)),responses),metricMeans)
    }
    pub def number(pair: Pair): Float64 \ IO = {
        use Attune.Artifacts;
        let(n,d)=pair;
        Artifacts.required(Option.toOk("Invalid R3 numerator.",Float64.fromString(n)))/Artifacts.required(Option.toOk("Invalid R3 denominator.",Float64.fromString(d)))
    }
    /// Affine carrier for unchanged search: (carrier+4)/5 == (R3+2)/3.
    pub def carrier(pair: Pair): Float64 \ IO = {
        use Attune.Artifacts;
        let value=number(pair);
        Artifacts.required(if(value >= -2.0f64 and value <= 1.0f64)Ok(())else Err("R3 outside frozen [-2,1] envelope."));
        (5.0f64*value-2.0f64)/3.0f64
    }
}

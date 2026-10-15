// Label-free policy probe. A group is a disjunction of conjunctive programs: its witness
// set is the union of its members' witnesses, so composition never conjoins atoms.
// Each group is applied under a fixed, predeclared menu of ranking policies. The
// production policy is Rank.ranking "expansion"; the others vary only application.
use Attune.Artifacts
use Attune.Studio
use Util.Json
use Util.Json.ToJson.toJson

type alias ProbeGroup = (String, List[(String, Language.Program)])

/// Reciprocal-rank fusion with structural weight w (w = 1 equals Studio.combine, k = 60).
def weighted(baseline: Campaign.Ranked, structural: List[Studio.Hit], w: Float64): Campaign.Ranked = {
    def vote(i)=1.0f64/(60.0f64+Int32.toFloat64(i+1));
    let q=List.mapWithIndex((i,row) -> (fst(row),vote(i)),baseline);
    let s=List.mapWithIndex((i,h) -> (h#path,w*vote(i)),structural);
    let paths=List.distinct(List.map(fst,q ::: s));
    let scored=List.map(p -> {path=p,score=List.foldLeft((t,row) -> if(fst(row) == p)t+snd(row)else t,0.0f64,q ::: s),witnesses=Nil},paths) |> Studio.sorted;
    let prefix=List.take(32,scored) |> List.map(h -> (h#path,Some(h#score)));
    prefix ::: List.filter(match(p,_) -> not List.exists(match(v,_) -> v == p,prefix),baseline)
}

def policies(baseline: Campaign.Ranked, support: List[Studio.Hit]): List[(String, Campaign.Ranked)] = List#{
    ("identity",baseline),
    ("expansion",if(List.isEmpty(support))baseline else Rank.ranking(baseline,support,"expansion")),
    ("fixed",if(List.isEmpty(support))baseline else Rank.ranking(baseline,support,"fixed")),
    ("promotion",if(List.isEmpty(support))baseline else Rank.ranking(baseline,support,"promotion")),
    ("rrf-w0.25",if(List.isEmpty(support))baseline else weighted(baseline,support,0.25f64)),
    ("rrf-w0.5",if(List.isEmpty(support))baseline else weighted(baseline,support,0.5f64)),
    ("rrf-w2",if(List.isEmpty(support))baseline else weighted(baseline,support,2.0f64))
}

def main(): Unit \ IO = {
    let jobs: List[(String,String,String,String)]=Campaign.input("jobs");
    let groups: List[ProbeGroup]=Campaign.input("groups");
    let members=List.flatMap(snd,groups) |> List.distinct;
    Artifacts.required(if(List.forAll(match(_,p) -> Language.valid(p),members))Ok(())else Err("Invalid program in policy probe."));
    let rows=List.flatMap(match(task,expected,graphName,qName) -> {
        let baseline: Campaign.Ranked=Campaign.input(qName);
        let graph: Campaign.Admitted=Campaign.input(graphName);
        let universe=List.map(fst,baseline);
        let(_,triples,_,_,_,state,_)=graph;
        let stats=Planner.statistics(triples);
        let plans=List.map(match(id,p) -> (id,Planner.execution(p,stats)),members);
        let pairs=match Kernel.prepare(expected,graph,List#{baseline}) {case Ok(ready) => Planner.pairs(ready,members,List.take(5,universe),plans) case Err(_) => Nil};
        List.flatMap(match(name,group) -> {
            let ids=List.map(fst,group);
            let hits=List.filterMap(match(id,a,b) -> if(List.memberOf(id,ids))Some((a,b,Nil))else None,pairs);
            let support=Rank.support(hits,universe,"normalized",1);
            let anchors=List.map(match(a,_,_) -> a,hits) |> List.distinct |> List.length;
            let inTop=List.filter(h -> List.memberOf(h#path,List.take(10,universe)),support) |> List.length;
            List.map(match(policy,ranking) -> (task,name,policy,List.take(10,List.map(fst,ranking)),List.length(support),anchors,inTop,state),policies(baseline,support))
        },groups)
    },jobs);
    Payload.write(Json.toCompactString(toJson(rows)))
}

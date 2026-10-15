// Frozen post-Studio additive treatment D. Separate from the R3 search owners:
// the baseline is the retained exact-path-v1 Studio ranking with its scores, and
// the only added term is 0.5/(60+rank_rule(file)) for rule-supported files.
use Attune.{Artifacts,Studio}
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

type alias Job = (String,String,String,String,String)
type alias Check = (String,Bool,Int32,String)
type alias WitnessRow = (String,Int32,Float64,Int32,Int32)

/// One bounded reciprocal-rank contribution; k=60 and coefficient 0.5 are frozen
/// experimental design choices, never fitted on development or reserved outcomes.
pub def compose(studio: Campaign.Ranked, support: List[Studio.Hit]): Campaign.Ranked = {
    let ranks=List.mapWithIndex((i,h) -> (h#path,i+1),support) |> List.toMap;
    let hits=List.map(match(path,s) -> {
        let base=Option.getWithDefault(0.0f64,s);
        let bonus=match Map.get(path,ranks) {case Some(r) => 0.5f64/(60.0f64+Int32.toFloat64(r)) case None => 0.0f64};
        {path=path,score=base+bonus,witnesses=Nil}
    },studio);
    List.map(h -> (h#path,Some(h#score)),Studio.sorted(hits))
}

def rankMap(ranking: Campaign.Ranked): Map[String,Int32] =
    List.mapWithIndex((i,row) -> (fst(row),i+1),ranking) |> List.toMap

def main(): Unit \ IO = {
    let mode: String=Campaign.input("mode");
    let jobs: List[Job]=Campaign.input("jobs");
    let programs: List[(String,Language.Program)]=Campaign.input("programs");
    let unmeasured: List[(String,List[String])]=Campaign.input("unmeasured");
    Artifacts.required(if(List.length(programs) <= 8 and List.length(programs) == Set.size(List.map(fst,programs) |> List.toSet) and List.forAll(match(_,p) -> Language.valid(p),programs))Ok(())else Err("Invalid native program batch."));
    let payload: (List[Compact.Row],List[(String,String,List[WitnessRow])],List[Check])=List.foldLeft((acc,job) -> {
        let(rows,diagnostics,checks)=acc;
        let(task,expected,graphName,qName,studioName)=job;
        let baseline: Campaign.Ranked=Campaign.input(qName);
        let studio: Campaign.Ranked=Campaign.input(studioName);
        let graph: Campaign.Admitted=Campaign.input(graphName);
        let universe=List.map(fst,baseline);
        let allowed=Map.getWithDefault(task,Nil,List.toMap(unmeasured));
        Artifacts.required(if(List.length(universe) == Set.size(List.toSet(universe)) and List.forAll(match(path,s) -> match s {case Some(v) => Float64.isFinite(v) case None => List.memberOf(path,allowed)},baseline))Ok(())else Err("Invalid saved Qwen universe or scores."));
        Artifacts.required(if(List.length(studio) == List.length(universe) and List.toSet(List.map(fst,studio)) == List.toSet(universe) and List.forAll(match(_,s) -> match s {case Some(v) => Float64.isFinite(v) case None => false},studio))Ok(())else Err("Retained Studio ranking is not a scored permutation of the candidate universe."));
        let(identity,triples,_,_,_,state,errors)=graph;
        let prepared=Kernel.prepare(expected,graph,List#{baseline,studio});
        let stats=Planner.statistics(triples);
        let plans=List.map(match(id,p) -> (id,Planner.execution(p,stats)),programs);
        Artifacts.required(if(List.forAll(match(id,ordered) -> match List.find(match(name,_) -> name == id,programs) {
            case Some((_,p)) => List.length(ordered) == List.length(p) and List.toSet(List.map(fst,ordered)) == List.toSet(p)
            case None => false
        },plans))Ok(())else Err("Execution plan dropped or changed a logical atom."));
        let planDigest=Campaign.sha(Json.toCompactString(toJson((expected,"fanout-v1",stats,plans))));
        let pairs=match prepared {case Ok(ready) => Planner.pairs(ready,programs,List.take(5,universe),plans) case Err(_) => Nil};
        // Saved Studio ranks and scores must reproduce exactly through the existing owners.
        let world=Attune.World.World(identity);
        let facts=List.map(Campaign.fact(world),triples);
        let recomputed=Studio.combine(Rank.hits(baseline),Studio.structural(List.take(5,universe),world,facts));
        let scoreDiff=List.foldLeft((n,pair) -> {
            let(a,b)=pair;
            match (a,b) {
                case (Some(x),Some(y)) => if(x == y)n else n+1
                case (None,None) => n
                case _ => n+1
            }
        },0,List.mapWithIndex((i,r) -> (Some(r#score),snd(List.get(i,studio))),recomputed));
        let check: Check=(task,List.map(h -> h#path,recomputed) == List.map(fst,studio),scoreDiff,planDigest);
        let qrow=Compact.encode(task,"Qwen",baseline,baseline,Nil,Nil,"Completed",Nil);
        let srow=Compact.encode(task,"StudioRetained",baseline,studio,Nil,Nil,"Completed",Nil);
        let perProgram=List.map(match(name,_p) -> {
            let hits=List.filterMap(match(id,a,b) -> if(id == name)Some((a,b,Nil))else None,pairs);
            let support=Rank.support(hits,universe,"normalized",1);
            let causal=Rank.ranking(baseline,support,"expansion");
            let composed=compose(studio,support);
            let proof=List.map(match(a,b,_) -> (a,b),hits);
            let stateName=match prepared {case Ok(_) => "Completed" case Err(_) => "Fallback"};
            let errs=if(state == "Completed")Nil else errors;
            let crow=Compact.encode(task,"QwenPlus:"+name,baseline,causal,List.map(h -> (h#path,h#score),support),proof,stateName,errs);
            let drow=Compact.encode(task,"StudioPlus:"+name,baseline,composed,List.map(h -> (h#path,h#score),support),proof,"Completed",Nil);
            let studioRank=rankMap(studio);
            let composedRank=rankMap(composed);
            let diag=(task,"StudioPlus:"+name,List.mapWithIndex((i,h) -> (h#path,i+1,h#score,Map.getWithDefault(h#path,-1,studioRank),Map.getWithDefault(h#path,-1,composedRank)),support));
            (crow,drow,diag)
        },programs);
        (rows ::: (qrow :: srow :: List.map(match(c,_,_) -> c,perProgram) ::: List.map(match(_,d,_) -> d,perProgram)),
         diagnostics ::: List.map(match(_,_,x) -> x,perProgram),
         check :: checks)
    },((Nil,Nil,Nil):(List[Compact.Row],List[(String,String,List[WitnessRow])],List[Check])),jobs);
    let(rows,diagnostics,checks)=payload;
    if(mode == "rows")Payload.write(Json.toCompactString(toJson(rows)))else Payload.write(Json.toCompactString(toJson((diagnostics,checks))))
}

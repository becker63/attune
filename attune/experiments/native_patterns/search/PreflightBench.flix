use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System

/// One completed development world. Modes over the same frozen, ordered workload:
///   A  original: every distinct canonical key executes natively
///   B  static:   Unsatisfiable answers empty, proven-core computations execute once
///   C  full:     B, then empty-prefix reuse and arc-consistency emptiness before executing
/// Each clock reading follows printed digests of everything computed before it, so pure
/// work cannot move across the boundary. Order B, C, A gives A the most JIT warm-up.
type alias Job = (String,String,String,String)
type alias Answers = Map[String,Set[(String,String)]]

def main(): Unit \ IO = {
    let jobs: List[Job]=Campaign.input("jobs");
    let workload: List[(String,Language.Program)]=Payload.input("workload");
    let archive: List[(String,Language.Program)]=Payload.input("archive");
    let (task,expected,graphName,qName)=List.head(jobs) |> Option.getWithDefault(("","","",""));
    let began=System.nanoTime();
    let baseline: Campaign.Ranked=Campaign.input(qName);
    let graph: Campaign.Admitted=Campaign.input(graphName);
    let ready=Artifacts.required(Kernel.prepare(expected,graph,List#{baseline}));
    let anchors=List.take(5,List.map(fst,baseline));
    let(_,triples,_,_,_,_,_)=graph;
    let stats=Planner.statistics(triples);
    println("prepare=${Map.size(ready#fileIndex)}:${Map.size(ready#index)}");
    let prepared=System.nanoTime();
    def answer(id: String, p: Language.Program): Set[(String,String)] =
        Planner.pairs(ready,List#{(id,p)},anchors,List#{(id,Planner.execution(p,stats))}) |> List.map(match(_,a,b) -> (a,b)) |> List.toSet;
    def digest(answers: Answers): String = Campaign.sha(Json.toCompactString(toJson(Map.toList(answers) |> List.map(match(k,v) -> (k,Set.toList(v))))));
    let warm=List.foldLeft((acc,entry) -> {let(k,p)=entry;Map.insert(k,answer(k,p),acc)},Map.empty(),List.take(20,workload));
    println("warm=${digest(warm)}");
    // B: computation identity shared only on a proven core; unsatisfiable never executes.
    let t0=System.nanoTime();
    let(answersB,cacheB,codesB)=List.foldLeft((acc,entry) -> {
        let(answers,cache,codes)=acc;let(k,p)=entry;
        match Language.preflight(p) {
            case Language.Verdict.Invalid(reason) => (answers,cache,("I:"+reason)::codes)
            case Language.Verdict.Unsatisfiable => (Map.insert(k,Set.empty(),answers),cache,"U"::codes)
            case Language.Verdict.Compute(c) => match Map.get(c,cache) {
                case Some(v) => (Map.insert(k,v,answers),cache,"R"::codes)
                case None => {let v=answer(k,p);(Map.insert(k,v,answers),Map.insert(c,v,cache),"X"::codes)}
            }
        }
    },(Map.empty(),Map.empty(),Nil),workload);
    println("B=${digest(answersB)}:${Map.size(cacheB)}:${List.length(codesB)}");
    let t1=System.nanoTime();
    // C: B plus world-specific proofs; known-empty computations feed prefix reuse.
    let(answersC,_,_,codesC)=List.foldLeft((acc,entry) -> {
        let(answers,cache,empty,codes)=acc;let(k,p)=entry;
        match Language.preflight(p) {
            case Language.Verdict.Invalid(reason) => (answers,cache,empty,("I:"+reason)::codes)
            case Language.Verdict.Unsatisfiable => (Map.insert(k,Set.empty(),answers),cache,empty,"U"::codes)
            case Language.Verdict.Compute(c) => match Map.get(c,cache) {
                case Some(v) => (Map.insert(k,v,answers),cache,empty,"R"::codes)
                case None =>
                    if(Kernel.emptyByPrefix(empty,p))(Map.insert(k,Set.empty(),answers),Map.insert(c,Set.empty(),cache),Set.insert(c,empty),"P"::codes)
                    else if(Kernel.provenEmpty(ready,p,anchors))(Map.insert(k,Set.empty(),answers),Map.insert(c,Set.empty(),cache),Set.insert(c,empty),"F"::codes)
                    else {let v=answer(k,p);(Map.insert(k,v,answers),Map.insert(c,v,cache),if(Set.isEmpty(v))Set.insert(c,empty)else empty,"X"::codes)}
            }
        }
    },(Map.empty(),Map.empty(),Set.empty(),Nil),workload);
    println("C=${digest(answersC)}:${List.length(codesC)}");
    let t2=System.nanoTime();
    let answersA=List.foldLeft((acc,entry) -> {let(k,p)=entry;if(Map.memberOf(k,acc))acc else Map.insert(k,answer(k,p),acc)},Map.empty(),workload);
    println("A=${digest(answersA)}");
    let t3=System.nanoTime();
    // Overheads measured alone, over the same workload.
    let verdicts=List.map(match(_,p) -> ToString.toString(Language.preflight(p)),workload);
    println("static=${Campaign.sha(String.intercalate(";",verdicts))}");
    let t4=System.nanoTime();
    let feasible=List.map(match(_,p) -> Kernel.provenEmpty(ready,p,anchors),workload);
    println("feasibility=${List.count(x -> x,feasible)}");
    let t5=System.nanoTime();
    // Whole-archive opportunity: world emptiness proofs only, no native execution.
    let archiveEmpty=List.filterMap(match(k,p) -> if(Language.valid(p) and Kernel.provenEmpty(ready,p,anchors))Some(k)else None,archive);
    println("archive=${List.length(archiveEmpty)}");
    let t6=System.nanoTime();
    def mismatches(other: Answers): List[String] = List.filterMap(match(k,_) -> if(Map.get(k,other) == Map.get(k,answersA))None else Some(k),workload) |> List.distinct;
    let nativeEmpty=List.filter(match(k,_) -> Map.get(k,answersA) == Some(Set.empty()),workload) |> List.map(fst) |> List.distinct;
    let report=(task,expected,
        (prepared-began,t1-t0,t2-t1,t3-t2,t4-t3,t5-t4,t6-t5),
        (List.reverse(codesB),List.reverse(codesC)),
        (mismatches(answersB),mismatches(answersC)),
        nativeEmpty,
        List.zip(List.map(fst,workload),feasible) |> List.filter(snd) |> List.map(fst),
        archiveEmpty,
        Map.toList(answersA) |> List.map(match(k,v) -> (k,Set.size(v))));
    Payload.write(Json.toCompactString(toJson(report)))
}

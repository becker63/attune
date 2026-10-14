// Frozen grouped selection. The held-out group never enters its selector.
use Attune.{Artifacts, Study}
use Util.Json
use Util.Json.ToJson.toJson

type alias MetricValue = (String, Option[(String,String)])
type alias Evaluated = (String,String,String,Int32,List[(String,List[MetricValue],(List[String],List[String],List[String]),String,List[String])])
type alias Score = (String,String,Study.Ratio)
def ratio(pair: (String,String)): Study.Ratio = {
    let (n,d)=pair;
    {numerator=Option.getWithDefault(0ii,BigInt.fromString(n)),denominator=Option.getWithDefault(1ii,BigInt.fromString(d))}
}
def mean(values: List[Study.Ratio]): Study.Ratio = Option.getWithDefault(Study.ratio(0,1),Study.meanRatio(values))
def pair(r: Study.Ratio): (String,String) = (ToString.toString(r#numerator),ToString.toString(r#denominator))
def compare(a: Study.Ratio,b: Study.Ratio): Comparison = Order.compare(b#numerator*a#denominator,a#numerator*b#denominator)
def main(): Unit \ IO = {
    let phase: String = Campaign.input("phase");
    let tasks: List[String] = Campaign.input("tasks");
    let costs: List[(String,Int32)] = Campaign.input("costs");
    let records: List[Evaluated] = List.map(Campaign.input,tasks);
    let eligible = List.filter(match (_,_,status,n,_) -> status=="eligible-gold" and n>0,records);
    let groups = List.map(match (_,g,_,_,_) -> g,eligible) |> List.distinct |> List.sort;
    let configs = List.map(fst,costs);
    let metrics = List#{"Hit@1","Hit@5","Hit@10","Recall@1","Recall@5","Recall@10","MRR@10","FileAcc@10","FileAcc@32","Recall@32"};
    let taskIndex = List.toMap(List.map(match (task, _, _, _, results) ->
        (task, List.toMap(List.flatMap(match (config, entries, _, _, _) ->
            List.map(match (metric, value) -> ((config, metric), Option.map(ratio, value) |> Option.getWithDefault(Study.ratio(0, 1))), entries), results))), eligible));
    def values(config, metric, population) = List.map(match (task, _, _, _, _) ->
        Map.getWithDefault((config, metric), Study.ratio(0, 1), Map.getWithDefault(task, Map.empty(), taskIndex)), population);
    let grouped: List[(String,List[Score])] = List.map(g -> {
        let population = List.filter(match (_,gg,_,_,_) -> g==gg,eligible);
        (g,List.flatMap(c -> List.map(m -> (c,m,mean(values(c,m,population))),metrics),configs))
    },groups);
    let groupIndex = List.toMap(List.map(match (group, scores) ->
        (group, List.toMap(List.map(match (config, metric, value) -> ((config, metric), value), scores))), grouped));
    def summary(config, metric, population) = mean(List.map(match (group, _) ->
        Map.getWithDefault((config, metric), Study.ratio(0, 1), Map.getWithDefault(group, Map.empty(), groupIndex)), population));
    let selected = List.map(g -> {
        let training = List.filter(match (gg,_) -> gg != g,grouped);
        let scores = List.map(match (c,cost) -> (c,summary(c,"Recall@10",training),summary(c,"MRR@10",training),cost),costs);
        let ranked = List.sortWith((left,right) -> {
            let (a,ar,am,ca)=left;
            let (b,br,bm,cb)=right;
            let recall = compare(ar,br);
            let mrr = compare(am,bm);
            if(recall != Comparison.EqualTo) recall else if(mrr != Comparison.EqualTo) mrr else if(ca != cb) Order.compare(ca,cb) else Order.compare(a,b)
        },scores);
        let (choice,r,m,_)=Option.getWithDefault(("Qwen",Study.ratio(0,1),Study.ratio(0,1),0),List.head(ranked));
        (g,choice,pair(r),pair(m))
    },groups);
    if (phase == "selection") {
        Artifacts.write(Json.toCompactString(toJson((List.length(eligible), List.length(groups), selected))))
    } else {
        if (phase == "report") {
            let (_, _, prior): (Int32, Int32, List[(String,String,(String,String),(String,String))]) = Campaign.input("selection");
            Artifacts.required(if (prior == selected) Ok(()) else Err("Sealed selections changed."))
        } else ();
    let descriptive = List.flatMap(c -> List.map(m -> (c,m,pair(mean(values(c,m,eligible))),pair(summary(c,m,grouped))),metrics),configs);
    let groupWire = List.map(match (g,ss) -> (g,List.map(match (c,m,r) -> (c,m,pair(r)),ss)),grouped);
    Artifacts.write(Json.toCompactString(toJson((List.length(eligible),List.length(groups),selected,descriptive,groupWire))))
    }
}

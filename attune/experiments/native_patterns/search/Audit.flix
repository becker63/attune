// Full native assignments for a frozen rule; source certificates remain a separate account.
use Attune.{Artifacts,FileId,SymbolId}
use Util.Json
use Util.Json.ToJson.toJson
import java.lang.System
type alias Bound = (String,String,String,String,Int32,Int32)
type alias Assignment = List[String]

def certification(p: Language.Program, values: Assignment, graph: Campaign.Admitted, bound: List[Bound]): String = {
    let(_,_,_,_,declarations,_,_)=graph;
    let symbols=List.flatMap(match(k,a,b) -> if(k == 1)List#{b}else if(k == 2)List#{a,b}else Nil,p) |> List.distinct;
    def owner(v)={
        let name=List.get(v,values);
        let asserted=List.filterMap(match(k,f,s) -> if(k == 1 and s == v)Some(List.get(f,values))else None,p) |> List.distinct;
        let candidates=List.filter(match(symbol,file,_,_,_) -> symbol == name and (List.isEmpty(asserted) or List.memberOf(file,asserted)),declarations);
        if(List.length(asserted) > 1)None else match candidates {case (_,file,_,_,_)::Nil => Some(file) case _ => None}
    };
    let owners=List.map(v -> (v,owner(v)),symbols) |> List.toMap;
    let identitySafe=List.forAll(v -> not Option.isEmpty(Map.getWithDefault(v,None,owners)) and List.forAll(w ->
        List.get(v,values) != List.get(w,values) or Map.getWithDefault(v,None,owners) == Map.getWithDefault(w,None,owners),symbols),symbols);
    let calls=List.filter(match(k,_,_) -> k == 2,p);
    let supported=List.forAll(match(_,s,t) -> match(Map.getWithDefault(s,None,owners),Map.getWithDefault(t,None,owners)) {
        case (Some(a),Some(b)) => List.exists(match(source,caller,target,callee,_,_) -> (source,caller,target,callee) == (a,List.get(s,values),b,List.get(t,values)),bound)
        case _ => false
    },calls);
    if(not identitySafe)"UnknownOwnershipOrNominalIdentity"else if(not supported)"UnknownSourceBinding"else "SourceQualified"
}

def main(): Unit \ IO = {
    let graph: Campaign.Admitted=Campaign.input("graph");
    let baseline: Campaign.Ranked=Campaign.input("ranking");
    let(id,p): (String,Language.Program)=Campaign.input("program");
    let(referenceWorld,bound,_,state,_): (String,List[Bound],List[(Bound,String)],String,List[String])=Campaign.input("qualified");
    let original: Campaign.Admitted=Campaign.input("original");
    let raw: Campaign.Observations=Campaign.input("observations");
    let(origin,revision,_): (String,String,String)=Campaign.input("world");
    let originalRecipe: String=Campaign.input("original-recipe");
    let content=Campaign.sha(Json.toCompactString(toJson(List.map(match(path,source,_,_,_) -> (path,source),raw))));
    let Attune.World.World(expected)=Attune.worldId({origin=origin,content=revision+":"+content,semantics="agreement-exact-path-v1"});
    let Attune.World.World(expectedOriginal)=Attune.worldId({origin=origin,content=revision+":"+content,semantics=originalRecipe});
    let(world,_,_,_,decls,_,_)=graph;
    let(oldWorld,_,_,_,oldDecls,_,_)=original;
    Artifacts.required(if(world == expected and oldWorld == expectedOriginal and referenceWorld == oldWorld and List.toSet(decls) == List.toSet(oldDecls))Ok(())else Err("Incompatible source qualification reference."));
    let ready=Artifacts.required(Kernel.prepare(world,graph,List#{baseline}));
    let anchors=List.map(fst,List.take(5,baseline));
    let zf=FileId.FileId("-1");let zs=SymbolId.SymbolId("-1");
    let seeds=List.map(a -> (id,0,Map.getWithDefault(a,zf,ready#fileIds),zf,zf,zs,zs,zs,zs),anchors);
    let steps=List.map(i -> (id,i,i+1),List.range(0,List.length(p)));
    let start: Fragments.Rules=inject seeds,steps into St/9,Step/3;
    let clauses=start <+> Kernel.construct(id,p);
    let count=List.length(p);
    let began=System.nanoTime();
    let rows=query ready#facts,clauses select(program,k,a,b,c,s,t,u,v) from St(program,k,a,b,c,s,t,u,v);
    def file(v)=Map.getWithDefault(v,"",ready#fileNames);
    def symbol(v)=Map.getWithDefault(v,"",ready#symbolNames);
    let assignments=Vector.toList(rows) |> List.filterMap(match(program,k,a,b,c,s,t,u,v) -> if(program == id and k == count)Some(List#{file(a),file(b),file(c),symbol(s),symbol(t),symbol(u),symbol(v)})else None) |> List.toSet |> Set.toList;
    let exactPairs=List.map(values -> (id,List.get(0,values),List.get(1,values)),assignments) |> List.toSet;
    let projected=Kernel.pairs(ready,List#{(id,p)},anchors) |> List.toSet;
    Artifacts.required(if(exactPairs == projected)Ok(())else Err("RefactorRegression: full witness/projected support mismatch."));
    let classified=List.map(values -> (values,if(state == "Completed")certification(p,values,graph,bound)else "QualificationUnavailable"),assignments);
    let qualified=List.filterMap(match(values,status) -> if(status == "SourceQualified")Some((List.get(0,values),List.get(1,values),Nil))else None,classified);
    let support=Rank.support(qualified,List.map(fst,baseline),"normalized",1);
    let ranking=Rank.ranking(baseline,support,"expansion");
    let counts=List.foldLeft((m,row) -> {let(_,status)=row;Map.insert(status,Map.getWithDefault(status,0,m)+1,m)},Map.empty(),classified) |> Map.toList |> List.sort;
    let payload=Json.toCompactString(toJson((world,id,referenceWorld,state,List.length(assignments),List.toSet(List.map(match(a,b,_) -> (a,b),qualified)) |> Set.size,ranking,List.map(h -> (h#path,h#score),support),List.take(200,classified),counts)));
    // Opaque IO consumption precedes the final clock; displayed witnesses do not set support.
    let digest=Campaign.sha(payload);
    println("selected_full_witness_qualification_rank_consume_ns=${System.nanoTime()-began};digest=${digest}");
    Payload.write(payload)
}

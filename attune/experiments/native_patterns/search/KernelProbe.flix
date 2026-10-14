use Attune.{Artifacts, FileId, SymbolId}
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
 let fixtures: List[(String,Campaign.Admitted,List[String])] = Campaign.input("fixtures");
 let controls=Language.controls();
 let rows=List.map(match(name,admitted,seeds) -> {
  let (id,_,_,_,_,_,_)=admitted;
  let ready=Artifacts.required(Kernel.prepare(id,admitted,Nil));
  let all=Kernel.pairs(ready,controls,seeds);
  (name,List.map(match(control,_p) -> (control,List.filterMap(match(n,a,b) -> if(n == control)Some((a,b))else None,all)),controls))
 },fixtures);
 Artifacts.write(Json.toCompactString(toJson(rows)))
}

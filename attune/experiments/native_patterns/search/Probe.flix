use Attune.{FileId, SymbolId, Artifacts}
use Util.Json
use Util.Json.ToJson.toJson

def main(): Unit \ IO = {
 let aa=FileId.FileId("a"); let bb=FileId.FileId("b");
 let blank=FileId.FileId("-1"); let sym=SymbolId.SymbolId("-1");
 let ii=(aa,bb)::Nil;
 let ss=("p",0,aa,blank,blank,sym,sym,sym,sym)::Nil;
 let steps=("p",0,1)::Nil;
 let facts=inject ii,ss,steps into I/2,St/9,Step/3;
 let native=Fragments.atom(0,0,1,1,"p",0);
 let result=query facts,native select (p,k,a,b) from St(p,k,a,b,_,_,_,_,_);
 Artifacts.write(Json.toCompactString(toJson(Vector.toList(result) |> List.map(match(p,k,FileId.FileId(a),FileId.FileId(b)) -> (p,k,a,b)))))
}

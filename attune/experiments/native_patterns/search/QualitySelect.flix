// Development-only R3 shortlist; Studio is a separate zero-gain default.
use Util.Json
use Util.Json.ToJson.toJson
type alias QualityCandidate = (String,Language.Program,Quality.Wire,String,String,Int32)
type alias QualityScored = (QualityCandidate,Specialization.Signed,Specialization.Signed,Specialization.Signed)
def main(): Unit \ IO = {
    let candidates: List[QualityCandidate]=Payload.input("candidates");
    let values: List[QualityScored]=List.map(c -> {let(_,_,(r,g,h,_,_,_,_,_,_),_,_,_)=c;(c,Specialization.read(r),Specialization.read(g),Specialization.read(h))},candidates);
    def order(a,b)={
        let((id,p,_,_,_,_),r,_,h)=a;let((other,q,_,_,_,_),rr,_,hh)=b;
        let first=Specialization.compare(rr,r);let second=Specialization.compare(h,hh);
        if(first != Comparison.EqualTo)first else if(second != Comparison.EqualTo)second else Order.compare((Language.atoms(p),id),(Language.atoms(q),other))
    };
    let ordered=List.sortWith(order,values);
    let distinct=List.foldLeft((rows,c) -> {let((_,_,_,_,behavior,_),_,_,_)=c;if(List.exists(match((_,_,_,_,same,_),_,_,_) -> same == behavior,rows))rows else rows ::: List#{c}},Nil,ordered);
    let first=List.take(3,distinct);
    let families=List.map(match((_,_,_,f,_,_),_,_,_) -> f,distinct) |> List.distinct;
    let diverse=List.filterMap(f -> List.find(match((_,_,_,family,_,_),_,_,_) -> family == f,distinct),families);
    let imports=List.filter(match((_,p,_,_,_,_),_,_,_) -> Language.importOnly(p),distinct) |> List.take(2);
    let gain=List.sortWith((a,b) -> {let(_,_,g,_)=a;let(_,_,gg,_)=b;let c=Specialization.compare(gg,g);if(c == Comparison.EqualTo)order(a,b)else c},distinct) |> List.take(1);
    let result=(first ::: imports ::: gain ::: diverse ::: distinct) |> List.distinct |> List.take(12) |> List.map(match(c,_,_,_) -> c);
    Payload.write(Json.toCompactString(toJson(result)))
}

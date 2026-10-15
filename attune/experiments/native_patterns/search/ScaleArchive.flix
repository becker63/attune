// Each input belongs to one sealed private trial. No reserved outcome enters selection.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
use Specialization.{Signed,Pair,compare,plus,zero}
type alias RewardWire = (Pair,Pair,Pair,Pair,Pair,Pair,Pair,Pair,List[(String,Pair,Pair)])
type alias Candidate = (String,Language.Program,RewardWire)
type alias Scored = (Candidate,Signed,Signed,Signed,Int32,Bool)
def main(): Unit \ IO = {
    let candidates: List[Candidate]=Campaign.input("candidates");
    let values: List[Scored]=List.map(row -> {
        let(_,p,(reward,_,_,_,recallHarm,_,hitHarm,mrrHarm,responses))=row;
        let broad=Specialization.mean(List.map(match(_,d,_) -> Specialization.read(d),responses));
        let harm=plus(Specialization.read(recallHarm),plus(Specialization.read(hitHarm),Specialization.read(mrrHarm)));
        (row,Specialization.read(reward),broad,harm,Language.atoms(p),Language.importOnly(p))
    },candidates);
    def order(a,b)={
        let((id,_,_),r,g,h,n,_)=a;let((other,_,_),rr,gg,hh,nn,_)=b;
        let first=compare(rr,r);let second=compare(gg,g);let third=compare(h,hh);
        if(first != Comparison.EqualTo)first else if(second != Comparison.EqualTo)second else if(third != Comparison.EqualTo)third else Order.compare((n,id),(nn,other))
    };
    def dominates(a,b)={
        let(_,r,g,h,n,_)=a;let(_,rr,gg,hh,nn,_)=b;
        compare(r,rr) != Comparison.LessThan and compare(g,gg) != Comparison.LessThan and compare(h,hh) != Comparison.GreaterThan and n <= nn and
        (compare(r,rr) == Comparison.GreaterThan or compare(g,gg) == Comparison.GreaterThan or compare(h,hh) == Comparison.LessThan or n < nn)
    };
    let frontier=List.filter(a -> not List.exists(b -> dominates(b,a),values),values) |> List.sortWith(order);
    let specialist=List.sortWith(order,values) |> List.take(4);
    let broad=List.sortWith((a,b) -> {let(_,_,g,_,_,_)=a;let(_,_,gg,_,_,_)=b;let c=compare(gg,g);if(c == Comparison.EqualTo)order(a,b)else c},frontier) |> List.take(1);
    let imports=List.filter(match(_,_,_,_,_,i) -> i,frontier) |> List.take(1);
    let safe=List.filter(match(_,_,g,_,_,_) -> compare(g,zero()) == Comparison.GreaterThan,frontier) |> List.sortWith((a,b) -> {let(_,_,_,h,_,_)=a;let(_,_,_,hh,_,_)=b;let c=compare(h,hh);if(c == Comparison.EqualTo)order(a,b)else c}) |> List.take(1);
    let before=(specialist ::: broad ::: imports ::: safe) |> List.distinct;
    def family(p)=List.map(k -> List.length(List.filter(match(kind,_,_) -> kind == k,p)),List.range(0,4));
    let diverse=List.filter(a -> {let((_,p,_),_,_,_,_,_)=a;not List.exists(b -> {let((_,q,_),_,_,_,_,_)=b;family(p) == family(q)},before)},frontier) |> List.take(1);
    let selected=(before ::: diverse ::: frontier) |> List.distinct |> List.take(8);
    Artifacts.write(Json.toCompactString(toJson((List.map(match(c,_,_,_,_,_) -> c,selected),List.map(match(c,_,_,_,_,_) -> c,frontier)))))
}

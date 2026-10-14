// Development-only archive selection. Reserved outcomes cannot enter this action.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
use Specialization.{Signed,Pair,compare}
type alias RewardWire = (Pair,Pair,Pair,Pair,Pair,List[(String,Pair,Pair)])
type alias Candidate = (String,Language.Program,RewardWire)
type alias Scored = (Candidate,Signed,Signed,Signed,Int32)
def main(): Unit \ IO = {
    let candidates: List[Candidate]=Campaign.input("candidates");
    let values: List[Scored]=List.map(row -> {
        let(_,p,(reward,_,_,harm,_,responses))=row;
        let broad=Specialization.mean(List.map(match(_,d,_) -> Specialization.read(d),responses));
        (row,Specialization.read(reward),broad,Specialization.read(harm),Language.atoms(p))
    },candidates);
    def dominates(a,b)={
        let(_,r,g,h,n)=a;let(_,rr,gg,hh,nn)=b;
        let betterReward=compare(r,rr) != Comparison.LessThan;
        let betterGain=compare(g,gg) != Comparison.LessThan;
        let betterHarm=compare(h,hh) != Comparison.GreaterThan;
        betterReward and betterGain and betterHarm and n <= nn and
        (compare(r,rr) == Comparison.GreaterThan or compare(g,gg) == Comparison.GreaterThan or compare(h,hh) == Comparison.LessThan or n < nn)
    };
    let frontier=List.filter(a -> not List.exists(b -> dominates(b,a),values),values);
    let specialist=List.sortWith((a,b) -> {
        let((id,_,_),r,g,h,n)=a;let((other,_,_),rr,gg,hh,nn)=b;
        let first=compare(rr,r);let second=compare(gg,g);let third=compare(h,hh);
        if(first != Comparison.EqualTo)first else if(second != Comparison.EqualTo)second else if(third != Comparison.EqualTo)third else Order.compare((n,id),(nn,other))
    },frontier);
    let broad=List.sortWith((a,b) -> {
        let((id,_,_),r,g,h,n)=a;let((other,_,_),rr,gg,hh,nn)=b;
        let first=compare(gg,g);let second=compare(h,hh);let third=compare(rr,r);
        if(first != Comparison.EqualTo)first else if(second != Comparison.EqualTo)second else if(third != Comparison.EqualTo)third else Order.compare((n,id),(nn,other))
    },frontier);
    // Four specialist and four broad slots, deduplicated; fill from the same frontier.
    let selected=(List.take(4,specialist) ::: List.take(4,broad) ::: specialist) |> List.distinct |> List.take(8);
    Artifacts.write(Json.toCompactString(toJson((List.map(match(c,_,_,_,_) -> c,selected),List.map(match(c,_,_,_,_) -> c,frontier)))))
}

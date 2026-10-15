use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let ledger: Budget.Ledger=Campaign.input("ledger");
    let(mode,count,tokens): (String,Int32,List[Option[Int32]])=Campaign.input("operation");
    let reconciled=if(mode == "reconcile")List.foldLeft(Budget.releaseScale,ledger,tokens)else ledger;
    let(before,reservations)=List.foldLeft((acc,_) -> {let(current,rows)=acc;match Budget.reserveQuality(current) {
        case Ok(next) => (next,rows ::: List#{(current,next)})
        case Err(_) => (current,rows)
    }},(reconciled,Nil),List.range(0,if(mode == "reserve")count else 0));
    Artifacts.write(Json.toCompactString(toJson((before,reservations))))
}

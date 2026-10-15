// Conservative final reconciliation over immutable native HTTP receipts.
use Attune.Artifacts
use Util.Json
use Util.Json.ToJson.toJson
def main(): Unit \ IO = {
    let usage: List[(Int32,Option[Int32])]=Campaign.input("usage");
    let ledger=List.foldLeft((before,row) -> {
        let(attempts,tokens)=row;
        let reserved=Artifacts.required(Budget.reserve(before));
        // A verified zero-attempt configuration failure incurred no HTTP charge.
        Budget.reconcile(before,reserved,if(attempts == 0)Some(0)else tokens)
    },(0,0),usage);
    Artifacts.write(Json.toCompactString(toJson(ledger)))
}

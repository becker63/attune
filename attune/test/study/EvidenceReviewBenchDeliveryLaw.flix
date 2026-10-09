use Attune.Study.EvidenceSubstrate.{
    DeliveryReceipt, deliveryAccounting, deliveryAccountingFindings, deliveryAccountingLine
}
use Fs.FileRead

/// The laws of the four-quadrant delivery accounting (VAL-SUB-010, Gate C
/// offline half).
///
/// They consume the declared tree the `evidence_reviewbench_delivery` stage
/// action materialized from the corrected protocol's own per-operation receipts,
/// and recompute the four separated accountings from the SAME receipts: the
/// physical acquisition, the prepared payload, the model-visible delivery (only
/// an ACCEPTED, postprocessing-completed native result) and the observable later
/// use (else `Unavailable`). A failed or unaccepted operation contributes zero
/// visible bytes, so a schema/render failure or an interrupted return is never
/// counted as delivery.
///
/// Provider-free and offline: no model, no provider, no corpus, no gold.

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String =
    Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(line -> match fields(line) {
        case key :: path :: _ if key == name => Some(path)
        case _                               => None
    }, records(readText("attune-bindings.tsv"))) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def required(name: String): String \ IO = Option.getWithDefault("", binding(name))

def produced(name: String): String \ IO = readText(required("produced0") + "/" + name)

def receiptOf(row: List[String]): Option[DeliveryReceipt] =
    if (List.length(row) < 9) None
    else Some({
        operation = field(row, 0),
        world = field(row, 1),
        revision = field(row, 2),
        identity = field(row, 3),
        physicalBytes = intOf(field(row, 4)),
        preparedBytes = intOf(field(row, 5)),
        accepted = field(row, 6) == "accepted",
        visibleBytes = intOf(field(row, 7)),
        used = if (field(row, 8) == "Unavailable") None else Int32.fromString(field(row, 8))
    })

// --------------------------------------------------------------------- laws

/// The materialized four-quadrant accounting is the canonical Flix reduction of
/// the SAME receipts, and the four quadrants stay separated: the model-visible
/// total counts only accepted results, an unaccepted row carries no visible
/// bytes, and an unobservable later use stays `Unavailable` rather than a
/// fabricated zero.
@Test
def theDeliveryAccountingSeparatesTheFourQuadrants(): Unit \ {Assert, IO} = {
    let rows = List.map(fields, records(produced("delivery-receipts.tsv")));
    let receipts = List.filterMap(receiptOf, rows);
    Assert.assertEq(expected = true, List.length(receipts) > 0);
    Assert.assertEq(expected = Nil, deliveryAccountingFindings(receipts));
    let accounting = deliveryAccounting(receipts);
    Assert.assertEq(expected = deliveryAccountingLine(accounting) + "\n", produced("delivery-accounting.tsv"));
    // The quadrants are separate measurements, not a strict ordering: the
    // model-visible delivery can never exceed the prepared payload, and a
    // memoized exact-identity reuse may prepare more bytes than it physically
    // read in that one operation.
    Assert.assertEq(expected = true, accounting#deliveryPrepared >= accounting#modelVisibleDelivery);
    // A schema/render failure or an interrupted return is NOT delivery: an
    // unaccepted row contributes zero visible bytes, and the record exercises one.
    Assert.assertEq(expected = true, List.forAll(receipt -> receipt#accepted or receipt#visibleBytes == 0, receipts));
    Assert.assertEq(expected = true, List.exists(receipt -> not receipt#accepted, receipts));
    Assert.assertEq(expected = true, accounting#modelVisibleDelivery < accounting#deliveryPrepared);
    // An unobservable later use stays Unavailable rather than a fabricated zero.
    Assert.assertEq(expected = true, List.exists(receipt ->
        match receipt#used { case None => true case Some(_) => false }, receipts))
}

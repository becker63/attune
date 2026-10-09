use Attune.Study.EvidenceSubstrate.{
    DeliveryEventJoin, DeliveryReceipt, deliveryAccounting, deliveryAccountingFindings,
    deliveryAccountingLine, deliveryEventJoin, deliveryReceiptLine, deliveryReceiptOfJoin
}
use Fs.FileRead

/// The laws of the four-quadrant delivery accounting (VAL-SUB-010, Gate C
/// offline half).
///
/// They consume two declared inputs and recompute the SAME canonical meaning:
///
///  - the tree the `evidence_reviewbench_delivery` stage action materialized; and
///  - the ACTUAL retained native event stream of the ONE authorized local
///    source-delivery smoke (the byte-identical `events.jsonl` fixture) plus its
///    own prepared packet ledger.
///
/// The accepted receipt is DERIVED here from the SAME native event the stage
/// read: a completed, postprocessing-completed `status=completed` tool result that
/// carried the exact declared sealed span identity, its digest and its delivered/
/// omitted byte counts, joined with the run's own prepared ledger row. A
/// preparation-only ledger row can never establish delivery, so this law proves
/// the real receipt is not an authored acceptance flag. The four quadrants stay
/// separate, an unaccepted fault row contributes zero model-visible bytes, the
/// observable model echo is recorded as an observed REFERENCE only (never as
/// understanding), and the observable later source use stays the canonical
/// `Unavailable`.
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

def isSome(value: Option[String]): Bool = match value {
    case None    => false
    case Some(_) => true
}

def firstOf(rows: List[List[String]]): List[String] = match rows {
    case row :: _ => row
    case Nil      => Nil
}

// --------------------------------------------------------------------- laws

/// The accepted receipt the stage materialized is EXACTLY the canonical receipt
/// DERIVED here from the SAME retained native event stream: the completion status,
/// the exact sealed span identity, the span digest, the delivered/omitted byte
/// counts and the physical/prepared sizes all agree with the materialized bytes.
/// A preparation-only ledger row could not produce this, so a schema/render failure
/// or an interrupted return is never read as delivery.
@Test
def theRealAcceptedReceiptIsDerivedFromTheNativeEvent(): Unit \ {Assert, IO} = {
    let events = readText(required("test/study/fixtures/reviewbench-delivery-events.jsonl"));
    match deliveryEventJoin(events) {
        case None => Assert.assertEq(expected = "a retained native tool_result", "absent")
        case Some(join) =>
            // The native result completed and carried the exact sealed identity.
            Assert.assertEq(expected = "completed", join#status);
            Assert.assertEq(expected = true, String.length(join#spanSha256) == 64);
            Assert.assertEq(expected = true, join#spanBytes > 0);
            Assert.assertEq(expected = true, join#deliveredBytes > 0);
            Assert.assertEq(expected = true, join#deliveredBytes <= join#preparedBytes);
            Assert.assertEq(expected = true, join#omittedBytes > 0);
            // The observable model FIRST echo is a reference only: it exists, but
            // it is never read as understanding and never becomes an observed use.
            Assert.assertEq(expected = true, isSome(join#observedEcho));
            let real = deliveryReceiptOfJoin(join);
            Assert.assertEq(expected = true, real#accepted);
            Assert.assertEq(expected = join#deliveredBytes, real#visibleBytes);
            Assert.assertEq(expected = None, real#used);
            // The stage's materialized real receipt is byte-identical to this
            // recomputation, and it is the FIRST row of the union of receipts.
            Assert.assertEq(expected = deliveryReceiptLine(real) + "\n", produced("delivery-real-receipt.tsv"));
            let rows = List.map(fields, records(produced("delivery-receipts.tsv")));
            Assert.assertEq(expected = deliveryReceiptLine(real),
                List.join("\t", firstOf(rows)));
            // The ACTUAL receipt is joined with the run's own prepared ledger row:
            // identity, revision, digest and delivered bytes agree, so the ledger
            // is preparation and the native event is the delivery.
            let joins = List.map(fields, records(produced("delivery-joins.tsv")));
            Assert.assertEq(expected = 1, List.length(joins));
            let joinRow = firstOf(joins);
            Assert.assertEq(expected = join#callId, field(joinRow, 3));
            Assert.assertEq(expected = "completed", field(joinRow, 4));
            Assert.assertEq(expected = join#world, field(joinRow, 5));
            Assert.assertEq(expected = join#revision, field(joinRow, 6));
            Assert.assertEq(expected = join#identity, field(joinRow, 7));
            Assert.assertEq(expected = join#spanSha256, field(joinRow, 8));
            Assert.assertEq(expected = Int32.toString(join#deliveredBytes), field(joinRow, 11));
            Assert.assertEq(expected = Int32.toString(join#omittedBytes), field(joinRow, 12));
            // The retained ledger fixture is joined, not restated: its single row
            // carries the same prepared identity/digest/delivered bytes.
            let ledger = List.map(fields, records(readText(required("test/study/fixtures/reviewbench-delivery-ledger.tsv"))));
            Assert.assertEq(expected = 1, List.length(ledger));
            let ledgerRow = firstOf(ledger);
            Assert.assertEq(expected = join#revision, field(ledgerRow, 2));
            Assert.assertEq(expected = join#spanSha256, field(ledgerRow, 6));
            Assert.assertEq(expected = Int32.toString(join#spanBytes), field(ledgerRow, 7));
            Assert.assertEq(expected = Int32.toString(join#deliveredBytes), field(ledgerRow, 8))
    }
}

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
    // The real accepted native delivery contributes its actual visible bytes.
    Assert.assertEq(expected = true, List.exists(receipt -> receipt#accepted and receipt#visibleBytes > 0, receipts));
    // An unobservable later use stays Unavailable rather than a fabricated zero.
    Assert.assertEq(expected = true, List.exists(receipt ->
        match receipt#used { case None => true case Some(_) => false }, receipts))
}

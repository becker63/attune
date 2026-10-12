use Attune.Study.EvidenceSubstrate.{runObservationFindings, universalAbsence}
use Fs.FileRead

/// The laws of the ACTUAL native run's own acquisition accounting (VAL-SUB-010
/// runtime half, VAL-SUB-012 join).
///
/// They consume the declared tree the pinned compiler's authentic native Tester
/// materialized from `test/study/ReviewBenchIntegrationStages.flix` (the declared
/// `evidence_reviewbench_actual_runtime` stage action) over the FROZEN immutable
/// ledger of the ONE authorized remote ReviewBench source smoke — 72 rows, one
/// per served exact span of that actual native run. Nothing is compared against a
/// synthetic declared count: the whole-run exact-identity memo, the
/// unique/total/repeated byte accounting, the acquisitions and reuses and the
/// spans the run reached outside its initial progressive evidence are all
/// re-derived from the SAME delivery sequence the stage reduced.
///
/// The compact observation JOIN is recomputed here too: the scoped negative over
/// the declared population, the pure InformationDelta of the delivery and the
/// observed summary. The scoped negative never proves universal absence, and the
/// summary is an observer with no semantic stopping effect.
///
/// Provider-free and offline: no model, no provider, no new corpus, no gold. The
/// ledger is the frozen record of an already-acquired run, never re-acquired.

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

def producedRows(name: String): List[List[String]] \ IO =
    List.map(fields, records(produced(name)))

def producedLines(name: String): List[String] \ IO = records(produced(name))

/// The declared world identity of the reduced world pair, from the same manifest
/// the runtime stage reduced.
def worldId(): String \ IO =
    Option.getWithDefault("", List.findMap(row -> if (String.isEmpty(field(row, 0))) None
        else Some(field(row, 0)), producedRows("region-manifest.tsv")))

/// The exact identity key of one delivered span, under the SAME convention the
/// canonical `Attune.Study.EvidenceSubstrate.evidenceKey` uses.
def ledgerKey(world: String, row: List[String]): String =
    world + "|" + field(row, 2) + "|" + field(row, 3) + "|" + field(row, 6) + "|"
        + field(row, 4) + "|" + field(row, 5)

/// The bare span identity of one delivered ledger row, in the same
/// `revision|path|startLine|endLine|sha256` shape the declared region manifest
/// and the whole-file manifest carry, so a delivered row is cross-checked against
/// a declared identity of the same world pair.
def spanIdentity(row: List[String]): String =
    field(row, 2) + "|" + field(row, 3) + "|" + field(row, 4) + "|" + field(row, 5) + "|" + field(row, 6)

/// One reacquisition decision recomputed from the delivered sequence: the first
/// delivery of an exact identity is an acquisition and every later delivery of
/// the same exact identity is a reuse, even across packets and disclosure modes.
def decisions(world: String, rows: List[List[String]], seen: List[String]): List[String] = match rows {
    case Nil => Nil
    case row :: rest =>
        let reused = List.memberOf(ledgerKey(world, row), seen);
        (ledgerKey(world, row) + "\t" + (if (reused) "reuse" else "acquire") + "\t" + field(row, 1))
            :: decisions(world, rest, if (reused) seen else ledgerKey(world, row) :: seen)
}

def countDecision(records: List[String], decision: String): Int32 =
    List.length(List.filter(line -> String.contains(substr = "\t" + decision + "\t", line), records))

def uniqueBytes(world: String, rows: List[List[String]]): Int32 =
    List.foldLeft((sum, row) -> sum + intOf(field(row, 7)), 0,
        List.filterMap(key -> List.findMap(row -> if (ledgerKey(world, row) == key) Some(row) else None, rows),
            List.distinct(List.map(row -> ledgerKey(world, row), rows))))

def totalBytes(rows: List[List[String]]): Int32 =
    List.foldLeft((sum, row) -> sum + intOf(field(row, 7)), 0, rows)

/// The distinct exact identities whose FIRST delivery was not the packet's own
/// progressive evidence.
def outsideDiscoveries(world: String, rows: List[List[String]], seen: List[String], count: Int32): Int32 =
    match rows {
        case Nil => count
        case row :: rest =>
            if (List.memberOf(ledgerKey(world, row), seen)) outsideDiscoveries(world, rest, seen, count)
            else outsideDiscoveries(world, rest, ledgerKey(world, row) :: seen,
                if (field(row, 1) == "progressive") count else count + 1)
    }

def valueOf(name: String, rows: List[List[String]]): String =
    Option.getWithDefault("", List.findMap(row -> if (field(row, 0) == name) Some(field(row, 1)) else None, rows))

def commaList(text: String): List[String] =
    if (String.isEmpty(text) or text == "-") Nil
    else List.map(String.trim, String.split(regex = ",", text))

// --------------------------------------------------------------------- laws

/// The reduction is over the ACTUAL 72-row ledger of the authorized remote run:
/// the frozen delivery sequence has exactly the recorded number of served spans,
/// and every row is a declared region or whole-file identity of the same world
/// pair, so no fabricated or drifted record is accounted.
@Test
def theActualLedgerIsTheFrozenRealRunRecord(): Unit \ {Assert, IO} = {
    let ledger = producedRows("replay-ledger.tsv");
    Assert.assertEq(expected = 72, List.length(ledger));
    let regionKeys = List.map(row -> field(row, 1) + "|" + field(row, 2) + "|" + field(row, 3) + "|"
        + field(row, 4) + "|" + field(row, 5), producedRows("region-manifest.tsv"));
    let fileKeys = List.map(row -> field(row, 2) + "|" + field(row, 3) + "|1|" + field(row, 8) + "|"
        + field(row, 5), List.filter(row -> field(row, 0) == "file", producedRows("world-files.tsv")));
    Assert.assertEq(expected = true, List.forAll(row ->
        List.memberOf(spanIdentity(row), regionKeys)
            or List.memberOf(spanIdentity(row), fileKeys), ledger));
    // The three disclosure modes of the real run are present: the progressive
    // evidence, the full-source escape and one exact whole-file read.
    let modes = List.sort(List.distinct(List.map(row -> field(row, 1), ledger)));
    Assert.assertEq(expected = List#{"full-source", "progressive", "whole-file"}, modes)
}

/// The exact-identity memo, the byte accounting and the acquisition/reuse counts
/// are DERIVED from the actual delivery sequence, not declared: 72 served spans
/// reduce to 100041 unique / 120317 total / 20276 repeated bytes, 64 first
/// deliveries and exactly 8 re-deliveries of an exact identity. The repeated
/// bytes are a repeated DELIVERY, not a physical memo reuse of a different
/// identity and not independent defect discovery.
@Test
def theActualLedgerDerivesItsCanonicalSummary(): Unit \ {Assert, IO} = {
    let ledger = producedRows("replay-ledger.tsv");
    let expected = decisions(worldId(), ledger, Nil);
    Assert.assertEq(expected = expected, producedLines("reacquisition.tsv"));
    let acquisitions = countDecision(expected, "acquire");
    let reuses = countDecision(expected, "reuse");
    Assert.assertEq(expected = 72, acquisitions + reuses);
    Assert.assertEq(expected = 64, acquisitions);
    Assert.assertEq(expected = 8, reuses);
    let accounting = Option.getWithDefault(Nil, List.head(producedRows("byte-accounting.tsv")));
    Assert.assertEq(expected = 100041, intOf(field(accounting, 0)));
    Assert.assertEq(expected = 120317, intOf(field(accounting, 1)));
    Assert.assertEq(expected = 20276, intOf(field(accounting, 2)));
    Assert.assertEq(expected = uniqueBytes(worldId(), ledger), intOf(field(accounting, 0)));
    Assert.assertEq(expected = totalBytes(ledger), intOf(field(accounting, 1)));
    Assert.assertEq(expected = totalBytes(ledger) - uniqueBytes(worldId(), ledger), intOf(field(accounting, 2)));
    // The unique evidence is the declared region bytes plus the exact whole-file
    // read of the complete changed world.
    let regionBytes = List.foldLeft((sum, row) -> sum + intOf(field(row, 8)), 0, producedRows("region-manifest.tsv"));
    let wholeFile = List.foldLeft((sum, row) -> if (field(row, 1) == "whole-file") sum + intOf(field(row, 7)) else sum, 0, ledger);
    Assert.assertEq(expected = regionBytes + wholeFile, intOf(field(accounting, 0)))
}

/// The instrumentation is observed from the same delivery sequence: the run used
/// ONE packet, named ONE distinct obligation and reached 56 distinct spans
/// outside its initial progressive evidence. That measured outside-neighborhood
/// value is available BECAUSE the bound ledger is the record of a real session,
/// not a declared replay.
@Test
def theActualRunInstrumentationIsObserved(): Unit \ {Assert, IO} = {
    let ledger = producedRows("replay-ledger.tsv");
    let instrumentation = Option.getWithDefault(Nil, List.head(producedRows("packet-instrumentation.tsv")));
    let used = List.distinct(List.map(row -> field(row, 0), ledger));
    let packets = List.filter(row -> field(row, 0) == "packet", producedRows("packet-records.tsv"));
    let obligations = List.distinct(List.map(row -> field(row, 2) + "/" + field(row, 4) + "@" + field(row, 5),
        List.filter(row -> List.memberOf(field(row, 1), used), packets)));
    Assert.assertEq(expected = 64, intOf(field(instrumentation, 0)));
    Assert.assertEq(expected = List.length(used), intOf(field(instrumentation, 1)));
    Assert.assertEq(expected = List.length(obligations), intOf(field(instrumentation, 2)));
    Assert.assertEq(expected = "56", field(instrumentation, 3));
    let outside = outsideDiscoveries(worldId(), ledger, Nil, 0);
    Assert.assertEq(expected = 56, outside);
    Assert.assertEq(expected = Int32.toString(outside), field(instrumentation, 3))
}

/// The runtime summary and the compact observation JOIN agree with the reduced
/// record: the ledger length, the acquisitions and the reuses are the same
/// numbers, and the observation's pure delta names the 56 outside witnesses, the
/// discharged packet obligation and the two unresolved obligations. The observed
/// budget is `Unavailable` (the delivery record carries no usage) and the
/// committed-findings count is the honest zero of a run that committed no
/// candidate — never a fabricated number.
@Test
def theRuntimeSummaryAndObservationJoinAgreeWithTheReducedRecord(): Unit \ {Assert, IO} = {
    let ledger = producedRows("replay-ledger.tsv");
    let summary = producedRows("runtime-summary.tsv");
    let expected = decisions(worldId(), ledger, Nil);
    Assert.assertEq(expected = "72", valueOf("ledger", summary));
    Assert.assertEq(expected = Int32.toString(countDecision(expected, "acquire")), valueOf("acquire", summary));
    Assert.assertEq(expected = Int32.toString(countDecision(expected, "reuse")), valueOf("reuse", summary));
    Assert.assertEq(expected = "56", valueOf("outside", summary));
    let observation = producedRows("runtime-observations.tsv");
    let negative = List.filter(row -> field(row, 0) == "negative", observation);
    Assert.assertEq(expected = 1, List.length(negative));
    Assert.assertEq(expected = worldId(), field(Option.getWithDefault(Nil, List.head(negative)), 1));
    Assert.assertEq(expected = "false", field(Option.getWithDefault(Nil, List.head(negative)), 6));
    Assert.assertEq(expected = "declared-region,declared-whole-file",
        field(Option.getWithDefault(Nil, List.head(negative)), 3));
    let delta = name -> Option.getWithDefault("", List.findMap(row ->
        if (field(row, 0) == "delta" and field(row, 1) == name) Some(field(row, 2)) else None, observation));
    Assert.assertEq(expected = Int32.toString(outsideDiscoveries(worldId(), ledger, Nil, 0)), Int32.toString(List.length(commaList(delta("witnesses")))));
    Assert.assertEq(expected = "publication/registry-entry/publication@capawesome-cli-126", delta("discharged"));
    Assert.assertEq(expected = "read-publication-contract/compiled-artifact@head,read-caller/cli-consumer@head",
        delta("unresolved"));
    Assert.assertEq(expected = "", delta("negatives"));
    let observationValue = name -> Option.getWithDefault("", List.findMap(row ->
        if (field(row, 0) == "summary" and field(row, 1) == name) Some(field(row, 2)) else None, observation));
    Assert.assertEq(expected = "Unavailable", observationValue("observedBudget"));
    Assert.assertEq(expected = "0", observationValue("committedFindings"));
    Assert.assertEq(expected = "2", observationValue("unresolvedObligations"))
}

/// The scoped negative the run established never proves universal absence: it
/// names its bounded population and bounds, and the substrate's
/// `runObservationFindings` accepts the join and refuses any claim of universal
/// absence.
@Test
def theScopedNegativeNeverProvesUniversalAbsence(): Unit \ {Assert} = {
    let bounded = { world = "w", question = "q", relations = List#{"declared-region"},
        population = "63 declared regions and 296 declared whole files",
        bounds = "72 served spans of the run's own ledger", invalidated = false };
    Assert.assertEq(expected = false, universalAbsence(bounded));
    Assert.assertEq(expected = Nil, runObservationFindings({
        negative = bounded,
        delta = { witnesses = Nil, negatives = Nil, contradictions = Nil, committed = Nil,
                  discharged = Nil, unresolved = Nil },
        observedBudget = "Unavailable", committedFindings = 0, unresolved = Nil }))
}

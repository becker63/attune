use Attune.Study
use Fs.FileRead

/// Native `@Test` laws for the bounded process receipts (VAL-RUN-002/003).
///
/// The mechanical boundary executed one declared bounded argv plan and emitted
/// `receipts.tsv` beside the bounded per-stream logs. These laws classify the
/// raw records through `Attune.Study`: a measured nonzero exit is data rather
/// than a failure, an unstarted/timed-out/truncated/runtime-failed command is
/// unmeasured with its primary reason and cleanup state preserved, the effective
/// finite limits and the measured elapsed work are reported, and a zero exit
/// alone does not prove a required test ran. The plan and its interpretation are
/// Study's; the boundary only recorded raw facts.

// ------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

/// The resolved root of the produced receipt tree, or the empty string.
def listingRoot(text: String): String =
    match List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ => Some(path)
        case _ => None
    }, records(text)) {
        case root :: _ => root
        case Nil       => ""
    }

/// The absolute path of one declared binding, by its declared name.
def boundPath(name: String, text: String): Option[String] =
    match List.filterMap(line -> match fields(line) {
        case n :: path :: _ if n == name => Some(path)
        case _ => None
    }, records(text)) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def present(value: Option[Int32]): Bool = match value {
    case Some(_) => true
    case None    => false
}

def someOf(value: Option[a]): Bool = match value {
    case Some(_) => true
    case None    => false
}

// ------------------------------------------------------------------ reader

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def receiptText(): String \ IO =
    readText(listingRoot(readText("attune-produced.tsv")) + "/receipts.tsv")

def receiptRecords(): List[Study.Receipt] \ IO = Study.parseReceipts(receiptText())

def receiptOf(command: String): Option[Study.Receipt] \ IO =
    Study.receiptFor(command, receiptRecords())

def measurementOf(command: String): Study.Measurement \ IO =
    match receiptOf(command) {
        case Some(receipt) => Study.measurement(receipt)
        case None          => Study.Measurement.Unmeasured("absent", "absent")
    }

def logText(command: String): String \ IO =
    match receiptOf(command) {
        case Some(receipt) =>
            readText(listingRoot(readText("attune-produced.tsv")) + "/" + receipt#outLog)
        case None => ""
    }

// -------------------------------------------------------------------- laws

/// The declared plan is bounded and admissible, and its declared order and
/// command identities are exactly what the fixture authored.
@Test
def theDeclaredPlanIsBoundedAndAdmissible(): Unit \ {Assert, IO} =
    match boundPath("test/receipt/plan.tsv", readText("attune-bindings.tsv")) {
        case Some(location) => {
            let plan = Study.parsePlan(readText(location));
            Assert.assertEq(expected = true, Study.admissiblePlan(plan));
            Assert.assertEq(expected = List#{"ok", "nonzero", "timeout", "missing", "runtime", "truncated"},
                List.map(command -> command#command, plan))
        }
        case None => Assert.assertEq(expected = "declared plan binding", "missing")
    }

/// A measured nonzero child exit is a successful measurement and data for
/// interpretation, never a Bazel or infrastructure failure.
@Test
def aMeasuredNonzeroExitIsDataNotAFailure(): Unit \ {Assert, IO} =
    match receiptOf("nonzero") {
        case Some(receipt) => {
            Assert.assertEq(expected = true, receipt#started);
            Assert.assertEq(expected = Study.Measurement.Measured(7), Study.measurement(receipt));
            Assert.assertEq(expected = Study.Outcome.ObservedFalse, Study.outcomeOf(Study.measurement(receipt)))
        }
        case None => Assert.assertEq(expected = "nonzero receipt", "missing")
    }

/// A measured zero exit is an observed-true measurement of the command.
@Test
def aMeasuredZeroExitIsObservedTrue(): Unit \ {Assert, IO} =
    match receiptOf("ok") {
        case Some(receipt) => {
            Assert.assertEq(expected = Study.Measurement.Measured(0), Study.measurement(receipt));
            Assert.assertEq(expected = Study.Outcome.ObservedTrue, Study.outcomeOf(Study.measurement(receipt)))
        }
        case None => Assert.assertEq(expected = "ok receipt", "missing")
    }

/// Zero alone does not prove the required test ran: the bounded log must name
/// the required identity, and an absent or empty requirement is not proof.
@Test
def exitZeroAloneDoesNotProveTheRequiredTestRan(): Unit \ {Assert, IO} =
    match receiptOf("ok") {
        case Some(receipt) => {
            let log = logText("ok");
            Assert.assertEq(expected = true, Study.obligationProven(receipt, log, List#{"TEST:PASS:case_ok"}));
            Assert.assertEq(expected = false, Study.obligationProven(receipt, log, List#{"TEST:PASS:case_absent"}));
            Assert.assertEq(expected = false, Study.obligationProven(receipt, "", List#{"TEST:PASS:case_ok"}));
            Assert.assertEq(expected = false, Study.obligationProven(receipt, log, Nil))
        }
        case None => Assert.assertEq(expected = "ok receipt", "missing")
    }

/// Timeout, missing, runtime failure and truncation stay unmeasured, each with
/// its classified primary reason and the cleanup state the boundary recorded.
@Test
def timeoutMissingRuntimeAndTruncatedStayUnmeasured(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = Study.Measurement.Unmeasured("timeout", "killed"), measurementOf("timeout"));
    Assert.assertEq(expected = Study.Measurement.Unmeasured("missing", "none"), measurementOf("missing"));
    Assert.assertEq(expected = Study.Measurement.Unmeasured("runtime", "failed"), measurementOf("runtime"));
    Assert.assertEq(expected = Study.Measurement.Unmeasured("truncated", "ok"), measurementOf("truncated"));
    Assert.assertEq(expected = Study.Outcome.Unmeasured, Study.outcomeOf(measurementOf("timeout")))
}

/// A receipt carries the request/source/command/runtime identities, the
/// effective finite limits and the measured elapsed work.
@Test
def receiptsCarryIdentitiesLimitsAndElapsedWork(): Unit \ {Assert, IO} =
    match receiptOf("nonzero") {
        case Some(receipt) => {
            Assert.assertEq(expected = ("nonzero", "src-fixture", "nonzero"), Study.receiptIdentity(receipt));
            Assert.assertEq(expected = "runtime-fixture", receipt#runtime);
            Assert.assertEq(expected = true, String.length(receipt#observedRuntime) > 0);
            Assert.assertEq(expected = 5000, receipt#timeoutMillis);
            Assert.assertEq(expected = 4096, receipt#logCapBytes);
            Assert.assertEq(expected = true, present(receipt#elapsedMillis))
        }
        case None => Assert.assertEq(expected = "nonzero receipt", "missing")
    }

/// The bounded logs respect the declared per-stream cap and the truncation flag
/// is explicit; a command that fit is not marked truncated.
@Test
def boundedLogsAreCappedAndTruncationExplicit(): Unit \ {Assert, IO} = {
    match receiptOf("truncated") {
        case Some(receipt) => {
            Assert.assertEq(expected = true, receipt#truncated);
            Assert.assertEq(expected = true, receipt#outBytes <= receipt#logCapBytes);
            Assert.assertEq(expected = true, receipt#errBytes <= receipt#logCapBytes);
            Assert.assertEq(expected = true, Study.logBytes(receipt) > 0)
        }
        case None => Assert.assertEq(expected = "truncated receipt", "missing")
    };
    match receiptOf("nonzero") {
        case Some(receipt) => Assert.assertEq(expected = false, receipt#truncated)
        case None          => Assert.assertEq(expected = "nonzero receipt", "missing")
    }
}

/// A missing receipt is not an invented one: an empty or under-specified record
/// set parses to nothing and matches no command.
@Test
def aMissingReceiptIsNotAnInventedOne(): Unit \ {Assert, IO} = {
    Assert.assertEq(expected = 0, List.length(Study.parseReceipts("")));
    Assert.assertEq(expected = 0, List.length(Study.parseReceipts("short\trecord\n")));
    Assert.assertEq(expected = false, someOf(Study.receiptFor("absent", receiptRecords())))
}

/// The freshness token scopes the measurement identity only: two runs that
/// differ only in freshness are distinct measurements, while the command
/// identity and the measured result are unchanged.
@Test
def aFreshnessTokenScopesTheMeasurementIdentityOnly(): Unit \ Assert = {
    Assert.assertEq(expected = false,
        Study.measurementIdentity(synthetic("run-1")) == Study.measurementIdentity(synthetic("run-2")));
    Assert.assertEq(expected = true,
        Study.receiptIdentity(synthetic("run-1")) == Study.receiptIdentity(synthetic("run-2")));
    Assert.assertEq(expected = true, Study.measurement(synthetic("run-1")) == Study.measurement(synthetic("run-2")))
}

def synthetic(freshness: String): Study.Receipt = {
    request = "r", source = "s", command = "c", runtime = "rt",
    observedRuntime = "os=Linux;arch=aarch64;java=25", freshness = freshness, started = true,
    exit = Some(0), elapsedMillis = Some(1), outBytes = 0, errBytes = 0, timeoutMillis = 1000,
    logCapBytes = 100, truncated = false, timedOut = false, cleanup = "ok", error = "-",
    outLog = "logs/0.out", errLog = "logs/0.err"
}

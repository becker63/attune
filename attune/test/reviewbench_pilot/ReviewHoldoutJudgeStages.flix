import attune.reviewbench.AttuneReviewBench

use Attune.Study.ReviewBenchJudge
use Attune.Study.ReviewPilot
use Fs.FileRead
use Fs.FileWrite

///
/// The declared ReviewBench heldout-confirmation JUDGING stages (`VAL-STUDY-004`).
///
/// TWO provider-free stages complete the independent judging of the frozen
/// heldout observations, AFTER the heldout predictions were frozen:
///
/// - `reviewbench_holdout_references` projects each frozen holdout task's pinned
///   golden set through the SAME mechanical boundary the pilot's reference
///   population uses (`AttuneReviewBench.goldReferences`) and writes one
///   driver-format reference projection per task plus the declared population,
///   eligibility and summary records. It reads no candidate and no judged row, so
///   the reference population is materialized independently of any reviewer or
///   judge output. The golden set is declared ONLY by this stage and by the
///   holdout judge cohort: no review, prediction or assisted-context closure can
///   reach it.
/// - `reviewbench_holdout_judged` reduces the FROZEN blinded judge and independent
///   adjudication receipts of the holdout candidates into the canonical per-arm
///   classification: each candidate's declared verdict, the per-task/per-arm
///   finding-level counts and the honest summary. It reuses the ONE canonical
///   `Attune.Study.ReviewBenchJudge` claim/adjudication reduction, so a reference
///   miss is never automatically a false positive, a cross-arm equivalent finding
///   stays symmetrically valid, a within-arm restatement of a claimed reference
///   deduplicates through the claim mechanism, and an unresolved validity stays
///   explicit.
///
/// Neither stage calls a provider, fetches a corpus or touches a pilot world.
///

// -------------------------------------------------------------- pure parsing

def records(text: String): List[String] =
    List.filter(line -> not String.isEmpty(String.trim(line)), String.lines(text))

def fields(line: String): List[String] = String.split(regex = "\t", line)

def atIndex(xs: List[String], index: Int32): Option[String] = match xs {
    case value :: rest => if (index == 0) Some(value) else atIndex(rest, index - 1)
    case Nil           => None
}

def field(row: List[String], index: Int32): String = Option.getWithDefault("", atIndex(row, index))

def intOf(text: String): Int32 = Option.getWithDefault(0, Int32.fromString(text))

def boolOf(text: String): Bool = text == "tp"

def boolText(value: Bool): String = if (value) "true" else "false"

def renderTsv(rows: List[List[String]]): String =
    List.join("\n", List.map(row -> List.join("\t", row), rows)) + "\n"

def escapeField(text: String): String =
    String.replace(src = "\r", dst = "\\r",
        String.replace(src = "\n", dst = "\\n",
            String.replace(src = "\t", dst = "\\t",
                String.replace(src = "\\", dst = "\\\\", text))))

def unescapeField(text: String): String = unescapeChars(String.toList(text), false, "")

def unescapeChars(chars: List[Char], pending: Bool, acc: String): String = match chars {
    case Nil => acc
    case c :: rest =>
        if (pending) unescapeChars(rest, false, acc + escapedChar(c))
        else if (c == '\\') unescapeChars(rest, true, acc)
        else unescapeChars(rest, false, acc + "${c}")
}

def escapedChar(c: Char): String =
    if (c == 't') "\t" else if (c == 'n') "\n" else if (c == 'r') "\r" else "${c}"

// ------------------------------------------------------------------ bindings

def readText(path: String): String \ IO =
    FileRead.runWithIO(_unit -> Result.getWithDefault("", FileRead.read(path)))

def writeText(dir: String, name: String, text: String): Unit \ IO =
    FileWrite.runWithIO(_unit -> Result.getWithDefault((), FileWrite.write({str = text}, dir + "/" + name)))

def bindingEntries(): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case name :: path :: _ => Some((name, path))
        case _                 => None
    }, records(readText("attune-bindings.tsv")))

def binding(name: String): Option[String] \ IO =
    match List.filterMap(entry -> match entry {
        case (key, path) if key == name => Some(path)
        case _                          => None
    }, bindingEntries()) {
        case path :: _ => Some(path)
        case Nil       => None
    }

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

def manifestPaths(name: String): List[String] \ IO =
    match binding(name) {
        case Some(path) => List.map(resolveDeclared, records(readText(path)))
        case None       => Nil
    }

def resolveDeclared(path: String): String \ IO =
    if (String.startsWith(prefix = "/", path)) path
    else Option.getWithDefault(path, binding("execroot")) + "/" + path

def fixturePath(name: String): String \ IO =
    match List.find(path -> String.endsWith(suffix = "/" + name, path) or path == name, manifestPaths("fixtures")) {
        case Some(path) => path
        case None       => name
    }

def readFixture(name: String): String \ IO = readText(fixturePath(name))

/// The declared output tree of one bound producer input, or `""` when the stage
/// did not bind it. A producer's own outputs are opened by their declared name
/// relative to the tree the stage actually bound, never by a stale sandbox path.
def treeDir(name: String): String \ IO = Option.getWithDefault("", binding(name))

// ------------------------------------------------------------ holdout tasks

/// One declared task of the frozen metadata-only 24-task holdout, read verbatim
/// from the immutable freeze record.
type alias Task = { index = Int32, language = String, nwo = String, pr = Int32, split = String }

def tasks(): List[Task] \ IO =
    List.filterMap(line -> match fields(line) {
        case "holdout" :: index :: language :: nwo :: pr :: _ :: _ :: _ :: _ :: split :: _ =>
            Some({ index = intOf(index), language = language, nwo = nwo, pr = intOf(pr), split = split })
        case _ => None
    }, records(readFixture("holdout-tasks.tsv")))

def taskId(task: Task): String =
    String.replace(src = "/", dst = "_", task#nwo) + "-" + Int32.toString(task#pr)

// ----------------------------------------------- reference population stage

/// The declared filename of one holdout task's projected reference record,
/// relative to the reference stage's own output tree. The task id names the file
/// so the judged stage resolves it against the tree it actually bound.
def referenceFileName(task: String): String = "holdout-reference-" + task + ".tsv"

/// One projected reference record as the canonical `Reference`. Only the declared
/// `tp` label is a positive; the eligibility rows separately count and ASSERT that
/// no record carries a label outside the declared `tp`/`fp` vocabulary, so an
/// unknown label fails the population rather than being silently reduced to a
/// negative here.
def referenceOf(line: String): Option[ReviewBenchJudge.Reference] = match fields(line) {
    case "reference" :: task :: index :: file :: start :: end :: label :: severity :: category :: message :: _ =>
        Some({ index = intOf(index), task = task, file = file, start = start, end = end,
               truePositive = boolOf(label), severity = severity, category = category, message = message })
    case _ => None
}

def parseReferences(text: String): List[ReviewBenchJudge.Reference] =
    List.filterMap(referenceOf, records(text))

def severityMediumHigh(severity: String): Bool = severity == "medium" or severity == "high"

def declaredLabel(label: String): Bool = label == "tp" or label == "fp"

def declaredSeverity(severity: String): Bool =
    severity == "low" or severity == "medium" or severity == "high"

def referenceLabelOf(line: String): String = match fields(line) {
    case "reference" :: _ :: _ :: _ :: _ :: _ :: label :: _ => label
    case _                                                  => "unknown"
}

def referenceSeverityOf(line: String): String = match fields(line) {
    case "reference" :: _ :: _ :: _ :: _ :: _ :: _ :: severity :: _ => severity
    case _                                                         => "unknown"
}

/// One task's eligibility rows: the supported-source eligibility, the declared
/// label population and the two UNKNOWN populations that are reported separately
/// and never folded into a negative or into a severity view.
def eligibilityRows(task: String, lines: List[String]): List[List[String]] = {
    let labels = List.map(referenceLabelOf, lines);
    let severities = List.map(referenceSeverityOf, lines);
    List#{
        List#{"eligibility", task, "supported-source", Int32.toString(List.length(lines)),
              "structural admission >= 900 per-mille supported source"},
        List#{"eligibility", task, "declared-label", Int32.toString(List.length(List.filter(declaredLabel, labels))),
              "labels inside the declared tp/fp vocabulary"},
        List#{"eligibility", task, "unknown-label",
              Int32.toString(List.length(List.filter(label -> not declaredLabel(label), labels))),
              "labels outside tp/fp, reported separately and never folded into a negative"},
        List#{"eligibility", task, "unknown-severity",
              Int32.toString(List.length(List.filter(severity -> not declaredSeverity(severity), severities))),
              "severities outside low/medium/high, reported separately and never folded into a view"}
    }
}

/// One task's declared golden population row. The source eligibility is a
/// SEPARATE field from the population counts, so a task admitted by the declared
/// structural supported-source rule stays `supported-source` whatever its two
/// heldout observations did.
def populationRow(task: String, references: List[ReviewBenchJudge.Reference]): List[String] = {
    let positives = List.filter(reference -> reference#truePositive, references);
    let mediumHigh = List.filter(reference -> severityMediumHigh(reference#severity), positives);
    List#{"population", task, Int32.toString(List.length(references)), Int32.toString(List.length(positives)),
          Int32.toString(List.length(mediumHigh)), "supported-source"}
}

def referencePopulationStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let taskList = tasks();
    // Project each holdout task's pinned golden set through the SAME mechanical
    // boundary the pilot's reference population uses.
    let projected = List.map(task -> {
        let task_ = taskId(task);
        let name = referenceFileName(task_);
        let summary = match binding(task_) {
            case Some(gold) => AttuneReviewBench.goldReferences(task_, gold, dir + "/" + name)
            case None       => "status\tfailed\terror\tno declared golden input for " + task_
        };
        (task_, name, summary)
    }, taskList);
    let referencesOf = List.map(entry -> match entry {
        case (task_, name, _) => (task_, List.filterMap(referenceOf, records(readText(dir + "/" + name))))
    }, projected);
    let populations = List.map(entry -> match entry {
        case (task_, references) => populationRow(task_, references)
    }, referencesOf);
    let totalReferences = List.foldLeft((acc, row) -> acc + intOf(field(row, 2)), 0, populations);
    let totalPositives = List.foldLeft((acc, row) -> acc + intOf(field(row, 3)), 0, populations);
    let totalMediumHigh = List.foldLeft((acc, row) -> acc + intOf(field(row, 4)), 0, populations);
    let eligibility = List.flatMap(entry -> match entry {
        case (task_, references) => eligibilityRows(task_, List.map(reference -> referenceLineOf(task_, reference), references))
    }, referencesOf);
    writeText(dir, "holdout-reference-population.tsv", renderTsv(populations));
    writeText(dir, "holdout-reference-eligibility.tsv", renderTsv(eligibility));
    writeText(dir, "holdout-reference-summary.tsv", renderTsv(List#{
        List#{"summary", "tasks", Int32.toString(List.length(taskList))},
        List#{"summary", "references", Int32.toString(totalReferences)},
        List#{"summary", "positive", Int32.toString(totalPositives)},
        List#{"summary", "medium-high", Int32.toString(totalMediumHigh)}
    }));
    // Every declared golden input was projected, and the projected population
    // carries no label or severity outside the declared vocabulary. A discrepancy
    // fails; no value is adjusted.
    Assert.assertEq(expected = true,
        List.forAll(entry -> match entry {
            case (_, _, summary) => String.contains(substr = "status\tok", summary)
        }, projected));
    Assert.assertEq(expected = ReviewPilot.holdoutSize(), List.length(taskList));
    Assert.assertEq(expected = ReviewPilot.holdoutSize(), List.length(populations));
    Assert.assertEq(expected = ReviewPilot.holdoutSize() * 4, List.length(eligibility));
    Assert.assertEq(expected = 0, eligibilityTotal(eligibility, "unknown-label"));
    Assert.assertEq(expected = 0, eligibilityTotal(eligibility, "unknown-severity"));
    Assert.assertEq(expected = totalReferences, eligibilityTotal(eligibility, "declared-label"));
    Assert.assertEq(expected = true, List.forAll(row -> cellOf(row, 5) == "supported-source", populations))
}

/// The projected reference line of one canonical `Reference`, rendered exactly as
/// the mechanical boundary writes it, so the eligibility rows are computed over
/// the same declared vocabulary the judge prompt named.
def referenceLineOf(task: String, reference: ReviewBenchJudge.Reference): String =
    List.join("\t", List#{"reference", task, Int32.toString(reference#index), reference#file,
        reference#start, reference#end, if (reference#truePositive) "tp" else "fp",
        reference#severity, reference#category, reference#message})

def cellOf(row: List[String], index: Int32): String = field(row, index)

def eligibilityTotal(rows: List[List[String]], kind: String): Int32 =
    List.foldLeft((acc, row) -> if (cellOf(row, 2) == kind) acc + intOf(cellOf(row, 3)) else acc, 0, rows)

// ------------------------------------------------------------ judged stage

/// One frozen blinded holdout candidate as the canonical `Candidate`: the
/// producing arm and the frozen blinded ordinal come from the SEPARATE
/// evaluator-side blinding record, never from the judge's own input.
type alias Blinding = { id = String, task = String, arm = String, ordinal = Int32 }

def blindingRows(): List[Blinding] \ IO =
    List.filterMap(line -> match fields(line) {
        case "blinding" :: id :: task :: arm :: ordinal :: _ :: _ :: _ =>
            Some({ id = id, task = task, arm = arm, ordinal = intOf(ordinal) })
        case _ => None
    }, records(readText(treeDir("candidates") + "/holdout-blinding.tsv")))

def blindingFor(task: String, id: String, blinding: List[Blinding]): Option[Blinding] =
    List.find(entry -> entry#task == task and entry#id == id, blinding)

def candidateOf(line: String): Option[(String, String, String, String, String, String, String)] = match fields(line) {
    case "candidate" :: id :: file :: start :: end :: severity :: category :: message :: _ =>
        Some((id, file, start, end, severity, category, unescapeField(message)))
    case _ => None
}

/// The declared blinded candidate tasks of the frozen run reduction, read from its
/// own candidate index rather than from a directory listing.
def candidateTasks(): List[String] \ IO =
    List.filterMap(line -> match fields(line) {
        case "candidate-file" :: task :: _ => Some(task)
        case _                             => None
    }, records(readText(treeDir("candidates") + "/holdout-candidate-index.tsv")))

/// The canonical candidates of one task, each carrying its own arm and frozen
/// blinded ordinal from the evaluator-side blinding record. A candidate whose
/// blinding entry is absent is refused rather than guessed.
def candidatesFor(task: String, blinding: List[Blinding]): List[ReviewBenchJudge.Candidate] \ IO =
    List.filterMap(entry -> match entry {
        case (id, file, start, end, severity, category, message) =>
            match blindingFor(task, id, blinding) {
                case Some(bind) => Some({ id = id, task = task, arm = bind#arm, rank = bind#ordinal,
                    file = file, start = start, end = end, severity = severity, category = category,
                    message = message })
                case None => None
            }
    }, List.filterMap(candidateOf, records(readText(treeDir("candidates") + "/holdout-candidates-" + task + ".tsv"))))

def armCandidates(task: String, arm: String, candidates: List[ReviewBenchJudge.Candidate]): List[ReviewBenchJudge.Candidate] =
    List.sortBy(candidate -> candidate#rank,
        List.filter(candidate -> candidate#task == task and candidate#arm == arm, candidates))

def matchOf(line: String): Option[ReviewBenchJudge.Match] = match fields(line) {
    case "judged" :: task :: candidate :: references :: _reason :: _ =>
        Some({ task = task, candidate = candidate, references = parseIndices(references) })
    case _ => None
}

def parseIndices(text: String): List[Int32] =
    if (text == "-" or String.isEmpty(text)) Nil
    else List.filterMap(part -> Int32.fromString(part), String.split(regex = ",", text))

def adjudicationOf(line: String): Option[ReviewBenchJudge.Adjudication] = match fields(line) {
    case "adjudged" :: task :: candidate :: status :: evidence :: _ =>
        Some({ task = task, candidate = candidate, status = status, evidence = evidence })
    case _ => None
}

def parseMatches(text: String): List[ReviewBenchJudge.Match] = List.filterMap(matchOf, records(text))

def parseAdjudications(text: String): List[ReviewBenchJudge.Adjudication] =
    List.filterMap(adjudicationOf, records(text))

def judgedForTask(task: String, arm: String, references: List[ReviewBenchJudge.Reference],
                  matches: List[ReviewBenchJudge.Match], adjudications: List[ReviewBenchJudge.Adjudication],
                  candidates: List[ReviewBenchJudge.Candidate]): List[ReviewBenchJudge.Classified] =
    ReviewBenchJudge.classifyArmInOrder(armCandidates(task, arm, candidates), references, matches, adjudications)

def verdictRow(task: String, arm: String, classified: ReviewBenchJudge.Classified): List[String] =
    List#{"verdict", task, arm, (classified#candidate)#id, ReviewBenchJudge.verdictName(classified#verdict)}

def countsRow(task: String, arm: String, counts: ReviewBenchJudge.Counts): List[String] =
    List#{"counts", task, arm,
        Int32.toString(counts#candidates), Int32.toString(counts#matched),
        Int32.toString(counts#matchedTrue), Int32.toString(counts#unmatched),
        Int32.toString(counts#unmatchedValid), Int32.toString(counts#unmatchedInvalid),
        Int32.toString(counts#unmatchedUnresolved), Int32.toString(counts#goldTrue),
        Int32.toString(counts#goldCovered)}

def logicalCountRow(task: String, arm: String, candidates: List[ReviewBenchJudge.Candidate]): List[String] =
    List#{"logical", task, arm,
        Int32.toString(List.length(armCandidates(task, arm, candidates))),
        Int32.toString(List.length(ReviewBenchJudge.logicalFindings(armCandidates(task, arm, candidates))))}

/// The arms of the frozen heldout dispatch, in the frozen order.
def arms(): List[String] = List#{"R0_PLAIN", "R1_PACKETS"}

def judgedStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let blinding = blindingRows();
    let matches = parseMatches(readFixture("holdout-judged.tsv"));
    let adjudications = parseAdjudications(readFixture("holdout-adjudications.tsv"));
    let taskList = candidateTasks();
    let candidateLists = List.map(task -> (task, candidatesFor(task, blinding)), taskList);
    let perArm = List.flatMap(entry -> match entry {
        case (task, candidates) => List.map(arm -> {
            let references = parseReferences(readText(treeDir("references") + "/" + referenceFileName(task)));
            let classified = judgedForTask(task, arm, references, matches, adjudications, candidates);
            let counts = ReviewBenchJudge.countsOf(classified, references, matches);
            (task, arm, classified, counts, candidates)
        }, arms())
    }, candidateLists);
    let verdicts = List.flatMap(entry -> match entry {
        case (task, arm, classified, _, _) => List.map(item -> verdictRow(task, arm, item), classified)
    }, perArm);
    let counts = List.map(entry -> match entry {
        case (task, arm, _, c, _) => countsRow(task, arm, c)
    }, perArm);
    let logical = List.map(entry -> match entry {
        case (task, arm, _, _, candidates) => logicalCountRow(task, arm, candidates)
    }, perArm);
    let totalCandidates = List.foldLeft((acc, row) -> acc + intOf(field(row, 3)), 0, counts);
    let totalUnresolved = List.foldLeft((acc, row) -> acc + intOf(field(row, 9)), 0, counts);
    let totalUnmatchedValid = List.foldLeft((acc, row) -> acc + intOf(field(row, 7)), 0, counts);
    let totalUnmatchedInvalid = List.foldLeft((acc, row) -> acc + intOf(field(row, 8)), 0, counts);
    let totalMatched = List.foldLeft((acc, row) -> acc + intOf(field(row, 4)), 0, counts);
    writeText(dir, "holdout-judged-verdicts.tsv", renderTsv(verdicts));
    writeText(dir, "holdout-judged-counts.tsv", renderTsv(counts));
    writeText(dir, "holdout-judged-logical.tsv", renderTsv(logical));
    writeText(dir, "holdout-judged-summary.tsv", renderTsv(List#{
        List#{"summary", "tasks-with-candidates", Int32.toString(List.length(taskList))},
        List#{"summary", "arms", Int32.toString(List.length(perArm))},
        List#{"summary", "candidates", Int32.toString(totalCandidates)},
        List#{"summary", "matched", Int32.toString(totalMatched)},
        List#{"summary", "unmatched-valid", Int32.toString(totalUnmatchedValid)},
        List#{"summary", "unmatched-invalid", Int32.toString(totalUnmatchedInvalid)},
        List#{"summary", "unmatched-unresolved", Int32.toString(totalUnresolved)},
        List#{"summary", "judge-protocol", ReviewBenchJudge.protocolIdentity()},
        List#{"summary", "adjudication-role", ReviewBenchJudge.adjudicationRole()}
    }));
    // Every blinded candidate is judged exactly once, and the arms partition the
    // candidate population: no candidate is dropped and none is judged twice.
    Assert.assertEq(expected = List.length(List.map(entry -> (entry#task, entry#id), blinding)),
        List.length(List.distinct(List.map(entry -> (entry#task, entry#id), blinding))));
    Assert.assertEq(expected = List.length(blinding), totalCandidates);
    Assert.assertEq(expected = List.length(blinding), List.length(verdicts));
    Assert.assertEq(expected = true, List.forAll(row -> {
        let candidates = intOf(field(row, 3));
        let matched = intOf(field(row, 4));
        let unmatched = intOf(field(row, 6));
        let valid = intOf(field(row, 7));
        let invalid = intOf(field(row, 8));
        let unresolved = intOf(field(row, 9));
        candidates == matched + unmatched and unmatched == valid + invalid + unresolved
    }, counts));
    // The judged arms are exactly the frozen heldout arms, and every verdict is
    // inside the declared vocabulary: no fabricated validity and no dropped
    // candidate.
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, 2), arms()), counts));
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, 4),
        List#{"matched-true", "matched-false", "unmatched-valid", "unmatched-invalid", "unmatched-unresolved"}),
        verdicts))
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredReviewBenchHoldoutJudgingStagesReduceTheFrozenReceipts(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "reviewbench_holdout_references") referencePopulationStage()
    else if (stage == "reviewbench_holdout_judged") judgedStage()
    else ()
}

// ================================ corpus-free laws of the heldout judging

def lawReference(index: Int32, label: String, severity: String): ReviewBenchJudge.Reference =
    { index = index, task = "t", file = "src/a.ts", start = "1", end = "2", truePositive = label == "tp",
      severity = severity, category = "bug", message = "m" }

def lawCandidate(id: String, arm: String, rank: Int32, message: String): ReviewBenchJudge.Candidate =
    { id = id, task = "t", arm = arm, rank = rank, file = "src/a.ts", start = "1", end = "2",
      severity = "medium", category = "bug", message = message }

/// The declared verdict of the first classified candidate of a list, or an
/// explicit unresolved verdict for an empty list. `List.head` returns an
/// `Option`, so an empty classification is never silently unwrapped.
def headVerdict(classified: List[ReviewBenchJudge.Classified]): ReviewBenchJudge.Verdict =
    match classified {
        case entry :: _ => entry#verdict
        case Nil        => ReviewBenchJudge.Verdict.UnmatchedUnresolved
    }

@Test
def anUnmatchedHeldoutCandidateIsNeverAutomaticallyFalseAndRoutesToAdjudication(): Unit \ Assert = {
    let references = List#{lawReference(1, "tp", "medium")};
    let candidates = List#{lawCandidate("C1", "R0_PLAIN", 1, "a defect nobody labelled")};
    // No reference match and no adjudication: explicitly UNRESOLVED, never false.
    let unresolved = ReviewBenchJudge.classifyArmInOrder(candidates, references, Nil, Nil);
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedUnresolved, headVerdict(unresolved));
    // A source-grounded adjudication makes it valid or invalid; a status outside
    // the declared vocabulary stays unresolved rather than fabricated.
    let valid = ReviewBenchJudge.classifyArmInOrder(candidates, references, Nil,
        List#{ { task = "t", candidate = "C1", status = "valid", evidence = "e" } });
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedValid, headVerdict(valid));
    Assert.assertEq(expected = true, ReviewBenchJudge.isValid(headVerdict(valid)));
    let invalid = ReviewBenchJudge.classifyArmInOrder(candidates, references, Nil,
        List#{ { task = "t", candidate = "C1", status = "invalid", evidence = "e" } });
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedInvalid, headVerdict(invalid));
    let odd = ReviewBenchJudge.classifyArmInOrder(candidates, references, Nil,
        List#{ { task = "t", candidate = "C1", status = "maybe", evidence = "e" } });
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedUnresolved, headVerdict(odd))
}

@Test
def aCrossArmEquivalentHeldoutFindingStaysSymmetricallyValid(): Unit \ Assert = {
    let references = List#{lawReference(1, "tp", "medium")};
    let candidates = List#{
        lawCandidate("C1", "R0_PLAIN", 1, "the same defect"),
        lawCandidate("C2", "R1_PACKETS", 2, "the same defect")
    };
    let matches = List#{
        { task = "t", candidate = "C1", references = List#{1} },
        { task = "t", candidate = "C2", references = List#{1} }
    };
    // Each arm claims the SAME golden finding independently: a defect both arms
    // find is valid in BOTH, never deduplicated across arms.
    let r0 = ReviewBenchJudge.classifyArmInOrder(armCandidates("t", "R0_PLAIN", candidates), references, matches, Nil);
    let r1 = ReviewBenchJudge.classifyArmInOrder(armCandidates("t", "R1_PACKETS", candidates), references, matches, Nil);
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.MatchedTrue, headVerdict(r0));
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.MatchedTrue, headVerdict(r1));
    Assert.assertEq(expected = true, ReviewBenchJudge.isValid(headVerdict(r0)));
    Assert.assertEq(expected = true, ReviewBenchJudge.isValid(headVerdict(r1)))
}

@Test
def aWithinArmHeldoutRestatementDeduplicatesThroughTheClaim(): Unit \ Assert = {
    let references = List#{lawReference(1, "tp", "medium")};
    // Two candidates of ONE arm claim the SAME golden finding: the first in the
    // frozen order claims it and the restatement does not double-count it.
    let candidates = List#{
        lawCandidate("C1", "R0_PLAIN", 1, "defect"),
        lawCandidate("C2", "R0_PLAIN", 2, "defect")
    };
    let matches = List#{
        { task = "t", candidate = "C1", references = List#{1} },
        { task = "t", candidate = "C2", references = List#{1} }
    };
    let classified = ReviewBenchJudge.classifyArmInOrder(armCandidates("t", "R0_PLAIN", candidates), references, matches, Nil);
    let counts = ReviewBenchJudge.countsOf(classified, references, matches);
    Assert.assertEq(expected = 2, counts#candidates);
    Assert.assertEq(expected = 1, counts#matchedTrue);
    Assert.assertEq(expected = 1, counts#goldCovered);
    // The restatement is not silently dropped: it is unmatched and stays
    // explicitly unresolved until adjudicated.
    Assert.assertEq(expected = 1, counts#unmatchedUnresolved)
}

@Test
def theHeldoutJudgingKeepsTheArmPopulationDisjointAndComplete(): Unit \ Assert = {
    let candidates = List#{
        lawCandidate("C1", "R0_PLAIN", 1, "a"),
        lawCandidate("C2", "R1_PACKETS", 2, "b"),
        lawCandidate("C3", "R0_PLAIN", 3, "c")
    };
    Assert.assertEq(expected = 2, List.length(armCandidates("t", "R0_PLAIN", candidates)));
    Assert.assertEq(expected = 1, List.length(armCandidates("t", "R1_PACKETS", candidates)));
    Assert.assertEq(expected = 3, List.length(armCandidates("t", "R0_PLAIN", candidates))
        + List.length(armCandidates("t", "R1_PACKETS", candidates)));
    // The frozen blinded order is the ordinal order, so the effective order is
    // reproducible from the frozen receipts and invariant to the input order.
    let reordered = List.reverse(candidates);
    Assert.assertEq(expected = List#{"C1", "C3"},
        List.map(candidate -> candidate#id, armCandidates("t", "R0_PLAIN", reordered)));
    Assert.assertEq(expected = List#{"C1", "C3"},
        List.map(candidate -> candidate#id, armCandidates("t", "R0_PLAIN", List.reverse(reordered))))
}

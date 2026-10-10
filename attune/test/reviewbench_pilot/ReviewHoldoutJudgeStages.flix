import attune.reviewbench.AttuneReviewBench

use Attune.Study.Metrics
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
/// evaluator-side blinding record, never from the judge's own input. The
/// candidate's kind (`checkpoint`/`final`), its producing slot and its ordinal
/// inside that slot are carried too, so the policy-faithful projection can name
/// an equivalent candidate exactly.
type alias Blinding = {
    id = String, task = String, arm = String, ordinal = Int32,
    slot = String, source = String, index = String
}

def blindingRows(): List[Blinding] \ IO =
    List.filterMap(line -> match fields(line) {
        case "blinding" :: id :: task :: arm :: ordinal :: slot :: source :: index :: _ =>
            Some({ id = id, task = task, arm = arm, ordinal = intOf(ordinal),
                   slot = slot, source = source, index = index })
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

// --------------------------- policy-faithful cross-arm quality projection

/// The candidate id the adjudicator's OWN frozen reason names (`duplicates
/// C<k>`), validated against that task's blinded ids so a malformed reason can
/// never manufacture an equivalence. It is a bounded literal extraction of the
/// frozen reason text and invents no verdict.
def anchorFor(task: String, reason: String, blinding: List[Blinding]): Option[String] =
    match List.drop(2, String.split(regex = "\\s+", reason)) {
        case token :: _ =>
            let id = match String.split(regex = "[^A-Za-z0-9]", token) {
                case first :: _ => first
                case Nil        => token
            };
            if (List.exists(bind -> bind#task == task and bind#id == id, blinding)) Some(id) else None
        case Nil => None
    }

def blindingArmOf(blinding: List[Blinding], task: String, id: String): String =
    Option.getWithDefault("Unavailable",
        Option.map(bind -> bind#arm, List.find(bind -> bind#task == task and bind#id == id, blinding)))

/// One raw blind adjudication verdict joined with the evaluator-side arm and the
/// policy-faithful corrected status. The RAW status is carried UNCHANGED; the
/// corrected status is the separate field the frozen symmetric rule implies: an
/// unmatched candidate invalidated against a candidate of the OTHER arm is
/// reinstated, because within-arm equivalence never crosses arms. It reads only
/// the frozen reason, the frozen blinding map and the frozen status — never a
/// shared reference or a slot/index alone.
type alias CorrectedRow = {
    task = String, id = String, arm = String, slot = String, source = String,
    rawStatus = String, anchor = String, anchorArm = String, crossArm = Bool,
    correctedStatus = String, reason = String
}

def correctedAdjudications(blinding: List[Blinding],
                           adjudications: List[ReviewBenchJudge.Adjudication]): List[CorrectedRow] =
    List.filterMap(verdict -> match List.find(bind -> bind#task == verdict#task
        and bind#id == verdict#candidate, blinding) {
        case None => None
        case Some(bind) =>
            let invalid = verdict#status == "invalid";
            let anchor = if (invalid)
                Option.getWithDefault(verdict#candidate, anchorFor(verdict#task, verdict#evidence, blinding))
                else verdict#candidate;
            let anchorArm = blindingArmOf(blinding, verdict#task, anchor);
            let crossArm = invalid and anchorArm != bind#arm;
            let corrected = if (not invalid) "valid-as-acquired"
                else if (crossArm) "valid-cross-arm-equivalent"
                else "invalid-within-arm-duplicate";
            Some({ task = verdict#task, id = verdict#candidate, arm = bind#arm, slot = bind#slot,
                   source = bind#source, rawStatus = verdict#status, anchor = anchor, anchorArm = anchorArm,
                   crossArm = crossArm, correctedStatus = corrected, reason = verdict#evidence })
    }, adjudications)

/// The corrected verdict of one classified candidate: only an as-acquired
/// `UnmatchedInvalid` whose adjudication established a CROSS-ARM equivalent is
/// upgraded to `UnmatchedValid`. Every other as-acquired verdict is unchanged, so
/// the correction never invents a match, never drops a candidate and never
/// rewrites the frozen receipts.
def correctedVerdictOf(raw: ReviewBenchJudge.Verdict, corrected: List[CorrectedRow],
                       task: String, id: String): ReviewBenchJudge.Verdict =
    if (raw != ReviewBenchJudge.Verdict.UnmatchedInvalid) raw
    else match List.find(row -> row#task == task and row#id == id, corrected) {
        case Some(row) =>
            if (row#correctedStatus == "valid-cross-arm-equivalent")
                ReviewBenchJudge.Verdict.UnmatchedValid
            else ReviewBenchJudge.Verdict.UnmatchedInvalid
        case None => ReviewBenchJudge.Verdict.UnmatchedInvalid
    }

def correctedClassified(classified: List[ReviewBenchJudge.Classified],
                        corrected: List[CorrectedRow]): List[ReviewBenchJudge.Classified] =
    List.map(entry -> { candidate = entry#candidate,
        verdict = correctedVerdictOf(entry#verdict, corrected, (entry#candidate)#task, (entry#candidate)#id) },
        classified)

def correctedAdjudicationRow(row: CorrectedRow): List[String] =
    List#{"adjudication-corrected", row#task, row#id, row#arm, row#slot, row#source,
        row#rawStatus, row#anchor, row#anchorArm, boolText(row#crossArm),
        row#correctedStatus, escapeField(row#reason)}

/// The as-acquired published verdict rows of the frozen judged tree, keyed
/// (task, arm, candidate id), read back so a replay can assert byte parity
/// without re-running the judging stage.
def publishedVerdicts(): List[(String, String, String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "verdict" :: task :: arm :: id :: name :: _ => Some((task, arm, id, name))
        case _                                           => None
    }, records(readText(treeDir("judged") + "/holdout-judged-verdicts.tsv")))

def publishedNameOf(published: List[(String, String, String, String)],
                    task: String, arm: String, id: String): Option[String] =
    Option.map(entry -> match entry {
        case (_, _, _, name) => name
    }, List.find(entry -> match entry {
        case (t, a, i, _) => t == task and a == arm and i == id
    }, published))

def parityMismatches(raw: List[(String, String, String, String)],
                     published: List[(String, String, String, String)]): Int32 =
    List.length(List.filter(entry -> match entry {
        case (task, arm, id, name) => match publishedNameOf(raw, task, arm, id) {
            case Some(recomputed) => recomputed != name
            case None             => true
        }
    }, published))

// --------------------------------------- canonical micro/macro quality views

/// The candidate source kind of one blinded candidate (`final`/`checkpoint`),
/// read from the frozen evaluator-side blinding record. A missing binding is
/// `Unavailable` rather than a guessed kind.
def sourceKindOf(blinding: List[Blinding], task: String, id: String): String =
    Option.getWithDefault("Unavailable",
        Option.map(bind -> bind#source, List.find(bind -> bind#task == task and bind#id == id, blinding)))

/// The declared quality views: the primary FINAL-ONLY view and the
/// checkpoint-INCLUSIVE view. A candidate is in the final-only view iff its
/// frozen blinding source is `final`; the inclusive view carries every candidate.
def qualityViewNames(): List[String] = List#{"final-only", "inclusive"}

def viewCandidatesOf(view: String, task: String, arm: String,
                     candidates: List[ReviewBenchJudge.Candidate],
                     blinding: List[Blinding]): List[ReviewBenchJudge.Candidate] =
    let armOnes = armCandidates(task, arm, candidates);
    if (view == "final-only")
        List.filter(candidate -> sourceKindOf(blinding, task, candidate#id) == "final", armOnes)
    else armOnes

/// One view's corrected counts of one (task, arm), reduced through the ONE
/// canonical `ReviewBenchJudge` classification and counting path.
def viewCountsOf(view: String, task: String, arm: String,
                 references: List[ReviewBenchJudge.Reference],
                 matches: List[ReviewBenchJudge.Match],
                 adjudications: List[ReviewBenchJudge.Adjudication],
                 candidates: List[ReviewBenchJudge.Candidate],
                 blinding: List[Blinding],
                 corrected: List[CorrectedRow]): ReviewBenchJudge.Counts = {
    let classified = ReviewBenchJudge.classifyArmInOrder(
        viewCandidatesOf(view, task, arm, candidates, blinding), references, matches, adjudications);
    ReviewBenchJudge.countsOf(correctedClassified(classified, corrected), references, matches)
}

def percentOfMetric(metric: ReviewBenchJudge.JudgeMetric, counts: ReviewBenchJudge.Counts): String =
    match ReviewBenchJudge.metricRatio(metric, counts) {
        case Some(ratio) => Metrics.ratioPercentage(ratio)
        case None        => "Unavailable"
    }

/// The micro (pooled) and repo-equal macro rows of one (arm, view). The
/// population is one counts record per holdout task, and every holdout task is
/// its own repository, so the macro mean is repository-equal. An undefined
/// per-task value is excluded from the mean and the defined population is
/// reported beside it; a fully undefined metric stays `Unavailable`.
def metricRowsFor(scope: String, arm: String, view: String,
                  counts: List[ReviewBenchJudge.Counts]): List[List[String]] = {
    let pooled = ReviewBenchJudge.sumCounts(counts);
    let total = Int32.toString(List.length(counts));
    let micro = List.map(metric -> List#{scope, "micro", arm, view,
        ReviewBenchJudge.judgeMetricName(metric), percentOfMetric(metric, pooled), total},
        ReviewBenchJudge.judgeMetrics());
    let macro = List.map(metric -> List#{scope, "macro", arm, view,
        ReviewBenchJudge.judgeMetricName(metric),
        match ReviewBenchJudge.macroRatio(metric, counts) {
            case Some(ratio) => Metrics.ratioPercentage(ratio)
            case None        => "Unavailable"
        },
        Int32.toString(ReviewBenchJudge.macroDefined(metric, counts))}, ReviewBenchJudge.judgeMetrics());
    micro ::: macro
}

def qualityMetricRows(arm: String, view: String,
                      counts: List[ReviewBenchJudge.Counts]): List[List[String]] =
    metricRowsFor("quality-metric", arm, view, counts)

/// One severity view's corrected counts of one (task, arm): the golden set, the
/// candidates AND the correspondences are all restricted to the same severity
/// subset through the ONE canonical `ReviewBenchJudge` path, so a candidate whose
/// only correspondence leaves the view becomes unmatched there rather than being
/// silently scored.
def severityCountsOf(view: String, task: String, arm: String,
                     references: List[ReviewBenchJudge.Reference],
                     matches: List[ReviewBenchJudge.Match],
                     adjudications: List[ReviewBenchJudge.Adjudication],
                     candidates: List[ReviewBenchJudge.Candidate],
                     corrected: List[CorrectedRow]): ReviewBenchJudge.Counts = {
    let (viewCandidates, viewReferences) =
        ReviewBenchJudge.restrictToView(view, armCandidates(task, arm, candidates), references);
    let viewMatches = ReviewBenchJudge.restrictMatches(view, references, matches);
    let classified = ReviewBenchJudge.classifyArmInOrder(viewCandidates, viewReferences, viewMatches, adjudications);
    ReviewBenchJudge.countsOf(correctedClassified(classified, corrected), viewReferences, viewMatches)
}

def severityViewNames(): List[String] =
    List#{ReviewBenchJudge.mediumHighView(), ReviewBenchJudge.highView()}

def severityMetricRows(arm: String, view: String,
                       counts: List[ReviewBenchJudge.Counts]): List[List[String]] =
    metricRowsFor("severity-metric", arm, view, counts)

def qualityCountsRow(arm: String, view: String, counts: ReviewBenchJudge.Counts): List[String] =
    List#{"quality-counts", arm, view,
        Int32.toString(counts#candidates), Int32.toString(counts#matched),
        Int32.toString(counts#matchedTrue), Int32.toString(counts#unmatchedValid),
        Int32.toString(counts#unmatchedInvalid), Int32.toString(counts#unmatchedUnresolved),
        Int32.toString(counts#goldTrue), Int32.toString(counts#goldCovered)}

/// The declared policy-faithful holdout quality stage (`VAL-STUDY-005`,
/// `VAL-STUDY-007`, `VAL-CROSS-002`). It INDEPENDENTLY re-derives the as-acquired
/// per-arm classification from the raw frozen judge/adjudication fixtures,
/// asserts byte parity with the frozen judged tree, then publishes the
/// within-arm-policy-faithful corrected projection as a SEPARATE output. No raw
/// receipt is rewritten, no provider is called and no corpus is fetched.
def qualityCorrectionStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let blinding = blindingRows();
    let matches = parseMatches(readFixture("holdout-judged.tsv"));
    let adjudications = parseAdjudications(readFixture("holdout-adjudications.tsv"));
    let corrected = correctedAdjudications(blinding, adjudications);
    let taskList = candidateTasks();
    let perArm = List.flatMap(task -> {
        let candidates = candidatesFor(task, blinding);
        List.map(arm -> {
            let references = parseReferences(readText(treeDir("references") + "/" + referenceFileName(task)));
            let classified = judgedForTask(task, arm, references, matches, adjudications, candidates);
            let correctedView = correctedClassified(classified, corrected);
            (task, arm, classified, correctedView,
             ReviewBenchJudge.countsOf(classified, references, matches),
             ReviewBenchJudge.countsOf(correctedView, references, matches))
        }, arms())
    }, taskList);
    let rawRows = List.flatMap(entry -> match entry {
        case (task, arm, classified, _, _, _) =>
            List.map(item -> (task, arm, (item#candidate)#id, ReviewBenchJudge.verdictName(item#verdict)), classified)
    }, perArm);
    let correctnessRows = List.flatMap(group -> match group {
        case (task, arm, classified, correctedView, _, _) =>
            List.map(item -> {
                let rawName = match List.find(other -> (other#candidate)#id == (item#candidate)#id, classified) {
                    case Some(other) => ReviewBenchJudge.verdictName(other#verdict)
                    case None        => "Unavailable"
                };
                List#{"verdict-corrected", task, arm, (item#candidate)#id, rawName,
                      ReviewBenchJudge.verdictName(item#verdict)}
            }, correctedView)
    }, perArm);
    let countsRows = List.map(entry -> match entry {
        case (task, arm, _, _, _, correctedCounts) =>
            List#{"counts-corrected", task, arm,
                Int32.toString(correctedCounts#candidates), Int32.toString(correctedCounts#matched),
                Int32.toString(correctedCounts#matchedTrue), Int32.toString(correctedCounts#unmatched),
                Int32.toString(correctedCounts#unmatchedValid), Int32.toString(correctedCounts#unmatchedInvalid),
                Int32.toString(correctedCounts#unmatchedUnresolved), Int32.toString(correctedCounts#goldTrue),
                Int32.toString(correctedCounts#goldCovered)}
    }, perArm);
    let published = publishedVerdicts();
    let mismatches = parityMismatches(rawRows, published);
    let rawCountRows = List.map(entry -> match entry {
        case (task, arm, _, _, rawCounts, _) => countsRow(task, arm, rawCounts)
    }, perArm);
    let rawValid = List.foldLeft((acc, row) -> acc + intOf(field(row, 7)), 0, rawCountRows);
    let totalValid = List.foldLeft((acc, row) -> acc + intOf(field(row, 7)), 0, countsRows);
    let totalInvalid = List.foldLeft((acc, row) -> acc + intOf(field(row, 8)), 0, countsRows);
    let totalUnresolved = List.foldLeft((acc, row) -> acc + intOf(field(row, 9)), 0, countsRows);
    // The canonical micro (pooled) and repo-equal macro quality of BOTH declared
    // views — the primary FINAL-ONLY view and the checkpoint-INCLUSIVE view —
    // reduced through the ONE `ReviewBenchJudge` metric path. Every holdout task
    // is its own repository, so the macro mean is repository-equal.
    let viewRows = List.flatMap(task -> {
        let candidates = candidatesFor(task, blinding);
        List.flatMap(arm -> {
            let references = parseReferences(readText(treeDir("references") + "/" + referenceFileName(task)));
            List.map(view -> (task, arm, view,
                viewCountsOf(view, task, arm, references, matches, adjudications, candidates, blinding, corrected)),
                qualityViewNames())
        }, arms())
    }, taskList);
    let viewCountsFor = (arm, view) -> List.filterMap(entry -> match entry {
        case (_, a, v, c) if a == arm and v == view => Some(c)
        case _                                       => None
    }, viewRows);
    let qualityCounts = List.flatMap(arm -> List.map(view ->
        qualityCountsRow(arm, view, ReviewBenchJudge.sumCounts(viewCountsFor(arm, view))),
        qualityViewNames()), arms());
    let qualityMetrics = List.flatMap(arm -> List.flatMap(view ->
        qualityMetricRows(arm, view, viewCountsFor(arm, view)), qualityViewNames()), arms());
    // The medium-or-higher and high severity stratifications of the inclusive
    // view, so a known/medium/high recall is reported over all admitted gold.
    let severityRows = List.flatMap(task -> {
        let candidates = candidatesFor(task, blinding);
        List.flatMap(arm -> {
            let references = parseReferences(readText(treeDir("references") + "/" + referenceFileName(task)));
            List.map(view -> (task, arm, view,
                severityCountsOf(view, task, arm, references, matches, adjudications, candidates, corrected)),
                severityViewNames())
        }, arms())
    }, taskList);
    let severityCountsFor = (arm, view) -> List.filterMap(entry -> match entry {
        case (_, a, v, c) if a == arm and v == view => Some(c)
        case _                                       => None
    }, severityRows);
    let severityMetrics = List.flatMap(arm -> List.flatMap(view ->
        severityMetricRows(arm, view, severityCountsFor(arm, view)), severityViewNames()), arms());
    let inclusiveCandidates = List.foldLeft((acc, entry) -> match entry {
        case (_, _, view, c) => if (view == "inclusive") acc + c#candidates else acc
    }, 0, viewRows);
    let inclusiveValid = List.foldLeft((acc, entry) -> match entry {
        case (_, _, view, c) => if (view == "inclusive") acc + c#matchedTrue + c#unmatchedValid else acc
    }, 0, viewRows);
    let publishedValid = List.foldLeft((acc, row) -> acc + intOf(field(row, 5)) + intOf(field(row, 7)), 0, countsRows);
    writeText(dir, "holdout-quality-metrics.tsv", renderTsv(qualityCounts ::: qualityMetrics));
    writeText(dir, "holdout-severity-metrics.tsv", renderTsv(severityMetrics));
    writeText(dir, "holdout-judged-verdicts-corrected.tsv", renderTsv(correctnessRows));
    writeText(dir, "holdout-judged-counts-corrected.tsv", renderTsv(countsRows));
    writeText(dir, "holdout-adjudication-corrected.tsv",
        renderTsv(List.map(correctedAdjudicationRow, List.sortBy(row -> row#task + ":" + row#id, corrected))));
    writeText(dir, "holdout-judged-summary-corrected.tsv", renderTsv(List#{
        List#{"summary-corrected", "population", "as-acquired", "corrected"},
        List#{"summary-corrected", "unmatched-valid", Int32.toString(rawValid), Int32.toString(totalValid)},
        List#{"summary-corrected", "unmatched-invalid", "6", Int32.toString(totalInvalid)},
        List#{"summary-corrected", "unmatched-unresolved", "10", Int32.toString(totalUnresolved)},
        List#{"summary-corrected", "cross-arm-reinstated",
              "0", Int32.toString(List.length(List.filter(row -> row#crossArm, corrected)))},
        List#{"summary-corrected", "within-arm-duplicate",
              "0", Int32.toString(List.length(List.filter(row -> row#correctedStatus == "invalid-within-arm-duplicate", corrected)))},
        List#{"summary-corrected", "rule", "cross-arm-equivalent-is-symmetric-valid;within-arm-deduplicates-once"},
        List#{"summary-corrected", "raw-receipts", "preserved-byte-exact-as-acquired"}
    }));
    writeText(dir, "holdout-quality-replay.tsv", renderTsv(List#{
        List#{"replay", "raw-verdicts-published", Int32.toString(List.length(published))},
        List#{"replay", "raw-verdicts-recomputed", Int32.toString(List.length(rawRows))},
        List#{"replay", "parity-mismatches", Int32.toString(mismatches)},
        List#{"replay", "corrected-candidates", Int32.toString(List.length(correctnessRows))},
        List#{"replay", "cross-arm-reinstated", Int32.toString(List.length(List.filter(row -> row#crossArm, corrected)))},
        List#{"replay", "provider-calls", "0"},
        List#{"replay", "wall-time", "Unavailable"},
        List#{"replay", "wall-time-reason", "a provider-free native Flix stage does not measure its own wall clock"}
    }));
    // The replay reproduces the frozen as-acquired verdicts exactly, and the
    // correction never drops or adds a candidate: it only reclassifies.
    Assert.assertEq(expected = 0, mismatches);
    Assert.assertEq(expected = List.length(published), List.length(rawRows));
    Assert.assertEq(expected = List.length(published), List.length(correctnessRows));
    // The inclusive quality view carries every blinded candidate and its valid
    // total equals the canonical corrected counts tree, so the micro/macro views
    // are a faithful re-projection and never a second metric engine.
    Assert.assertEq(expected = List.length(blinding), inclusiveCandidates);
    Assert.assertEq(expected = publishedValid, inclusiveValid)
}

// ---------------------------------------------------------------- dispatcher

@Test
def theDeclaredReviewBenchHoldoutJudgingStagesReduceTheFrozenReceipts(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage == "reviewbench_holdout_references") referencePopulationStage()
    else if (stage == "reviewbench_holdout_judged") judgedStage()
    else if (stage == "reviewbench_holdout_quality") qualityCorrectionStage()
    else ()
}

// ================================ corpus-free laws of the heldout judging

/// A corpus-free law of the quality views: the FINAL-ONLY view carries exactly
/// the candidates whose frozen blinding source is `final`, the checkpoint-
/// INCLUSIVE view carries every candidate of the arm, and a candidate whose
/// binding is absent is `Unavailable` rather than a guessed kind. No corpus, no
/// network, no provider and no fixture file is touched, so the ordinary gate
/// runs it.
@Test
def theQualityViewsSplitOnlyOnTheFrozenCandidateSource(): Unit \ Assert = {
    let blinding = List#{
        { id = "C1", task = "t", arm = "R0_PLAIN", ordinal = 1, slot = "obs-1", source = "final", index = "1" },
        { id = "C2", task = "t", arm = "R0_PLAIN", ordinal = 2, slot = "obs-1", source = "checkpoint", index = "2" },
        { id = "C3", task = "t", arm = "R1_PACKETS", ordinal = 3, slot = "obs-2", source = "final", index = "1" }
    };
    let candidates = List#{
        lawCandidate("C1", "R0_PLAIN", 1, "a"),
        lawCandidate("C2", "R0_PLAIN", 2, "b"),
        lawCandidate("C3", "R1_PACKETS", 3, "c")
    };
    Assert.assertEq(expected = List#{"C1"},
        List.map(candidate -> candidate#id, viewCandidatesOf("final-only", "t", "R0_PLAIN", candidates, blinding)));
    Assert.assertEq(expected = List#{"C1", "C2"},
        List.map(candidate -> candidate#id, viewCandidatesOf("inclusive", "t", "R0_PLAIN", candidates, blinding)));
    Assert.assertEq(expected = "final", sourceKindOf(blinding, "t", "C1"));
    Assert.assertEq(expected = "checkpoint", sourceKindOf(blinding, "t", "C2"));
    Assert.assertEq(expected = "Unavailable", sourceKindOf(blinding, "t", "C9"))
}

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

// ============== corpus-free laws of the policy-faithful cross-arm projection

def lawBlinding(id: String, arm: String, ordinal: Int32, source: String): Blinding =
    { id = id, task = "t", arm = arm, ordinal = ordinal, slot = "obs-1", source = source, index = "1" }

def lawAdjudication(id: String, status: String, evidence: String): ReviewBenchJudge.Adjudication =
    { task = "t", candidate = id, status = status, evidence = evidence }

def lawUnmatched(id: String, arm: String): ReviewBenchJudge.Classified =
    { candidate = lawCandidate(id, arm, 1, "m"), verdict = ReviewBenchJudge.Verdict.UnmatchedInvalid }

def verdictOfId(classified: List[ReviewBenchJudge.Classified], id: String): ReviewBenchJudge.Verdict =
    match List.find(entry -> (entry#candidate)#id == id, classified) {
        case Some(entry) => entry#verdict
        case None        => ReviewBenchJudge.Verdict.UnmatchedUnresolved
    }

@Test
def aCrossArmInvalidHeldoutDuplicateIsReinstatedWhileAWithinArmOneIsNot(): Unit \ Assert = {
    let binding = List#{
        lawBlinding("C1", "R0_PLAIN", 1, "checkpoint"),
        lawBlinding("C2", "R1_PACKETS", 2, "checkpoint"),
        lawBlinding("C3", "R0_PLAIN", 3, "final")
    };
    let adjudications = List#{
        lawAdjudication("C2", "invalid", "This duplicates C1: the same behavior in the other arm"),
        lawAdjudication("C3", "invalid", "This duplicates C1's defect in the same arm")
    };
    let corrected = correctedAdjudications(binding, adjudications);
    let classified = List#{lawUnmatched("C2", "R1_PACKETS"), lawUnmatched("C3", "R0_PLAIN")};
    let correctedView = correctedClassified(classified, corrected);
    // C2 names a CROSS-ARM anchor (C1 lives in R0, C2 in R1): the equivalent
    // behavior stays VALID in its own arm.
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedValid, verdictOfId(correctedView, "C2"));
    // C3 names an anchor in its OWN arm: the within-arm restatement does not add
    // a second behavior.
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedInvalid, verdictOfId(correctedView, "C3"));
    Assert.assertEq(expected = 2, List.length(corrected));
    let c2 = List.find(row -> row#id == "C2", corrected);
    Assert.assertEq(expected = "valid-cross-arm-equivalent", correctedStatusOf(c2));
    let c3 = List.find(row -> row#id == "C3", corrected);
    Assert.assertEq(expected = "invalid-within-arm-duplicate", correctedStatusOf(c3))
}

def correctedStatusOf(row: Option[CorrectedRow]): String =
    match row {
        case Some(value) => value#correctedStatus
        case None        => "Unavailable"
    }

@Test
def aValidOrUnanchoredHeldoutAdjudicationIsLeftAsAcquired(): Unit \ Assert = {
    let binding = List#{lawBlinding("C1", "R0_PLAIN", 1, "checkpoint"), lawBlinding("C2", "R1_PACKETS", 2, "checkpoint")};
    // A `valid` status stays as acquired; an `invalid` status whose reason names
    // no known candidate cannot manufacture an equivalence and stays invalid.
    let corrected = correctedAdjudications(binding, List#{
        lawAdjudication("C1", "valid", "a real defect"),
        lawAdjudication("C2", "invalid", "This duplicates the other arm's finding without naming it")
    });
    Assert.assertEq(expected = "valid-as-acquired", correctedStatusOf(List.find(row -> row#id == "C1", corrected)));
    Assert.assertEq(expected = "invalid-within-arm-duplicate", correctedStatusOf(List.find(row -> row#id == "C2", corrected)));
    // A candidate with no adjudication at all stays UNRESOLVED, never invented.
    let classified = List#{ { candidate = lawCandidate("C9", "R0_PLAIN", 9, "m"),
        verdict = ReviewBenchJudge.Verdict.UnmatchedUnresolved } };
    Assert.assertEq(expected = ReviewBenchJudge.Verdict.UnmatchedUnresolved,
        verdictOfId(correctedClassified(classified, corrected), "C9"))
}

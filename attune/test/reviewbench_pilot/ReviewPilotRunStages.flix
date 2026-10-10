use Attune.Study
use Attune.Study.ReviewPilot
use Fs.FileRead
use Fs.FileWrite

/// The declared ReviewBench pilot RUN-half stages (`VAL-STUDY-002`,
/// `VAL-STUDY-003`, `VAL-STUDY-005`, `VAL-STUDY-010`).
///
/// Two provider-free stages reduce the frozen pilot artifacts:
///
/// - `reviewbench_pilot_candidates` blinds the ACTUAL delivered findings of the
///   twenty once-only observations — the non-empty FINAL deliveries plus the
///   durable committed CHECKPOINT candidates — into one per-task blinded
///   projection with fresh positional ids and NO producing-arm cell, plus a
///   SEPARATE evaluator-side blinding record. It reads only the frozen receipts;
///   it calls no provider and reads no golden label.
/// - `reviewbench_pilot_run` reduces the frozen twenty-slot records together
///   with the independently judged receipts into the canonical run-half record:
///   the per-slot budget/acquisition/delivery table, the per-arm judged evidence
///   and the ONE activation decision applied by the frozen `ReviewPilot` rule.
///
/// Nothing here fabricates an outcome: a slot with no durable artifact is
/// recorded `Unavailable`, an unjudged candidate stays unjudged, and a failed or
/// refused commit is never promoted to a delivered finding.

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

def int64Of(text: String): Int64 = Option.getWithDefault(0i64, Int64.fromString(text))

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

def boolText(value: Bool): String = if (value) "true" else "false"

def padTo(text: String, width: Int32): String =
    if (String.length(text) >= width) text else padTo("0" + text, width)

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

def bindingOr(name: String, fallback: String): String \ IO =
    Option.getWithDefault(fallback, binding(name))

def stageName(): String \ IO = Option.getWithDefault("", binding("stage"))
def outputsDir(): String \ IO = Option.getWithDefault(".", binding("outputs"))

/// The declared action paths of one bound manifest input. A stage binds exactly
/// one declared input per name, so the whole fixture population arrives as a
/// manifest of declared paths; the stage opens exactly the paths it names. The
/// manifest carries execroot-relative paths, so each is resolved against the
/// declared launcher root before it is opened.
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

// ------------------------------------------------------- blinded candidates

/// One ACTUAL delivered candidate finding. `source` is `final` for a finding of a
/// non-empty FINAL delivery and `checkpoint` for a durable committed checkpoint
/// row; the evaluator-side blinding record keeps the slot and the arm, the judge
/// never sees them.
type alias PilotCandidate = {
    slot    = String,
    task    = String,
    arm     = String,
    source  = String,
    index   = String,
    file    = String,
    start   = String,
    end     = String,
    severity = String,
    category = String,
    message = String
}

def parseCandidate(line: String): Option[PilotCandidate] = match fields(line) {
    case "slot" :: _ => None
    case slot :: task :: arm :: source :: index :: file :: start :: end :: severity :: category :: message :: _ =>
        Some({ slot = slot, task = task, arm = arm, source = source, index = index, file = file,
               start = start, end = end, severity = severity, category = category,
               message = unescapeField(message) })
    case _ => None
}

def parseCandidates(text: String): List[PilotCandidate] =
    List.filterMap(parseCandidate, records(text))

def candidateFixtures(): List[String] = List#{
    "pilot-final-findings.tsv", "pilot-checkpoint-findings.tsv" }

def allCandidates(): List[PilotCandidate] \ IO =
    List.flatMap(name -> parseCandidates(readFixture(name)), candidateFixtures())

/// The declared per-task candidate order. Candidates are interleaved across the
/// two arms and the two sources by their own within-slot ordinal first, so the
/// producing arm is not recoverable from a candidate's position, and the order
/// is fully reproducible from the frozen receipts.
def candidateOrderKey(candidate: PilotCandidate): String =
    padTo(candidate#index, 4) + "\t" + candidate#source + "\t" + padTo(slotNumber(candidate#slot), 4)
        + "\t" + candidate#file + "\t" + candidate#start

def slotNumber(slot: String): String =
    if (String.startsWith(prefix = "obs-", slot)) String.drop(4, slot) else slot

def tasksOf(candidates: List[PilotCandidate]): List[String] =
    List.sort(List.distinct(List.map(candidate -> candidate#task, candidates)))

def orderedFor(task: String, candidates: List[PilotCandidate]): List[PilotCandidate] =
    List.sortBy(candidateOrderKey, List.filter(candidate -> candidate#task == task, candidates))

def candidateId(index: Int32): String = "C" + Int32.toString(index)

def candidateRow(candidate: PilotCandidate, id: String): List[String] =
    List#{"candidate", id, candidate#file, candidate#start, candidate#end, candidate#severity,
        candidate#category, escapeField(candidate#message)}

def candidateRows(candidates: List[PilotCandidate]): List[List[String]] =
    List.filterMap(index -> Option.map(candidate -> candidateRow(candidate, candidateId(index + 1)),
        List.head(List.drop(index, candidates))), List.range(0, List.length(candidates)))

def blindingRows(task: String, candidates: List[PilotCandidate]): List[List[String]] =
    List.filterMap(index -> Option.map(candidate -> List#{"blinding", candidateId(index + 1), task,
        candidate#arm, Int32.toString(index + 1), candidate#slot, candidate#source, candidate#index},
        List.head(List.drop(index, candidates))), List.range(0, List.length(candidates)))

def candidateFileRow(task: String): List[String] =
    List#{"candidate-file", task, "candidates-" + task + ".tsv"}

def armCountRows(task: String, candidates: List[PilotCandidate]): List[List[String]] =
    List.map(arm -> List#{"candidate-count", task, arm,
        Int32.toString(List.length(List.filter(candidate ->
            candidate#task == task and candidate#arm == arm, candidates)))},
        List#{"R0_PLAIN", "R1_PACKETS"})

def candidateSummaryRows(candidates: List[PilotCandidate]): List[List[String]] =
    List.flatMap(task -> List#{
        List#{"candidate-count", task, "all",
            Int32.toString(List.length(List.filter(candidate -> candidate#task == task, candidates)))},
        List#{"candidate-count", task, "final",
            Int32.toString(List.length(List.filter(candidate -> candidate#task == task and candidate#source == "final", candidates)))},
        List#{"candidate-count", task, "checkpoint",
            Int32.toString(List.length(List.filter(candidate -> candidate#task == task and candidate#source == "checkpoint", candidates)))}
    } ::: armCountRows(task, candidates), tasksOf(candidates))

// --------------------------------------------------------------- stage: blind

@Test
def theDeclaredReviewBenchPilotCandidatesMaterializeTheirBlinding(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage != "reviewbench_pilot_candidates") ()
    else {
        let dir = outputsDir();
        let candidates = allCandidates();
        let tasks = tasksOf(candidates);
        let perTask = List.map(task -> (task, orderedFor(task, candidates)), tasks);
        let _ = List.map(pair -> match pair {
            case (task, ordered) => writeText(dir, "candidates-" + task + ".tsv", renderTsv(candidateRows(ordered)))
        }, perTask);
        let blinding = List.flatMap(pair -> match pair {
            case (task, ordered) => blindingRows(task, ordered)
        }, perTask);
        writeText(dir, "candidate-index.tsv", renderTsv(List.map(candidateFileRow, tasks)));
        writeText(dir, "blinding.tsv", renderTsv(blinding));
        writeText(dir, "candidate-summary.tsv", renderTsv(candidateSummaryRows(candidates)));

        // The blinding is complete and arm-free: every candidate is blinded
        // exactly once, every blinded row carries no arm cell, and the separate
        // evaluator record names an arm for every blinded id.
        Assert.assertEq(expected = true, not List.isEmpty(candidates));
        Assert.assertEq(expected = List.length(candidates), List.length(blinding));
        Assert.assertEq(expected = true, List.forAll(pair -> match pair {
            case (_, ordered) => List.forAll(row -> List.length(row) == 8, candidateRows(ordered))
        }, perTask));
        Assert.assertEq(expected = true, List.forAll(entry -> match entry {
            case _ :: _ :: _ :: arm :: _ :: _ :: _ :: _ => arm == "R0_PLAIN" or arm == "R1_PACKETS"
            case _                                        => false
        }, blinding));
        Assert.assertEq(expected = true, List.forAll(candidate ->
            candidate#arm == "R0_PLAIN" or candidate#arm == "R1_PACKETS", candidates));
        Assert.assertEq(expected = true, List.forAll(candidate ->
            candidate#source == "final" or candidate#source == "checkpoint", candidates))
    }
}

// ============================================== reduction: the frozen records

/// One frozen slot row of `pilot-predictions.tsv`. The guard value is
/// `Unavailable` for a run the mechanical guard never had to stop; that is the
/// guard's own absent value, NOT a missing measurement (the native usage of the
/// same slot is measured separately).
type alias SlotRecord = {
    slot          = String,
    task          = String,
    arm           = String,
    stopCause     = String,
    decision      = String,
    guardTokens   = String,
    guardRounds   = String,
    stepTotal     = Int64,
    sessionTotal  = Int64,
    steps         = Int32,
    sessions      = Int32,
    commitSuccess = Int32,
    commitRefusal = Int32,
    checkpoints   = Int32,
    finalBytes    = Int32,
    finalNonEmpty = Bool
}

def parseSlot(line: String): Option[SlotRecord] = match fields(line) {
    case "slot" :: _ => None
    case slot :: task :: arm :: stopCause :: decision :: guardTokens :: guardRounds :: _
        :: stepTotal :: sessionTotal :: steps :: sessions :: commitSuccess :: commitRefusal
        :: checkpoints :: finalBytes :: _ :: finalNonEmpty :: _ =>
        Some({ slot = slot, task = task, arm = arm, stopCause = stopCause, decision = decision,
               guardTokens = guardTokens, guardRounds = guardRounds,
               stepTotal = int64Of(stepTotal), sessionTotal = int64Of(sessionTotal),
               steps = intOf(steps), sessions = intOf(sessions),
               commitSuccess = intOf(commitSuccess), commitRefusal = intOf(commitRefusal),
               checkpoints = intOf(checkpoints), finalBytes = intOf(finalBytes),
               finalNonEmpty = finalNonEmpty == "true" })
    case _ => None
}

def slotRecords(): List[SlotRecord] \ IO =
    List.filterMap(parseSlot, records(readFixture("pilot-predictions.tsv")))

/// One reference finding of the frozen all-ten-task population.
type alias Reference = {
    task     = String,
    index    = String,
    label    = String,
    severity = String,
    file     = String
}

def parseReference(line: String): Option[Reference] = match fields(line) {
    case "reference" :: task :: index :: file :: _ :: _ :: label :: severity :: _ :: _ =>
        Some({ task = task, index = index, label = label, severity = severity, file = file })
    case _ => None
}

def referencesFor(task: String): List[Reference] \ IO =
    List.filterMap(parseReference, records(readFixture("reference-" + task + ".tsv")))

/// One independent judge verdict over one blinded candidate: the reference
/// indices the candidate matches. A reference miss is NOT a verdict that the
/// candidate is wrong; it is what the separate adjudication resolves.
type alias Judgment = { task = String, candidate = String, refs = List[String] }

def splitRefs(text: String): List[String] =
    if (text == "-" or String.isEmpty(text)) Nil else String.split(regex = ",", text)

def parseJudgment(line: String): Option[Judgment] = match fields(line) {
    case "judged" :: task :: candidate :: refs :: _ =>
        Some({ task = task, candidate = candidate, refs = splitRefs(refs) })
    case _ => None
}

def judgments(): List[Judgment] \ IO =
    List.filterMap(parseJudgment, records(readFixture("pilot-judgments.tsv")))

/// One raw blind adjudication verdict over one unmatched candidate. The frozen
/// `reason` is retained verbatim: the corrected projection reads the adjudicator's
/// OWN source-backed reason to recover the equivalence it named, and never invents
/// a verdict.
type alias Adjudication = { task = String, candidate = String, status = String, reason = String }

def parseAdjudication(line: String): Option[Adjudication] = match fields(line) {
    case "adjudged" :: task :: candidate :: status :: rest =>
        Some({ task = task, candidate = candidate, status = status, reason = List.join("\t", rest) })
    case _ => None
}

def adjudications(): List[Adjudication] \ IO =
    List.filterMap(parseAdjudication, records(readFixture("pilot-adjudications.tsv")))

/// One corrected tool-level outcome row of the separately versioned projection.
/// `class` separates a commit-specific refusal from a source or packet refusal,
/// which the raw frozen `commitToolRefusals` column cannot.
type alias ToolRow = { slot = String, tool = String, klass = String, accepted = Int32, refusals = Int32 }

def parseToolRow(line: String): Option[ToolRow] = match fields(line) {
    case "slot" :: _ => None
    case slot :: _ :: _ :: tool :: _ :: accepted :: refusals :: _ :: klass :: _ =>
        Some({ slot = slot, tool = tool, klass = klass, accepted = intOf(accepted), refusals = intOf(refusals) })
    case _ => None
}

def toolRows(): List[ToolRow] \ IO =
    List.filterMap(parseToolRow, records(readFixture("pilot-tool-outcomes-corrected.tsv")))

def refusalsOf(slot: String, klass: String, rows: List[ToolRow]): Int32 =
    List.foldLeft((sum, row) -> if (row#slot == slot and row#klass == klass) sum + row#refusals else sum,
        0, rows)

/// The declared tool catalog of the fourteen corrected streams. The pre-fix
/// streams used a WIDER catalog, which is why the cohort is mixed-version and no
/// clean contemporaneous paired causal estimate can be drawn from it.
def declaredCorrectedCatalog(): List[String] = List#{
    "attune_source_read", "attune_commit_candidate", "attune_packet_operation" }

def correctedSlot(slot: String): Bool = intOf(slotNumber(slot)) >= 8

def catalogOf(slot: String, rows: List[ToolRow]): List[String] =
    List.distinct(List.map(row -> row#tool, List.filter(row -> row#slot == slot, rows)))

// -------------------------------------------------- judged candidate classes

enum CandidateClass with Eq, ToString {
    case ValidTp
    case FalsePositive
    case UnmatchedValid
    case UnmatchedInvalid
    case Unresolved
}

def classOf(references: List[Reference], judgment: Option[Judgment],
            adjudication: Option[Adjudication]): CandidateClass =
    match judgment {
        case Some(verdict) =>
            let matched = List.filterMap(index -> List.find(reference -> reference#index == index, references),
                verdict#refs);
            if (List.exists(reference -> reference#label == "tp", matched)) CandidateClass.ValidTp
            else if (List.exists(reference -> reference#label == "fp", matched)) CandidateClass.FalsePositive
            else match adjudication {
                case Some(verdict2) =>
                    if (verdict2#status == "valid") CandidateClass.UnmatchedValid
                    else if (verdict2#status == "invalid") CandidateClass.UnmatchedInvalid
                    else CandidateClass.Unresolved
                case None => CandidateClass.Unresolved
            }
        case None => CandidateClass.Unresolved
    }

def isSupported(cls: CandidateClass): Bool = cls == CandidateClass.ValidTp or cls == CandidateClass.UnmatchedValid

/// The distinct `tp` reference indices one set of candidates actually matched.
def matchedTpIndices(references: List[Reference], pairs: List[(Judgment, Option[Adjudication])]): List[String] =
    List.distinct(List.flatMap(pair -> match pair {
        case (verdict, _) =>
            List.filterMap(index -> Option.map(reference -> reference#index,
                List.find(reference -> reference#index == index and reference#label == "tp", references)),
                verdict#refs)
    }, pairs))

def mediumHighCount(references: List[Reference], keys: List[String]): Int32 =
    List.length(List.filter(key -> List.exists(reference ->
        keyOf(reference) == key and (reference#severity == "medium" or reference#severity == "high"),
        references), keys))

/// The task-qualified identity of one reference finding: the same index in two
/// tasks is two different findings, so a recall count is never collapsed across
/// tasks.
def keyOf(reference: Reference): String = reference#task + ":" + reference#index

// -------------------------------------------------------------- arm metrics

type alias ArmMetrics = {
    arm                 = String,
    finalValid          = Int32,
    checkpointValid     = Int32,
    validDelivered      = Int32,
    checkpointInclusive = Int32,
    falsePositives      = Int32,
    unmatchedValid      = Int32,
    unmatchedInvalid    = Int32,
    unresolved          = Int32,
    matchedTp           = Int32,
    matchedMediumHigh   = Int32,
    providerTotal       = Int64,
    budgetStopped       = Int32,
    unresolvedObligations = Int32
}

/// One judged candidate with its producing arm and delivery source restored from
/// the SEPARATE evaluator-side blinding record (the judge never saw either).
type alias JudgedCandidate = {
    task = String, id = String, arm = String, source = String, cls = CandidateClass }

def judgedCandidates(candidates: List[PilotCandidate], references: List[Reference],
                     verdicts: List[Judgment], resolved: List[Adjudication]): List[JudgedCandidate] =
    List.flatMap(task -> {
        let ordered = orderedFor(task, candidates);
        let refsOfTask = List.filter(reference -> reference#task == task, references);
        List.filterMap(index -> Option.map(candidate -> {
            let id = candidateId(index + 1);
            let judgment = List.find(verdict -> verdict#task == task and verdict#candidate == id, verdicts);
            let adjudication = List.find(entry -> entry#task == task and entry#candidate == id, resolved);
            { task = task, id = id, arm = candidate#arm, source = candidate#source,
              cls = classOf(refsOfTask, judgment, adjudication) }
        }, List.head(List.drop(index, ordered))), List.range(0, List.length(ordered)))
    }, tasksOf(candidates))

def armMatchedTp(arm: String, judged: List[JudgedCandidate], references: List[Reference],
                 verdicts: List[Judgment]): List[String] =
    List.distinct(List.flatMap(candidate -> match List.find(verdict ->
        verdict#task == candidate#task and verdict#candidate == candidate#id, verdicts) {
        case Some(verdict) => List.filterMap(index -> Option.map(keyOf,
            List.find(reference -> reference#task == candidate#task and reference#index == index
                and reference#label == "tp", references)), verdict#refs)
        case None => Nil
    }, List.filter(candidate -> candidate#arm == arm, judged)))

def metricsOf(arm: String, judged: List[JudgedCandidate], references: List[Reference],
              slots: List[SlotRecord], verdicts: List[Judgment]): ArmMetrics = {
    let mine = List.filter(candidate -> candidate#arm == arm, judged);
    let finals = List.filter(candidate -> candidate#source == "final", mine);
    let checkpoints = List.filter(candidate -> candidate#source == "checkpoint", mine);
    let finalValid = List.length(List.filter(candidate -> isSupported(candidate#cls), finals));
    let checkpointValid = List.length(List.filter(candidate -> isSupported(candidate#cls), checkpoints));
    let matched = armMatchedTp(arm, judged, references, verdicts);
    let armSlots = List.filter(slot -> slot#arm == arm, slots);
    { arm = arm,
      finalValid = finalValid,
      checkpointValid = checkpointValid,
      validDelivered = finalValid,
      checkpointInclusive = finalValid + checkpointValid,
      falsePositives = List.length(List.filter(candidate -> candidate#cls == CandidateClass.FalsePositive, mine)),
      unmatchedValid = List.length(List.filter(candidate -> candidate#cls == CandidateClass.UnmatchedValid, mine)),
      unmatchedInvalid = List.length(List.filter(candidate -> candidate#cls == CandidateClass.UnmatchedInvalid, mine)),
      unresolved = List.length(List.filter(candidate -> candidate#cls == CandidateClass.Unresolved, mine)),
      matchedTp = List.length(matched),
      matchedMediumHigh = mediumHighCount(references, matched),
      providerTotal = List.foldLeft((sum, slot) -> sum + slot#sessionTotal, 0i64, armSlots),
      budgetStopped = List.length(List.filter(slot -> slot#stopCause == "budget-stop", armSlots)),
      unresolvedObligations = List.length(List.filter(candidate -> candidate#cls == CandidateClass.Unresolved, mine))
    }
}

// ================================= F1: policy-faithful corrected adjudication

/// The evaluator-side blinded view of one candidate: its fresh positional id and
/// the producing arm/slot/source restored ONLY for the evaluator (never a judge
/// input). Recomputed from the SAME frozen candidate fixtures, so no separate
/// blinding file is authored.
type alias BlindedCandidate = { task = String, id = String, arm = String, source = String, slot = String, index = String }

def blindedCandidates(candidates: List[PilotCandidate]): List[BlindedCandidate] =
    List.flatMap(task -> {
        let ordered = orderedFor(task, candidates);
        List.filterMap(index -> Option.map(candidate -> { task = task, id = candidateId(index + 1),
            arm = candidate#arm, source = candidate#source, slot = candidate#slot, index = candidate#index },
            List.head(List.drop(index, ordered))), List.range(0, List.length(ordered)))
    }, tasksOf(candidates))

def blindingArm(blinded: List[BlindedCandidate], task: String, id: String): String =
    Option.getWithDefault("Unavailable",
        Option.map(candidate -> candidate#arm,
            List.find(candidate -> candidate#task == task and candidate#id == id, blinded)))

/// The anchor id the adjudicator's OWN frozen reason names (`duplicates C<k>`),
/// validated against that task's blinded ids so a malformed reason can never
/// manufacture an equivalence. This is a bounded literal extraction of the
/// frozen reason text; it invents no verdict.
def anchorFor(task: String, reason: String, blinded: List[BlindedCandidate]): Option[String] =
    match List.drop(2, String.split(regex = "\\s+", reason)) {
        case token :: _ =>
            let id = match String.split(regex = "[^A-Za-z0-9]", token) {
                case first :: _ => first
                case Nil        => token
            };
            if (List.exists(candidate -> candidate#task == task and candidate#id == id, blinded)) Some(id) else None
        case Nil => None
    }

/// One raw blind adjudication verdict over an unmatched candidate, joined with
/// its evaluator-side arm and the policy-faithful corrected status. The RAW
/// status is carried UNCHANGED; the corrected status is a separate field that
/// the frozen within-arm rule implies. A candidate invalidated against a
/// candidate in the OTHER arm is reinstated: within-arm dedup never crosses arms.
type alias CorrectedAdjudication = {
    task = String, id = String, arm = String, source = String, slot = String,
    rawStatus = String, anchor = String, anchorArm = String, crossArm = Bool,
    correctedStatus = String, reason = String
}

def correctedAdjudications(blinded: List[BlindedCandidate], resolved: List[Adjudication]): List[CorrectedAdjudication] =
    List.filterMap(verdict -> match List.find(candidate -> candidate#task == verdict#task
        and candidate#id == verdict#candidate, blinded) {
        case None => None
        case Some(candidate) =>
            let invalid = verdict#status == "invalid";
            let anchor = if (invalid)
                Option.getWithDefault(verdict#candidate, anchorFor(verdict#task, verdict#reason, blinded))
                else verdict#candidate;
            let anchorArm = blindingArm(blinded, verdict#task, anchor);
            let crossArm = invalid and anchorArm != candidate#arm;
            let corrected = if (not invalid) "valid-as-acquired"
                else if (crossArm) "valid-cross-arm-equivalent"
                else "invalid-within-arm-duplicate";
            Some({ task = verdict#task, id = verdict#candidate, arm = candidate#arm, source = candidate#source,
                   slot = candidate#slot, rawStatus = verdict#status, anchor = anchor, anchorArm = anchorArm,
                   crossArm = crossArm, correctedStatus = corrected, reason = verdict#reason })
    }, resolved)

def isCorrectedSupported(status: String): Bool =
    status == "valid-as-acquired" or status == "valid-cross-arm-equivalent"

/// One candidate of the corrected evaluator view: its arm/source/slot, whether
/// the policy-faithful rule finds it supported, and the behavior anchor it
/// belongs to. A reference-matched candidate is its own behavior (the raw judge
/// already matched it to a reference); an unmatched candidate shares the anchor
/// its adjudication named.
type alias CorrectedView = {
    task = String, id = String, arm = String, source = String, slot = String, index = String,
    supported = Bool, anchor = String
}

def unmatchedView(candidate: BlindedCandidate, corrected: List[CorrectedAdjudication]): CorrectedView =
    match List.find(entry -> entry#task == candidate#task and entry#id == candidate#id, corrected) {
        case Some(entry) => { task = candidate#task, id = candidate#id, arm = candidate#arm,
            source = candidate#source, slot = candidate#slot, index = candidate#index,
            supported = isCorrectedSupported(entry#correctedStatus), anchor = entry#anchor }
        case None => { task = candidate#task, id = candidate#id, arm = candidate#arm,
            source = candidate#source, slot = candidate#slot, index = candidate#index,
            supported = false, anchor = candidate#id }
    }

def correctedView(references: List[Reference], verdicts: List[Judgment], resolved: List[Adjudication],
                  blinded: List[BlindedCandidate]): List[CorrectedView] = {
    let corrected = correctedAdjudications(blinded, resolved);
    List.map(candidate -> {
        let judgment = List.find(verdict -> verdict#task == candidate#task and verdict#candidate == candidate#id, verdicts);
        match judgment {
            case Some(verdict) =>
                if (List.isEmpty(verdict#refs)) unmatchedView(candidate, corrected)
                else {
                    let refsOfTask = List.filter(reference -> reference#task == candidate#task, references);
                    let adjudication = List.find(entry -> entry#task == candidate#task
                        and entry#candidate == candidate#id, resolved);
                    { task = candidate#task, id = candidate#id, arm = candidate#arm, source = candidate#source,
                      slot = candidate#slot, index = candidate#index,
                      supported = isSupported(classOf(refsOfTask, judgment, adjudication)), anchor = candidate#id }
                }
            case None => unmatchedView(candidate, corrected)
        }
    }, blinded)
}

/// The behaviors of one arm: one per distinct (task, anchor) with at least one
/// supported candidate in that arm. A behavior is attributed to the FINAL
/// delivery when the arm actually delivered it as a final finding (the primary
/// `FindingDelivered` artifact); otherwise to its checkpoint candidate. This is
/// the frozen within-arm final/checkpoint collapse, applied ONCE per behavior and
/// NEVER across arms.
def behaviorRepresentatives(arm: String, view: List[CorrectedView]): List[(String, Bool)] = {
    let mine = List.filter(candidate -> candidate#arm == arm and candidate#supported, view);
    let keys = List.distinct(List.map(candidate -> candidate#task + ":" + candidate#anchor, mine));
    List.map(key -> {
        let group = List.filter(candidate -> candidate#task + ":" + candidate#anchor == key, mine);
        (key, List.exists(candidate -> candidate#source == "final", group))
    }, keys)
}

def acknowledgedCountOf(slot: String, slots: List[SlotRecord]): Int32 =
    match List.find(record -> record#slot == slot, slots) {
        case Some(record) => if (record#checkpoints <= record#commitSuccess) record#checkpoints else record#commitSuccess
        case None         => 0
    }

/// Whether one checkpoint behavior's representative checkpoint candidate carried
/// an ACKNOWLEDGED native commit result (its own slot's acknowledged count covers
/// its own checkpoint ordinal). The two unacknowledged rows are kept in their own
/// subset and never silently promoted.
def representsAcknowledged(key: String, arm: String, view: List[CorrectedView], slots: List[SlotRecord]): Bool =
    List.exists(candidate -> candidate#arm == arm and candidate#task + ":" + candidate#anchor == key
        and candidate#source == "checkpoint"
        and intOf(candidate#index) <= acknowledgedCountOf(candidate#slot, slots), view)

/// The corrected per-arm population. `finalValid` is the semantic primary
/// `FindingDelivered` count: distinct supported behaviors delivered as finals.
/// `checkpointValid` is the separately reported checkpoint-inclusive recovery;
/// `checkpointAcknowledged` is its acknowledged-only subset and
/// `checkpointUnacknowledged` the stored-but-unacknowledged remainder.
type alias CorrectedArm = {
    arm = String, finalValid = Int32, checkpointValid = Int32,
    checkpointAcknowledged = Int32, checkpointUnacknowledged = Int32
}

def correctedArm(arm: String, view: List[CorrectedView], slots: List[SlotRecord]): CorrectedArm = {
    let reps = behaviorRepresentatives(arm, view);
    let finals = List.filter(pair -> match pair { case (_, isFinal) => isFinal }, reps);
    let checkpoints = List.filter(pair -> match pair { case (_, isFinal) => not isFinal }, reps);
    let acknowledged = List.length(List.filter(pair -> match pair {
        case (key, _) => representsAcknowledged(key, arm, view, slots)
    }, checkpoints));
    { arm = arm, finalValid = List.length(finals), checkpointValid = List.length(checkpoints),
      checkpointAcknowledged = acknowledged,
      checkpointUnacknowledged = List.length(checkpoints) - acknowledged }
}

def asAcquiredRow(row: Adjudication, blinded: List[BlindedCandidate]): List[String] =
    List#{"adjudication-as-acquired", row#task, row#candidate,
        blindingArm(blinded, row#task, row#candidate), row#status, escapeField(row#reason)}

def correctedRow(row: CorrectedAdjudication): List[String] =
    List#{"adjudication-corrected", row#task, row#id, row#arm, row#source, row#slot,
        row#rawStatus, row#anchor, row#anchorArm, boolText(row#crossArm),
        row#correctedStatus, escapeField(row#reason)}

/// The activation view of one arm: the UNCHANGED frozen optional rule reads
/// only the primary delivered count, the all-inclusive provider usage and the
/// budget-stop count, so the corrected projection feeds it exactly those.
def activationArmOf(arm: String, validDelivered: Int32, slots: List[SlotRecord]): ArmMetrics = {
    let armSlots = List.filter(slot -> slot#arm == arm, slots);
    { arm = arm, finalValid = validDelivered, checkpointValid = 0, validDelivered = validDelivered,
      checkpointInclusive = 0, falsePositives = 0, unmatchedValid = 0, unmatchedInvalid = 0,
      unresolved = 0, matchedTp = 0, matchedMediumHigh = 0,
      providerTotal = List.foldLeft((sum, slot) -> sum + slot#sessionTotal, 0i64, armSlots),
      budgetStopped = List.length(List.filter(slot -> slot#stopCause == "budget-stop", armSlots)),
      unresolvedObligations = 0 }
}

def correctedDecisionNameOf(correctedR0: CorrectedArm, correctedR1: CorrectedArm,
                            slots: List[SlotRecord]): String =
    ReviewPilot.decisionName(ReviewPilot.decidePilot(
        judgedArmOf(activationArmOf(correctedR0#arm, correctedR0#finalValid, slots)),
        judgedArmOf(activationArmOf(correctedR1#arm, correctedR1#finalValid, slots))))

/// The UNCHANGED frozen activation rule applied to the CORRECTED primary
/// `FindingDelivered` metrics, over the same all-inclusive attempt usage. It
/// reaffirms the as-acquired decision (`r1-not-worse-than-r0`): the correction
/// only raises R1's numerator, so the rule can only remain a decline.
def correctedDecisionRows(correctedR0: CorrectedArm, correctedR1: CorrectedArm,
                          slots: List[SlotRecord]): List[List[String]] = {
    let r0 = activationArmOf(correctedR0#arm, correctedR0#finalValid, slots);
    let r1 = activationArmOf(correctedR1#arm, correctedR1#finalValid, slots);
    let name = correctedDecisionNameOf(correctedR0, correctedR1, slots);
    List#{
        List#{"decision-corrected", ReviewPilot.runHalfIdentity(), ReviewPilot.activationIdentity(), name,
            "frozen-rule-unchanged-floor-quantization-noted"},
        List#{"decision-corrected-input", "R0_PLAIN", Int32.toString(r0#validDelivered),
            Int64.toString(r0#providerTotal), Int64.toString(ReviewPilot.validPerMillion(judgedArmOf(r0))),
            Int32.toString(r0#budgetStopped)},
        List#{"decision-corrected-input", "R1_PACKETS", Int32.toString(r1#validDelivered),
            Int64.toString(r1#providerTotal), Int64.toString(ReviewPilot.validPerMillion(judgedArmOf(r1))),
            Int32.toString(r1#budgetStopped)}
    }
}

def correctedMetricsRow(arm: String, metrics: CorrectedArm, slots: List[SlotRecord]): List[String] = {
    let armSlots = List.filter(slot -> slot#arm == arm, slots);
    let providerTotal = List.foldLeft((sum, slot) -> sum + slot#sessionTotal, 0i64, armSlots);
    let exact = Int32.toInt64(metrics#finalValid) * 1000000i64;
    List#{"arm-metrics-corrected", arm,
        Int32.toString(metrics#finalValid), Int32.toString(metrics#checkpointValid),
        Int32.toString(metrics#finalValid + metrics#checkpointValid),
        Int32.toString(metrics#checkpointAcknowledged), Int32.toString(metrics#checkpointUnacknowledged),
        Int64.toString(providerTotal), Int64.toString(exact),
        Int64.toString(if (providerTotal <= 0i64) 0i64 else exact / providerTotal),
        Int64.toString(if (providerTotal <= 0i64) 0i64 else Int64.remainder(exact, providerTotal))}
}

// ---------------------------------------------- F6: actual accepted delivery

/// One slot's ACTUAL accepted-delivery measurement: accepted/refused source and
/// packet calls and the rendered source-text bytes of the ACCEPTED results only.
/// `refusedPreparedDeliveredBytes` is always 0 by construction (a refusal is not
/// delivery), and `observedUse` is the literal `Unknown` (internal use is never
/// inferred).
type alias DeliveryRow = {
    slot = String, arm = String, sourceAccepted = Int32, sourceRefused = Int32,
    packetAccepted = Int32, packetRefused = Int32, acceptedDeliveredBytes = Int64,
    acceptedPresentations = Int32, otherToolAccepted = Int32, otherToolRefused = Int32
}

def parseDelivery(line: String): Option[DeliveryRow] = match fields(line) {
    case "slot" :: _ => None
    case slot :: _ :: arm :: sa :: sr :: pa :: pr :: bytes :: pres :: _ :: ota :: otr :: _ :: _ =>
        Some({ slot = slot, arm = arm, sourceAccepted = intOf(sa), sourceRefused = intOf(sr),
               packetAccepted = intOf(pa), packetRefused = intOf(pr), acceptedDeliveredBytes = int64Of(bytes),
               acceptedPresentations = intOf(pres), otherToolAccepted = intOf(ota), otherToolRefused = intOf(otr) })
    case _ => None
}

def deliveries(): List[DeliveryRow] \ IO =
    List.filterMap(parseDelivery, records(readFixture("pilot-delivery-metrics.tsv")))

def deliverySlotRow(row: DeliveryRow): List[String] =
    List#{"delivery-slot", row#slot, row#arm, Int32.toString(row#sourceAccepted),
        Int32.toString(row#sourceRefused), Int32.toString(row#packetAccepted),
        Int32.toString(row#packetRefused), Int64.toString(row#acceptedDeliveredBytes),
        Int32.toString(row#acceptedPresentations), "0",
        Int32.toString(row#otherToolAccepted), Int32.toString(row#otherToolRefused), "Unknown"}

def deliveryArmRow(arm: String, rows: List[DeliveryRow]): List[String] = {
    let mine = List.filter(row -> row#arm == arm, rows);
    List#{"delivery-arm", arm,
        Int32.toString(List.foldLeft((sum, row) -> sum + row#sourceAccepted, 0, mine)),
        Int32.toString(List.foldLeft((sum, row) -> sum + row#sourceRefused, 0, mine)),
        Int32.toString(List.foldLeft((sum, row) -> sum + row#packetAccepted, 0, mine)),
        Int32.toString(List.foldLeft((sum, row) -> sum + row#packetRefused, 0, mine)),
        Int64.toString(List.foldLeft((sum, row) -> sum + row#acceptedDeliveredBytes, 0i64, mine)),
        Int32.toString(List.foldLeft((sum, row) -> sum + row#acceptedPresentations, 0, mine)),
        "0",
        Int32.toString(List.foldLeft((sum, row) -> sum + row#otherToolAccepted, 0, mine)),
        Int32.toString(List.foldLeft((sum, row) -> sum + row#otherToolRefused, 0, mine)),
        "observedUse-Unknown",
        "refusals-omit-prepared-never-delivered",
        "packet-uptake-behavioral-negative"}
}

// ------------------------------------------------------------------- the stage

def referencePopulationPositives(): Int32 = ReviewPilot.referencePositives()
def referencePopulationMediumHigh(): Int32 = ReviewPilot.referenceMediumHigh()

def slotRow(slot: SlotRecord, rows: List[ToolRow]): List[String] =
    List#{ slot#slot, slot#task, slot#arm,
        if (correctedSlot(slot#slot)) "v2-corrected" else "v1-prefix",
        slot#stopCause, slot#decision, slot#guardTokens, slot#guardRounds,
        Int64.toString(slot#stepTotal), Int64.toString(slot#sessionTotal),
        Int32.toString(slot#steps), Int32.toString(slot#sessions),
        Int32.toString(refusalsOf(slot#slot, "commit", rows)),
        Int32.toString(refusalsOf(slot#slot, "source", rows)),
        Int32.toString(refusalsOf(slot#slot, "packet", rows)),
        Int32.toString(slot#checkpoints), Int32.toString(slot#finalBytes),
        boolText(slot#finalNonEmpty),
        Int32.toString(slot#commitSuccess) }

/// The GUARD-PREFIX overshoot of one slot: the mechanical guard's own sampled
/// cumulative value beyond the frozen budget, or 0 when the guard never stopped
/// the loop (its value is `Unavailable`, which is not an overshoot). This is a
/// PREFIX sample, NOT the run's whole measured usage.
def overshootOf(slot: SlotRecord): Int64 =
    match Int64.fromString(slot#guardTokens) {
        case Some(value) => let excess = value - ReviewPilot.observedTokenBudget();
            if (excess > 0i64) excess else 0i64
        case None => 0i64
    }

/// The ACTUAL measured session-total overshoot of one slot: the run's own
/// measured provider-total usage (parent continuation INCLUDING any child
/// session) beyond the frozen budget. It is reported SEPARATELY from the
/// guard-prefix overshoot: on `obs-3` the guard sampled `286694` (a prefix of the
/// parent's 31 steps) while the measured session total is `1084402`.
def measuredOvershootOf(slot: SlotRecord): Int64 = {
    let excess = slot#sessionTotal - ReviewPilot.observedTokenBudget();
    if (excess > 0i64) excess else 0i64
}

def usageRow(arm: String, slots: List[SlotRecord]): List[String] = {
    let armSlots = List.filter(slot -> slot#arm == arm, slots);
    List#{ "usage", arm,
        Int32.toString(List.length(armSlots)),
        Int64.toString(List.foldLeft((sum, slot) -> sum + slot#sessionTotal, 0i64, armSlots)),
        Int64.toString(List.foldLeft((sum, slot) -> sum + slot#stepTotal, 0i64, armSlots)),
        Int32.toString(List.foldLeft((sum, slot) -> sum + slot#steps, 0, armSlots)),
        Int32.toString(List.foldLeft((sum, slot) -> sum + slot#sessions, 0, armSlots)),
        Int32.toString(List.length(List.filter(slot -> slot#guardTokens != "Unavailable", armSlots))),
        Int32.toString(List.length(List.filter(slot -> slot#stopCause == "budget-stop", armSlots))),
        Int64.toString(List.foldLeft((sum, slot) -> sum + overshootOf(slot), 0i64, armSlots)),
        Int64.toString(List.foldLeft((sum, slot) -> sum + measuredOvershootOf(slot), 0i64, armSlots)) }
}

def candidateRowOf(candidate: JudgedCandidate): List[String] =
    List#{ "judged-candidate", candidate#task, candidate#id, candidate#arm, candidate#source,
        ToString.toString(candidate#cls) }

/// One acquisition row of the frozen early-recovery diagnostic. `servedRows` and
/// `deliveredBytes` are the run's OWN prepared ledger counts (what the shared
/// plain facade prepared and served), NOT a claim that the model read every
/// served byte; `repeatedPresentations` is the repeated presentation of an
/// already-served identity and `omitted` is the bytes the bounded page did not
/// deliver. `outsideNeighborhood` counts the distinct paths the run actually
/// read that its own changed-file manifest does not name.
type alias DiagnosticRow = {
    slot = String, task = String, arm = String,
    window30kTokens = Int64, window60kTokens = Int64,
    window30kCommits = Int32, window60kCommits = Int32,
    servedRows = Int32, distinctIdentities = Int32, repeatedPresentations = Int32,
    deliveredBytes = Int64, distinctPaths = Int32, outsideNeighborhood = Int32,
    overflow = Int32, unsupported = Int32
}

def parseDiagnostic(line: String): Option[DiagnosticRow] = match fields(line) {
    case "slot" :: _ => None
    case slot :: task :: arm :: _ :: w30 :: _ :: w30c :: _ :: w60 :: _ :: w60c
        :: served :: distinct :: repeated :: delivered :: paths :: outside :: _ :: overflow :: unsupported :: _ =>
        Some({ slot = slot, task = task, arm = arm,
               window30kTokens = int64Of(w30), window60kTokens = int64Of(w60),
               window30kCommits = intOf(w30c), window60kCommits = intOf(w60c),
               servedRows = intOf(served), distinctIdentities = intOf(distinct),
               repeatedPresentations = intOf(repeated), deliveredBytes = int64Of(delivered),
               distinctPaths = intOf(paths), outsideNeighborhood = intOf(outside),
               overflow = intOf(overflow), unsupported = intOf(unsupported) })
    case _ => None
}

def diagnostics(): List[DiagnosticRow] \ IO =
    List.filterMap(parseDiagnostic, records(readFixture("pilot-diagnostics.tsv")))

def acquisitionRow(row: DiagnosticRow): List[String] =
    List#{ "acquisition", row#slot, row#task, row#arm,
        Int64.toString(row#window30kTokens), Int64.toString(row#window60kTokens),
        Int32.toString(row#window30kCommits), Int32.toString(row#window60kCommits),
        Int32.toString(row#servedRows), Int32.toString(row#distinctIdentities),
        Int32.toString(row#repeatedPresentations), Int64.toString(row#deliveredBytes),
        Int32.toString(row#distinctPaths), Int32.toString(row#outsideNeighborhood),
        Int32.toString(row#overflow), Int32.toString(row#unsupported),
        "prepared-ledger-not-model-delivered-claim" }

def metricsRow(arm: String, metrics: ArmMetrics): List[String] =
    List#{ "arm-metrics", arm,
        Int32.toString(metrics#finalValid), Int32.toString(metrics#checkpointValid),
        Int32.toString(metrics#validDelivered), Int32.toString(metrics#checkpointInclusive),
        Int32.toString(metrics#falsePositives), Int32.toString(metrics#unmatchedValid),
        Int32.toString(metrics#unmatchedInvalid), Int32.toString(metrics#unresolved),
        Int32.toString(metrics#matchedTp), Int32.toString(metrics#matchedMediumHigh),
        Int64.toString(metrics#providerTotal), Int32.toString(metrics#budgetStopped),
        Int64.toString(ReviewPilot.validPerMillion({ arm = arm,
            validDelivered = metrics#validDelivered,
            providerTotalTokens = metrics#providerTotal,
            budgetStopped = metrics#budgetStopped,
            unresolvedObligations = metrics#unresolvedObligations })) }

def judgedArmOf(metrics: ArmMetrics): ReviewPilot.JudgedArm = {
    arm = metrics#arm,
    validDelivered = metrics#validDelivered,
    providerTotalTokens = metrics#providerTotal,
    budgetStopped = metrics#budgetStopped,
    unresolvedObligations = metrics#unresolvedObligations
}

def decisionRows(r0: ArmMetrics, r1: ArmMetrics): List[List[String]] = {
    let decision = ReviewPilot.decidePilot(judgedArmOf(r0), judgedArmOf(r1));
    let name = match decision {
        case ReviewPilot.PilotDecision.Activate(contrast) => "activate:" + ReviewPilot.contrastName(contrast)
        case ReviewPilot.PilotDecision.Decline(reason)    => "decline:" + reason
    };
    List#{
        List#{"decision", ReviewPilot.runHalfIdentity(), ReviewPilot.activationIdentity(), name},
        List#{"decision-input", "R0_PLAIN", Int32.toString(r0#validDelivered),
            Int64.toString(r0#providerTotal), Int64.toString(ReviewPilot.validPerMillion(judgedArmOf(r0))),
            Int32.toString(r0#budgetStopped)},
        List#{"decision-input", "R1_PACKETS", Int32.toString(r1#validDelivered),
            Int64.toString(r1#providerTotal), Int64.toString(ReviewPilot.validPerMillion(judgedArmOf(r1))),
            Int32.toString(r1#budgetStopped)},
        List#{"decision-reference-population", ReviewPilot.referencePopulationIdentity(),
            Int32.toString(referencePopulationPositives()), Int32.toString(referencePopulationMediumHigh())},
        List#{"decision-holdout", ReviewPilot.holdoutIdentity(),
            Int32.toString(ReviewPilot.holdoutSize()), "unchanged"}
    }
}

/// The integrity record of the run half: the counts and distinctions the
/// reduction must preserve, each read from the frozen receipts.
def integrityRows(slots: List[SlotRecord], rows: List[ToolRow],
                  candidates: List[PilotCandidate]): List[List[String]] = {
    let corrected = List.filter(slot -> correctedSlot(slot#slot), slots);
    let completedCorrected = List.filter(slot -> slot#stopCause != "budget-stop", corrected);
    let stoppedCorrected = List.filter(slot -> slot#stopCause == "budget-stop", corrected);
    let stoppedWithCheckpoints = List.filter(slot -> slot#checkpoints > 0, stoppedCorrected);
    let observedRounds31 = List.filter(slot -> slot#guardRounds == "31", stoppedCorrected);
    let checkpoints = List.foldLeft((sum, slot) -> sum + slot#checkpoints, 0, slots);
    let acknowledged = List.foldLeft((sum, slot) ->
        if (slot#checkpoints <= slot#commitSuccess) sum + slot#checkpoints else sum + slot#commitSuccess, 0, slots);
    let correctedCatalogClean = List.forAll(slot ->
        List.forAll(tool -> List.memberOf(tool, declaredCorrectedCatalog()), catalogOf(slot#slot, rows)),
        corrected);
    List#{
        List#{"integrity", "slots", Int32.toString(List.length(slots))},
        List#{"integrity", "finals-nonempty", Int32.toString(List.length(List.filter(slot -> slot#finalNonEmpty, slots)))},
        List#{"integrity", "checkpoint-rows", Int32.toString(checkpoints)},
        List#{"integrity", "checkpoint-acknowledged", Int32.toString(acknowledged)},
        List#{"integrity", "checkpoint-unacknowledged", Int32.toString(checkpoints - acknowledged)},
        List#{"integrity", "corrected-slots", Int32.toString(List.length(corrected))},
        List#{"integrity", "corrected-stopped", Int32.toString(List.length(stoppedCorrected))},
        List#{"integrity", "corrected-completed", Int32.toString(List.length(completedCorrected))},
        List#{"integrity", "corrected-stopped-with-checkpoints", Int32.toString(List.length(stoppedWithCheckpoints))},
        List#{"integrity", "corrected-stopped-at-31-rounds", Int32.toString(List.length(observedRounds31))},
        List#{"integrity", "corrected-catalog-clean", boolText(correctedCatalogClean)},
        List#{"integrity", "candidate-count", Int32.toString(List.length(candidates))},
        List#{"integrity", "reference-positives", Int32.toString(referencePopulationPositives())},
        List#{"integrity", "reference-medium-high", Int32.toString(referencePopulationMediumHigh())},
        List#{"integrity", "mixed-version", "v1-prefix:6,v2-corrected:14"},
        List#{"integrity", "protocol-violations", "6"},
        List#{"integrity", "protocol-violation-note", "v1-prefix-binding-defect-never-rerun"},
        List#{"integrity", "causal-inference", "mixed-version-limited-not-clean-packet-estimate"},
        List#{"integrity", "cache-or-offline-savings", "not-a-token-claim"},
        List#{"integrity", "denominator-includes-failures", boolText(ReviewPilot.judgeDenominatorIncludesFailures())}
    }
}

/// Write every run-half receipt: the as-acquired reduction plus the SEPARATE
/// corrected projections (adjudication, metrics, decision, delivery). No raw
/// record is rewritten here; the corrected files are new, versioned outputs.
def writeRunHalfReceipts(dir: String, slots: List[SlotRecord], rows: List[ToolRow],
                         candidates: List[PilotCandidate], judged: List[JudgedCandidate],
                         r0: ArmMetrics, r1: ArmMetrics, resolved: List[Adjudication],
                         blinded: List[BlindedCandidate], correctedAdjs: List[CorrectedAdjudication],
                         correctedR0: CorrectedArm, correctedR1: CorrectedArm,
                         deliveryRows: List[DeliveryRow]): Unit \ IO = {
    writeText(dir, "run-half-slots.tsv", renderTsv(List.map(slot -> slotRow(slot, rows), slots)));
    writeText(dir, "run-half-usage.tsv", renderTsv(List#{
        usageRow("R0_PLAIN", slots), usageRow("R1_PACKETS", slots) }));
    writeText(dir, "run-half-candidates.tsv", renderTsv(List.map(candidateRowOf, judged)));
    writeText(dir, "run-half-metrics.tsv", renderTsv(List#{
        metricsRow("R0_PLAIN", r0), metricsRow("R1_PACKETS", r1) }));
    writeText(dir, "run-half-decision.tsv", renderTsv(decisionRows(r0, r1)));
    writeText(dir, "run-half-integrity.tsv", renderTsv(integrityRows(slots, rows, candidates)));
    writeText(dir, "run-half-acquisition.tsv", renderTsv(List.map(acquisitionRow, diagnostics())));
    writeText(dir, "run-half-adjudication-asacquired.tsv",
        renderTsv(List.map(row -> asAcquiredRow(row, blinded), resolved)));
    writeText(dir, "run-half-adjudication-corrected.tsv", renderTsv(List.map(correctedRow, correctedAdjs)));
    writeText(dir, "run-half-metrics-corrected.tsv", renderTsv(List#{
        correctedMetricsRow("R0_PLAIN", correctedR0, slots),
        correctedMetricsRow("R1_PACKETS", correctedR1, slots) }));
    writeText(dir, "run-half-decision-corrected.tsv",
        renderTsv(correctedDecisionRows(correctedR0, correctedR1, slots)));
    writeText(dir, "run-half-delivery.tsv", renderTsv(
        List.map(deliverySlotRow, deliveryRows) ::: List#{
            deliveryArmRow("R0_PLAIN", deliveryRows), deliveryArmRow("R1_PACKETS", deliveryRows) }))
}

@Test
def theDeclaredReviewBenchPilotRunHalfReducesTheFrozenObservationsAndDecides(): Unit \ {Assert, IO} = {
    let stage = stageName();
    if (stage != "reviewbench_pilot_run") ()
    else {
        let dir = outputsDir();
        let slots = slotRecords();
        let rows = toolRows();
        let candidates = allCandidates();
        let references = List.flatMap(task -> referencesFor(task), tasksOf(candidates));
        let verdicts = judgments();
        let resolved = adjudications();
        let judged = judgedCandidates(candidates, references, verdicts, resolved);
        let r0 = metricsOf("R0_PLAIN", judged, references, slots, verdicts);
        let r1 = metricsOf("R1_PACKETS", judged, references, slots, verdicts);

        // F1/F2: the evaluator-side policy-faithful projection. Raw verdicts are
        // UNCHANGED; the corrected status is a separate field, and the corrected
        // population separates the primary `FindingDelivered` count from the
        // acknowledged-only checkpoint recovery and its unacknowledged subset.
        let blinded = blindedCandidates(candidates);
        let correctedAdjs = correctedAdjudications(blinded, resolved);
        let view = correctedView(references, verdicts, resolved, blinded);
        let correctedR0 = correctedArm("R0_PLAIN", view, slots);
        let correctedR1 = correctedArm("R1_PACKETS", view, slots);
        let deliveryRows = deliveries();
        let correctedStatusOf = id -> Option.getWithDefault("Unavailable",
            Option.map(row -> row#correctedStatus,
                List.find(row -> row#task == "haoling_diary-notebook-blog-transformer-24" and row#id == id, correctedAdjs)));
        let obs3GuardOvershoot = Option.getWithDefault(0i64,
            Option.map(overshootOf, List.find(slot -> slot#slot == "obs-3", slots)));
        let obs3MeasuredOvershoot = Option.getWithDefault(0i64,
            Option.map(measuredOvershootOf, List.find(slot -> slot#slot == "obs-3", slots)));
        let correctedDecisionName = correctedDecisionNameOf(correctedR0, correctedR1, slots);
        writeRunHalfReceipts(dir, slots, rows, candidates, judged, r0, r1, resolved, blinded,
            correctedAdjs, correctedR0, correctedR1, deliveryRows);

        // The reduction preserves every frozen distinction: twenty once-only
        // slots, seven non-empty finals, seventeen durable checkpoint rows with
        // fifteen acknowledged and two unacknowledged, the fourteen corrected
        // streams using ONLY the declared tool catalog, and the all-task
        // reference denominator that includes every failed attempt.
        Assert.assertEq(expected = 20, List.length(slots));
        Assert.assertEq(expected = 7, List.length(List.filter(slot -> slot#finalNonEmpty, slots)));
        Assert.assertEq(expected = 17, List.foldLeft((sum, slot) -> sum + slot#checkpoints, 0, slots));
        Assert.assertEq(expected = true, List.forAll(slot ->
            List.forAll(tool -> List.memberOf(tool, declaredCorrectedCatalog()), catalogOf(slot#slot, rows)),
            List.filter(slot -> correctedSlot(slot#slot), slots)));
        Assert.assertEq(expected = true, List.forAll(candidate ->
            candidate#arm == "R0_PLAIN" or candidate#arm == "R1_PACKETS", judged));
        Assert.assertEq(expected = 130, referencePopulationPositives());
        // Every actual finding is judged: 28 candidates = the 11 non-empty FINAL
        // findings (including obs-3's committed-0 final) plus the 17 durable
        // checkpoint rows; nothing is excluded from the 130-reference denominator.
        Assert.assertEq(expected = 28, List.length(judged));
        Assert.assertEq(expected = 11, List.length(List.filter(candidate -> candidate#source == "final", judged)));
        Assert.assertEq(expected = 17, List.length(List.filter(candidate -> candidate#source == "checkpoint", judged)));
        // F6: the accepted-delivery measurement covers all twenty slots, old
        // pre-fix and corrected alike, including obs-19.
        Assert.assertEq(expected = 20, List.length(deliveryRows));

        // F1: the raw adjudicator invalidated C2/C4/C6/C8 against C1/C5 in the
        // OTHER arm, which the frozen within-arm dedup forbids. The corrected
        // projection reinstates exactly those four; the R0 within-arm duplicates
        // C3/C7 stay invalid-within-arm-duplicate and no raw verdict is rewritten.
        Assert.assertEq(expected = "valid-as-acquired", correctedStatusOf("C1"));
        Assert.assertEq(expected = "valid-cross-arm-equivalent", correctedStatusOf("C2"));
        Assert.assertEq(expected = "invalid-within-arm-duplicate", correctedStatusOf("C3"));
        Assert.assertEq(expected = "valid-cross-arm-equivalent", correctedStatusOf("C4"));
        Assert.assertEq(expected = "valid-as-acquired", correctedStatusOf("C5"));
        Assert.assertEq(expected = "valid-cross-arm-equivalent", correctedStatusOf("C6"));
        Assert.assertEq(expected = "invalid-within-arm-duplicate", correctedStatusOf("C7"));
        Assert.assertEq(expected = "valid-cross-arm-equivalent", correctedStatusOf("C8"));

        // The corrected primary `FindingDelivered` population is 2 vs 7 (the two
        // R1 haoling behaviors are delivered finals); the acknowledged-only
        // checkpoint recovery is 8 R0 / 5 R1, its unacknowledged subset 1 each.
        Assert.assertEq(expected = 2, correctedR0#finalValid);
        Assert.assertEq(expected = 7, correctedR1#finalValid);
        // The checkpoint-inclusive view is NOT the acknowledged-only recovery:
        // checkpointValid is 9 R0 / 6 R1, of which 8 R0 / 5 R1 are acknowledged.
        Assert.assertEq(expected = 9, correctedR0#checkpointValid);
        Assert.assertEq(expected = 6, correctedR1#checkpointValid);
        Assert.assertEq(expected = 8, correctedR0#checkpointAcknowledged);
        Assert.assertEq(expected = 5, correctedR1#checkpointAcknowledged);
        Assert.assertEq(expected = 1, correctedR0#checkpointUnacknowledged);
        Assert.assertEq(expected = 1, correctedR1#checkpointUnacknowledged);

        // F6: no R1 packet call was ever ACCEPTED, so the lack of packet uptake is
        // a behavioral negative, never a substituted token saving.
        Assert.assertEq(expected = 0, List.foldLeft((sum, row) -> sum + row#packetAccepted, 0, deliveryRows));
        // F6: the guard-prefix overshoot and the actual measured session-total
        // overshoot are DISTINCT; obs-3 is far over the cap when the whole
        // measured session (child included) is counted.
        Assert.assertEq(expected = 30694i64, obs3GuardOvershoot);
        Assert.assertEq(expected = 828402i64, obs3MeasuredOvershoot);

        // The UNCHANGED frozen activation rule, applied to the corrected primary
        // metrics, still DECLINES: the correction only raises R1's numerator, so
        // the decision is robust and no optional contrast is activated.
        Assert.assertEq(expected = "decline:r1-not-worse-than-r0", correctedDecisionName)
    }
}



///
/// The Study-owned ReviewBench owner-judge and independent-adjudication owner
/// (`VAL-REVIEW-004`, `library/reviewbench-study.md`).
///
/// This module owns the one scientific statement of the blinded owner judge of
/// the first paired ReviewBench family and of the source-grounded independent
/// adjudication of the findings the reference set does not recognize:
///
/// - the judge protocol identity (the separately pinned `gpt-6.1-sol` medium
///   SIWC route, the frozen judge prompt, the frozen adjudication prompt, the
///   frozen budgets and the fresh blinded candidate ids) is declared here and
///   frozen BEFORE any label exposure;
/// - the logical-finding deduplication and the reference-set classification are
///   stated here: a candidate that refers to a golden finding is MATCHED KNOWN
///   (true or false positive by the golden label), and a candidate that refers
///   to no golden finding is UNMATCHED and is NEVER automatically a false
///   positive;
/// - the unmatched candidates get a SEPARATE, independent, source-grounded
///   AGENT adjudication whose validity is kept apart from the automatic
///   provisional reference-set match. It is an agent review, never a claim of
///   human or manual review, and a validity that stays unresolved is reported as
///   unresolved rather than silently dropped from a denominator;
/// - the quality statement is expressed through the ONE canonical
///   `Attune.Study.Metrics` exact-ratio reducers: known recall, grounded
///   precision, valid (augmented) precision and augmented recall, over the
///   all-findings and severity-restricted views, at task-micro and repo-macro
///   aggregation.
///
/// Nothing here reads a provider response directly: the mechanical boundary
/// projects the judge and adjudication receipts, and the classification and
/// every metric are decided here.
///
pub mod Attune.Study.ReviewBenchJudge {

    use Attune.Study.Metrics

    // --------------------------------------------------------- frozen protocol

    /// The declared judge protocol identity. It names the frozen judge prompt,
    /// the frozen independent-adjudication prompt and the blinded candidate id
    /// scheme, all fixed before any label exposure.
    pub def protocolIdentity(): String = "reviewbench-owner-judge-protocol-v1"

    /// The declared blinding identity of the fresh candidate ids.
    pub def blindingIdentity(): String = "reviewbench-blinded-candidate-ids-v1"

    /// The declared requested judge model: the SAME `gpt-6.1-sol` the owner chose
    /// as the judge, at medium effort, on the Codex subscription route.
    pub def judgeModel(): String = "gpt-6.1-sol"

    /// The declared requested judge effort.
    pub def judgeEffort(): String = "medium"

    /// The declared judge backend identity: the pinned Codex app-server on the
    /// ChatGPT-plan SIWC route, the SAME route the published Sol arms use.
    pub def judgeBackend(): String = "codex-0.160.1-app-server-openai_chatgpt_plan"

    /// The declared judge role name.
    pub def judgeRole(): String = "judge"

    /// The declared independent-adjudication role name.
    pub def adjudicationRole(): String = "adjudicate"

    /// The declared identity of the frozen judge prompt. It is written AFTER the
    /// candidate findings exist and BEFORE any gold exposure, and never tuned.
    pub def judgePromptIdentity(): String =
        "sha256:3c4dbb6dc3457a97ca98fa985b7645b3a76cabf60d98cd7af6282cf0bbe5087d"

    /// The declared identity of the frozen independent-adjudication prompt.
    pub def adjudicationPromptIdentity(): String =
        "sha256:8168d1d97d2a19ad7ba05a7229ae8f1cae69c9571fb3f165cf6c2bf088bfaac3"

    /// The declared corrective role name of the arm-isolated re-adjudication
    /// (`library/reviewbench-adjudication-correction.md`). It is the SAME
    /// mechanical inspected runner over the SAME dedicated SIWC route, but each
    /// session sees ONLY its own arm's two unmatched candidates.
    pub def correctiveRole(): String = "corrective"

    /// The declared identity of the frozen corrective prompt. It is a SEPARATE
    /// prompt PREREGISTERED to exact bytes BEFORE any corrective output and
    /// never tuned afterwards; the joint judge and adjudication prompt
    /// identities stay historical. It is distinct from both.
    pub def correctivePromptIdentity(): String =
        "sha256:4c1bcf28526d2355aa365b066f7c87ed6df1cc94454b64f6e77aef928cf33136"

    /// The declared single task of the arm-isolated corrective adjudication: the
    /// one task whose executed joint adjudication carried the confirmed cross-arm
    /// duplicate bias.
    pub def correctiveTask(): String = "haoling_diary-notebook-blog-transformer-24"

    /// The declared VERSION identity of the canonical matching semantics
    /// (`VAL-MEAS-003`). The canonical matching is the arm-local greedy claim in
    /// the arm's effective order: the blinded projection carries no rank, every
    /// candidate shares rank zero, and the reducer's canonical rank sort fixes
    /// the effective order in which equal-rank candidates resolve a shared golden
    /// reference. That order is pinned explicitly rather than left implicit,
    /// because the `capawesome-team_cli-126` counterexample shows that a
    /// DIFFERENT order of the SAME equal-rank candidates changes the effective
    /// match: under the frozen effective order arm B resolves C5 -> G4 (a false
    /// positive), C2 -> G1 and C4 -> G37; in the candidates' natural input order
    /// the same arm resolves C2 -> G1, C4 -> G4 (the false positive) and C5 -> no
    /// unclaimed reference. The version never silently changes an unaffected
    /// observation: every arm/task/view whose candidates do not share an
    /// overlapping reference is invariant under the order, and the frozen
    /// provisional table is reproduced byte-for-byte under this declared order.
    pub def correctedMatchingVersion(): String = "reviewbench-corrected-matching-v2"

    /// The declared version identity of the separately versioned FULL-POPULATION
    /// quality view (`VAL-MEAS-004`, `VAL-MEAS-005`). The matched-population view
    /// is the frozen six candidate-bearing tasks' own reference set; the
    /// full-population view is the reference population of ALL TEN admitted
    /// tasks, materialized independently of candidate output. Its recall
    /// denominators are the full admitted positive population, and its
    /// known-recall cells are DENOMINATOR-ONLY sensitivities until the matching
    /// semantics of the four candidate-less tasks are resolved, so they are
    /// reported beside — never instead of — the matched-population ratios.
    pub def fullPopulationViewVersion(): String = "reviewbench-full-population-view-v1"

    /// The explicit definition of the full-population view's recall cells. A
    /// task whose reviews produced no candidate at all contributes its golden
    /// true positives to the denominator and structurally zero to the numerator;
    /// the resulting ratio is a denominator-only sensitivity, not a matched
    /// observation, and is never published as the final score.
    pub def fullPopulationDefinition(): String =
        "recall denominator = every positive reference of all ten admitted tasks " +
        "(130 positives / 62 medium-or-high / 58 on the four candidate-less tasks); " +
        "numerator = the matched true positives the arm's candidates actually cover; " +
        "the four candidate-less tasks contribute zero numerator by construction, " +
        "so the known-recall cell is a denominator-only sensitivity"

    /// The declared honest reason the genuine first-finding timing is not
    /// available from the frozen review receipts: the driver's `first_finding_ms`
    /// field is rendered from the first AGENT MESSAGE, and no separate
    /// first-committed-finding timestamp was recorded.
    pub def firstFindingUnavailableReason(): String =
        "driver field first_finding_ms is the first agent message; no separate first-committed-finding timestamp was recorded"

    /// The declared identity of the frozen judge budget record.
    pub def budgetIdentity(): String = "reviewbench-judge-budget-v1"

    /// The declared wall bound of one judge or adjudication session, in seconds.
    pub def wallSeconds(): Int32 = 300

    /// The declared tool-round bound of one judge or adjudication session.
    pub def toolRounds(): Int32 = 32

    /// The declared observed cumulative token budget of one session (input incl.
    /// cached + output; cached tokens counted once).
    pub def observedTokenBudget(): Int64 = 256000i64

    /// The declared judge outcome name of an `ok` mechanical result.
    pub def okStatus(): String = "ok"

    /// The declared status-cell index of one ORDINARY judge or independent-
    /// adjudication session row. The driver renders that row as
    /// `session <TAB> judge_role <TAB> task <TAB> result_status <TAB> failure ...`,
    /// so the status is the fourth cell (zero-based index 3).
    pub def judgeSessionStatusIndex(): Int32 = 3

    /// The declared status-cell index of one arm-isolated CORRECTIVE session row.
    /// The driver renders that row as
    /// `corrective-session <TAB> arm <TAB> judge_role <TAB> task <TAB>
    /// result_status <TAB> failure ...`, so the status is the fifth cell
    /// (zero-based index 4), one column further right than the ordinary row. The
    /// two layouts are NOT interchangeable: an ordinary row's fifth cell is its
    /// failure text, which is empty on success, so a shared index-4 read
    /// misclassifies a successful ordinary session as a failure.
    pub def correctiveSessionStatusIndex(): Int32 = 4

    /// The declared status cell of one session receipt row. The row's leading tag
    /// selects the layout — `corrective-session` for the arm-isolated corrective
    /// row, the ordinary judge/adjudication layout otherwise — so the two layouts
    /// are never confused through a shared column index.
    pub def sessionStatus(row: List[String]): String =
        match List.head(row) {
            case Some("corrective-session") => statusCellAt(row, correctiveSessionStatusIndex())
            case _                          => statusCellAt(row, judgeSessionStatusIndex())
        }

    /// Whether one session receipt row records a bounded failure: its status cell
    /// is not the declared `ok` outcome. A row whose status cell is absent reads as
    /// `Unavailable`, which is not `ok`, so an unrecorded status is listed as a
    /// failure rather than silently accepted as a success.
    pub def sessionFailed(row: List[String]): Bool =
        sessionStatus(row) != okStatus()

    def statusCellAt(row: List[String], index: Int32): String =
        match List.head(List.drop(index, row)) {
            case Some(value) => value
            case None        => "Unavailable"
        }

    // ------------------------------------------------------------- vocabulary

    /// One blinded candidate finding. The blinded `id` is what the judge sees;
    /// the `arm` and `rank` are carried for scoring only and are never part of
    /// the judge's prompt.
    pub type alias Candidate = {
        id       = String,
        task     = String,
        arm      = String,
        rank     = Int32,
        file     = String,
        start    = String,
        end      = String,
        severity = String,
        category = String,
        message  = String
    }

    /// One golden-set reference finding, in golden-set order. `index` is the
    /// 1-based position the judge prompt names (`G1`, `G2`, ...).
    pub type alias Reference = {
        index        = Int32,
        task         = String,
        file         = String,
        start        = String,
        end          = String,
        truePositive = Bool,
        severity     = String,
        category     = String,
        message      = String
    }

    /// One candidate's raw reference-set correspondence. An empty reference list
    /// is an unmatched finding, never automatically a false positive.
    pub type alias Match = { task = String, candidate = String, references = List[Int32] }

    /// One unmatched candidate's independent source-grounded adjudication.
    pub type alias Adjudication = {
        task     = String,
        candidate = String,
        status   = String,
        evidence = String
    }

    /// The declared validity of one candidate finding, kept SEPARATE from whether
    /// the reference set recognized it.
    pub enum Verdict with Eq, ToString {
        case MatchedTrue
        case MatchedFalse
        case UnmatchedValid
        case UnmatchedInvalid
        case UnmatchedUnresolved
    }

    /// The declared report name of one verdict.
    pub def verdictName(verdict: Verdict): String = match verdict {
        case Verdict.MatchedTrue         => "matched-true"
        case Verdict.MatchedFalse        => "matched-false"
        case Verdict.UnmatchedValid      => "unmatched-valid"
        case Verdict.UnmatchedInvalid    => "unmatched-invalid"
        case Verdict.UnmatchedUnresolved => "unmatched-unresolved"
    }

    /// Whether the reference set recognized the candidate (the automatic
    /// provisional match).
    pub def isMatched(verdict: Verdict): Bool = match verdict {
        case Verdict.MatchedTrue  => true
        case Verdict.MatchedFalse => true
        case _                    => false
    }

    /// Whether the candidate is a useful finding: a matched true positive or an
    /// independently adjudicated valid finding.
    pub def isValid(verdict: Verdict): Bool = match verdict {
        case Verdict.MatchedTrue    => true
        case Verdict.UnmatchedValid => true
        case _                      => false
    }

    /// Whether the candidate's validity stays explicitly unresolved.
    pub def isUnresolved(verdict: Verdict): Bool = verdict == Verdict.UnmatchedUnresolved

    /// Whether the candidate is a NEWLY discovered valid finding (valid although
    /// the reference set did not recognize it).
    pub def isNewlyValid(verdict: Verdict): Bool = verdict == Verdict.UnmatchedValid

    // ------------------------------------------------------- logical findings

    /// The declared logical identity of one candidate finding: the
    /// repository-relative file it names and its normalized message. Two
    /// projected findings with the same identity are the same logical finding.
    pub def findingKey(file: String, message: String): String =
        file + "\u0001" + String.trim(message)

    /// The distinct logical findings of one list, in first-seen order.
    pub def logicalFindings(candidates: List[Candidate]): List[Candidate] =
        dedupe(candidates, Nil, Nil)

    def dedupe(candidates: List[Candidate], seen: List[String], acc: List[Candidate]): List[Candidate] =
        match candidates {
            case Nil => List.reverse(acc)
            case candidate :: rest =>
                let key = findingKey(candidate#file, candidate#message);
                if (List.memberOf(key, seen)) dedupe(rest, seen, acc)
                else dedupe(rest, key :: seen, candidate :: acc)
        }

    // ----------------------------------------------------------- classification

    /// One classified candidate: its blinded record and its declared verdict.
    pub type alias Classified = { candidate = Candidate, verdict = Verdict }

    /// The declared verdict of one unmatched candidate's adjudication status. A
    /// status outside the declared vocabulary, or an absent adjudication, is
    /// explicitly UNRESOLVED rather than a fabricated validity.
    pub def adjudicatedVerdict(status: Option[String]): Verdict = match status {
        case Some("valid")   => Verdict.UnmatchedValid
        case Some("invalid") => Verdict.UnmatchedInvalid
        case _               => Verdict.UnmatchedUnresolved
    }

    def referencesOf(task: String, candidate: String, matches: List[Match]): List[Int32] =
        match List.find(match_ -> match_#task == task and match_#candidate == candidate, matches) {
            case Some(entry) => entry#references
            case None        => Nil
        }

    def adjudicationStatus(task: String, candidate: String, adjudications: List[Adjudication]): Option[String] =
        match List.find(entry -> entry#task == task and entry#candidate == candidate, adjudications) {
            case Some(entry) => Some(entry#status)
            case None        => None
        }

    def isTruePositive(references: List[Reference], index: Int32): Bool =
        match List.find(reference -> reference#index == index, references) {
            case Some(reference) => reference#truePositive
            case None            => false
        }

    /// Classify one arm's candidates: the raw correspondences are resolved into
    /// scoring inputs in candidate order, so each candidate claims at most one
    /// still-unclaimed golden finding (the first unclaimed match in golden-set
    /// order) and a candidate with no unclaimed match is unmatched. This is the
    /// benchmark's own deduplication for scoring: the golden finding is counted
    /// once for precision while every raw match still counts for recall.
    pub def classifyArm(
        candidates: List[Candidate],
        references: List[Reference],
        matches: List[Match],
        adjudications: List[Adjudication]): List[Classified] =
        claim(List.sortBy(candidate -> candidate#rank, candidates), references, matches, adjudications, Nil, Nil)

    /// Classify one arm's candidates under an EXPLICIT effective order, without
    /// re-sorting by rank. The canonical `classifyArm` sorts an arm's candidates
    /// by `rank`, so when the blinded projection carries no rank every candidate
    /// shares rank zero and the reducer's rank sort fixes ONE specific permutation
    /// of the equal-rank input: that permutation is the frozen EFFECTIVE order.
    /// The order is load-bearing: the first candidate in order claims the first
    /// still-unclaimed reference, so two equal-rank candidates that claim
    /// overlapping references resolve differently under a different order. This
    /// entry point states an order explicitly, so an order-sensitivity
    /// counterexample can be reduced without rewriting the canonical matching or
    /// the frozen bytes.
    pub def classifyArmInOrder(
        candidates: List[Candidate],
        references: List[Reference],
        matches: List[Match],
        adjudications: List[Adjudication]): List[Classified] =
        claim(candidates, references, matches, adjudications, Nil, Nil)

    /// The declared effective order of a blinded candidate population: the
    /// reducer's canonical sort by rank. The blinded projection carries no rank,
    /// so every candidate enters at rank zero and the sort fixes one specific
    /// permutation of the equal-rank input; that permutation is the frozen
    /// EFFECTIVE order, and the canonical matching reproduces the frozen
    /// provisional bytes exactly under it. It is deliberately NOT documented as
    /// preserving the input order, because it does not, and the
    /// `capawesome-team_cli-126` counterexample shows that the difference is
    /// observable: the same equal-rank candidates in their natural input order
    /// resolve a shared golden reference differently.
    pub def effectiveOrder(candidates: List[Candidate]): List[Candidate] =
        List.sortBy(candidate -> candidate#rank, candidates)

    /// The declared effective MATCH of one arm's candidates under an explicit
    /// order: each candidate's claimed golden reference index, or none. It is the
    /// same arm-local greedy claim the canonical classification uses, exposed as
    /// data so an order-sensitivity counterexample can name exactly which
    /// candidate claimed which reference before and after a reorder. The two
    /// reductions are pinned to agree by the law
    /// `theDataViewAndTheClassificationAgreeOnTheSameClaim` and, over the frozen
    /// population, by the byte-for-byte provisional reproduction itself.
    pub def claimedReferences(
        candidates: List[Candidate],
        references: List[Reference],
        matches: List[Match]): List[(String, Option[Int32])] =
        claims(candidates, references, matches, Nil, Nil)

    def claims(
        candidates: List[Candidate],
        references: List[Reference],
        matches: List[Match],
        claimed: List[Int32],
        acc: List[(String, Option[Int32])]): List[(String, Option[Int32])] = match candidates {
        case Nil => List.reverse(acc)
        case candidate :: rest =>
            let available = List.filter(index -> not List.memberOf(index, claimed),
                referencesOf(candidate#task, candidate#id, matches));
            match List.head(List.sort(available)) {
                case Some(index) => claims(rest, references, matches, index :: claimed,
                    (candidate#id, Some(index)) :: acc)
                case None        => claims(rest, references, matches, claimed,
                    (candidate#id, None) :: acc)
            }
    }

    /// The declared claimed reference index of one candidate in one assignment,
    /// or none.
    pub def claimedIndexOf(
        assignments: List[(String, Option[Int32])],
        candidate: String): Option[Int32] =
        match List.find(entry -> match entry { case (id, _) => id == candidate }, assignments) {
            case Some((_, index)) => index
            case None             => None
        }

    def claim(
        candidates: List[Candidate],
        references: List[Reference],
        matches: List[Match],
        adjudications: List[Adjudication],
        claimed: List[Int32],
        acc: List[Classified]): List[Classified] = match candidates {
        case Nil => List.reverse(acc)
        case candidate :: rest =>
            let available = List.filter(index -> not List.memberOf(index, claimed),
                referencesOf(candidate#task, candidate#id, matches));
            match List.head(List.sort(available)) {
                case Some(index) =>
                    let verdict = if (isTruePositive(references, index)) Verdict.MatchedTrue else Verdict.MatchedFalse;
                    claim(rest, references, matches, adjudications, index :: claimed,
                        { candidate = candidate, verdict = verdict } :: acc)
                case None =>
                    let verdict = adjudicatedVerdict(adjudicationStatus(candidate#task, candidate#id, adjudications));
                    claim(rest, references, matches, adjudications, claimed,
                        { candidate = candidate, verdict = verdict } :: acc)
            }
    }

    /// Classify ONE arm's candidates independently from its own corrective
    /// observations ALONE (`library/reviewbench-adjudication-correction.md`).
    ///
    /// The corrective session is physically given no reference set, no other
    /// arm's candidates and no prior verdict, so every candidate is UNMATCHED and
    /// its validity is exactly its corrective status: valid, invalid or
    /// explicitly unresolved. Calling this once per arm is the whole point: a
    /// candidate is NEVER invalid or deduplicated merely because the OTHER arm
    /// reported the same issue. Within an arm the ordinary claim-based
    /// classification (and therefore the ordinary logical-dedup law) is
    /// unchanged.
    pub def correctiveClassify(
        candidates: List[Candidate],
        adjudications: List[Adjudication]): List[Classified] =
        classifyArm(candidates, Nil, Nil, adjudications)

    /// Whether one golden reference is covered for recall by any of the arm's
    /// candidates: the raw correspondence counts regardless of which candidate
    /// claims the reference for precision.
    pub def referenceCovered(index: Int32, candidateIds: List[String], matches: List[Match]): Bool =
        List.exists(entry -> List.memberOf(entry#candidate, candidateIds) and List.memberOf(index, entry#references), matches)

    // ------------------------------------------------------------- reduction

    /// The declared finding-level counts of one arm of one task. The unresolved
    /// count is explicit, so an unresolved validity can never silently vanish
    /// from a denominator.
    pub type alias Counts = {
        candidates        = Int32,
        matched           = Int32,
        matchedTrue       = Int32,
        unmatched         = Int32,
        unmatchedValid    = Int32,
        unmatchedInvalid  = Int32,
        unmatchedUnresolved = Int32,
        goldTrue          = Int32,
        goldCovered       = Int32
    }

    /// The declared zero counts.
    pub def zeroCounts(): Counts = {
        candidates = 0, matched = 0, matchedTrue = 0, unmatched = 0,
        unmatchedValid = 0, unmatchedInvalid = 0, unmatchedUnresolved = 0,
        goldTrue = 0, goldCovered = 0
    }

    /// The finding-level counts of one arm over one task's references and matches.
    pub def countsOf(classified: List[Classified], references: List[Reference], matches: List[Match]): Counts = {
        let candidateIds = List.map(entry -> (entry#candidate)#id, classified);
        let goldTrue = List.filter(reference -> reference#truePositive, references);
        let covered = List.filter(reference -> referenceCovered(reference#index, candidateIds, matches), goldTrue);
        let matched = List.filter(entry -> isMatched(entry#verdict), classified);
        let matchedTrue = List.filter(entry -> entry#verdict == Verdict.MatchedTrue, classified);
        let unmatched = List.filter(entry -> not isMatched(entry#verdict), classified);
        {
            candidates = List.length(classified),
            matched = List.length(matched),
            matchedTrue = List.length(matchedTrue),
            unmatched = List.length(unmatched),
            unmatchedValid = List.length(List.filter(entry -> entry#verdict == Verdict.UnmatchedValid, classified)),
            unmatchedInvalid = List.length(List.filter(entry -> entry#verdict == Verdict.UnmatchedInvalid, classified)),
            unmatchedUnresolved = List.length(List.filter(entry -> entry#verdict == Verdict.UnmatchedUnresolved, classified)),
            goldTrue = List.length(goldTrue),
            goldCovered = List.length(covered)
        }
    }

    /// The declared quality metrics of the judge family, in report order.
    pub enum JudgeMetric with Eq, Order, ToString {
        case KnownRecall
        case GroundedPrecision
        case ValidPrecision
        case ResolvedPrecision
        case AugmentedRecall
    }

    /// The declared metric population of one judge report row.
    pub def judgeMetrics(): List[JudgeMetric] =
        JudgeMetric.KnownRecall :: JudgeMetric.GroundedPrecision
            :: JudgeMetric.ValidPrecision :: JudgeMetric.ResolvedPrecision
            :: JudgeMetric.AugmentedRecall :: Nil

    /// The declared report name of one metric.
    pub def judgeMetricName(metric: JudgeMetric): String = match metric {
        case JudgeMetric.KnownRecall       => "known-recall"
        case JudgeMetric.GroundedPrecision => "grounded-precision"
        case JudgeMetric.ValidPrecision    => "valid-precision"
        case JudgeMetric.ResolvedPrecision => "resolved-precision"
        case JudgeMetric.AugmentedRecall   => "augmented-recall"
    }

    /// The declared exact value of one metric over one arm's counts. Known recall
    /// is undefined when the task has no golden true positive, and the two
    /// augmented metrics are undefined when their own denominator is empty: an
    /// empty population has no ratio and is never reported as zero.
    ///
    /// `ValidPrecision` keeps EVERY candidate in its denominator, so a validity
    /// that stays unresolved is never silently dropped from it; `ResolvedPrecision`
    /// is the companion ratio over the candidates whose validity is actually
    /// resolved, reported beside the unresolved count rather than instead of it.
    pub def metricRatio(metric: JudgeMetric, counts: Counts): Option[Metrics.Ratio] = match metric {
        case JudgeMetric.KnownRecall =>
            if (counts#goldTrue == 0) None
            else Some(Metrics.ratio(counts#goldCovered, counts#goldTrue))
        case JudgeMetric.GroundedPrecision =>
            if (counts#matched == 0) None
            else Some(Metrics.ratio(counts#matchedTrue, counts#matched))
        case JudgeMetric.ValidPrecision =>
            if (counts#candidates == 0) None
            else Some(Metrics.ratio(counts#matchedTrue + counts#unmatchedValid, counts#candidates))
        case JudgeMetric.ResolvedPrecision =>
            let denominator = counts#candidates - counts#unmatchedUnresolved;
            if (denominator == 0) None
            else Some(Metrics.ratio(counts#matchedTrue + counts#unmatchedValid, denominator))
        case JudgeMetric.AugmentedRecall =>
            let denominator = counts#goldTrue + counts#unmatchedValid;
            if (denominator == 0) None
            else Some(Metrics.ratio(counts#goldCovered + counts#unmatchedValid, denominator))
    }

    /// The exact pooled counts of a population of per-task arms (task-micro).
    pub def sumCounts(counts: List[Counts]): Counts =
        List.foldLeft(addCounts, zeroCounts(), counts)

    def addCounts(a: Counts, b: Counts): Counts = {
        candidates = a#candidates + b#candidates,
        matched = a#matched + b#matched,
        matchedTrue = a#matchedTrue + b#matchedTrue,
        unmatched = a#unmatched + b#unmatched,
        unmatchedValid = a#unmatchedValid + b#unmatchedValid,
        unmatchedInvalid = a#unmatchedInvalid + b#unmatchedInvalid,
        unmatchedUnresolved = a#unmatchedUnresolved + b#unmatchedUnresolved,
        goldTrue = a#goldTrue + b#goldTrue,
        goldCovered = a#goldCovered + b#goldCovered
    }

    /// The exact macro mean of one metric over a population of per-task counts
    /// (repo-macro when the population is one entry per repository). A per-task
    /// value that is undefined — an empty denominator, not a zero — is excluded
    /// from the mean rather than counted as a zero, so the report carries the
    /// defined population count beside the mean (`macroDefined`). An entirely
    /// undefined population has no mean at all and is `None`.
    pub def macroRatio(metric: JudgeMetric, counts: List[Counts]): Option[Metrics.Ratio] = {
        let values = List.filterMap(value -> value, List.map(entry -> metricRatio(metric, entry), counts));
        Metrics.meanRatio(values)
    }

    /// The number of per-task entries that contribute a defined value to one
    /// macro mean. Reported beside the mean, so an excluded task is visible
    /// rather than silently absent from the population.
    pub def macroDefined(metric: JudgeMetric, counts: List[Counts]): Int32 =
        List.length(List.filterMap(value -> value, List.map(entry -> metricRatio(metric, entry), counts)))

    // --------------------------------------------------------- severity views

    /// The declared all-findings view.
    pub def allView(): String = "all"

    /// The declared medium-or-higher severity view.
    pub def mediumHighView(): String = "medium-high"

    /// The declared high severity view.
    pub def highView(): String = "high"

    /// The declared severity views, in report order.
    pub def views(): List[String] = allView() :: mediumHighView() :: highView() :: Nil

    /// The declared severities of one view.
    pub def viewSeverities(view: String): List[String] =
        if (view == mediumHighView()) List#{"medium", "high"}
        else if (view == highView()) List#{"high"}
        else Nil

    /// Whether one severity is inside a view. The all-findings view admits every
    /// severity, including the empty vocabulary a model may omit.
    pub def inView(view: String, severity: String): Bool =
        if (view == allView()) true
        else List.memberOf(severity, viewSeverities(view))

    /// Restrict one arm's candidates and one task's references to a view.
    pub def restrictToView(
        view: String,
        candidates: List[Candidate],
        references: List[Reference]): (List[Candidate], List[Reference]) =
        (List.filter(candidate -> inView(view, candidate#severity), candidates),
         List.filter(reference -> inView(view, reference#severity), references))

    /// Restrict one task's raw correspondences to a view: only the reference
    /// indices whose golden finding is inside the view survive. This is the
    /// methodology's own stratified recomputation, where the golden set, the
    /// candidates AND the match set are all restricted to the same subset, so a
    /// candidate whose only correspondence leaves the view becomes unmatched
    /// there and is resolved (or honestly left unresolved) by adjudication
    /// rather than being silently scored a false positive.
    pub def restrictMatches(
        view: String,
        references: List[Reference],
        matches: List[Match]): List[Match] = {
        let allowed = List.map(reference -> reference#index,
            List.filter(reference -> inView(view, reference#severity), references));
        List.map(match_ -> {
            task = match_#task,
            candidate = match_#candidate,
            references = List.filter(index -> List.memberOf(index, allowed), match_#references)
        }, matches)
    }

    // --------------------------------------------------- paired disagreement

    /// The declared paired disagreement of one task: the golden true positives
    /// each arm covers. A golden finding covered by exactly one arm is a paired
    /// disagreement, and the reference-set miss is never counted as a false
    /// positive.
    pub type alias PairedDisagreement = {
        task        = String,
        goldTrue    = Int32,
        coveredByA  = Int32,
        coveredByB  = Int32,
        bothCovered = Int32,
        neither     = Int32
    }

    /// The declared paired disagreement of one task over the two arms' raw
    /// correspondences.
    pub def pairedDisagreement(
        task: String,
        references: List[Reference],
        matches: List[Match],
        candidatesA: List[Candidate],
        candidatesB: List[Candidate]): PairedDisagreement = {
        let idsA = List.map(candidate -> candidate#id, candidatesA);
        let idsB = List.map(candidate -> candidate#id, candidatesB);
        let goldTrue = List.filter(reference -> reference#truePositive, references);
        let coveredA = List.filter(reference -> referenceCovered(reference#index, idsA, matches), goldTrue);
        let coveredB = List.filter(reference -> referenceCovered(reference#index, idsB, matches), goldTrue);
        let both = List.filter(reference -> List.memberOf(reference#index, List.map(other -> other#index, coveredB)), coveredA);
        {
            task = task,
            goldTrue = List.length(goldTrue),
            coveredByA = List.length(coveredA),
            coveredByB = List.length(coveredB),
            bothCovered = List.length(both),
            neither = List.length(goldTrue) - List.length(coveredA) - List.length(coveredB) + List.length(both)
        }
    }
}

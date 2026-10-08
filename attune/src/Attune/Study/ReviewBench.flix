///
/// The Study-owned ReviewBench admission and bounded shared-context owner
/// (`VAL-REVIEW-001`, `VAL-REVIEW-002`).
///
/// This module owns the one scientific statement of the owner-approved first
/// paired-economics study's *substrate*: how the pinned ReviewBench corpus is
/// admitted from its declared origin, how its metadata-only cohort is selected
/// and split, how a task's exported base/head source is measured and admitted to
/// the paired structural study, and which bounded shared-context policy the two
/// review arms are frozen under. It selects no arm outcome, judges nothing and
/// reads no golden finding: gold is the separate judge's input, never a
/// predictor or reviewer input, and no scientific score is produced here at all.
///
/// The corpus is admitted ONLY from the canonical origin by *actual* acquisition:
/// the pin record names the origin URL, the commit, the corpus path and the git
/// blob SHA-1, and `reviewFindings` compares that declaration with the identity
/// the mechanical boundary observed on the real materialized bytes. A page fetch,
/// a metadata claim or a differently-sourced copy can never mark readiness — a
/// mismatch is a reported finding, not a silent pass.
///
/// The cohort is metadata-only and deterministic: the primary-language slice is
/// verified against the pinned manifest, the declared metadata exclusion removes
/// exactly the named outlier tasks, the 24-task selection is seeded by the
/// SHA-256 of `(taskid + declared seed)` with the frozen language quotas and a
/// distinct-repository preference, and the repository-disjoint
/// development/calibration/final split reuses the existing 3/1/1
/// largest-remainder mechanism. Nothing here consults gold, a finding, a score
/// or the published Sol difficulty, so no outcome, label or difficulty can
/// replace a selected task; an underfilled quota stays underfilled.
///
/// Source measurement is explicit and classification is declared: the existing
/// frontend language table (JS, JSX, TS, TSX, Java, Flix, Starlark, Ruby) decides
/// support, the frozen path/header vocabulary decides generated, vendored and
/// minified, and a task enters the paired structural study only when supported
/// languages cover at least the declared share of its changed source bytes.
/// Everything else is attrition with a named reason, never a silent admission.
///
pub mod Attune.Study.ReviewBench {

    use Attune.Study
    use Attune.Repository.Grit

    // -------------------------------------------------------- origin and pin

    /// The one declared origin pin of the approved corpus: the canonical public
    /// origin, the exact commit, the manifest path inside it, and the git blob
    /// SHA-1 the materialized `corpus/manifest.json` bytes must have.
    pub type alias Pin = {
        origin   = String,
        commit   = String,
        path     = String,
        gitBlob  = String,
        licenses = String
    }

    pub def declaredPin(): Pin = {
        origin = "https://github.com/review-bench/ReviewBench",
        commit = "66df3f322d0d85ea133ea9fa777f5d1a8c933c4e",
        path = "corpus/manifest.json",
        gitBlob = "c12d9f760bd4d79965e5870eb860cbcf78c07c9a",
        licenses = "MIT"
    }

    /// The declared primary-language slice of the 219-task population, in the
    /// declared language order. The full population is NOT representative of
    /// these languages, so the fraction is reported beside the counts.
    pub def primaryLanguages(): List[String] =
        "TypeScript" :: "JavaScript" :: "Java" :: "Ruby" :: Nil

    /// The declared per-language counts of the primary slice: TypeScript,
    /// JavaScript, Java, Ruby = 68 / 15 / 7 / 1 tasks over 72 repositories.
    pub def declaredPrimaryCounts(): List[(String, Int32)] =
        ("TypeScript", 68) :: ("JavaScript", 15) :: ("Java", 7) :: ("Ruby", 1) :: Nil

    /// The declared per-language counts of the fast cohort after the metadata
    /// exclusion: 62 / 14 / 6 / 1 tasks over 65 repositories.
    pub def declaredFastCounts(): List[(String, Int32)] =
        ("TypeScript", 62) :: ("JavaScript", 14) :: ("Java", 6) :: ("Ruby", 1) :: Nil

    /// The declared total population size and the declared primary-slice and
    /// fast-cohort task and repository counts.
    pub def declaredTotals(): (Int32, Int32, Int32, Int32, Int32) =
        (219, 91, 72, 83, 65)

    /// The declared metadata exclusion bounds: an outlier when the changed line
    /// count exceeds the declared line bound OR the changed file count exceeds
    /// the declared file bound. Both are metadata-only quantities of the pinned
    /// manifest, so the exclusion is reproducible and blind-count-free.
    pub def outlierLineBound(): Int32 = 10000
    pub def outlierFileBound(): Int32 = 100

    /// The eight owner-pinned outlier tasks, as `nwo#pr` identities. The
    /// exclusion must remove exactly these and nothing else.
    pub def declaredOutlierTasks(): List[String] =
        "WhatIfWeDigDeeper/application-tracker#261"
            :: "hoangsonww/Claude-Code-Agent-Monitor#58"
            :: "khanjal/gig-logger#430"
            :: "pnpm/pnpm#11268"
            :: "simnaut/emdash#2"
            :: "tallclub/matimo#77"
            :: "tforster/gilbert#39"
            :: "ls1intum/Artemis#12594"
            :: Nil

    // ------------------------------------------------------------ task rows

    /// One pinned corpus task: exactly the declared metadata projection of one
    /// manifest record. No golden finding, review comment or later fix is part of
    /// this row, so no evaluator artifact can be selected on.
    pub type alias Task = {
        repo       = String,
        nwo        = String,
        pr         = Int32,
        base       = String,
        head       = String,
        language   = String,
        repoSizeKb = Int64,
        added      = Int64,
        removed    = Int64,
        files      = Int64,
        title      = String,
        body       = String
    }

    /// The canonical task identity: the canonical repository name and the PR
    /// number. It is the identity the seed and every frozen record key on.
    pub def taskId(task: Task): String = task#nwo + "#" + Int32.toString(task#pr)

    /// The declared changed line count of one task (added + removed).
    pub def changedLines(task: Task): Int64 = task#added + task#removed

    /// Whether one task is a declared metadata outlier under the frozen bounds.
    pub def isOutlier(task: Task): Bool =
        changedLines(task) > Int32.toInt64(outlierLineBound())
            or task#files > Int32.toInt64(outlierFileBound())

    /// The declared primary-language slice of one population, in declared
    /// language order.
    pub def primarySlice(tasks: List[Task]): List[Task] =
        List.filter(task -> List.memberOf(task#language, primaryLanguages()), tasks)

    /// The declared fast cohort: the primary slice without its outliers.
    pub def fastCohort(tasks: List[Task]): List[Task] =
        List.filter(task -> not isOutlier(task), primarySlice(tasks))

    /// The outlier tasks of one population, in the population's own order.
    pub def outliers(tasks: List[Task]): List[Task] =
        List.filter(isOutlier, primarySlice(tasks))

    /// The number of distinct repositories of one population.
    pub def repoCount(tasks: List[Task]): Int32 =
        List.length(List.distinct(List.map(task -> task#nwo, tasks)))

    /// The per-language counts of one population, restricted to the declared
    /// primary languages so an undeclared language can never inflate a cohort.
    pub def languageCounts(tasks: List[Task]): List[(String, Int32)] =
        List.map(language -> (language,
            List.length(List.filter(task -> task#language == language, tasks))), primaryLanguages())

    /// The declared share of the full population the primary slice covers, in
    /// parts per thousand, computed on the exact counts rather than rounded.
    pub def primarySharePerThousand(primary: Int32, total: Int32): Int32 =
        if (total <= 0) 0 else (primary * 1000) / total

    // ------------------------------------------------------- admission law

    /// The declared expectations of one admission against the observed identity
    /// and the real record population. A clean acquisition and an exactly
    /// reproduced cohort produce no finding; every mismatch is named rather than
    /// silently accepted, and a count that differs from the declared one is
    /// investigated and reported honestly instead of forced to the expected value.
    pub def reviewFindings(
        observedBytes: Int64,
        observedGitBlob: String,
        observedRows: Int32,
        observedPrimary: Int32,
        observedPrimaryRepos: Int32,
        observedFast: Int32,
        observedFastRepos: Int32,
        observedPrimaryCounts: List[(String, Int32)],
        observedFastCounts: List[(String, Int32)],
        observedOutliers: List[String],
        declaredOutliers: List[String],
        declaredBytes: Int64
    ): List[String] = {
        let totals = declaredTotals();
        let (totalTasks, primaryTasks, primaryRepos, fastTasks, fastRepos) = totals;
        List.filter(finding -> not String.isEmpty(finding), List#{
            if (observedGitBlob == declaredPin()#gitBlob) "" else "origin: manifest git blob " + observedGitBlob + " != declared " + declaredPin()#gitBlob,
            if (observedBytes == declaredBytes) "" else "origin: manifest bytes " + Int64.toString(observedBytes) + " != declared " + Int64.toString(declaredBytes),
            if (observedRows == totalTasks) "" else "population: " + Int32.toString(observedRows) + " tasks != declared " + Int32.toString(totalTasks),
            if (observedPrimary == primaryTasks) "" else "primary slice: " + Int32.toString(observedPrimary) + " tasks != declared " + Int32.toString(primaryTasks),
            if (observedPrimaryRepos == primaryRepos) "" else "primary slice: " + Int32.toString(observedPrimaryRepos) + " repos != declared " + Int32.toString(primaryRepos),
            if (observedFast == fastTasks) "" else "fast cohort: " + Int32.toString(observedFast) + " tasks != declared " + Int32.toString(fastTasks),
            if (observedFastRepos == fastRepos) "" else "fast cohort: " + Int32.toString(observedFastRepos) + " repos != declared " + Int32.toString(fastRepos),
            if (observedPrimaryCounts == declaredPrimaryCounts()) "" else "primary language counts " + renderCounts(observedPrimaryCounts) + " != declared " + renderCounts(declaredPrimaryCounts()),
            if (observedFastCounts == declaredFastCounts()) "" else "fast language counts " + renderCounts(observedFastCounts) + " != declared " + renderCounts(declaredFastCounts()),
            if (List.sort(observedOutliers) == List.sort(declaredOutliers)) "" else "outliers " + List.join(",", List.sort(observedOutliers)) + " != declared " + List.join(",", List.sort(declaredOutliers))
        })
    }

    /// One language-count table as a canonical one-line record.
    pub def renderCounts(counts: List[(String, Int32)]): String =
        List.join(" ", List.map(entry -> match entry { case (language, count) => language + "=" + Int32.toString(count) }, counts))

    // -------------------------------------------------------- cohort freeze

    /// The declared selection seed. It is a fixed declared string, so the
    /// selection is reproducible from the pinned manifest alone.
    pub def declaredSeed(): String = "attune-reviewbench-first-paired-2026-10-08"

    /// The declared frozen quotas of the 24-task cohort, in declared language
    /// order: 17 TypeScript, 4 JavaScript, 2 Java, 1 Ruby.
    pub def quotas(): List[(String, Int32)] =
        ("TypeScript", 17) :: ("JavaScript", 4) :: ("Java", 2) :: ("Ruby", 1) :: Nil

    /// The declared cohort size: the exact sum of the frozen quotas.
    pub def cohortSize(): Int32 =
        List.foldLeft((sum, entry) -> match entry { case (_, count) => sum + count }, 0, quotas())

    /// The exact material the selection hashes: the canonical task identity
    /// followed by the declared seed. The digest primitive is mechanical
    /// (SHA-256) and is supplied by the stage, so this module states the material
    /// and the order while the byte work stays in the mechanical boundary.
    pub def selectionMaterial(task: Task): String = taskId(task) + declaredSeed()

    /// The declared selection order of one candidate population: the SHA-256
    /// digest of the selection material ascending, ties broken by the canonical
    /// task identity. The digest function is injected so this module owns the
    /// *order policy* and the mechanical boundary owns only the digest.
    def selectionOrder(candidates: List[Task], digest: Task -> String): List[String] =
        List.sort(List.map(task -> digest(task) + "\t" + taskId(task), candidates))

    def taskOf(id: String, candidates: List[Task]): Option[Task] =
        List.find(task -> taskId(task) == id, candidates)

    def idOfKey(key: String): String = match List.reverse(String.split(regex = "\t", key)) {
        case id :: _ => id
        case Nil     => ""
    }

    /// The declared selection of one language against its quota: the candidates
    /// in seeded order, a distinct-repository preference first, then the
    /// remaining seeded order if the quota cannot be filled by distinct
    /// repositories alone. An underfilled quota stays underfilled — no task is
    /// invented, duplicated or substituted to reach the count.
    /// The declared quota selection of one language's candidates. It is public so
    /// the corpus-free law can drive the exact production rule against fixtures.
    pub def selectLanguage(candidates: List[Task], quota: Int32, digest: Task -> String): List[Task] = {
        let ordered = selectionOrder(candidates, digest);
        let ids = List.map(idOfKey, ordered);
        let distinct = distinctRepoPass(ids, candidates, quota, Nil, Nil);
        let filled = List.length(distinct);
        if (filled >= quota) distinct
        else distinct ::: fillRemainder(ids, candidates, distinct, quota - filled)
    }

    def distinctRepoPass(ids: List[String], candidates: List[Task], quota: Int32, used: List[String], acc: List[Task]): List[Task] =
        if (List.length(acc) >= quota) acc
        else match ids {
            case Nil => acc
            case id :: rest => match taskOf(id, candidates) {
                case None => distinctRepoPass(rest, candidates, quota, used, acc)
                case Some(task) =>
                    if (List.memberOf(task#nwo, used)) distinctRepoPass(rest, candidates, quota, used, acc)
                    else distinctRepoPass(rest, candidates, quota, task#nwo :: used, acc ::: task :: Nil)
            }
        }

    def fillRemainder(ids: List[String], candidates: List[Task], chosen: List[Task], remaining: Int32): List[Task] =
        if (remaining <= 0) Nil
        else match ids {
            case Nil => Nil
            case id :: rest => match taskOf(id, candidates) {
                case None => fillRemainder(rest, candidates, chosen, remaining)
                case Some(task) =>
                    if (List.memberOf(taskId(task), List.map(taskId, chosen))) fillRemainder(rest, candidates, chosen, remaining)
                    else task :: fillRemainder(rest, candidates, chosen ::: task :: Nil, remaining - 1)
            }
        }

    /// The complete declared 24-task cohort of one fast population, in declared
    /// quota order. The population is the fast cohort and the selection is
    /// metadata-only; no gold, finding, score or published difficulty participates.
    pub def selectCohort(fast: List[Task], digest: Task -> String): List[Task] =
        List.flatMap(match (language, quota) ->
            selectLanguage(List.filter(task -> task#language == language, fast), quota, digest),
            quotas())

    /// The declared repository-disjoint split assignment of a cohort: the cohort's
    /// distinct repositories in canonical name order, then the existing 3/1/1
    /// largest-remainder split mechanism. Every task of one repository shares its
    /// repository's split, so no repository straddles two splits, and each task
    /// appears exactly once.
    pub def assignCohortSplits(cohort: List[Task]): List[(String, Study.PanelSplit)] = {
        let repos = List.sort(List.distinct(List.map(task -> task#nwo, cohort)));
        let counts = Study.splitCounts(List.length(repos));
        let sequence = List.flatMap(match (split, count) -> repeatSplit(count, split), counts);
        zipRepos(repos, sequence)
    }

    def repeatSplit(count: Int32, split: Study.PanelSplit): List[Study.PanelSplit] =
        if (count <= 0) Nil else split :: repeatSplit(count - 1, split)

    def zipRepos(repos: List[String], splits: List[Study.PanelSplit]): List[(String, Study.PanelSplit)] = match (repos, splits) {
        case (repo :: rest, split :: more) => (repo, split) :: zipRepos(rest, more)
        case _                             => Nil
    }

    /// The declared split of one task's repository.
    pub def splitOfTask(task: Task, assignments: List[(String, Study.PanelSplit)]): Study.PanelSplit =
        match List.find(entry -> match entry { case (repo, _) => repo == task#nwo }, assignments) {
            case Some((_, split)) => split
            case None             => Study.PanelSplit.Final
        }

    // -------------------------------------------------- source measurement

    /// The declared classification of one exported source file. `bytes` is the
    /// exact file size, `changed` whether the file differs between the task's
    /// base and head export, and `header` a bounded sample of the file's first
    /// line so the frozen header rule can be applied without reading the whole
    /// file. The record carries the measured facts; the classification is stated
    /// here, not in the mechanical boundary.
    pub type alias SourceFile = {
        path    = String,
        bytes   = Int64,
        changed = Bool,
        header  = String
    }

    /// The declared generated path segments.
    pub def generatedSegments(): List[String] =
        "generated" :: "gen" :: "dist" :: "build" :: "out" :: "target" :: "obj" :: "coverage" :: "__generated__" :: Nil

    /// The declared vendored path segments.
    pub def vendoredSegments(): List[String] =
        "vendor" :: "node_modules" :: "third_party" :: "third-party" :: "bower_components" :: "site-packages" :: ".venv" :: "venv" :: Nil

    /// The declared minified basename suffixes.
    pub def minifiedSuffixes(): List[String] =
        ".min.js" :: ".min.jsx" :: ".min.mjs" :: ".min.cjs" :: ".min.css" :: Nil

    /// The declared generated header markers: a file whose bounded header sample
    /// begins with one of these is generated regardless of its path.
    pub def generatedHeaders(): List[String] =
        "// Code generated by" :: "/* eslint-disable */\n// Generated" :: "# Generated by" :: "@generated" :: Nil

    def segments(path: String): List[String] = List.map(String.toLowerCase, String.split(regex = "/", path))

    def basename(path: String): String = match List.reverse(String.split(regex = "/", path)) {
        case last :: _ => last
        case Nil       => path
    }

    pub def isGenerated(file: SourceFile): Bool = {
        let base = String.toLowerCase(basename(file#path));
        List.exists(segment -> List.memberOf(segment, generatedSegments()), segments(file#path))
            or List.exists(suffix -> String.endsWith(suffix = suffix, base), List#{"-lock.json", ".lock"})
            or List.exists(marker -> String.startsWith(prefix = marker, file#header), generatedHeaders())
            or String.contains(substr = ".generated.", base)
    }

    pub def isVendored(file: SourceFile): Bool =
        List.exists(segment -> List.memberOf(segment, vendoredSegments()), segments(file#path))

    pub def isMinified(file: SourceFile): Bool =
        List.exists(suffix -> String.endsWith(suffix = suffix, String.toLowerCase(basename(file#path))), minifiedSuffixes())

    /// The declared fast-structural cap: a source file larger than this is
    /// skipped by Grit and stays outside the fast structural cohort, while the
    /// agent's bytes are never truncated.
    pub def fastStructuralCapBytes(): Int64 = 131072i64

    pub def isOverCap(file: SourceFile): Bool = file#bytes > fastStructuralCapBytes()

    /// One task's measured export: the base and head identity of the exported
    /// trees and every measured source file of the head export. The full source
    /// bytes are identical for both review arms by construction: the same head
    /// export and the same base-to-head diff are bound to both.
    pub type alias Export = {
        baseCommit = String,
        headCommit = String,
        files      = List[SourceFile]
    }

    /// Whether one file is first-party source: changed, and not generated,
    /// vendored or minified. The declared precedence is fixed, so a file is never
    /// counted as source and as non-source at the same time.
    pub def isSourceFile(file: SourceFile): Bool =
        file#changed and not isGenerated(file) and not isVendored(file) and not isMinified(file)

    /// Whether one source file's language is in the existing frontend language
    /// table. The table is `Attune.Repository.Grit`'s admitted vocabulary; an
    /// unsupported path is a classified refusal, never a silent admission.
    pub def supportedLanguage(path: String): Option[Grit.Language] = Grit.language(path)

    pub def isSupported(file: SourceFile): Bool =
        hasLanguage(file#path)

    /// Whether one path is admitted by the existing frontend language table.
    pub def hasLanguage(path: String): Bool = match supportedLanguage(path) {
        case Some(_) => true
        case None    => false
    }

    /// One task's measured byte accounting. Every count is a reduction over the
    /// measured file records, so the numbers are the export's real bytes rather
    /// than a declaration restated.
    pub type alias Accounting = {
        changedBytes          = Int64,
        changedSourceBytes    = Int64,
        supportedSourceBytes  = Int64,
        skippedOverCapBytes   = Int64,
        outsideFastCohort     = Bool,
        sourceFiles           = Int32,
        unsupportedPaths      = Int32
    }

    pub def accountingOf(export: Export): Accounting = {
        let changed = List.filter(file -> file#changed, export#files);
        let source = List.filter(isSourceFile, changed);
        let supported = List.filter(isSupported, source);
        let overCap = List.filter(isOverCap, source);
        let unsupported = List.filter(file -> not hasLanguage(file#path), source);
        {
            changedBytes = sumBytes(changed),
            changedSourceBytes = sumBytes(source),
            supportedSourceBytes = sumBytes(supported),
            skippedOverCapBytes = sumBytes(overCap),
            outsideFastCohort = not List.isEmpty(overCap),
            sourceFiles = List.length(source),
            unsupportedPaths = List.length(unsupported)
        }
    }

    def sumBytes(files: List[SourceFile]): Int64 =
        List.foldLeft((sum, file) -> sum + file#bytes, 0i64, files)

    /// The declared supported share of one accounting, in parts per thousand of
    /// the changed *source* bytes. Computed on the exact integer counts, so the
    /// comparison never depends on rounding a floating-point value.
    pub def supportedPermille(accounting: Accounting): Int64 =
        if (accounting#changedSourceBytes <= 0i64) 0i64
        else (accounting#supportedSourceBytes * 1000i64) / accounting#changedSourceBytes

    /// The declared paired-structural admission threshold: at least 90% (that is
    /// at least 900 parts per thousand) of the changed source bytes must be
    /// supported. A task below it is attrition with the measured reason, never a
    /// forced launch.
    pub def admissionThresholdPermille(): Int64 = 900i64

    /// The declared admission of one task: admitted to the paired structural
    /// study exactly when supported languages cover at least the declared share
    /// of changed source bytes. An empty change set is NOT a vacuous pass; it has
    /// no bytes to cover and is reported as insufficient rather than admitted.
    pub def admitted(accounting: Accounting): Bool =
        accounting#changedSourceBytes > 0i64
            and supportedPermille(accounting) >= admissionThresholdPermille()

    /// The declared attrition reason of one non-admitted task, or the empty
    /// string when the task is admitted. Unsupported paths stay visible to the
    /// reviewer with their structure unknown; the reason names the measured fact.
    pub def attritionReason(accounting: Accounting): String =
        if (admitted(accounting)) ""
        else if (accounting#changedSourceBytes <= 0i64) "no-changed-source-bytes"
        else "supported-permille-" + Int64.toString(supportedPermille(accounting)) + "-below-" + Int64.toString(admissionThresholdPermille())

    /// The declared fast structural cohort membership of one admitted task: a
    /// task whose changed source carries a file above the declared fast-structural
    /// cap stays outside the fast cohort (Grit skips it) even though it remains
    /// admitted and the agent's bytes are never truncated.
    pub def fastStructural(accounting: Accounting): Bool =
        admitted(accounting) and not accounting#outsideFastCohort

    // -------------------------------------------------- bounded shared context

    /// The declared hosted-Qwen batch boundary: at most the declared inputs and
    /// the declared byte cap per request, acquired sequentially. A bounded
    /// concurrency is a separate declared allowance and never a licence for a
    /// request per file.
    pub def qwenBatchInputs(): Int32 = 32
    pub def qwenBatchBytes(): Int64 = 240000i64
    pub def qwenBoundedConcurrency(): Int32 = 8

    /// The declared freeze identity of the shared-context policy record. It is
    /// written before any outcome and is not tuned afterwards.
    pub def contextPolicyIdentity(): String = "reviewbench-shared-context-v1"

    /// The declared bounded-context descriptor policy: only the descriptors the
    /// two arms actually need, shared once per exact world; the graph stays cold
    /// rather than recurring, and no depth-7 census or general registry is built.
    pub def contextDescriptorPolicy(): List[String] =
        "needed-descriptors-only" :: "shared-once-per-exact-world" :: "graph-cold" :: "no-depth-7-census" :: Nil

    /// The declared JEV fixture memo key of one decision: the resolved model, the
    /// frozen prompt identity, the condition, the task, the candidate and the
    /// exact payload hash. Reuse happens ONLY on exact payload equality.
    pub def jevMemoKey(model: String, prompt: String, condition: String, task: String, candidate: String, payloadHash: String): String =
        model + "\t" + prompt + "\t" + condition + "\t" + task + "\t" + candidate + "\t" + payloadHash

    /// The declared isolation of a JEV context: it carries structural evidence
    /// only — never a finding and never gold.
    pub def jevContextExcludes(): List[String] = "findings" :: "gold" :: Nil

    /// The declared assisted-context evidence cap identity: the cap is frozen
    /// before any outcome and consumes the SAME shared token budget as the arm's
    /// own review, so neither arm is handed extra budget.
    pub def assistedContextCapIdentity(): String = "reviewbench-assisted-context-cap-v1"
}

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
    use Attune.Study.Qwen
    use Attune.Theory
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

    // ------------------------------------------------- world identity and export

    /// The declared role of one exported world. Exactly base or head: no future
    /// commit, no human review comment and no later fix is ever exported.
    pub enum WorldRole {
        case Base
        case Head
    }

    pub def roleName(role: WorldRole): String = match role {
        case WorldRole.Base => "base"
        case WorldRole.Head => "head"
    }

    /// The declared source-repository mirror of one task. The canonical
    /// `review-bench` org hosts one `<owner>_<repo>` mirror holding each task's
    /// exact base and head commits, so the export survives an upstream rewrite or
    /// deletion and the two exported revisions stay addressable.
    pub def mirrorRepository(task: Task): String =
        "review-bench/" + String.replace(src = "/", dst = "_", task#nwo)

    /// The declared world identity of one task's export: the canonical repository
    /// name with its path separator folded, the PR number and the declared role.
    /// Source and facts are acquired once per exact WorldId and shared by both
    /// review arms, so the two arms read identical bytes by construction.
    pub def worldId(task: Task, role: WorldRole): String =
        String.replace(src = "/", dst = "_", task#nwo) + "-" + Int32.toString(task#pr) + "-" + roleName(role)

    /// The declared revision of one task's role: the task's own exported base or
    /// head commit, never a later one.
    pub def revisionOf(task: Task, role: WorldRole): String = match role {
        case WorldRole.Base => task#base
        case WorldRole.Head => task#head
    }

    /// The declared identity of one acquired world archive: the world id, the
    /// mirror repository, the exact revision, the exact archive digest and the
    /// exact byte count. The acquisition verifies the digest before the bytes
    /// enter the study, so a mutated or substituted archive fails the fetch
    /// instead of becoming source.
    pub type alias Archive = {
        world      = String,
        repository = String,
        revision   = String,
        sha256     = String,
        bytes      = Int64
    }

    /// The declared archive identity record of one task's role, derived from the
    /// task's own exported identity rather than restated.
    pub def archiveOf(task: Task, role: WorldRole, sha256: String, bytes: Int64): Archive = {
        world = worldId(task, role),
        repository = mirrorRepository(task),
        revision = revisionOf(task, role),
        sha256 = sha256,
        bytes = bytes
    }

    /// One archive identity record as a canonical line of the declared archive
    /// manifest the acquisition repository rule consumes.
    pub def archiveLine(archive: Archive): String =
        List.join("\t", List#{"archive", archive#world, archive#repository, archive#revision,
            archive#sha256, Int64.toString(archive#bytes)})

    // -------------------------------------------------------- bounded deadlines

    /// The declared bounded extraction deadlines: one extraction unit and one
    /// whole base+head world. They are the declared bounds the EXISTING
    /// out-of-process deadline enforces; a deadline is never reported as an
    /// in-process cancellation, because no file-based interrupt exists.
    pub def extractionUnitSeconds(): Int32 = 20
    pub def worldDeadlineSeconds(): Int32 = 120
    pub def deadlineEnforcement(): String = "existing-out-of-process-deadline"
    pub def interruptionClaim(): String = "never-claim-in-process-cancellation"

    /// The declared status of a world that reached its deadline: a partial world
    /// is UNKNOWN, never complete. A released worker's cost and cancellation
    /// evidence is retained, and the shared paired set gets no outcome
    /// replacement.
    pub def partialWorldStatus(): String = "UNKNOWN"
    pub def releasedWorkerDisposition(): String = "cost-and-cancellation-retained-no-replacement"

    // -------------------------------------------------------- measured export

    /// The measured facts of one task's real base/head export. Every count is a
    /// reduction over the export's own measured changed files, so the record is
    /// the export's real bytes rather than a declaration restated. `extensions`
    /// is the declared extension histogram of the changed source population and
    /// `maxSourceBytes` the largest single changed source file.
    pub type alias Measurement = {
        baseFiles           = Int32,
        headFiles           = Int32,
        changedFiles        = Int32,
        changedBytes        = Int64,
        sourceFiles         = Int32,
        changedSourceBytes  = Int64,
        supportedFiles      = Int32,
        supportedSourceBytes = Int64,
        unsupportedFiles    = Int32,
        overCapFiles        = Int32,
        overCapBytes        = Int64,
        maxSourceBytes      = Int64,
        extensions          = List[(String, Int32)]
    }

    /// The declared extension label of one path: the lower-cased final suffix, or
    /// the empty string when the basename carries no dot.
    pub def fileExtension(path: String): String = match String.split(regex = "\\.", basename(path)) {
        case _ :: Nil => ""
        case parts    => String.toLowerCase(match List.reverse(parts) {
            case last :: _ => last
            case Nil       => ""
        })
    }

    /// The declared extension histogram of one population, in extension order.
    pub def extensionCounts(files: List[SourceFile]): List[(String, Int32)] =
        List.sort(List.map(extension -> (extension,
            List.length(List.filter(file -> fileExtension(file#path) == extension, files))),
            List.distinct(List.map(file -> fileExtension(file#path), files))))

    /// The declared measurement of one task's export.
    pub def measurementOf(baseFiles: Int32, headFiles: Int32, files: List[SourceFile]): Measurement = {
        let changed = List.filter(file -> file#changed, files);
        let source = List.filter(isSourceFile, changed);
        let supported = List.filter(isSupported, source);
        let unsupported = List.filter(file -> not hasLanguage(file#path), source);
        let overCap = List.filter(isOverCap, source);
        {
            baseFiles = baseFiles,
            headFiles = headFiles,
            changedFiles = List.length(changed),
            changedBytes = sumBytes(changed),
            sourceFiles = List.length(source),
            changedSourceBytes = sumBytes(source),
            supportedFiles = List.length(supported),
            supportedSourceBytes = sumBytes(supported),
            unsupportedFiles = List.length(unsupported),
            overCapFiles = List.length(overCap),
            overCapBytes = sumBytes(overCap),
            maxSourceBytes = List.foldLeft((largest, file) -> if (file#bytes > largest) file#bytes else largest, 0i64, source),
            extensions = extensionCounts(source)
        }
    }

    /// The declared byte accounting of one measurement: the admission arithmetic
    /// of one task's export, reduced from the measured record rather than restated.
    pub def accountingOfMeasurement(measurement: Measurement): Accounting = {
        changedBytes = measurement#changedBytes,
        changedSourceBytes = measurement#changedSourceBytes,
        supportedSourceBytes = measurement#supportedSourceBytes,
        skippedOverCapBytes = measurement#overCapBytes,
        outsideFastCohort = measurement#overCapFiles > 0,
        sourceFiles = measurement#sourceFiles,
        unsupportedPaths = measurement#unsupportedFiles
    }

    // ------------------------------------------------------ frozen shared context

    /// The declared frozen shared-context record: the one policy record both
    /// review arms are frozen under, written before any outcome and never tuned
    /// afterwards. It restates no model identity of its own — the hosted provider
    /// and the frozen recipe are the existing `Attune.Study.Qwen` owner's, so a
    /// recipe change is one declared identity change and not a second recipe.
    pub type alias SharedContext = {
        identity          = String,
        descriptors       = List[String],
        provider          = String,
        model             = String,
        recipe            = String,
        batchInputs       = Int32,
        batchBytes        = Int64,
        concurrency       = Int32,
        jevExcludes       = List[String],
        assistedCap       = String,
        evidenceBudget    = String,
        deadlineUnit      = Int32,
        deadlineWorld     = Int32,
        deadlineEnforcement = String
    }

    pub def sharedContext(): SharedContext = {
        identity = contextPolicyIdentity(),
        descriptors = contextDescriptorPolicy(),
        provider = Qwen.provider(),
        model = Qwen.declaredModel(),
        recipe = Qwen.recipeIdentity(),
        batchInputs = qwenBatchInputs(),
        batchBytes = qwenBatchBytes(),
        concurrency = qwenBoundedConcurrency(),
        jevExcludes = jevContextExcludes(),
        assistedCap = assistedContextCapIdentity(),
        evidenceBudget = "shared-with-arm-review-same-cumulative-token-budget",
        deadlineUnit = extractionUnitSeconds(),
        deadlineWorld = worldDeadlineSeconds(),
        deadlineEnforcement = deadlineEnforcement()
    }

    /// The declared frozen shared-context record as canonical `key\tvalue` lines.
    pub def renderSharedContext(): List[List[String]] = {
        let context = sharedContext();
        List#{
            List#{"context", "identity", context#identity},
            List#{"context", "descriptors", List.join(",", context#descriptors)},
            List#{"context", "provider", context#provider},
            List#{"context", "model", context#model},
            List#{"context", "recipe", context#recipe},
            List#{"context", "batch_inputs", Int32.toString(context#batchInputs)},
            List#{"context", "batch_bytes", Int64.toString(context#batchBytes)},
            List#{"context", "concurrency", Int32.toString(context#concurrency)},
            List#{"context", "jev_excludes", List.join(",", context#jevExcludes)},
            List#{"context", "assisted_cap", context#assistedCap},
            List#{"context", "evidence_budget", context#evidenceBudget},
            List#{"context", "deadline_unit_seconds", Int32.toString(context#deadlineUnit)},
            List#{"context", "deadline_world_seconds", Int32.toString(context#deadlineWorld)},
            List#{"context", "deadline_enforcement", context#deadlineEnforcement},
            List#{"context", "interruption_claim", interruptionClaim()},
            List#{"context", "partial_world_status", partialWorldStatus()},
            List#{"context", "released_worker", releasedWorkerDisposition()}
        }
    }

    // ------------------------------------------- structural scope and extraction

    /// The declared frozen structural scope of the shared context. It is stated
    /// once and never widened after an outcome: the structural extraction of one
    /// exact world reads that world's first-party changed source, so the shared
    /// facts are about the code a review task actually touches rather than a
    /// whole-repository census.
    pub def structuralScopeIdentity(): String =
        "reviewbench-changed-first-party-source-per-exact-world-v1"

    /// The declared status of one exact world's structural extraction. A partial
    /// world is `PartialUnknown`, never complete: an extraction that did not
    /// finish, or a world with no admitted structural source, reports UNKNOWN
    /// rather than an empty complete fact set.
    pub enum ExtractionStatus with Eq, Order, ToString {
        case Complete
        case PartialUnknown
    }

    pub def extractionStatusName(status: ExtractionStatus): String = match status {
        case ExtractionStatus.Complete       => "complete"
        case ExtractionStatus.PartialUnknown => "UNKNOWN"
    }

    /// The declared structural exclusion vocabulary of one measured file. Every
    /// exclusion is named, so an excluded file is never silently dropped and its
    /// agent-visible bytes stay intact.
    pub enum StructuralExclusion with Eq, Order, ToString {
        case Unchanged
        case NonFirstParty
        case OverCap
        case Unsupported
    }

    pub def structuralExclusionName(exclusion: StructuralExclusion): String = match exclusion {
        case StructuralExclusion.Unchanged   => "unchanged"
        case StructuralExclusion.NonFirstParty => "generated-vendored-or-minified"
        case StructuralExclusion.OverCap     => "over-128KiB-fast-structural-cap"
        case StructuralExclusion.Unsupported => "unsupported-language"
    }

    /// The declared structural disposition of one measured source file: admitted
    /// to the world's structural extraction, or excluded with one named reason.
    /// The precedence is fixed — change, first-party classification, cap, then
    /// language — so one file can never be both admitted and excluded.
    pub type alias StructuralDisposition = {
        path     = String,
        bytes    = Int64,
        admitted = Bool,
        reason   = String
    }

    pub def structuralDisposition(file: SourceFile): StructuralDisposition = {
        let excluded = reason ->
            { path = file#path, bytes = file#bytes, admitted = false, reason = reason };
        if (not file#changed) excluded(structuralExclusionName(StructuralExclusion.Unchanged))
        else if (not isFirstPartySource(file)) excluded(structuralExclusionName(StructuralExclusion.NonFirstParty))
        else if (isOverCap(file)) excluded(structuralExclusionName(StructuralExclusion.OverCap))
        else if (not isSupported(file)) excluded(structuralExclusionName(StructuralExclusion.Unsupported))
        else { path = file#path, bytes = file#bytes, admitted = true, reason = "" }
    }

    /// Whether one file is first-party source: changed and not generated,
    /// vendored or minified. The structural scope never extracts a build product.
    pub def isFirstPartySource(file: SourceFile): Bool =
        file#changed and not isGenerated(file) and not isVendored(file) and not isMinified(file)

    /// One exact world's declared structural accounting: the measured file
    /// population and its admitted/excluded decomposition. Every count is a
    /// reduction over the measured records, so the accounting is the export's own
    /// bytes rather than a declaration restated.
    pub type alias StructuralAccounting = {
        measuredFiles      = Int32,
        measuredBytes      = Int64,
        admittedFiles      = Int32,
        admittedBytes      = Int64,
        overCapFiles       = Int32,
        overCapBytes       = Int64,
        unsupportedFiles   = Int32,
        nonFirstPartyFiles = Int32,
        unchangedFiles     = Int32
    }

    pub def structuralAccounting(files: List[SourceFile]): StructuralAccounting = {
        let admitted = List.filter(file -> structuralDisposition(file)#admitted, files);
        let overCap = List.filter(file -> structuralDisposition(file)#reason == structuralExclusionName(StructuralExclusion.OverCap), files);
        let unsupported = List.filter(file -> structuralDisposition(file)#reason == structuralExclusionName(StructuralExclusion.Unsupported), files);
        let nonFirstParty = List.filter(file -> structuralDisposition(file)#reason == structuralExclusionName(StructuralExclusion.NonFirstParty), files);
        let unchanged = List.filter(file -> structuralDisposition(file)#reason == structuralExclusionName(StructuralExclusion.Unchanged), files);
        {
            measuredFiles = List.length(files),
            measuredBytes = sumBytes(files),
            admittedFiles = List.length(admitted),
            admittedBytes = sumBytes(admitted),
            overCapFiles = List.length(overCap),
            overCapBytes = sumBytes(overCap),
            unsupportedFiles = List.length(unsupported),
            nonFirstPartyFiles = List.length(nonFirstParty),
            unchangedFiles = List.length(unchanged)
        }
    }

    /// The declared paths of one world's admitted structural source, in the
    /// measured order. It is exactly the population the extraction reads.
    pub def admittedPaths(files: List[SourceFile]): List[String] =
        List.map(file -> file#path, List.filter(file -> structuralDisposition(file)#admitted, files))

    /// Whether one world carries a structurally unknown file: changed first-party
    /// source above the fast-structural cap is skipped by Grit and stays outside
    /// the fast structural cohort, while the agent's bytes are never truncated.
    pub def structurallyUnknown(accounting: StructuralAccounting): Bool =
        accounting#overCapFiles > 0

    /// The declared status of one world's structural extraction. Complete only
    /// when the declared structural set was actually extracted; a world with no
    /// admitted structural source, or an extraction that did not complete, is a
    /// partial world and is classified UNKNOWN.
    pub def extractionStatus(admittedFiles: Int32, extracted: Bool): ExtractionStatus =
        if (extracted and admittedFiles > 0) ExtractionStatus.Complete else ExtractionStatus.PartialUnknown

    /// The declared extraction status of one measured population from its own
    /// admitted bytes: a world with no admitted structural bytes is UNKNOWN even
    /// when the extractor reported success, because an empty fact set is not a
    /// completed structural extraction.
    pub def accountingExtractionStatus(accounting: StructuralAccounting, extracted: Bool): ExtractionStatus =
        extractionStatus(accounting#admittedFiles, extracted)

    // ------------------------------------------------------ bounded Qwen batches

    /// One declared hosted-Qwen input: the declared logical key, the side and the
    /// exact byte count of the input text. The declared key is the exact input
    /// bytes' identity — the same three-key logical identity the existing hosted
    /// fixture memo reuses, so a provider-free replay matches on bytes, not on a
    /// row's position.
    pub type alias QwenInput = {
        key   = String,
        side  = String,
        bytes = Int64
    }

    /// The declared fixture identity of one hosted-Qwen input: the provider, the
    /// resolved model, the frozen recipe and the exact input identity. A provider,
    /// model, recipe or input change is a different identity, never a reuse.
    pub def qwenInputIdentity(input: QwenInput): String =
        Qwen.provider() + "|" + Qwen.resolvedModel() + "|" + Qwen.recipeIdentity() + "|" + input#key

    /// One declared hosted-Qwen batch: a contiguous sequential slice of the
    /// declared input order, with the inputs it carried and the exact bytes it
    /// carried.
    pub type alias QwenBatch = {
        index  = Int32,
        inputs = List[QwenInput],
        bytes  = Int64
    }

    /// The declared sequential batching of one input population: consecutive
    /// inputs accumulate while the batch holds at most the declared input count
    /// and at most the declared byte cap. A single input larger than the byte cap
    /// forms its own batch rather than being split, truncated or dropped, because
    /// one fixture exists per logical input.
    pub def qwenBatches(inputs: List[QwenInput]): List[QwenBatch] =
        qwenBatchStep(1, inputs, Nil)

    def qwenBatchStep(index: Int32, inputs: List[QwenInput], acc: List[QwenBatch]): List[QwenBatch] = match inputs {
        case Nil => List.reverse(acc)
        case _   =>
            let taken = takeBatch(inputs, 0, 0i64, Nil);
            qwenBatchStep(index + 1, List.drop(List.length(taken), inputs),
                { index = index, inputs = taken, bytes = sumInputBytes(taken) } :: acc)
    }

    /// Take the longest declared prefix that fits both frozen caps. A single
    /// input is always taken, whatever its size, so no input is lost and no input
    /// is split across batches.
    def takeBatch(inputs: List[QwenInput], count: Int32, bytes: Int64, acc: List[QwenInput]): List[QwenInput] = match inputs {
        case Nil => List.reverse(acc)
        case input :: rest =>
            if (count > 0 and (count >= qwenBatchInputs() or bytes + input#bytes > qwenBatchBytes()))
                List.reverse(acc)
            else takeBatch(rest, count + 1, bytes + input#bytes, input :: acc)
    }

    def sumInputBytes(inputs: List[QwenInput]): Int64 =
        List.foldLeft((sum, input) -> sum + input#bytes, 0i64, inputs)

    // ------------------------------------------------------- bounded JEV context

    /// The declared public field vocabulary of the JEV control condition: the
    /// task's public issue, the candidate path, its rank and score and its anchor
    /// — and nothing else. No structural field, no F/D field, no finding and no
    /// gold can enter this condition.
    pub def jevControlFields(): List[String] =
        "issue" :: "path" :: "rank" :: "score" :: "anchor" :: Nil

    /// The declared public field vocabulary of the JEV structural condition: the
    /// exact control base plus the already-materialized candidate relations and
    /// source-witness descriptions. No new analysis is performed for it.
    pub def jevStructureFields(): List[String] =
        jevControlFields() ::: ("relation" :: "witness" :: Nil)

    /// The declared names that may never appear in a JEV context payload: any
    /// finding and any gold or evaluator field. The check names every violation,
    /// so a leak is a reported finding rather than a silent pass.
    pub def forbiddenContextFields(): List[String] =
        "finding" :: "findings" :: "gold" :: "patch" :: "test_patch"
            :: "fail_to_pass" :: "pass_to_pass" :: "reference" :: Nil

    /// Every forbidden field name present in one context payload, lower-cased for
    /// the comparison. An empty list is the declared public-context contract.
    pub def contextLeaks(fields: List[(String, String)]): List[String] =
        List.filter(name -> List.memberOf(String.toLowerCase(name), forbiddenContextFields()),
            List.map(field -> match field { case (name, _) => name }, fields))

    /// One declared JEV context: the resolved model, the frozen prompt identity,
    /// the condition, the task, the candidate and the exact public payload.
    pub type alias JevContext = {
        model     = String,
        prompt    = String,
        condition = String,
        task      = String,
        candidate = String,
        fields    = List[(String, String)]
    }

    /// The declared public payload of one JEV context as canonical `key\tvalue`
    /// lines, in declared field order. It carries public evidence only.
    pub def renderJevPayload(fields: List[(String, String)]): String =
        List.join("\n", List.map(field -> match field { case (name, value) => name + "\t" + value }, fields))

    /// The declared memo identity of one JEV context: the exact previous memo key
    /// components plus the exact payload hash. Reuse happens only when every
    /// component is byte-identical, so a condition, payload or prompt change is a
    /// different context and a successful exact decision is never requested twice.
    pub def jevContextMemoKey(context: JevContext, payloadHash: String): String =
        jevMemoKey(context#model, context#prompt, context#condition, context#task, context#candidate, payloadHash)

    // -------------------------------------------------------------- reuse proof

    /// The declared mechanism that actually served a reused artifact. A native
    /// in-memory memo is NOT persistent across actions, so it is named separately
    /// from the durable mechanisms and is never counted as cross-action reuse.
    pub enum ReuseMechanism with Eq, Order, ToString {
        case NativeMemo
        case ActionCache
        case RemoteDedup
        case Cas
    }

    pub def reuseMechanismName(mechanism: ReuseMechanism): String = match mechanism {
        case ReuseMechanism.NativeMemo  => "native-in-memory-memo"
        case ReuseMechanism.ActionCache => "action-cache"
        case ReuseMechanism.RemoteDedup => "remote-execution-dedup"
        case ReuseMechanism.Cas         => "content-addressed-store"
    }

    /// Whether one mechanism is genuinely persistent across actions. Only a
    /// durable mechanism may be counted as a source/facts reuse.
    pub def crossActionReuse(mechanism: ReuseMechanism): Bool = match mechanism {
        case ReuseMechanism.NativeMemo => false
        case _                         => true
    }

    /// The declared bounded-assisted-context descriptor cap: the existing theory
    /// owner's own declared candidate bound, so the assisted context reuses the
    /// one bounded descriptor population rather than a second registry.
    pub def assistedContextDescriptorCap(): Int32 = Theory.maxCandidates()

    /// The declared bounded-assisted-context fan-out cap: the existing theory
    /// owner's own declared world-shard bound. The witness rows are that owner's
    /// own derived join result over one world's facts, so the declared bound is
    /// the descriptor population and the shard fan-out, never a second row cap.
    pub def assistedContextShardCap(): Int32 = Theory.maxShards()

    /// The declared bounded assisted context of one task: the candidate
    /// population, the descriptor population, the shard fan-out and the scoped
    /// witness rows, all bounded by the existing theory owner's declared caps.
    /// The bound is a declared refusal, not a silent truncation: an over-bound
    /// population keeps its declared count and reports the bound.
    pub type alias AssistedContext = {
        candidates  = List[String],
        descriptors = Int32,
        shards      = Int32,
        witnesses   = Int32,
        bounded     = Bool
    }

    pub def assistedContextIsBounded(context: AssistedContext): Bool =
        context#descriptors <= assistedContextDescriptorCap()
            and context#shards <= assistedContextShardCap()

    /// The declared context bundle of one exact world pair's public scoped
    /// relations and witnesses, as canonical rows. It is the one statement the
    /// assisted-context consumers read; it restates nothing.
    pub def contextRow(kind: String, task: String, values: List[String]): List[String] =
        List#{"context", kind, task} ::: values

    // ------------------------------------------------------- JEV public context

    /// The declared route identity of the ReviewBench JEV acquisition: the native
    /// Java OpenRouter Decisions boundary. It is never the MCP-stdio route and
    /// never a hosted chat completion.
    pub def jevRouteIdentity(): String = "native-java-openrouter-decisions-no-mcp"

    /// The declared endpoint of the ReviewBench JEV acquisition: the SAME endpoint
    /// the historical localization route spoke.
    pub def jevEndpoint(): String = "https://openrouter.ai/api/alpha/decisions"

    /// The original requested model alias of the JEV route, preserved verbatim.
    /// It is never renamed, never substituted and never replaced by an
    /// "equivalent" model: the requested identity is part of the receipt.
    pub def jevRequestedModel(): String = "typesafe/jev-1.13"

    /// The localization-observed provider echo the native receipt must match.
    /// Any other provider is Failed evidence, never a scored decision.
    pub def jevProviderIdentity(): String = "TypeSafe"

    /// The localization-observed resolved snapshot the native receipt must match.
    /// Explicit dated-snapshot request support is UNVERIFIED, so the gate is an
    /// observation check, not a guarantee that the alias resolves to it.
    pub def jevResolvedSnapshot(): String = "typesafe/jev-1.13-20260917"

    /// The frozen prompt identity of the approved assisted (structure) JEV
    /// context. The control field vocabulary exists as the frozen field law, but
    /// no separate control ablation is required or built beyond this approved
    /// assisted context.
    pub def jevPromptIdentity(): String = "reviewbench-assisted-context-jev-v1"

    /// The declared condition name of the approved assisted context.
    pub def jevAssistedCondition(): String = "A-structure"

    /// The declared bounded-issue prefix of one JEV state: the deterministic
    /// public-issue prefix both conditions carry. It is a public-input bound, not
    /// prompt tuning.
    pub def jevIssuePrefixChars(): Int32 = 2000

    /// The frozen criteria mapping every choice question carries.
    pub def jevCriteria(): List[(String, String)] =
        ("Relevant", "must be modified") :: ("NotRelevant", "must not be modified")
            :: ("Unknown", "insufficient information") :: Nil

    /// The declared answer kind of every choice question.
    pub def jevAnswerKind(): String = "choice"

    /// The frozen rule of the assisted condition: the materialized relationships
    /// and witnesses are evidence that code refers to the file, never proof that
    /// the file must be modified.
    pub def jevStructureRule(): String =
        "Decide whether the candidate source file must be modified to fix this bug report. "
            + "Use only the bug report text and the candidate file path. The listed repository "
            + "relationships and theory witnesses show that code refers to this file; they are "
            + "relationships, not proof that the file must be modified."

    /// The declared typed outcome of one logical JEV decision. `Failed` carries the
    /// observable failure kind; it is never mapped to a negative or to `Unknown`.
    pub enum JevDecision with Eq, ToString {
        case Relevant
        case NotRelevant
        case Unknown
        case Failed(String)
    }

    pub def jevDecisionName(decision: JevDecision): String = match decision {
        case JevDecision.Relevant     => "Relevant"
        case JevDecision.NotRelevant  => "NotRelevant"
        case JevDecision.Unknown      => "Unknown"
        case JevDecision.Failed(kind) => "Failed:" + kind
    }

    /// Whether one typed decision promotes its candidate. Only `Relevant` does.
    pub def jevDecisionPromotes(decision: JevDecision): Bool =
        decision == JevDecision.Relevant

    /// The declared typed outcome of one sanitized receipt row. A recorded
    /// `Failed:<kind>` keeps its kind; any unrecognised token is a typed `Failed`
    /// rather than a guessed decision.
    pub def parseJevDecision(text: String): JevDecision = match text {
        case "Relevant"    => JevDecision.Relevant
        case "NotRelevant" => JevDecision.NotRelevant
        case "Unknown"     => JevDecision.Unknown
        case other         => if (String.startsWith(prefix = "Failed:", other))
            JevDecision.Failed(String.drop(String.length("Failed:"), other))
        else JevDecision.Failed(other)
    }

    /// The fail-closed classification of one native JEV answer. The provider echo
    /// and the resolved snapshot must match the localization-observed identity
    /// exactly; any other observation is Failed evidence, never a scored decision,
    /// and is never silently accepted or re-requested until a desired answer.
    pub def jevClassify(provider: String, resolved: String, answerKind: String, answer: String): JevDecision =
        if (provider != jevProviderIdentity()) JevDecision.Failed("provider-mismatch:" + provider)
        else if (resolved != jevResolvedSnapshot()) JevDecision.Failed("snapshot-mismatch:" + resolved)
        else if (answerKind != jevAnswerKind()) JevDecision.Failed("answer-kind:" + answerKind)
        else match answer {
            case "Relevant"    => JevDecision.Relevant
            case "NotRelevant" => JevDecision.NotRelevant
            case "Unknown"     => JevDecision.Unknown
            case other         => JevDecision.Failed("choice:" + other)
        }

    /// The exact JSON string literal of one declared text. The payload bytes are
    /// the memo identity, so the escape vocabulary is fixed and never tuned.
    pub def jsonQuote(text: String): String = "\"" + jsonEscape(String.toList(text), "") + "\""

    def jsonEscape(chars: List[Char], acc: String): String = match chars {
        case Nil => acc
        case c :: rest =>
            jsonEscape(rest, acc + jsonChar(c))
    }

    def jsonChar(c: Char): String =
        if (c == '"') "\\\""
        else if (c == '\\') "\\\\"
        else if (c == '\n') "\\n"
        else if (c == '\r') "\\r"
        else if (c == '\t') "\\t"
        else match List.find(entry -> match entry { case (ch, _) => ch == c }, controlEscapes()) {
            case Some((_, escaped)) => escaped
            case None               => "${c}"
        }

    /// The declared escape of every remaining control code point below 0x20 that
    /// is not one of the five JSON shorthands: its canonical `\u00XX` form, so a
    /// control character in a public issue can never produce invalid JSON or be
    /// silently dropped.
    def controlEscapes(): List[(Char, String)] =
        ('\u0000', "\\u0000") :: ('\u0001', "\\u0001") :: ('\u0002', "\\u0002") :: ('\u0003', "\\u0003")
            :: ('\u0004', "\\u0004") :: ('\u0005', "\\u0005") :: ('\u0006', "\\u0006") :: ('\u0007', "\\u0007")
            :: ('\u0008', "\\u0008") :: ('\u000b', "\\u000b") :: ('\u000c', "\\u000c")
            :: ('\u000e', "\\u000e") :: ('\u000f', "\\u000f") :: ('\u0010', "\\u0010") :: ('\u0011', "\\u0011")
            :: ('\u0012', "\\u0012") :: ('\u0013', "\\u0013") :: ('\u0014', "\\u0014") :: ('\u0015', "\\u0015")
            :: ('\u0016', "\\u0016") :: ('\u0017', "\\u0017") :: ('\u0018', "\\u0018") :: ('\u0019', "\\u0019")
            :: ('\u001a', "\\u001a") :: ('\u001b', "\\u001b") :: ('\u001c', "\\u001c") :: ('\u001d', "\\u001d")
            :: ('\u001e', "\\u001e") :: ('\u001f', "\\u001f") :: Nil

    /// The declared criteria object of every choice question.
    pub def jevCriteriaJson(): String =
        "{" + List.join(",", List.map(entry -> match entry {
            case (name, description) => jsonQuote(name) + ":" + jsonQuote(description)
        }, jevCriteria())) + "}"

    /// The declared state of one task's JEV context: the public task identity, the
    /// deterministic public-issue prefix and the frozen rule.
    pub def jevStateJson(task: String, issue: String, rule: String): String =
        "{\"task\":" + jsonQuote(task) + ",\"bug_report\":" + jsonQuote(issue)
            + ",\"rule\":" + jsonQuote(rule) + "}"

    /// The declared question object of one candidate.
    pub def jevQuestionJson(instruction: String): String =
        "{\"type\":" + jsonQuote(jevAnswerKind()) + ",\"instructions\":" + jsonQuote(instruction)
            + ",\"criteria\":" + jevCriteriaJson() + "}"

    /// The exact Decisions payload of one task's assisted context: the requested
    /// alias, the shared state and one choice question per candidate. The field
    /// order is fixed because the payload bytes are the memo identity.
    pub def jevPayloadJson(task: String, issue: String, rule: String, questions: List[(String, String)]): String =
        "{\"model\":" + jsonQuote(jevRequestedModel()) + ",\"state\":" + jevStateJson(task, issue, rule)
            + ",\"questions\":{" + List.join(",", List.map(entry -> match entry {
                case (key, instruction) => jsonQuote(key) + ":" + jevQuestionJson(instruction)
            }, questions)) + "}}"

    /// The declared control instruction of one candidate: the candidate path and
    /// its rank, score and bounded public anchor only.
    pub def jevControlInstruction(path: String, rank: Int32, score: String, anchor: String): String =
        "Candidate file path: " + path + " (rank " + Int32.toString(rank) + ", score " + score
            + ", anchor " + anchor + ")"

    /// The declared structure instruction: the exact control instruction plus the
    /// already-materialized candidate Repository relations and Theory witnesses.
    pub def jevStructureInstruction(path: String, rank: Int32, score: String, anchor: String, relations: String, witnesses: String): String =
        jevControlInstruction(path, rank, score, anchor)
            + "\nRepository relations: " + relations
            + "\nTheory witnesses: " + witnesses

    /// The declared bounded anchor of one candidate: its final path segment
    /// without its extension. It is a public token derived from the candidate path
    /// itself, never a new analysis.
    pub def candidateAnchor(path: String): String = {
        let segment = match List.reverse(String.split(regex = "/", path)) {
            case last :: _ => last
            case Nil       => path
        };
        match List.reverse(String.split(regex = "\\.", segment)) {
            case _ :: rest if not List.isEmpty(rest) => List.join(".", List.reverse(rest))
            case _                                   => segment
        }
    }

    /// The declared bounded relation summary of one candidate: the atom names of
    /// the world's facts whose source or target is the candidate path, each with
    /// the number of facts that touch it, in atom-name order. It restates the
    /// already-materialized facts and performs no new analysis.
    pub def relationSummary(candidate: String, facts: List[(String, String, String)]): List[(String, Int32)] =
        List.map(atom -> (atom, List.length(List.filter(row -> match row {
            case (name, source, target) => name == atom and (source == candidate or target == candidate)
        }, facts))), List.distinct(List.sort(List.map(row -> match row { case (name, _, _) => name }, facts))))

    /// The declared relation text of one candidate: `atom=count` pairs, or `none`
    /// when the candidate touches no materialized fact.
    pub def relationText(candidate: String, facts: List[(String, String, String)]): String =
        match List.filter(entry -> match entry { case (_, count) => count > 0 },
            relationSummary(candidate, facts)) {
            case Nil => "none"
            case kept => List.join("; ", List.map(entry -> match entry {
                case (atom, count) => atom + "=" + Int32.toString(count)
            }, kept))
        }

    /// The declared bounded witness text of one task's materialized context: the
    /// distinct Theory witness identifiers of the world, capped at the declared
    /// bound, or `none`. A Theory witness names a structural projection row, not a
    /// file's relevance, so it is presented as the bounded public identifier list
    /// the localization structure condition carried — never as evidence that a
    /// candidate file must be modified.
    pub def witnessText(witnesses: List[(String, String, String)]): String =
        match List.take(jevWitnessCap(),
            List.sort(List.distinct(List.map(row -> match row { case (id, _, _) => id }, witnesses)))) {
            case Nil  => "none"
            case kept => List.join(", ", kept)
        }

    /// The declared question key of one candidate: its 1-based declared position in
    /// the task's ranking. The key is the payload's question identity, so the
    /// observed answer is joined back to the exact candidate it was asked about.
    pub def jevQuestionKey(index: Int32): String = "c" + Int32.toString(index)

    /// The declared cap on the witness pairs one JEV instruction names: a bounded
    /// presentation of already-materialized witnesses, not a new analysis.
    pub def jevWitnessCap(): Int32 = 8

    /// The declared deterministic public-issue prefix of one task: the first
    /// declared number of characters of the public issue text.
    pub def issuePrefix(text: String): String = String.take(jevIssuePrefixChars(), text)

    /// The declared public issue text of one task: its pinned title and body,
    /// separated by one blank line. It carries no finding, no gold and no later
    /// fix.
    pub def publicIssue(title: String, body: String): String = (title + "\n\n" + body).trim()

    /// The exact frozen prompt template bytes of the assisted condition. It is
    /// fixed before any outcome and its SHA-256 is the prompt component of the
    /// memo key, so a prompt edit regenerates only that prompt's JEV fixtures.
    pub def jevPromptText(): String =
        "FROZEN REVIEWBENCH JEV REQUEST — " + jevPromptIdentity() + "\n"
            + "condition: " + jevAssistedCondition() + "\n"
            + "requested model: " + jevRequestedModel() + "\n"
            + "rule: " + jevStructureRule() + "\n"
            + "issue prefix characters: " + Int32.toString(jevIssuePrefixChars()) + "\n"
            + "outcomes: " + List.join(" | ",
                List.map(entry -> match entry { case (name, _) => name }, jevCriteria())) + "\n"
            + "criteria: " + jevCriteriaJson() + "\n"

    /// The declared memo identity of one JEV context (the exact model, prompt
    /// identity, condition, task, candidate and payload hash). Reuse happens only
    /// on exact payload equality, so a changed payload is a different context and
    /// a successful exact decision is never requested twice.
    pub def jevDecisionMemoKey(prompt: String, task: String, candidate: String, payloadHash: String): String =
        jevMemoKey(jevRequestedModel(), prompt, jevAssistedCondition(), task, candidate, payloadHash)

    /// The declared frozen JEV public-context record as canonical rows: the native
    /// route and endpoint, the requested and observed identity, the frozen prompt
    /// and condition, the public field vocabulary, the exclusion vocabulary and the
    /// exact memo shape. It is one statement; a receipt restates nothing.
    pub def renderJevContext(): List[List[String]] =
        List#{
            List#{"jev", "route", jevRouteIdentity()},
            List#{"jev", "endpoint", jevEndpoint()},
            List#{"jev", "requested_model", jevRequestedModel()},
            List#{"jev", "provider", jevProviderIdentity()},
            List#{"jev", "resolved_snapshot", jevResolvedSnapshot()},
            List#{"jev", "prompt", jevPromptIdentity()},
            List#{"jev", "condition", jevAssistedCondition()},
            List#{"jev", "control_fields", List.join(",", jevControlFields())},
            List#{"jev", "structure_fields", List.join(",", jevStructureFields())},
            List#{"jev", "excludes", List.join(",", jevContextExcludes())},
            List#{"jev", "answer_kind", jevAnswerKind()},
            List#{"jev", "outcomes", List.join(",",
                List.map(entry -> match entry { case (name, _) => name }, jevCriteria()))},
            List#{"jev", "issue_prefix_chars", Int32.toString(jevIssuePrefixChars())},
            List#{"jev", "witness_cap", Int32.toString(jevWitnessCap())},
            List#{"jev", "memo", "model,prompt,condition,task,candidate,payload_sha256"}
        }
}

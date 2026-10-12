use Attune.Study.ReviewBench
use Fs.FileRead

/// The corpus-bound ReviewBench shared-context audit (`VAL-REVIEW-002`).
///
/// It audits the trees the context graph actually materialized: every exact
/// world's retained structural status, every admitted task's bounded context and
/// the one aggregate context record. It reads only produced trees, so the audit
/// is a provider-free replay — no world download, no Grit extraction and no
/// provider call. It decides no science: it checks the declared contract of the
/// materialized records, including that no materialized record carries a finding
/// or a gold field and that the world identity and the task identity agree.
///
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

def baseName(path: String): String =
    match List.reverse(String.split(regex = "/", path)) {
        case last :: _ => last
        case Nil       => path
    }

/// Every produced tree root recorded by the launcher, as `name -> root path`.
def producedRoots(): List[(String, String)] \ IO =
    List.filterMap(line -> match fields(line) {
        case "root" :: path :: _ => Some((baseName(path), path))
        case _                   => None
    }, records(readText("attune-produced.tsv")))

def rootsPrefixed(prefix: String): List[(String, String)] \ IO =
    List.filter(entry -> match entry { case (name, _) => String.startsWith(prefix = prefix, name) }, producedRoots())

/// The records of one produced tree's declared file, as parsed rows.
def treeRows(name: String, file: String): List[List[String]] \ IO =
    match List.find(entry -> match entry { case (target, _) => target == name }, producedRoots()) {
        case Some((_, root)) => List.map(fields, records(readText(root + "/" + file)))
        case None            => Nil
    }

/// Every declared world status record of the materialized graph.
def worldStatuses(): List[List[String]] \ IO =
    List.flatMap(entry -> match entry { case (_, root) => List.map(fields, records(readText(root + "/status.tsv"))) },
        rootsPrefixed("world_facts_"))

/// Every declared task context record of the materialized graph.
def taskContexts(): List[List[String]] \ IO =
    List.flatMap(entry -> match entry { case (_, root) => List.map(fields, records(readText(root + "/context.tsv"))) },
        rootsPrefixed("task_context_"))

@Test
def theMaterializedSharedContextKeepsEveryDeclaredWorldContract(): Unit \ {Assert, IO} = {
    let statuses = worldStatuses();
    let contexts = taskContexts();
    // The frozen admission is ten admitted tasks over twenty exact worlds: one
    // base and one head world each.
    Assert.assertEq(expected = 20, List.length(statuses));
    Assert.assertEq(expected = 10, List.length(contexts));
    Assert.assertEq(expected = true, List.forAll(row -> List.memberOf(field(row, 18),
        List#{"complete", "UNKNOWN"}), statuses));
    // The world identity and the task identity agree: `WorldId` is exactly the
    // task key plus the declared role.
    Assert.assertEq(expected = true, List.forAll(row ->
        field(row, 1) == field(row, 2) + "-" + field(row, 4), statuses));
    // Every retained status record states the frozen scope and the declared
    // out-of-process deadline, and its structural decomposition sums to the
    // measured population it reports.
    Assert.assertEq(expected = true, List.forAll(row ->
        field(row, 20) == ReviewBench.structuralScopeIdentity()
            and intOf(field(row, 21)) == ReviewBench.extractionUnitSeconds()
            and intOf(field(row, 22)) == ReviewBench.worldDeadlineSeconds()
            and field(row, 23) == ReviewBench.deadlineEnforcement(), statuses));
    Assert.assertEq(expected = true, List.forAll(row ->
        intOf(field(row, 5)) == intOf(field(row, 7)) + intOf(field(row, 9))
            + intOf(field(row, 11)) + intOf(field(row, 12)) + intOf(field(row, 13)), statuses));
    // An over-cap file is recorded as a structural unknown, never truncated: the
    // flag is exactly the recorded over-cap count.
    Assert.assertEq(expected = true, List.forAll(row ->
        field(row, 19) == (if (intOf(field(row, 9)) > 0) "true" else "false"), statuses));
    // Every task context is bounded by the existing theory owner's declared caps
    // and names the frozen structural scope.
    Assert.assertEq(expected = true, List.forAll(row ->
        intOf(field(row, 5)) <= ReviewBench.assistedContextDescriptorCap()
            and intOf(field(row, 6)) <= ReviewBench.assistedContextShardCap()
            and field(row, 8) == "true" and field(row, 9) == "true"
            and field(row, 10) == ReviewBench.structuralScopeIdentity(), contexts));
    // A materialized record never carries a finding or a gold field.
    let names = List.map(row -> field(row, 0), statuses) ::: List.map(row -> field(row, 0), contexts);
    Assert.assertEq(expected = true, List.forAll(name -> not List.memberOf(String.toLowerCase(name),
        ReviewBench.forbiddenContextFields()), names))
}

/// The declared materialized JEV public-context record of the native route.
def jevContextRows(): List[List[String]] \ IO =
    treeRows("reviewbench_context_jev_context", "jev-context.tsv")

/// The declared aggregate summary of the materialized JEV context.
def jevSummaryRows(): List[List[String]] \ IO =
    treeRows("reviewbench_context_jev_context", "summary.tsv")

def jevSummaryValue(key: String): Int32 \ IO =
    match List.find(row -> field(row, 0) == "jev" and field(row, 1) == key, jevSummaryRows()) {
        case Some(row) => intOf(field(row, 2))
        case None      => -1
    }

@Test
def theMaterializedJevContextIsTheNativeRouteWithNoFindingsAndNoGold(): Unit \ {Assert, IO} = {
    let rows = jevContextRows();
    let value = key -> match List.find(row -> field(row, 0) == "jev" and field(row, 1) == key, rows) {
        case Some(row) => field(row, 2)
        case None      => ""
    };
    // The frozen route identity is the native boundary, the original requested
    // alias and the localization-observed provider/snapshot the gate compares.
    Assert.assertEq(expected = ReviewBench.jevRouteIdentity(), value("route"));
    Assert.assertEq(expected = ReviewBench.jevEndpoint(), value("endpoint"));
    Assert.assertEq(expected = ReviewBench.jevRequestedModel(), value("requested_model"));
    Assert.assertEq(expected = ReviewBench.jevProviderIdentity(), value("provider"));
    Assert.assertEq(expected = ReviewBench.jevResolvedSnapshot(), value("resolved_snapshot"));
    Assert.assertEq(expected = ReviewBench.jevPromptIdentity(), value("prompt"));
    Assert.assertEq(expected = ReviewBench.jevAssistedCondition(), value("condition"));
    Assert.assertEq(expected = ReviewBench.jevAnswerKind(), value("answer_kind"));
    // The record names no finding and no gold field.
    Assert.assertEq(expected = true, List.forAll(row ->
        not List.memberOf(String.toLowerCase(field(row, 1)), ReviewBench.forbiddenContextFields()), rows));

    let decisions = List.filter(row -> field(row, 0) == "decision", rows);
    Assert.assertEq(expected = true, not List.isEmpty(decisions));
    // Every observed decision carries the localization-observed provider echo and
    // resolved snapshot, so the fail-closed gate never had to reject one, and every
    // outcome is a typed decision or an explicitly named failure.
    Assert.assertEq(expected = true, List.forAll(row ->
        field(row, 7) == ReviewBench.jevProviderIdentity()
            and field(row, 8) == ReviewBench.jevResolvedSnapshot(), decisions));
    Assert.assertEq(expected = true, List.forAll(row ->
        List.memberOf(field(row, 5), List#{"Relevant", "NotRelevant", "Unknown"})
            or String.startsWith(prefix = "Failed:", field(row, 5)), decisions));
    // The memo identity of every decision is the declared exact key, so no
    // candidate was answered outside the frozen memo.
    Assert.assertEq(expected = true, List.forAll(row ->
        not String.isEmpty(field(row, 4))
            and String.contains(substr = field(row, 1), field(row, 4))
            and String.contains(substr = field(row, 2), field(row, 4)), decisions));

    // The summary is the reduction of those rows, and the context stage itself
    // made no provider call: it is the provider-free replay of the frozen memo.
    Assert.assertEq(expected = List.length(decisions), jevSummaryValue("logical_decisions"));
    Assert.assertEq(expected = List.length(List.filter(row -> field(row, 5) == "Relevant", decisions)),
        jevSummaryValue("relevant"));
    Assert.assertEq(expected = List.length(List.filter(row -> field(row, 5) == "Unknown", decisions)),
        jevSummaryValue("unknown"));
    Assert.assertEq(expected = List.length(List.filter(row ->
        String.startsWith(prefix = "Failed:", field(row, 5)), decisions)), jevSummaryValue("failed"));
    Assert.assertEq(expected = 0, jevSummaryValue("context_provider_calls"));
    Assert.assertEq(expected = List.length(List.distinct(List.map(row -> field(row, 1), decisions))),
        jevSummaryValue("tasks"))
}

@Test
def theAggregateContextRecordIsAProviderFreeReplayOfTheFrozenContext(): Unit \ {Assert, IO} = {
    let rows = treeRows("reviewbench_context", "shared-context.tsv");
    let value = key -> match List.find(row -> field(row, 1) == key, rows) {
        case Some(row) => field(row, 2)
        case None      => ""
    };
    // The aggregate record names the frozen scope and the exact population it
    // reduced, and it states that the reduction itself performed no acquisition.
    Assert.assertEq(expected = ReviewBench.structuralScopeIdentity(), value("scope"));
    Assert.assertEq(expected = "20", value("worlds"));
    Assert.assertEq(expected = "10", value("tasks"));
    Assert.assertEq(expected = "0", value("context_provider_calls"));
    Assert.assertEq(expected = "0", value("context_world_downloads"));
    Assert.assertEq(expected = "0", value("context_extractions"));
    // The rendered frozen policy record travels with the materialized context and
    // still names the declared provider, model, batch boundary and exclusions.
    Assert.assertEq(expected = "openrouter",
        match List.find(row -> field(row, 1) == "provider", rows) {
            case Some(row) => field(row, 2)
            case None      => ""
        });
    Assert.assertEq(expected = "32",
        match List.find(row -> field(row, 1) == "batch_inputs", rows) {
            case Some(row) => field(row, 2)
            case None      => ""
        })
}

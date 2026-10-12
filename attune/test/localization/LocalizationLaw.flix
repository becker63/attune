use Attune.Theory
use Attune.Study

/// Corpus-free laws for the declared localization arms, prior, anchors, ranking,
/// policy selection and freeze (`VAL-LOC-002`).
///
/// These laws drive the exact production functions the real external localization
/// graph runs. They need no corpus and no world: they assert the separation, the
/// determinism, the completeness and the freeze order over declared values, so a
/// broken arm, a lost tie rule, a dropped candidate or a relabelled arm fails
/// here rather than passing as a real external measurement.

// ------------------------------------------------------------- arm separation

@Test
def theFourArmsAreOneContainmentChainOfRealInputSets(): Unit \ Assert = {
    Assert.assertEq(expected = true, Study.localizationArmLaws());
    Assert.assertEq(expected = 4, List.length(Study.localizationArms()));
    Assert.assertEq(expected = "P", Study.localizationArmName(Study.LocalizationArm.Prior));
    Assert.assertEq(expected = "P+A", Study.localizationArmName(Study.LocalizationArm.Anchors));
    Assert.assertEq(expected = "P+A+F", Study.localizationArmName(Study.LocalizationArm.Facts));
    Assert.assertEq(expected = "P+A+D", Study.localizationArmName(Study.LocalizationArm.Descriptors));
    // Each arm adds exactly one evidence family, so no two arms share an input set.
    Assert.assertEq(expected = 4, List.length(List.distinct(List.map(arm -> Study.localizationInputs(arm), Study.localizationArms()))));
    // The prior arm reads no structural evidence at all.
    Assert.assertEq(expected = false, Study.localizationCanRead(Study.LocalizationArm.Prior, Study.LocalizationFact.AnchorEvidence));
    Assert.assertEq(expected = false, Study.localizationCanRead(Study.LocalizationArm.Prior, Study.LocalizationFact.RepositoryFacts));
    Assert.assertEq(expected = false, Study.localizationCanRead(Study.LocalizationArm.Prior, Study.LocalizationFact.TheoryWitnesses));
    // The descriptor arm is the only arm that may read theory witnesses.
    Assert.assertEq(expected = 1, List.length(List.filter(arm -> Study.localizationCanRead(arm, Study.LocalizationFact.TheoryWitnesses), Study.localizationArms())))
}

@Test
def noArmVocabularyCarriesAnEvaluatorFamily(): Unit \ Assert = {
    let names = List.map(fact -> Study.localizationFactName(fact), Study.localizationInputs(Study.LocalizationArm.Descriptors));
    Assert.assertEq(expected = 0, List.length(List.filter(name -> List.memberOf(name, Study.localizationForbiddenKeys()), names)));
    Assert.assertEq(expected = false, List.isEmpty(Study.localizationForbiddenKeys()))
}

// ------------------------------------------------------------------ the prior

@Test
def theLexicalPriorIsDeterministicAndTokenBased(): Unit \ Assert = {
    let tokens = Study.lexicalTokens("Fix the Indent rule when linting, indent.js");
    Assert.assertEq(expected = true, List.memberOf("indent", tokens));
    Assert.assertEq(expected = true, List.memberOf("linting", tokens));
    // A run shorter than the declared minimum length is not a token.
    Assert.assertEq(expected = false, List.memberOf("js", tokens));
    Assert.assertEq(expected = Study.lexicalTokens("Fix the Indent rule when linting, indent.js"), tokens);
    // A candidate path that carries two of the issue's tokens scores higher than
    // one that carries none, and the score is a pure function of the two inputs.
    let high = Study.lexicalPriorScore(tokens, "lib/rules/indent.js");
    let low = Study.lexicalPriorScore(tokens, "docs/readme.md");
    Assert.assertEq(expected = true, high > low);
    Assert.assertEq(expected = high, Study.lexicalPriorScore(tokens, "lib/rules/indent.js"))
}

// ---------------------------------------------------------------- the anchors

@Test
def anAnchorIsEarnedOnlyFromUnambiguousDeclaredEvidence(): Unit \ Assert = {
    let files = "lib/rules/indent.js" :: "lib/cli.js" :: Nil;
    // An exact declared symbol name is one honest anchor.
    let exact = Study.issueAnchors("indent" :: Nil, "lib/cli.js" :: Nil, "indent" :: Nil, "anchors-exact-name-v1");
    Assert.assertEq(expected = 1, List.length(exact#anchors));
    Assert.assertEq(expected = "symbol:indent", match List.head(exact#anchors) {
        case Some((_, entity)) => entity
        case None              => ""
    });
    // A basename stem that names exactly one declared file is one honest anchor.
    let fileAnchor = Study.issueAnchors("cli" :: Nil, files, Nil, "anchors-exact-name-v1");
    Assert.assertEq(expected = 1, List.length(fileAnchor#anchors));
    Assert.assertEq(expected = "file:lib/cli.js", match List.head(fileAnchor#anchors) {
        case Some((_, entity)) => entity
        case None              => ""
    });
    // An issue token that names no declared entity contributes nothing.
    Assert.assertEq(expected = 0, List.length(Study.issueAnchors("unrelated" :: Nil, files, Nil, "anchors-exact-name-v1")#anchors));
    // A token that names more than one declared entity is ambiguous: it is
    // recorded ambiguous and contributes no anchor, so no anchor is invented.
    let ambiguous = Study.issueAnchors("cli" :: Nil, files, "cli" :: Nil, "anchors-exact-name-v1");
    Assert.assertEq(expected = 0, List.length(ambiguous#anchors));
    Assert.assertEq(expected = 1, List.length(ambiguous#ambiguous));
    // The two declared policies are genuinely different operations: the segment
    // policy also accepts a symbol's final dotted segment, and it is still an
    // exact case-sensitive match.
    Assert.assertEq(expected = 0, List.length(Study.issueAnchors("indent" :: Nil, "lib/cli.js" :: Nil, "rules.indent" :: Nil, "anchors-exact-name-v1")#anchors));
    Assert.assertEq(expected = 1, List.length(Study.issueAnchors("indent" :: Nil, "lib/cli.js" :: Nil, "rules.indent" :: Nil, "anchors-path-segment-v1")#anchors));
    Assert.assertEq(expected = 0, List.length(Study.issueAnchors("indent" :: Nil, "lib/cli.js" :: Nil, "rules.Indent" :: Nil, "anchors-path-segment-v1")#anchors));
    Assert.assertEq(expected = 2, List.length(Study.localizationPolicies()))
}

// ------------------------------------------------------- distinct arm ranking

def evidence(): Study.LocalizationEvidence =
    {
        issueTokens = "indent" :: "rule" :: Nil,
        candidates = "lib/rules/indent.js" :: "lib/cli.js" :: "lib/other.js" :: Nil,
        anchors = ("indent", "symbol:indent") :: ("rules", "file:lib/rules/indent.js") :: Nil,
        defines = ("lib/rules/indent.js", "indent") :: Nil,
        imports = ("lib/cli.js", "lib/rules/indent.js") :: Nil,
        witnesses = ("t1", "file:lib/other.js", "symbol:indent") :: Nil
    }

@Test
def theFourArmsRankByGenuinelyDifferentOperations(): Unit \ Assert = {
    let scores = List.map(arm -> Study.armScore(arm, evidence(), "lib/other.js"), Study.localizationArms());
    // `lib/other.js` carries no issue token, no anchor and no fact adjacency, but
    // it does participate in a materialized theory witness: only the descriptor
    // arm can see it.
    Assert.assertEq(expected = true, List.length(List.distinct(scores)) > 1);
    Assert.assertEq(expected = 0, Study.armScore(Study.LocalizationArm.Prior, evidence(), "lib/other.js"));
    Assert.assertEq(expected = 0, Study.armScore(Study.LocalizationArm.Anchors, evidence(), "lib/other.js"));
    Assert.assertEq(expected = 0, Study.armScore(Study.LocalizationArm.Facts, evidence(), "lib/other.js"));
    Assert.assertEq(expected = 1, Study.armScore(Study.LocalizationArm.Descriptors, evidence(), "lib/other.js"));
    // The fact arm is the only one that sees the import adjacency.
    Assert.assertEq(expected = 1, Study.armScore(Study.LocalizationArm.Facts, evidence(), "lib/cli.js"));
    Assert.assertEq(expected = 0, Study.armScore(Study.LocalizationArm.Anchors, evidence(), "lib/cli.js"));
    // The anchor arm is the only one that sees the defining file.
    Assert.assertEq(expected = true, Study.armScore(Study.LocalizationArm.Anchors, evidence(), "lib/rules/indent.js") > 0)
}

@Test
def everyArmRanksTheCompleteCandidatePopulation(): Unit \ Assert = {
    let ranking = Study.rankUnderArm(Study.LocalizationArm.Descriptors, evidence());
    Assert.assertEq(expected = 3, List.length(ranking));
    Assert.assertEq(expected = 3, List.length(List.distinct(List.map(entry -> match entry { case (_, path, _) => path }, ranking))));
    Assert.assertEq(expected = 1 :: 2 :: 3 :: Nil, List.map(entry -> match entry { case (rank, _, _) => rank }, ranking));
    // The declared tie rule: descending score, ascending path, no other key.
    let tied = Study.rankUnderArm(Study.LocalizationArm.Prior, { issueTokens = Nil, candidates = "b.js" :: "a.js" :: Nil, anchors = Nil, defines = Nil, imports = Nil, witnesses = Nil });
    Assert.assertEq(expected = "a.js" :: "b.js" :: Nil, List.map(entry -> match entry { case (_, path, _) => path }, tied));
    // Determinism: the same inputs produce byte-equal ranking rows.
    Assert.assertEq(expected = Study.rankingRows("t", Study.LocalizationArm.Descriptors, "p", ranking),
        Study.rankingRows("t", Study.LocalizationArm.Descriptors, "p", Study.rankUnderArm(Study.LocalizationArm.Descriptors, evidence())))
}

@Test
def topContainsUsesTheDeclaredRankBound(): Unit \ Assert = {
    let ranking = Study.rankUnderArm(Study.LocalizationArm.Descriptors, evidence());
    Assert.assertEq(expected = true, Study.topContains(ranking, "lib/rules/indent.js" :: Nil, 1));
    Assert.assertEq(expected = false, Study.topContains(ranking, "lib/other.js" :: Nil, 1));
    Assert.assertEq(expected = true, Study.topContains(ranking, "lib/other.js" :: Nil, 3));
    Assert.assertEq(expected = false, Study.topContains(ranking, "absent.js" :: Nil, 10))
}

// ---------------------------------------------------------- policy selection

@Test
def atMostOnePolicyIsSelectedAndOnlyFromDevelopmentEvidence(): Unit \ Assert = {
    // A tie is resolved by the declared policy order, never by an outcome.
    Assert.assertEq(expected = Some("anchors-exact-name-v1"),
        Study.selectPolicy(("anchors-exact-name-v1", 3) :: ("anchors-path-segment-v1", 3) :: Nil));
    Assert.assertEq(expected = Some("anchors-path-segment-v1"),
        Study.selectPolicy(("anchors-exact-name-v1", 2) :: ("anchors-path-segment-v1", 3) :: Nil));
    // Nothing observed stays nothing rather than a guessed default.
    Assert.assertEq(expected = None, Study.selectPolicy(Nil));
    let freeze = Study.localizationFreezeRows("anchors-exact-name-v1");
    Assert.assertEq(expected = true, List.exists(row -> row == ("freeze" :: "policy-selected" :: "anchors-exact-name-v1" :: "" :: "" :: Nil), freeze));
    Assert.assertEq(expected = true, List.exists(row -> row == ("freeze" :: "policy-selected-on" :: "development" :: "" :: "" :: Nil), freeze));
    Assert.assertEq(expected = true, List.exists(row -> row == ("freeze" :: "final-labels-consumed" :: "false" :: "" :: "" :: Nil), freeze));
    Assert.assertEq(expected = true, List.exists(row -> row == ("freeze" :: "budget" :: Study.localizationRankingBudget() :: "" :: "" :: Nil), freeze));
    Assert.assertEq(expected = true, List.exists(row -> row == ("freeze" :: "tie" :: Study.localizationTieRule() :: "" :: "" :: Nil), freeze));
    // One freeze record per arm, and exactly one selected-policy record.
    Assert.assertEq(expected = 4, List.length(List.filter(row -> fieldOf(row, 1) == "arm", freeze)));
    Assert.assertEq(expected = 1, List.length(List.filter(row -> fieldOf(row, 1) == "policy-selected", freeze)))
}

def fieldOf(row: List[String], index: Int32): String = match row {
    case value :: rest => if (index == 0) value else fieldOf(rest, index - 1)
    case Nil           => ""
}

// -------------------------------------------------------------- the archives

@Test
def theArchiveManifestCarriesExactlyTheVerifiedExportIdentities(): Unit \ Assert = {
    let rows = List#{
        List#{"export", "w1", "acme/shop", "rev1", "0e0bf9355f892ad74ae98d4e1c404f39fd6654a8e351ee3e6ab162e4a64cd3ad", "10", "2", "1"},
        List#{"file", "w1", "lib/a.js"}
    };
    let exports = Study.parseExportRecords(rows);
    Assert.assertEq(expected = 1, List.length(exports));
    let archives = Study.worldArchives(exports);
    Assert.assertEq(expected = 1, List.length(archives));
    Assert.assertEq(expected = "w1", match List.head(archives) { case Some(archive) => archive#world case None => "" });
    Assert.assertEq(expected = "0e0bf9355f892ad74ae98d4e1c404f39fd6654a8e351ee3e6ab162e4a64cd3ad",
        match List.head(archives) { case Some(archive) => archive#sha256 case None => "" });
    Assert.assertEq(expected = "archive", fieldOf(match List.head(Study.archiveManifestRows(archives)) { case Some(row) => row case None => Nil }, 0));
    Assert.assertEq(expected = 0, List.length(Study.archiveFindings(archives)));
    // An unverified digest is an explicit finding rather than a silent acceptance.
    let bad = List#{{ world = "w1", repo = "acme/shop", revision = "rev1", sha256 = "not-a-digest" }};
    Assert.assertEq(expected = 1, List.length(Study.archiveFindings(bad)))
}

// ---------------------------------------------------------- theory templates

@Test
def theDeclaredTemplateFamilyIsBoundedSafeAndRoundTrips(): Unit \ Assert = {
    let population = Theory.population(Theory.templateCandidates());
    Assert.assertEq(expected = true, not List.isEmpty(population#kept));
    Assert.assertEq(expected = true, List.length(population#kept) <= Theory.maxCandidates());
    Assert.assertEq(expected = true, List.forAll(candidate -> Theory.safe(candidate#descriptor), population#kept));
    Assert.assertEq(expected = List.length(population#kept), List.length(List.distinct(List.map(candidate -> candidate#id, population#kept))));
    // The emitted descriptor records decode back to the same population: a
    // generated population and a decoded one are the same artifact.
    let decoded = List.filterMap(Theory.decodeCandidate, Theory.descriptorRows(population#kept));
    Assert.assertEq(expected = List.map(candidate -> candidate#id, population#kept), List.map(candidate -> candidate#id, decoded));
    Assert.assertEq(expected = List.map(candidate -> Theory.identityKey(candidate#descriptor), population#kept),
        List.map(candidate -> Theory.identityKey(candidate#descriptor), decoded));
    // The declared population is small enough to lower in the declared shards.
    Assert.assertEq(expected = true, List.length(Theory.shards(population)#shards) <= Theory.maxShards())
}

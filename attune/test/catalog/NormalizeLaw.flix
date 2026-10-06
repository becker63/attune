use Attune.Study

/// The corpus-free streaming-normalization laws (`VAL-DATA-002`).
///
/// They drive the exact production functions the stage reduces over the real
/// catalog: the declared public/oracle separation, the record framing and fate
/// classification, the license evidence and the audited denominator identities. A
/// crafted record proves each classified outcome and each firewall finding, so
/// the real run's empty finding set is meaningful rather than vacuous, and the
/// language normalization is pinned rather than assumed.

def framed(repo: String, instanceId: String, language: String, license: String,
           baseCommit: String, createdAt: String, image: String): Study.CatalogRecord =
    Study.CatalogRecord.Framed(List#{repo, instanceId, language, license, baseCommit, createdAt, image})

def fateOf(repo: String, instanceId: String, language: String, license: String,
           baseCommit: String, createdAt: String, image: String): Study.CatalogFate =
    Study.catalogFate(framed(repo, instanceId, language, license, baseCommit, createdAt, image))

def row(repo: String, language: String): Study.CatalogRow =
    { repo = repo, instanceId = "i", language = language, license = "MIT",
      baseCommit = "b", createdAt = "c", image = "m" }

/// The declared public projection is exactly the public vocabulary and touches no
/// declared evaluator column: a clean projection reduces to no finding, a leaked
/// evaluator column is reported by name, a missing public column is reported and
/// a column outside the declaration is reported.
@Test
def thePublicProjectionIsTheDeclaredVocabularyAndTouchesNoEvaluatorColumn(): Unit \ Assert = {
    Assert.assertEq(expected = 0, List.length(Study.catalogSeparationFindings(Study.catalogPublicColumns())));
    let leaked = Study.catalogSeparationFindings(Study.catalogPublicColumns() ::: List#{"patch"});
    Assert.assertEq(expected = 1, List.length(leaked));
    Assert.assertEq(expected = true,
        List.exists(finding -> String.contains(substr = "patch", finding), leaked));
    let missing = Study.catalogSeparationFindings(List#{"repo"});
    Assert.assertEq(expected = List.length(Study.catalogPublicColumns()) - 1, List.length(missing));
    let extra = Study.catalogSeparationFindings(Study.catalogPublicColumns() ::: List#{"unexpected"});
    Assert.assertEq(expected = 1, List.length(extra));
    Assert.assertEq(expected = true,
        List.exists(finding -> String.contains(substr = "unexpected", finding), extra))
}

/// A projected record that cannot be normalized is a classified failure, never a
/// silent drop and never an exclusion: an incomplete row, an undeclared column
/// and an absent language each have their own fault, and the recorded text names
/// it.
@Test
def aProjectedRecordFaultIsAClassifiedFailureNotAnExclusion(): Unit \ Assert = {
    assertFault(Study.CatalogFault.IncompleteRow, Study.catalogFate(Study.CatalogRecord.Framed(Nil)));
    assertFault(Study.CatalogFault.IncompleteRow,
        Study.catalogFate(Study.CatalogRecord.Framed(List#{"owner/repo"})));
    assertFault(Study.CatalogFault.UndeclaredColumn,
        Study.catalogFate(Study.CatalogRecord.Faulted(Study.CatalogFault.UndeclaredColumn)));
    assertFault(Study.CatalogFault.LanguageAbsent, fateOf("owner/repo", "i", "", "MIT", "b", "c", "m"));
    Assert.assertEq(expected = true, String.startsWith(prefix = "failed\tundeclared-column\t",
        Study.catalogFailedText(Study.CatalogFault.UndeclaredColumn)));
    Assert.assertEq(expected = true, String.startsWith(prefix = "failed\tlanguage-absent\t",
        Study.catalogFailedText(Study.CatalogFault.LanguageAbsent)))
}

/// Assert one fate is exactly the classified failure of the declared fault.
def assertFault(expected: Study.CatalogFault, fate: Study.CatalogFate): Unit \ Assert =
    match fate {
        case Study.CatalogFate.Failed(fault) => Assert.assertEq(expected = expected, fault)
        case _                               => Assert.assertEq(expected = "a failed record", "not a failure")
    }

/// A js/ts row is accepted or excluded by its declared requirements, and a row of
/// another primary language is counted as other-language rather than excluded.
/// The exclusion always carries its exact reasons, in declared order, and the
/// language normalization collapses the provider spellings onto the two tokens.
@Test
def aJsTsRowIsAcceptedOrExcludedByItsDeclaredRequirements(): Unit \ Assert = {
    Assert.assertEq(expected = "js", Study.normalizeLanguage(" JavaScript "));
    Assert.assertEq(expected = "ts", Study.normalizeLanguage("TS"));
    Assert.assertEq(expected = "go", Study.normalizeLanguage(" go "));
    Assert.assertEq(expected = true, Study.isJsTs("js"));
    Assert.assertEq(expected = true, Study.isJsTs("ts"));
    Assert.assertEq(expected = false, Study.isJsTs("go"));
    match fateOf("owner/repo", "inst", "JavaScript", "MIT", "base", "when", "image") {
        case Study.CatalogFate.Accepted(accepted) =>
            Assert.assertEq(expected = "js", accepted#language);
            Assert.assertEq(expected = "owner/repo", accepted#repo)
        case _ => Assert.assertEq(expected = "an accepted js row", "not accepted")
    };
    match fateOf("", "inst", "ts", "MIT", "base", "when", "image") {
        case Study.CatalogFate.Excluded(_, reasons) =>
            Assert.assertEq(expected = List#{Study.CatalogExclusion.RepositoryAbsent}, reasons)
        case _ => Assert.assertEq(expected = "an excluded ts row", "not excluded")
    };
    match fateOf("owner/repo", "inst", "ts", "MIT", "", "when", "") {
        case Study.CatalogFate.Excluded(_, reasons) =>
            Assert.assertEq(expected = List#{Study.CatalogExclusion.BaseCommitAbsent,
                Study.CatalogExclusion.ImageAbsent}, reasons)
        case _ => Assert.assertEq(expected = "an excluded ts row", "not excluded")
    };
    match fateOf("owner/repo", "inst", "python", "MIT", "base", "when", "image") {
        case Study.CatalogFate.OtherLanguage(other) => Assert.assertEq(expected = "python", other#language)
        case _                                      => Assert.assertEq(expected = "other-language", "not other-language")
    }
}

/// An absent license is retained as explicitly unavailable, never claimed as a
/// known license, and a repository whose rows disagree is retained as
/// conflicting rather than silently reduced to one of its tokens.
@Test
def anAbsentLicenseIsUnavailableAndADisagreementIsConflicting(): Unit \ Assert = {
    Assert.assertEq(expected = "unavailable", Study.catalogLicenseToken(""));
    Assert.assertEq(expected = "MIT", Study.catalogLicenseToken("MIT"));
    Assert.assertEq(expected = "unavailable", Study.catalogEvidenceToken(""));
    Assert.assertEq(expected = 0, List.length(Study.repoLicenseProvenance(Nil)));
    let two = Study.repoLicenseProvenance(List#{("b", ""), ("a", "MIT")});
    Assert.assertEq(expected = 2, List.length(two));
    match two {
        case first :: second :: _ =>
            Assert.assertEq(expected = "a", first#repo);
            Assert.assertEq(expected = Study.LicenseStatus.Declared, first#status);
            Assert.assertEq(expected = "MIT", first#license);
            Assert.assertEq(expected = "b", second#repo);
            Assert.assertEq(expected = Study.LicenseStatus.Unavailable, second#status);
            Assert.assertEq(expected = "unavailable", Study.catalogLicenseToken(second#license))
        case _ => Assert.assertEq(expected = "two repository records", "not two records")
    };
    let conflict = Study.repoLicenseProvenance(List#{("a", "MIT"), ("a", "Apache-2.0")});
    Assert.assertEq(expected = 1, List.length(conflict));
    match conflict {
        case record :: _ =>
            Assert.assertEq(expected = "a", record#repo);
            Assert.assertEq(expected = 2, record#tasks);
            Assert.assertEq(expected = Study.LicenseStatus.Conflicting, record#status);
            Assert.assertEq(expected = true,
                record#license == "MIT" or record#license == "Apache-2.0")
        case _ => Assert.assertEq(expected = "one repository record", "not one record")
    }
}

/// Every streamed record reaches exactly one denominator bucket, and the
/// accounting identities are checked against the codec's own scanned row count:
/// a clean reduction has no finding, a wrong scanned count and each violated
/// identity produce their own finding.
@Test
def theDenominatorIdentitiesAreAuditedNotAssumed(): Unit \ Assert = {
    let fates = List#{
        Study.CatalogFate.Accepted(row("owner/repo", "js")),
        Study.CatalogFate.Excluded(row("owner/repo", "ts"), List#{Study.CatalogExclusion.ImageAbsent}),
        Study.CatalogFate.OtherLanguage(row("owner/repo", "go")),
        Study.CatalogFate.Failed(Study.CatalogFault.IncompleteRow)
    };
    let counted = List.foldLeft(Study.countCatalogFate, Study.emptyCatalogDenominators(), fates);
    Assert.assertEq(expected = 4, counted#raw);
    Assert.assertEq(expected = 3, counted#normalized);
    Assert.assertEq(expected = 2, counted#jsTs);
    Assert.assertEq(expected = 1, counted#otherLanguage);
    Assert.assertEq(expected = 1, counted#accepted);
    Assert.assertEq(expected = 1, counted#excluded);
    Assert.assertEq(expected = 1, counted#failed);
    Assert.assertEq(expected = 0, List.length(Study.catalogDenominatorFindings(counted, 4)));
    Assert.assertEq(expected = 1, List.length(Study.catalogDenominatorFindings(counted, 5)));
    Assert.assertEq(expected = 1, List.length(Study.catalogDenominatorFindings(
        { raw = 4, normalized = 2, jsTs = 2, otherLanguage = 0, accepted = 1, excluded = 1, failed = 1 }, 4)));
    Assert.assertEq(expected = 1, List.length(Study.catalogDenominatorFindings(
        { raw = 4, normalized = 4, jsTs = 2, otherLanguage = 1, accepted = 1, excluded = 1, failed = 0 }, 4)));
    Assert.assertEq(expected = 1, List.length(Study.catalogDenominatorFindings(
        { raw = 4, normalized = 3, jsTs = 3, otherLanguage = 0, accepted = 1, excluded = 1, failed = 1 }, 4)))
}

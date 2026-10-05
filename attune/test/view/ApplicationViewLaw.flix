use Attune.AsciiTree
use Attune.View

/// Native `@Test` laws for the whole-system application-report adapter.
///
/// A report is presentation only: `Attune.View` renders the typed entries it is
/// given and decides nothing. The goldens below are stated independently of the
/// renderer, and they keep the four provenances apart. A frozen prediction is
/// not an observation, a historical replay is not a fresh execution, and
/// labelled fixture work is never presented as an external result. A
/// coordination decision stays witness-bearing: `CoordinatesBecause(...)` and
/// `UnknownBecause(...)` carry their witnesses rather than collapsing to a bare
/// label.

def limits(): AsciiTree.Limits = AsciiTree.limits(16, 64, 200, 160, 8192)

def lines(xs: List[String]): String = List.join("\n", xs) + "\n"

def entry(provenance: View.Provenance, subject: String, answer: String, assumptions: List[String]): View.AppEntry =
    { subject = subject, answer = answer, provenance = provenance, assumptions = assumptions }

/// One whole-system coordination report, in the order a fixture writes it. The
/// two decisions are witness-bearing, the observation is honestly unmeasured,
/// the historical row carries the retained promotion, and the report as a whole
/// is labelled fixture work.
def coordination(): View.ApplicationReport = {
    application = "coordination",
    scope = "shop-v1",
    work = View.Provenance.Fixture,
    entries = List#{
        entry(View.Provenance.Prediction, "pair=receipt/checkout",
            "CoordinatesBecause(E1:SameDeclaredBoundary(Shop::Pricing))", List#{"single-declared-boundary"}),
        entry(View.Provenance.Prediction, "pair=receipt/absent",
            "UnknownBecause(E1:UnknownIntent)", List#{"unknown-intent-stays-unknown"}),
        entry(View.Provenance.Observation, "pair=receipt/checkout",
            "Unmeasured", List#{"no-external-execution"}),
        entry(View.Provenance.History, "retained-corrected-v2",
            "NotEarned", List#{"historical-replay-is-not-external-execution"}),
        entry(View.Provenance.Fixture, "acquired-shop",
            "Partial", List#{"three-authored-files"})
    }
}

/// One whole-system localization report: the predicted candidate, the legal
/// empty continuation, the unmeasured observation and the labelled fixture gold.
def localization(): View.ApplicationReport = {
    application = "localization",
    scope = "shop-v1",
    work = View.Provenance.Fixture,
    entries = List#{
        entry(View.Provenance.Prediction, "task=receipt",
            "shop/pricing.rb", List#{"structural-imports-only"}),
        entry(View.Provenance.Prediction, "task=pricing",
            "EMPTY", List#{"legal-empty-continuation"}),
        entry(View.Provenance.Observation, "task=receipt",
            "Unmeasured", List#{"no-external-execution"}),
        entry(View.Provenance.History, "task=receipt",
            "none", List#{"no-retained-localization-evidence"}),
        entry(View.Provenance.Fixture, "task=receipt",
            "gold=shop/pricing.rb hit=true", List#{"labelled-fixture-gold"})
    }
}

/// The coordination document is exactly the authored golden. The header carries
/// the report's own provenance, the decisions keep their witnesses, and the
/// observations, history and fixture rows are labelled apart.
@Test
def theCoordinationReportIsTheAuthoredGolden(): Unit \ Assert = {
    let expected = lines(
        "graph=application name=coordination scope=shop-v1 work=fixture" ::
        "" ::
        "prediction pair=receipt/checkout = CoordinatesBecause(E1:SameDeclaredBoundary(Shop::Pricing)) assuming(single-declared-boundary)" ::
        "" ::
        "prediction pair=receipt/absent = UnknownBecause(E1:UnknownIntent) assuming(unknown-intent-stays-unknown)" ::
        "" ::
        "observation pair=receipt/checkout = Unmeasured assuming(no-external-execution)" ::
        "" ::
        "history retained-corrected-v2 = NotEarned assuming(historical-replay-is-not-external-execution)" ::
        "" ::
        "fixture acquired-shop = Partial assuming(three-authored-files)" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderApplication(limits(), coordination()))
}

/// The localization document is exactly the authored golden, and its two
/// prediction rows keep a legal empty continuation distinct from a found file.
@Test
def theLocalizationReportIsTheAuthoredGolden(): Unit \ Assert = {
    let expected = lines(
        "graph=application name=localization scope=shop-v1 work=fixture" ::
        "" ::
        "prediction task=receipt = shop/pricing.rb assuming(structural-imports-only)" ::
        "" ::
        "prediction task=pricing = EMPTY assuming(legal-empty-continuation)" ::
        "" ::
        "observation task=receipt = Unmeasured assuming(no-external-execution)" ::
        "" ::
        "history task=receipt = none assuming(no-retained-localization-evidence)" ::
        "" ::
        "fixture task=receipt = gold=shop/pricing.rb hit=true assuming(labelled-fixture-gold)" :: Nil);
    Assert.assertEq(expected = Ok(expected), View.renderApplication(limits(), localization()))
}

/// The four provenances are distinct values with distinct display names, so no
/// renderer can confuse a prediction, an observation, a historical replay or
/// labelled fixture work for one another.
@Test
def theFourProvenancesStayDistinct(): Unit \ Assert = {
    Assert.assertEq(expected = "prediction", View.provenanceName(View.Provenance.Prediction));
    Assert.assertEq(expected = "observation", View.provenanceName(View.Provenance.Observation));
    Assert.assertEq(expected = "history", View.provenanceName(View.Provenance.History));
    Assert.assertEq(expected = "fixture", View.provenanceName(View.Provenance.Fixture));
    Assert.assertEq(expected = 4, List.length(List.distinct(
        View.Provenance.Prediction :: View.Provenance.Observation
            :: View.Provenance.History :: View.Provenance.Fixture :: Nil)))
}

/// A coordination decision is witness-bearing: the phrase keeps every witness
/// and never becomes the bare decision name.
@Test
def witnessBearingDecisionsAreNeverFlattened(): Unit \ Assert = {
    Assert.assertEq(expected = "ParallelBecause(a, b)", View.because("Parallel", List#{"a", "b"}));
    Assert.assertEq(expected = "CoordinatesBecause(E1:SameDeclaredBoundary(Shop::Pricing))",
        View.because("Coordinate", List#{"E1:SameDeclaredBoundary(Shop::Pricing)"}));
    Assert.assertEq(expected = "UnknownBecause(E1:UnknownIntent)", View.because("Unknown", List#{"E1:UnknownIntent"}));
    Assert.assertEq(expected = false, View.because("Unknown", List#{"E1:UnknownIntent"}) == "Unknown")
}

/// The rendered document presents exactly the semantic set: every entry's
/// provenance, subject and answer appears in the bytes, so a golden can never
/// silently drop or relabel an entry the typed report still carries.
@Test
def theDocumentPresentsExactlyTheSemanticSet(): Unit \ Assert = {
    let document = match View.renderApplication(limits(), coordination()) {
        case Ok(text) => text
        case Err(_)   => ""
    };
    Assert.assertEq(expected = true, List.forAll(entry -> String.contains(substr = entry#subject, document),
        coordination()#entries));
    Assert.assertEq(expected = true, List.forAll(entry -> String.contains(substr = entry#answer, document),
        coordination()#entries));
    Assert.assertEq(expected = true, List.forAll(entry ->
        String.contains(substr = View.provenanceName(entry#provenance) + " " + entry#subject, document),
        coordination()#entries))
}

/// An entry's assumptions are visible qualifications, and an entry without any
/// adds no empty parentheses.
@Test
def assumptionsAreVisibleQualifications(): Unit \ Assert = {
    let bare = { application = "coordination", scope = "shop-v1", work = View.Provenance.Fixture,
        entries = entry(View.Provenance.Prediction, "pair=a/b", "CoordinatesBecause(c)", Nil) :: Nil };
    match View.renderApplication(limits(), bare) {
        case Err(error) => Assert.fail(error)
        case Ok(text)   => {
            Assert.assertEq(expected = true, String.contains(substr = "prediction pair=a/b = CoordinatesBecause(c)\n", text));
            Assert.assertEq(expected = false, String.contains(substr = "assuming(", text))
        }
    }
}

/// Presentation rejects what it cannot render honestly rather than clipping it:
/// an empty report, an unsafe application label and an over-long entry label
/// are explicit rejections.
@Test
def unsafeReportsRejectRatherThanClip(): Unit \ Assert = {
    let empty = { application = "coordination", scope = "shop-v1", work = View.Provenance.Fixture, entries = Nil };
    Assert.assertErr(View.renderApplication(limits(), empty));
    let badLabel = { application = "bad name", scope = "shop-v1", work = View.Provenance.Fixture,
        entries = entry(View.Provenance.Fixture, "pair=a/b", "x", Nil) :: Nil };
    Assert.assertErr(View.renderApplication(limits(), badLabel));
    let wide = { application = "coordination", scope = "shop-v1", work = View.Provenance.Fixture,
        entries = entry(View.Provenance.Fixture, "pair=a/b", String.repeat(200, "x"), Nil) :: Nil };
    Assert.assertErr(View.renderApplication(limits(), wide))
}

/// The corpus-free embedding fixture memo and invalidation law
/// (`VAL-EMBED-002`, `VAL-EMBED-005`).
///
/// The one logical fixture identity is the declared triple
/// `(model revision, recipe identity, exact embedded input bytes)`. The vector
/// payload is data and never identity, and the consumer, the report and the
/// metrics are not components of the key at all, so editing any of them cannot
/// change a fixture identity and cannot cause acquisition. This law pins that
/// statement executably, over the declared key vocabulary only:
///
/// - a row whose three-key identity is already declared in a prior fixture is
///   reused verbatim and never re-inferred;
/// - changing any single component (revision, recipe or input bytes) makes the
///   row new, so exactly that row is inferred;
/// - the decision depends on the key, never on the row label or the batch
///   position, so a reordered or extended batch re-infers exactly its new rows;
/// - a model/recipe change therefore regenerates the whole family, because every
///   row's key moves, while a batch change regenerates only the new logical rows.
///
/// The physical action stays distinct from the logical row: this law decides
/// which logical rows need inference, and it never claims per-row action
/// granularity. No corpus, world, model byte, provider or label is touched here.

// ------------------------------------------------------------- the memo law

def key(revision: String, recipe: String, inputSha: String): (String, String, String) =
    (revision, recipe, inputSha)

/// Whether a logical row is reusable from a declared prior fixture. Reuse is
/// exactly three-component key equality; the row label and the batch position
/// are not consulted.
def reusable(prior: List[(String, String, String)], candidate: (String, String, String)): Bool =
    List.exists(pair -> sameKey(pair, candidate), prior)

def sameKey(left: (String, String, String), right: (String, String, String)): Bool =
    match (left, right) {
        case ((lr, lc, lb), (rr, rc, rb)) => lr == rr and lc == rc and lb == rb
    }

/// The declared inference count of one batch: every row whose key is not already
/// declared is inferred once; every other row is reused verbatim.
def inferredCount(prior: List[(String, String, String)], batch: List[(String, String, String)]): Int32 =
    List.length(List.filter(candidate -> not reusable(prior, candidate), batch))

def revision(revision: String, recipe: String, inputSha: String): (String, String, String) =
    key(revision, recipe, inputSha)

// -------------------------------------------------------------------- laws

@Test
def anUnchangedBatchIsReusedWholeAndInfersNothing(): Unit \ Assert = {
    let prior = List#{revision("rev", "recipe", "aa"), revision("rev", "recipe", "bb")};
    let batch = List#{revision("rev", "recipe", "aa"), revision("rev", "recipe", "bb")};
    Assert.assertEq(expected = 0, inferredCount(prior, batch))
}

@Test
def aChangedBatchInfersExactlyItsNewLogicalRows(): Unit \ Assert = {
    let prior = List#{revision("rev", "recipe", "aa"), revision("rev", "recipe", "bb")};
    // The one new row is placed first, so a positional reuse rule would fail.
    let batch = List#{
        revision("rev", "recipe", "cc"),
        revision("rev", "recipe", "aa"),
        revision("rev", "recipe", "bb")
    };
    Assert.assertEq(expected = 1, inferredCount(prior, batch));
    Assert.assertEq(expected = true, reusable(prior, revision("rev", "recipe", "aa")))
}

@Test
def eachSingleComponentChangeMakesTheRowNew(): Unit \ Assert = {
    let prior = List#{revision("rev", "recipe", "aa")};
    Assert.assertEq(expected = true, reusable(prior, revision("rev", "recipe", "aa")));
    Assert.assertEq(expected = false, reusable(prior, revision("other", "recipe", "aa")));
    Assert.assertEq(expected = false, reusable(prior, revision("rev", "other", "aa")));
    Assert.assertEq(expected = false, reusable(prior, revision("rev", "recipe", "zz")))
}

@Test
def aModelOrRecipeChangeRegeneratesTheWholeFamily(): Unit \ Assert = {
    let prior = List#{revision("rev", "recipe", "aa"), revision("rev", "recipe", "bb")};
    let batch = List#{revision("rev", "recipe2", "aa"), revision("rev", "recipe2", "bb")};
    Assert.assertEq(expected = 2, inferredCount(prior, batch));
    Assert.assertEq(expected = 2, inferredCount(Nil, batch))
}

@Test
def theKeyCarriesNoConsumerOrReportComponent(): Unit \ Assert = {
    // The key is exactly three components: a consumer, report or metric field
    // cannot enter it, so those edits can never change a fixture identity.
    let prior = List#{revision("rev", "recipe", "aa")};
    Assert.assertEq(expected = 3, tupleArity(revision("rev", "recipe", "aa")));
    Assert.assertEq(expected = 0, inferredCount(prior, List#{revision("rev", "recipe", "aa")}))
}

def tupleArity(value: (String, String, String)): Int32 = match value {
    case (_, _, _) => 3
}

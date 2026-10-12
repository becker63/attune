use Attune.Study.Jev
use Attune.Study.Metrics

/// The corpus-free hosted-Qwen JEV rerank laws (`VAL-QWEN-004`).
///
/// These drive the exact production promotion statement in `Attune.Study.Jev`
/// with hand-built immutable rankings and typed decisions, so the promotion rule
/// the Q-JEV report depends on is pinned by a declared target rather than by an
/// ad-hoc recomputation. They mirror the A-pair laws and add the Q-pair
/// properties the final report relies on:
///
/// - only `Relevant` promotes; `NotRelevant`, `Unknown` and `Failed` receive no
///   promotion and no negative penalty;
/// - the promotion is keyed on the ORIGINAL base rank of the ranking it is given,
///   so the same decisions applied to a different base ranking promote the
///   candidate at the same base rank, not the candidate at the same path;
/// - the promoted ranking carries the identical complete base candidate
///   population with contiguous new positions: nothing is deleted, invented or
///   re-scored;
/// - a candidate outside the judged top-32 set carries no receipt row and is
///   `Unknown`, never a negative, so the full Q population survives the rerank.
///
/// No corpus, world, Grit, receipt, fixture or label artifact is touched here.

// ---------------------------------------------------------------- fixtures

def entries(pairs: List[(Int32, String)]): Metrics.Ranking =
    List.map(pair -> match pair { case (rank, path) => (rank, path, 0) }, pairs)

def decisions(pairs: List[(Int32, String)]): List[(Int32, Jev.JevOutcome)] =
    List.map(pair -> match pair { case (rank, name) => (rank, Jev.parseOutcome(name)) }, pairs)

def positions(ranking: List[(Int32, String, Int32)]): List[Int32] =
    List.map(entry -> match entry { case (position, _, _) => position }, ranking)

def paths(ranking: List[(Int32, String, Int32)]): List[String] =
    List.map(entry -> match entry { case (_, path, _) => path }, ranking)

// ------------------------------------------------------------------- laws

/// Only `Relevant` promotes. A `Relevant` candidate at original Q rank 2 moves
/// ahead of the `NotRelevant` rank-1 candidate, while the `Unknown` rank-3
/// candidate stays behind both and takes no penalty.
@Test
def onlyRelevantPromotesInTheQBaseRanking(): Unit \ Assert = {
    let d = entries((1, "a.ts") :: (2, "b.ts") :: (3, "c.ts") :: Nil);
    let typed = decisions((1, "NotRelevant") :: (2, "Relevant") :: (3, "Unknown") :: Nil);
    let promoted = Jev.promoted(d, typed);
    Assert.assertEq(expected = "b.ts" :: "a.ts" :: "c.ts" :: Nil, paths(promoted));
    Assert.assertEq(expected = 1 :: 2 :: 3 :: Nil, positions(promoted))
}

/// The promotion is keyed on the ORIGINAL base rank of the ranking it is given,
/// not on a path: the same typed decisions applied to a different base ranking
/// promote the candidate that sits at that base rank in the new base, which is
/// exactly how the Q pair reranks the frozen Q tree rather than the P+A tree.
@Test
def thePromotionIsKeyedOnThePassedBaseRank(): Unit \ Assert = {
    let q = entries((1, "x.ts") :: (2, "y.ts") :: (3, "z.ts") :: Nil);
    let typed = decisions((2, "Relevant") :: Nil);
    let promoted = Jev.promoted(q, typed);
    Assert.assertEq(expected = (0, 2), Jev.promotionKey(Jev.JevOutcome.Relevant, 2));
    Assert.assertEq(expected = "y.ts" :: "x.ts" :: "z.ts" :: Nil, paths(promoted));
    Assert.assertEq(expected = Jev.JevOutcome.Unknown, Jev.decisionAt(1, typed));
    Assert.assertEq(expected = Jev.JevOutcome.Unknown, Jev.decisionAt(3, typed))
}

/// A typed failure is never a negative and never a promotion: it stays with the
/// non-`Relevant` partition in original Q order, exactly like `Unknown`.
@Test
def aFailedQDecisionIsNeitherANegativeNorAPromotion(): Unit \ Assert = {
    let d = entries((1, "a.ts") :: (2, "b.ts") :: (3, "c.ts") :: Nil);
    let typed = decisions((1, "Unknown") :: (2, "Failed:Timeout") :: (3, "Relevant") :: Nil);
    let promoted = Jev.promoted(d, typed);
    Assert.assertEq(expected = "c.ts" :: "a.ts" :: "b.ts" :: Nil, paths(promoted));
    Assert.assertEq(expected = "Failed:Timeout", Jev.outcomeName(Jev.decisionAt(2, typed)))
}

/// A candidate outside the judged top-32 set carries no receipt row and is
/// `Unknown`, never a negative, and the complete Q population is preserved:
/// nothing is deleted, invented or re-scored, and every position is contiguous.
@Test
def anUnjudgedQRowIsUnknownAndThePopulationIsPreserved(): Unit \ Assert = {
    let d = entries((1, "a.ts") :: (2, "b.ts") :: (3, "c.ts") :: (33, "d.ts") :: Nil);
    let typed = decisions((33, "Relevant") :: Nil);
    let promoted = Jev.promoted(d, typed);
    Assert.assertEq(expected = Jev.JevOutcome.Unknown, Jev.decisionAt(1, typed));
    Assert.assertEq(expected = 4, List.length(promoted));
    Assert.assertEq(expected = List.sort(paths(d)), List.sort(paths(promoted)));
    Assert.assertEq(expected = 1 :: 2 :: 3 :: 4 :: Nil, positions(promoted));
    Assert.assertEq(expected = "d.ts" :: "a.ts" :: "b.ts" :: "c.ts" :: Nil, paths(promoted))
}

/// The two Q conditions are independent: the same frozen Q base ranking reranked
/// under a Q-control decision set and under a Q-structure decision set can differ,
/// and each keeps the identical complete population. This pins that a Q-structure
/// rerank is not silently the Q-control rerank.
@Test
def theTwoQConditionsAreIndependentOverTheSameBase(): Unit \ Assert = {
    let q = entries((1, "a.ts") :: (2, "b.ts") :: (3, "c.ts") :: Nil);
    let control = decisions((2, "Relevant") :: Nil);
    let structure = decisions((3, "Relevant") :: Nil);
    let j = Jev.promoted(q, control);
    let s = Jev.promoted(q, structure);
    Assert.assertEq(expected = "b.ts" :: "a.ts" :: "c.ts" :: Nil, paths(j));
    Assert.assertEq(expected = "c.ts" :: "a.ts" :: "b.ts" :: Nil, paths(s));
    Assert.assertEq(expected = List.sort(paths(q)), List.sort(paths(j)));
    Assert.assertEq(expected = List.sort(paths(q)), List.sort(paths(s)))
}
